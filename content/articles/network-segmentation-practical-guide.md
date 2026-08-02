---
title: 'Network Segmentation: A Practical Guide for Small Teams'
slug: 'network-segmentation-practical-guide'
excerpt: 'VLANs, subnets, and microsegmentation compared, plus how to pick segment boundaries by blast radius and roll out east-west controls without breaking production.'
description: 'How to segment a flat network incrementally: VLANs versus microsegmentation, east-west controls, jump hosts, and real firewall rule examples.'
seoTitle: 'Practical Network Segmentation: A Hands-On Guide'
seoDescription: 'Practical network segmentation for small teams: VLANs, subnets, microsegmentation, east-west traffic control, and jump host design.'
author: 'editorial-team'
category: 'network-security'
type: 'guide'
tags: ['vlan', 'microsegmentation', 'firewall-rules', 'east-west-traffic', 'blast-radius']
publishDate: 2026-07-05
featured: false
draft: false
faq:
  - question: 'Is a VLAN by itself network segmentation?'
    answer: 'No. A VLAN is a layer 2 broadcast domain boundary, and the moment you configure a routed interface for each VLAN, traffic flows between them unless something filters it. A subnet defines an address range and enforces nothing on its own. VLANs and subnets create boundaries; firewalls, host firewalls and security groups are what enforce them.'
  - question: 'Where should the first segmentation boundaries go?'
    answer: 'Between the systems most likely to be compromised first and the systems whose compromise would be existential. The first group is user endpoints, internet-facing services, contractor devices, and unpatchable embedded devices such as cameras and printers. The second is the identity directory, backups and their management plane, the hypervisor or cloud control plane, CI/CD, and regulated data stores.'
  - question: 'Which east-west controls give the most risk reduction?'
    answer: 'Blocking workstation-to-workstation traffic on SMB port 445, RDP port 3389, WinRM ports 5985 and 5986, and SSH port 22 delivers more risk reduction per hour of effort than any other segmentation work. Normal users have no reason to open a share or a remote desktop session on a colleague machine. Scope exceptions to named management servers.'
  - question: 'How do you roll out segmentation without breaking production?'
    answer: 'Deploy rules in log-only or permit-and-log mode and run them for a full business cycle of at least a month so month-end processing appears. Move one segment at a time, starting with guest Wi-Fi or IoT. Never renumber and filter in the same change, write the rollback before the change, and give every exception an expiry date.'
---

Most networks in small and mid-sized organizations are flat by accident. Someone stood up a /16, everything got an address, and it worked. Then the company grew, the CCTV recorder and the accounting server and the guest Wi-Fi all landed in the same broadcast domain, and now a single compromised laptop can reach every device the organization owns.

Segmentation is the cheapest structural control available for that problem, and it is routinely deferred because the first attempt broke printing. That is a real risk, and the way to manage it is not to segment everything at once. It is to pick a small number of boundaries that materially reduce blast radius, roll them out in logging mode, and only then enforce.

This guide assumes no dedicated security team — an infrastructure generalist, an existing firewall or router, managed switches, and a change window that has to be justified to someone who cares more about uptime than about lateral movement. Every technique here works with equipment you probably already own.

## VLANs, Subnets, and Microsegmentation Are Different Things

These terms get used interchangeably and they are not the same control.

A **VLAN** is a layer 2 construct. It divides a switch into separate broadcast domains, tagged with an 802.1Q header. Hosts in different VLANs cannot ARP for each other. On its own, a VLAN provides isolation only until traffic reaches a router — the moment you configure a layer 3 interface for each VLAN, traffic flows freely between them unless something filters it.

A **subnet** is a layer 3 construct. It defines an IP address range and, implicitly, where a host sends traffic that is not local. Subnets are how you write firewall rules, but a subnet boundary by itself enforces nothing.

**Microsegmentation** places enforcement at or immediately adjacent to the workload — a host firewall, a hypervisor vSwitch filter, a cloud security group, or a service mesh sidecar. Its defining property is that traffic between two hosts in the same subnet can be blocked, which VLANs and subnets cannot do.

| Control | Layer | Blocks same-subnet traffic | Typical cost | Common failure mode |
|---|---|---|---|---|
| VLAN with 802.1Q tagging | 2 | No | Included in managed switches | Router interface reconnects everything |
| Subnet plus router ACL | 3 | No | Included in most routers | ACL grows to hundreds of unreviewed lines |
| Firewall zone with stateful inspection | 3-4 | No | Existing firewall licence | Any-any rule added "temporarily" for a migration |
| Private VLAN or port isolation | 2 | Yes, within the VLAN | Included on most managed switches | Breaks peer discovery for printers and casting |
| Host firewall (nftables, Windows Filtering Platform) | 3-4 at endpoint | Yes | Free, high operational effort | Config drift across unmanaged hosts |
| Hypervisor or cloud security groups | 3-4 at vNIC | Yes | Included with the platform | Default group left wide open |
| Service mesh policy with mTLS | 7 with identity | Yes | High complexity | Sidecar bypass on non-mesh ports |

