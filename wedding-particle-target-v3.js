// The transition samples the invitation which is already laid out by Wedding.
// This is a small, invitation-specific alpha renderer, not a second invitation
// design or a generic DOM screenshot library. Final text remains native HTML.
const namesArtworkUrl = new URL('./invite-wordmark-original.png', import.meta.url).href;
const NAME_VIEWBOX = { width: 1000, height: 313.333 };
const NAME_IMAGE = { x: -146.132, y: -608.4673588709677, width: 1238, height: 1745.0209032258065 };
let namesArtworkPromise;

function abortIfNeeded(signal) {
  if (signal?.aborted) throw new DOMException('Invitation preparation was cancelled.', 'AbortError');
}

function bounded(promise, duration, fallback) {
  let timer;
  return Promise.race([promise, new Promise(resolve => { timer = setTimeout(() => resolve(fallback), duration); })])
    .finally(() => clearTimeout(timer));
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The invitation artwork could not be loaded.'));
    image.src = url;
  });
}

function relativeOpacity(element, root) {
  let opacity = 1;
  for (let current = element; current && current !== root.parentElement; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (style.display === 'none') return 0;
    opacity *= Number.parseFloat(style.opacity) || 0;
  }
  return opacity;
}

function drawableRect(element, width, height) {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < width && rect.top < height ? rect : null;
}

