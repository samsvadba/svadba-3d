import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the URL and upload-policy functions that the actual gallery uses.
// No DOM emulation or network request is needed for these input-boundary checks.
const source = await readFile(new URL('./gallery-v3.js', import.meta.url), 'utf8');
const functions = source.slice(source.indexOf('export function validateApiBase')).replaceAll('export function ', 'function ');
const context = vm.createContext({ URL });
vm.runInContext(`${functions}\nthis.policy={validateApiBase,validateAssetUrl,uploadMime,isAcceptedPhoto,uploadErrorKey};`, context);
const { validateApiBase, validateAssetUrl, uploadMime, isAcceptedPhoto, uploadErrorKey } = context.policy;

assert.equal(validateApiBase(null), null);
assert.equal(validateApiBase('https://gallery.example/api/gallery/'), 'https://gallery.example/api/gallery');
assert.equal(validateApiBase('http://localhost:3001/api/gallery'), 'http://localhost:3001/api/gallery');
for (const unsafe of ['javascript:alert(1)', 'data:text/html,test', 'http://gallery.example/api', 'https://user:password@example.com/api', 'https://example.com/api?key=secret']) {
  assert.equal(validateApiBase(unsafe), null, unsafe);
}
assert.equal(validateAssetUrl('/api/gallery/photos/abc/image', 'https://gallery.example/api/gallery'), 'https://gallery.example/api/gallery/photos/abc/image');
assert.equal(validateAssetUrl('javascript:alert(1)', 'https://gallery.example/api/gallery'), null);
assert.equal(validateAssetUrl('http://insecure.example/photo.jpg', 'https://gallery.example/api/gallery'), null);
assert.equal(validateAssetUrl('https://user:password@example.com/photo.jpg', 'https://gallery.example/api/gallery'), null);
assert.equal(validateAssetUrl('https://other.example/api/gallery/photos/abc/image', 'https://gallery.example/api/gallery'), null);
assert.equal(validateAssetUrl('/account', 'https://gallery.example/api/gallery'), null);
assert.equal(uploadMime({ name: 'IMG_001.HEIC', type: '' }), 'image/heic');
assert.equal(isAcceptedPhoto({ name: 'IMG_001.HEIC', type: '' }), true);
assert.equal(isAcceptedPhoto({ name: 'IMG_001.jpg', type: 'application/pdf' }), false);
assert.equal(isAcceptedPhoto({ name: 'photo.svg', type: 'image/svg+xml' }), false);
assert.equal(isAcceptedPhoto({ name: 'photo.jpg', type: 'image/jpeg' }), true);
assert.equal(uploadErrorKey({ code: 'NETWORK' }), 'network');
assert.equal(uploadErrorKey({ status: 429 }), 'rate');
assert.equal(uploadErrorKey({ status: 413 }), 'size');
assert.equal(uploadErrorKey({ status: 415 }), 'type');
assert.equal(uploadErrorKey({ status: 422 }), 'decode');
assert.equal(uploadErrorKey({ status: 403 }), 'denied');
assert.equal(uploadErrorKey({ code: 'DRIVE_QUOTA' }), 'storage');
assert.equal(uploadErrorKey({ code: 'Internal filesystem path that must not reach UI' }), 'failed');
console.log('Gallery input policy passed: secure URLs, HEIC identification, unsupported uploads and localized errors.');
