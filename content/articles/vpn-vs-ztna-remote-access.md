---
title: 'VPN vs ZTNA: Choosing a Remote Access Model That Holds'
slug: 'vpn-vs-ztna-remote-access'
excerpt: 'Network-level tunnels versus application-level brokering. The real security differences, topology and performance trade-offs, and where a VPN still wins.'
description: 'VPN versus ZTNA compared honestly: network-level access, application brokering, performance, failure modes, and when a VPN is still right.'
seoTitle: 'VPN vs ZTNA: An Honest Remote Access Comparison'
seoDescription: 'How VPN and ZTNA differ for remote access: tunnel versus broker, blast radius, latency, migration steps, and the failure modes of each.'
author: 'editorial-team'
category: 'vpn'
type: 'review'
tags: ['ztna', 'remote-access', 'wireguard', 'ipsec', 'identity-aware-proxy']
publishDate: 2026-06-18
featured: false
draft: false
---

A VPN answers the question "should this person be on the network." ZTNA answers "should this person, on this device, reach this application, right now." Those are different questions, and the gap between them is the entire argument.

That gap is not a marketing invention. When a remote user authenticates to a VPN concentrator, the gateway assigns them an address and installs routes. From that moment, reachability is governed by routing tables and firewall rules that were written for a static office population. A compromised laptop with valid VPN credentials has the same network position as a workstation plugged into a wall port in headquarters — which, in most environments, means it can scan the server subnets, hit SMB on 445, and enumerate the directory over LDAP on 389.

But ZTNA is not a strict upgrade, and vendors selling it are rarely candid about what it does not do. It introduces a hard dependency on a broker whose outage is a total outage. It handles HTTP-shaped applications elegantly and non-HTTP protocols with varying degrees of awkwardness. And when it is deployed as a SaaS control plane, the vendor sits in the authorization path for every connection your workforce makes. Those are real trade-offs that belong in the decision, not in the footnotes.

## What the Two Models Actually Do

A **VPN** builds an encrypted tunnel at layer 3. IPsec uses IKEv2 on UDP 500 and 4500 for key exchange and NAT traversal, then ESP for the data channel. TLS-based VPNs encapsulate over TCP or DTLS on 443. WireGuard uses a single UDP port, commonly 51820, with a fixed modern cipher suite and a much smaller codebase. In all cases the outcome is the same: the client receives an IP address that can route into private networks, and access control is a routing and firewall problem downstream of authentication.

**ZTNA** inverts the topology. Instead of the client reaching into the network, a connector deployed next to the application makes an *outbound* connection to a broker. The client also connects outbound to the broker. The broker authenticates the user, evaluates device posture, checks policy for that specific application, and then stitches the two connections together. The private network never exposes an inbound listener to the internet, and the client is never placed on the network at all.

Two ZTNA delivery models are in common use:

- **Service-initiated (agentless).** The broker acts as a reverse proxy. The user reaches the application through a browser over TLS. No client software required, which makes it viable for contractors and unmanaged devices, but it works only for browser-accessible protocols and gives you weak device signal.
- **Endpoint-initiated (agent-based).** A local agent intercepts traffic destined for protected applications and tunnels it to the broker. This supports arbitrary TCP, gives real device posture, and requires managing an agent fleet.

Most deployments end up running both, because the population of users and the population of protocols are both heterogeneous.

| Property | Traditional VPN | ZTNA |
|---|---|---|
| Access granularity | Network or subnet | Named application, port, sometimes URL path |
| Client network position | Assigned an internal-routable address | None; no route into the network |
| Inbound internet exposure | Gateway must listen publicly | None; connectors dial outbound |
| Authorization timing | At tunnel establishment | Per session, re-evaluated on signal change |
| Device posture input | Optional, often bolted on | Central to the model |
| Non-HTTP protocol support | Native, any IP traffic | Good with an agent, limited agentless |
| Lateral movement after compromise | Bounded only by internal firewall rules | Bounded to explicitly granted applications |
| Failure of the control plane | Existing tunnels usually survive | Typically all access stops |
| Third-party in the data path | No, if self-hosted | Usually yes, for SaaS brokers |
| Site-to-site connectivity | Native and mature | Not the intended use case |

> The security difference is not encryption — both encrypt well. It is what an attacker inherits when they steal a session. With a VPN they inherit a network position. With ZTNA they inherit one application.

## The Blast Radius Difference, Concretely

