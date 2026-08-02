---
title: 'What It Actually Takes to Build and Run a SOC'
slug: 'building-a-security-operations-center'
excerpt: 'Tiered analyst models are breaking down, alerts keep climbing, and burnout is a design flaw. What a working SOC actually requires.'
description: 'How real security operations centers are staffed, how alerts get triaged, which SOC metrics matter, and when an MDR beats building in-house.'
seoTitle: 'Building a Security Operations Center: A Practical Guide'
seoDescription: 'SOC design in practice: analyst tiering, triage workflow, detection engineering, runbooks, MTTD and MTTR, burnout, and the build-vs-MDR call.'
author: 'compliance-desk'
category: 'soc'
type: 'guide'
tags: ['detection-engineering', 'alert-triage', 'incident-response', 'security-metrics', 'mdr']
publishDate: 2026-07-22
featured: false
draft: false
faq:
  - question: 'Do you need a physical room to run a SOC?'
    answer: 'No. A security operations centre is a set of workflows, a staffing model, a detection backlog, and a measurement discipline, most of which can exist inside a case management tool and a chat channel. Teams that start with the room and the video wall usually end up with an expensive help desk that forwards alerts to email.'
  - question: 'Why are strict Tier 1, 2 and 3 SOC models falling out of favour?'
    answer: 'Tier 1 is defined by what analysts are not allowed to do, applying a decision tree they did not write against rules they cannot change, which drives attrition. The work also does not decompose by queue position, since a commodity phishing alert and a suspicious OAuth consent grant need very different skills. Skill-based routing with rotation holds up better.'
  - question: 'What is a benign true positive and why does the category matter?'
    answer: 'A benign true positive means the rule fired correctly, the activity genuinely happened, and it was authorised. Teams most often omit this disposition code and conflate it with false positives, which leads them to retire detections that are working. Without a controlled disposition vocabulary you cannot compute a per-rule true-positive rate at all.'
  - question: 'Should we build a SOC in-house or buy MDR?'
    answer: 'Frame it by which capabilities depend on context a provider cannot hold. Buy commodity round-the-clock triage unless you already have the scale for eight to ten analysts. Keep in-house the detection content tied to your business logic, the authority to contain your own systems, and enough analytical capability to challenge the provider conclusions.'
---

A security operations centre is not a room with screens on the wall. It is a set of workflows, a staffing model, a detection backlog, and a measurement discipline — most of which can exist entirely inside a case management tool and a chat channel. Teams that start with the room usually end up with an expensive help desk that forwards alerts to email.

The hard parts of SOC work are unglamorous. Deciding which alerts a human should ever see. Writing down what an analyst does at 03:00 when a domain admin account authenticates from an unfamiliar ASN. Keeping detection content current as the estate changes underneath it. Measuring whether any of it is working, and being honest when it is not.

This is a practitioner's view of what the function requires: how staffing models are shifting away from strict tiering, what a triage workflow looks like when it holds under load, why detection engineering has to be a standing function rather than a side project, which metrics are worth reporting, and how to decide whether to build the capability or buy it.

## The Tiering Model and Why Strict Tiers Are Falling Out of Favour

The classic model is three tiers. Tier 1 monitors the queue and closes or escalates. Tier 2 investigates escalations. Tier 3 handles the difficult cases, threat hunting, and detection content. It maps neatly onto a org chart and onto a managed service pricing sheet, which is much of why it persists.

It has two structural problems. The first is that Tier 1 is defined by what it is not allowed to do. Analysts spend shifts applying a decision tree they did not write, against alerts they cannot modify, with no path to fix the rule that generated 400 false positives last week. That is a job description engineered for attrition.

The second is that the work does not actually decompose that way. A commodity phishing alert and a suspicious OAuth consent grant may both land in the same queue, but one needs three minutes and the other needs someone who understands the identity provider's consent model. Routing by queue position rather than by skill wastes both.

> Strict tiering optimises for staffing predictability. Skill-based routing optimises for time to correct decision. Only one of those is a security outcome.

What mature teams are moving toward is a flatter structure with clear roles rather than clear ranks. A triage function that owns the queue and has authority to suppress and tune. An investigation function that owns cases end to end. A detection engineering function that owns content quality. Analysts rotate across these rather than being permanently assigned, which spreads context and slows burnout.

Automation absorbs the genuinely mechanical part. Enrichment, deduplication, reputation lookups, and asset context should never require a human. If a person's first action on an alert is to paste an IP into a lookup tool, that step belongs in the pipeline, not in the shift.

## The Triage Workflow

Triage is the highest-leverage process in the SOC because it decides what everything downstream spends time on. It needs to be written down, not improvised, and it needs to produce one of a small number of terminal states.

