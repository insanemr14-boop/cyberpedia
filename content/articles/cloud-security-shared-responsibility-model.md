---
title: 'The Shared Responsibility Model: Where Cloud Security Breaks'
slug: 'cloud-security-shared-responsibility-model'
excerpt: 'The provider secures the cloud; you secure what you put in it. Here is exactly where that line falls across IaaS, PaaS and SaaS on AWS, Azure and GCP.'
description: 'A practical breakdown of the cloud shared responsibility model across IaaS, PaaS and SaaS, plus an audit checklist for AWS, Azure and GCP.'
seoTitle: 'Cloud Shared Responsibility Model Explained'
seoDescription: 'Where provider duty ends and yours begins in AWS, Azure and GCP, with the gaps teams miss and a concrete cloud security audit checklist.'
author: 'cloud-security-desk'
category: 'cloud-security'
type: 'analysis'
tags: ['shared-responsibility', 'aws', 'azure', 'gcp', 'iam', 'misconfiguration']
publishDate: 2026-07-25
featured: true
draft: false
---

Every major cloud provider publishes a version of the same picture: a stack of horizontal bars, some shaded blue for the provider, some shaded orange for you. It is printed on conference booth backdrops and pasted into the second slide of every cloud migration deck. It is also the single most misread diagram in enterprise computing, because it describes a legal and operational boundary using a visual metaphor that implies far more coverage than it delivers.

The diagram is not wrong. It is incomplete in a specific and dangerous way: it tells you which layers each party owns, but it says nothing about which controls within your layers are on by default, which are opt-in, and which silently fail open. Almost every cloud incident that gets written up publicly lands in that gap. Not a hypervisor escape. Not a compromised provider control plane. A storage bucket with the wrong policy, an identity with permissions nobody audited, an instance image nobody rebuilt in fourteen months, and no logs to reconstruct any of it.

This article walks the boundary precisely. Where provider duty stops for IaaS, PaaS and SaaS. Where AWS, Azure and Google Cloud genuinely diverge in defaults. The five categories of gap that show up in nearly every cloud assessment. And a checklist you can run against a real account this week.

## What the Diagram Actually Says

Strip away the shading and the model reduces to one durable principle: the provider is responsible for the security **of** the cloud, and the customer is responsible for security **in** the cloud. The provider owns physical facilities, hardware, the hypervisor, the host operating system, the network fabric between regions, and the availability of the managed service control planes. That is a genuinely large surface, and providers are demonstrably good at it.

What the customer owns is everything that expresses intent. Configuration is intent. Identity is intent. Data classification, network segmentation, encryption key policy, retention, and access grants are all intent. A cloud provider cannot know whether a public S3 bucket is a misconfiguration or a static website, whether a wildcard IAM role is negligence or a deliberate break-glass path, or whether an unencrypted volume holds test fixtures or medical records.

> The provider guarantees that your configuration is applied faithfully. It makes no guarantee that your configuration is correct. Every control that requires a human decision is, by construction, yours.

The second thing the diagram omits is time. Responsibility for patching a managed database engine may sit with the provider, but responsibility for *accepting* the maintenance window, testing the minor version bump, and not pinning the cluster to a deprecated engine for three years sits with you. Shared responsibility is not a static split; it is a set of recurring obligations with deadlines.

## IaaS: You Own Almost Everything Above the Hypervisor

With EC2, Azure Virtual Machines or Compute Engine, the provider's obligation effectively terminates at the virtualization layer. Everything from the guest OS upward is yours: kernel patching, package updates, the SSH or WinRM configuration, host firewall rules, running services, the application, its dependencies, and the credentials it uses.

Three specific IaaS failures recur constantly.

The first is image drift. Teams build a hardened base AMI or managed image, wire it into an autoscaling group, and never rebuild it. Six months later the fleet is scaling out to hundreds of instances that were vulnerable the day they launched. The provider patches the hypervisor underneath you; it does not touch your image. Pipelines that rebuild base images on a fixed cadence and fail deploys on stale image age are the only reliable fix here.

The second is metadata service exposure. IMDSv1 on EC2 answers unauthenticated HTTP requests from anything running on the instance, including a vulnerable application that can be coerced into making server-side requests. IMDSv2 requires a session token via a PUT request with a hop limit, which defeats the common SSRF path. It is a per-instance setting and it is your responsibility to enforce it, not the provider's.

The third is network posture. Security groups, NSGs and VPC firewall rules default to deny inbound, which is good, but nothing stops a team from opening `0.0.0.0/0` on port 22 or 3389 to unblock a debugging session at 2am. Egress is worse: default egress policy in most VPC constructs is allow-all, which is exactly what data exfiltration and command-and-control traffic need.

## PaaS: The Line Moves, and Nobody Tells Your Team

Platform services are where the model gets genuinely confusing, because the boundary moves per service and the provider does not push a notification when it does.

