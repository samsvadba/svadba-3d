// Focused offline checks for the invitation target sampler. No network or RSVP.
import assert from 'node:assert/strict';
import { sampleInvitationAlphaMask, sampleWeddingInvitation } from './wedding-particle-target-v3.js';

const width = 80, height = 60;
const data = new Uint8ClampedArray(width * height * 4);
// A solid glyph-like ring with a genuinely transparent counter.
for (let y = 10; y < 40; y += 1) for (let x = 12; x < 38; x += 1) {
  if (x < 16 || x > 33 || y < 14 || y > 35) data[(y * width + x) * 4 + 3] = 255;
}
// A low-alpha hairline, separated from the main character.
for (let y = 8; y < 52; y += 1) data[(y * width + 63) * 4 + 3] = 48;
// Near-transparent PNG compression noise is not an invitation stroke.
data[(55 * width + 2) * 4 + 3] = 4;
const mask = { data, width, height };
const first = sampleInvitationAlphaMask(mask, 12000);
assert.equal(first.length, 36000);
assert.deepEqual(first, sampleInvitationAlphaMask(mask, 12000), 'The morph targets must be deterministic.');
assert.notDeepEqual(first, sampleInvitationAlphaMask(mask, 12000, 123), 'Seed selection must change particle identities.');
let hairlineCount = 0;
let backwardsY = false;
for (let index = 0; index < first.length; index += 3) {
  const x = Math.floor((first[index] + 1) / 2 * width);
  const y = Math.floor((1 - first[index + 1]) / 2 * height);
  assert.ok(first[index] >= -1 && first[index] <= 1);
  assert.ok(first[index + 1] >= -1 && first[index + 1] <= 1);
  assert.equal(first[index + 2], 0, 'Final invitation targets use the actual flat HTML plane.');
  assert.ok(data[(y * width + x) * 4 + 3] >= 9, 'Every target must land on visible ink, never a counter or the background.');
  if (x === 63) hairlineCount += 1;
  if (index && first[index + 1] > first[index - 2]) backwardsY = true;
}
assert.ok(hairlineCount > 250, 'Fine strokes should retain enough samples to remain readable.');
assert.ok(backwardsY, 'Shuffled targets must avoid a spatial top-to-bottom wipe.');
assert.throws(() => sampleInvitationAlphaMask({ data: new Uint8ClampedArray(16), width: 2, height: 2 }, 10), /no visible ink/);
assert.throws(() => sampleInvitationAlphaMask(mask, 0), TypeError);
const abort = new AbortController();
abort.abort();
await assert.rejects(sampleWeddingInvitation(null, { width, height, signal: abort.signal }), error => error.name === 'AbortError');
console.log('Invitation targets: deterministic sampling, transparent counters, antialiased hairlines, flat screen coordinates and cancellation passed.');
