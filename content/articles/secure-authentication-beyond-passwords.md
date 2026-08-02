---
title: 'Secure Authentication Beyond Passwords: An Architecture Guide'
slug: 'secure-authentication-beyond-passwords'
excerpt: 'Argon2id parameters, MFA factor strength ranking, why SMS OTP fails, how WebAuthn origin binding stops phishing, and session and token lifetime design.'
description: 'Modern authentication architecture: correct password hashing parameters, MFA factor ranking, WebAuthn phishing resistance, and session design.'
seoTitle: 'Authentication Beyond Passwords: Architecture Guide'
seoDescription: 'How to build modern authentication: Argon2id parameters, MFA factor strength, FIDO2 and passkeys, session management and token lifetimes.'
author: 'editorial-team'
category: 'identity-management'
type: 'guide'
tags: ['webauthn', 'passkeys', 'mfa', 'argon2', 'session-management', 'oauth']
publishDate: 2026-07-12
featured: false
draft: false
faq:
  - question: 'Is TOTP phishing resistant?'
    answer: 'No. A time-based one-time passcode is a shared secret the user can be induced to type into a convincing fake login page, and a real-time phishing proxy replays it inside the attacker session before it expires. TOTP is a meaningful improvement over SMS and worth broad deployment, but it should not be described internally as phishing resistant.'
  - question: 'What Argon2id parameters should be used for password hashing?'
    answer: 'OWASP publishes equivalent-strength configurations that trade memory against iterations: roughly 19 MiB with 2 iterations, 12 MiB with 3, or 7 MiB with 5, at one degree of parallelism. Pick the highest memory cost your authentication tier absorbs at peak login rate, then raise iterations until a single verification costs around half a second to a second of server work.'
  - question: 'Why is WebAuthn phishing resistant when other factors are not?'
    answer: 'Because the browser, not the user, decides which credential is eligible, and it decides based on the origin of the requesting page. The key pair is scoped to a relying party identifier and the actual origin is stamped into the signed client data. A lookalike domain cannot obtain a usable assertion, and there is no code for a victim to transcribe.'
  - question: 'Do synced passkeys weaken security?'
    answer: 'They move part of account security onto the sync provider account and its recovery process, while solving the largest obstacle to hardware-based authentication, which is that losing the device means losing the account. For consumer products that trade-off is almost always correct. For administrators, require device-bound credentials and register at least two authenticators.'
---

Most authentication incidents are not cryptographic failures. They are architectural ones: a password store using a fast hash, a second factor that an attacker can relay in real time, a session that never expires, or a refresh token with no reuse detection. The primitives have been solved for years. The assembly is where systems break.

The useful mental model is to stop thinking about "adding MFA" and start thinking about which specific attacks each control defeats. A time-based one-time password stops credential stuffing and stops offline password cracking from converting into account access. It does not stop a real-time phishing proxy, because the code is a shared secret the user can be tricked into typing into the wrong place. Only a factor cryptographically bound to the origin stops that, and only WebAuthn-class authenticators provide it.

This is an implementation-level walkthrough of a modern authentication stack: password storage parameters worth defending in a review, a factor strength ranking with the reasoning behind it, how WebAuthn's origin binding actually works, what passkey sync changes about your threat model, and the session and token lifetime decisions that determine what an attacker gets when something does go wrong.

## Store Passwords Like They Will Leak

Assume the hash file is public. Every parameter choice follows from that.

Argon2id is the default recommendation. It is memory-hard, which is the property that matters: GPU and ASIC attackers scale parallel compute cheaply and scale fast memory expensively. The id variant combines Argon2i's side-channel resistance on the first pass with Argon2d's resistance to time-memory trade-off attacks on later passes.

OWASP's password storage guidance gives a set of equivalent-strength Argon2id configurations that trade memory against iterations: roughly 19 MiB with 2 iterations and 1 degree of parallelism, or 12 MiB with 3 iterations, or 7 MiB with 5 iterations. Pick the highest memory cost your authentication tier can absorb at peak login rate, then tune iterations upward until a single verification costs somewhere in the region of 0.5 to 1 second of server work at your concurrency budget. Memory first, iterations second.