async function drawVector(context, source, rect, opacity) {
  const clone = source.cloneNode(true);
  const originals = [source, ...source.querySelectorAll('*')];
  const clones = [clone, ...clone.querySelectorAll('*')];
  for (let index = 0; index < originals.length; index += 1) {
    const style = getComputedStyle(originals[index]);
    const node = clones[index];
    node.removeAttribute('class');
    node.removeAttribute('style');
    node.setAttribute('fill', style.fill === 'none' ? 'none' : '#fff');
    node.setAttribute('stroke', style.stroke === 'none' ? 'none' : '#fff');
    for (const property of ['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'fill-opacity', 'stroke-opacity']) {
      node.setAttribute(property, style.getPropertyValue(property));
    }
    // Parent opacity is applied once to the complete vector below.
    node.setAttribute('opacity', index === 0 ? '1' : style.opacity);
  }
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', rect.width);
  clone.setAttribute('height', rect.height);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  try {
    const image = await bounded(loadImage(url), 1800, null);
    if (!image) throw new Error('The invitation vector was not ready in time.');
    context.globalAlpha = opacity;
    context.drawImage(image, rect.left, rect.top, rect.width, rect.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawNames(context, image, rect, opacity, pixelScale) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(rect.width * pixelScale));
  canvas.height = Math.max(1, Math.ceil(rect.height * pixelScale));
  const ink = canvas.getContext('2d', { willReadFrequently: true });
  // Match the existing SVG's xMidYMid meet transform and original PNG crop.
  const fit = Math.min(canvas.width / NAME_VIEWBOX.width, canvas.height / NAME_VIEWBOX.height);
  const offsetX = (canvas.width - NAME_VIEWBOX.width * fit) / 2;
  const offsetY = (canvas.height - NAME_VIEWBOX.height * fit) / 2;
  ink.drawImage(image, offsetX + NAME_IMAGE.x * fit, offsetY + NAME_IMAGE.y * fit, NAME_IMAGE.width * fit, NAME_IMAGE.height * fit);
  const pixels = ink.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const luminance = .2126 * pixels.data[index] + .7152 * pixels.data[index + 1] + .0722 * pixels.data[index + 2];
    pixels.data[index + 3] = Math.round((1 - luminance / 255) * pixels.data[index + 3]);
    pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = 255;
  }
  ink.putImageData(pixels, 0, 0);
  context.globalAlpha = opacity;
  context.drawImage(canvas, rect.left, rect.top, rect.width, rect.height);
}

function drawText(context, element, root, width, height) {
  const opacity = relativeOpacity(element, root);
  if (opacity <= .001 || !drawableRect(element, width, height)) return;
  const style = getComputedStyle(element);
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  context.fillStyle = '#fff';
  context.globalAlpha = opacity;
  const size = Number.parseFloat(style.fontSize);
  const metrics = context.measureText('Mg');
  const ascent = metrics.fontBoundingBoxAscent ?? size * .8;
  const descent = metrics.fontBoundingBoxDescent ?? size * .2;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    // Each text-bearing span is rendered once. SVG title/description and the
    // accessible-only calligraphy fallback never enter this text renderer.
    if (node.parentElement !== element || !node.textContent.trim()) continue;
    let offset = 0;
    for (const character of node.textContent) {
      range.setStart(node, offset);
      offset += character.length;
      range.setEnd(node, offset);
      if (/\s/u.test(character)) continue;
      const rect = range.getBoundingClientRect();
      if (rect.width <= 0 || rect.bottom < 0 || rect.top > height) continue;
      const text = style.textTransform === 'uppercase' ? character.toLocaleUpperCase() : style.textTransform === 'lowercase' ? character.toLocaleLowerCase() : character;
      // DOM ranges supply exact wrapping, kerning positions and letter spacing.
      // Font bounds place the canvas baseline within that actual glyph line box.
      const baseline = rect.top + (rect.height - ascent - descent) / 2 + ascent;
      context.fillText(text, rect.left, baseline);
      if (style.textDecorationLine.includes('underline')) {
        context.fillRect(rect.left, baseline + Math.max(2, size * .2), rect.width, Math.max(.5, Number.parseFloat(style.textDecorationThickness) || .7));
      }
    }
  }
  range.detach?.();
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

// Deterministic, alpha-weighted stratification keeps fine hairlines and counters
// intact without leaving random holes in small letters. Exported for offline QA.
export function sampleInvitationAlphaMask({ data, width, height }, count, seed = 0x534d2027) {
  if (!Number.isInteger(count) || count < 1 || !width || !height || data.length !== width * height * 4) {
    throw new TypeError('A valid invitation alpha mask and positive particle count are required.');
  }
  const cumulative = new Float64Array(width * height);
  let weight = 0;
  for (let index = 0; index < cumulative.length; index += 1) {
    const alpha = data[index * 4 + 3] / 255;
    // Subpixel antialiasing contributes, while near-transparent raster noise does not.
    weight += alpha >= .035 ? Math.pow(alpha, .64) : 0;
    cumulative[index] = weight;
  }
  if (!weight) throw new Error('The prepared invitation has no visible ink.');
  const random = seededRandom(seed);
  const points = new Float32Array(count * 3);
  for (let index = 0, pixel = 0; index < count; index += 1) {
    const sample = (index + random()) / count * weight;
    while (pixel < cumulative.length - 1 && cumulative[pixel] < sample) pixel += 1;
    const x = pixel % width + .15 + random() * .7;
    const y = Math.floor(pixel / width) + .15 + random() * .7;
    points[index * 3] = x / width * 2 - 1;
    points[index * 3 + 1] = 1 - y / height * 2;
  }
  // Spatially ordered targets would turn the burst into a top-to-bottom wipe.
  for (let index = count - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    for (let axis = 0; axis < 3; axis += 1) {
      const swap = points[index * 3 + axis];
      points[index * 3 + axis] = points[other * 3 + axis];
      points[other * 3 + axis] = swap;
    }
  }
  return points;
}

export async function sampleWeddingInvitation(root, { width = innerWidth, height = innerHeight, count = 22000, signal } = {}) {
  abortIfNeeded(signal);
  if (!(width > 0 && height > 0) || !root?.querySelector) throw new TypeError('A laid-out invitation and viewport are required.');
  namesArtworkPromise ??= loadImage(namesArtworkUrl).catch(error => { namesArtworkPromise = undefined; throw error; });
  const [, artwork] = await Promise.all([
    bounded(document.fonts?.ready ?? Promise.resolve(), 1800),
    bounded(namesArtworkPromise, 3000, null),
  ]);
  abortIfNeeded(signal);
  if (!artwork) throw new Error('The invitation calligraphy was not ready in time.');
  // One alpha readback per transition. This canvas is never shown or added to DOM.
  const pixelScale = Math.min(1.5, Math.max(1, devicePixelRatio || 1), 1280 / width, 1800 / height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * pixelScale));
  canvas.height = Math.max(1, Math.round(height * pixelScale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('The invitation mask canvas is unavailable.');
  context.scale(canvas.width / width, canvas.height / height);
  // The invitation has its own scrollport. Do not reconstruct text which is
  // correctly clipped below that scrollport or behind the global bottom bar.
  const scrollport = root.closest('.w-panel');
  if (scrollport) {
    const rect = scrollport.getBoundingClientRect();
    context.beginPath();
    context.rect(rect.left, rect.top, rect.width, rect.height);
    context.clip();
  }
  const vectors = [...root.querySelectorAll('.brand-monogram, .w-invitation-actions svg')];
  await Promise.all(vectors.map(async vector => {
    const rect = drawableRect(vector, width, height);
    if (rect) await drawVector(context, vector, rect, relativeOpacity(vector, root));
  }));
  abortIfNeeded(signal);
  const names = root.querySelector('.brand-names-art');
  const namesRect = names && drawableRect(names, width, height);
  if (namesRect) drawNames(context, artwork, namesRect, relativeOpacity(names, root), pixelScale);
  root.querySelectorAll('.w-invitation-announcement span, .w-invitation-date span, .w-invitation-place span, .w-invitation-actions .w-link > span').forEach(element => {
    drawText(context, element, root, width, height);
  });
  const rule = root.querySelector('.w-invitation-rule');
  const ruleRect = rule && drawableRect(rule, width, height);
  if (ruleRect) {
    context.globalAlpha = relativeOpacity(rule, root);
    context.fillStyle = '#fff';
    context.fillRect(ruleRect.left, ruleRect.top, ruleRect.width, Math.max(.65, ruleRect.height));
  }
  const mask = context.getImageData(0, 0, canvas.width, canvas.height);
  abortIfNeeded(signal);
  return sampleInvitationAlphaMask(mask, count);
}
