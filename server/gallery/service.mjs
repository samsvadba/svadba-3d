import { createHash } from 'node:crypto';
import { GalleryError, UUID } from './config.mjs';
import { createDerivatives, safeName, validateImage } from './images.mjs';

export class GalleryService {
  constructor({ drive, publicUrl, derive = createDerivatives }) {
    this.drive = drive; this.publicUrl = publicUrl; this.derive = derive; this.uploads = new Map(); this.busy = 0;
  }
  photo(file) {
    const properties = file.appProperties;
    if (!UUID.test(properties?.photoId || '') || properties.state !== 'ready') throw new GalleryError(503, 'STORAGE_METADATA_INVALID');
    const base = `${this.publicUrl}/photos/${properties.photoId}`;
    return { id: properties.photoId, name: file.name, createdAt: file.createdTime, width: Number(properties.width), height: Number(properties.height), thumbnailUrl: `${base}/thumbnail`, displayUrl: `${base}/image` };
  }
  async list(cursor) {
    if (cursor && (cursor.length > 4096 || /[\u0000-\u001f\u007f]/.test(cursor))) throw new GalleryError(400, 'INVALID_CURSOR');
    const result = await this.drive.list(cursor);
    return { photos: result.files.map(file => this.photo(file)), nextCursor: result.nextPageToken || null };
  }
  async upload(bytes, { uploadId, filename, contentType }) {
    if (!UUID.test(uploadId || '')) throw new GalleryError(400, 'INVALID_UPLOAD_ID');
    const type = validateImage(bytes, contentType), name = safeName(filename, type.extension);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (this.uploads.has(uploadId)) {
      const pending = this.uploads.get(uploadId);
      if (pending.sha256 !== sha256) throw new GalleryError(409, 'UPLOAD_CONFLICT');
      return pending.promise;
    }
    if (this.busy >= 1) throw new GalleryError(429, 'SERVER_BUSY');
    this.busy++;
    const promise = this.save(bytes, { uploadId, name, sha256, type }).finally(() => { this.uploads.delete(uploadId); this.busy--; });
    this.uploads.set(uploadId, { promise, sha256 });
    return promise;
  }
  async save(bytes, { uploadId, name, sha256, type }) {
    let original = await this.drive.find(uploadId);
    if (original && original.appProperties.sha256 !== sha256) throw new GalleryError(409, 'UPLOAD_CONFLICT');
    if (original?.appProperties.state === 'ready') return this.photo(original);
    const duplicate = !original && await this.drive.byDigest(sha256);
    if (duplicate) return this.photo(duplicate);
    const images = await this.derive(bytes, type.mime);
    if (!original) {
      const [originalId, thumbnailId, previewId] = await this.drive.allocate();
      const properties = { photoId: uploadId, sha256, state: 'pending', role: 'original', thumbnailId, previewId, width: String(images.width), height: String(images.height) };
      original = await this.drive.createFile(originalId, bytes, name, type.mime, properties);
    }
    const properties = { photoId: uploadId, sha256, state: 'derived' };
    await this.drive.createFile(original.appProperties.thumbnailId, images.thumbnail, `${uploadId}-thumbnail.jpg`, 'image/jpeg', { ...properties, role: 'thumbnail' });
    await this.drive.createFile(original.appProperties.previewId, images.preview, `${uploadId}-preview.jpg`, 'image/jpeg', { ...properties, role: 'image' });
    // The original is the durable commit record. Incomplete uploads never appear in the gallery.
    const committed = await this.drive.commit(original);
    return this.photo(committed);
  }
}
