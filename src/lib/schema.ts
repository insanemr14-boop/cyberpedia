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
import type { Category } from '../config/categories';

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
  return {
    '@type': 'Organization',
    '@id': ID.organization,
    name: SITE.organization.legalName,
    alternateName: SITE.shortName,
    url: SITE.url,
    description: SITE.description,
    foundingDate: String(SITE.organization.foundingYear),
    email: SITE.organization.email,
    logo: {
      '@type': 'ImageObject',
      '@id': `${SITE.url}/#logo`,
      url: abs(SITE.organization.logoPath),
      contentUrl: abs(SITE.organization.logoPath),
      caption: SITE.name,
    },
    image: { '@id': `${SITE.url}/#logo` },
    sameAs: [SITE.social.twitter, SITE.social.github, SITE.social.linkedin].filter(
      Boolean
    ),
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
    datePublished: opts.publishDate.toISOString(),
    dateModified: (opts.updatedDate ?? opts.publishDate).toISOString(),
    author: { '@id': ID.author(opts.author.slug) },
    publisher: { '@id': ID.organization },
    articleSection: opts.category.name,
    keywords: opts.tags.join(', '),
    inLanguage: SITE.language,
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
