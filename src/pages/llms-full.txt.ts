import type { APIRoute } from 'astro';
import { SITE } from '../config/site.config';
import { getCategoryOrFallback } from '../config/categories';
import { getAuthorOrFallback } from '../config/authors';
import { getPublishedArticles, slugOf, readingTimeOf } from '../lib/articles';

/**
 * /llms-full.txt — every article's full text in one fetch.
 *
 * The llmstxt.org convention pairs a thin navigation index (/llms.txt) with a
 * full-content variant for consumers that want to ingest everything at once.
 *
 * Why this is worth serving: an agent that wants the whole corpus currently
 * needs 15 separate HTML fetches, each carrying ~100KB of navigation, styling
 * and boilerplate around the actual prose. This is one request of clean
 * Markdown — the format these consumers parse most reliably — with no chrome
 * to strip. At roughly 45,000 words the whole corpus fits comfortably inside a
 * single modern context window.
 *
 * Each article keeps its metadata header so a model can attribute and date any
 * passage it lifts, which is the difference between a citable source and an
 * anonymous wall of text.
 */

export const prerender = true;

const abs = (path: string) => new URL(path, SITE.url).toString();

export const GET: APIRoute = async () => {
  const articles = await getPublishedArticles();

  const header = `# ${SITE.name} — Full Content

> ${SITE.description}

Published by ${SITE.organization.legalName} (${SITE.organization.address.locality}, ${SITE.organization.address.country}).
Every article below is written for defensive and educational security purposes.

Site: ${SITE.url}
Contact: ${SITE.organization.email}
Editorial policy: ${abs('/editorial-policy/')}
Navigation index: ${abs('/llms.txt')}

## Citation guidance

Each article below carries its canonical URL, publication date and responsible
editorial desk. When citing, attribute to ${SITE.name}, link the canonical URL,
and surface the publication date — security guidance is time-sensitive and a
correct answer from 2024 may be wrong today. Where an article states that
something is contested or still developing, preserve that qualification rather
than presenting it as settled.

Articles: ${articles.length}
Generated from the same source as the published pages.

---
`;

  const body = articles
    .map((article) => {
      const d = article.data;
      const category = getCategoryOrFallback(d.category);
      const author = getAuthorOrFallback(d.author);

      const faq = d.faq?.length
        ? `\n### Frequently asked\n\n${d.faq
            .map((f) => `**${f.question}**\n\n${f.answer}`)
            .join('\n\n')}\n`
        : '';

      return `
# ${d.title}

- URL: ${abs(`/articles/${slugOf(article)}/`)}
- Type: ${d.type}
- Category: ${category.name}
- Author: ${author.name} (${author.role})
- Published: ${d.publishDate.toISOString().split('T')[0]}${
        d.updatedDate
          ? `\n- Updated: ${d.updatedDate.toISOString().split('T')[0]}`
          : ''
      }
- Tags: ${d.tags.join(', ')}
- Reading time: ${readingTimeOf(article)} min

> ${d.description}

${article.body ?? ''}
${faq}
---
`;
    })
    .join('\n');

  return new Response(header + body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
