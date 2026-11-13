---
title: 'November 2026 Patch Tuesday: The Exploited Outlook Zero-Day and What to Patch First'
slug: 'november-2026-patch-tuesday-outlook-zero-day'
excerpt: 'Microsoft fixed more than a thousand flaws on 10 November 2026, including an Outlook bug already used to steal NTLM hashes. The fix ships through Office, not Windows.'
description: 'CVE-2026-124194 is an exploited Outlook spoofing flaw that leaks NTLMv2 hashes. What it does, why Windows-only patching misses it, and a patch priority order.'
seoTitle: 'November 2026 Patch Tuesday: Outlook Zero-Day CVE-2026-124194'
seoDescription: 'Microsoft November 2026 Patch Tuesday fixes an exploited Outlook zero-day, CVE-2026-124194. How the NTLM hash leak works and what to patch first.'
author: 'threat-research'
category: 'windows-security'
type: 'news'
tags: ['patch-tuesday', 'microsoft', 'outlook', 'ntlm', 'zero-day', 'cisa-kev']
publishDate: 2026-11-13
featured: false
draft: false
faq:
  - question: 'What is CVE-2026-124194?'
    answer: 'It is a spoofing vulnerability in Microsoft Outlook, rated Moderate by Microsoft with a reported CVSS score of 6.5. A crafted message file can cause Outlook to contact an attacker-controlled network location without the usual external-content warning, exposing the user NTLMv2 hash. Microsoft lists it as exploited in the wild.'
  - question: 'Does installing the Windows cumulative update fix the Outlook zero-day?'
    answer: 'No. The fix is delivered through Office updates for Microsoft 365 Apps and Office LTSC. A fleet that is fully patched at the Windows level can still be running a vulnerable Outlook.'
  - question: 'Why does a Moderate-rated flaw matter so much?'
    answer: 'Severity ratings describe the flaw in isolation. A leaked NTLMv2 hash can be relayed to other services or cracked offline, which turns a modest spoofing bug into an initial foothold. Active exploitation outranks the score when deciding what to patch first.'
  - question: 'What is the CISA deadline for this vulnerability?'
    answer: 'CISA added it to the Known Exploited Vulnerabilities catalog on 10 November 2026 with a remediation due date of 24 November 2026. That deadline binds US federal civilian agencies, and it is a sensible target for everyone else.'
---

Microsoft's November 2026 Patch Tuesday, released on 10 November, is one of the largest on record. Coverage puts the total at just over a thousand vulnerabilities, with sources differing by one on the exact count (1,093 or 1,094) and agreeing on 63 rated Critical.

Volume is not the story. One flaw in the release was already being exploited before the patch shipped, and the way it is fixed means many organizations will believe they are protected when they are not.

## What is the exploited flaw?

**CVE-2026-124194** is a spoofing vulnerability in Microsoft Outlook. Microsoft rates it Moderate, with a reported CVSS score of 6.5, and lists it as exploited. It was not publicly disclosed before the fix.

According to vendor analysis, the attack works like this:

1. The attacker sends a crafted message file.
2. The recipient opens it. User interaction is required.
3. Outlook reaches out to a network location the attacker controls, skipping the external-content warning that would normally appear.
4. In doing so, Windows attempts to authenticate, handing over the user's **NTLMv2 hash**.

The attacker never needs the password. A captured hash can be relayed to another service that accepts NTLM, or taken offline and cracked.

## Why does Windows-only patching miss it?

This is the detail that will catch teams out. The fix ships through **Office updates**, for Microsoft 365 Apps and Office LTSC. It is not part of the Windows cumulative update.

If your patch reporting is built around Windows Update compliance, a device can show as fully patched and still run a vulnerable Outlook. Check Office build numbers directly, and confirm that the Office update channel on your fleet is actually delivering this month's release rather than sitting on a deferred ring.

## What should you patch first?

A thousand CVEs cannot all be urgent. Order the work by exposure and exploitation, not by count:

| Priority | What | Why |
|---|---|---|
| 1 | Outlook and Office, fleet-wide | Exploited in the wild, user-facing, delivered separately from Windows |
| 2 | Internet-facing servers and services | Critical-rated remote flaws with no user interaction |
| 3 | Domain controllers and identity infrastructure | Compromise here is compromise everywhere |
| 4 | Workstation Windows cumulative update | Broad coverage, lower individual urgency |
| 5 | Everything else on the normal cycle | Scheduled maintenance |

CISA added CVE-2026-124194 to its Known Exploited Vulnerabilities catalog on 10 November with a due date of **24 November 2026**. Treat that as your own deadline.

## What reduces the risk beyond patching?

The underlying weakness is NTLM itself. Every hash-leak bug in Outlook over the past several years has been dangerous for the same reason: the protocol hands over something reusable.

- **Block outbound SMB.** Deny TCP 445 from workstations to the internet at the perimeter. A hash that cannot leave the network cannot be captured remotely.
- **Inventory NTLM use.** Enable NTLM auditing and find out which accounts and applications still depend on it. Move what you can to Kerberos.
- **Enforce signing.** SMB signing and LDAP signing with channel binding make relay attacks far harder. Reporting indicates a Windows 11 update this month also turns on NTLM message signing by default for non-anonymous connections.
- **Protect privileged accounts.** Add administrators to the Protected Users group, which prevents NTLM authentication for those accounts.
- **Require phishing-resistant authentication.** A relayed hash is much less useful where access depends on a hardware-bound credential. See our guide to [secure authentication beyond passwords](/articles/secure-authentication-beyond-passwords/).

## What should you look for in your logs?

If you want to know whether this was used against you before you patched:

- Outbound connections from workstations to external addresses on port 445, or WebDAV requests to unfamiliar hosts, shortly after a user opened an attachment.
- NTLM authentication events from workstation accounts to unexpected destinations.
- Sign-ins for the same user from a new source soon afterwards.

A SIEM that collects firewall and authentication logs can answer all three. Our guide to [SIEM log management](/articles/siem-log-management-best-practices/) covers which sources matter.

## The takeaway

The lesson of this release is about process more than about one CVE. Patch status has to be measured per product, not per operating system, and exploited flaws jump the queue regardless of their score. Teams that prioritise by the Known Exploited Vulnerabilities list rather than by CVSS alone will have closed this one in days.

## Sources

- [Microsoft November Patch Tuesday Fixes More Than 1,000 Flaws, Redmondmag](https://redmondmag.com/articles/2026/11/10/microsoft-november-patch-tuesday-fixes-more-than-1000-flaws.aspx)
- [CVE-2026-124194: Outlook Zero-Day Exposes NTLM Hashes, SOC Prime](https://socprime.com/blog/cve-2026-124194-microsoft-outlook-zero-day-exploited-to-steal-ntlm-hashes/)
- [November 2026 Patch Tuesday: 1,094 Flaws, One Exploited, SOCRadar](https://socradar.io/blog/november-2026-patch-tuesday-zero-day/)
