---
title: 'The OWASP Top 10 Explained for Working Engineers'
slug: 'owasp-top-10-explained'
excerpt: 'What each OWASP Top 10 category actually covers, one concrete example of the flaw, the control that fixes it, and what the list deliberately leaves out.'
description: 'A working engineer walkthrough of the OWASP Top 10: what each category covers, a concrete flaw example, and the control that removes it.'
seoTitle: 'OWASP Top 10 Explained: Flaws, Examples, Controls'
seoDescription: 'Practical OWASP Top 10 guide for engineers. Each category explained with a real flaw example, the fixing control, and the gaps the list omits.'
author: 'editorial-team'
category: 'application-security'
type: 'analysis'
editorsPick: true
tags: ['owasp', 'secure-coding', 'vulnerability-management', 'threat-modeling', 'asvs']
publishDate: 2026-07-30
featured: true
draft: false
faq:
  - question: 'Can an application pass or fail the OWASP Top 10?'
    answer: 'No. It is a prevalence-ranked awareness list assembled from aggregated vulnerability data plus a practitioner survey, not a requirements standard. Each entry is a bucket of dozens of CWEs, so a clean scanner report describes your tooling coverage rather than your application security. Use the Application Security Verification Standard when you need testable requirements.'
  - question: 'What does the OWASP Top 10 leave out?'
    answer: 'Business logic abuse is the largest gap. Coupon stacking, negative-quantity orders, workflow step skipping and approval bypass are per-application flaws with no generic signature, so they never aggregate into a CWE ranking. Race conditions, availability engineering, and many client-side issues sit in the same blind spot, and API-first products need the companion OWASP list.'
  - question: 'How do you fix broken access control properly?'
    answer: 'Enforce deny-by-default authorisation in one server-side place, and scope the resource query itself to the caller tenant so the fetch is incapable of returning a record they may not see. A check bolted on after the fetch is not enough. Declare a required permission per route so adding a route without one is a startup error.'
  - question: 'What is the difference between the OWASP Top 10 and ASVS?'
    answer: 'The Top 10 frames risk categories for a general audience. ASVS is a few hundred numbered, verifiable requirements organised by chapter and split into levels, and its requirements read like acceptance criteria, so they map to test cases and owners. Gap-assess against the ASVS level matching your risk, then use the Top 10 to explain why the backlog exists.'
---

The OWASP Top 10 is the most cited document in application security and the most consistently misused. It is a ranked awareness list assembled from aggregated vulnerability data across hundreds of thousands of applications, supplemented by a practitioner survey for the flaw classes that automated testing cannot see. It tells you which categories of defect appear most often and cause the most damage. It does not tell you whether your application is secure.

That distinction gets lost the moment the list reaches a procurement questionnaire or a CI gate. An application can produce zero findings from every Top 10 rule pack a scanner ships with and still be trivially compromised: a business logic flaw in a refund flow, a race condition on a balance transfer, a tenant isolation gap in a shared cache. Meanwhile a team can burn a quarter closing low-severity injection findings while the missing object-level authorization check that would actually lose the customer database sits untouched.

This walkthrough treats each category as an engineering problem. For every one: what the category genuinely covers, one concrete example of the flaw, and the specific control that removes the class rather than the instance. Then the part most summaries skip — what the Top 10 excludes on purpose, and what you should adopt once you need a real requirements baseline instead of an awareness poster.

## What the Top 10 Actually Is

The list is built from two inputs. Most categories are derived from vulnerability data contributed by testing vendors, bug bounty platforms and enterprise scanning programmes, normalised to CWE identifiers and ranked primarily by incidence rate — the percentage of applications in which at least one instance appeared — rather than by raw finding volume. The remainder come from a community survey, which exists precisely because you cannot scan for the absence of a threat model.

Each entry is a bucket of CWEs, not a single defect. Injection maps to dozens of CWEs. Broken Access Control maps to more than thirty. That aggregation is exactly why the document works as an awareness tool and fails as a test plan. "We have no broken access control findings" is a statement about your tooling's coverage of thirty-odd CWEs, not a statement about your authorization model.

