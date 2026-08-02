---
title: 'Building Threat Intelligence That Actually Works'
slug: 'threat-intelligence-that-actually-works'
excerpt: 'Most threat intel programs drown teams in indicators nobody actions. Here is how to run an intel function that changes what your detections catch.'
description: 'Why most threat intelligence programs fail, and how to run the intel lifecycle so feeds become detections instead of unread indicator lists.'
seoTitle: 'Threat Intelligence That Actually Works'
seoDescription: 'The intel lifecycle, the Pyramid of Pain, and how to turn threat intelligence feeds into working detections and measurable program value.'
author: 'threat-research'
category: 'threat-intelligence'
type: 'news'
tags: ['pyramid-of-pain', 'detection-engineering', 'mitre-attack', 'intel-lifecycle', 'security-operations']
publishDate: 2026-06-30
featured: false
draft: false
faq:
  - question: 'What makes a threat indicator actionable?'
    answer: 'Context, provenance, confidence and an expiry. A bare IP address is nearly worthless. The same address annotated with what was hosted there, which campaign used it, when it was first and last observed, whether it is dedicated attacker infrastructure or a compromised host, and the source confidence lets a defender decide to block, alert, or hunt retrospectively.'
  - question: 'What is the Pyramid of Pain used for?'
    answer: 'It ranks indicator types by how much it costs an adversary to change them. Hashes are trivial to alter and last hours, addresses and domains last days to weeks, while host and network artefacts, tools, and tradecraft cost progressively more. The instruction that follows is to automate the bottom three levels and spend analyst time on the top three.'
  - question: 'Should we buy threat intelligence feeds?'
    answer: 'Not before writing intelligence requirements. Feeds purchased first produce a pipeline rather than intelligence, and a feed delivering a million hashes is supplying the least painful detection class in enormous volume. Ten to fifteen prioritised, decision-linked questions, reviewed quarterly with the people who own those decisions, do more for a programme than any subscription.'
  - question: 'How do you measure a threat intelligence programme?'
    answer: 'By outcomes rather than inputs. Defensible measures include ATT&CK coverage change for the adversaries named in your requirements, true-positive yield of intel-sourced detections, time from publication of a new technique to deployed detection, retrospective sweep hit rate, and documented decisions where intelligence was a stated input. Retiring a source that produces nothing is a success.'
---

Ask a security team what their threat intelligence program produces and you will usually get an answer about inputs: how many feeds they subscribe to, how many indicators land in the platform each day, how many vendor portals they have access to. Ask what decision changed last quarter because of intelligence, and the room goes quiet.

That gap is the defining failure of the discipline as practiced. A program that ingests millions of indicators, deduplicates them, and pushes them into a blocklist has automated a data movement problem. It has not produced intelligence. Intelligence is information that has been evaluated against a specific question someone is going to act on, delivered to that person in time to act, in a form they can act with. Everything else is inventory.

The pathology is consistent across organizations of every size. Feeds are purchased before requirements are written. Indicators arrive without context — no campaign, no confidence, no expiry, no indication of whether the address was a compromised legitimate host or dedicated attacker infrastructure. Analysts spend their time maintaining the pipeline rather than analyzing anything. The SOC learns to ignore intel-sourced alerts because they are mostly false positives against stale data. And nobody can answer whether the six-figure feed subscription is worth renewing.

This is what a program that works looks like instead: a small set of standing questions, a lifecycle that answers them, three distinct product types for three distinct audiences, priorities governed by how much pain a detection actually causes an adversary, and a measurement model that survives a budget conversation.

## The Failure Mode: Feeds Without Questions

The root cause of most failed programs is sequencing. The team buys capability, then looks for a use for it. Working programs start with intelligence requirements — a written, prioritized list of questions the organization needs answered.

A useful requirement is specific, decision-linked, and bounded. "Which ransomware operations are actively targeting regional healthcare providers, and what initial access vectors do they use" is a requirement, because the answer changes patching priority and detection coverage. "Tell us about the threat environment" is not.

Requirements should be derived from the business, not from the news cycle. What does the organization have that is worth stealing. Which third parties can reach production systems. Which regulatory regimes create disclosure exposure. What did the last three incidents have in common. Where is coverage thinnest according to your own detection gap analysis. Ten to fifteen prioritized requirements, reviewed quarterly with the people who own the decisions, will do more for a program than any feed purchase.

The second failure is treating indicators as a product rather than as a byproduct. An IP address with no context is nearly worthless. The same IP address annotated with what was hosted there, which campaign used it, when it was first and last observed, whether it is dedicated infrastructure or a compromised host, and what confidence the source assigns, is actionable — because a defender can decide whether to block it, alert on it, or hunt for historical contact with it.

> If an indicator arrives without context, provenance, confidence, and an expiry, it is not intelligence. It is a string that will eventually generate a false positive.

## The Intelligence Lifecycle, Applied

