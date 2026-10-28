import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import config from './config-v3.js';

// Run the production handlers without WebGL/network or manufactured autoplay permission.
const source = await readFile(new URL('./main-v3.js', import.meta.url), 'utf8');
const lines = source.split(/\r?\n/);
const line = prefix => {
  const result = lines.find(value => value.startsWith(prefix));
  assert.ok(result, 'Production handler remains discoverable: ' + prefix);
  return result;
};
const block = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'Production block remains discoverable: ' + start);
  return source.slice(a, b);
};
const unlockListeners = lines.filter(value => value.startsWith('document.addEventListener(') && value.includes('unlockMusic'));
for (const type of ['pointerup', 'click', 'keydown']) {
  assert.ok(unlockListeners.some(value => value.includes("'" + type + "'")), type + ' can unlock blocked playback');
}
const production = [
  line('function readPreference('), line('function savePreference('),
  line('const preferences='), line('const asset = '),
  block('const music=new Audio();', 'const t=key=>'),
  block('function syncSoundControl(){', 'function toast('),
  line("$('utility-sound').onclick="), ...unlockListeners,
  line("document.addEventListener('visibilitychange',syncMusic)"),
  'globalThis.player = { syncMusic, unlockMusic, toggleMusic, preferences, music };',
].join('\n');
const startup = source.slice(source.indexOf('function finishLoading(')).split('\nfunction ').slice(0, 1).join('');
assert.match(startup, /syncMusic\(\)/, 'Page startup attempts the selected music');