A workable triage path answers four questions in order: is this alert credible, is the affected asset in scope and important, is there corroborating evidence, and does this meet the bar for a case. Everything else is detail.

```text
ALERT INTAKE
  |
  +-- Auto-enrich: asset owner, criticality, user role, geo/ASN,
  |                threat intel match, prior alerts on same entity (30d)
  |
  +-- Dedup: same rule + same entity within suppression window? -> merge
  |
  +-- Q1 Credible?      known-good process/path/parent? -> CLOSE (benign, tag rule)
  +-- Q2 In scope?      decommissioned host / test tenant? -> CLOSE (out of scope)
  +-- Q3 Corroborated?  second telemetry source agrees?   -> raise confidence
  +-- Q4 Case bar met?  crown-jewel asset OR privileged identity
                        OR confirmed execution OR data movement
                          -> OPEN CASE (severity from matrix)
                          -> else CLOSE (informational, feed tuning backlog)

EVERY CLOSE REQUIRES: disposition code + one-line rationale
```

The disposition code matters more than it looks. Without a controlled vocabulary — true positive, benign true positive, false positive, duplicate, out of scope, insufficient data — you cannot compute a true-positive rate, and without a true-positive rate you cannot tell a good detection from a noisy one.

The "benign true positive" category is the one teams most often omit and most need. The rule fired correctly, the activity happened, and it was authorised. That is a tuning signal, not a detection failure, and conflating it with false positives will lead you to delete rules that are working.

Suppression should be time-boxed and owned. An open-ended suppression is an undocumented gap in coverage. Give every suppression an expiry, an owner, and a linked ticket describing the permanent fix.

## Detection Engineering as a Standing Function

Detections decay. Applications get replaced, an endpoint agent changes its telemetry format, a cloud provider renames an event, and a rule that fired reliably for a year quietly stops firing at all. Silent failure is the characteristic risk of detection content, and nothing in the alert queue will tell you it happened.

Treat detection content as code. Rules live in version control, changes go through review, and deployment is automated. Sigma is a reasonable authoring format because it decouples the logic from the query language of whichever platform you are on this year, though platform-native rules will always be needed for the cases Sigma cannot express.

Every rule should carry metadata that makes it auditable: what ATT&CK technique it covers, what log sources it depends on, what the expected false positive sources are, and which runbook an analyst should follow.

```yaml
title: Suspicious Service Creation via sc.exe by Non-Admin Parent
id: 8b1f2c44-3a9e-4d21-b6d7-0f3c9a71e4aa
status: production
description: >
  Detects service creation using sc.exe where the parent process is not a
  known administrative tool. Maps to persistence and privilege escalation
  via Windows service abuse.
references:
  - https://attack.mitre.org/techniques/T1543/003/
author: detection-engineering
date: 2026-05-14
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    Image|endswith: '\sc.exe'
    CommandLine|contains|all:
      - ' create '
      - ' binPath='
  filter_admin_tooling:
    ParentImage|endswith:
      - '\ccmexec.exe'
      - '\msiexec.exe'
      - '\tanium.exe'
  condition: selection and not filter_admin_tooling
falsepositives:
  - Software deployment tooling not covered by the parent process filter
  - Legitimate administrative service installation during change windows
level: high
tags:
  - attack.persistence
  - attack.t1543.003
runbook: RB-014-service-persistence
```

The function needs a backlog and a review cadence. Weekly, look at the rules producing the most volume and the lowest true-positive rate and fix or retire them. Monthly, validate that every production rule has fired at least once in a controlled test — atomic tests mapped to ATT&CK techniques work well for this — and flag any that have gone silent.

Coverage should be assessed against a threat model, not against the full ATT&CK matrix. Complete matrix coverage is not a goal any organisation achieves or needs. Pick the techniques that match the adversaries plausibly interested in your sector and the technologies you actually run, and be deliberate about the gaps you accept.

## Runbooks That Analysts Actually Use

Most runbooks fail because they were written for an auditor. A document that explains what a service account is, in prose, will not be opened at 03:00.

Useful runbooks are short, imperative, and specific to a detection or a small family of detections. They state the queries to run, the exact fields to check, the containment actions permitted without approval, and the escalation path with names or rota references rather than job titles.

Three sections carry most of the value. What to confirm first, ordered by how quickly each check can eliminate the alert. What to do if confirmed, with the pre-authorised containment actions listed explicitly. Who to notify and when, including the threshold that triggers incident declaration.

Pre-authorisation is the part that gets skipped and the part that determines response time. If isolating a host requires a manager's approval at 03:00, your mean time to contain is a function of how quickly someone answers their phone. Define in advance which actions an on-shift analyst may take unilaterally — endpoint isolation, session revocation, blocking a hash — and which genuinely require escalation.

## Metrics That Are Worth Reporting