The classic five-phase lifecycle — direction, collection, processing, analysis, dissemination, with feedback closing the loop — is often taught as a diagram and then ignored in practice. Applied honestly, each phase has a concrete deliverable.

**Direction** produces the written requirements described above, with named stakeholders and a review cadence. Without this phase everything downstream is unfalsifiable.

**Collection** maps sources to requirements. The important discipline here is coverage analysis: for each requirement, which sources can plausibly answer it. Most organizations discover they have five sources covering one requirement and zero covering four others. Internal telemetry is a collection source and usually the most valuable one — your own incident history, your own honeypot and canary data, your own phishing reports describe the threats that actually reach you.

**Processing** is normalization, deduplication, enrichment, and translation. It is unglamorous and it is where most analyst time goes if it is not automated. Automate it.

**Analysis** is the phase that separates a program from a pipeline. It means assessing reliability, weighing competing hypotheses, stating confidence explicitly, and being willing to say "we assess with low confidence" rather than laundering a single unverified vendor claim into an assertion. Structured analytic techniques exist precisely because analysts under time pressure default to the first plausible explanation.

**Dissemination** means the right format for the right audience, which is where the strategic, operational, tactical split becomes practical rather than academic.

**Feedback** is the phase everyone drops. Ask the recipients whether the product changed anything. Track which products get referenced later. Kill products nobody uses, even if producing them feels productive.

## Strategic, Operational, Tactical: Three Products, Three Audiences

Conflating these three is why executives receive hash lists and SOC analysts receive geopolitical assessments, and why both stop reading.

**Strategic intelligence** serves executives and risk owners. It answers who is likely to target us and why, how that is changing, and what that implies for investment. The time horizon is quarters to years. It is written in business language, contains almost no technical indicators, and its output is budget and priority decisions. Longevity is high; a strategic assessment stays relevant for months.

**Operational intelligence** serves detection engineers, threat hunters, and incident responders. It describes campaigns and adversary tradecraft — how a particular intrusion set gains access, what tooling they favor, what their lateral movement looks like, mapped to MITRE ATT&CK techniques. The time horizon is weeks to months. Its output is detection content, hunt hypotheses, and control changes. This is the highest-value tier for most organizations and the most commonly under-produced.

**Tactical intelligence** serves automated systems and tier-one analysts. It is indicators: hashes, addresses, domains, URLs, and the enrichment that makes them usable. The time horizon is hours to weeks. Its output is blocks, alerts, and retrospective sweeps. It is the easiest tier to buy and the least differentiating.

A healthy program spends most of its human analyst time at the operational tier, automates the tactical tier almost entirely, and produces strategic products on a fixed periodic cadence rather than on demand.

## The Pyramid of Pain Governs Priorities

David Bianco's Pyramid of Pain remains the most useful prioritization model in the field because it answers a question feeds cannot: how much does it cost the adversary when you detect at this level.

| Level | Example | Adversary cost to change | Typical shelf life | Where it belongs |
| --- | --- | --- | --- | --- |
| Hash values | File SHA-256 | Trivial, recompile or pad | Hours | Automated blocking only |
| IP addresses | C2 or staging host | Easy, rotate hosting | Days to weeks | Alerting plus retro hunt |
| Domain names | Beacon domain, phishing lure | Moderate, cost and effort | Weeks | Alerting, DNS controls |
| Network and host artifacts | User agent, mutex, named pipe, URI pattern | Annoying, requires code change | Months | Detection rules |
| Tools | Specific RMM tool, credential dumper, packer | Painful, retooling and retraining | Months to years | Behavioral detections |
| TTPs | Tradecraft and technique chains | Most painful, changes how they operate | Years | Hunting and layered detection |

The operational instruction that follows is straightforward. Automate everything at the bottom three levels — hashes, addresses, and domains should flow into enforcement and alerting without human handling. Spend human analyst time producing detections at the top three levels, because those are what force an adversary to change behavior rather than change infrastructure.

This also reframes the value of a feed. A feed that delivers a million hashes is delivering the least painful detection class in enormous volume. A report that describes how a named intrusion set stages archives before exfiltration is delivering a detection you can build once and keep.

## Operationalizing Intel Into Detections

The handoff between intelligence and detection engineering is where most programs break structurally, usually because the two functions do not share a workflow.

The pattern that works is treating detection content as the primary intelligence deliverable and versioning it like code. An operational intel product should not end with a paragraph of recommendations; it should end with candidate detection logic, a hunt query, and an explicit statement of what coverage gap it closes.

Every detection should carry its intelligence provenance. When an analyst triages an alert at 2 a.m., they need to know why this rule exists, what adversary behavior it represents, how confident the source was, and what to do next. That context belongs in the rule metadata, not in a wiki nobody opens.

