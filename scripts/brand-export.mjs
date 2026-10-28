import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import config from '../branding/export-config.mjs';

const require = createRequire(import.meta.url);
// The optional path is useful for the bundled local runtime. CI uses devDependency sharp.
const sharp = require(process.env.BRAND_SHARP_PATH || 'sharp');
const root = fileURLToPath(new URL('../', import.meta.url));
const parts = ['s', 'ampersand', 'm'];
const hex = (value) => {
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`Invalid static brand colour: ${value}`);
  return value;
};

export function staticMonogramSvg(source, { smallSize = null } = {}) {
  const base = hex(config.foreground);
  const viewBox = source.match(/viewBox="([^"]+)"/);
  if (!viewBox) throw new Error('The monogram master needs a viewBox.');
  const [, , width] = viewBox[1].trim().split(/\s+/).map(Number);
  const stroke = smallSize ? width / (smallSize * (1 - config.favicon.paddingRatio * 2)) * config.favicon.hairlinePixels : 0;
  for (const part of parts) {
    if (!source.includes(`data-monogram-part="${part}"`)) throw new Error(`Missing master group: ${part}`);
  }
  const rules = parts.map((part) => {
    const colour = hex(config.parts[part] || base);
    const selectors = `[data-monogram-part="${part}"], [data-monogram-part="${part}"] path`;
    return `${selectors}{fill:${colour};stroke:${stroke ? colour : 'none'};stroke-width:${stroke};stroke-linejoin:round}`;
  }).join('');
  return source.replace(/currentColor/g, base).replace(/(<svg\b[^>]*>)/, `$1<style>${rules}</style>`);
}

export function makeIco(entries) {
  const header = Buffer.alloc(6 + entries.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = header.length;
  entries.forEach(({ size, png }, index) => {
    const directory = 6 + index * 16;
    header[directory] = size === 256 ? 0 : size;
    header[directory + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, directory + 4);
    header.writeUInt16LE(32, directory + 6);
    header.writeUInt32LE(png.length, directory + 8);
    header.writeUInt32LE(offset, directory + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...entries.map(({ png }) => png)]);
}

export async function exportBrandAssets() {
  const source = await fs.readFile(path.join(root, 'branding/monogram.svg'), 'utf8');
  if (/<(?:image|text|foreignObject)\b/i.test(source)) throw new Error('Monogram master must contain paths, not text or bitmap artwork.');
  const master = Buffer.from(staticMonogramSvg(source));
  const background = hex(config.background);
  const faviconEntries = [];
  for (const size of [16, 32]) {
    const padding = Math.max(1, Math.round(size * config.favicon.paddingRatio));
    const icon = await sharp(Buffer.from(staticMonogramSvg(source, { smallSize: size })))
      .resize(size - padding * 2, size - padding * 2, { fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
    const png = await sharp({ create: { width: size, height: size, channels: 4, background } })
      .composite([{ input: icon.data, left: Math.round((size - icon.info.width) / 2), top: Math.round((size - icon.info.height) / 2) }])
      .png().toBuffer();
    await fs.writeFile(path.join(root, `public/favicon-${size}.png`), png);
    faviconEntries.push({ size, png });
  }
  await fs.writeFile(path.join(root, 'public/favicon.ico'), makeIco(faviconEntries));
  // SVG favicon is self-contained and has its own colours/background, unlike the inline component.
  const iconInner = staticMonogramSvg(source).replace(/<\?xml[^>]*\?>/g, '').trim();
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="${background}"/><svg x="7" y="7" width="114" height="114"${iconInner.slice(iconInner.indexOf(' viewBox='))}</svg>`;
  await fs.writeFile(path.join(root, 'public/favicon.svg'), faviconSvg);

  const { width, height, monogram } = config.share;
  const mark = await sharp(master).resize(monogram.width, monogram.height, { fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
  // The alpha artwork preserves the existing calligraphy, date and their exact placement.
  // Only its ink colour is applied here; there are no fonts or browser rasterisation dependencies.
  const artwork = await sharp({ create: { width, height, channels: 4, background: hex(config.foreground) } })
    .composite([{ input: path.join(root, 'branding/share-announcement-art.png'), blend: 'dest-in' }])
    .png().toBuffer();
  const share = await sharp({ create: { width, height, channels: 3, background } })
    .composite([
      { input: artwork, left: 0, top: 0 },
      { input: mark.data, left: Math.round(monogram.left + (monogram.width - mark.info.width) / 2), top: Math.round(monogram.top + (monogram.height - mark.info.height) / 2) },
    ])
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' }).toBuffer();
  await fs.writeFile(path.join(root, 'public/simona-martin-wedding-1200x630.jpg'), share);
  const manifest = {
    source: 'branding/monogram.svg',
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    configuration: config,
    outputs: ['favicon.svg', 'favicon.ico', 'favicon-16.png', 'favicon-32.png', 'simona-martin-wedding-1200x630.jpg'],
  };
  await fs.writeFile(path.join(root, 'public/branding-assets.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('Brand assets exported: SVG/ICO, 16/32px PNG favicons and 1200×630 announcement.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await exportBrandAssets();
}
