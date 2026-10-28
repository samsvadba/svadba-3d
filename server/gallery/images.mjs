import { Worker } from 'node:worker_threads';
import { GalleryError, LIMITS } from './config.mjs';

export function sniffImage(buffer) {
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return { mime: 'image/jpeg', extension: 'jpg' };
  if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { mime: 'image/png', extension: 'png' };
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
  if (buffer.length >= 16 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const boxSize = buffer.readUInt32BE(0);
    if (boxSize < 16 || boxSize > buffer.length || boxSize > 4096) return null;
    const brands = [buffer.toString('ascii', 8, 12)];
    for (let offset = 16; offset + 4 <= boxSize; offset += 4) brands.push(buffer.toString('ascii', offset, offset + 4));
    if (brands.some(brand => ['heic', 'heix', 'hevc', 'hevx'].includes(brand))) return { mime: 'image/heic', extension: 'heic' };
  }
  return null;
}
export function validateImage(buffer, contentType = '') {
  if (!buffer.length || buffer.length > LIMITS.maxFileBytes) throw new GalleryError(413, 'FILE_TOO_LARGE');
  const type = sniffImage(buffer);
  if (!type) throw new GalleryError(415, 'UNSUPPORTED_TYPE');
  const declared = contentType.split(';')[0].trim().toLowerCase();
  const compatible = type.mime === 'image/heic' && ['image/heif', 'image/heic', 'image/heic-sequence', 'image/heif-sequence'].includes(declared);
  if (declared && declared !== 'application/octet-stream' && declared !== type.mime && !compatible) throw new GalleryError(415, 'TYPE_MISMATCH');
  return type;
}
export function safeName(encoded, extension) {
  let name;
  try { name = decodeURIComponent(encoded || 'photo'); } catch { throw new GalleryError(400, 'INVALID_NAME'); }
  name = name.normalize('NFC').replace(/[\u0000-\u001f\u007f/\\<>:"|?*]/g, '').trim().slice(0, 120);
  name = name.replace(/\.[^.]*$/, '') || 'photo';
  return `${name}.${extension}`;
}
// Decoder work is isolated and time-bounded. No image geometry is rebuilt per HTTP read.
export function createDerivatives(buffer, mime) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./image-worker.mjs', import.meta.url), {
      workerData: { bytes: buffer, mime, maxPixels: LIMITS.maxPixels },
      resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 32 }
    });
    let settled = false;
    const finish = (error, value) => {
      if (settled) return; settled = true; clearTimeout(timer); void worker.terminate();
      if (error) reject(error); else resolve({ ...value, thumbnail: Buffer.from(value.thumbnail), preview: Buffer.from(value.preview) });
    };
    const timer = setTimeout(() => finish(new GalleryError(422, 'IMAGE_DECODE_TIMEOUT')), 25_000);
    worker.once('message', value => value.error ? finish(new GalleryError(422, value.error)) : finish(null, value));
    worker.once('error', () => finish(new GalleryError(422, 'IMAGE_DECODE_FAILED')));
    worker.once('exit', code => { if (!settled) finish(new GalleryError(422, 'IMAGE_DECODE_FAILED')); });
  });
}