```yaml
title: Archive Staging Prior to Exfiltration on File Server
id: 9c2f4d17-intel-linked-example
status: stable
description: >
  Detects creation of large compressed archives on file servers by
  interactive user sessions, a staging behavior consistently observed
  ahead of double-extortion data theft.
references:
  - internal-intel: OPS-2026-041
  - attack: https://attack.mitre.org/techniques/T1560/001/
intel_context:
  requirement: PIR-03 ransomware operations targeting our sector
  source_confidence: high
  observed_in: 4 internal incidents, 2 partner reports
  pyramid_level: host-artifact
logsource:
  product: windows
  category: process_creation
detection:
  archiver:
    Image|endswith:
      - '\7z.exe'
      - '\rar.exe'
      - '\WinRAR.exe'
  args:
    CommandLine|contains:
      - ' a '
      - '-hp'
      - '-v'
  server_context:
    Computer|startswith: 'FS-'
  condition: archiver and args and server_context
falsepositives:
  - Administrator-driven log collection and archival
  - Legitimate backup or migration tooling
level: high
response_guidance: >
  Confirm the account is expected to run archivers on this host. If not,
  isolate, capture the archive path, and check egress logs for that host
  over the preceding 48 hours.
```

Retrospective hunting is the other half of operationalization and it is routinely skipped. When new intelligence arrives about infrastructure or tradecraft, the question is not only "will we catch this going forward" but "did this already happen." That requires log retention long enough to answer — for most organizations, ninety days is the floor and a year is defensible — and a repeatable sweep process.

```python
# Retrospective sweep pattern: check historical telemetry against newly
# received indicators, with age-weighted prioritisation of results.
from datetime import datetime, timedelta

LOOKBACK = timedelta(days=180)

def sweep(indicators, siem):
    findings = []
    since = datetime.utcnow() - LOOKBACK
    for ind in indicators:
        if ind["confidence"] < 70 or ind["type"] == "sha256":
            continue  # low-confidence and hash-only: block, do not sweep
        hits = siem.search(
            field=ind["observable_field"],
            value=ind["value"],
            since=since,
        )
        for hit in hits:
            findings.append({
                "indicator": ind["value"],
                "campaign": ind.get("campaign", "unattributed"),
                "host": hit["host"],
                "first_seen": hit["timestamp"],
                "priority": "high" if hit["direction"] == "outbound" else "medium",
            })
    return sorted(findings, key=lambda f: f["first_seen"])
```

The rule embedded in that snippet matters more than the code: do not sweep on low-confidence indicators or on hashes. Hashes are cheap to change and produce no historical signal worth the query cost. Sweep on infrastructure and behavior.

## Measuring Whether the Program Is Worth It

Threat intel programs die in budget reviews because they measure activity. Reports published, indicators ingested, and feeds subscribed are all inputs. None of them survive the question "so what."

Measure outcomes instead. Several metrics hold up under scrutiny:

**Detection coverage change.** Track ATT&CK technique coverage over time, specifically for techniques associated with the adversaries named in your priority requirements. The claim "we added twenty-three detections covering eleven techniques used by intrusion sets targeting our sector" is defensible.

**Intel-sourced detection yield.** For rules created from intelligence products, track true positive rate and how many led to confirmed incidents or hunts. This also identifies which sources are producing garbage.

**Time to coverage.** From publication of a significant new technique or campaign to deployed detection in your environment. Measured in days, trending down, this is one of the strongest operational health indicators a program has.

**Retrospective hit rate.** How often historical sweeps find prior contact with newly reported infrastructure. A nonzero rate proves the collection is relevant to your environment.

**Requirement satisfaction.** For each priority requirement, can you point to products that addressed it and stakeholders who confirm it informed a decision. This is qualitative and it is the metric executives find most persuasive.

**Decision attribution.** The strongest evidence available: a documented list of decisions — patch prioritization, control investment, vendor risk action, architecture change — where intelligence was a stated input.

Notably absent from that list is anything about feed volume. If a source cannot be tied to detections, hunts, or decisions after two quarters, it is not producing value and the renewal conversation should reflect that. Cutting a feed is a legitimate program outcome.

Small teams should scale the ambition rather than skip the structure. A one-person intel function with five written requirements, one automated indicator pipeline, one monthly operational product, and a quarterly strategic brief will outperform a five-person team maintaining eleven feeds and answering no one's questions.

## Key Takeaways

- Start with written intelligence requirements tied to named decision-makers. Feeds bought before requirements exist create pipelines, not intelligence.
- Indicators without provenance, confidence, and expiry are liabilities. Context is what makes tactical intel actionable and what prevents alert fatigue in the SOC.
- Separate strategic, operational, and tactical products by audience and time horizon. Most organizations under-invest in operational intelligence, which is where detection value concentrates.
- Use the Pyramid of Pain to allocate effort: automate hashes, addresses, and domains entirely; spend human analysis on artifacts, tools, and TTPs, because those impose real cost on adversaries.
- Make detection content the primary deliverable, with intelligence provenance embedded in rule metadata so responders inherit the reasoning along with the alert.
- Measure outcomes — coverage change, time to coverage, retrospective hit rate, and documented decisions — not feeds subscribed or reports published. Retiring a source that produces nothing is a success, not a failure.
