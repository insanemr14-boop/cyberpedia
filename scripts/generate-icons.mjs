/**
 * Generates the raster icons referenced by site.webmanifest and BaseHead.
 *
 * Run manually (`npm run icons`) and commit the output — the deploy build must
 * not depend on sharp or on system fonts being present in the CI container.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const OUT = new URL('../public/', import.meta.url);
await mkdir(OUT, { recursive: true });

const mark = (size, padding, radius, bg) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
  <g transform="translate(${padding} ${padding}) scale(${(size - padding * 2) / 32})">
    <path d="M16 4l9 4v8c0 5.6-3.8 10.1-9 11.2C10.8 26.1 7 21.6 7 16V8l9-4Z"
          fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="m11.6 16.4 3 3 5.8-6.2"
          fill="none" stroke="#fff" stroke-width="2.8"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

const jobs = [
  // [filename, size, padding, cornerRadius, background]
  ['apple-touch-icon.png', 180, 22, 0, '#0066FF'],
  ['icon-192.png', 192, 24, 42, '#0066FF'],
  ['icon-512.png', 512, 64, 112, '#0066FF'],
  // Maskable icons need ~20% safe-zone padding on all sides.
  ['icon-maskable-512.png', 512, 128, 0, '#0066FF'],
  ['favicon-32.png', 32, 4, 7, '#0066FF'],
];

for (const [name, size, padding, radius, bg] of jobs) {
  const svg = Buffer.from(mark(size, padding, radius, bg));
  await sharp(svg).png({ compressionLevel: 9 }).toFile(new URL(name, OUT).pathname);
  console.log('wrote', name, `${size}x${size}`);
}