const notAllowed = () => Object.assign(new Error('User gesture required'), { name: 'NotAllowedError' });
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function harness(saved = {}, { webAudio = true, storageAvailable = true, contextState = 'running', playResults = [], resumeResults = [] } = {}) {
  const stats = { audio: [], contexts: 0, sources: 0, gains: 0, resumes: 0, fades: [], killed: [], announcements: 0, notices: [], attempts: [], resumeAttempts: [] };
  const storage = new Map(Object.entries(saved)), events = new Map(), attributes = new Map();
  const sound = {
    onclick: null, innerHTML: '', title: '',
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name) ?? null; },
  };
  const document = {
    hidden: false,
    body: { append(element) { assert.equal(element.id, 'background-music'); } },
    addEventListener(type, callback, capture) {
      const listeners = events.get(type) || [];
      listeners.push({ callback, capture }); events.set(type, listeners);
    },
  };
  class AudioMock {
    constructor() { this.paused = true; this.currentTime = 0; this.playCalls = 0; this.pauseCalls = 0; this.listeners = new Map(); stats.audio.push(this); }
    addEventListener(type, callback) { this.listeners.set(type, callback); }
    getAttribute(name) { return name === 'src' ? this.src || null : null; }
    play() {
      this.playCalls++;
      const result = playResults.shift() || 'resolve';
      if (result === 'reject') { this.paused = true; return Promise.reject(notAllowed()); }
      this.paused = false;
      if (result !== 'pending') return Promise.resolve();
      return new Promise((resolve, reject) => stats.attempts.push({ resolve, reject }));
    }
    pause() { this.pauseCalls++; this.paused = true; }
  }
  class ContextMock {
    constructor() { stats.contexts++; this.destination = {}; this.state = contextState; this.listeners = new Map(); stats.context = this; }
    createGain() { stats.gains++; return { gain: { value: 1 }, connect() {} }; }
    createMediaElementSource(audio) { assert.equal(audio, stats.audio[0]); stats.sources++; return { connect() {} }; }
    addEventListener(type, callback) { this.listeners.set(type, callback); }
    resume() {
      stats.resumes++;
      const result = resumeResults.shift() || 'resolve';
      if (result === 'reject') return Promise.reject(notAllowed());
      if (result === 'pending') return new Promise((resolve, reject) => stats.resumeAttempts.push({ resolve: () => { this.state = 'running'; resolve(); }, reject }));
      this.state = 'running'; return Promise.resolve();
    }
  }
  const context = vm.createContext({
    Audio: AudioMock, document, config, base: '/svadba-3d/',
    window: webAudio ? { AudioContext: ContextMock } : {},
    localStorage: {
      getItem(key) { if (!storageAvailable) throw Error('Storage blocked'); return storage.get(key) ?? null; },
      setItem(key, value) { if (!storageAvailable) throw Error('Storage blocked'); storage.set(key, value); },
    },
    $: id => { assert.equal(id, 'utility-sound'); return sound; },
    t: key => key,
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
  const dispatch = (type, target = '#nav-journey', extra = {}) => {
    const event = { type, isTrusted: true, key: 'Enter', target: { closest: selector => target && selector.split(',').some(value => value.trim() === target) }, ...extra };
    for (const { callback } of events.get(type) || []) callback(event);
  };
  return { ...context.player, stats, storage, document, sound, dispatch };
}

assert.equal(config.audio.backgroundMusic, 'audio/shes-a-rainbow.mp3?v=cb14e941');
const mp3 = await readFile(new URL('./public/audio/shes-a-rainbow.mp3', import.meta.url));
assert.ok(mp3.byteLength > 100_000, 'The real trimmed MP3 asset is present');

const fresh = harness();
assert.equal(fresh.preferences.sound, true, 'A new visitor defaults to requested autoplay');
assert.equal(fresh.music.src, undefined, 'The source is assigned by the existing player');
assert.equal(fresh.music.preload, 'none');
assert.equal(fresh.music.loop, true);
assert.equal(fresh.music.crossOrigin, 'anonymous');
fresh.syncMusic();
assert.equal(fresh.music.playCalls, 1, 'Startup attempts playback without an earlier click');
await settle();
assert.equal(fresh.music.src, '/svadba-3d/audio/shes-a-rainbow.mp3?v=cb14e941');
assert.equal(fresh.music.currentTime, 0, 'The trimmed recording starts at zero, without an extra seek');
assert.equal(fresh.music.paused, false);
for (let i = 0; i < 5; i++) fresh.syncMusic();
fresh.dispatch('pointerup'); fresh.dispatch('click'); fresh.dispatch('keydown');
await settle();
assert.equal(fresh.stats.audio.length, 1, 'One reusable Audio element exists');
assert.equal(fresh.stats.contexts, 1);
assert.equal(fresh.stats.sources, 1);
assert.equal(fresh.stats.gains, 1);
assert.equal(fresh.music.playCalls, 1, 'Repeated synchronization never overlaps tracks');
assert.ok(fresh.stats.fades.some(({ options }) => options.value === .45 && options.duration === .8 && options.ease === 'sine.inOut'), 'Original .8 second fade is preserved');
fresh.music.currentTime = 12;
fresh.document.hidden = true; fresh.dispatch('visibilitychange');
assert.equal(fresh.music.paused, true);
fresh.document.hidden = false; fresh.dispatch('visibilitychange'); await settle();
assert.equal(fresh.music.playCalls, 2);
assert.equal(fresh.music.currentTime, 12, 'Visibility resume preserves position');
fresh.sound.onclick();
assert.equal(fresh.music.paused, true);
assert.equal(fresh.storage.get('sm-sound'), 'off');
fresh.dispatch('pointerup'); fresh.dispatch('click'); fresh.dispatch('keydown');
fresh.dispatch('visibilitychange'); await settle();
assert.equal(fresh.music.playCalls, 2, 'Explicit off is never overridden by a gesture');

const rememberedOn = harness({ 'sm-sound': 'on' });
rememberedOn.syncMusic(); await settle();
assert.equal(rememberedOn.music.playCalls, 1, 'Remembered on is attempted on load');
rememberedOn.sound.onclick();
assert.equal(rememberedOn.music.paused, true);
assert.equal(rememberedOn.storage.get('sm-sound'), 'off');

const rememberedOff = harness({ 'sm-sound': 'off' });
rememberedOff.syncMusic();
rememberedOff.dispatch('pointerup'); rememberedOff.dispatch('click'); rememberedOff.dispatch('keydown');
rememberedOff.dispatch('visibilitychange'); await settle();
assert.equal(rememberedOff.preferences.sound, true, 'Each new page load starts enabled, even after a previous mute');
assert.equal(rememberedOff.music.playCalls, 1, 'Previous stored off cannot suppress startup playback');
assert.equal(rememberedOff.stats.contexts, 1);

for (const gesture of ['pointerup', 'click', 'keydown']) {
  const blocked = harness({}, { playResults: ['reject', 'resolve'] });
  blocked.syncMusic(); await settle();
  assert.equal(blocked.preferences.sound, true, 'Policy rejection is not saved as a user choice');
  assert.notEqual(blocked.storage.get('sm-sound'), 'off');
  assert.deepEqual(blocked.stats.notices, [], 'Autoplay blocking is not a broken-audio error');
  for (let i = 0; i < 4; i++) blocked.syncMusic();
  blocked.document.hidden = true; blocked.dispatch('visibilitychange');
  blocked.document.hidden = false; blocked.dispatch('visibilitychange'); await settle();
  assert.equal(blocked.music.playCalls, 1, 'No autoplay retry loop after rejection');
  blocked.dispatch(gesture); await settle();
  assert.equal(blocked.music.playCalls, 2, gesture + ' retries blocked playback');
  assert.equal(blocked.music.paused, false);
  blocked.dispatch('click'); await settle();
  assert.equal(blocked.music.playCalls, 2, 'A following click never duplicates pointer/key playback');
}

const blockedButton = harness({}, { playResults: ['reject', 'resolve'] });
blockedButton.syncMusic(); await settle();
assert.equal(blockedButton.sound.getAttribute('aria-pressed'), 'true', 'The icon reflects enabled sound, not autoplay permission');
blockedButton.dispatch('pointerup', '#utility-sound'); blockedButton.dispatch('click', '#utility-sound');
assert.equal(blockedButton.music.playCalls, 1, 'Global unlock ignores the sound button');
blockedButton.sound.onclick(); await settle();
assert.equal(blockedButton.preferences.sound, false, 'The sound button always switches enabled sound off');
assert.equal(blockedButton.music.playCalls, 1);
blockedButton.sound.onclick(); await settle();
assert.equal(blockedButton.music.playCalls, 2, 'Switching back on starts music');
assert.equal(blockedButton.preferences.sound, true);
blockedButton.sound.onclick();
assert.equal(blockedButton.music.paused, true, 'Next press switches sound off normally');
assert.equal(blockedButton.storage.get('sm-sound'), 'off');

const pending = harness({}, { playResults: ['pending', 'resolve'] });
pending.syncMusic();
for (let i = 0; i < 4; i++) pending.syncMusic();
pending.dispatch('pointerup'); pending.dispatch('click'); pending.dispatch('keydown');
assert.equal(pending.music.playCalls, 1, 'Only one play promise is in flight');
pending.sound.onclick();
assert.equal(pending.preferences.sound, false);
pending.stats.attempts[0].reject(notAllowed()); await settle();
pending.dispatch('click'); pending.dispatch('visibilitychange'); await settle();
assert.equal(pending.music.playCalls, 1, 'Late rejection cannot undo explicit off');
pending.sound.onclick(); await settle();
assert.equal(pending.music.playCalls, 2, 'Explicit enable survives a stale rejection');
assert.equal(pending.music.paused, false);

const stale = harness({}, { playResults: ['pending', 'resolve'] });
stale.syncMusic(); stale.sound.onclick(); stale.sound.onclick(); await settle();
assert.equal(stale.music.playCalls, 2, 'Off/on supersedes an unresolved old start');
stale.stats.attempts[0].reject(notAllowed()); await settle();
stale.dispatch('click'); await settle();
assert.equal(stale.music.playCalls, 2, 'Stale rejection cannot block or restart current playback');
assert.equal(stale.music.paused, false);

const suspended = harness({}, { contextState: 'suspended', resumeResults: ['reject', 'resolve'] });
suspended.syncMusic(); await settle();
const initialResumes = suspended.stats.resumes;
for (let i = 0; i < 4; i++) suspended.syncMusic();
suspended.dispatch('visibilitychange'); await settle();
assert.equal(suspended.stats.resumes, initialResumes, 'Suspended Web Audio does not get a resume loop');
suspended.dispatch('pointerup'); await settle();
assert.equal(suspended.stats.context.state, 'running', 'A gesture resumes the existing Web Audio context');
assert.equal(suspended.music.paused, false);
assert.equal(suspended.stats.contexts, 1);
assert.equal(suspended.stats.sources, 1);

const deferredContext = harness({}, { contextState: 'suspended', resumeResults: ['reject', 'pending'] });
deferredContext.syncMusic(); await settle();
assert.equal(deferredContext.music.paused, true, 'The initial suspended context correctly waits for a gesture');
deferredContext.dispatch('pointerup'); await settle();
assert.equal(deferredContext.preferences.sound, true);
assert.equal(deferredContext.music.playCalls, 2);
assert.equal(deferredContext.music.paused, false, 'A gesture play success must not be paused while AudioContext.resume is still pending');
deferredContext.dispatch('pointerup'); deferredContext.dispatch('click'); await settle();
assert.equal(deferredContext.music.playCalls, 2, 'Following gesture events do not duplicate an in-flight gesture resume');
assert.equal(deferredContext.stats.resumeAttempts.length, 1);
deferredContext.stats.resumeAttempts[0].resolve(); await settle();
assert.equal(deferredContext.stats.context.state, 'running');
assert.equal(deferredContext.music.paused, false, 'The original gesture attempt becomes audible when its context resumes');
assert.equal(deferredContext.sound.getAttribute('aria-pressed'), 'true');
deferredContext.sound.onclick();
assert.equal(deferredContext.music.paused, true, 'The next sound-button press still switches music off');

rememberedOff.music.listeners.get('error')();
assert.equal(rememberedOff.preferences.sound, false);
assert.equal(rememberedOff.music.paused, true);
assert.equal(rememberedOff.storage.get('sm-sound'), 'off');
assert.deepEqual(rememberedOff.stats.notices, ['musicUnavailable']);
rememberedOff.syncMusic(); rememberedOff.dispatch('pointerup'); await settle();
assert.equal(rememberedOff.music.playCalls, 1, 'An unavailable source is never automatically retried');

const fallback = harness({}, { webAudio: false, storageAvailable: false });
assert.equal(fallback.preferences.sound, true);
fallback.syncMusic(); await settle();
assert.equal(fallback.music.playCalls, 1, 'HTMLAudio fallback works with unavailable storage/Web Audio');
assert.equal(fallback.music.volume, .45);
assert.equal(fallback.stats.fades[0].options.duration, .8);
fallback.sound.onclick();
assert.equal(fallback.music.paused, true);

console.log('Music V3: startup autoplay at zero; remembered on/off; policy/gesture fallback; blocked button; promise races; singleton/context; loop/fade/visibility/error/fallback passed.');