```python
from argon2 import PasswordHasher, exceptions
from argon2.low_level import Type

# Baseline aligned with OWASP password storage guidance.
# Raise memory_cost before time_cost: memory is what hurts GPU attackers.
ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,   # KiB, ~19 MiB
    parallelism=1,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)

def set_password(store, user_id: str, password: str) -> None:
    # The encoded string carries algorithm, parameters and salt.
    store.put(user_id, ph.hash(password))

def check_password(store, user_id: str, password: str) -> bool:
    encoded = store.get(user_id)
    if encoded is None:
        # Spend comparable work on unknown accounts so response time
        # does not disclose whether the account exists.
        ph.hash(password)
        return False
    try:
        ph.verify(encoded, password)
    except exceptions.VerificationError:
        return False
    if ph.check_needs_rehash(encoded):
        store.put(user_id, ph.hash(password))   # transparent parameter upgrade
    return True
```

If Argon2id is unavailable, scrypt with N of at least 2^17, r of 8 and p of 1 is the next choice. bcrypt remains acceptable at a work factor of 10 or higher, with one caveat that catches teams repeatedly: bcrypt truncates input at 72 bytes. Pre-hashing with SHA-256 to lift that limit introduces a null-byte truncation hazard unless the digest is base64-encoded first. PBKDF2-HMAC-SHA256 is the FIPS-compatible fallback and needs on the order of 600,000 iterations to be worth deploying — it is not memory-hard, so it buys the least per unit of server cost.

Two rules that matter more than parameter tuning. Check candidate passwords against a breached-password corpus at registration and at change time, using a k-anonymity range query so the full credential never leaves your boundary. And drop composition rules and scheduled rotation: both push users toward predictable transformations, and modern guidance from NIST SP 800-63B has moved away from them in favour of length, blocklists and compromise-triggered rotation.

## Rank Factors by What They Resist

A factor is only as good as the narrowest attack it fails to stop. Ranking by user experience or by vendor category produces the wrong deployment order; ranking by resistance produces the right one.

| Factor | Phishing resistant | Primary weakness | Reasonable use |
| --- | --- | --- | --- |
| SMS OTP | No | SIM swap, SS7 interception, real-time relay | Last resort; better than nothing for low-value accounts |
| Email OTP | No | Inherits email account security; relay | Low-assurance step-up only |
| TOTP (RFC 6238) | No | Shared secret; real-time phishing proxy | Broad rollout where hardware is impractical |
| Push approval | No | Push fatigue, accidental approval | Only with number matching and context display |
| Push with number matching | Weakly | Still relays if user transcribes | Acceptable interim for workforce |
| FIDO2 / WebAuthn security key | Yes | Loss and recovery process | High-value accounts, administrators |
| Synced passkey | Yes | Security of the sync account and its recovery | Consumer default, most workforce accounts |
| Device-bound passkey (platform) | Yes | Device loss; needs a registered backup | Managed devices with a second registered credential |

The step change happens between push-with-number-matching and WebAuthn. Everything above that line is a secret the user can be induced to hand over. Everything below it is a private key that never leaves the authenticator and a signature that only validates for one origin.

> The question to ask about any second factor is not "how strong is the code" but "can a user standing in front of a convincing fake login page complete the attacker's session for them". For every shared-secret factor, the answer is yes.

## Why SMS and Push Keep Failing

SMS one-time passcodes fail in three independent ways, and fixing any one does not help. Number portability and carrier support processes allow an attacker to move a phone number to a device they control, which is a social engineering attack against a call centre, not an attack against your application. The SS7 signalling network permits message interception under conditions that are not within your control. And any real-time phishing proxy simply asks the victim for the code and replays it inside the attacker's own session before it expires.

Push approvals remove the transcription step, which removes the naive relay, but introduce a human failure mode instead: a user receiving repeated prompts at inconvenient hours eventually approves one to make them stop. Number matching — showing a digit sequence on the login screen that the user must select in the app — makes accidental approval much harder and is the minimum bar for any push deployment. It does not make push phishing resistant, because a proxy can display the number to the victim on the fake page.

