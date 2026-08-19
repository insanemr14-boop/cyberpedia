/**
 * ============================================================================
 * SITE CONFIGURATION — the single tenant switch for this codebase.
 * ============================================================================
 *
 * This platform is designed to power multiple publications (CyberPedia,
 * FinancePedia, LegalPedia, HostingGuide, AIInsider, CloudAcademy) from one
 * codebase. Everything brand-specific lives in this file plus
 * `categories.ts` and `authors.ts`.
 *
 * To spin up a new publication:
 *   1. Change the values in this file.
 *   2. Replace `src/config/categories.ts` with the new vertical's taxonomy.
 *   3. Replace `src/config/authors.ts` with the new editorial desks.
 *   4. Swap the brand colours in `src/styles/global.css` (@theme block).
 *   5. Point `content/articles/` at the new content.
 *
 * No component, layout or page should ever hardcode a brand name, URL,
 * colour or piece of copy. If you find yourself doing that, add it here.
 */

export interface SiteConfig {
  name: string;
  shortName: string;
  domain: string;
  url: string;
  tagline: string;
  description: string;
  locale: string;
  language: string;
  themeColor: string;
  /** Brand mark rendered in the navbar: split into two tones. */
  logo: { primary: string; accent: string };
  /** Organisation-level details used for Organization JSON-LD. */
  organization: {
    legalName: string;
    foundingYear: number;
    email: string;
    phone: string;
    /** E.164 format, used for tel: and WhatsApp links. */
    phoneE164: string;
    address: {
      locality: string;
      region: string;
      country: string;
      countryCode: string;
    };
    hours: string;
    /** Schema.org openingHours format. */
    hoursSpec: string;
    responseTime: string;
    logoPath: string;
  };
  social: {
    instagram?: string;
    linkedin?: string;
    whatsapp?: string;
    twitter?: string;
    twitterHandle?: string;
    github?: string;
    rss: string;
  };
  /**
   * Analytics placeholders. Leave empty to disable — nothing is injected and
   * no third-party origin is contacted until an ID is supplied.
   */
  analytics: {
    googleAnalyticsId: string;
    googleSearchConsoleVerification: string;
    microsoftClarityId: string;
    /** Cloudflare Web Analytics beacon token. */
    cloudflareAnalyticsToken: string;
    /** AdSense publisher ID, e.g. "pub-0000000000000000". Empty disables ads. */
    adsenseClientId: string;
  };
  /** Newsletter provider endpoint. Wired to `/api/newsletter` placeholder. */
  newsletter: {
    enabled: boolean;
    endpoint: string;
    heading: string;
    body: string;
    buttonLabel: string;
  };
  /** Pagination sizes per surface. */
  pagination: {
    articlesPerPage: number;
    categoryPerPage: number;
    relatedCount: number;
  };
  features: {
    search: boolean;
    comments: boolean;
    newsletter: boolean;
    themeSwitcher: boolean;
    readingProgress: boolean;
  };
}

export const SITE: SiteConfig = {
  name: 'CyberPedia',
  shortName: 'CyberPedia',
  domain: 'cyberpedia.qd.je',
  url: 'https://cyberpedia.qd.je',
  tagline: 'Cybersecurity, explained properly.',
  description:
    'CyberPedia publishes in-depth cybersecurity analysis, threat intelligence, defensive guides and security tooling reviews for engineers and defenders.',
  locale: 'en_US',
  language: 'en',
  themeColor: '#0066FF',

  logo: { primary: 'Cyber', accent: 'Pedia' },

  organization: {
    legalName: 'Rio Cloud Solutions',
    foundingYear: 2026,
    email: 'info@riocloudsolutions.com',
    phone: '+91 75085 83782',
    phoneE164: '917508583782',
    address: {
      locality: 'Chandigarh',
      region: 'Chandigarh',
      country: 'India',
      countryCode: 'IN',
    },
    hours: 'Monday to Saturday, 9:00-19:00 IST',
    hoursSpec: 'Mo-Sa 09:00-19:00',
    responseTime: 'Typically within 2-4 hours during business hours (IST)',
    logoPath: '/logo.svg',
  },

  // Only profiles that actually exist are listed — a sameAs pointing at a
  // non-existent account is a negative trust signal, not a neutral one.
  social: {
    instagram: 'https://instagram.com/riocloud.in',
    linkedin: 'https://linkedin.com/company/rio-cloud-solutions',
    whatsapp: 'https://wa.me/917508583782',
    rss: '/rss.xml',
  },

  // Populate these to activate the corresponding provider. Empty = disabled.
  analytics: {
    googleAnalyticsId: 'G-TDD0MM4TM7',
    googleSearchConsoleVerification: 'REfhXaG6pnK53a3U7-XFJfPqEamF7fDx1AY0_a7zviM',
    microsoftClarityId: '',
    cloudflareAnalyticsToken: '',
    adsenseClientId: 'pub-2164822493055530',
  },

  newsletter: {
    enabled: true,
    endpoint: '/api/newsletter',
    heading: 'The CyberPedia Briefing',
    body: 'Threat analysis and defensive guidance, sent when there is something worth saying. No vendor pitches.',
    buttonLabel: 'Subscribe',
  },

  pagination: {
    articlesPerPage: 12,
    categoryPerPage: 12,
    relatedCount: 3,
  },

  features: {
    search: true,
    comments: true,
    newsletter: true,
    themeSwitcher: true,
    readingProgress: true,
  },
};

