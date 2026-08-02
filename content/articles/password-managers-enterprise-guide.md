---
title: 'Password Managers for the Enterprise: An Evaluation Guide'
slug: 'password-managers-enterprise-guide'
excerpt: 'Zero-knowledge architecture, key derivation, sync models, recovery design and the secrets-versus-credentials split — how to evaluate password managers properly.'
description: 'How to evaluate password managers for enterprise rollout: encryption architecture, key derivation, recovery design and deployment model trade-offs.'
seoTitle: 'Enterprise Password Manager Evaluation Guide'
seoDescription: 'Evaluate password managers for organisational deployment: zero-knowledge architecture, KDF choices, sync models, recovery design and vendor criteria.'
author: 'editorial-team'
category: 'password-managers'
type: 'review'
tags: ['zero-knowledge', 'key-derivation', 'secrets-management', 'enterprise-security', 'credential-hygiene']
publishDate: 2026-06-25
featured: false
draft: false
---

Choosing a password manager for an organisation is not a feature comparison. Almost every product in the category has folders, sharing, browser extensions and an admin console. The differences that matter are architectural, and they only become visible when you ask what happens in three specific scenarios: the vendor's servers are fully compromised, an employee leaves without handing over their vault, and a court or regulator asks who accessed a given credential and when.

Those three questions separate products more cleanly than any feature matrix. The first tests whether encryption is genuinely client-side and whether the server ever holds anything that can derive a key. The second tests recovery design, which is where the marketing phrase "zero knowledge" usually acquires an asterisk. The third tests whether audit logging covers vault-item access or only administrative events — a distinction most evaluations never probe.

This guide covers the architecture worth interrogating, the trade-offs between browser built-in, dedicated and self-hosted deployment, why machine secrets should not live in the same system as human credentials, and a criteria framework you can put in front of a vendor. It deliberately describes categories and architectures rather than making claims about specific products, because implementation details change between releases and only the vendor's current documentation and audit reports are authoritative.

## Credentials and Secrets Are Different Problems

The most common architectural mistake in this area is treating a password manager as a general secrets store. They solve different problems with different threat models.

A password manager is optimised for human-in-the-loop access to credentials for systems you do not control: SaaS logins, partner portals, vendor accounts, registrar and DNS control panels. Access is interactive, latency is measured in seconds, the unlock is tied to a human, and the credential is usually long-lived because a third party controls its lifecycle.

A secrets manager — a dedicated secrets platform or a cloud provider's equivalent — is optimised for machine-to-machine access to material for systems you do control: database credentials, API keys, signing keys, service certificates. Access is programmatic and high-frequency, authentication comes from a workload identity rather than a human, and the correct lifetime is short because you can issue dynamic credentials that expire in minutes.

Putting deployment credentials in a shared vault folder creates two failures at once. The credential becomes long-lived because rotating it means coordinating humans, and access attribution collapses because everyone in the folder is indistinguishable at the target system. Draw the line explicitly during rollout: anything an automated process consumes belongs in the secrets platform with workload identity and short-lived issuance; anything a human types into someone else's login form belongs in the password manager.

> If your password manager rollout does not come with a parallel plan for moving machine secrets out of it, you have not reduced credential risk. You have consolidated it into a single high-value target with a human-shaped unlock.

## The Architecture Questions That Matter

### Key derivation and what the server sees

In a correctly built zero-knowledge design, the master password never reaches the server in a form that can decrypt anything. It is stretched locally by a key derivation function into a master key, and that key material is split by a key derivation step into two independent outputs: an authentication value sent to the server, and a key-wrapping key that never leaves the client.

Ask for the KDF and its parameters, and whether they are configurable per tenant. Argon2id is the current preference for the reasons that apply to any password store — memory hardness raises the cost of the offline attack that follows a server breach. PBKDF2-HMAC-SHA256 remains common for compatibility and needs a very high iteration count to be defensible. Also ask whether the server re-derives the received authentication value with its own KDF before storage, so that a database dump does not directly yield a login credential.

