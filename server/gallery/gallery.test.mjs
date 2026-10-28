import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { GalleryService } from './service.mjs';
import { GoogleDrive } from './drive.mjs';
import { createGalleryServer, requestIP } from './server.mjs';
import { APP_TAG, GalleryError, LIMITS, readConfig } from './config.mjs';
import { createDerivatives, sniffImage, validateImage } from './images.mjs';
import { MemoryDrive } from './test-support.mjs';
async function start(drive, overrides = {}) {
  const service = new GalleryService({ drive, publicUrl: 'http://127.0.0.1/api/gallery' });
  const config = { origins: ['https://samsvadba.github.io'], inviteKey: '', trustProxy: false, ...overrides };
  const server = createGalleryServer({ service, config });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  service.publicUrl = `${base}/api/gallery`;
  return { service, server, base, stop: () => new Promise(resolve => server.close(resolve)) };
}
const fixture = colour => sharp({ create: { width: 96, height: 64, channels: 3, background: colour } }).jpeg().toBuffer();
const headers = id => ({ Origin: 'https://samsvadba.github.io', 'Content-Type': 'image/jpeg', 'X-Upload-Id': id, 'X-File-Name': encodeURIComponent('Svadba – foto.jpg') });

test('HTTP multi-file storage, persisted reload, thumbnails, preview, dedupe and unsupported methods', async () => {
  const drive = new MemoryDrive(); let app = await start(drive);
  const first = await fixture('#334455'), second = await fixture('#aabbcc');
  const ids = [randomUUID(), randomUUID()];
  try {
    for (const [index, bytes] of [first, second].entries()) {
      const response = await fetch(`${app.base}/api/gallery/photos`, { method: 'POST', headers: headers(ids[index]), body: bytes });
      assert.equal(response.status, 201);
      const { photo } = await response.json(); assert.equal(photo.id, ids[index]);
      assert.equal(drive.files.size, (index + 1) * 3);
      const original = await drive.find(photo.id); assert.deepEqual(original.bytes, bytes);
      const thumb = await fetch(photo.thumbnailUrl); assert.equal(thumb.status, 200);
      assert.equal((await sharp(Buffer.from(await thumb.arrayBuffer())).metadata()).format, 'jpeg');
      assert.equal((await fetch(photo.displayUrl)).status, 200);
    }
    // Same UUID+file retry and same content+new UUID must not create additional originals.
    for (const id of [ids[0], randomUUID()]) assert.equal((await fetch(`${app.base}/api/gallery/photos`, { method: 'POST', headers: headers(id), body: first })).status, 201);
    assert.equal(drive.files.size, 6);
    assert.equal((await fetch(`${app.base}/api/gallery/photos`, { method: 'POST', headers: headers(ids[0]), body: second })).status, 409);
    await app.stop(); app = await start(drive);
    const page1 = await (await fetch(`${app.base}/api/gallery/photos`)).json(); assert.equal(page1.photos.length, 1); assert.ok(page1.nextCursor);
    const page2 = await (await fetch(`${app.base}/api/gallery/photos?cursor=${page1.nextCursor}`)).json(); assert.equal(page2.photos.length, 1); assert.equal(page2.nextCursor, null);
    assert.equal((await fetch(`${app.base}/api/gallery/photos/${ids[0]}/image`)).status, 200);
    assert.equal((await fetch(`${app.base}/api/gallery/photos/${ids[0]}`, { method: 'DELETE' })).status, 404);
  } finally { await app.stop(); }
});

test('partial storage failure stays invisible; same upload safely resumes after a new server instance', async () => {
  const drive = new MemoryDrive(), id = randomUUID(), bytes = await fixture('#bbccdd');
  drive.failRole = 'image'; let app = await start(drive);
  try {
    assert.equal((await fetch(`${app.base}/api/gallery/photos`, { method: 'POST', headers: headers(id), body: bytes })).status, 503);
    assert.equal((await app.service.list()).photos.length, 0); assert.equal(drive.files.size, 2);
    await app.stop(); drive.failRole = ''; app = await start(drive);
    assert.equal((await fetch(`${app.base}/api/gallery/photos`, { method: 'POST', headers: headers(id), body: bytes })).status, 201);
    assert.equal((await app.service.list()).photos.length, 1); assert.equal(drive.files.size, 3);
  } finally { await app.stop(); }
});

test('server verifies actual media, bounds files, rejects disallowed CORS and arbitrary media IDs', async () => {
  const app = await start(new MemoryDrive());
  try {
    const valid = await fixture('#000000'), id = randomUUID();
    assert.equal((await fetch(`${app.base}/api/gallery/photos`, { method: 'POST', headers: headers(id), body: '<svg><script/></svg>' })).status, 415);
    assert.equal((await fetch(`${app.base}/api/gallery/photos`, { method: 'POST', headers: { ...headers(id), 'Content-Type': 'image/png' }, body: valid })).status, 415);
    assert.equal((await fetch(`${app.base}/api/gallery/photos`, { method: 'POST', headers: headers(id), body: Buffer.alloc(LIMITS.maxFileBytes + 1) })).status, 413);
    assert.equal((await fetch(`${app.base}/api/gallery/photos`, { headers: { Origin: 'https://malicious.invalid' } })).status, 403);
    assert.equal((await fetch(`${app.base}/api/gallery/photos/raw-google-id/image`)).status, 404);
    const preflight = await fetch(`${app.base}/api/gallery/photos`, { method: 'OPTIONS', headers: { Origin: 'https://samsvadba.github.io' } });
    assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://samsvadba.github.io');
    assert.equal((await fetch(`${app.base}/health`)).status, 200);
  } finally { await app.stop(); }
});

