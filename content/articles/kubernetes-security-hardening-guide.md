---
title: 'Kubernetes Hardening: RBAC, Pod Security and Network Policy'
slug: 'kubernetes-security-hardening-guide'
excerpt: 'A working guide to RBAC, Pod Security Standards, network policy, admission control and image provenance, with manifests you can apply today.'
description: 'Practical Kubernetes hardening: least-privilege RBAC, Pod Security Standards, network policies, secrets, admission control and runtime defence.'
seoTitle: 'Kubernetes Security Hardening: A Practical Guide'
seoDescription: 'Harden Kubernetes with least-privilege RBAC, Pod Security Standards, network policies, admission control and image signing enforcement.'
author: 'cloud-security-desk'
category: 'cloud-security'
type: 'guide'
editorsPick: true
tags: ['kubernetes', 'rbac', 'network-policy', 'admission-control', 'container-security', 'pod-security']
publishDate: 2026-06-22
featured: false
draft: false
---

A freshly provisioned Kubernetes cluster is a flat network in which every pod can reach every other pod, every workload runs with a mounted service account token, and the default namespace has no constraints on what a container may request from the kernel. That is not a criticism of the project — Kubernetes ships permissive defaults because it is a platform, and platforms that break on first use do not get adopted. But it means the security posture of your cluster is entirely a function of what you added after `kubectl create cluster` returned.

Managed control planes shift a meaningful amount of this. EKS, AKS and GKE run and patch the API server, scheduler, controller manager and etcd, and they encrypt etcd at rest by default. None of that constrains what runs on your nodes. The attack paths that matter in practice — a compromised application container reading a service account token, using it to list secrets in its namespace, and pivoting laterally because nothing restricts pod-to-pod traffic — sit entirely inside the customer half of the boundary.

This guide covers the seven control areas that, applied together, close the realistic paths from initial container compromise to cluster takeover. Every manifest here is applyable as written.

## RBAC Done Properly

RBAC is the single highest-leverage control in a cluster and the one most often reduced to "we do not give people cluster-admin." That is necessary and nowhere near sufficient, because several innocuous-looking permissions are equivalent to namespace administrator.

The verbs to treat as privileged are `escalate`, `bind` and `impersonate`. `escalate` on roles lets a principal grant itself permissions it does not hold, which defeats the entire model. `bind` allows attaching an existing high-privilege ClusterRole to a subject you control. `impersonate` allows acting as any user or group, including `system:masters`, which bypasses RBAC evaluation entirely.

Beyond those, a set of ordinary-looking permissions confer effective namespace ownership. `create` on pods lets a principal schedule a pod that mounts any secret in the namespace and runs as any service account in it. `create` on `pods/exec` gives a shell in any running container. `create` on `pods/ephemeralcontainers` gives the same thing through a different door. `get` on secrets is direct credential theft. Treat all of these as tier-one permissions requiring the same review as cluster-admin.