```text
master password
  |
  +-- KDF (Argon2id: m=64 MiB, t=3, p=4; salt = normalised account id)
  |     |
  |     +--> master key (256-bit, client memory only)
  |
  +-- HKDF-SHA256 expand
        |
        +--> auth value  ---> sent to server, re-hashed server-side before storage
        |
        +--> key-wrapping key
               |
               +--> unwraps account symmetric key (AES-256 / XChaCha20-Poly1305)
                      |
                      +--> unwraps per-item keys      (item-level isolation)
                      +--> unwraps account private key (X25519 or RSA-OAEP)
                             |
                             +--> unwraps shared collection keys (per-team sharing)
```

### Vault encryption and key hierarchy

The property to look for is envelope encryption with per-item or per-collection keys rather than a single vault-wide key. Item-level keys mean sharing a single credential does not require handing over a key that decrypts everything else, and rotating a shared item after an employee departs is a local operation.

Confirm which fields are encrypted. In many designs the item name, URL and folder structure are metadata the server can read, even though the password field is not. That is a defensible engineering trade-off for search and sync efficiency, but you should know about it before an assessor asks. A vendor that encrypts all item fields including the URL is making a stronger claim; verify it against their security whitepaper rather than their marketing page.

For sharing, the sound pattern is asymmetric: each account has a key pair, the collection key is encrypted to each member's public key, and the server routes ciphertext without ever holding a decryptable copy. Sharing implemented by the server re-encrypting on the user's behalf is not zero knowledge, whatever the page header says.

### Sync model and server trust

The sync model determines what the server can do with your data. In an end-to-end model the server stores and replicates opaque ciphertext blobs plus minimal routing metadata; conflict resolution happens client-side. In a server-mediated model the service can decrypt at least transiently in order to index, transform or enforce policy — which may be entirely reasonable for a given product, but changes the answer to "what does a full server compromise cost us".

Whatever the model, the client is the component you trust most: it necessarily holds plaintext in memory, so open source or reproducibly built clients materially change what you are able to verify yourself.

## Recovery Is Where Zero Knowledge Gets Qualified

Every organisation needs a way to get back into an account when an employee leaves, forgets a master password or loses their devices. Every mechanism that provides it weakens the pure zero-knowledge claim in some way, and choosing between them is a real decision, not a formality.

The common designs, roughly in order of how much they concede:

- **Recovery code or key.** A high-entropy value generated at enrolment that the user stores offline; it wraps the account key independently of the master password. Preserves zero knowledge entirely, and fails completely when the user loses it — which they will.
- **Device-based recovery.** An already-authenticated device holds key material and can re-wrap the account key under a new master password. Strong, but useless when all devices are gone.
- **Administrator recovery via key escrow.** At enrolment the client encrypts the account key to an organisation public key held by administrators. Recovery is possible without the vendor, but administrators can, in principle, decrypt user vaults.
- **Vendor-assisted recovery.** The vendor participates in re-establishing access. Convenient, and the weakest position: it implies the vendor holds something useful.

For enterprise deployment, administrator recovery with organisational key escrow is usually the right answer, subject to three controls: dual authorisation so no single administrator can invoke it alone, mandatory notification to the affected user, and an immutable audit record. Evaluate whether the product enforces those or merely permits them.

The same logic applies to offboarding. Confirm what happens to items an employee stored in a personal section of an enterprise account, whether the product supports a policy that prevents personal items entirely, and how quickly a revoked user's cached local vault becomes unusable. A vault that continues to decrypt offline for days after deprovisioning is a real gap in your leaver process.

## Browser Built-In, Dedicated, or Self-Hosted

