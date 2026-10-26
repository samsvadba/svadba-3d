# Original V3 intro backup

This archive preserves the production V3 source immediately before integrating
the particle intro. The four source files are unchanged byte-for-byte copies;
`SHA256.json` records their original SHA-256 checksums.

## Preserved intro

- Native background video: `autoplay`, `muted`, `loop`, `playsinline`.
- Video source: <https://res.cloudinary.com/kxksv8hk/video/upload/video_bez_napisu_iphone.mp4>.
- Existing monogram, names, date, CTA, bottom navigation and utilities.
- Existing optional `?intro=lineart` mode using `intro-lineart-v3.svg`.

## Restore the previous source

1. Keep a copy or commit of the current working version first.
2. Copy these four archived files back into the repository root, retaining their
   exact names: `index-v3.html`, `main-v3.js`, `style-v3.css`, `config-v3.js`.
3. Keep the existing shared dependencies and assets in the repository. This is a
   source backup, not a second standalone website. Relative imports in the
   archived files resolve from the repository root, not from this directory.
4. Run the repository's normal production build (`npm run build`) and publish
   through the existing GitHub Pages workflow.

Restoring all four files also restores their captured shared configuration and
entry-page markup. If later wedding or Journey changes need to remain, recover
only the intro-specific portions with a reviewed diff instead of overwriting the
four current files wholesale.

Do not open this archived `index-v3.html` directly as a published page: its root
relative source dependencies are deliberately not duplicated here. The active
integration may separately retain a video-mode parameter for convenient viewing;
this backup does not depend on that parameter and makes no claim that an archive
URL is a playable deployment.

No media, fonts, geographical data or shared modules have been deleted or changed
by creating this backup. The original Cloudinary video remains external and is
not re-encoded or copied.