Here is what a least-privilege role for an application actually looks like — narrow verbs, named resources, no wildcards anywhere:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: payments-api
  namespace: payments
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["payments-api-config"]
    verbs: ["get", "watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["payments-api-db"]
    verbs: ["get"]
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payments-api
  namespace: payments
automountServiceAccountToken: false
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payments-api
  namespace: payments
subjects:
  - kind: ServiceAccount
    name: payments-api
    namespace: payments
roleRef:
  kind: Role
  name: payments-api
  apiGroup: rbac.authorization.k8s.io
```

Note `automountServiceAccountToken: false` on the ServiceAccount. Most applications never call the Kubernetes API, and a mounted token in a compromised container is the first thing an attacker looks for. Turn automounting off by default at the service account level and re-enable it per pod only where genuinely needed.

Audit what you have with the API rather than by reading YAML:

```bash
# What can this workload's identity actually do?
kubectl auth can-i --list \
  --as=system:serviceaccount:payments:payments-api -n payments

# Every subject bound to cluster-admin
kubectl get clusterrolebindings -o json \
  | jq -r '.items[] | select(.roleRef.name=="cluster-admin")
           | "\(.metadata.name): \(.subjects // [] | map(.kind+"/"+.name) | join(", "))"'

# Roles and ClusterRoles containing wildcards
kubectl get roles,clusterroles -A -o json \
  | jq -r '.items[] | select(.rules // [] | any(.verbs[]?=="*" or .resources[]?=="*"))
           | "\(.kind) \(.metadata.namespace // "cluster")/\(.metadata.name)"'
```

Run those three commands on a cluster you have never audited. The results are usually instructive.

## Pod Security Standards and Workload Constraints

PodSecurityPolicy is gone. Its replacement is Pod Security Admission, a built-in admission controller that enforces the three Pod Security Standards profiles through namespace labels. It is simpler than PSP, it is enabled by default, and it requires no additional components.

| Control | Privileged | Baseline | Restricted |
|---|---|---|---|
| `privileged: true` containers | Allowed | Blocked | Blocked |
| hostNetwork, hostPID, hostIPC | Allowed | Blocked | Blocked |
| hostPath volumes | Allowed | Blocked | Blocked |
| Adding Linux capabilities | Allowed | Only NET_BIND_SERVICE | Must drop ALL |
| `allowPrivilegeEscalation` | Allowed | Allowed | Must be false |
| Running as root | Allowed | Allowed | `runAsNonRoot: true` required |
| seccomp profile | Any | Unconfined blocked | RuntimeDefault or Localhost required |
| Volume types | Any | Any | Restricted to a safe subset |

The labels apply per namespace and support three modes simultaneously, which is how you roll this out without breaking production. Set `warn` and `audit` to `restricted` first, observe what would fail, fix the workloads, then move `enforce` up.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: payments
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.31
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

Pinning `enforce-version` matters. Without it the namespace tracks `latest`, and a cluster upgrade that tightens a profile can start rejecting workloads that previously admitted. Pin the version, then bump it deliberately.

A workload that satisfies `restricted` looks like this. Nothing here is exotic; most applications need only the securityContext block added.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  namespace: payments
spec:
  replicas: 3
  selector:
    matchLabels: { app: payments-api }
  template:
    metadata:
      labels: { app: payments-api }
    spec:
      serviceAccountName: payments-api
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        fsGroup: 10001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          image: ghcr.io/acme/payments-api@sha256:3f8a1c9e4b2d7a6f0c5e8b1d4a7f2c9e6b3d0a5f8c1e4b7d2a9f6c3e0b5d8a1f
          ports:
            - containerPort: 8080
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          resources:
            requests: { cpu: 100m, memory: 128Mi }
            limits: { cpu: "1", memory: 512Mi }
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
```

Two details worth calling out. The image is referenced by digest, not tag — a tag can be repointed at different content, so tag-based deployment gives you no integrity guarantee. And `readOnlyRootFilesystem: true` requires an explicit writable mount for anything the process needs to write, which is why the `emptyDir` for `/tmp` is there.

## Network Policy: Default Deny Is the Only Sane Baseline

Kubernetes networking is flat by default. Any pod can open a connection to any other pod in any namespace, and to anything the node can reach. That single property converts a compromised frontend container into a scanner with access to your entire internal service mesh.

NetworkPolicy fixes it, but only if your CNI plugin implements it. Calico, Cilium, Antrea and the managed policy engines in EKS, AKS and GKE all do. If your CNI does not, NetworkPolicy objects are accepted by the API server and silently ignored — a failure mode worth testing explicitly rather than assuming.

> A NetworkPolicy that is accepted but not enforced looks identical to one that works. Verify enforcement by actually attempting a connection that should be blocked, not by confirming the object exists.

Start with default deny on both directions per namespace, then allow explicitly.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: payments
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
# Without this, every pod in the namespace loses DNS and appears "randomly broken"
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: payments
spec:
  podSelector: {}
  policyTypes: ["Egress"]
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payments-api-ingress
  namespace: payments
spec:
  podSelector:
    matchLabels: { app: payments-api }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: edge
          podSelector:
            matchLabels: { app: api-gateway }
      ports:
        - protocol: TCP
          port: 8080
```

The DNS policy is the step teams skip. Applying default-deny egress without it breaks name resolution cluster-wide in that namespace, the rollout gets reverted, and network policy gets written off as too disruptive.

Egress restriction is where most of the security value lives. Ingress control limits lateral movement; egress control limits data exfiltration and command-and-control. Also block pod egress to the cloud instance metadata endpoint at `169.254.169.254` — reaching it from a pod is a well-known path to node-level cloud credentials on clusters that have not adopted workload identity federation.

## Secrets, and What the API Server Actually Protects

Kubernetes Secrets are base64-encoded, not encrypted, in their API representation. Two consequences follow.

First, anyone with `get` on secrets in a namespace has the plaintext. RBAC is the entire access control mechanism, which is why secrets read permissions deserve the tier-one treatment described earlier.

Second, encryption at rest in etcd is a separate control configured on the API server via an `EncryptionConfiguration` resource. Managed control planes generally enable envelope encryption backed by the cloud KMS, but on self-managed clusters this must be configured explicitly with an `aescbc`, `aesgcm` or KMS v2 provider — and enabling it does not retroactively encrypt existing secrets until you rewrite them.

Prefer mounting secrets as projected volumes over environment variables. Environment variables are inherited by child processes, appear in `/proc/<pid>/environ`, and are commonly captured by crash handlers and error reporting agents. For cloud credentials specifically, stop synchronising long-lived keys into the cluster at all: use IRSA on EKS, Workload Identity on GKE, or Entra Workload ID on AKS so pods exchange a projected, short-lived service account token for cloud credentials directly. That removes an entire class of static secret from the cluster.

## Admission Control and Image Provenance

RBAC governs who may act. Admission control governs what the resulting object may contain, and it is where policy that spans multiple fields belongs.

Kubernetes now ships ValidatingAdmissionPolicy, a CEL-based in-tree mechanism that handles a large share of common rules without an external webhook — and without the availability risk that a failing webhook introduces. Policy engines like Kyverno and Gatekeeper remain valuable for mutation, cross-object lookups, and signature verification.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-digest-pinned-images
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments", "statefulsets", "daemonsets"]
  validations:
    - expression: >-
        object.spec.template.spec.containers.all(c,
          c.image.contains('@sha256:') &&
          c.image.startsWith('ghcr.io/acme/'))
      message: "Images must come from ghcr.io/acme and be pinned by digest."
```

Layer signature verification on top. Signing images in CI without verifying them at admission produces signatures nobody checks. Kyverno's `verifyImages` rule and the Sigstore policy-controller both enforce that an image carries a valid signature from your expected CI identity before the pod is admitted — which is what actually blocks a tampered or substituted image from running.

Set `failurePolicy: Fail` for security-relevant policies, but scope `matchConstraints` to exclude `kube-system` and your policy engine's own namespace. A fail-closed webhook that also governs the components required to recover the cluster is a well-documented way to lock yourself out.

## Runtime Security and the Control Plane Surface

Admission control validates intent at deploy time. Runtime detection catches what happens afterwards: a shell spawned inside a container, an unexpected outbound connection, a write to a path that should be immutable, a process reading a service account token it has never touched before. eBPF-based tooling such as Falco or Tetragon provides this with low overhead and syscall-level fidelity.

Pair it with API server audit logging. A restrictive audit policy that records secret access, RBAC changes, exec into pods, and all `create` operations at `RequestResponse` level gives you the forensic record you will need. On managed clusters, verify that audit logs are exported to a destination outside the cluster's own blast radius rather than left at the provider default.

On the control plane surface itself, the items that remain yours even on managed offerings are: restricting the public API server endpoint to known CIDR ranges or making it private entirely, ensuring the kubelet rejects anonymous requests and uses webhook authorization, keeping the NodeRestriction admission plugin enabled so a compromised kubelet cannot modify other nodes' objects, and disabling any read-only kubelet port. On self-managed clusters add mutual TLS between control plane components, etcd client certificate authentication, and network isolation so nothing but the API server can reach etcd — direct etcd access is unauthenticated cluster-admin with respect to your data.

Finally, keep node images current. Container escapes are rare but real, and they overwhelmingly depend on unpatched kernel or container runtime versions. Managed node group auto-upgrade combined with a pod disruption budget on your critical workloads makes this routine rather than an event.

## Key Takeaways

- Treat `escalate`, `bind`, `impersonate`, and `create` on pods, `pods/exec` and `pods/ephemeralcontainers` as equivalent to namespace administrator. Audit them with `kubectl auth can-i --list` against real service accounts.
- Disable service account token automounting by default. Most workloads never call the API, and a mounted token is the first thing a compromised container yields.
- Roll out Pod Security Standards with `warn` and `audit` before `enforce`, and always pin `enforce-version` so a cluster upgrade cannot silently tighten the profile.
- Apply default-deny ingress and egress per namespace, and remember the DNS egress allowance or the namespace will appear randomly broken. Block pod egress to `169.254.169.254`.
- Reference images by digest and verify signatures at admission. Signing in CI without admission-time verification provides no protection.
- Confirm that NetworkPolicy is actually enforced by your CNI, and that etcd encryption at rest is configured, by testing rather than assuming.