Two editions are currently in circulation. The 2021 edition remains what most scanner rulesets, compliance crosswalks and internal policy documents reference, and its category identifiers are the ones you will see in tickets. OWASP has since published a refresh that reorders the ranking and promotes software supply chain concerns into a category of their own. The reshuffling is largely noise for practitioners. The flaw classes below are stable, and so are the controls.

> The useful output of reading the Top 10 is not a remediation backlog. It is a list of questions you now have to answer about your own system, most of which no scanner will answer for you.

## Access Control, Cryptography, and Injection

### Broken Access Control

This category covers every failure to enforce what an authenticated principal is permitted to do. The common shapes are insecure direct object references (changing an identifier in a URL to read another tenant's record), missing function-level checks (an administrative endpoint that only the UI hides), privilege escalation through mass assignment, and CORS or path-normalisation mistakes that expose internal routes.

A concrete example: an invoice endpoint that reads the record by primary key and returns it, trusting that the client only requests identifiers it was shown. Every user is one integer increment away from another organisation's financials.

The control is deny-by-default authorization enforced in one place, server-side, with the resource query itself scoped to the caller's tenant. Not a check bolted on after the fetch — the fetch must be incapable of returning a record the caller cannot see. Enforce it in a shared middleware or policy layer so that adding a route without a declared permission is a startup error, not a silent hole.

```javascript
// Deny by default: a route with no declared permission refuses to serve.
const POLICY = new Map([
  ['GET /api/invoices',        'invoice:read'],
  ['GET /api/invoices/:id',    'invoice:read'],
  ['POST /api/invoices',       'invoice:write'],
  ['DELETE /api/invoices/:id', 'invoice:admin'],
]);

export function authorize(req, res, next) {
  const key = `${req.method} ${req.route.path}`;
  const required = POLICY.get(key);
  if (!required) return res.status(500).json({ error: 'route_missing_policy' });
  if (!req.principal?.permissions.includes(required)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
}

// Object level: scope the query, do not filter after the fact.
export async function getInvoice(db, principal, invoiceId) {
  return db.invoice.findFirst({
    where: { id: invoiceId, orgId: principal.orgId },
  });
}
```

### Cryptographic Failures

This is not "we did not use encryption". It is the broader set of failures to protect data that requires protection: transmitting session material over cleartext channels, storing passwords with fast hashes, using ECB mode, reusing nonces with AES-GCM, hardcoding keys, accepting weak TLS versions, or simply classifying data wrongly so that nothing gets protected at all.

A concrete example: a service encrypts stored tokens with AES-GCM but derives the nonce from a counter that resets when the pod restarts. Nonce reuse under GCM leaks the authentication key relationship and can expose plaintext across messages.

The control is to stop hand-rolling. Use a vetted library at the highest available abstraction — an AEAD interface with library-managed random nonces, or an envelope encryption service from your cloud KMS — and put key rotation and access policy in the platform rather than the application. For passwords specifically, use a memory-hard KDF, never a general-purpose hash.

### Injection

Injection covers SQL, NoSQL, OS command, LDAP, expression language and template injection, and — since the 2021 consolidation — cross-site scripting, which is injection into a browser parser. The unifying property is that untrusted data reaches an interpreter where it can change the structure of a statement rather than only its values.

The control is separation of code and data at the interpreter boundary. Parameterised queries and prepared statements for SQL, parameterised APIs for shell execution (argument arrays, never a shell string), and context-aware output encoding plus a framework's auto-escaping for HTML. Where an identifier genuinely cannot be bound — a sort column, a table name — use a fixed allowlist, not escaping.

```python
# Secure: values are bound by the driver; identifiers come from a fixed allowlist.
ALLOWED_SORT = {"created_at", "number", "amount_cents"}

def list_invoices(conn, org_id: int, status: str, sort: str, limit: int):
    if sort not in ALLOWED_SORT:
        raise ValueError("unsupported sort column")

    sql = f"""
        SELECT id, number, amount_cents, status, created_at
          FROM invoices
         WHERE org_id = %s
           AND status = %s
         ORDER BY {sort} DESC
         LIMIT %s
    """
    with conn.cursor() as cur:
        cur.execute(sql, (org_id, status, min(limit, 200)))
        return cur.fetchall()
```

## Design, Configuration, and Dependencies

### Insecure Design

The category added to make the point that some flaws cannot be patched. If a password reset flow is designed so that knowledge of a public email address plus a four-digit code grants account takeover, no amount of input validation saves it. Insecure design covers missing rate limits on sensitive operations, absent segregation of duties, trust placed in client-side logic, and workflows that never considered an abuse case.

The control is threat modelling as a routine design activity, plus reusable secure design patterns. Ask four questions per feature — what are we building, what can go wrong, what are we doing about it, did we do a good enough job — and write the abuse cases into the acceptance criteria alongside the user stories.

### Security Misconfiguration

Default credentials left in place, verbose stack traces in production, directory listing enabled, unnecessary features installed, permissive cloud storage policies, missing security headers, and unpatched framework defaults. Cloud-native systems have expanded this category considerably: an over-permissive IAM role or a public object storage bucket is a misconfiguration with the impact of a breach.

The control is hardened, versioned baselines applied by automation, with drift detection. Configuration belongs in infrastructure-as-code with policy checks in the pipeline, so that an insecure setting fails a plan rather than living quietly in a console for three years.

### Vulnerable and Outdated Components

Most application code is not application code. A transitive dependency four levels deep runs with the same privileges as everything else in the process. This category also increasingly covers the supply chain around those components: compromised build tooling, typosquatted packages, and unsigned artifacts.

The control is an inventory you can query, continuous scanning against it, and a policy for how fast you patch by severity. Generate an SBOM per build so that when the next widely-exploited library flaw lands you answer "are we affected" from a database rather than from a code search.

```bash
# Fail the build on known-vulnerable direct or transitive dependencies.
npm audit --audit-level=high --omit=dev
pip-audit --strict --requirement requirements.txt

# Produce and retain an SBOM per artifact so exposure questions are queryable.
syft packages dir:. -o cyclonedx-json > sbom.cyclonedx.json
grype sbom:sbom.cyclonedx.json --fail-on high

# Pin and verify: hashes in the lockfile, signature verification on pull.
cosign verify-attestation --type cyclonedx registry.example.com/api:2026.7.3
```

## Identity, Integrity, Detection, and SSRF

### Identification and Authentication Failures

Credential stuffing tolerance, weak or absent multi-factor authentication, session identifiers exposed in URLs, session fixation, predictable tokens, and reset flows that leak account existence. The category is about the whole identity lifecycle, not just the login form.

The control set is well defined: block passwords known to be breached, do not impose rotation or composition rules that push users toward predictable patterns, rate limit and monitor authentication attempts by account and by source, regenerate the session identifier on privilege change, and deploy phishing-resistant multi-factor authentication for anything that matters.

### Software and Data Integrity Failures

Code and infrastructure that trust artifacts from untrusted sources: unsigned updates, dependencies pulled from mutable tags, CI/CD pipelines that anyone with repository write access can alter, and insecure deserialisation of attacker-controlled objects.

The control is verified provenance end to end — signed commits, signed artifacts, immutable digests instead of floating tags, and pipeline definitions protected by the same review requirements as production code. For deserialisation, refuse to deserialise into arbitrary types; use a data-only format with a schema.

### Security Logging and Monitoring Failures

The category with no exploit of its own and the largest effect on breach cost. Failures here mean logins, access control failures and high-value transactions are not logged, logs stay local, alerting thresholds do not exist, and nobody would notice a slow credential-stuffing campaign spread across weeks.

The control is a defined set of security-relevant events emitted in a structured format with sufficient context for an investigation, shipped off-host to append-only storage, with detections and an owner. Log the authorization denial. Log the privilege change. Never log the credential.

### Server-Side Request Forgery

The application fetches a URL supplied or influenced by a user, and the attacker points it at internal infrastructure: cloud metadata endpoints, internal admin interfaces, or non-HTTP services reachable from the application subnet. Webhook registration, PDF rendering, image proxies and URL preview features are the usual entry points.

The control is allowlisting at the network layer plus resolution-time validation. Validate the scheme, resolve the hostname, check the resolved address against blocked ranges, and re-validate after every redirect to defeat DNS rebinding and redirect chains. Better still, route outbound fetches through a dedicated egress proxy that only permits explicitly approved destinations, so an application-layer bypass still hits a closed network.

## Category to Control, at a Glance

| Category | Concrete flaw | Control that removes the class |
| --- | --- | --- |
| Broken access control | Invoice fetched by ID without tenant scoping | Deny-by-default policy layer; tenant-scoped queries |
| Cryptographic failures | AES-GCM nonce reuse after pod restart | AEAD via vetted library; KMS envelope encryption |
| Injection | User input concatenated into SQL or HTML | Parameterised queries; context-aware output encoding |
| Insecure design | Reset flow with a four-digit code, no rate limit | Threat modelling; abuse cases in acceptance criteria |
| Security misconfiguration | Debug mode and stack traces in production | Hardened IaC baselines with pipeline policy checks |
| Vulnerable components | Transitive dependency with known RCE | SBOM per build; severity-based patch SLAs |
| Authentication failures | No lockout, no MFA, session ID in URL | Breached-password checks; WebAuthn; session rotation |
| Integrity failures | CI pulls a mutable `latest` tag | Signed artifacts; immutable digests; protected pipelines |
| Logging failures | Authorization denials never recorded | Structured security events; off-host append-only storage |
| SSRF | Webhook URL resolves to cloud metadata IP | Egress proxy allowlist; post-redirect address validation |

## What the Top 10 Leaves Out on Purpose

The list is scoped to web application risk, ranked by prevalence. That scope excludes a great deal that will still get you breached.

Business logic abuse is the largest gap. Coupon stacking, negative-quantity orders, workflow step skipping and approval bypass are per-application flaws with no generic signature, which is exactly why they do not aggregate into a CWE ranking. Race conditions and time-of-check-to-time-of-use flaws sit in the same blind spot: a double-spend on a wallet withdrawal is not going to appear in a scanner report.

Denial of service and availability engineering are out of scope. Client-side and browser-specific issues — prototype pollution, DOM clobbering, postMessage trust failures — are underrepresented relative to how often they appear in modern single-page applications. Multi-tenancy isolation, arguably the defining security property of SaaS, is folded inside access control rather than treated on its own.

OWASP addresses these gaps with separate documents rather than by expanding the flagship list: an API Security Top 10, a Mobile Top 10, and a Top 10 for large language model applications, among others. If you run an API-first product, the API list is more relevant to your architecture than the web list, and object-level and function-level authorization failures dominate it for the same reason they dominate here.

## From Awareness Document to Engineering Requirements

Once the Top 10 has done its job of framing the risk categories, replace it with something testable. The Application Security Verification Standard is the intended successor artifact: a few hundred numbered, verifiable requirements organised by chapter, split into levels so you can choose a depth appropriate to the system. ASVS requirements read like acceptance criteria — verify that the application uses a single vetted access control mechanism — which means they can be mapped to test cases, assigned to owners and tracked.

Pair ASVS with the OWASP Cheat Sheet Series for implementation detail and the Web Security Testing Guide for how to verify. A practical adoption path: pick the ASVS level that matches your risk, gap-assess against it once, convert the gaps into a backlog, and then use the Top 10 only for what it is good at — explaining to non-specialists why the backlog exists.

The failure mode to avoid is the compliance loop where a scanner is configured to report Top 10 categories, the report is clean, and everyone signs off. Coverage of a category name is not coverage of a category. Ask instead: which of these classes could exist in our system, how would we know, and who checked.

## Key Takeaways

- The Top 10 is a prevalence-ranked awareness document built from aggregated CWE data plus a survey; it is not a requirements standard and cannot be passed or failed.
- Each entry is a bucket of dozens of CWEs, so "no findings in this category" describes your tooling's coverage, not your application's security.
- Access control, cryptography and injection account for most real damage, and all three are fixed by structural controls — deny-by-default policy layers, vetted AEAD and KMS, parameterised interfaces — rather than by case-by-case patching.
- Business logic abuse, race conditions, availability and most client-side flaws are outside the list's scope by design; API-first and mobile products need the companion OWASP lists.
- Use ASVS for testable requirements, the Cheat Sheet Series for implementation, and the Testing Guide for verification once the Top 10 has framed the conversation.
- Category names in a scanner report are not evidence. Evidence is a named owner who checked a specific requirement against a specific system.