Take a managed relational database. The provider runs the host, the storage layer, backups, failover and the engine binaries. You still own the parameter group, whether the instance is reachable from the internet, whether encryption at rest is enabled at creation time (it usually cannot be toggled afterward without a snapshot restore), which database users exist, what privileges they hold, and whether TLS is enforced on connections.

Serverless compute narrows it further but never to zero. The provider patches the execution environment; you choose the runtime version, and when that runtime reaches end of support you are the one who must migrate. Your function's dependency tree is entirely yours. So is the execution role, which is where most serverless privilege escalation begins — a function that needs to read one queue but was granted a managed policy covering an entire service.

Container platforms are the sharpest example. On a managed Kubernetes service the provider runs and patches the control plane and etcd. You own node pools, the container images, RBAC bindings, network policy, admission control, and secrets handling. The control plane being managed does very little to make the cluster secure.

| Layer | IaaS (EC2, Azure VM, GCE) | PaaS (RDS, App Service, Cloud Run) | SaaS (Microsoft 365, Salesforce) |
|---|---|---|---|
| Physical and hypervisor | Provider | Provider | Provider |
| Guest OS and kernel patching | Customer | Provider | Provider |
| Runtime and engine version | Customer | Shared — provider patches, customer selects and migrates | Provider |
| Application code and dependencies | Customer | Customer | Provider |
| Network exposure and firewalling | Customer | Customer (endpoint config, private link) | Customer (tenant restrictions, IP policy) |
| Identity and access management | Customer | Customer | Customer |
| Encryption key policy | Customer | Customer (CMK vs provider-managed) | Customer where supported |
| Data classification and retention | Customer | Customer | Customer |
| Logging and monitoring configuration | Customer | Customer | Customer |

The pattern is unmistakable. Four rows never change colour regardless of service model: identity, network exposure, data handling, and logging. Those four are where you should concentrate audit effort, because they are yours in every scenario.

## SaaS: Identity, Data and Configuration Are Still Yours

Teams assume SaaS removes them from the equation. It removes them from patching, not from security. When an attacker compromises a SaaS tenant, the path is almost never a flaw in the vendor's code. It is a user without phishing-resistant MFA, an OAuth application granted broad delegated scopes by a user who clicked through a consent prompt, a legacy authentication protocol left enabled, or a file-sharing default that creates links accessible to anyone with the URL.

The controls that matter in SaaS are conditional access policies, admin consent workflows for third-party applications, external sharing defaults, session lifetime, audit log retention, and API token governance. None of those are set for you at a sensible baseline; they ship permissive so that onboarding is frictionless.

## Where AWS, Azure and GCP Genuinely Differ

The three providers describe the same model, but their defaults and enforcement primitives differ in ways that matter operationally.

**AWS** puts the strongest emphasis on the account as a security boundary and on Service Control Policies at the Organizations level as the guardrail mechanism. New S3 buckets have Block Public Access enabled by default, which closed a long-standing footgun, but EBS encryption by default is a per-region opt-in setting that many accounts never flip. CloudTrail retains management events in Event history for a limited window, but durable, queryable, tamper-evident logging requires you to create a trail with log file validation and ship it to a locked-down bucket in a separate account.

**Azure** centres governance on Azure Policy and management groups, with Microsoft Entra ID as the identity plane spanning both cloud resources and Microsoft 365. Storage accounts created recently default to disallowing anonymous blob access, but the Activity Log only retains ninety days unless you configure a diagnostic setting to export it. Azure's distinctive risk is the breadth of Entra ID roles: a Global Administrator or Privileged Role Administrator assignment reaches across resources and productivity data simultaneously, which makes least privilege and Privileged Identity Management non-optional rather than nice to have.

**Google Cloud** adds the language of "shared fate" — the provider actively pushing secure defaults and blueprints rather than merely drawing a line. Its most useful primitive is the Organization Policy constraint, which enforces posture declaratively across the resource hierarchy. Constraints like `constraints/storage.publicAccessPrevention`, `constraints/iam.disableServiceAccountKeyCreation` and `constraints/compute.requireOsLogin` prevent entire misconfiguration classes rather than detecting them after the fact. On logging, Admin Activity audit logs are on by default at no cost, but Data Access logs are largely off by default, which is precisely the category you need when investigating whether data was read.

## The Gaps Teams Consistently Miss

**Storage exposure beyond the obvious bucket.** Public object storage gets the headlines, but the same class of error hides in snapshot sharing settings, container registry visibility, unauthenticated database endpoints, and pre-signed URLs with multi-year expiry. Audit the sharing attribute of every stateful resource type, not just blob storage.

**IAM sprawl.** The measurable symptom is the gap between permissions granted and permissions used. Every provider now exposes this: IAM Access Analyzer and last-accessed data on AWS, IAM Recommender on GCP, and Entra ID access reviews on Azure. Unused roles, stale service account keys, and human users holding long-lived static credentials are the three findings that appear in nearly every assessment. Wildcard actions in inline policies are the fourth.

