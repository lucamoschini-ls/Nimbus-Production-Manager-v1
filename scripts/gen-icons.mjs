/**
 * gen-icons.mjs
 *
 * Generates simple SVG app icons for the Nimbus 2026 PWA.
 * White background with a bold "N" letter in dark text (#1d1d1f).
 *
 * Usage: node scripts/gen-icons.mjs
 *
 * Outputs:
 *   public/icon-192.svg
 *   public/icon-512.svg
 *
 * Note: For actual PNG generation you would need a dependency like `sharp`
 * or `canvas`. This script produces SVG icons which modern browsers handle
 * fine as PWA icons (when served with the correct MIME type). If you need
 * true PNGs, install sharp and uncomment the PNG section below.
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");

function createSvgIcon(size) {
  const radius = Math.round(size * 0.125); // 12.5% corner radius
  const fontSize = Math.round(size * 0.625);
  const textY = Math.round(size * 0.667);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#ffffff"/>
  <text x="${size / 2}" y="${textY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="#1d1d1f">N</text>
</svg>`;
}

const sizes = [192, 512];

for (const size of sizes) {
  const svg = createSvgIcon(size);
  const filePath = resolve(publicDir, `icon-${size}.svg`);
  writeFileSync(filePath, svg, "utf-8");
  console.log(`Created ${filePath}`);
}

console.log("Done. SVG icons generated in public/.");
