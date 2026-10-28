import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { isIP } from 'node:net';
import { GalleryError, LIMITS, TYPES, UUID, readConfig } from './config.mjs';
import { GoogleDrive } from './drive.mjs';
import { GalleryService } from './service.mjs';

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(data));
}
async function readBody(request) {
  if (Number(request.headers['content-length']) > LIMITS.maxFileBytes) throw new GalleryError(413, 'FILE_TOO_LARGE');
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0, settled = false;
    const fail = error => { if (settled) return; settled = true; chunks.length = 0; reject(error); request.resume(); };
    request.on('data', chunk => {
      if (settled) return;
      size += chunk.length;
      if (size > LIMITS.maxFileBytes) { fail(new GalleryError(413, 'FILE_TOO_LARGE')); return; }
      chunks.push(chunk);
    });
    request.once('end', () => { if (!settled) { settled = true; resolve(Buffer.concat(chunks, size)); } });
    request.once('aborted', () => fail(new GalleryError(400, 'UPLOAD_ABORTED')));
    request.once('error', () => fail(new GalleryError(400, 'UPLOAD_ABORTED')));
  });
}
export function requestIP(request, proxyHops = 0) {
  const fallback = request.socket.remoteAddress || 'unknown';
  if (!proxyHops) return fallback;
  const chain = String(request.headers['x-forwarded-for'] || '').split(',').map(value => value.trim());
  const candidate = chain.at(-proxyHops);
  return candidate && isIP(candidate) ? candidate : fallback;
}
export function createGalleryServer({ config, service, ready = true }) {
  const counters = new Map(); let simultaneousBodies = 0;
  function limit(ip, upload) {
    const now = Date.now(), windowMs = upload ? 3600_000 : 300_000, key = `${upload ? 'up' : 'read'}:${ip}`;
    let entry = counters.get(key);
    if (counters.size > 10000) for (const [item, record] of counters) if (record.reset < now) counters.delete(item);
    if (!entry || entry.reset < now) {
      if (counters.size >= 20000 && !entry) throw new GalleryError(429, 'SERVER_BUSY');
      entry = { count: 0, reset: now + windowMs }; counters.set(key, entry);
    }
    if (++entry.count > (upload ? 60 : 600)) throw new GalleryError(429, 'RATE_LIMITED');
  }
  const server = http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Vary', 'Origin');
    try {
      const origin = request.headers.origin;
      if (origin && !config.origins.includes(origin)) throw new GalleryError(403, 'ORIGIN_NOT_ALLOWED');
      if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
      if (request.method === 'OPTIONS') {
        response.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-File-Name, X-Upload-Id, X-Gallery-Key', 'Access-Control-Max-Age': '600' }); response.end(); return;
      }
      const path = new URL(request.url, 'http://gallery.invalid').pathname;
      if (path === '/health' && request.method === 'GET') { json(response, ready ? 200 : 503, { ready }); return; }
      const media = path.match(/^\/api\/gallery\/photos\/([^/]+)\/(thumbnail|image)$/);
      const ip = requestIP(request, config.trustProxyHops || 0);
      limit(ip, request.method === 'POST');
      if (config.inviteKey && !media) {
        const supplied = Buffer.from(String(request.headers['x-gallery-key'] || '')), expected = Buffer.from(config.inviteKey);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new GalleryError(401, 'INVITE_REQUIRED');
      }
      if (!ready) throw new GalleryError(503, 'STORAGE_NOT_READY');
      if (request.method === 'GET' && path === '/api/gallery/status') {
        json(response, 200, { ready: true, maxFileBytes: LIMITS.maxFileBytes, maxBatchFiles: LIMITS.maxBatchFiles, acceptedTypes: TYPES }); return;
      }
      if (request.method === 'GET' && path === '/api/gallery/photos') {
        json(response, 200, await service.list(new URL(request.url, 'http://gallery.invalid').searchParams.get('cursor'))); return;
      }
      if (request.method === 'GET' && media) {
        if (!UUID.test(media[1])) throw new GalleryError(404, 'PHOTO_NOT_FOUND');
        const bytes = await service.drive.readDerivative(media[1], media[2]);
        response.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=300', 'Content-Length': bytes.length, 'Content-Disposition': 'inline' }); response.end(bytes); return;
      }
      if (request.method === 'POST' && path === '/api/gallery/photos') {
        if (simultaneousBodies >= 2) throw new GalleryError(429, 'SERVER_BUSY');
        simultaneousBodies++;
        try {
          const bytes = await readBody(request);
          const photo = await service.upload(bytes, { uploadId: request.headers['x-upload-id'], filename: request.headers['x-file-name'], contentType: request.headers['content-type'] });
          json(response, 201, { photo });
        } finally { simultaneousBodies--; }
        return;
      }
      throw new GalleryError(404, 'NOT_FOUND');
    } catch (error) {
      if (!request.complete) request.resume();
      if (response.headersSent) { response.destroy(); return; }
      const status = error instanceof GalleryError ? error.status : 503;
      if (status === 429) response.setHeader('Retry-After', '30');
      json(response, status, { error: { code: error instanceof GalleryError ? error.code : 'STORAGE_UNAVAILABLE', message: 'Unable to complete the gallery request.' } });
      // Never log URLs, image names, bytes, credentials or raw upstream responses.
      if (!(error instanceof GalleryError)) console.error('Gallery request failed:', error.name);
    }
  });
  server.requestTimeout = 120_000; server.headersTimeout = 15_000; server.keepAliveTimeout = 5_000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = readConfig();
  const drive = new GoogleDrive(config);
  await drive.validateFolder();
  const service = new GalleryService({ drive, publicUrl: config.publicUrl });
  const server = createGalleryServer({ config, service });
  server.listen(config.port, config.host, () => console.log(`Gallery listening on port ${config.port}`));
}