TOTP is a meaningful improvement over SMS because the shared secret sits in the user's possession rather than in a carrier's routing infrastructure, and because there is no delivery channel to intercept. Its ceiling is the same: a 30-second code entered on the wrong site is an authenticated session for whoever controls that site. Deploy TOTP broadly if you must, but do not describe it internally as phishing resistant.

## FIDO2 and WebAuthn: Origin Binding Is the Whole Point

WebAuthn is a public-key protocol with one property that makes it categorically different: the browser, not the user, decides which credential is eligible, and it decides based on the origin of the page making the request.

At registration the authenticator generates a key pair scoped to a relying party identifier — an eTLD+1 domain such as `example.com`. The public key goes to your server. The private key never leaves the authenticator. At authentication the browser will only offer credentials whose relying party ID matches the current page's origin, and it stamps the actual origin into the signed client data. Your server verifies the signature over that client data and rejects anything where the origin does not match.

The consequence is that a phishing site at a lookalike domain cannot obtain a usable assertion. The browser will not surface the credential, and if an attacker relays a challenge to the real site, the signature produced will carry the phishing origin and fail verification. There is no code for the user to transcribe and therefore no human decision to exploit.

```javascript
import { verifyAuthenticationResponse } from '@simplewebauthn/server';

const verification = await verifyAuthenticationResponse({
  response,                                  // assertion from the browser
  expectedChallenge: session.challenge,      // server generated, single use
  expectedOrigin: 'https://app.example.com', // exact match, not a prefix
  expectedRPID: 'example.com',
  credential: {
    id: stored.credentialId,
    publicKey: stored.publicKey,
    counter: stored.signCount,
  },
  requireUserVerification: true,             // PIN or biometric, not presence alone
});

if (!verification.verified) throw new Error('assertion_rejected');

// Signature counter regression can indicate a cloned authenticator.
// Not all authenticators implement counters; only enforce when non-zero.
const next = verification.authenticationInfo.newCounter;
if (stored.signCount > 0 && next <= stored.signCount) {
  await flagForReview(stored.credentialId, 'counter_regression');
}
await updateCounter(stored.credentialId, next);
```

Two implementation details cause most real deployment problems. First, `expectedOrigin` must be an exact match against a fixed list; accepting a suffix match reintroduces the vulnerability the protocol exists to remove. Second, `requireUserVerification: true` is what makes the credential a genuine two-factor authenticator — user presence alone proves someone touched the key, not that it was the enrolled human.

## Passkeys, Sync, and Recovery

A passkey is a discoverable WebAuthn credential: the authenticator stores enough state to present the account without the server first supplying a credential identifier, which is what allows a passwordless login flow with no username step. The security properties on the wire are identical to any other WebAuthn credential.

What changes is where the private key lives. Synced passkeys are backed up and distributed across a user's devices by a platform or password manager sync fabric, encrypted end to end. Device-bound passkeys never leave the hardware. Synced credentials solve the single largest obstacle to hardware-based authentication — losing the device means losing the account — but they move part of your account security onto the sync provider account and, critically, onto that provider's own recovery process.

For consumer products that trade-off is almost always correct: the realistic alternative is a password plus SMS. For administrator and privileged workforce accounts, require device-bound credentials and register at least two, so loss of one authenticator is an inconvenience rather than an escalation to a helpdesk recovery flow.

Which raises the point most passkey rollouts get wrong. Your authentication strength is capped by your weakest recovery path. Deploying phishing-resistant credentials while retaining a "lost your key? verify by email link and answer a security question" fallback simply relocates the attack. Recovery must be treated as an authentication method and held to a comparable bar: a second registered authenticator, an out-of-band verified process with a delay and notification, or an administrator-initiated re-enrolment with identity proofing.

## Sessions: The Control Plane Everyone Forgets

Once authentication succeeds, the session is the thing an attacker wants. Design it accordingly.

Prefer opaque, server-side sessions for first-party web applications. A high-entropy random identifier (at least 128 bits from a CSPRNG) with state held server-side gives you instant revocation, which self-contained tokens do not. Set the cookie with `HttpOnly`, `Secure`, `SameSite=Lax` at minimum, and use the `__Host-` prefix so the browser enforces that the cookie is host-scoped and secure.

