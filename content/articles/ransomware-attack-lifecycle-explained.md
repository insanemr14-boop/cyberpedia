---
title: 'The Ransomware Kill Chain: Where Defenders Can Break It'
slug: 'ransomware-attack-lifecycle-explained'
excerpt: 'Ransomware is not a single event but a multi-stage operation. Here is every stage of the kill chain, and where defenders can realistically break it.'
description: 'A stage-by-stage breakdown of the ransomware kill chain, from initial access brokers to extortion, and how defenders break each link.'
seoTitle: 'Ransomware Attack Lifecycle: The Full Kill Chain'
seoDescription: 'How ransomware attacks unfold from reconnaissance to extortion, with concrete detection and containment options at every stage of the chain.'
author: 'threat-research'
category: 'ransomware'
type: 'news'
tags: ['kill-chain', 'double-extortion', 'initial-access-brokers', 'lateral-movement', 'incident-response']
publishDate: 2026-07-28
featured: true
draft: false
---

Encryption is the last thing that happens. By the time ransom notes land on desktops and file shares stop resolving, the operator has usually been resident in the environment for days or weeks, has already read the cyber insurance policy, has already copied the finance department's file share to a cloud storage bucket, and has already deleted the backups. The encryption event is not the attack. It is the invoice.

That distinction matters because it determines where defensive budget should go. Every stage before encryption is noisy, slow, and heavily dependent on legitimate administrative tooling that generates telemetry. The encryption stage is fast, automated, and effectively undetectable in time to matter — a modern locker can process a mid-size file server faster than a SOC analyst can triage the first alert. Organizations that plan exclusively for "the ransomware event" are planning for the one phase of the operation where they have no leverage left.

This is a walk through the full lifecycle: reconnaissance, initial access, execution and escalation, discovery, lateral movement, exfiltration, deployment, and extortion. At each stage the relevant question is not "what technique did they use" but "what did that technique force them to touch, and did we have eyes on it."

## Ransomware Is an Operation, Not a Payload

The single most useful mental model shift is to stop thinking of ransomware as malware and start thinking of it as a service industry with specialization and handoffs.

A ransomware-as-a-service (RaaS) ecosystem typically separates at least three roles. Developers build and maintain the encryptor, the key management infrastructure, and the leak site. Affiliates conduct the intrusion — they are the humans on the keyboard doing discovery and lateral movement. Initial access brokers (IABs) sell footholds: valid VPN credentials, exposed RDP, a webshell on an unpatched edge appliance. Negotiators, bulletproof hosting providers, and money laundering services fill in the rest.

The operational consequence is that the intrusion tradecraft and the payload are decoupled. Two intrusions delivering the same encryptor may look nothing alike, because different affiliates work differently. Conversely, one affiliate's tradecraft stays remarkably consistent across the different RaaS brands they work with. This is why detection engineering anchored on payload hashes ages out in hours, while detection anchored on affiliate behavior — the specific sequence of discovery commands, the preferred remote access tool, the way they stage archives — stays useful for months.

> Signature-based defense catches the encryptor. Behavior-based defense catches the operator. Only one of those is still useful at 3 a.m. on the day of the attack.

## Initial Access: The Broker Economy

Initial access is where the attack is cheapest to stop and where most organizations still lose. Three vectors dominate real-world intrusions.

**Exploitation of internet-facing services (T1190).** Edge devices are the highest-value target class in the ecosystem: VPN concentrators, secure file transfer appliances, firewalls, and management gateways. They are internet-reachable by design, frequently run vendor-proprietary operating systems that EDR does not support, and often sit outside the patch cycle that governs servers. Brokers scan for known vulnerable versions within hours of a proof of concept becoming public.

**Valid accounts and external remote services (T1078, T1133).** Credentials harvested by infostealer malware from unmanaged and personal devices end up in bulk marketplaces. If the credential works against a VPN or a remote desktop gateway without phishing-resistant MFA, the broker has a sellable asset. This vector produces no exploit, no malware, and no anomalous binary — just a successful authentication from an unusual location.

**Phishing and malicious delivery (T1566).** Still present, but the payload has shifted. Loaders delivered via container files, malicious archives, search-engine-poisoned fake software installers, and increasingly via help-desk social engineering that resets MFA enrollment for an "employee" who lost their phone.

Breaking the chain here is mostly an asset management problem, not a detection problem. You need an accurate inventory of what you expose to the internet, a patch SLA for edge devices measured in days rather than quarters, phishing-resistant MFA on every external entry point, and a documented identity-verification procedure for help-desk credential and MFA resets that cannot be defeated by a confident caller.

## Foothold to Domain: Execution, Persistence, Escalation

