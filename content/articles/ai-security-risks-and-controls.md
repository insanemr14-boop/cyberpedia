---
title: 'AI Security Risks and the Controls That Actually Help'
slug: 'ai-security-risks-and-controls'
excerpt: 'Prompt injection remains unsolved. What that means for LLM apps, agentic tool use, and the control set worth deploying today.'
description: 'Prompt injection, model context leakage, AI supply chain risk, and agentic blast radius, mapped to OWASP LLM Top 10 with working controls.'
seoTitle: 'AI Security Risks and Controls: A Practical Guide'
seoDescription: 'How to secure LLM and agentic systems: prompt injection defence, data leakage, model supply chain, tool scoping, and monitoring controls.'
author: 'compliance-desk'
category: 'ai-security'
type: 'news'
tags: ['prompt-injection', 'llm-security', 'owasp-llm-top-10', 'agentic-systems', 'threat-modeling']
publishDate: 2026-08-01
featured: true
draft: false
---

Security teams reviewing their first LLM feature usually arrive with the wrong mental model. They look for injection in the SQL sense — untrusted input reaching an interpreter — and reach for the familiar answer of parameterisation. That answer does not exist here. A language model has no separation between instructions and data. Everything in the context window is the same kind of thing, and the model decides what to treat as a command based on plausibility rather than provenance.

This is not an implementation defect that will be patched. It is a property of how these systems work, and it means prompt injection sits in a different category from the vulnerability classes security teams are used to closing. There is no equivalent of prepared statements. There is mitigation, layered and partial, and architecture that limits what a successful injection can reach.

That distinction should drive the whole design. The productive question is not "how do we stop the model being tricked" but "what happens when it is." Everything below — the failure modes, the OWASP LLM Top 10 mapping, and the control set — follows from taking that assumption seriously.

## Prompt Injection: Direct and Indirect

Direct injection is a user typing adversarial instructions into a prompt. It matters mainly where the model holds privileges the user does not, or where system prompt contents are sensitive. A customer support assistant that can issue refunds is a direct injection target: the user is the attacker, and the goal is to make the model exceed the authority it was meant to exercise on that user's behalf.

Direct injection is the tractable half of the problem. The user already has some legitimate access, the blast radius is bounded by their own authorisation, and the mitigation is straightforward in principle — do not let the model's output authorise anything the user could not authorise directly.

Indirect injection is the serious one. Here the adversarial instructions arrive inside content the model retrieves and processes as data: a web page it browses, a document in a RAG index, an email in a mailbox it summarises, a code comment in a repository it reads, an issue description in a ticketing system. The user is not the attacker. The user is the victim, and the model is acting with the user's privileges against the attacker's instructions.

> Indirect prompt injection turns every piece of content your model reads into an untrusted control channel. If the model can act, then whoever can influence its inputs can act too, at the model's privilege level.

The delivery paths are unglamorous and well understood: hidden text in HTML, instructions inside document metadata, text embedded in images processed by a multimodal model, poisoned entries in a vector database, README files and dependency descriptions in a codebase an assistant is reading. None of this requires sophistication. It requires only that some attacker-influenced content reaches the context window.

AI-assisted development inherits all of it. A coding assistant that reads issues, pull request comments, and third-party documentation is consuming content from people who are not your developers. If that assistant can also run commands, edit files, or open pull requests, the path from a poisoned issue description to executed code is short.

## The Agentic Blast Radius

An LLM that only produces text has a bounded failure mode: it says something wrong. An LLM wired to tools has a failure mode bounded by the tools. This is the variable that matters most and the one most often set carelessly during prototyping and never revisited.

Ask three questions about any agentic deployment. What can the agent read, what can it write or execute, and whose authority does it act under. The third is where most designs go wrong: agents are commonly given a service account with broad, static permissions because that was expedient, which means every user of the agent effectively inherits that account's authority.

Chained tool use compounds it. An agent that reads a document, searches a knowledge base, and sends an email has an exfiltration path built into its normal operation — injected instructions in the document, sensitive content pulled from the knowledge base, delivery via the email tool. Each capability is defensible alone. The combination is a data loss channel that no individual review would have flagged.

The pattern generalises. Any agent combining a content-ingestion capability, a sensitive-data-access capability, and an outbound capability can be driven to exfiltrate. Treat that triad as an architectural review trigger.

Autonomy multiplies exposure. An agent running unattended on a schedule, or one that decomposes goals into many sub-actions without checkpoints, gives an injected instruction more opportunities and more time. Depth limits, action budgets, and time-boxed sessions are cheap and effective constraints.

## Data Leakage Through Model Context

Model context is a data flow, and it usually escapes classification because it does not look like one. Prompts, retrieved documents, tool outputs, and conversation history all travel to an inference endpoint, are often logged for debugging or evaluation, and may be retained by a provider under terms nobody in the security team has read.