The practical reading: VLANs plus firewall zones give you north-south control between groups of systems. Microsegmentation gives you east-west control between individual systems. Nearly every organization needs the first before it needs the second, and nearly every organization skips straight to shopping for the second.

> The question that determines your segment boundaries is not "how is the org chart structured." It is "if this host is fully compromised at 2 a.m., what else can the attacker reach without another exploit."

## Choose Boundaries by Blast Radius

Start by writing down the systems whose compromise would be existential: the identity directory, backup storage and its management plane, the hypervisor or cloud control plane, code signing and CI/CD, and whatever holds regulated data — cardholder, patient, or personal.

Then write down the systems most likely to be compromised first: user endpoints, anything reachable from the internet, contractor and BYOD devices, and unpatchable embedded devices such as cameras, badge readers, HVAC controllers, and printers.

Your first segment boundaries go between those two lists. Everything else is refinement.

A workable starting topology for a mid-sized office, which fits comfortably on one firewall:

| VLAN | Purpose | Reaches internet | Reaches server segment | Reachable from |
|---|---|---|---|---|
| 10 | Corporate endpoints | Yes, via proxy | Named services only | Jump host only |
| 20 | Servers and applications | Egress allow-list | N/A | VLAN 10 named ports, VLAN 60 |
| 30 | Building and IoT devices | No | No | VLAN 60 management ports only |
| 40 | Guest and BYOD | Yes, isolated | No | Nothing |
| 50 | Voice | SIP provider only | No | VLAN 60 |
| 60 | Management and jump hosts | Update mirrors only | Yes, admin ports | MFA-authenticated sessions only |

Two design decisions in that table carry most of the value. First, VLAN 30 has no internet access at all — embedded devices that cannot be patched should not be able to reach a command-and-control server or exfiltrate anything, and almost none of them legitimately need outbound access. Second, administrative protocols are reachable only from VLAN 60, which means SSH on 22, RDP on 3389, WinRM on 5985 and 5986, and every device web interface are unreachable from a user laptop.

## Writing Rules That Survive Review

Rules should be readable a year later by someone who was not in the room. That means named objects, comments that record the reason and the ticket, and an explicit deny at the bottom of each zone pair with logging enabled.

Here is a nftables ruleset implementing the inter-VLAN policy above on a Linux router or firewall:

```bash
#!/usr/sbin/nft -f
flush ruleset

table inet segmentation {
  # Address groups. Update these, not the rules.
  set endpoints   { type ipv4_addr; flags interval; elements = { 10.10.10.0/24 } }
  set servers     { type ipv4_addr; flags interval; elements = { 10.10.20.0/24 } }
  set iot         { type ipv4_addr; flags interval; elements = { 10.10.30.0/24 } }
  set mgmt        { type ipv4_addr; flags interval; elements = { 10.10.60.0/24 } }
  set admin_ports { type inet_service; elements = { 22, 3389, 5985, 5986, 623 } }

  chain forward {
    type filter hook forward priority filter; policy drop;

    ct state established,related accept
    ct state invalid drop

    # TICKET-1042: endpoints reach only published app ports on servers.
    ip saddr @endpoints ip daddr @servers tcp dport { 443, 1433, 3306 } accept

    # TICKET-1043: management segment performs admin access.
    ip saddr @mgmt ip daddr @servers tcp dport @admin_ports accept
    ip saddr @mgmt ip daddr @iot     tcp dport { 80, 443, 554 } accept

    # TICKET-1051: IoT has no lateral or outbound access. Log for review.
    ip saddr @iot log prefix "SEG-DROP-IOT: " level warn counter drop

    # Explicit terminal deny with visibility.
    log prefix "SEG-DROP-DEFAULT: " level warn counter drop
  }
}
```

Three details matter. The `ct state established,related accept` rule comes first so return traffic never needs a mirrored rule. Every deny is logged with a distinct prefix so you can tell an intentional block from an oversight. And addresses live in named sets, so adding a server does not mean editing eight rules.

The equivalent on Cisco IOS, for teams whose enforcement point is a layer 3 switch:

```text
ip access-list extended ENDPOINTS_OUT
 remark TICKET-1042 published application ports only
 permit tcp 10.10.10.0 0.0.0.255 10.10.20.0 0.0.0.255 eq 443
 permit tcp 10.10.10.0 0.0.0.255 10.10.20.0 0.0.0.255 eq 1433
 remark deny and log everything else toward servers
 deny   ip  10.10.10.0 0.0.0.255 10.10.20.0 0.0.0.255 log-input
 permit ip  10.10.10.0 0.0.0.255 any
!
interface Vlan10
 description Corporate endpoints
 ip address 10.10.10.1 255.255.255.0
 ip access-group ENDPOINTS_OUT in
!
interface Vlan30
 description Building and IoT - no routing off segment
 ip address 10.10.30.1 255.255.255.0
 ip access-group IOT_DENY_ALL in
```

Note `log-input` rather than plain `log` — it records the ingress interface and source MAC, which is what you need to identify which physical device tripped the rule.

