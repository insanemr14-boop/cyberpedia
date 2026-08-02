// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
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

  integrations: [
    mdx(),
    sitemap({
      filter: (page) =>
        // Search results and API stubs carry no index value.
        !page.includes('/search') && !page.includes('/api/'),
      changefreq: 'weekly',
      lastmod: new Date(),
      serialize(item) {
        if (/\/\/[^/]+\/$/.test(item.url)) {
          return { ...item, priority: 1.0, changefreq: 'daily' };
        }
        if (/\/(news|guides|reviews|articles|categories)\/$/.test(item.url)) {
          return { ...item, priority: 0.9, changefreq: 'daily' };
        }
        if (item.url.includes('/articles/')) return { ...item, priority: 0.8 };
        if (item.url.includes('/category/')) return { ...item, priority: 0.7 };
        return { ...item, priority: 0.5 };
      },
    }),
  ],

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
