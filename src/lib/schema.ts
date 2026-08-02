/**
 * JSON-LD builders.
 *
 * Every graph node is given a stable `@id` so that Google can resolve the
 * relationships between Organization, WebSite, WebPage and Article rather than
 * treating each block as an unconnected island. This is the difference between
 * "we have schema" and schema that actually earns rich results.
 */

import { SITE } from '../config/site.config';
import type { Author } from '../config/authors';
import { CATEGORIES, type Category } from '../config/categories';

const abs = (path: string) => new URL(path, SITE.url).toString();

/** Stable graph identifiers. */
export const ID = {
  organization: `${SITE.url}/#organization`,
  website: `${SITE.url}/#website`,
  page: (path: string) => `${abs(path)}#webpage`,
  article: (path: string) => `${abs(path)}#article`,
  author: (slug: string) => `${SITE.url}/authors/${slug}/#author`,
  breadcrumb: (path: string) => `${abs(path)}#breadcrumb`,
};

export function organizationSchema() {
  const org = SITE.organization;

  return {
    '@type': 'Organization',
    '@id': ID.organization,
    name: SITE.name,
    legalName: org.legalName,
    alternateName: SITE.shortName,
    url: SITE.url,
    description: SITE.description,
    foundingDate: String(org.foundingYear),
    email: org.email,
    telephone: org.phone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: org.address.locality,
      addressRegion: org.address.region,
      addressCountry: org.address.countryCode,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: org.email,
      telephone: org.phone,
      areaServed: 'Worldwide',
      availableLanguage: ['English', 'Hindi'],
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ],
        opens: '09:00',
        closes: '19:00',
      },
    },
    // Declares the subject areas this publication claims competence in, so
    // topical authority is stated explicitly rather than inferred from article
    // volume. Driven by the same taxonomy that powers the category pages, so
    // the claim and the content can never drift apart.
    knowsAbout: CATEGORIES.map((c) => c.name),

    publishingPrinciples: abs('/editorial-policy/'),
    ethicsPolicy: abs('/editorial-policy/'),

    logo: {
      '@type': 'ImageObject',
      '@id': `${SITE.url}/#logo`,
      url: abs(org.logoPath),
      contentUrl: abs(org.logoPath),
      caption: SITE.name,
    },
    image: { '@id': `${SITE.url}/#logo` },
    sameAs: [
      SITE.social.instagram,
      SITE.social.linkedin,
      SITE.social.twitter,
      SITE.social.github,
    ].filter(Boolean),
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': ID.website,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    publisher: { '@id': ID.organization },
    inLanguage: SITE.language,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function webPageSchema(opts: {
  path: string;
  title: string;
  description: string;
  breadcrumbPath?: string;
}) {
  return {
    '@type': 'WebPage',
    '@id': ID.page(opts.path),
    url: abs(opts.path),
    name: opts.title,
    description: opts.description,
    isPartOf: { '@id': ID.website },
    inLanguage: SITE.language,
    ...(opts.breadcrumbPath && {
      breadcrumb: { '@id': ID.breadcrumb(opts.breadcrumbPath) },
    }),
  };
}

export function authorSchema(author: Author) {
  return {
    '@type': author.type,
    '@id': ID.author(author.slug),
    name: author.name,
    description: author.bio,
    url: `${SITE.url}/authors/${author.slug}/`,
    ...(author.type === 'Person' && { jobTitle: author.role }),
    ...(author.social?.twitter || author.social?.linkedin || author.social?.github
      ? {
          sameAs: [
            author.social?.twitter,
            author.social?.linkedin,
            author.social?.github,
          ].filter(Boolean),
        }
      : {}),
  };
}

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export function breadcrumbSchema(path: string, items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': ID.breadcrumb(path),
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: abs(item.href),
    })),
  };
}

export function articleSchema(opts: {
  path: string;
  title: string;
  description: string;
  publishDate: Date;
  updatedDate?: Date;
  author: Author;
  category: Category;
  tags: string[];
  image: string;
  wordCount?: number;
  type: 'news' | 'guide' | 'review' | 'analysis';
}) {
  // Map internal content types onto the most specific schema.org type that
  // Google recognises. NewsArticle unlocks Top Stories eligibility.
  const schemaType =
    opts.type === 'news'
      ? 'NewsArticle'
      : opts.type === 'guide'
        ? 'TechArticle'
        : 'Article';

  return {
    '@type': schemaType,
    '@id': ID.article(opts.path),
    isPartOf: { '@id': ID.page(opts.path) },
    mainEntityOfPage: { '@id': ID.page(opts.path) },
    headline: opts.title.slice(0, 110),
    name: opts.title,
    description: opts.description,
    abstract: opts.description,
    datePublished: opts.publishDate.toISOString(),
    dateModified: (opts.updatedDate ?? opts.publishDate).toISOString(),
    author: { '@id': ID.author(opts.author.slug) },
    publisher: { '@id': ID.organization },
    copyrightHolder: { '@id': ID.organization },
    copyrightYear: opts.publishDate.getUTCFullYear(),
    articleSection: opts.category.name,
    keywords: opts.tags.join(', '),
    inLanguage: SITE.language,

    // No paywall or registration gate. Answer engines weight freely-accessible
    // sources more highly, and stating it explicitly removes the ambiguity.
    isAccessibleForFree: true,

    // Primary topic as a resolvable term, plus the tags as secondary subjects.
    // This gives an answer engine an explicit topical anchor rather than making
    // it infer the subject from prose.
    about: {
      '@type': 'Thing',
      name: opts.category.name,
      description: opts.category.description,
      url: abs(`/category/${opts.category.slug}/`),
    },
    mentions: opts.tags.map((tag) => ({
      '@type': 'Thing',
      name: tag.replace(/-/g, ' '),
      url: abs(`/tag/${tag}/`),
    })),

    // Which parts a voice assistant should read aloud. Pointing at the lede and
    // the Key Takeaways rather than the whole body keeps spoken answers useful.
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.lede', '[data-speakable]'],
    },

    audience: {
      '@type': 'Audience',
      audienceType:
        'Security engineers, defenders, IT administrators and technical decision-makers',
    },

    ...(opts.wordCount && { wordCount: opts.wordCount }),
    image: {
      '@type': 'ImageObject',
      url: abs(opts.image),
      width: 1200,
      height: 630,
    },
    thumbnailUrl: abs(opts.image),
  };
}

export function faqSchema(
  path: string,
  faq: { question: string; answer: string }[]
) {
  return {
    '@type': 'FAQPage',
    '@id': `${abs(path)}#faq`,
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function collectionPageSchema(opts: {
  path: string;
  title: string;
  description: string;
  items: { name: string; href: string }[];
}) {
  return {
    '@type': 'CollectionPage',
    '@id': ID.page(opts.path),
    url: abs(opts.path),
    name: opts.title,
    description: opts.description,
    isPartOf: { '@id': ID.website },
    inLanguage: SITE.language,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: opts.items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        url: abs(item.href),
      })),
    },
  };
}

/** Wraps nodes into a single connected @graph document. */
export function graph(...nodes: object[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}
