import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { GoogleDrive } from './drive.mjs';
import { GalleryService } from './service.mjs';
import { createGalleryServer } from './server.mjs';
import { readConfig } from './config.mjs';

// Intentionally opt-in: this creates TWO clearly named files in an isolated owner-authorized test folder.
if (process.env.GALLERY_TEST_CONFIRM !== 'isolated' || !process.env.GALLERY_TEST_FOLDER_ID || process.env.GALLERY_TEST_FOLDER_ID === process.env.GOOGLE_DRIVE_FOLDER_ID) {
  throw new Error('Create a separate marked test folder with setup-google.mjs; set GALLERY_TEST_CONFIRM=isolated and its GALLERY_TEST_FOLDER_ID. Never use the production folder.');
}
const config = readConfig({ ...process.env, GOOGLE_DRIVE_FOLDER_ID: process.env.GALLERY_TEST_FOLDER_ID, PUBLIC_API_URL: 'http://127.0.0.1/api/gallery' });
const drive = new GoogleDrive(config); await drive.validateFolder();
let server;
async function start() {
  const service = new GalleryService({ drive: new GoogleDrive(config), publicUrl: config.publicUrl });
  server = createGalleryServer({ config, service });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/gallery`; service.publicUrl = base; return base;
}
const stop = () => new Promise(resolve => server.close(resolve));
let base = await start(); const ids = [];
try {
  for (const background of ['#352644', '#876632']) {
    const id = randomUUID(); ids.push(id);
    const image = await sharp({ create: { width: 48, height: 32, channels: 3, background } }).jpeg().toBuffer();
    const headers = { 'Content-Type': 'image/jpeg', 'X-Upload-Id': id, 'X-File-Name': `TEST-GALLERY-${id}.jpg` };
    if (config.inviteKey) headers['X-Gallery-Key'] = config.inviteKey;
    const response = await fetch(`${base}/photos`, { method: 'POST', headers, body: image }); assert.equal(response.status, 201);
    const { photo } = await response.json(); assert.equal(photo.id, id);
    assert.equal((await fetch(photo.thumbnailUrl)).status, 200); assert.equal((await fetch(photo.displayUrl)).status, 200);
  }
  await stop(); base = await start();
  const restored = new Set(); let cursor;
  do {
    const headers = config.inviteKey ? { 'X-Gallery-Key': config.inviteKey } : {};
    const response = await fetch(`${base}/photos${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, { headers });
    assert.equal(response.status, 200);
    const page = await response.json();
    for (const photo of page.photos) restored.add(photo.id);
    cursor = page.nextCursor;
  } while (cursor);
  for (const id of ids) assert.equal(restored.has(id), true, 'Uploaded photo must remain in the persisted gallery list after server recreation.');
  for (const id of ids) assert.equal((await fetch(`${base}/photos/${id}/image`)).status, 200);
  const invalid = await fetch(`${base}/photos`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Upload-Id': randomUUID(), ...(config.inviteKey ? { 'X-Gallery-Key': config.inviteKey } : {}) }, body: 'invalid image' });
  assert.equal(invalid.status, 415);
  console.log('Live Drive upload, media persistence after new server, and invalid-file checks passed. Delete TEST-GALLERY originals and their UUID derivatives manually from the TEST folder.');
} finally { await stop(); }
