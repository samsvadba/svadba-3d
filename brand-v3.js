// Shared visual identity across the V3 experience.
export const monogram = '<svg class="brand-monogram" viewBox="0 0 160 128" aria-hidden="true" focusable="false"><text x="9" y="91" class="brand-initial">S</text><text x="65" y="116" class="brand-initial">M</text><text x="46" y="116" class="brand-ampersand">&amp;</text></svg>';
const nameArtwork = new URL('./invite-wordmark-original.png', import.meta.url).href;
let nameInstance = 0;
export function names() {
  const id = 'brand-calligraphy-' + (++nameInstance);
  return '<span class="sr-only">Simona Šarmírová a Martin Fabian</span><svg class="brand-names-art" viewBox="0 0 1000 313.333" aria-hidden="true" focusable="false"><defs><filter id="'+id+'-ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -0.2126 -0.7152 -0.0722 0 1"/></filter><mask id="'+id+'" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="313.333"><image href="'+nameArtwork+'" x="-146.132" y="-608.4673588709677" width="1238" height="1745.0209032258065" filter="url(#'+id+'-ink)"/></mask></defs><rect width="1000" height="313.333" fill="currentColor" mask="url(#'+id+')"/></svg>';
}
