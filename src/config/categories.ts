/**
 * Category taxonomy for this publication.
 *
 * `group` clusters categories on the /categories grid page.
 * `accent` is a Tailwind-compatible CSS colour used for the category chip and
 * the generated hero artwork, so every category is visually distinguishable
 * without shipping a single raster image.
 *
 * Swap this whole file when re-tenanting the platform to another vertical.
 */

export interface Category {
  slug: string;
  name: string;
  /** Shown on the category archive page and used as its meta description. */
  description: string;
  group: 'Domains' | 'Operations' | 'Governance' | 'Tooling';
  accent: string;
  /** Inline SVG path data (24x24 viewBox) for the category icon. */
  icon: string;
}

const ICONS = {
  shield: 'M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6l-9-4Z',
  cloud: 'M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.1 11.1 3.5 3.5 0 0 0 6.5 19h11Z',
  code: 'm8 6-6 6 6 6M16 6l6 6-6 6',
  network: 'M12 2v6m0 8v6M4.9 4.9l4.2 4.2m5.8 5.8 4.2 4.2M2 12h6m8 0h6M4.9 19.1l4.2-4.2m5.8-5.8 4.2-4.2',
  terminal: 'm4 5 6 7-6 7M13 19h7',
  window: 'M3 5h18v14H3zM3 9h18',
  pipeline: 'M4 7h5a3 3 0 0 1 3 3v4a3 3 0 0 0 3 3h5M17 4l3 3-3 3M17 14l3 3-3 3',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 3.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z',
  radar: 'M12 3a9 9 0 1 0 9 9M12 8a4 4 0 1 0 4 4M12 12l7-7',
  bug: 'M9 4h6l1 3H8zM7 10h10v5a5 5 0 0 1-10 0zM4 12h3m10 0h3M5 7l2 2m12-2-2 2M5 18l2-2m12 2-2-2',
  lock: 'M6 10h12v10H6zM9 10V7a3 3 0 0 1 6 0v3',
  monitor: 'M3 4h18v12H3zM8 20h8m-4-4v4',
  chart: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5',
  fingerprint: 'M12 4a8 8 0 0 0-8 8v2m16-2a8 8 0 0 0-4-6.9M8 20a12 12 0 0 0 1.5-6 2.5 2.5 0 0 1 5 0c0 2-.3 4-1 6M16 18a16 16 0 0 0 .8-6',
  clipboard: 'M9 4h6v3H9zM6 6h2m8 0h2v14H6V6',
  scale: 'M12 4v16M6 8h12M6 8l-3 6h6zM18 8l-3 6h6zM8 20h8',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z',
  badge: 'M12 3 4 7v5c0 5 3.4 8.6 8 9.5 4.6-.9 8-4.5 8-9.5V7l-8-4Zm-3 9 2 2 4-4',
  wrench: 'M14 6a4 4 0 1 0 4 4l3 3-4 4-3-3a4 4 0 1 0-4-4L4 4l3-3 4 4',
  key: 'M15 4a5 5 0 1 1-4.6 7L4 17.4V20h3l1-1h2v-2h2l1.4-1.4A5 5 0 0 1 15 4Z',
  flame: 'M12 3c3 4 6 5.5 6 9a6 6 0 0 1-12 0c0-2 1-3.5 2-5 .5 1.5 1.5 2 2 2 0-2 .5-4 2-6Z',
  vault: 'M4 4h16v16H4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 0v-1m0 10v1m4-5h1M7 12H6',
  server: 'M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01',
  cpu: 'M7 7h10v10H7zM9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3',
} as const;