Once inside, the affiliate's first priority is durable access that survives a reboot and does not depend on the original entry point, which they assume may be closed.

Persistence is usually mundane: scheduled tasks (T1053.005), new or hijacked Windows services (T1543.003), run keys, and — increasingly common — installing legitimate commercial remote monitoring and management (RMM) software (T1219). Tools such as remote support agents are signed, expected in many enterprises, and communicate over TLS to vendor infrastructure. An RMM agent installed on a domain controller at 2 a.m. by an account that has never installed software is one of the highest-fidelity ransomware precursor signals available, and it requires no advanced tooling to detect.

Privilege escalation typically goes after credentials rather than kernel bugs. Credential dumping from LSASS (T1003.001), extraction of the NTDS.dit database from a domain controller (T1003.003), Kerberoasting service accounts with weak passwords (T1558.003), and harvesting credentials cached in scripts, share drives, and password manager exports. Defenders should assume that any local administrator credential reused across workstations is equivalent to a domain admin credential in practice.

Before escalation completes, most operators attempt to blind the defenders (T1562.001): adding exclusion paths to the endpoint agent, stopping security services, uninstalling the EDR via its own management console using stolen admin credentials, or loading a vulnerable signed driver to terminate protected processes. Tamper protection on the endpoint agent, and alerting on agent health changes from a system outside the endpoint agent's own console, are non-negotiable controls.

```text
# Telemetry patterns worth alerting on, not commands to run.
# Backup and recovery destruction, MITRE T1490:
vssadmin.exe delete shadows /all /quiet
wbadmin.exe delete catalog -quiet
bcdedit.exe /set {default} recoveryenabled no

# Security tooling interference, MITRE T1562.001:
net.exe stop <security_service_name> /y
sc.exe config <security_service_name> start= disabled

# Any of the above executed by a non-administrative process,
# on more than one host within a short window, is an
# incident until proven otherwise.
```

## Discovery and Lateral Movement

This is the loudest stage of the entire operation and the best detection opportunity most defenders never instrument.

An affiliate arriving in an unfamiliar network has to map it. They enumerate domain accounts and groups (T1087), remote systems (T1018), domain trusts (T1482), and network shares. They look for the backup server, the hypervisor management console, the file servers holding the most data, and the identity infrastructure. Frequently they run an off-the-shelf directory mapping tool that collects the entire structure of Active Directory in a single pass.

The signature of this stage is volumetric and sequential rather than individually suspicious. A single execution of a directory enumeration utility is normal for an administrator. Twenty distinct discovery commands executed by one process tree, on one host, inside five minutes, by an account that normally only opens a browser, is not.

Lateral movement then rides on legitimate protocols: RDP (T1021.001), SMB and admin shares (T1021.002), WinRM, WMI, and remote service creation. Credentials are reused via pass-the-hash or pass-the-ticket (T1550). Nothing here is malware. Everything here is telemetry.

```yaml
title: Rapid Multi-Host Admin Share Access From a Single Workstation
status: experimental
description: >
  Flags a workstation authenticating to admin shares on an unusual number
  of distinct hosts in a short window, a common lateral movement and
  payload staging pattern in human-operated ransomware intrusions.
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 5140
    ShareName|endswith:
      - 'ADMIN$'
      - 'C$'
  timeframe: 15m
  condition: selection | count(distinct(IpAddress)) by SubjectUserName > 15
falsepositives:
  - Software deployment and patch management servers
  - Vulnerability scanners using authenticated scanning
  - Backup agents performing agentless collection
level: high
tags:
  - attack.lateral_movement
  - attack.t1021.002
```

Breaking the chain at this stage requires network and identity segmentation that makes the movement impossible rather than merely visible. Tiered administration so that workstation admin credentials cannot authenticate to servers. Blocking workstation-to-workstation SMB and RDP entirely, which almost no business process actually requires. Unique local administrator passwords per host. Removing standing domain admin membership in favor of time-bound elevation.

## Exfiltration Before Encryption

Double extortion inverted the economics of backups. Once operators realized that well-backed-up victims simply restored and refused to pay, stealing the data first became standard. The threat is no longer "you cannot access your data," it is "your customers, regulators, and press will access your data."

Staging usually happens first: the operator compresses selected directories into archives on an internal host, often a file server or a jump box with plenty of disk. Then the data leaves, most commonly to legitimate cloud storage services (T1567.002) because that traffic blends into normal business patterns, or through a tunneling utility carrying data over an encrypted channel to attacker infrastructure (T1048, T1572).

The detection opportunities are real. Large archive creation on a file server by an interactive user process is anomalous. Sustained outbound transfers of tens or hundreds of gigabytes from a server that normally only serves internal clients is anomalous. The presence of a cloud sync utility or a command-line file transfer tool on a domain controller is anomalous. All of these are detectable with network flow data and endpoint process telemetry that most organizations already collect and never query.

