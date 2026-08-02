---
title: 'SIEM Done Properly: Log Management That Earns Its Cost'
slug: 'siem-log-management-best-practices'
excerpt: 'Most SIEM programmes fail on ingest cost and untuned rules. Here is how to prioritise log sources, tier retention, and keep detections alive.'
description: 'Log source prioritisation, normalisation, retention tiering, and detection rule lifecycle: how to stop your SIEM becoming a costly log archive.'
seoTitle: 'SIEM Best Practices: Log Management That Works'
seoDescription: 'Practical SIEM guidance on log source priority, parsing, retention tiers, ingest cost control, and detection rule tuning with example logic.'
author: 'compliance-desk'
category: 'siem'
type: 'guide'
editorsPick: true
tags: ['log-management', 'detection-rules', 'data-retention', 'threat-detection', 'security-engineering']
publishDate: 2026-07-08
featured: false
draft: false
---

The most common SIEM failure is not a missed detection. It is a platform that ingests several terabytes a day, costs more than the security team's salary budget, and is queried by three people during audit week. The logs are all there. Nobody is looking at them, and no detection depends on most of them.

This happens because SIEM deployments are usually run as data collection projects. The success criterion becomes "how many sources are onboarded", which is measurable, procurable, and entirely disconnected from whether anything gets detected. Six months in, the team has full coverage of DHCP logs and no reliable detection for credential abuse in the identity provider.

The alternative is to run the SIEM backwards: start from the detections and investigations you need to support, derive the log sources those require, and onboard nothing else until those are parsed, validated, and producing tuned rules. This piece covers how to do that — source prioritisation, normalisation, retention tiering, cost control, and the rule lifecycle that keeps content from rotting.

## Prioritise Log Sources by Detection Value, Not by Availability

Every estate has sources that are easy to onboard and sources that matter. They overlap less than you would hope. The ordering below reflects what most detections and most investigations actually depend on.

| Priority | Source | Why it earns the spend | Typical daily volume |
|---|---|---|---|
| 1 | Identity provider audit and sign-in logs (Entra ID, Okta) | Nearly every intrusion touches identity; low volume, very high signal | Low |
| 2 | EDR process and telemetry events | Execution, persistence, and lateral movement evidence in one source | Medium-high |
| 3 | Cloud control plane (AWS CloudTrail, Azure Activity, GCP Admin Activity) | Only record of privilege and configuration change in cloud estates | Medium |
| 4 | Windows Security event logs, filtered (4624, 4625, 4648, 4672, 4688, 4720, 4728, 5140) | Authentication and privilege context; unfiltered collection is the classic cost mistake | High if unfiltered |
| 5 | Authentication and access logs from VPN, SSO-fronted apps, and remote access | Initial access and impossible-travel logic | Low |
| 6 | DNS query logs and proxy/egress logs | Command and control, exfiltration, and post-incident scoping | Very high |
| 7 | Email security gateway events | Phishing triage and campaign scoping | Medium |
| 8 | Network sensors (Zeek conn/ssl/http, Suricata alerts) | East-west visibility where EDR cannot reach | High |
| 9 | Application and database audit logs for crown-jewel systems | Data access evidence; usually the only source that answers "what did they take" | Varies |
| 10 | Infrastructure and appliance syslog | Mostly operational; onboard selectively | High |

Two things about this ordering. Identity comes first because it is cheap and because credential abuse is the dominant intrusion pattern across almost every sector — a single Okta or Entra ID tenant produces a fraction of the volume of a DNS resolver and supports considerably more detection logic.

DNS and proxy sit lower than their investigative value would suggest, purely because of cost. They are close to indispensable for scoping an incident and close to ruinous to retain hot at full fidelity. That tension is what retention tiering exists to resolve.

> The question to ask before onboarding any source is not "can we get this data" but "name the detection or investigation step that fails without it." If nobody can answer, the source is a cost centre.

## Normalisation Determines Whether Anything Is Queryable

A SIEM full of unparsed events is a text search engine with a security-shaped invoice. Normalisation — mapping vendor fields into a consistent schema — is what makes cross-source correlation possible, and it is consistently the most under-resourced part of a deployment.

Pick a schema and enforce it. The Open Cybersecurity Schema Framework (OCSF) has become the common target; the Elastic Common Schema (ECS) is well established and pragmatic; several platforms impose their own. Which you choose matters far less than choosing one and rejecting sources that do not conform.

The fields that carry nearly all detection weight are small in number: event time in UTC with an unambiguous ingest time alongside it, source and destination host and IP, user principal in a canonical form, process name and full command line, parent process, file path and hash, and an action or outcome field. Get those right across every source and most correlation becomes straightforward.