| Criterion | Browser built-in | Dedicated cloud service | Self-hosted |
| --- | --- | --- | --- |
| Deployment cost | None; already present | Low; SaaS with SCIM | High; you run the service |
| Cross-browser and desktop app coverage | Weak outside the browser family | Broad | Broad, depends on product |
| Secure sharing between users | Limited or absent | Core capability | Core capability |
| Admin policy and enforcement | Coarse, via browser management | Granular | Granular |
| Audit logging and SIEM export | Minimal | Usually available; verify item-level detail | Full, you own the logs |
| Breach blast radius | Tied to the platform account | Vendor-wide event, ciphertext only if E2E | Confined to you, if you patch |
| Ongoing operational burden | None | Vendor manages | Patching, backups, restore testing, TLS, availability |
| Data residency control | Platform-determined | Region options vary | Complete |

Browser-built-in managers are a genuine win over reused passwords for individuals, but not an enterprise solution: sharing is ad hoc, policy enforcement is coarse, audit trails are effectively nonexistent, and credentials cannot be recovered from a departed employee or attributed in an investigation.

Dedicated cloud services are the default for most organisations. You inherit a specialised engineering team, a published security programme and a support path, and you accept that a vendor breach is a headline you cannot control. With a genuine end-to-end design, that breach exposes ciphertext and metadata rather than credentials — which is precisely why the architecture questions above are worth the effort.

Self-hosting suits organisations with hard data residency requirements, an existing platform team and a real appetite for the operational work. Be honest about that work: an unpatched self-hosted vault server is a considerably worse outcome than a competently run SaaS one. If you self-host, prove the restore path before you rely on the backup path.

```bash
# Self-hosted vault: verify the restore, not just the backup.
pg_dump --format=custom --file="vault-$(date +%F).dump" vaultdb
tar -czf "vault-attachments-$(date +%F).tgz" /var/lib/vault/attachments

# Restore into a throwaway database and confirm a real account can decrypt.
createdb vaultdb_restore_test
pg_restore --dbname=vaultdb_restore_test "vault-$(date +%F).dump"

# The vault blob is encrypted; the auth exchange and metadata are not.
# Confirm transport hardening on the sync endpoint after every upgrade.
curl -sSI https://vault.example.com/api/config | grep -i strict-transport-security
testssl.sh --protocols --headers --severity HIGH vault.example.com
```

## Autofill, Phishing Resistance, and the Clipboard

An underrated benefit of a password manager is that correct autofill is a phishing control. The extension matches the stored entry against the page origin and declines to fill on a lookalike domain, so a user who habitually relies on autofill notices the absence rather than typing the credential into the wrong site. That property only holds if origin matching is strict.

During evaluation, check how the product handles matching. Configurable per-item match rules (exact origin, host, base domain) are a good sign; a default of loose base-domain matching across every item is not. Ask whether autofill occurs inside cross-origin iframes without explicit user action, and whether the extension requires a deliberate click rather than filling automatically on page load. Automatic fill into an unverified frame is a credential disclosure primitive.

Clipboard use is the weak path and should be minimised. Any application on the device can read the clipboard, and on mobile platforms cross-device clipboard sync can move a password to another machine entirely. Configure automatic clipboard clearing at a short interval, prefer autofill over copy for routine use, and treat "copy password" as the exception rather than the workflow.

Finally, look at the vault unlock itself. Support for hardware-backed unlock, WebAuthn as a second factor on the account, a short idle auto-lock, and lock-on-screen-lock behaviour all reduce the window in which an unattended workstation yields the whole vault.

## A Vendor Evaluation Framework

Score candidates against criteria that produce evidence, not assertions. The following set is ordered so that the disqualifying questions come first.

**Cryptographic architecture.** Which KDF and parameters, and are they tenant-configurable? Is the authentication value derived independently of the encryption key? Are per-item or per-collection keys used? Which item fields are encrypted, and which are server-visible metadata? Is sharing implemented with asymmetric key wrapping? Request the security whitepaper and read the key hierarchy diagram.

**Independent assurance.** SOC 2 Type II covering the current period, ISO 27001 where relevant, a third-party cryptographic assessment or penetration test summary within the last twelve months, and a published vulnerability disclosure programme. Are clients open source or reproducibly built?

**Recovery and lifecycle.** Which recovery mechanisms exist, and can administrator recovery be gated on dual authorisation with user notification? How are personal items in enterprise accounts handled? How quickly does deprovisioning invalidate cached local vaults?

