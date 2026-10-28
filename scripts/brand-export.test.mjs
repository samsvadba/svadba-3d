import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import config from '../branding/export-config.mjs';
import { staticMonogramSvg } from './brand-export.mjs';

const require = createRequire(import.meta.url);
const sharp = require(process.env.BRAND_SHARP_PATH || 'sharp');
const root = fileURLToPath(new URL('../', import.meta.url));
const source = await fs.readFile(path.join(root, 'branding/monogram.svg'), 'utf8');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'public/branding-assets.json'), 'utf8'));
assert.equal(manifest.sourceSha256, createHash('sha256').update(source).digest('hex'), 'Exports must match the authoritative vector.');
assert(!/<(?:text|image|foreignObject)\b/i.test(source));
for (const part of ['s', 'ampersand', 'm']) assert(source.includes(`data-monogram-part="${part}"`));

const base = staticMonogramSvg(source);
assert(!base.includes('currentColor'), 'Static export owns its colour.');
config.parts.ampersand = '#884422';
assert(staticMonogramSvg(source).includes('[data-monogram-part="ampersand"] path{fill:#884422;'));
config.parts.ampersand = null;
assert.equal(staticMonogramSvg(source), base, 'Clearing the part colour restores monochrome.');

for (const size of [16, 32]) {
  const { data, info } = await sharp(path.join(root, `public/favicon-${size}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, size);
  assert.equal(info.height, size);
  const inkPixels = [...Array(size * size).keys()].filter((i) => data[i * 4] < 180).length;
  assert(inkPixels > size * size * 0.06 && inkPixels < size * size * 0.55, `${size}px mark remains present and airy.`);
}
const ico = await fs.readFile(path.join(root, 'public/favicon.ico'));
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 2);
assert.equal(ico[6], 16);
assert.equal(ico[22], 32);
const faviconSvg = await sharp(path.join(root, 'public/favicon.svg')).resize(32, 32).png().toBuffer();
assert(faviconSvg.length > 100);
const share = await sharp(path.join(root, 'public/simona-martin-wedding-1200x630.jpg')).metadata();
assert.equal(share.width, 1200);
assert.equal(share.height, 630);
const { data: vectorPixels, info: vectorInfo } = await sharp(Buffer.from(source.replace(/currentColor/g, config.foreground))).resize(300).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (const index of [0, vectorInfo.width - 1, (vectorInfo.height - 1) * vectorInfo.width, vectorInfo.width * vectorInfo.height - 1]) {
  assert.equal(vectorPixels[index * 4 + 3], 0, 'Master logo keeps transparent corner margins.');
}
console.log('Brand export checks passed: one path-only source, independent colour/reset, transparent master, 16/32px favicons, ICO and 1200×630 social image.');
