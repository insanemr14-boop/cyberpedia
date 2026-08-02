/**
 * Generates the 1200x630 Open Graph card for every article, plus the site
 * default card.
 *
 * TEXT-FREE BY DESIGN
 * resvg (the renderer behind sharp's SVG support) resolves fonts from the host
 * system. There is no guarantee the rendering machine has a font with Latin
 * glyphs — when it does not, every character rasterises as a tofu box, which
 * looks far worse than no text at all. So the card carries brand and category
 * identity through colour and vector artwork only. The article title reaches
 * social platforms through the `og:title` meta tag, which X, LinkedIn, Slack,
 * Discord and Facebook all render alongside the image.
 *
 * WHY THIS IS A COMMITTED ARTEFACT, NOT A BUILD STEP
 * Running it during `astro build` would make the output depend on whatever the
 * CI container happens to have installed. Instead: run it locally, eyeball the
 * result, commit the PNGs. The deploy build then just serves static files.
 *
 * Run after adding an article:  npm run og
 */
import sharp from 'sharp';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ARTICLES = fileURLToPath(new URL('../content/articles/', import.meta.url));
const OUT = fileURLToPath(new URL('../public/og/', import.meta.url));

const WIDTH = 1200;
const HEIGHT = 630;

// Mirrors src/config/categories.ts. Kept as literals rather than imported
// because this script runs outside the Astro/TypeScript pipeline.
const ACCENTS = {
  cybersecurity: '#0066FF', 'cloud-security': '#0EA5E9', 'application-security': '#6366F1',
  'network-security': '#14B8A6', 'linux-security': '#F59E0B', 'windows-security': '#3B82F6',
  cloud: '#22D3EE', 'ai-security': '#A855F7', devsecops: '#10B981', 'ethical-hacking': '#EF4444',
  'threat-intelligence': '#F97316', malware: '#DC2626', ransomware: '#B91C1C', soc: '#8B5CF6',
  siem: '#7C3AED', 'zero-trust': '#0EA5E9', 'identity-management': '#2563EB',
  compliance: '#64748B', gdpr: '#0891B2', nist: '#475569', 'iso-27001': '#334155',
  'security-tools': '#059669', vpn: '#0D9488', firewalls: '#EA580C',
  'password-managers': '#CA8A04',
};

const ICONS = {
  cybersecurity: 'M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6l-9-4Z',
  'cloud-security': 'M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.1 11.1 3.5 3.5 0 0 0 6.5 19h11Z',
  'application-security': 'm8 6-6 6 6 6M16 6l6 6-6 6',
  'network-security': 'M12 2v6m0 8v6M4.9 4.9l4.2 4.2m5.8 5.8 4.2 4.2M2 12h6m8 0h6M4.9 19.1l4.2-4.2m5.8-5.8 4.2-4.2',
  'linux-security': 'm4 5 6 7-6 7M13 19h7',
  'windows-security': 'M3 5h18v14H3zM3 9h18',
  cloud: 'M3 4h18v6H3zM3 14h18v6H3zM7 7h.01M7 17h.01',
  'ai-security': 'M7 7h10v10H7zM9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3',
  devsecops: 'M4 7h5a3 3 0 0 1 3 3v4a3 3 0 0 0 3 3h5M17 4l3 3-3 3M17 14l3 3-3 3',
  'ethical-hacking': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  'threat-intelligence': 'M12 3a9 9 0 1 0 9 9M12 8a4 4 0 1 0 4 4M12 12l7-7',
  malware: 'M9 4h6l1 3H8zM7 10h10v5a5 5 0 0 1-10 0zM4 12h3m10 0h3M5 7l2 2m12-2-2 2M5 18l2-2m12 2-2-2',
  ransomware: 'M6 10h12v10H6zM9 10V7a3 3 0 0 1 6 0v3',
  soc: 'M3 4h18v12H3zM8 20h8m-4-4v4',
  siem: 'M4 20V10m5 10V4m5 16v-7m5 7V8',
  'zero-trust': 'm12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5',
  'identity-management': 'M12 4a8 8 0 0 0-8 8v2m16-2a8 8 0 0 0-4-6.9M8 20a12 12 0 0 0 1.5-6 2.5 2.5 0 0 1 5 0c0 2-.3 4-1 6M16 18a16 16 0 0 0 .8-6',
  compliance: 'M9 4h6v3H9zM6 6h2m8 0h2v14H6V6',
  gdpr: 'M12 4v16M6 8h12M6 8l-3 6h6zM18 8l-3 6h6zM8 20h8',
  nist: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z',
  'iso-27001': 'M12 3 4 7v5c0 5 3.4 8.6 8 9.5 4.6-.9 8-4.5 8-9.5V7l-8-4Zm-3 9 2 2 4-4',
  'security-tools': 'M14 6a4 4 0 1 0 4 4l3 3-4 4-3-3a4 4 0 1 0-4-4L4 4l3-3 4 4',
  vpn: 'M15 4a5 5 0 1 1-4.6 7L4 17.4V20h3l1-1h2v-2h2l1.4-1.4A5 5 0 0 1 15 4Z',
  firewalls: 'M12 3c3 4 6 5.5 6 9a6 6 0 0 1-12 0c0-2 1-3.5 2-5 .5 1.5 1.5 2 2 2 0-2 .5-4 2-6Z',
  'password-managers': 'M4 4h16v16H4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 0v-1m0 10v1m4-5h1M7 12H6',
};

