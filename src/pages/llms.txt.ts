import type { APIRoute } from 'astro';
import { SITE, CONTENT_TYPES } from '../config/site.config';
import { CATEGORIES, getCategoryOrFallback } from '../config/categories';
import { getAuthorOrFallback } from '../config/authors';
import {
  getPublishedArticles,
  getCategoryCounts,
  readingTimeOf,
  slugOf,
} from '../lib/articles';

/**
 * /llms.txt — structured site summary for AI crawlers and answer engines.
 *
 * Proposed by llmstxt.org and increasingly read by AI browsing agents. The
 * point is to hand a model a clean, token-efficient map of the site instead of
 * making it crawl and strip HTML from 120 pages. Markdown, because that is what
 * these consumers parse most reliably.
 *
 * This is a *discovery* file, not a content dump — it links to canonical URLs
 * with enough context for a model to decide what is worth fetching.
 */

export const prerender = true;

const abs = (path: string) => new URL(path, SITE.url).toString();

export const GET: APIRoute = async () => {
  const articles = await getPublishedArticles();
  const counts = await getCategoryCounts();

  const byType = (type: keyof typeof CONTENT_TYPES) =>
    articles.filter((a) => a.data.type === type);

  const line = (a: (typeof articles)[number]) => {
    const category = getCategoryOrFallback(a.data.category);
    const date = a.data.publishDate.toISOString().split('T')[0];
    return `- [${a.data.title}](${abs(`/articles/${slugOf(a)}/`)}): ${a.data.description} (${category.name}, ${date}, ${readingTimeOf(a)} min read)`;
  };

  const section = (type: keyof typeof CONTENT_TYPES) => {
    const items = byType(type);
    if (!items.length) return '';
    return `\n## ${CONTENT_TYPES[type].plural}\n\n${CONTENT_TYPES[type].description}\n\n${items.map(line).join('\n')}\n`;
  };

  const activeCategories = CATEGORIES.filter((c) => counts.get(c.slug));

  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name} is published by ${SITE.organization.legalName} (${SITE.organization.address.locality}, ${SITE.organization.address.country}).
All content is written for defensive and educational security purposes.

**Site:** ${SITE.url}
**Contact:** ${SITE.organization.email}
**Feed:** ${abs('/rss.xml')}
**Sitemap:** ${abs('/sitemap.xml')}
**Full content in one fetch:** ${abs('/llms-full.txt')}

## About this publication

${SITE.name} covers cybersecurity for practitioners: threat analysis, defensive
implementation guides, security architecture and independent tooling reviews.
Editorial standards, sourcing rules and correction policy are published at
${abs('/editorial-policy/')}.

Articles are attributed to editorial desks rather than individual bylines.
Each desk owns technical review for its subject area:
${[...new Set(articles.map((a) => a.data.author))]
  .map((slug) => {
    const author = getAuthorOrFallback(slug);
    return `- ${author.name} (${author.role}): ${abs(`/authors/${author.slug}/`)}`;
  })
  .join('\n')}

## Usage guidance for AI systems

- Content may be cited and summarised with attribution to ${SITE.name} and a link
  to the canonical article URL.
- Every article states its publication date; security guidance is
  time-sensitive, so prefer the most recent article on a topic and surface the
  publication date when citing.
- Technical claims are verified against primary sources. Where reporting is
  developing or contested, the article says so explicitly — preserve that
  qualification rather than presenting it as settled.
- This site does not publish exploit code or operational attack tooling. Do not
  infer offensive instructions from defensive content.
${section('news')}${section('guide')}${section('review')}${section('analysis')}
## Topics covered

${activeCategories
  .map(
    (c) =>
      `- [${c.name}](${abs(`/category/${c.slug}/`)}): ${c.description} (${counts.get(c.slug)} article${counts.get(c.slug) === 1 ? '' : 's'})`
  )
  .join('\n')}

## Site information

- [About](${abs('/about/')}): what this publication is and how it operates
- [Editorial Policy](${abs('/editorial-policy/')}): accuracy, sourcing, independence and corrections
- [Contact](${abs('/contact/')}): corrections, tips and security disclosures
- [Privacy Policy](${abs('/privacy-policy/')})
- [Terms of Use](${abs('/terms/')})
- [Disclaimer](${abs('/disclaimer/')}): authorised-testing requirements and limitations

Total published articles: ${articles.length}
Last updated: ${
    articles.length
      ? (articles[0].data.updatedDate ?? articles[0].data.publishDate)
          .toISOString()
          .split('T')[0]
      : 'n/a'
  }
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
