import monogramSource from './branding/monogram.svg?raw';
import { renderMonogram } from './branding/monogram-component.js';
import './branding/monogram.css';

// One approved vector, shared by the header, invitation, loader and prototype.
export const weddingMonogram = options => renderMonogram(monogramSource, options);
const nameArtwork = new URL('./invite-wordmark-original.png', import.meta.url).href;
let nameInstance = 0;
export function names() {
  const id = 'brand-calligraphy-' + (++nameInstance);
  return '<span class="sr-only">Simona Šarmírová a Martin Fabian</span><svg class="brand-names-art" viewBox="0 0 1000 313.333" aria-hidden="true" focusable="false"><defs><filter id="'+id+'-ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -0.2126 -0.7152 -0.0722 0 1"/></filter><mask id="'+id+'" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="313.333"><image href="'+nameArtwork+'" x="-146.132" y="-608.4673588709677" width="1238" height="1745.0209032258065" filter="url(#'+id+'-ink)"/></mask></defs><rect width="1000" height="313.333" fill="currentColor" mask="url(#'+id+')"/></svg>';
}
