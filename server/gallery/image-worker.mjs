import { parentPort, workerData } from 'node:worker_threads';
import sharp from 'sharp';
import decodeHeic from 'heic-decode';

try {
  const bytes = Buffer.from(workerData.bytes);
  const options = { limitInputPixels: workerData.maxPixels, failOn: 'error', animated: false };
  const metadata = await sharp(bytes, options).metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > workerData.maxPixels || metadata.width > 16000 || metadata.height > 16000) throw new Error('IMAGE_DIMENSIONS');
  // Reject animated PNG/WebP rather than silently changing the submitted media.
  if (workerData.mime !== 'image/heic' && (metadata.pages || 1) > 1) throw new Error('ANIMATED_IMAGE');
  let input;
  if (workerData.mime === 'image/heic') {
    // libheif-js handles HEVC which the stock sharp binaries do not bundle.
    // Decode the primary still image; the original HEIC container is preserved on Drive.
    const decoded = await decodeHeic({ buffer: bytes });
    if (!decoded.width || !decoded.height || decoded.width * decoded.height > workerData.maxPixels) throw new Error('IMAGE_DIMENSIONS');
    input = sharp(Buffer.from(decoded.data), { raw: { width: decoded.width, height: decoded.height, channels: 4 }, limitInputPixels: workerData.maxPixels });
  } else input = sharp(bytes, options).rotate();
  const preview = await input.clone().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#fff' }).jpeg({ quality: 84, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const thumbnail = await input.clone().resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#fff' }).jpeg({ quality: 76, mozjpeg: true }).toBuffer();
  parentPort.postMessage({ width: preview.info.width, height: preview.info.height, preview: preview.data, thumbnail });
} catch (error) {
  const code = ['IMAGE_DIMENSIONS', 'ANIMATED_IMAGE'].includes(error.message) ? error.message : 'IMAGE_DECODE_FAILED';
  parentPort.postMessage({ error: code });
}
