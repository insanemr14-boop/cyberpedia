import { getCollection, type CollectionEntry } from 'astro:content';
import type { ContentType } from '../config/site.config';

export type Article = CollectionEntry<'articles'>;

/** Words per minute used for the reading-time estimate. */
const WPM = 225;

/**
 * Estimate reading time from the raw article body.
 * Code blocks are counted at a reduced weight — people scan code, they do not
 * read it at prose speed.
 */
export function estimateReadingTime(body: string | undefined): number {
  if (!body) return 1;

  const codeBlocks = body.match(/```[\s\S]*?```/g) ?? [];
  const codeWords = codeBlocks.reduce(
    (sum, block) => sum + block.split(/\s+/).length,
    0
  );
  const totalWords = body.split(/\s+/).filter(Boolean).length;
  const proseWords = Math.max(0, totalWords - codeWords);

  const minutes = (proseWords + codeWords * 0.4) / WPM;
  return Math.max(1, Math.round(minutes));
}

/** Reading time for an entry, honouring a manual front-matter override. */
export function readingTimeOf(article: Article): number {
  return article.data.readingTime ?? estimateReadingTime(article.body);
}

/** The canonical URL slug for an article. */
export function slugOf(article: Article): string {
  return article.data.slug ?? article.id;
}

export function urlOf(article: Article): string {
  return `/articles/${slugOf(article)}/`;
}

/** Newest first. */
function byDateDesc(a: Article, b: Article) {
  return b.data.publishDate.valueOf() - a.data.publishDate.valueOf();
}

/**
 * All publishable articles, newest first.
 * Drafts are excluded from every production build.
 */
export async function getPublishedArticles(): Promise<Article[]> {
  const all = await getCollection('articles', ({ data }) => {
    if (data.draft) return import.meta.env.DEV;
    return true;
  });
  return all.sort(byDateDesc);
}

export async function getArticlesByType(type: ContentType): Promise<Article[]> {
  return (await getPublishedArticles()).filter((a) => a.data.type === type);
}

export async function getArticlesByCategory(slug: string): Promise<Article[]> {
  return (await getPublishedArticles()).filter((a) => a.data.category === slug);
}

export async function getArticlesByTag(tag: string): Promise<Article[]> {
  return (await getPublishedArticles()).filter((a) => a.data.tags.includes(tag));
}

export async function getArticlesByAuthor(slug: string): Promise<Article[]> {
  return (await getPublishedArticles()).filter((a) => a.data.author === slug);
}

export async function getFeaturedArticles(limit = 4): Promise<Article[]> {
  const all = await getPublishedArticles();
  const featured = all.filter((a) => a.data.featured);
  // Top up with the newest non-featured articles so the hero is never sparse.
  const filler = all.filter((a) => !a.data.featured);
  return [...featured, ...filler].slice(0, limit);
}

export async function getEditorsPicks(limit = 4): Promise<Article[]> {
  const all = await getPublishedArticles();
  const picks = all.filter((a) => a.data.editorsPick);
  return (picks.length ? picks : all.slice(2)).slice(0, limit);
}

/**
 * Trending is a deterministic proxy — no analytics at build time. Ranks by
 * recency weighted by how well-connected an article is within the taxonomy
 * (shared tags), which surfaces hub content rather than just the newest post.
 */
export async function getTrendingArticles(limit = 5): Promise<Article[]> {
  const all = await getPublishedArticles();
  const tagFrequency = new Map<string, number>();
  for (const a of all) {
    for (const t of a.data.tags) {
      tagFrequency.set(t, (tagFrequency.get(t) ?? 0) + 1);
    }
  }

  const now = Date.now();
  const scored = all.map((a) => {
    const ageDays = (now - a.data.publishDate.valueOf()) / 86_400_000;
    const recency = 1 / (1 + ageDays / 30);
    const connectivity = a.data.tags.reduce(
      (sum, t) => sum + (tagFrequency.get(t) ?? 0),
      0
    );
    return { a, score: recency * 10 + connectivity + (a.data.featured ? 3 : 0) };
  });

  return scored.sort((x, y) => y.score - x.score).slice(0, limit).map((s) => s.a);
}

/**
 * Related articles, ranked by shared tags then same category, excluding self.
 */
export async function getRelatedArticles(
  article: Article,
  limit = 3
): Promise<Article[]> {
  const all = await getPublishedArticles();
  const selfId = article.id;
  const tags = new Set(article.data.tags);

  const scored = all
    .filter((a) => a.id !== selfId)
    .map((a) => {
      const sharedTags = a.data.tags.filter((t) => tags.has(t)).length;
      const sameCategory = a.data.category === article.data.category ? 2 : 0;
      return { a, score: sharedTags * 3 + sameCategory };
    })
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score);

  // Backfill with recent articles if there are not enough genuine matches.
  const picked = scored.slice(0, limit).map((s) => s.a);
  if (picked.length < limit) {
    const seen = new Set([selfId, ...picked.map((p) => p.id)]);
    for (const a of all) {
      if (picked.length >= limit) break;
      if (!seen.has(a.id)) picked.push(a);
    }
  }
  return picked.slice(0, limit);
}

/** Every tag in use, with counts, sorted by frequency. */
export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const all = await getPublishedArticles();
  const counts = new Map<string, number>();
  for (const a of all) {
    for (const t of a.data.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Article counts per category slug. */
export async function getCategoryCounts(): Promise<Map<string, number>> {
  const all = await getPublishedArticles();
  const counts = new Map<string, number>();
  for (const a of all) {
    counts.set(a.data.category, (counts.get(a.data.category) ?? 0) + 1);
  }
  return counts;
}

/** Formats a date consistently across every surface. */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