/** Minimal front-matter reader — avoids a YAML dependency for two fields. */
function readField(frontMatter, key) {
  const match = frontMatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) return null;
  return match[1].trim().replace(/^['"]|['"]$/g, '').replace(/''/g, "'");
}

function card(category, seed) {
  const accent = ACCENTS[category] ?? '#0066FF';
  const icon = ICONS[category] ?? ICONS.cybersecurity;

  // Deterministic node placement so a given article always renders identically.
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;

  const nodes = Array.from({ length: 10 }, (_, i) => {
    const v = (h >> (i * 2)) >>> 0;
    return { x: 40 + (v % 1120), y: 40 + ((v >> 6) % 550), r: 3 + ((v >> 3) % 4) };
  });

  const links = nodes
    .slice(0, -1)
    .map(
      (n, i) =>
        `<line x1="${n.x}" y1="${n.y}" x2="${nodes[i + 1].x}" y2="${nodes[i + 1].y}" stroke="#ffffff" stroke-opacity="0.07" stroke-width="1.5"/>`
    )
    .join('');

  const dots = nodes
    .map((n) => `<circle cx="${n.x}" cy="${n.y}" r="${n.r}" fill="#ffffff" fill-opacity="0.14"/>`)
    .join('');

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#101d33"/>
      <stop offset="100%" stop-color="#070e1a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.74" cy="0.3" r="0.8">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grid)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  ${links}${dots}

  <rect x="0" y="0" width="${WIDTH}" height="10" fill="${accent}"/>
  <rect x="0" y="${HEIGHT - 10}" width="${WIDTH}" height="10" fill="${accent}" fill-opacity="0.45"/>

  <g transform="translate(700 150) scale(15)" opacity="0.92">
    <path d="${icon}" fill="none" stroke="${accent}" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <g transform="translate(110 200) scale(7)">
    <rect x="0" y="0" width="32" height="32" rx="8" fill="${accent}"/>
    <path d="M16 7l7 3v6c0 4.2-2.9 7.6-7 8.4-4.1-.8-7-4.2-7-8.4v-6l7-3Z"
          fill="none" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
    <path d="m12.8 16.2 2.3 2.3 4.3-4.6"
          fill="none" stroke="#ffffff" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`);
}

await mkdir(OUT, { recursive: true });

const files = (await readdir(ARTICLES)).filter((f) => /\.mdx?$/.test(f));
let written = 0;

for (const file of files) {
  const raw = await readFile(ARTICLES + file, 'utf8');
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) {
    console.warn('skip (no front matter):', file);
    continue;
  }

  const category = readField(fm[1], 'category');
  if (!category) {
    console.warn('skip (no category):', file);
    continue;
  }

  const slug = readField(fm[1], 'slug') ?? file.replace(/\.mdx?$/, '');

  await sharp(card(category, slug))
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}${slug}.png`);

  written++;
  console.log('og:', `${slug}.png`);
}

await sharp(card('cybersecurity', 'cyberpedia-default'))
  .png({ compressionLevel: 9 })
  .toFile(fileURLToPath(new URL('../public/og-default.png', import.meta.url)));

console.log(`\ndone — ${written} article cards + og-default.png`);