test('optional invitation code is never a Google secret and public image URLs need no custom headers', async () => {
  const app = await start(new MemoryDrive(), { inviteKey: 'example-code' });
  try {
    assert.equal((await fetch(`${app.base}/api/gallery/photos`)).status, 401);
    assert.equal((await fetch(`${app.base}/api/gallery/photos`, { headers: { 'X-Gallery-Key': 'example-code' } })).status, 200);
  } finally { await app.stop(); }
});

test('image metadata limits, invalid containers and HEIC MIME variants', async () => {
  const oversized = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(createDerivatives(oversized, 'image/png'), error => error.code === 'IMAGE_DECODE_FAILED' || error.code === 'IMAGE_DIMENSIONS');
  const ftyp = Buffer.from('000000186674797068656963000000006d69663168656963', 'hex');
  assert.equal(validateImage(ftyp, 'image/heif').mime, 'image/heic');
  assert.equal(sniffImage(Buffer.from('00000018667479706d703432000000006d70343269736f6d', 'hex')), null);
  await assert.rejects(createDerivatives(ftyp, 'image/heic'), error => error.code === 'IMAGE_DECODE_FAILED');
});

test('Drive adapter always searches the one configured folder and rejects out-of-folder media', async () => {
  const requests = [];
  const drive = new GoogleDrive({ folderId: 'dedicated-folder', clientId: 'client', clientSecret: 'private', refreshToken: 'private' }, async (url, options) => {
    requests.push({ url, options });
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'test', scope: 'https://www.googleapis.com/auth/drive.file' });
    if (url.includes('/files?')) return Response.json({ files: [] });
    return Response.json({ id: 'unrelated', mimeType: 'image/jpeg', parents: ['outside-folder'], appProperties: { gallery: APP_TAG } });
  });
  await drive.list();
  assert.match(decodeURIComponent(requests[1].url), /dedicated-folder/);
  assert.equal(drive.belongs({ parents: ['outside-folder'], appProperties: { gallery: APP_TAG } }), false);
  assert.equal(drive.belongs({ parents: ['dedicated-folder'], appProperties: { gallery: APP_TAG }, trashed: true }), false);
  assert.equal(requests[1].options.headers.Authorization, 'Bearer test');
  assert.throws(() => readConfig({}), /Missing server/);
});

test('trusted proxy count ignores spoofed leftmost addresses and defaults to socket IP', () => {
  const request = { socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': '203.0.113.99, 192.0.2.25, 10.1.1.1' } };
  assert.equal(requestIP(request), '127.0.0.1');
  assert.equal(requestIP(request, 1), '10.1.1.1');
  assert.equal(requestIP(request, 2), '192.0.2.25');
  request.headers['x-forwarded-for'] = 'untrusted'; assert.equal(requestIP(request, 1), '127.0.0.1');
});

test('larger files use the official resumable upload and never follow a foreign session URL', async () => {
  const calls = [], content = Buffer.alloc(6 * 1024 * 1024, 7);
  const config = { folderId: 'dedicated-folder', clientId: 'client', clientSecret: 'private', refreshToken: 'private' };
  let foreign = false;
  const drive = new GoogleDrive(config, async (url, options) => {
    calls.push({ url, options });
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'test' });
    if (options.method === 'POST') return new Response(null, { headers: { Location: foreign ? 'https://foreign.invalid/upload?upload_id=x' : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=x' } });
    return Response.json({ id: 'preallocated', appProperties: { state: 'pending' } });
  });
  const result = await drive.createFile('preallocated', content, 'large.jpg', 'image/jpeg', { role: 'original', photoId: randomUUID(), sha256: 'hash' });
  assert.equal(result.id, 'preallocated');
  assert.match(calls[1].url, /uploadType=resumable/); assert.equal(calls[2].options.method, 'PUT');
  assert.deepEqual(calls[2].options.body, content); assert.equal(calls[2].options.headers['Content-Length'], String(content.length));
  foreign = true;
  await assert.rejects(drive.createFile('other', content, 'large.jpg', 'image/jpeg', {}), error => error.code === 'STORAGE_UNAVAILABLE');
  assert.equal(calls.some(call => call.url.startsWith('https://foreign.invalid')), false);
});

test('actual HEIC decodes to JPEG preview without modifying original', { skip: !process.env.HEIC_TEST_FILE }, async () => {
  const input = await readFile(process.env.HEIC_TEST_FILE), copy = Buffer.from(input);
  const type = validateImage(input, 'image/heic');
  const result = await createDerivatives(input, type.mime);
  assert.equal((await sharp(result.preview).metadata()).format, 'jpeg');
  assert.ok(result.width > 0 && result.height > 0); assert.deepEqual(input, copy);
});
