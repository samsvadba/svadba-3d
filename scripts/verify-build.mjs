import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [source, redirect, app] = await Promise.all(['index-v3.html', 'dist/index.html', 'dist/index-v3.html'].map(file => readFile(new URL(file, root), 'utf8')));
const metadata = html => new Map((html.match(/<meta\b[^>]*>/gi) || []).flatMap(tag => {
  const key = tag.match(/\b(?:name|property)="([^"]+)"/i)?.[1];
  const value = tag.match(/\bcontent="([^"]*)"/i)?.[1];
  return key && /^(?:description|theme-color|og:|twitter:)/.test(key) ? [[key, value]] : [];
}));
const expected = metadata(source);
for (const required of ['description', 'og:title', 'og:description', 'og:image', 'og:url', 'twitter:card', 'twitter:image']) assert.ok(expected.has(required), `Missing ${required}`);
assert.deepEqual(metadata(redirect), expected, 'The short link must retain every current share field');
assert.deepEqual(metadata(app), expected, 'V3 must retain the same share metadata');
assert.equal(redirect.match(/<title>[^<]*<\/title>/)?.[0], source.match(/<title>[^<]*<\/title>/)?.[0]);
assert.match(redirect, /http-equiv="refresh" content="0;url=\.\/index-v3\.html"/);
assert.doesNotMatch(redirect, /<(?:script|canvas|video)\b/i, 'The short link must not launch a second app');
assert.match(app, /src="\/svadba-3d\/theme-v3\.js\?/);
for (const tag of redirect.match(/<(?:meta|link)\b[^>]*>/gi) || []) {
  const asset = tag.match(/(?:href|content)="https:\/\/samsvadba\.github\.io\/svadba-3d\/([^"?]+)(?:\?[^"']*)?"/)?.[1]
    || tag.match(/href="\/svadba-3d\/([^"?]+)"/)?.[1];
  if (asset && asset !== 'index-v3.html') await access(new URL(`dist/${asset}`, root));
}
await Promise.all(['dist/audio/shes-a-rainbow.mp3', 'dist/theme-v3.js'].map(file => access(new URL(file, root))));
console.log('Production artifact passed: matching social previews, short-link redirect, base path, icons, share image and audio.');