**Unpatched images and stale runtimes.** Both the AMI problem described above and its serverless twin: functions pinned to runtimes that stopped receiving security updates. Track image age and runtime end-of-support dates as inventory attributes with alerting thresholds.

**Logging gaps.** The three questions to ask of any account: are control plane logs enabled in every region including ones you do not use, are data plane logs enabled for the resources that hold sensitive data, and is the log destination outside the blast radius of the account being logged. Most environments fail at least one. Attackers routinely disable logging as an early action, which is why log destination isolation and integrity validation matter more than log volume.

**Encryption key ownership confusion.** Provider-managed encryption at rest is the default nearly everywhere and it is genuinely good. It does not, however, give you the ability to revoke access cryptographically or to prove key custody to an auditor. If your threat model or compliance regime requires either, you need customer-managed keys with an explicit key policy — and you need to test that a key disable actually renders the data inaccessible before you claim it in a control narrative.

## A Concrete Audit Checklist

Run these against a real account. They are read-only.

```bash
# AWS: buckets with no explicit public access block configuration
aws s3api list-buckets --query 'Buckets[].Name' --output text \
  | tr '\t' '\n' \
  | while read -r bucket; do
      aws s3api get-public-access-block --bucket "$bucket" >/dev/null 2>&1 \
        || echo "NO PUBLIC ACCESS BLOCK: $bucket"
    done

# AWS: IAM credential hygiene - user, key age, key last used
aws iam generate-credential-report >/dev/null
aws iam get-credential-report --query Content --output text \
  | base64 -d | cut -d, -f1,9,10,11,14,15,16

# AWS: EC2 instances still permitting IMDSv1
aws ec2 describe-instances \
  --query 'Reservations[].Instances[?MetadataOptions.HttpTokens==`optional`].InstanceId' \
  --output text

# Azure: storage accounts still allowing anonymous blob access
az storage account list \
  --query "[?allowBlobPublicAccess==\`true\`].{name:name, rg:resourceGroup}" -o table

# Azure: role assignments at subscription scope or higher
az role assignment list --all --include-inherited \
  --query "[?scope=='/subscriptions/$SUBSCRIPTION_ID'].{p:principalName, r:roleDefinitionName}" \
  -o table

# GCP: is public access prevention enforced at the org level
gcloud resource-manager org-policies describe \
  constraints/storage.publicAccessPrevention --organization "$ORG_ID"

# GCP: service account keys, which should ideally not exist at all
gcloud iam service-accounts list --format='value(email)' \
  | while read -r sa; do
      gcloud iam service-accounts keys list --iam-account="$sa" \
        --managed-by=user --format='value(name,validAfterTime)'
    done
```

Detection tells you what broke. Prevention stops it recurring. A bucket policy that denies both unencrypted uploads and plaintext transport turns two audit findings into a permanent invariant:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::acme-prod-records/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::acme-prod-records",
        "arn:aws:s3:::acme-prod-records/*"
      ],
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    }
  ]
}
```

Beyond individual resources, the checklist items worth institutionalising are: organisation-level guardrails that cannot be overridden by a project owner, a single log archive account with write-once retention, mandatory tagging that lets you attribute every resource to an owning team, and quarterly access reviews for anything holding administrative or data-plane read permissions on production.

### From Checklist to Continuous Control

The productive reframing is to stop treating the diagram as a description and start treating it as a contract with acceptance criteria. For each service you consume, write down three things: what the provider commits to, what you must configure, and how you verify it continuously. That third column is what converts a slide into a control.

Policy-as-code is the mechanism. Organization Policy constraints on GCP, Azure Policy with deny effects, and SCPs plus AWS Config rules give you enforcement at a scope no individual engineer can bypass. Cloud security posture management tooling then covers the residue — the drift between what your guardrails prevent and what your standard requires.

None of this removes responsibility. It just makes the responsibility legible, testable and hard to forget between quarterly audits.

## Key Takeaways

- The provider secures the infrastructure; you secure every decision expressed as configuration. Identity, network exposure, data handling and logging are always yours regardless of IaaS, PaaS or SaaS.
- The boundary shifts per service and providers do not notify you when it does. Document the split per service you consume, including who owns runtime version migration.
- Secure defaults differ meaningfully between AWS, Azure and GCP. Verify defaults per provider rather than assuming parity, particularly for data access logging and encryption at rest.
- The recurring gaps are storage exposure beyond buckets, IAM sprawl measured as granted-versus-used permissions, stale images and runtimes, incomplete logging, and unclear key ownership.
- Prevent with organisation-scoped policy-as-code, not with detection alone. Guardrails an engineer cannot override are worth more than any dashboard.
- Ship control plane and data access logs to an isolated account with write-once retention. Logs inside the blast radius of the account they describe are not evidence.