For containerized workloads, the same blast-radius logic expressed as a Kubernetes NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: billing
spec:
  podSelector: {}
  policyTypes: ["Egress"]
  egress:
    # DNS is the one thing you almost always must allow explicitly.
    - to:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: kube-system }
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

A default-deny egress policy that forgets DNS is the single most common way to take a namespace offline. Write the DNS exception in the same commit as the deny.

## East-West Traffic Is the Part That Matters

North-south filtering — traffic crossing the internet edge — is well covered in most environments. East-west traffic between internal hosts is usually unfiltered, and that is precisely the path an intruder uses after the initial foothold.

The protocols that carry lateral movement are a short list: SMB on 445, RPC on 135 plus the dynamic high-port range, WinRM on 5985 and 5986, RDP on 3389, SSH on 22, WMI, and LDAP on 389 and 636. If you do nothing else east-west, block workstation-to-workstation traffic on these ports. Normal users have no reason to open an SMB share on a colleague's laptop or open an RDP session to it.

On a managed switch, private VLANs or port isolation implement this at layer 2 without any host configuration. Ports are designated as isolated, meaning they can talk to the promiscuous uplink port but not to each other. On Windows endpoints, a domain-wide firewall policy achieves the same result and survives the device leaving the office:

```text
Rule name:   Block inbound lateral SMB and RDP from peer workstations
Direction:   Inbound
Protocol:    TCP
Local ports: 445, 3389, 5985, 5986
Remote IP:   10.10.10.0/24        (the endpoint subnet itself)
Action:      Block
Profile:     Domain, Private, Public
```

Expect two exceptions: your endpoint management tooling and your remote support tool. Scope those to the specific management server addresses rather than reopening the ports globally.

## Jump Hosts, Done Properly

A jump host concentrates administrative access into one auditable, hardened path. Done badly it is just another server with a domain admin session on it, and it becomes the most valuable target in the network.

The properties that matter:

- Nothing else runs on it. No browsing, no email, no file shares, no general-purpose software.
- It is the only source address permitted for administrative ports on the server and management segments, enforced at the firewall, not by convention.
- Authentication is phishing-resistant — a hardware security key or smart card. A password plus a push notification is not sufficient for the box that reaches everything.
- Sessions are recorded, and the recordings are written to storage the jump host cannot modify.
- Credentials used from it are not cached. Where possible, use just-in-time elevation so no standing administrative rights exist.

For SSH-based estates, `ProxyJump` gives the same enforcement without agents on the client:

```bash
# ~/.ssh/config
Host bastion
    HostName bastion.mgmt.example.com
    User jrivera
    IdentityFile ~/.ssh/id_ecdsa_sk        # hardware-backed key
    IdentitiesOnly yes

Host 10.10.20.*
    ProxyJump bastion
    ForwardAgent no                        # never forward the agent
    IdentityFile ~/.ssh/id_ecdsa_sk
```

`ForwardAgent no` is not optional. A forwarded agent socket on a compromised intermediate host lets an attacker authenticate as you to every system your key opens.

## Rolling Out Without Breaking Production

### Observe Before You Enforce

Put the rules in place with an action of log or permit-and-log, not deny. Run for at least one full business cycle — a month, so that period-end processing appears. Review the logs and turn the surprising flows into either explicit rules or decommissioning tickets.

### Move One Segment at a Time

Start with the segment nobody depends on. Guest Wi-Fi and IoT are ideal first candidates. They have few legitimate dependencies, and if you get them wrong the blast radius of your mistake is small.

### Never Renumber and Filter in One Change

Changing IP addresses and adding enforcement simultaneously means any failure has two possible causes. Renumber first, prove stability, then filter.

### Write the Rollback Before the Change

For nftables, that is a saved ruleset file and a single command to restore it. For a switch, `reload in 10` before you apply the ACL gives you an automatic revert if you lock yourself out.

### Give Every Exception an Expiry Date

Every segmentation project accumulates temporary allow rules. Without a review date attached, they become permanent, and after two years the ruleset provides the appearance of segmentation without the substance.

### Test the Boundary, Do Not Assume It

After enforcement, verify from a host in the source segment with `nmap -sS -Pn -p 22,445,3389,5985 10.10.20.0/24` and confirm the results match your intent. A rule that exists is not the same as a rule that works.

## Key Takeaways

- VLANs and subnets create boundaries; firewalls, host firewalls, and security groups enforce them. A VLAN with a routed interface and no filtering is not segmentation.
- Draw boundaries by blast radius: separate the systems most likely to be compromised from the systems whose compromise would be existential.
- Deny embedded and IoT devices outbound internet access entirely. They rarely need it, and it removes both the command-and-control and the exfiltration path.
- East-west controls on SMB (445), RDP (3389), WinRM (5985/5986), and SSH (22) between workstations deliver more risk reduction per hour of effort than any other segmentation work.
- Run every new rule in log-only mode for a full business cycle, including month-end, before switching to deny.
- A jump host only helps if it is the sole permitted source for administrative ports, uses phishing-resistant authentication, and never forwards SSH agents.
