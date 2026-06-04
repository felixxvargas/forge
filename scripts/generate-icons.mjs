/**
 * Generates web and Android icons from public/favicon.svg.
 * Run: node scripts/generate-icons.mjs
 * Requires: npm install --save-dev sharp
 *
 * Outputs:
 *   public/apple-touch-icon.png          (512×512, web/iOS)
 *   android/.../mipmap-{density}/ic_launcher.png           (legacy icon, all densities)
 *   android/.../mipmap-{density}/ic_launcher_round.png     (legacy round icon, all densities)
 *   android/.../mipmap-{density}/ic_launcher_foreground.png (adaptive foreground, all densities)
 */
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root      = join(__dirname, '..');
const publicDir = join(root, 'public');
const svgPath   = join(publicDir, 'favicon.svg');
const resDir    = join(root, 'android', 'app', 'src', 'main', 'res');

if (!existsSync(svgPath)) {
  console.error('favicon.svg not found in public/');
  process.exit(1);
}

const svgBuffer = readFileSync(svgPath);

// Remove rounded corners for the adaptive foreground — the launcher's clip
// shape controls the final outline; baking in rx causes double-rounding.
const svgNoRx = Buffer.from(svgBuffer.toString().replace(/rx="[^"]*"/g, 'rx="0"'));

// ── Web / iOS ────────────────────────────────────────────────────────────────
await sharp(svgBuffer).resize(512, 512).png()
  .toFile(join(publicDir, 'apple-touch-icon.png'));
console.log('✓  public/apple-touch-icon.png (512×512)');

// ── Android density buckets ──────────────────────────────────────────────────
// Legacy icon sizes (ic_launcher.png, ic_launcher_round.png)
const LEGACY = [
  { bucket: 'mipmap-mdpi',    size: 48  },
  { bucket: 'mipmap-hdpi',    size: 72  },
  { bucket: 'mipmap-xhdpi',   size: 96  },
  { bucket: 'mipmap-xxhdpi',  size: 144 },
  { bucket: 'mipmap-xxxhdpi', size: 192 },
];

// Adaptive foreground sizes (108dp × density scale)
const ADAPTIVE = [
  { bucket: 'mipmap-mdpi',    size: 108 },
  { bucket: 'mipmap-hdpi',    size: 162 },
  { bucket: 'mipmap-xhdpi',   size: 216 },
  { bucket: 'mipmap-xxhdpi',  size: 324 },
  { bucket: 'mipmap-xxxhdpi', size: 432 },
];

for (const { bucket, size } of LEGACY) {
  const dir = join(resDir, bucket);

  await sharp(svgBuffer).resize(size, size).png()
    .toFile(join(dir, 'ic_launcher.png'));
  await sharp(svgBuffer).resize(size, size).png()
    .toFile(join(dir, 'ic_launcher_round.png'));

  console.log(`✓  ${bucket}/ic_launcher.png + ic_launcher_round.png (${size}×${size})`);
}

for (const { bucket, size } of ADAPTIVE) {
  const dir = join(resDir, bucket);

  await sharp(svgNoRx).resize(size, size).png()
    .toFile(join(dir, 'ic_launcher_foreground.png'));

  console.log(`✓  ${bucket}/ic_launcher_foreground.png (${size}×${size})`);
}

console.log('\nAll icons generated. Run  npm run build:android  to sync to Capacitor.');