Consider a phished user whose credentials and session are stolen. Under a VPN with a permissive internal firewall, the attacker can enumerate hosts, find an unpatched service, and move laterally. Under ZTNA, the same stolen session grants exactly the applications in that user's policy, over the exact ports specified. There is no host discovery step because there is no network to discover.

This is why the split-tunnel configuration on a VPN deserves more scrutiny than it usually gets. Consider two WireGuard client configurations:

```ini
# Full tunnel. All traffic, including internet browsing, traverses the gateway.
[Interface]
PrivateKey = <client-private-key>
Address    = 10.99.0.14/32
DNS        = 10.10.20.53

[Peer]
PublicKey  = <server-public-key>
Endpoint   = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25

# Least-privilege tunnel. Only three named destinations are routed.
[Peer]
PublicKey  = <server-public-key>
Endpoint   = vpn.example.com:51820
AllowedIPs = 10.10.20.15/32, 10.10.20.16/32, 10.10.21.0/28
PersistentKeepalive = 25
```

In WireGuard, `AllowedIPs` is both a routing directive and a cryptographic access control list — packets for addresses outside that set are neither sent nor accepted on the tunnel. Narrowing it is the closest a VPN gets to per-application access, and it costs nothing but the discipline to maintain per-role configurations. Most organizations run the first form for every user and then wonder why the VPN offers no containment.

The equivalent policy in a ZTNA system is declarative and identity-scoped rather than address-scoped:

```yaml
application:
  name: billing-admin
  connector_group: dc-east
  destinations:
    - host: billing-app.internal
      protocol: tcp
      ports: [443]
policy:
  action: allow
  subjects:
    groups: ["finance-admins"]
  conditions:
    authentication:
      method: webauthn          # phishing-resistant, no push or TOTP
      max_age_minutes: 60
    device:
      managed: true
      disk_encryption: required
      edr_status: healthy
      os_patch_age_days_max: 14
    network:
      countries_allowed: ["US", "CA"]
  session:
    reevaluate_on: ["device_noncompliant", "credential_change", "session_revoked"]
    max_duration_minutes: 240
```

Note the `reevaluate_on` block. A VPN tunnel established at 09:00 is generally still trusted at 17:00 regardless of what happened to the endpoint in between. A broker subscribing to identity and posture events can tear the session down mid-flight. This is the practical meaning of "continuous verification," and it is the feature most worth verifying during a proof of concept, because implementations vary widely.

## Attack Surface and Patch Cadence

A VPN concentrator is, by necessity, an internet-facing device that terminates untrusted connections before authentication. That places pre-authentication code paths directly in the exposure envelope. Remote access gateways from multiple major vendors have been the subject of exploited pre-authentication vulnerabilities added to the CISA Known Exploited Vulnerabilities catalog, and they remain a favored initial access route for both ransomware crews and state-aligned intrusion sets. This is not a defect of any single product; it is a structural property of listening on the internet.

ZTNA's outbound-connector model removes that listener from your network. It does not remove the risk — it relocates it to the broker, which is now the internet-facing pre-authentication surface. The difference is who patches it and how fast. A SaaS broker is patched by the vendor continuously, without your change window. A self-hosted broker is your problem again, on your patch cadence.

If you keep a VPN, the compensating controls are well understood: patch the gateway on an emergency cadence rather than a monthly one, enforce phishing-resistant MFA at the gateway, restrict management interfaces to an internal or out-of-band path, monitor for authentication anomalies, and rotate credentials after any gateway vulnerability with confirmed exploitation.

## Performance and Topology

VPN traffic is backhauled. A user in Lisbon accessing a SaaS application, connected to a full-tunnel VPN concentrator in Virginia, sends every packet across the Atlantic twice. That is a fixed latency tax on traffic that never needed to touch your network.

VPNs also carry an MTU problem. IPsec with ESP adds roughly 50 to 73 bytes of overhead depending on cipher and NAT traversal; WireGuard adds 60 for IPv4. If the path MTU is 1500 and you do not account for the overhead, you get fragmentation or black-holed large packets — the classic symptom being that SSH connects fine but `scp` of a large file hangs. Clamping is the standard fix:

```bash
# Clamp TCP MSS to the tunnel path MTU. Prevents large-packet black-holing.
iptables -t mangle -A FORWARD -o wg0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Verify the effective path MTU end to end (do not fragment, decreasing sizes).
ping -M do -s 1372 -c 3 10.10.20.15

# WireGuard: set the interface MTU explicitly rather than relying on discovery.
ip link set mtu 1420 dev wg0
```

