export const LIMITS = Object.freeze({ maxFileBytes: 20 * 1024 * 1024, maxPixels: 50_000_000, maxBatchFiles: 20 });
export const TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);
export const SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const APP_TAG = 'simona-martin-gallery-v1';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class GalleryError extends Error {
  constructor(status, code, message = code) { super(message); this.status = status; this.code = code; }
}
export function readConfig(env = process.env) {
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_DRIVE_FOLDER_ID', 'PUBLIC_API_URL', 'ALLOWED_ORIGINS'];
  const missing = required.filter(key => !env[key]);
  if (missing.length) throw new Error(`Missing server secrets/config: ${missing.join(', ')}`);
  if (!/^[A-Za-z0-9_-]{10,160}$/.test(env.GOOGLE_DRIVE_FOLDER_ID)) throw new Error('Invalid GOOGLE_DRIVE_FOLDER_ID');
  const publicUrl = new URL(env.PUBLIC_API_URL);
  const local = ['127.0.0.1', 'localhost'].includes(publicUrl.hostname);
  if (publicUrl.protocol !== 'https:' && !(local && publicUrl.protocol === 'http:')) throw new Error('PUBLIC_API_URL must use HTTPS');
  if (publicUrl.pathname !== '/api/gallery' || publicUrl.search || publicUrl.hash || publicUrl.username || publicUrl.password) throw new Error('PUBLIC_API_URL must end with /api/gallery');
  const origins = env.ALLOWED_ORIGINS.split(',').map(value => value.trim()).filter(Boolean);
  const proxyHops = Number(env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 8) throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 8');
  for (const origin of origins) {
    const url = new URL(origin);
    if (url.origin !== origin || (url.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(url.hostname))) throw new Error('Invalid allowed origin');
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, refreshToken: env.GOOGLE_REFRESH_TOKEN,
    folderId: env.GOOGLE_DRIVE_FOLDER_ID, publicUrl: publicUrl.href.replace(/\/$/, ''), origins,
    inviteKey: env.GALLERY_INVITE_KEY || '', port: Number(env.PORT || 8080), host: env.HOST || '0.0.0.0',
    trustProxyHops: proxyHops
  };
}
