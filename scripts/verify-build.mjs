import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [source, shortEntry, app] = await Promise.all(['index-v3.html', 'dist/index.html', 'dist/index-v3.html'].map(file => readFile(new URL(file, root), 'utf8')));
const metadata = html => new Map((html.match(/<meta\b[^>]*>/gi) || []).flatMap(tag => {
  const key = tag.match(/\b(?:name|property)="([^"]+)"/i)?.[1];
  const value = tag.match(/\bcontent="([^"]*)"/i)?.[1];
  return key && /^(?:description|theme-color|og:|twitter:)/.test(key) ? [[key, value]] : [];
}));
const expected = metadata(source);
for (const required of ['description', 'og:title', 'og:description', 'og:image', 'og:url', 'twitter:card', 'twitter:image']) assert.ok(expected.has(required), `Missing ${required}`);
assert.equal(shortEntry, app, 'The short link must serve the same built application directly');
assert.deepEqual(metadata(app), expected, 'V3 must retain the same share metadata');
assert.equal(app.match(/<title>[^<]*<\/title>/)?.[0], source.match(/<title>[^<]*<\/title>/)?.[0]);
assert.equal(app.match(/<link rel="canonical" [^>]+>/)?.[0], source.match(/<link rel="canonical" [^>]+>/)?.[0]);
assert.doesNotMatch(shortEntry, /<meta\b[^>]*http-equiv="refresh"/i, 'The short link must not redirect');
assert.match(shortEntry, /<script\b[^>]*type="module"[^>]*src="\/svadba-3d\/assets\//);
assert.match(app, /src="\/svadba-3d\/theme-v3\.js\?/);
for (const tag of app.match(/<(?:meta|link)\b[^>]*>/gi) || []) {
  const asset = tag.match(/(?:href|content)="https:\/\/samsvadba\.github\.io\/svadba-3d\/([^"?]+)(?:\?[^"']*)?"/)?.[1]
    || tag.match(/href="\/svadba-3d\/([^"?]+)"/)?.[1];
  if (asset && asset !== 'index-v3.html') await access(new URL(`dist/${asset}`, root));
}
await Promise.all(['dist/audio/shes-a-rainbow.mp3', 'dist/theme-v3.js'].map(file => access(new URL(file, root))));
console.log('Production artifact passed: direct short-link entry, matching social previews, base path, icons, share image and audio.');
