// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

/**
 * Astro configuration.
 *
 * Output is fully static so Cloudflare Pages serves pre-rendered HTML from the
 * edge with no adapter and no server runtime. `site` drives canonical URLs,
 * the sitemap and RSS — it must match the production domain exactly.
 */
export default defineConfig({
  site: 'https://cyberpedia.qd.je',
  output: 'static',

  build: {
    // Emit `/articles/slug/index.html` so URLs stay clean and stable.
    format: 'directory',
    inlineStylesheets: 'auto',
  },

  // The sitemap is hand-built at src/pages/sitemap.xml.ts rather than generated
  // by @astrojs/sitemap: one clean /sitemap.xml URL, real per-article lastmod
  // dates instead of a build timestamp, and noindex paginated pages excluded.
  integrations: [mdx()],

  markdown: {
    shikiConfig: {
      // Dual themes let code blocks follow the site's light/dark switch
      // without shipping a second stylesheet.
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      wrap: true,
    },
  },

  vite: {
    plugins: [tailwindcss()],
    build: { cssCodeSplit: true },
  },
});