TLS-over-TCP VPNs add a second problem: TCP inside TCP. When the outer connection retransmits, the inner connection is already retransmitting, and throughput collapses under packet loss. This is why serious TLS VPN implementations prefer DTLS or QUIC for the data channel and fall back to TCP only when UDP is blocked.

ZTNA replaces backhaul with a broker point of presence, which usually sits closer to the user than your data center does. The new variable is connector placement — put connectors adjacent to the applications they front, and size them, because every session traverses one. Also budget for TLS termination at the broker: if the broker decrypts to inspect, that is both a performance cost and a data-handling decision your privacy and legal teams need to sign off on.

## Where a VPN Is Still the Right Answer

Being honest about this is what separates an architecture decision from a purchase decision.

**Site-to-site connectivity.** IPsec between branch offices, data centers, and cloud VPCs is mature, well understood, and not what ZTNA was built for.

**Operational technology and industrial protocols.** Modbus, DNP3, PROFINET, and vendor-specific engineering protocols frequently break under application-layer brokering. A carefully firewalled IPsec tunnel into a segmented OT DMZ, with a jump host at the boundary, remains the practical pattern.

**Network device administration.** Managing switches, firewalls, and out-of-band controllers over SSH and IPMI generally lands better on a VPN plus a hardened bastion than on an application broker.

**Sovereignty and third-party constraints.** If your regulator or contract prohibits routing session metadata through a third-party control plane, a self-hosted VPN — or a self-hosted broker — may be the only compliant option.

**Cost and scale.** WireGuard on a pair of small instances serving fifty engineers costs almost nothing. Per-user ZTNA licensing at that scale is real money that could fund other controls.

**Bandwidth-heavy internal transfers.** Multi-gigabyte transfers to internal storage often perform better through a tuned tunnel than through a brokered session with an inspection stage.

## Failure Modes of Each

### VPN Failure Modes

Credentials without phishing-resistant MFA, which is how most gateway compromises begin. Split-tunnel DNS leaking internal names to public resolvers. Always-on policies that users learn to disable. Gateway patching that requires a maintenance window nobody schedules. Concentrator capacity that was sized before the workforce went remote. And the durable one: no internal segmentation behind the tunnel, so the VPN is effectively a public on-ramp to a flat network.

### ZTNA Failure Modes

Broker outage equals total access outage, so the break-glass path must be designed and rehearsed before it is needed. Connector compromise, which yields a foothold adjacent to the application. Agentless mode providing near-zero device assurance while appearing to satisfy the device-posture requirement. Policy sprawl, where per-application rules accumulate faster than anyone reviews them. Incomplete protocol coverage that pushes teams into keeping a shadow VPN for the exceptions. And identity provider dependency: if the IdP is down or compromised, ZTNA has no fallback because identity is the entire control.

## Migrating Without a Flag Day

Run both. Anyone promising a clean cutover has not inventoried your application estate.

Start by cataloging every remote-access destination, its protocol, and its user population. Move browser-accessible internal applications to ZTNA first — they are the largest group by count and the easiest to broker. Then take the agent-based path for TCP applications with defined ports.

As each application moves, remove its route from the VPN configuration. This is the step most migrations skip, and skipping it means the VPN remains a parallel unrestricted path that quietly nullifies every ZTNA policy you wrote. Narrow `AllowedIPs` or the equivalent as you go, until the VPN serves only the residual set: site-to-site, OT, and network administration.

Watch DNS. ZTNA agents typically intercept name resolution for protected applications, and split-horizon DNS plus a VPN resolver plus a broker resolver is a reliable source of confusing partial outages. Decide the resolution order deliberately and document it.

Finally, keep both authentication paths behind the same identity provider with the same phishing-resistant MFA requirement. A ZTNA deployment fronted by strong authentication, sitting alongside a VPN that still accepts a password and a push notification, has the security posture of the VPN.

## Key Takeaways

- The core difference is granularity: a VPN grants a network position, ZTNA grants an application. That determines what an attacker inherits from a stolen session.
- ZTNA connectors dial outbound, removing the internet-facing pre-authentication listener from your network — but relocating that surface to the broker, not eliminating it.
- If you keep a VPN, narrow the routed scope per role, enforce phishing-resistant MFA at the gateway, and patch it on an emergency cadence.
- Verify continuous re-evaluation during a proof of concept. Session termination on posture or credential change is the feature that distinguishes real ZTNA from a rebranded proxy.
- VPNs remain the right tool for site-to-site links, OT protocols, network device administration, and sovereignty-constrained environments.
- Migrate application by application, and remove each application's route from the VPN as you go, or the old path silently overrides the new policy.
