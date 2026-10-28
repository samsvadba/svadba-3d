import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderMonogram } from './monogram-component.js';

const source = await readFile(new URL('./monogram.svg', import.meta.url), 'utf8');
assert.ok(!/<(?:text|image|foreignObject)\b|data:image|base64|font-family/i.test(source), 'vector paths only');
for (const part of ['s', 'ampersand', 'm']) {
  assert.match(source, new RegExp(`<g[^>]+data-monogram-part="${part}"`));
}
assert.ok((source.match(/<path\b/g) || []).length >= 3);
assert.match(source, /viewBox="[^"]+"/);
const first = renderMonogram(source);
const second = renderMonogram(source, {label:'Simona & Martin',width:146});
assert.match(first, /aria-hidden="true"/);
assert.match(second, /role="img" aria-label="Simona &amp; Martin"/);
assert.match(second, /--monogram-width:146px/);
assert.match(first, /preserveAspectRatio="xMidYMid meet"/);
const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set([...ids(first),...ids(second)]).size,ids(first).length+ids(second).length);
assert.doesNotMatch(renderMonogram(source,{width:'10px;display:none'}), /style=/);
const css = await readFile(new URL('./monogram.css',import.meta.url),'utf8');
for (const name of ['color','s-color','ampersand-color','m-color']) assert.ok(css.includes(`--monogram-${name}`));
assert.match(css,/height: auto/);
const html = await readFile(new URL('../index-v3.html',import.meta.url),'utf8');
assert.equal((html.match(/property="og:image"/g)||[]).length,1);
assert.ok(html.includes('favicon.svg') && html.includes('favicon-16.png') && html.includes('favicon-32.png'));
console.log('Approved monogram: path-only source, named parts, unique accessible instances, safe sizing and metadata passed.');
