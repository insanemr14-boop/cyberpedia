# Cyberpedia

Practical cybersecurity writing — built with [Astro](https://astro.build), deployed on
Cloudflare Pages.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output -> dist/
npm run preview  # serve the built site
```

## Writing a post

Create a Markdown file in `src/content/blog/`. The filename becomes the URL slug:
`src/content/blog/my-post.md` → `/blog/my-post/`.

```markdown
---
title: 'Title, under 70 characters'
description: 'Meta description, 70-160 characters. Shown in search results and on cards.'
pubDate: 2026-08-02
updatedDate: 2026-09-01   # optional
author: 'Cyberpedia'      # optional, defaults to Cyberpedia
tags: ['fundamentals', 'defense']
heroImage: '/images/example.png'   # optional, lives in public/
heroAlt: 'Describes the image'     # required if heroImage is set
draft: false              # true = excluded from build, RSS and sitemap
---

Post body in Markdown.
```

Front matter is schema-validated in `src/content.config.ts` — the build **fails loudly** on a
missing or malformed field rather than shipping a broken page. Title and description lengths are
enforced for SEO.

## Deployment

Cloudflare Pages watches the `main` branch. Every push to `main` triggers a build and deploy.

```
Build command:      npm run build
Build output dir:   dist
Node version:       20 or later
```

## Structure

```
src/
├── components/     Header, Footer, PostCard, FormattedDate
├── content/blog/   Markdown posts (the content collection)
├── layouts/        BaseLayout (head/SEO), PostLayout (article chrome + JSON-LD)
├── pages/          Routes: /, /blog, /blog/[slug], /about, /404, /rss.xml
├── styles/         global.css (light + dark via prefers-color-scheme)
├── consts.ts       Site title, tagline, description
└── content.config.ts   Front matter schema
```

Site-wide URL config lives in `astro.config.mjs` (`site`) and `public/robots.txt`.
