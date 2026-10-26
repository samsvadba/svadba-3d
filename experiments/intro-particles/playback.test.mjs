import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createPlayback } from './playback.js';

const { gsap } = createRequire(import.meta.url)('gsap');
const modes = [], values = [];
let finished = 0;
const playback = createPlayback({ gsap, duration: 40, onProgress: value => values.push(value), onMode: mode => modes.push(mode), onFinish: () => finished++ });
const timeline = playback.timeline;
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`);

try {
  playback.start(); gsap.ticker.sleep();
  assert.equal(playback.mode, 'auto');
  assert.equal(timeline.duration(), 40);
  timeline.time(12, false);
  close(playback.progress, .3);
  playback.pause();
  assert.equal(playback.mode, 'manual');
  assert.equal(timeline.paused(), true);
  const pausedTime = timeline.time();
  playback.play(); gsap.ticker.sleep();
  assert.equal(playback.timeline, timeline);
  close(timeline.time(), pausedTime);
  assert.equal(playback.mode, 'auto');

  playback.seek(.18);
  assert.equal(playback.mode, 'manual');
  close(playback.progress, .18);
  close(timeline.time(), 7.2);
  playback.seek(.62);
  close(playback.progress, .62);
  playback.play(); gsap.ticker.sleep();
  timeline.time(40, false);
  assert.equal(playback.mode, 'complete');
  assert.equal(finished, 1);
  assert.equal(timeline.paused(), true);
  playback.finish().seek(1).play();
  assert.equal(finished, 1, 'Repeated finish must not duplicate completion');
  close(playback.progress, 1);

  playback.restart(); gsap.ticker.sleep();
  assert.equal(playback.timeline, timeline);
  assert.equal(playback.mode, 'auto');
  close(playback.progress, 0);
  timeline.time(8, false);
  assert.equal(playback.suspend(), true);
  assert.equal(timeline.paused(), true);
  const hiddenTime = timeline.time();
  playback.resume(); gsap.ticker.sleep();
  assert.equal(playback.mode, 'auto');
  close(timeline.time(), hiddenTime);
  assert.equal(timeline.paused(), false);

  playback.suspend();
  playback.pause();
  playback.resume();
  assert.equal(playback.mode, 'manual');
  assert.equal(timeline.paused(), true, 'User pause while hidden prevents automatic resume');
  close(playback.progress, .2);
  assert.equal(playback.suspend(), false);
  playback.resume();
  assert.equal(timeline.paused(), true, 'Manual state must stay paused after visibility change');

  playback.start({ from: .7 }); gsap.ticker.sleep();
  close(timeline.time(), 28);
  assert.equal(playback.mode, 'auto');
  playback.finish();
  assert.equal(finished, 2);
  playback.seek(.4).seek(1);
  assert.equal(finished, 3, 'A new traversal can complete once');
  assert.ok(values.every(value => value >= 0 && value <= 1));
  assert.ok(modes.includes('auto') && modes.includes('manual') && modes.includes('complete'));
  console.log('PASS: one timeline, exact pause/resume, reverse seek, completion, restart and visibility suspension');
} finally {
  playback.dispose();
  gsap.ticker.sleep();
}
