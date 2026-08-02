---
title: 'Zero Trust Architecture: What NIST SP 800-207 Actually Requires'
slug: 'zero-trust-architecture-implementation'
excerpt: 'Zero Trust is an architecture, not a product. Here is what NIST SP 800-207 specifies, how PDP and PEP work, and a realistic migration path off a flat network.'
description: 'Zero Trust explained past the marketing: NIST SP 800-207 components, PDP and PEP design, microsegmentation, and a phased migration plan.'
seoTitle: 'Zero Trust Architecture: NIST SP 800-207 Explained'
seoDescription: 'What NIST SP 800-207 really specifies for Zero Trust: policy decision points, enforcement points, and a phased rollout for real networks.'
author: 'editorial-team'
category: 'zero-trust'
type: 'guide'
editorsPick: true
tags: ['nist-sp-800-207', 'microsegmentation', 'identity', 'policy-enforcement', 'network-architecture']
publishDate: 2026-07-20
featured: true
draft: false
---

Every vendor that sells a firewall, a proxy, an agent, or an identity broker now sells Zero Trust. Almost none of them sell an architecture. NIST Special Publication 800-207, published in August 2020, is roughly fifty pages of design principles and a logical component model. It names no products. Reading it end to end is the cheapest inoculation available against the marketing.

The central claim of SP 800-207 is narrow and load-bearing: network location must stop being an input to authorization decisions. A packet arriving from 10.0.0.0/8 gets no more credit than one arriving from a coffee shop. Everything else in the document — the policy engine, the trust algorithm, per-session grants, continuous evaluation — follows from refusing to treat the corporate LAN as a credential.

That principle is expensive to implement, because most enterprise networks were built on the opposite assumption. Domain controllers trust anything that can reach port 88. File servers trust anything that can reach 445. Database servers frequently trust anything at all, because "it is on the internal VLAN." Zero Trust is the multi-year project of removing that implicit trust from thousands of individual flows without taking the business offline. There is no product SKU for that.

## What SP 800-207 Actually Says

The document opens with seven tenets. They are worth reading verbatim, but the operationally significant ones are these: all data sources and computing services are resources; all communication is secured regardless of network location; access is granted per session; access is determined by dynamic policy including client identity, application state, and requesting asset posture; the enterprise measures the integrity and security posture of all owned and associated assets; authentication and authorization are dynamic and strictly enforced before access is allowed.

Two words in that list do most of the work. **Per-session** means a grant to one resource is not a grant to the network segment that resource lives on. **Dynamic** means the decision is recomputed against current signal, not cached at VPN login and honored for eight hours.

SP 800-207 also describes three deployment approaches, and this is where most Zero Trust programs quietly pick one without saying so:

- **Enhanced identity governance.** Identity is the primary policy component; access derives from user and workload identity plus assigned attributes. Most cloud-first organizations land here by default.
- **Microsegmentation.** Resources sit behind gateways — host firewalls, next-generation firewalls, or hypervisor-level enforcement — acting as enforcement points for individual workloads.
- **Network infrastructure and software-defined perimeters.** An overlay hides resources until a client is authenticated and authorized, usually via an SDP controller and agent.

Most real deployments blend all three. What matters is knowing which one you are actually building, because they have different failure modes and different operational owners.

> Zero Trust is not a state you reach. It is a property of individual access decisions. You can have a Zero Trust path to your CI system while your file servers still run on 1998 assumptions, and that is a legitimate intermediate state — as long as you know which is which.

Two companion documents are worth having open. NIST SP 1800-35, produced by the National Cybersecurity Center of Excellence, is the implementation guide that builds reference architectures from commercially available components. The CISA Zero Trust Maturity Model organizes work into five pillars — Identity, Devices, Networks, Applications and Workloads, Data — with Visibility and Analytics, Automation and Orchestration, and Governance running across all of them. For US federal agencies, OMB M-22-09 sets the actual mandate. Private-sector teams can still use its structure as a roadmap.

## The PDP and PEP Model, Concretely

SP 800-207 splits the architecture into a control plane and a data plane. The control plane contains the **Policy Decision Point (PDP)**, which is itself two logical pieces:

- The **Policy Engine (PE)** makes the grant or deny decision using a trust algorithm.
- The **Policy Administrator (PA)** executes the decision — it establishes or tears down the communication path and issues session credentials or tokens.

The data plane contains the **Policy Enforcement Point (PEP)**, which sits inline between the subject and the resource. It enables, monitors, and eventually terminates the connection. Critically, SP 800-207 notes that the PEP can be logically split: a client-side agent plus a resource-side gateway.

