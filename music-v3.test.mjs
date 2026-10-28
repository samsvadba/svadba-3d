import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import config from './config-v3.js';

// Execute the actual production audio/preferences handlers, isolated from WebGL
// and without sending a request or creating a browser autoplay permission.
const source = await readFile(new URL('./main-v3.js', import.meta.url), 'utf8');
const line = prefix => {
  const match = source.split(/\r?\n/).find(value => value.startsWith(prefix));
  assert.ok(match, `Production handler remains discoverable: ${prefix}`);
  return match;
};
const block = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `Production block remains discoverable: ${start}`);
  return source.slice(a, b);
};
const production = [
  line('function readPreference('),
  line('function savePreference('),
  line('const preferences='),
  line('const asset = '),
  block('const music=new Audio();', 'const t=key=>'),
  block('function syncMusic(){', 'function toast('),
  line("$('utility-sound').onclick="),
  line("document.addEventListener('click',event=>"),
  line("document.addEventListener('visibilitychange',syncMusic)"),
  'globalThis.player = { syncMusic, preferences, music, readPreference, savePreference };',
].join('\n');

function harness(saved = {}, { webAudio = true, storageAvailable = true } = {}) {
  const stats = { audio: [], contexts: 0, sources: 0, gains: 0, resumes: 0, fades: [], killed: [], announcements: 0, notices: [] };
  const storage = new Map(Object.entries(saved)), events = new Map();
  const sound = { onclick: null };
  const document = {
    hidden: false,
    body: { append(element) { assert.equal(element.id, 'background-music'); } },
    addEventListener(type, callback, capture) {
      const listeners = events.get(type) || [];
      listeners.push({ callback, capture }); events.set(type, listeners);
    },
  };
  class AudioMock {
    constructor() { this.paused = true; this.playCalls = 0; this.pauseCalls = 0; this.listeners = new Map(); stats.audio.push(this); }
    addEventListener(type, callback) { this.listeners.set(type, callback); }
    getAttribute(name) { return name === 'src' ? this.src || null : null; }
    play() { this.playCalls++; this.paused = false; return Promise.resolve(); }
    pause() { this.pauseCalls++; this.paused = true; }
  }
  class ContextMock {
    constructor() { stats.contexts++; this.destination = {}; }
    createGain() { stats.gains++; return { gain: { value: 1 }, connect() {} }; }
    createMediaElementSource(audio) { assert.equal(audio, stats.audio[0]); stats.sources++; return { connect() {} }; }
    resume() { stats.resumes++; return Promise.resolve(); }
  }
  const context = vm.createContext({
    Audio: AudioMock, document, config, base: '/svadba-3d/',
    window: webAudio ? { AudioContext: ContextMock } : {},
    localStorage: {
      getItem(key) { if (!storageAvailable) throw Error('Storage blocked'); return storage.get(key) ?? null; },
      setItem(key, value) { if (!storageAvailable) throw Error('Storage blocked'); storage.set(key, value); },
    },
    $: id => { assert.equal(id, 'utility-sound'); return sound; },
    applyLanguage() { stats.announcements++; },
    toast(key) { stats.notices.push(key); },
    gsap: {
      killTweensOf(target) { stats.killed.push(target); },
      to(target, options) {
        stats.fades.push({ target, options });
        if ('value' in options) target.value = options.value;
        if ('volume' in options) target.volume = options.volume;
      },
    },
  });
  vm.runInContext(production, context);
  const dispatch = (type, target) => {
    for (const { callback } of events.get(type) || []) callback({ target: { closest: selector => target && selector.split(',').includes(target) } });
  };
  return { ...context.player, stats, storage, document, sound, dispatch };
}

assert.equal(config.audio.backgroundMusic, 'audio/shes-a-rainbow.mp3');
const mp3 = await readFile(new URL('./public/audio/shes-a-rainbow.mp3', import.meta.url));
assert.ok(mp3.byteLength > 100_000, 'Real MP3 asset is present, not a placeholder');