Canonical user identity is the field teams most often get wrong. The same human appears as `DOMAIN\jsmith`, `jsmith@corp.example`, `Jane Smith`, and an opaque object ID across four sources. Until an enrichment step resolves those to one identifier, any detection that correlates identity behaviour across systems will silently under-fire.

Validate parsing continuously rather than at onboarding. A vendor agent upgrade that changes a field name will break a parser without generating an error anywhere, and the resulting detection gap can persist for months.

```bash
# Daily parse-health check: flag sources where unparsed events exceed 2%
# or where daily volume deviates sharply from the trailing 7-day median.

curl -s -u "$SIEM_USER:$SIEM_PASS" \
  "https://siem.internal/api/v1/search" \
  --data-urlencode 'query=
    index=* earliest=-24h latest=now
    | eval parse_ok=if(isnull(event.category), 0, 1)
    | stats count AS total, sum(parse_ok) AS parsed BY source.type
    | eval unparsed_pct=round(100*(total-parsed)/total, 2)
    | where unparsed_pct > 2
    | sort - unparsed_pct' \
  | jq -r '.results[] | "PARSE_FAIL \(.["source.type"]) \(.unparsed_pct)% of \(.total)"'

# Silent-source check: sources that reported yesterday but not today
# are the higher-severity finding — a dead feed produces no errors at all.
```

## The Ingest Cost Trap

Volume-priced SIEM licensing creates a perverse incentive structure: the security team is penalised for visibility, and the natural response — dropping sources — reduces detection capability. The correct response is to reduce volume without reducing signal.

Filter at the source or at the collection tier, never in the SIEM. Windows Security logs are the standard example: a domain controller emits enormous volumes of event ID 4662 and 5145 that almost no detection uses. Collecting the specific event IDs your detections and investigations reference, rather than the whole channel, typically removes the majority of Windows volume at negligible cost to coverage.

Aggregate high-cardinality, low-variance telemetry before ingest. Firewall accept logs and NetFlow are candidates: summarised connection records preserve most investigative value at a fraction of the volume, with full-fidelity capture retained separately in cheap storage.

Route by purpose. Modern architectures separate the detection path from the retention path — a pipeline tool (Cribl, Logstash, Vector, or a cloud-native equivalent) sends a filtered, normalised stream to the SIEM for real-time detection and a full-fidelity copy to object storage for investigation and compliance. This is the single highest-impact cost intervention available to most teams, and it also breaks the vendor lock created by keeping the only copy of your data inside a licensed platform.

Chargeback works where it can be implemented. When application teams see the ingest cost their debug-level logging generates, verbosity drops without a security mandate being needed.

## Retention Tiering

Retention should be driven by three separate requirements — detection, investigation, and compliance — which have different time horizons and different access patterns. Treating them as one requirement is what produces 400-day hot retention across everything.

| Tier | Window | Contents | Access | Purpose |
|---|---|---|---|---|
| Hot | 7-30 days | Fully parsed, indexed, detection-critical sources | Sub-second search | Real-time detection, active triage |
| Warm | 30-90 days | Same sources, indexed but slower storage | Seconds to minutes | Investigation, hunting, scoping |
| Cold / searchable archive | 90 days to 1 year | All sources, compressed, schema-on-read | Minutes | Incident scoping, retrospective hunting after new intel |
| Frozen / object storage | 1-7 years | Raw originals, immutable, integrity-hashed | Restore required | Regulatory retention, legal hold, breach investigation |

The window that matters most is cold. Intrusions are routinely discovered long after initial access, and a team whose oldest queryable data is 30 days old cannot answer when the compromise started — which is the first question every regulator, insurer, and executive asks. Searchable archive tiers priced on storage rather than ingest make a one-year window affordable for almost any organisation.

Frozen tiers need integrity controls to be worth anything evidentially. Write-once storage with object lock, hashes recorded at write time, and documented chain of custody. Compliance regimes vary in their explicit demands — PCI DSS calls for a year with 90 days immediately available, others are less prescriptive — but the practical bar for incident work is higher than most compliance minimums anyway.

## Detection Rule Lifecycle

A SIEM rule is not finished when it is deployed. It has a lifecycle, and skipping stages is why so many deployments carry hundreds of rules with no idea which ones work.

The stages are: proposed, developed against a documented threat behaviour, validated with a controlled test that proves it fires, run in monitor-only mode for a tuning period, promoted to production with an owner and a runbook, reviewed on a schedule, and retired when superseded or when the underlying source is gone.

