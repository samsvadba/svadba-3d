# HEIC decoder

`heic-to.js` is the unmodified CSP ES module from `heic-to@1.6.7`, LGPL-3.0-or-later. It bundles libheif and is loaded only when native decoding fails. No paid API or remote conversion is used.

- Distribution: https://cdn.jsdelivr.net/npm/heic-to@1.6.7/dist/csp/heic-to.js
- Corresponding source package: https://registry.npmjs.org/heic-to/-/heic-to-1.6.7.tgz
- Source/build instructions: https://github.com/hoppergee/heic-to
- LGPL: `heic-to.LICENSE.txt`; incorporated GPL: https://www.gnu.org/licenses/gpl-3.0.txt

The module is separate and replaceable. Replace it with a compatible build exporting `heicTo` to update/debug/relink the library, then rebuild Vite. No library modifications have been made.
