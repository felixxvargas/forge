/**
 * Generates apple-touch-icon.png from the existing favicon.svg.
 * Run: node scripts/generate-icons.mjs
 * Requires: npm install --save-dev sharp
 */
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'favicon.svg');

if (!existsSync(svgPath)) {
  console.error('favicon.svg not found in public/');
  process.exit(1);
}

const svgBuffer = readFileSync(svgPath);

// 512x512 — Apple recommends this size; iOS downscales as needed.
await sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'));

console.log('✓ Generated public/apple-touch-icon.png (512×512)');