const fresh = harness();
assert.equal(fresh.preferences.sound, false, 'A new visitor defaults to sound off');
assert.equal(fresh.music.src, undefined, 'Audio is not eagerly assigned a URL');
assert.equal(fresh.music.preload, 'none');
assert.equal(fresh.music.loop, true);
assert.equal(fresh.music.crossOrigin, 'anonymous');
fresh.syncMusic(); fresh.dispatch('click', '#nav-journey');
assert.equal(fresh.music.playCalls, 0, 'Navigation cannot turn on a fresh visitor’s music');
assert.equal(fresh.stats.contexts, 0, 'No Web Audio context until sound is enabled');
fresh.sound.onclick();
assert.equal(fresh.music.src, '/svadba-3d/audio/shes-a-rainbow.mp3');
assert.equal(fresh.music.paused, false);
assert.equal(fresh.storage.get('sm-sound'), 'on');
assert.equal(fresh.music.playCalls, 1);
for (let i = 0; i < 5; i++) fresh.syncMusic();
assert.equal(fresh.stats.audio.length, 1, 'Only one reusable Audio element exists');
assert.equal(fresh.stats.contexts, 1);
assert.equal(fresh.stats.sources, 1);
assert.equal(fresh.stats.gains, 1);
assert.equal(fresh.music.playCalls, 1, 'Repeated sync never starts a second track');
for (const { options } of fresh.stats.fades) {
  assert.equal(options.value, .45);
  assert.equal(options.duration, .8);
  assert.equal(options.ease, 'sine.inOut');
}
fresh.document.hidden = true; fresh.dispatch('visibilitychange');
assert.equal(fresh.music.paused, true, 'A hidden page pauses the same audio');
assert.equal(fresh.storage.get('sm-sound'), 'on', 'Visibility does not overwrite preference');
fresh.document.hidden = false; fresh.dispatch('visibilitychange');
assert.equal(fresh.music.playCalls, 2);
assert.equal(fresh.stats.audio.length, 1);
fresh.sound.onclick();
assert.equal(fresh.music.paused, true);
assert.equal(fresh.storage.get('sm-sound'), 'off');
fresh.dispatch('click', '#nav-wedding');
assert.equal(fresh.music.playCalls, 2, 'Explicit off remains off during navigation');

const rememberedOn = harness({ 'sm-sound': 'on' });
assert.equal(rememberedOn.preferences.sound, true);
rememberedOn.syncMusic(); rememberedOn.dispatch('visibilitychange');
assert.equal(rememberedOn.music.playCalls, 0, 'Remembered on still waits for existing eligible user gesture');
assert.equal(rememberedOn.music.src, undefined);
rememberedOn.dispatch('click', '#nav-journey');
assert.equal(rememberedOn.music.playCalls, 1);
assert.equal(rememberedOn.music.src, '/svadba-3d/audio/shes-a-rainbow.mp3');
rememberedOn.sound.onclick();
assert.equal(rememberedOn.music.paused, true, 'Remembered-on visitor can switch sound off');
assert.equal(rememberedOn.storage.get('sm-sound'), 'off');

const rememberedOff = harness({ 'sm-sound': 'off' });
rememberedOff.dispatch('click', '#next-btn');
assert.equal(rememberedOff.music.playCalls, 0);
rememberedOff.sound.onclick();
assert.equal(rememberedOff.music.playCalls, 1);
rememberedOff.music.listeners.get('error')();
assert.equal(rememberedOff.preferences.sound, false);
assert.equal(rememberedOff.music.paused, true);
assert.equal(rememberedOff.storage.get('sm-sound'), 'off');
assert.deepEqual(rememberedOff.stats.notices, ['musicUnavailable']);
rememberedOff.syncMusic();
assert.equal(rememberedOff.music.playCalls, 1, 'An unavailable source is never retried automatically');

const fallback = harness({}, { webAudio: false, storageAvailable: false });
assert.equal(fallback.preferences.sound, false);
fallback.sound.onclick();
assert.equal(fallback.music.playCalls, 1, 'Existing HTMLAudio fallback survives blocked storage/Web Audio');
assert.equal(fallback.music.volume, .45);
assert.equal(fallback.stats.fades[0].options.duration, .8);
fallback.sound.onclick();
assert.equal(fallback.music.paused, true);

console.log('Music V3: exact MP3 path; fresh/remembered preferences; gesture gating; one audio/context/source; loop/fade; pause/resume/error/fallback passed.');