You already have PEPs. A reverse proxy validating a signed session cookie is a PEP. An Envoy sidecar enforcing mTLS peer identity is a PEP. A Windows host firewall rule scoped to an AD computer group is a PEP. The problem in most environments is not the absence of enforcement points; it is that each one consults its own private, statically configured policy, and no component can answer "what is this user currently allowed to reach."

The trust algorithm inside the policy engine can be **criteria-based** (all required attributes must be satisfied) or **score-based** (weighted signals produce a confidence value compared against a threshold), and either **singular** (each request judged independently) or **contextual** (request history informs the decision). Score-based contextual algorithms are more adaptive and considerably harder to debug at 3 a.m. Start criteria-based.

The specification enumerates the inputs the policy engine should consume: continuous diagnostics and mitigation data, compliance requirements, threat intelligence, activity logs, data access policy, enterprise PKI, the identity management system, and SIEM data. If your policy engine only receives a username and a group membership, you have single sign-on, not Zero Trust.

Here is what a realistic authorization input looks like when the signals are actually wired up:

```json
{
  "subject": {
    "sub": "u:jrivera",
    "auth_method": "webauthn",
    "aal": "AAL3",
    "groups": ["eng-platform", "oncall-primary"],
    "auth_time": "2026-07-20T09:14:02Z"
  },
  "device": {
    "id": "d:4f21c9",
    "managed": true,
    "attestation": "tpm2-ak-verified",
    "disk_encryption": "enabled",
    "edr_health": "reporting",
    "os_patch_age_days": 6
  },
  "resource": {
    "id": "svc:payments-admin",
    "sensitivity": "restricted",
    "required_aal": "AAL3",
    "allowed_networks": "any"
  },
  "context": {
    "source_ip_asn": "AS15169",
    "impossible_travel": false,
    "session_risk": "low"
  }
}
```

Note what is absent: there is no field for "is on the corporate network." That omission is the whole point.

## Identity-Driven Microsegmentation

Traditional segmentation draws boundaries with IP addresses. That works until workloads become ephemeral, at which point the address is a poor proxy for what the workload is. Identity-driven microsegmentation replaces the address with a cryptographic workload identity.

SPIFFE and its reference implementation SPIRE express this most clearly. A workload receives an SVID — an X.509 certificate or JWT — whose subject is a URI such as `spiffe://prod.example.com/ns/payments/sa/ledger-writer`. Enforcement happens on identity, and the certificate is short-lived enough that theft has a small window.

In a Kubernetes environment the two enforcement layers look like this:

```yaml
# Layer 1: L3/L4 default-deny. Nothing reaches the namespace unless allowed.
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ledger-ingress
  namespace: payments
spec:
  podSelector:
    matchLabels: { app: ledger }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { name: api-gateway }
          podSelector:
            matchLabels: { app: gateway }
      ports:
        - protocol: TCP
          port: 8443
---
# Layer 2: L7 identity enforcement. mTLS peer identity, method, and path.
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ledger-writer-only
  namespace: payments
spec:
  selector:
    matchLabels: { app: ledger }
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/api-gateway/sa/gateway"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/v1/entries"]
```

The L3/L4 policy limits reachability. The L7 policy limits capability. Deploying only the second leaves an attacker free to scan the pod network; deploying only the first means any compromised gateway pod can call every endpoint the ledger exposes. You need both, and the two are usually owned by different teams, which is an organizational problem disguised as a technical one.

## Device Posture: The Half Nobody Finishes

Tenet five requires measuring the integrity and posture of assets. This is where most programs stall, because posture is only meaningful if it is attested rather than self-reported.

A device claiming "disk encryption enabled" over an API is not evidence. A TPM 2.0 quote signed by an attestation key, tying platform configuration registers to a known-good state, is evidence. Between those extremes sit MDM compliance signals and EDR heartbeat data — useful, but forgeable by an attacker with local administrator rights.

| Posture signal | Forgeable by local admin | Typical enforcement use |
|---|---|---|
| Self-reported agent JSON | Yes | Telemetry only, never authorization |
| MDM compliance state | Partially | Access to standard business apps |
| EDR agent health and last check-in | Partially | Step-up authentication trigger |
| Client certificate in software keystore | Yes, with effort | Device binding for medium-sensitivity apps |
| Private key in TPM or Secure Enclave | No | Device binding for restricted resources |
| TPM 2.0 boot attestation with PCR quote | No | Access to production administrative planes |

Pair this with phishing-resistant user authentication. WebAuthn and FIDO2 authenticators bind the assertion to the origin, which removes the entire category of credential-relay proxies that defeat push notifications and TOTP codes. If your Zero Trust rollout still allows SMS or app-push MFA on administrative resources, the identity half of the architecture has a hole large enough to walk through.

