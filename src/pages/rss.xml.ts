import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../config/site.config';
import { getCategoryOrFallback } from '../config/categories';
import { getAuthorOrFallback } from '../config/authors';
import { getPublishedArticles, slugOf } from '../lib/articles';

export async function GET(context: APIContext) {
  const articles = await getPublishedArticles();

  return rss({
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    trailingSlash: true,
    items: articles.map((article) => {
      const category = getCategoryOrFallback(article.data.category);
      const author = getAuthorOrFallback(article.data.author);

      return {
        title: article.data.title,
        description: article.data.excerpt,
        pubDate: article.data.publishDate,
        link: `/articles/${slugOf(article)}/`,
        author: `${SITE.organization.email} (${author.name})`,
        categories: [category.name, ...article.data.tags],
      };
    }),
    customData: [
      `<language>en-us</language>`,
      `<copyright>Copyright ${new Date().getFullYear()} ${SITE.organization.legalName}</copyright>`,
      `<managingEditor>${SITE.organization.email}</managingEditor>`,
      `<webMaster>${SITE.organization.email}</webMaster>`,
      `<ttl>60</ttl>`,
    ].join(''),
  });
}