/** Primary navigation. Rendered in the navbar and mobile drawer. */
export const MAIN_NAV = [
  { label: 'News', href: '/news/' },
  { label: 'Guides', href: '/guides/' },
  { label: 'Reviews', href: '/reviews/' },
  { label: 'Categories', href: '/categories/' },
  { label: 'Articles', href: '/articles/' },
] as const;

/** Footer link groups. */
export const FOOTER_NAV = [
  {
    heading: 'Content',
    links: [
      { label: 'Latest News', href: '/news/' },
      { label: 'Guides', href: '/guides/' },
      { label: 'Reviews', href: '/reviews/' },
      { label: 'All Articles', href: '/articles/' },
      { label: 'Categories', href: '/categories/' },
    ],
  },
  {
    heading: 'Publication',
    links: [
      { label: 'About', href: '/about/' },
      { label: 'Editorial Policy', href: '/editorial-policy/' },
      { label: 'Contact', href: '/contact/' },
      { label: 'RSS Feed', href: '/rss.xml' },
      { label: 'Sitemap', href: '/sitemap.xml' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy-policy/' },
      { label: 'Terms of Use', href: '/terms/' },
      { label: 'Cookie Policy', href: '/cookie-policy/' },
      { label: 'Disclaimer', href: '/disclaimer/' },
    ],
  },
] as const;

/**
 * Minimum articles an archive needs before it is worth indexing.
 *
 * Archives below the threshold are served `noindex, follow` and kept out of the
 * sitemap. They remain fully browsable and still pass link equity to the
 * articles — they simply do not compete as landing pages while they are thin.
 *
 * The problem being solved: 25 category + 74 tag pages against 15 articles is a
 * ~6.6:1 ratio of listing pages to real content. Indexing all of them dilutes
 * the site's content-to-noise ratio, which is precisely the pattern the
 * helpful-content system penalises.
 *
 * Raise these as the archive grows — an archive earns indexing when it reads as
 * a genuine topic hub rather than a wrapper around one post.
 */
export const INDEX_THRESHOLDS = {
  category: 3,
  tag: 4,
  author: 1,
} as const;

/** Content types drive the /news, /guides and /reviews surfaces. */
export const CONTENT_TYPES = {
  news: {
    label: 'News',
    plural: 'Latest News',
    href: '/news/',
    description:
      'Breaking cybersecurity news, vulnerability disclosures and incident reporting as it develops.',
  },
  guide: {
    label: 'Guide',
    plural: 'Guides',
    href: '/guides/',
    description:
      'Step-by-step defensive guides and implementation walkthroughs written for practitioners.',
  },
  review: {
    label: 'Review',
    plural: 'Reviews',
    href: '/reviews/',
    description:
      'Independent evaluations of security tooling, architectures and vendor categories.',
  },
  analysis: {
    label: 'Analysis',
    plural: 'Analysis',
    href: '/articles/',
    description: 'Deep technical analysis of threats, techniques and security architecture.',
  },
} as const;

export type ContentType = keyof typeof CONTENT_TYPES;
