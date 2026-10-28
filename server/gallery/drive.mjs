import { randomUUID } from 'node:crypto';
import { APP_TAG, GalleryError, SCOPE } from './config.mjs';

const API = 'https://www.googleapis.com/drive/v3';
const FIELDS = 'id,name,mimeType,parents,size,createdTime,appProperties,trashed';
const escapeQuery = value => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const prop = (key, value) => `appProperties has { key='${escapeQuery(key)}' and value='${escapeQuery(value)}' }`;

export class GoogleDrive {
  constructor(config, transport = fetch) {
    this.config = config; this.fetch = transport; this.accessToken = ''; this.expires = 0; this.refreshing = null;
  }
  async token() {
    if (this.accessToken && Date.now() < this.expires - 60_000) return this.accessToken;
    if (!this.refreshing) this.refreshing = (async () => {
      const response = await this.fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: this.config.clientId, client_secret: this.config.clientSecret, refresh_token: this.config.refreshToken, grant_type: 'refresh_token' }),
        signal: AbortSignal.timeout(15_000), redirect: 'error'
      });
      const data = await response.json();
      if (!response.ok || !data.access_token) throw new GalleryError(503, 'STORAGE_AUTH_REQUIRED');
      if (data.scope && data.scope.split(' ').some(scope => scope !== SCOPE)) throw new GalleryError(503, 'STORAGE_SCOPE_TOO_BROAD');
      this.accessToken = data.access_token; this.expires = Date.now() + Number(data.expires_in || 3600) * 1000;
      return this.accessToken;
    })().finally(() => { this.refreshing = null; });
    return this.refreshing;
  }
  async request(path, options = {}, upload = false) {
    const base = upload ? 'https://www.googleapis.com/upload/drive/v3' : API;
    const response = await this.fetch(`${base}${path}`, {
      ...options, headers: { ...options.headers, Authorization: `Bearer ${await this.token()}` },
      signal: AbortSignal.timeout(60_000), redirect: 'error'
    });
    if (!response.ok) {
      if (response.status === 404) throw new GalleryError(404, 'PHOTO_NOT_FOUND');
      if (response.status === 409) throw new GalleryError(409, 'STORAGE_FILE_EXISTS');
      throw new GalleryError(503, response.status === 401 || response.status === 403 ? 'STORAGE_AUTH_REQUIRED' : 'STORAGE_UNAVAILABLE');
    }
    return response;
  }
  rootQuery() { return `'${escapeQuery(this.config.folderId)}' in parents and trashed=false and ${prop('gallery', APP_TAG)}`; }
  async validateFolder() {
    const response = await this.request(`/files/${encodeURIComponent(this.config.folderId)}?fields=id,mimeType,trashed,appProperties,permissions(type,role)`);
    const folder = await response.json();
    if (folder.trashed || folder.mimeType !== 'application/vnd.google-apps.folder' || folder.appProperties?.gallery !== APP_TAG) throw new GalleryError(503, 'STORAGE_FOLDER_INVALID');
    if ((folder.permissions || []).some(permission => ['anyone', 'domain'].includes(permission.type))) throw new GalleryError(503, 'STORAGE_FOLDER_NOT_PRIVATE');
  }
  async query(extra, pageToken, pageSize = 36) {
    const params = new URLSearchParams({ q: `${this.rootQuery()} and ${extra}`, fields: `nextPageToken,files(${FIELDS})`, pageSize: String(pageSize), orderBy: 'createdTime desc' });
    if (pageToken) params.set('pageToken', pageToken);
    return (await this.request(`/files?${params}`)).json();
  }
  async list(cursor) { return this.query(`${prop('role', 'original')} and ${prop('state', 'ready')}`, cursor); }
  async find(photoId) { return (await this.query(`${prop('role', 'original')} and ${prop('photoId', photoId)}`, null, 2)).files[0] || null; }
  async byDigest(sha) { return (await this.query(`${prop('role', 'original')} and ${prop('state', 'ready')} and ${prop('sha256', sha)}`, null, 1)).files[0] || null; }
  async allocate() { return (await (await this.request('/files/generateIds?count=3&space=drive&type=files')).json()).ids; }
  async metadata(id) { return (await this.request(`/files/${encodeURIComponent(id)}?fields=${FIELDS}`)).json(); }
  async createFile(id, bytes, name, mimeType, appProperties) {
    const boundary = `gallery_${randomUUID().replaceAll('-', '')}`;
    const metadata = { id, name, mimeType, parents: [this.config.folderId], appProperties: { gallery: APP_TAG, ...appProperties } };
    try {
      if (bytes.length > 5 * 1024 * 1024) return await this.createResumable(metadata, bytes);
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
        bytes, Buffer.from(`\r\n--${boundary}--\r\n`)
      ]);
      return await (await this.request(`/files?uploadType=multipart&fields=${FIELDS}`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body }, true)).json();
    } catch (error) {
      // Preallocated Drive IDs make a retry safe even if the previous response was lost.
      if (error.code !== 'STORAGE_FILE_EXISTS') throw error;
      const existing = await this.metadata(id);
      if (!this.belongs(existing) || existing.appProperties.photoId !== appProperties.photoId || existing.appProperties.sha256 !== appProperties.sha256 || existing.appProperties.role !== appProperties.role) throw new GalleryError(409, 'UPLOAD_CONFLICT');
      return existing;
    }
  }
  async createResumable(metadata, bytes) {
    const initialized = await this.request(`/files?uploadType=resumable&fields=${FIELDS}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': metadata.mimeType, 'X-Upload-Content-Length': String(bytes.length) }, body: JSON.stringify(metadata)
    }, true);
    let session;
    try { session = new URL(initialized.headers.get('location')); } catch { throw new GalleryError(503, 'STORAGE_UNAVAILABLE'); }
    // A session URL is accepted only from the fixed Google upload origin/path.
    if (session.origin !== 'https://www.googleapis.com' || session.pathname !== '/upload/drive/v3/files' || session.username || session.password || !session.searchParams.has('upload_id')) throw new GalleryError(503, 'STORAGE_UNAVAILABLE');
    return (await this.request(`/files${session.search}`, {
      method: 'PUT', headers: { 'Content-Type': metadata.mimeType, 'Content-Length': String(bytes.length), 'Content-Range': `bytes 0-${bytes.length - 1}/${bytes.length}` }, body: bytes
    }, true)).json();
  }
  belongs(file) { return !file.trashed && file.parents?.includes(this.config.folderId) && file.appProperties?.gallery === APP_TAG; }
  async commit(file) {
    return (await this.request(`/files/${encodeURIComponent(file.id)}?fields=${FIELDS}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appProperties: { ...file.appProperties, state: 'ready' } })
    })).json();
  }
  async readDerivative(photoId, kind) {
    const original = await this.find(photoId);
    if (!original || !this.belongs(original) || original.appProperties.state !== 'ready') throw new GalleryError(404, 'PHOTO_NOT_FOUND');
    const fileId = original.appProperties[kind === 'thumbnail' ? 'thumbnailId' : 'previewId'];
    if (!/^[A-Za-z0-9_-]+$/.test(fileId || '')) throw new GalleryError(404, 'PHOTO_NOT_FOUND');
    const file = await this.metadata(fileId);
    if (!this.belongs(file) || file.mimeType !== 'image/jpeg' || file.appProperties.photoId !== photoId || file.appProperties.role !== kind || Number(file.size) > 8 * 1024 * 1024) throw new GalleryError(404, 'PHOTO_NOT_FOUND');
    return Buffer.from(await (await this.request(`/files/${encodeURIComponent(fileId)}?alt=media`)).arrayBuffer());
  }
}