Most SOC dashboards measure activity rather than effect. Alert counts and tickets closed tell you how busy the team was, not whether the organisation is better defended.

| Metric | Definition | What it actually tells you | How it gets gamed |
|---|---|---|---|
| MTTD | Time from earliest attacker action evidenced in telemetry to first alert or human awareness | Detection coverage quality | Measured from alert time instead of attacker action time, which makes it near zero |
| MTTR (respond) | Time from alert to completion of containment action | Response friction, approval bottlenecks | Stopping the clock at acknowledgement rather than containment |
| True-positive rate | True positives divided by all dispositioned alerts, computed per rule | Detection precision, tuning debt | Bulk-closing noisy alerts as "duplicate" |
| Alerts per analyst per shift | Dispositioned alerts divided by analysts on shift | Sustainable load and staffing adequacy | Counting auto-closed alerts as analyst work |
| Detection coverage | Techniques with a validated, currently firing detection, against a defined threat model | Where the gaps are | Counting rules written rather than rules validated |
| Escalation accuracy | Escalations that the receiving function agreed warranted escalation | Triage calibration and training need | Discouraging escalation entirely |

Two of these deserve emphasis. MTTD is only meaningful when measured from the earliest attacker action visible in retained telemetry, which means you can only compute it honestly after an investigation reconstructs the timeline. A dashboard that reports MTTD in real time is reporting something else.

Alerts per analyst per shift is the number most directly tied to quality. Beyond a certain volume, dispositions become reflexive rather than considered, and the failure mode is closing a real intrusion as noise. Every team has a different threshold, but the shape is consistent: precision falls off well before analysts report feeling overloaded.

## Burnout Is an Architecture Problem

SOC attrition is usually explained as a consequence of shift work. Shift work is a factor, but the larger driver is the combination of high volume, low agency, and no visible progress. An analyst who closes 200 alerts and cannot change a single rule has spent a shift absorbing a problem rather than solving one.

The structural fixes are known. Give triage analysts authority to tune and suppress within defined bounds. Rotate people through detection engineering and hunting so the queue is not the whole job. Protect a fixed proportion of each week — not whatever is left over — for tuning, tooling, and training. Cap sustained on-call load and treat repeated after-hours pages as a defect in the detection content.

Follow-the-sun coverage across regions beats overnight shifts wherever the organisation is large enough to support it. Where it is not, a genuine reduction in overnight alert volume — achieved by only paging on detections that warrant waking someone — is the more honest alternative to staffing a night shift that mostly closes noise.

## Build, Buy, or Blend

The build-versus-MDR decision is usually framed as a cost comparison. It is better framed as a question of which capabilities must be internal because they depend on context that a provider cannot hold.

| Capability | Build in-house | MDR provider | Practical verdict |
|---|---|---|---|
| 24x7 triage of commodity alerts | Needs 8-10 FTE minimum for real coverage | Core competency, priced per volume | Buy unless already at scale |
| Detection tuned to your business logic | Requires internal application knowledge | Provider lacks the context | Build |
| Threat hunting against your estate | Needs asset and identity context | Generic hunts only | Build, or co-deliver |
| Incident response and containment | Requires authority over systems | Advisory in most contracts | Build the authority, borrow the expertise |
| Log pipeline and platform engineering | Substantial ongoing effort | Often bundled | Depends on data ownership requirements |
| Compliance evidence and reporting | Aligned to your control set | Standardised reporting | Build the mapping, use provider output |

The blended model is where most organisations land, and the contract terms determine whether it works. Insist on data ownership and export rights, on visibility into the detection logic being run on your behalf, and on measured handoff times rather than acknowledgement SLAs. An MDR that acknowledges in five minutes and escalates a real intrusion in three hours has met its SLA and failed you.

Retain internally, at minimum, the authority to contain, the ownership of business-specific detection content, and enough analytical capability to challenge the provider's conclusions. A SOC function that cannot question its provider is not a SOC function.

## Key Takeaways

- Strict Tier 1/2/3 structures optimise for staffing charts, not outcomes; skill-based routing with rotation through triage, investigation, and detection engineering holds up better and retains people longer.
- Triage needs a written path and a controlled disposition vocabulary — including "benign true positive" — because rule quality metrics are impossible to compute without it.
- Detection content decays silently; treat it as code with version control, ATT&CK mapping, documented false positive sources, and periodic validation that rules still fire.
- Measure MTTD from the earliest evidenced attacker action, MTTR to containment rather than acknowledgement, and true-positive rate per rule; alerts per analyst per shift is the leading indicator of quality decline.
- Pre-authorise containment actions before you need them — approval latency is usually the largest single component of response time.
- Buy commodity 24x7 triage if you lack the scale for it; keep detection content tied to your business logic, containment authority, and the ability to challenge your provider in-house.
