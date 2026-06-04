/**
 * Generate PWA PNG icons from the SVG favicon using sharp.
 * Run with: node generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ICONS_DIR = path.join(__dirname, 'public', 'icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// High-quality SVG icon template
const createSVG = (size, maskable = false) => {
  const cornerRadius = maskable ? 0 : Math.floor(size * 0.22);
  // For maskable icons, the safe zone is the inner 80%, so scale the icon path accordingly
  const iconScale = size / 48;
  const iconOffset = size * 0.25;

  return Buffer.from(`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${size}" y2="${size}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#10B981" />
      <stop offset="1" stop-color="#059669" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg)" />
  <g transform="translate(${iconOffset}, ${iconOffset}) scale(${iconScale})">
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" 
      stroke="white" 
      stroke-width="2" 
      stroke-linecap="round" 
      stroke-linejoin="round" 
      fill="none" />
  </g>
</svg>`);
};

async function generateIcons() {
  // Generate standard PNG icons
  for (const size of SIZES) {
    const svg = createSVG(size, false);
    await sharp(svg)
      .resize(size, size)
      .png({ quality: 100 })
      .toFile(path.join(ICONS_DIR, `icon-${size}x${size}.png`));
    console.log(`✓ Generated icon-${size}x${size}.png`);
  }

  // Generate maskable PNG icons (for Android adaptive icons)
  for (const size of [192, 512]) {
    const svg = createSVG(size, true);
    await sharp(svg)
      .resize(size, size)
      .png({ quality: 100 })
      .toFile(path.join(ICONS_DIR, `icon-maskable-${size}x${size}.png`));
    console.log(`✓ Generated icon-maskable-${size}x${size}.png (maskable)`);
  }

  // Update manifest.json to use PNG icons
  const manifestPath = path.join(__dirname, 'public', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  manifest.icons = SIZES.map(size => ({
    src: `/icons/icon-${size}x${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    purpose: 'any'
  }));

  manifest.icons.push({
    src: '/icons/icon-maskable-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'maskable'
  });
  manifest.icons.push({
    src: '/icons/icon-maskable-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable'
  });

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('\n✓ Updated manifest.json with PNG icon paths');
  console.log('📱 All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
