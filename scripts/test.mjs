import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const tests = [
  'theme-v3.test.mjs', 'theme-picker-v3.test.mjs', 'rsvp-v3.test.cjs',
  'gallery-v3.test.mjs', 'server/gallery/apps-script.test.mjs', 'music-v3.test.mjs',
  'destination-media-v3.test.mjs', 'video-play-log-v3.test.mjs', 'instagram-v3.test.cjs',
  'origins-v3.test.mjs', 'intro-particles-v3.test.mjs', 'wedding-particles-v3.test.mjs',
  'wedding-particle-target-v3.test.mjs', 'branding/monogram.test.mjs', 'scripts/brand-export.test.mjs',
];
for (const test of tests) {
  const result = spawnSync(process.execPath, [test], {cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit'});
  if (result.error) console.error(result.error.message);
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
console.log(`All ${tests.length} V3 checks passed. No live RSVP submissions or photo uploads.`);