**Identity integration.** SAML or OIDC single sign-on, SCIM provisioning and deprovisioning, group-driven collection membership, and enforced MFA on the vault account. Understand precisely what SSO controls: in some designs it authenticates the session while the master password still derives the encryption key; in others the identity provider participates in key release, which changes your trust model and your outage exposure.

**Policy enforcement.** Can you enforce minimum master password strength, breach checks, idle lock timeouts, export restrictions, sharing restrictions and clipboard behaviour centrally, and are those policies actually applied client-side rather than merely displayed?

```json
{
  "vault_policy": {
    "kdf": {"algorithm": "argon2id", "memory_kib": 65536, "iterations": 3, "parallelism": 4},
    "master_password": {"min_length": 14, "breach_check": "k-anonymity", "scheduled_rotation": false},
    "unlock": {"idle_lock_minutes": 15, "on_system_lock": "lock", "on_restart": "logout"},
    "second_factor": {"required": true, "allowed": ["webauthn", "totp"], "sms": false},
    "clipboard": {"auto_clear_seconds": 20, "prefer_autofill": true},
    "autofill": {"match_default": "exact_origin", "fill_in_cross_origin_iframe": false},
    "export": {"allow_unencrypted_export": false, "requires_admin_approval": true},
    "sharing": {"external_shares": false, "link_expiry_max_hours": 24},
    "recovery": {"admin_recovery": true, "requires_two_admins": true, "notify_user": true},
    "audit": {"item_access_events": true, "siem_export": "syslog-tls", "retention_days": 400}
  }
}
```

**Audit and detection.** Confirm that logs cover item-level access and not only administrative actions, that they export to your SIEM in a usable format, and that retention meets your investigation window. Then define detections up front: bulk item access outside working hours, export attempts, sharing to external addresses, recovery invocation, and MFA removal on a vault account.

**Exit.** Can you export the full organisational data set in a documented, encrypted format? An evaluation that cannot answer how you leave has not finished.

## Rollout: What Breaks in Month Two

Technical selection is the easy half. Deployments fail on adoption, and adoption fails in predictable places.

Import is the first cliff. Users arrive with credentials in browser stores, spreadsheets and notes applications. Plan a supervised migration window, and make deleting the old copies an explicit, verified step — a spreadsheet of passwords that survives the migration is now a second vault with no controls on it.

Shared accounts are the second. Every organisation has legacy logins with no per-user identity: a domain registrar, a social account, a legacy appliance. Inventory them, move them into a shared collection with named membership, rotate the credential at the point of migration so the pre-migration value is dead, and record who is accountable for each. That rotation is what converts an inventory exercise into a security improvement.

The third is the machine-secrets boundary described earlier. Without a place to put them, deployment credentials will end up in the vault by default. Have the secrets platform available on day one and publish the rule.

Measure adoption with signals that mean something: percentage of staff with an active vault, count of credentials flagged as reused or breached over time, shared items with a named owner, and the number of machine secrets still resident in the credential vault. Those four numbers tell you whether the rollout is working far better than a licence count.

## Key Takeaways

- Evaluate architecture, not features: ask what a full server compromise exposes, how a departed employee's vault is recovered, and whether item-level access is auditable.
- Confirm the key hierarchy — a memory-hard KDF, an authentication value derived independently of the encryption key, per-item or per-collection keys, and asymmetric key wrapping for sharing.
- Recovery is where zero-knowledge claims get qualified; administrator recovery via organisational key escrow is usually right, gated on dual authorisation, user notification and an immutable audit record.
- Browser built-in managers help individuals but lack sharing, policy and audit; dedicated SaaS is the default; self-hosting is justified only where you will genuinely patch, back up and test restores.
- Keep machine secrets out of the credential vault — workload identity and short-lived dynamic credentials from a secrets platform solve a different problem than human credential storage.
- Strict origin-based autofill is a phishing control worth configuring deliberately; loose base-domain matching and clipboard workflows discard most of that benefit.