RAG systems fail on permissions with striking regularity. The retrieval layer is indexed once, over a corpus assembled by an engineering team, and the query-time filter that should restrict results to what the requesting user may see is either absent or applied inconsistently. The model then confidently synthesises content from documents the user could not open directly. This is not a model problem — it is an authorisation bug in the retrieval path, and it is the most common serious finding in LLM application reviews.

Conversation memory extends the exposure window. Long-lived threads and cross-session memory mean data ingested under one context persists into later interactions, potentially with different participants in shared or multi-tenant deployments.

System prompt leakage deserves a specific note because teams keep putting secrets there. A system prompt is not a confidentiality boundary. Assume its contents are recoverable, and keep credentials, internal URLs, business rules with security significance, and any other sensitive material out of it.

## Supply Chain Risk in Models and Datasets

Model artefacts are executable dependencies with weaker provenance than the software packages they sit alongside. A model pulled from a public hub arrives with a name, a licence claim, and rarely anything cryptographically verifiable about who produced it or from what.

The serialisation format is the immediate concern. Python pickle-based formats — the default for a long stretch of the ecosystem — execute code on load. Safetensors resolves this specific problem, and any model loaded from an external source should be in that format or converted in an isolated environment before it touches anything else.

Beyond deserialisation are the harder problems. Training data poisoning can implant behaviour that only activates on a specific trigger and is not detectable by ordinary evaluation. Fine-tuned derivatives inherit whatever was in the base model. Typosquatted model repositories mirror the package ecosystem attacks that came before. Adapter weights and LoRA layers get pulled in with even less scrutiny than base models.

The controls are the familiar supply chain ones, applied to a new artefact type: pin versions and hashes rather than tracking a moving tag, mirror approved models internally rather than pulling from public hubs at runtime, record model provenance in your SBOM process, and scan artefacts before they enter the internal registry.

## Mapping to the OWASP Top 10 for LLM Applications

The OWASP LLM Top 10 is the most useful shared vocabulary available for these systems. It is worth mapping your own findings to it, both for internal consistency and because auditors and customers increasingly ask in those terms.

| OWASP LLM entry | What it covers | Primary control | Residual risk |
|---|---|---|---|
| LLM01 Prompt Injection | Direct and indirect instruction injection | Privilege limitation, output handling, human gates | High — no complete mitigation exists |
| LLM02 Sensitive Information Disclosure | Data leaking via context, output, or logs | Query-time authorisation, output filtering, log redaction | Medium |
| LLM03 Supply Chain | Compromised models, adapters, datasets, plugins | Pinned hashes, internal registry, safetensors only | Medium |
| LLM04 Data and Model Poisoning | Malicious training or fine-tuning data | Provenance controls, dataset review, behavioural testing | Medium-high for fine-tuned models |
| LLM05 Improper Output Handling | Model output reaching interpreters unescaped | Treat all output as untrusted input; contextual encoding | Low if handled correctly |
| LLM06 Excessive Agency | Over-permissioned tools and autonomy | Least-privilege scoping, action budgets, approval gates | Medium — depends on design discipline |
| LLM07 System Prompt Leakage | Sensitive content in system instructions | Keep secrets out of prompts entirely | Low if the rule is followed |
| LLM08 Vector and Embedding Weaknesses | Poisoned or over-permissive retrieval | Per-user retrieval filters, source trust tiers | Medium |
| LLM09 Misinformation | Confident incorrect output driving decisions | Grounding, citation, human review for consequential output | Medium |
| LLM10 Unbounded Consumption | Cost and denial of service via resource abuse | Rate limits, token budgets, per-tenant quotas | Low with basic controls |

LLM05 deserves emphasis because it is the entry most likely to produce a conventional, exploitable vulnerability. Model output rendered into HTML without encoding is stored XSS. Model output passed to a shell is command injection. Model output interpolated into a query is SQL injection. These are not novel AI risks — they are ordinary injection bugs where the untrusted source happens to be a model, and they are fully solvable with existing practice.

## The Control Set Worth Deploying

### Least-privilege tool scoping

This is the highest-value control available, because it changes what a successful injection can do rather than trying to prevent one. Scope every tool narrowly, bind agent actions to the requesting user's authorisation rather than a shared service identity, and separate read from write capability wherever the workflow permits.

```yaml
# Tool manifest for a support agent. Every capability is scoped,
# and anything with real-world effect requires explicit confirmation.

agent: support-assistant
identity:
  mode: on_behalf_of_user      # never a shared service principal
  token_ttl_seconds: 900
limits:
  max_tool_calls_per_session: 20
  max_reasoning_depth: 5
  session_ttl_seconds: 1800

tools:
  - name: kb_search
    effect: read
    scope:
      index: support-kb-public
      filter: "acl_groups ANY OF ${user.groups}"   # enforced server-side
    trust_tier: untrusted_content                  # results are data, never instructions

  - name: ticket_read
    effect: read
    scope:
      constraint: "ticket.assigned_org == user.org"
    trust_tier: untrusted_content

  - name: ticket_comment
    effect: write
    scope:
      constraint: "ticket.assigned_org == user.org"
    approval: none
    rate_limit: 10/hour

  - name: issue_refund
    effect: write
    scope:
      max_amount_minor_units: 5000
      currency: GBP
    approval: human_required        # blocking gate, agent cannot self-approve
    audit: full_context_snapshot

denied_by_default:
  - outbound_email
  - external_http_fetch
  - shell_exec
  - credential_read
```

