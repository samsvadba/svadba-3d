// Static artwork cannot inherit the page theme. These are its explicit colours.
export default {
  foreground: '#000000',
  background: '#FFFFFF',
  // Optional part colours fall back to foreground; the default is monochrome.
  parts: { s: null, ampersand: null, m: null },
  share: {
    width: 1200,
    height: 630,
    monogram: { left: 58, top: 185, width: 305, height: 235 },
  },
  // A tiny, derived-only stroke supports the original hairlines at icon sizes.
  // The master SVG and every on-page instance retain the unmodified paths.
  favicon: { paddingRatio: 0.055, hairlinePixels: 0.18 },
};
