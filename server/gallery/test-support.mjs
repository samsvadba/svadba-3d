import { randomUUID } from 'node:crypto';
import { APP_TAG, GalleryError } from './config.mjs';

// Test double only. The production server never imports this module.
export class MemoryDrive {
  constructor() { this.files = new Map(); this.failRole = ''; }
  async allocate() { return [randomUUID(), randomUUID(), randomUUID()]; }
  async find(id) { return [...this.files.values()].find(file => file.appProperties.role === 'original' && file.appProperties.photoId === id) || null; }
  async byDigest(sha) { return [...this.files.values()].find(file => file.appProperties.role === 'original' && file.appProperties.state === 'ready' && file.appProperties.sha256 === sha) || null; }
  async createFile(id, bytes, name, mimeType, appProperties) {
    if (appProperties.role === this.failRole) throw new GalleryError(503, 'STORAGE_UNAVAILABLE');
    if (this.files.has(id)) return this.files.get(id);
    const file = { id, name, mimeType, createdTime: new Date().toISOString(), bytes: Buffer.from(bytes), appProperties: { gallery: APP_TAG, ...appProperties } };
    this.files.set(id, file); return file;
  }
  async commit(file) { file.appProperties.state = 'ready'; return file; }
  async list(cursor) {
    const all = [...this.files.values()].filter(file => file.appProperties.role === 'original' && file.appProperties.state === 'ready');
    const offset = Number(cursor || 0), files = all.slice(offset, offset + 1);
    return { files, nextPageToken: offset + 1 < all.length ? String(offset + 1) : null };
  }
  async readDerivative(id, kind) {
    const original = await this.find(id);
    if (!original || original.appProperties.state !== 'ready') throw new GalleryError(404, 'PHOTO_NOT_FOUND');
    return this.files.get(original.appProperties[kind === 'thumbnail' ? 'thumbnailId' : 'previewId']).bytes;
  }
}