Continuous evaluation is the other half of tenet six. The OpenID Foundation Shared Signals Framework, including CAEP, defines how an identity provider publishes session-relevant events — credential change, device compliance change, session revocation — so that relying parties can terminate access mid-session rather than waiting for a token to expire. Without something in that family, "dynamic policy" degrades into "policy evaluated once per hour."

## A Phased Migration From a Flat Network

The failure pattern is predictable: a team buys a proxy, puts three web apps behind it, declares Zero Trust, and leaves SMB, RDP, and the database tier untouched. This sequence avoids that.

### Phase 0: Inventory and Observe

You cannot write policy for flows you cannot see. Collect NetFlow or IPFIX at aggregation points, enable cloud flow logs, and turn on host firewall logging in audit-only mode. Build a resource catalog: every application, its data sensitivity, owner, authentication method, and current network exposure. Expect a quarter of work and several hundred services nobody claims.

### Phase 1: Fix Identity First

Consolidate on a single IdP. Move every application that speaks SAML or OIDC behind it. Eliminate local and shared accounts. Roll out phishing-resistant MFA to administrators before anyone else. This phase pays for itself regardless of whether the rest of the program finishes, which is why it goes first.

### Phase 2: Put a PEP in Front of Web Applications

An identity-aware proxy that terminates TLS, authenticates the user, evaluates device posture, and forwards to the origin over an authenticated channel. This retires the "VPN in, then browse to anything" pattern for the HTTP-shaped part of the estate, usually the majority by application count.

### Phase 3: Segment Crown Jewels by Blast Radius

Identity infrastructure, backup systems, the CI/CD signing path, the payment or clinical data stores. Explicit allow-lists, and administrative access only from dedicated privileged access workstations.

### Phase 4: Push Enforcement to the Workload

Host firewalls, service mesh policy, and cloud security groups scoped to workload identity rather than CIDR. Generate rules from the flows observed in Phase 0, run in audit mode, then flip to deny.

### Phase 5: Close Continuous Evaluation

Wire posture changes and IdP risk events into session revocation. Log every decision with its full input set, because an authorization system you cannot explain is one you cannot safely tighten.

A useful audit-mode workflow at Phase 4:

```bash
# Generate candidate host-firewall rules from observed connections.
ss -tanp state established | awk '{print $4, $5}' | sort -u

# nftables in log-only mode: see what a default-deny would break.
nft add table inet zt
nft 'add chain inet zt input { type filter hook input priority 0; policy accept; }'
nft 'add rule inet zt input tcp dport { 22, 445, 3389, 5985, 5986 } \
     log prefix "ZT-CANDIDATE-DENY: " level info'

# After a full business cycle, review before switching policy to drop.
journalctl -k --since "-14d" | grep ZT-CANDIDATE-DENY | \
  grep -oE '(SRC|DPT)=[^ ]+' | paste - - | sort | uniq -c | sort -rn | head -50
```

Fourteen days is a minimum. Month-end batch jobs and quarterly reporting never appear in a two-day capture, and discovering them by outage is how these programs lose executive support.

## Where These Programs Go Wrong

**Buying the tool before writing the policy.** The policy engine is worthless without an authoritative resource catalog and a decided set of access rules. Procurement is not architecture.

**Treating the VPN cutover as the finish line.** Replacing remote access changes the front door. It does nothing about east-west movement, which is where most damage happens.

**Leaving legacy protocols out of scope permanently.** SMB, LDAP on 389, RDP on 3389, and unauthenticated internal APIs will not be brought into a Zero Trust model by identity federation alone. They need enforcement points in the network path, and deferring them indefinitely means the architecture never actually applies to the systems attackers target.

**No break-glass design.** If the policy engine is unavailable, does everything fail closed? For a payments system, probably yes. For a hospital, absolutely not. Decide deliberately, document it, and test the break-glass path on a schedule — including the alerting that fires when it is used.

**Logging decisions without the inputs.** "Denied" is not an investigable record. Log the subject, device, resource, policy version, and the rule that matched.

## Key Takeaways

- NIST SP 800-207 defines an architecture built from a Policy Decision Point (policy engine plus policy administrator) and Policy Enforcement Points. No single product implements all of it.
- The non-negotiable principle is that network location is not a credential. Every design choice should be tested against that statement.
- Identity-driven microsegmentation needs two enforcement layers: L3/L4 reachability control and L7 identity-and-operation control. One without the other leaves an obvious gap.
- Device posture only counts as an authorization input when it is hardware-attested. Self-reported agent data belongs in telemetry, not in policy.
- Sequence the migration: inventory, then identity, then a proxy for web apps, then blast-radius segmentation of critical systems, then workload-level enforcement, then continuous evaluation.
- Run every new enforcement point in audit mode for at least one full business cycle before switching to deny, and design the break-glass path before you need it.