```javascript
res.cookie('__Host-sid', sessionId, {
  httpOnly: true,      // unreadable from JavaScript
  secure: true,        // required by the __Host- prefix
  sameSite: 'lax',     // 'strict' where no cross-site entry flows exist
  path: '/',           // required by the __Host- prefix
  maxAge: 30 * 60 * 1000,
});
```

Regenerate the session identifier at every privilege transition: on login, on step-up authentication, on role change. This is what closes session fixation, where an attacker plants a known identifier before the victim authenticates. Never place a session identifier in a URL, where it lands in referrer headers, proxy logs and shared links.

Run two independent clocks. An idle timeout — typically 15 to 30 minutes for sensitive applications, longer for low-risk consumer contexts — bounds exposure on an unattended device. An absolute lifetime, measured in hours or a small number of days, bounds how long a stolen session remains useful regardless of activity. Only the absolute clock limits a genuinely stolen cookie, because the attacker generates activity.

Bind the session to properties that should not change mid-session and re-authenticate when they do. A dramatic change in source network or a change in user agent family is weak evidence on its own, but it is reasonable grounds for a step-up challenge before a high-value action. Require fresh authentication — not just a valid session — before password change, MFA enrolment changes, payment details, and administrative operations.

## Token Lifetimes and Revocation Design

For API and delegated access, the design question is how long a stolen bearer token stays valid and what tells you it was stolen.

Access tokens should be short-lived: minutes, not hours. If they are JWTs validated locally by resource servers, you have accepted that revocation is not instant, and the lifetime is your revocation window. Keep it small enough that the window is acceptable, and expose an introspection or denylist path for the cases that matter — logout, credential compromise, employee offboarding.

Refresh tokens carry the long-lived risk and need rotation with reuse detection. Issue a new refresh token on every exchange, invalidate the previous one, and treat presentation of an already-used refresh token as a compromise signal that revokes the entire token family for that session. That single mechanism converts undetectable long-term theft into a detectable event.

Use PKCE (RFC 7636) on every OAuth authorization code flow, including confidential clients — OAuth 2.1 makes this the default rather than a mobile-specific mitigation. Redirect URI matching must be exact string comparison against registered values; wildcard and prefix matching is a recurring source of token leakage. For high-value APIs, move beyond bearer semantics entirely with sender-constrained tokens: DPoP (RFC 9449) binds the token to a client-held key via a proof header, and mutual-TLS client certificate binding (RFC 8705) achieves the same at the transport layer. A sender-constrained token stolen from a log is useless without the corresponding private key.

Finally, make authentication observable. Emit structured events for every login success and failure, MFA enrolment and removal, recovery attempt, session revocation and refresh token reuse detection, with account and source context, into off-host append-only storage. Refresh token reuse and MFA de-enrolment are two of the highest-signal detections available in an identity system, and both are cheap to implement at the point where the decision is already being made.

## Key Takeaways

- Use Argon2id with the highest memory cost your login tier can absorb (around 19 MiB, 2 iterations, 1 lane as a floor), fall back to scrypt or bcrypt at cost 10 or more, and rehash transparently when parameters change.
- Rank factors by what they resist. Every shared-secret factor — SMS, email, TOTP, plain push — falls to a real-time phishing proxy; only WebAuthn-class credentials are origin-bound and therefore phishing resistant.
- WebAuthn's security rests on exact origin matching and a server-generated single-use challenge; accepting suffix matches or skipping user verification discards the guarantee.
- Synced passkeys are the right consumer default; require device-bound credentials with a registered backup for administrators, and never let a weak recovery flow undercut a strong credential.
- Prefer opaque server-side sessions with `__Host-` prefixed cookies, regenerate the identifier at every privilege change, and run idle and absolute timeouts independently.
- Keep access tokens to minutes, rotate refresh tokens with reuse detection that kills the whole family, use PKCE with exact redirect URI matching, and adopt DPoP or mTLS binding where bearer theft is unacceptable.