Note the `denied_by_default` block. Outbound capability is what converts a data access issue into an exfiltration issue, and it should be added deliberately, with a documented reason, rather than inherited from a framework's default tool set.

### Input and output filtering

Filtering is worth deploying and worth being honest about. Classifier-based injection detection catches known patterns and raises the effort required; it does not stop a determined attacker, and any design that treats it as the primary control is fragile.

Input-side, the useful work is structural rather than semantic: mark retrieved content with clear provenance and trust tier, strip active content and hidden text from ingested documents, normalise unicode to defeat homoglyph and zero-width tricks, and constrain the size and format of what enters the context.

Output-side, the rules are firmer. Validate output against an expected schema before it is used programmatically. Encode contextually before rendering. Never pass model output to a shell, an eval, a query builder, or a file path without the same validation you would apply to a form field from an anonymous internet user. Scan outbound content for secrets and classified data before it leaves the system.

### Human-in-the-loop gates

Place gates where actions are irreversible, externally visible, or financially significant. A gate is only meaningful if the human has enough context to make a real decision — an approval dialog showing a summary the model itself produced is not a control, because the model is the thing you are checking.

Show the concrete action, the parameters, and the source content that motivated it. Batch approvals and repeated identical prompts destroy the control through fatigue, which is an argument for having fewer, better-placed gates rather than many.

### Monitoring

AI systems need their own telemetry, and most deployments log almost nothing useful. Log every tool invocation with the requesting identity, parameters, and outcome. Log retrieval sources so a poisoned document can be traced after the fact. Record the trust tier of every context element. Redact sensitive values at write time rather than relying on downstream access control.

```json
{
  "timestamp": "2026-07-29T14:22:07.412Z",
  "event_type": "agent.tool_invocation",
  "session_id": "s_9f3c11ab",
  "trace_id": "t_44e0c2",
  "agent": "support-assistant",
  "acting_identity": "user:jsmith@corp.example",
  "delegated_from": "user:jsmith@corp.example",
  "tool": "issue_refund",
  "parameters": { "ticket_id": "T-88231", "amount_minor_units": 4200, "currency": "GBP" },
  "approval": { "required": true, "granted_by": "user:mokonkwo@corp.example", "latency_ms": 41200 },
  "context_provenance": [
    { "source": "ticket_read:T-88231", "trust_tier": "untrusted_content", "sha256": "6b1f...c4a2" },
    { "source": "kb_search:refund-policy-v4", "trust_tier": "internal_reviewed", "sha256": "0ae7...19bd" }
  ],
  "injection_classifier": { "verdict": "suspicious", "score": 0.71, "matched": ["imperative_override_pattern"] },
  "outcome": "allowed",
  "policy_version": "agent-policy-2026.07"
}
```

With that structure in place, useful detections become writable: tool invocations following a suspicious classifier verdict, agents reaching a distinct set of tools compared to their historical baseline, retrieval from sources never previously seen in a given workflow, approval latency short enough to indicate rubber-stamping, and sudden increases in tool calls per session.

Red teaming should be continuous rather than a pre-launch event. Model versions change behaviour, prompt templates get edited, and new tools get added — each of those invalidates prior testing. Maintain an injection test corpus and run it in CI against every change to prompts, tools, or model versions.

## Key Takeaways

- Prompt injection has no parameterisation equivalent; design on the assumption that the model will occasionally follow attacker instructions, and constrain what happens when it does.
- Indirect injection through retrieved documents, web pages, emails, and code comments is the serious variant, because the model acts with a legitimate user's privileges under an attacker's control.
- Treat the combination of content ingestion, sensitive data access, and outbound capability in one agent as an architectural review trigger — that triad is an exfiltration path.
- Bind agent actions to the requesting user's authorisation rather than a shared service account, enforce retrieval filters server-side at query time, and deny outbound capability by default.
- Handle model output as untrusted input: schema validation, contextual encoding, and never passing it to a shell, query, or eval unvalidated. LLM05 produces ordinary, fully solvable injection bugs.
- Log tool calls, acting identity, context provenance, and trust tiers; without that telemetry there is no post-incident reconstruction and no baseline for anomaly detection.
- Place human gates at irreversible and high-value actions, give the reviewer the underlying evidence rather than a model-written summary, and keep gates few enough to avoid approval fatigue.
