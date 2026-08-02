import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CATEGORY_SLUGS } from './config/categories';
import { AUTHOR_SLUGS } from './config/authors';

/**
 * Article collection.
 *
 * Content lives in `content/articles/` at the repo root (not under `src/`)
 * so an external CMS or editorial workflow can write to it without touching
 * application code.
 *
 * Validation philosophy: fail the build on anything that would produce a
 * *broken page* (missing title, unknown category, bad date). Warn — via
 * `npm run seo:check` — on anything that is merely *suboptimal* (a meta
 * description outside the ideal 70-160 character window). A publication should
 * not lose a deploy because a description ran three characters long.
 */
const articles = defineCollection({
  loader: glob({ base: './content/articles', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().min(1).max(120),
    slug: z.string().optional(),
    excerpt: z.string().min(1).max(320),
    description: z.string().min(1).max(320),

    seoTitle: z.string().max(120).optional(),
    seoDescription: z.string().max(320).optional(),

    author: z
      .string()
      .refine((s) => AUTHOR_SLUGS.includes(s), {
        message: `author must be one of: ${AUTHOR_SLUGS.join(', ')}`,
      })
      .default('editorial-team'),

    category: z.string().refine((s) => CATEGORY_SLUGS.includes(s), {
      message: `category must be one of: ${CATEGORY_SLUGS.join(', ')}`,
    }),

    tags: z.array(z.string()).default([]),

    type: z.enum(['news', 'guide', 'review', 'analysis']).default('analysis'),

    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),

    featured: z.boolean().default(false),
    editorsPick: z.boolean().default(false),
    draft: z.boolean().default(false),

    /** Optional raster hero. Omit to use the generated category artwork. */
    heroImage: z.string().optional(),
    heroAlt: z.string().optional(),

    /** Optional manual override; computed from word count when absent. */
    readingTime: z.number().positive().optional(),

    /** Rendered as an FAQ block and as FAQPage JSON-LD. */
    faq: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .optional(),
  }),
});

export const collections = { articles };
