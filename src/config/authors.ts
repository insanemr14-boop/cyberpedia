/**
 * Editorial bylines.
 *
 * These are *editorial desks* (organisational authorship) rather than invented
 * individual journalists. That is deliberate: fabricated author personas with
 * invented credentials are exactly what search quality raters and readers
 * penalise, and Schema.org supports Organization as a valid `author`.
 *
 * BEFORE LAUNCH: replace these with the real people writing the articles.
 * Named human authors with verifiable credentials materially improve E-E-A-T.
 * The `type` field switches the JSON-LD between Person and Organization.
 */

export interface Author {
  slug: string;
  name: string;
  type: 'Person' | 'Organization';
  /** One-line role shown under the byline. */
  role: string;
  bio: string;
  /** Two-letter monogram rendered in the avatar when no image is supplied. */
  initials: string;
  accent: string;
  avatar?: string;
  url?: string;
  social?: { twitter?: string; linkedin?: string; github?: string };
}

export const AUTHORS: Author[] = [
  {
    slug: 'editorial-team',
    name: 'CyberPedia Editorial',
    type: 'Organization',
    role: 'Editorial Desk',
    initials: 'CP',
    accent: '#0066FF',
    bio: 'The CyberPedia editorial desk covers security fundamentals, architecture and practitioner guidance. Every article is reviewed against our editorial policy before publication.',
  },
  {
    slug: 'threat-research',
    name: 'CyberPedia Threat Research',
    type: 'Organization',
    role: 'Threat Research Desk',
    initials: 'TR',
    accent: '#DC2626',
    bio: 'The threat research desk tracks adversary tradecraft, malware families and extortion operations, translating attacker behaviour into defensive detection and response guidance.',
  },
  {
    slug: 'cloud-security-desk',
    name: 'CyberPedia Cloud Security',
    type: 'Organization',
    role: 'Cloud Security Desk',
    initials: 'CS',
    accent: '#0EA5E9',
    bio: 'The cloud security desk covers AWS, Azure, GCP and Kubernetes — configuration, identity, workload isolation and the pipeline controls that keep cloud estates defensible.',
  },
  {
    slug: 'compliance-desk',
    name: 'CyberPedia Governance',
    type: 'Organization',
    role: 'Governance & Operations Desk',
    initials: 'GO',
    accent: '#8B5CF6',
    bio: 'The governance desk covers security operations, detection engineering and compliance frameworks, with a focus on programmes that hold up under real audit and real incidents.',
  },
];

const AUTHOR_MAP = new Map(AUTHORS.map((a) => [a.slug, a]));

export function getAuthor(slug: string): Author | undefined {
  return AUTHOR_MAP.get(slug);
}

/** Never throws during build — unknown slugs fall back to the editorial desk. */
export function getAuthorOrFallback(slug: string): Author {
  return AUTHOR_MAP.get(slug) ?? AUTHORS[0];
}

export const AUTHOR_SLUGS = AUTHORS.map((a) => a.slug);
