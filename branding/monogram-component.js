// Geometry is supplied by the single approved SVG source. No font rendering.
let instance = 0;
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
}[char]));

export function renderMonogram(source, { label, width } = {}) {
  const prefix = `wedding-monogram-${++instance}`;
  const svg = source.replace(/<\?xml[^>]*\?>\s*/g, '')
    .replace(/\s+preserveAspectRatio="[^"]*"/g, '')
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`);
  const accessibility = label
    ? `role="img" aria-label="${escape(label)}"`
    : 'aria-hidden="true"';
  // A CSS length only, never arbitrary injected style declarations.
  const size = width !== undefined && /^(?:\d*\.?\d+)(?:px|rem|em|vw|%)?$/.test(String(width))
    ? ` style="--monogram-width:${escape(width)}${/^\d*\.?\d+$/.test(String(width)) ? 'px' : ''}"`
    : '';
  return svg.replace(/<svg\b([^>]*)>/, (_, attributes) =>
    `<svg${attributes} class="brand-monogram" preserveAspectRatio="xMidYMid meet" focusable="false" ${accessibility}${size}>`);
}