The monitor-only period is non-negotiable. A rule that goes straight to production is a commitment to whatever false positive volume it happens to produce, made without measuring it first. Two weeks of shadow running against live data reveals the benign sources of the pattern before analysts are the ones absorbing them.

Review cadence should be driven by data. Every rule needs a fire count and a true-positive rate. Rules with high volume and low precision get tuned or retired. Rules that have not fired at all in ninety days are either covering a genuinely rare technique — in which case validate them with an atomic test — or broken.

Here is what a tuned identity detection looks like once it has been through that process. The pattern is impossible-travel adjacent, but the value is in the exclusions, which is true of nearly all production detection logic.

```sql
-- Successful interactive sign-in from a country with no prior history
-- for that principal in the trailing 90 days.
-- Tuned exclusions carry more weight here than the core logic.

WITH baseline AS (
  SELECT
    user_principal_name,
    ARRAY_AGG(DISTINCT location_country) AS known_countries
  FROM identity_signin_logs
  WHERE event_time BETWEEN NOW() - INTERVAL '90 days' AND NOW() - INTERVAL '1 day'
    AND result_type = 0                    -- success only
    AND risk_state != 'confirmedCompromised'
  GROUP BY user_principal_name
),
candidates AS (
  SELECT
    s.event_time,
    s.user_principal_name,
    s.location_country,
    s.ip_address,
    s.autonomous_system_number,
    s.app_display_name,
    s.client_app_used,
    s.device_compliant,
    s.mfa_result
  FROM identity_signin_logs s
  JOIN baseline b USING (user_principal_name)
  WHERE s.event_time >= NOW() - INTERVAL '1 hour'
    AND s.result_type = 0
    AND NOT (s.location_country = ANY (b.known_countries))
    -- Exclusion 1: corporate egress and known VPN ASNs
    AND s.autonomous_system_number NOT IN (SELECT asn FROM corp_egress_asns)
    -- Exclusion 2: service principals and break-glass accounts
    AND s.user_principal_name NOT IN (SELECT upn FROM excluded_principals)
    -- Exclusion 3: approved travel window from the HR feed
    AND NOT EXISTS (
      SELECT 1 FROM approved_travel t
      WHERE t.user_principal_name = s.user_principal_name
        AND s.event_time BETWEEN t.starts_at AND t.ends_at
        AND t.country = s.location_country
    )
)
SELECT
  event_time, user_principal_name, location_country, ip_address,
  autonomous_system_number, app_display_name, client_app_used,
  device_compliant, mfa_result,
  CASE
    WHEN device_compliant = FALSE AND client_app_used = 'Other clients' THEN 'high'
    WHEN device_compliant = FALSE THEN 'medium'
    ELSE 'low'
  END AS severity
FROM candidates
ORDER BY event_time DESC;
```

The severity expression at the end matters as much as the detection itself. A single alert with a graded severity based on device compliance and legacy authentication use gives triage a starting point; a flat "suspicious sign-in" alert gives them nothing and will be closed unread within a month.

## How to Tell Your SIEM Is Just an Archive

There are reliable symptoms. Nobody outside the SOC has run a query in the last quarter. Detection rules were last modified when the platform was deployed. The team cannot state which log sources their top ten detections depend on. Alert volume has been flat for a year while the estate grew. Incident investigations are conducted primarily in the EDR console because the SIEM is too slow or too incomplete to be useful.

The remedy is uncomfortable but simple: audit every onboarded source against the detections and investigation steps that reference it, and put anything unreferenced on a decommissioning path unless a compliance obligation names it explicitly. Redirect the recovered budget to parsing quality, enrichment, and detection engineering time.

A smaller SIEM with correct parsing, current content, and a searchable one-year archive outperforms a comprehensive one that nobody trusts. Coverage is a property of detections, not of ingest volume.

## Key Takeaways

- Derive log sources from the detections and investigations you need to support; identity provider logs, EDR telemetry, and cloud control plane events deliver the most detection value per gigabyte.
- Enforce a single normalisation schema such as OCSF or ECS, resolve user identity to one canonical form, and monitor parse health and silent feeds daily — broken parsers fail without raising errors.
- Filter and aggregate at the collection tier, route a filtered stream to the SIEM and a full-fidelity copy to object storage; this cuts cost and removes the lock-in of keeping your only copy in a licensed platform.
- Tier retention against three distinct requirements — detection, investigation, and compliance — and prioritise a searchable archive of at least a year, because intrusion discovery routinely postdates initial access by months.
- Run every new rule in monitor-only mode before production, attach an owner, runbook, and severity grading, and review rules on fire count and true-positive rate.
- Audit sources against the detections that reference them; anything unreferenced and not compliance-mandated is spend without coverage.