Egress filtering is the underused control here. Servers rarely need arbitrary outbound internet access. Restricting server egress to an explicit allowlist of destinations does not stop a determined operator, but it forces them into noisier paths and buys hours.

## Deployment, Impact, and the Extortion Phase

Deployment is deliberately fast and simultaneous. The operator wants encryption to complete everywhere before anyone can respond, so the payload is pushed through whatever mass-distribution mechanism the environment already provides: Group Policy, the software deployment tool, the RMM platform, or a script that copies the binary to admin shares across a host list built during discovery.

Immediately before or during encryption, the operation destroys recovery options (T1490): deleting volume shadow copies, clearing backup catalogs, disabling boot recovery, and — critically — attacking the backup infrastructure itself. Backup servers are targeted specifically because a victim with intact, isolated backups negotiates from a far stronger position. Hypervisor hosts are targeted for the same reason: encrypting virtual machine datastores at the ESXi layer takes out dozens of servers with one action.

Then encryption (T1486) runs, service stops (T1489) kill databases so their files can be locked, and the notes are dropped.

The extortion phase follows a professionalized script: a victim portal, a countdown, sample data published as proof, a named contact. Pressure is applied laterally — to customers whose records were stolen, to regulators, to journalists. Some operations skip encryption entirely and run exfiltration-only extortion, which is faster, quieter, and avoids the operational complexity of key management.

Response decisions at this point are business decisions, not technical ones, and they should have been made in advance. Who has authority to authorize a payment. Whether the organization has sanctions exposure that makes payment illegal. What the regulatory notification clock looks like. Which counsel and which incident response retainer get called. Discovering that you have no answer to these questions while your file shares are encrypting is the worst possible time to find out.

## Where the Chain Actually Breaks

The realistic control at each stage is rarely the exciting one. This table maps stages to the intervention that most consistently works in practice.

| Stage | Representative ATT&CK | Primary telemetry | Control that actually breaks it |
| --- | --- | --- | --- |
| Initial access | T1190, T1078, T1133 | Edge device logs, VPN auth logs | Phishing-resistant MFA; edge patch SLA in days |
| Persistence | T1053.005, T1543.003, T1219 | Process creation, service install | Allowlist approved RMM tools; alert on all others |
| Escalation | T1003.001, T1558.003 | LSASS access events, Kerberos logs | Tiered admin model; no standing domain admin |
| Defense evasion | T1562.001 | Agent health, driver load events | Tamper protection; out-of-band agent health monitoring |
| Discovery | T1087, T1018, T1482 | Process command lines, LDAP queries | Volumetric detection on command sequences |
| Lateral movement | T1021.001, T1021.002 | Logon events, SMB share access | Block workstation-to-workstation SMB and RDP |
| Exfiltration | T1567.002, T1048 | Netflow, proxy logs, archive creation | Server egress allowlisting; DLP on bulk transfers |
| Impact | T1486, T1490, T1489 | Shadow copy deletion, mass file rename | Immutable, credential-isolated backups |

Two patterns stand out. First, the highest-value controls are architectural rather than detective — segmentation, tiering, and immutability change what is possible, while detection only changes what is visible. Second, the same handful of telemetry sources cover nearly the entire chain. Process creation with full command lines, authentication events, and network flow data will carry most of a detection program. Organizations without those three, tuned and retained for a meaningful window, are not going to detect a human-operated intrusion regardless of what products they buy.

The final control worth naming explicitly is the restore test. A backup that has never been restored under time pressure is a hypothesis, not a control. The relevant metric is not whether backups exist; it is how many hours it takes to bring the top ten business-critical systems back from clean media, measured by actually doing it.

## Key Takeaways

- Ransomware is a multi-week human-operated intrusion with a fast automated ending. The encryption stage is the only phase where defenders have no leverage, so defensive investment belongs earlier in the chain.
- Initial access is dominated by exposed edge services and valid stolen credentials, not exotic malware. Edge patching cadence and phishing-resistant MFA remove most of that market.
- Discovery and lateral movement are the noisiest phases and the best detection opportunity. They rely on legitimate administrative tooling, so behavioral and volumetric detections outperform signatures.
- Exfiltration before encryption means backups alone no longer neutralize the threat. Egress restrictions and bulk-transfer monitoring are now core ransomware controls, not data protection niceties.
- Backup infrastructure and hypervisor management planes are primary targets. Immutable, credential-isolated backups with tested restore times are the difference between an outage and an extinction event.
- Extortion response is a business decision. Payment authority, sanctions exposure, notification obligations, and counsel engagement should be settled in a tabletop exercise, not during an incident.