export const CATEGORIES: Category[] = [
  // ---------- Domains ----------
  { slug: 'cybersecurity', name: 'Cybersecurity', group: 'Domains', accent: '#0066FF', icon: ICONS.shield,
    description: 'Foundational cybersecurity concepts, defensive strategy and the principles behind resilient security programmes.' },
  { slug: 'cloud-security', name: 'Cloud Security', group: 'Domains', accent: '#0EA5E9', icon: ICONS.cloud,
    description: 'Securing AWS, Azure and GCP workloads — IAM, configuration, workload isolation and cloud-native threat models.' },
  { slug: 'application-security', name: 'Application Security', group: 'Domains', accent: '#6366F1', icon: ICONS.code,
    description: 'Secure development practices, vulnerability classes, code review and application-layer defensive controls.' },
  { slug: 'network-security', name: 'Network Security', group: 'Domains', accent: '#14B8A6', icon: ICONS.network,
    description: 'Segmentation, traffic control, perimeter design and the network-layer controls that limit attacker movement.' },
  { slug: 'linux-security', name: 'Linux Security', group: 'Domains', accent: '#F59E0B', icon: ICONS.terminal,
    description: 'Hardening Linux systems — kernel controls, permissions, auditing, SELinux and server-side defensive configuration.' },
  { slug: 'windows-security', name: 'Windows Security', group: 'Domains', accent: '#3B82F6', icon: ICONS.window,
    description: 'Windows and Active Directory hardening, Group Policy, credential protection and endpoint defensive configuration.' },
  { slug: 'cloud', name: 'Cloud', group: 'Domains', accent: '#22D3EE', icon: ICONS.server,
    description: 'Cloud platform architecture, infrastructure design decisions and the operational context security sits inside.' },
  { slug: 'ai-security', name: 'AI Security', group: 'Domains', accent: '#A855F7', icon: ICONS.cpu,
    description: 'Securing AI systems — prompt injection, model supply chain, agentic tool risk and controls for LLM applications.' },

  // ---------- Operations ----------
  { slug: 'devsecops', name: 'DevSecOps', group: 'Operations', accent: '#10B981', icon: ICONS.pipeline,
    description: 'Embedding security into CI/CD — pipeline controls, automated scanning, policy as code and developer workflow design.' },
  { slug: 'ethical-hacking', name: 'Ethical Hacking', group: 'Operations', accent: '#EF4444', icon: ICONS.target,
    description: 'Authorised offensive security — penetration testing methodology, red teaming and adversary simulation for defenders.' },
  { slug: 'threat-intelligence', name: 'Threat Intelligence', group: 'Operations', accent: '#F97316', icon: ICONS.radar,
    description: 'Adversary tracking, indicator analysis, the intelligence lifecycle and turning threat data into working detections.' },
  { slug: 'malware', name: 'Malware', group: 'Operations', accent: '#DC2626', icon: ICONS.bug,
    description: 'Malware families, analysis methodology, evasion techniques and the detection engineering that catches them.' },
  { slug: 'ransomware', name: 'Ransomware', group: 'Operations', accent: '#B91C1C', icon: ICONS.lock,
    description: 'Ransomware operations, extortion economics, the attack lifecycle and the controls that break it at each stage.' },
  { slug: 'soc', name: 'SOC', group: 'Operations', accent: '#8B5CF6', icon: ICONS.monitor,
    description: 'Security operations centre design — triage workflow, analyst tiering, runbooks and the metrics that actually matter.' },
  { slug: 'siem', name: 'SIEM', group: 'Operations', accent: '#7C3AED', icon: ICONS.chart,
    description: 'Log management and detection engineering — source prioritisation, parsing, retention economics and rule lifecycle.' },

  // ---------- Governance ----------
  { slug: 'zero-trust', name: 'Zero Trust', group: 'Governance', accent: '#0EA5E9', icon: ICONS.layers,
    description: 'Zero Trust architecture — policy enforcement, identity-driven access, microsegmentation and realistic migration paths.' },
  { slug: 'identity-management', name: 'Identity Management', group: 'Governance', accent: '#2563EB', icon: ICONS.fingerprint,
    description: 'Authentication and authorisation architecture — MFA, passkeys, federation, session design and privilege management.' },
  { slug: 'compliance', name: 'Compliance', group: 'Governance', accent: '#64748B', icon: ICONS.clipboard,
    description: 'Security compliance programmes — control mapping, evidence collection, audit readiness and continuous assurance.' },
  { slug: 'gdpr', name: 'GDPR', group: 'Governance', accent: '#0891B2', icon: ICONS.scale,
    description: 'GDPR obligations for engineering teams — lawful basis, data minimisation, breach notification and privacy by design.' },
  { slug: 'nist', name: 'NIST', group: 'Governance', accent: '#475569', icon: ICONS.book,
    description: 'NIST frameworks in practice — the Cybersecurity Framework, SP 800 series guidance and how to apply them properly.' },
  { slug: 'iso-27001', name: 'ISO 27001', group: 'Governance', accent: '#334155', icon: ICONS.badge,
    description: 'ISO 27001 certification — ISMS scoping, Annex A controls, risk treatment and surviving the certification audit.' },

  // ---------- Tooling ----------
  { slug: 'security-tools', name: 'Security Tools', group: 'Tooling', accent: '#059669', icon: ICONS.wrench,
    description: 'Independent evaluation of security tooling — what each category is genuinely good at and where it falls down.' },
  { slug: 'vpn', name: 'VPN', group: 'Tooling', accent: '#0D9488', icon: ICONS.key,
    description: 'VPN protocols, architecture and the shift toward Zero Trust Network Access for remote connectivity.' },
  { slug: 'firewalls', name: 'Firewalls', group: 'Tooling', accent: '#EA580C', icon: ICONS.flame,
    description: 'Firewall architecture and policy design — next-generation features, rule hygiene and traffic inspection trade-offs.' },
  { slug: 'password-managers', name: 'Password Managers', group: 'Tooling', accent: '#CA8A04', icon: ICONS.vault,
    description: 'Password and secrets management — encryption architecture, deployment models and enterprise evaluation criteria.' },
];

/** Fast lookup by slug. */
const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string): Category | undefined {
  return CATEGORY_MAP.get(slug);
}

/**
 * Always returns a renderable category. Unknown slugs degrade to a neutral
 * placeholder rather than throwing during the build.
 */
export function getCategoryOrFallback(slug: string): Category {
  return (
    CATEGORY_MAP.get(slug) ?? {
      slug,
      name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `Articles filed under ${slug.replace(/-/g, ' ')}.`,
      group: 'Domains',
      accent: '#0066FF',
      icon: ICONS.shield,
    }
  );
}

export const CATEGORY_GROUPS = ['Domains', 'Operations', 'Governance', 'Tooling'] as const;

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
