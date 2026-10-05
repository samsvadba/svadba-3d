// Shared visual identity across the V3 experience.
export const monogram = '<svg class="brand-monogram" viewBox="0 0 160 128" aria-hidden="true" focusable="false"><text x="9" y="91" class="brand-initial">S</text><text x="65" y="116" class="brand-initial">M</text><text x="46" y="116" class="brand-ampersand">&amp;</text></svg>';
export const names = '<span class="sr-only">Simona Šarmírová a Martin Fabian</span><span class="brand-names-art" aria-hidden="true"></span>';

// Reveal only once the luminance mask is decoded, avoiding an unmasked first frame.
const nameMask = new Image();
nameMask.crossOrigin = 'anonymous';
nameMask.onload = async () => {
  try { await nameMask.decode(); } catch {}
  document.documentElement.classList.add('brand-names-ready');
};
nameMask.src = 'https://samsvadba.github.io/svadba/assets/invite-wordmark.png';
