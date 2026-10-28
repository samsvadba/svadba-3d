// Offline lifecycle checks; no WebGL browser, network or RSVP submission.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import config from './config-v3.js';
import { createParticles, HEART_BOUNDS } from './experiments/intro-particles/particles.js';
import { createChoreography } from './experiments/intro-particles/choreography.js';
import { createPlayback } from './experiments/intro-particles/playback.js';
import { toStoryProgress, STORY_DURATION } from './experiments/intro-particles/pacing.js';
const { gsap } = createRequire(import.meta.url)('gsap');

// Exercise the production controller body with its real Three/GSAP helpers.
// Only browser DOM/render surfaces are stubbed. The pure label helper is read
// directly so Node need not load globe.js's browser JSON imports.
const controllerSource = await readFile(new URL('./intro-particles-v3.js', import.meta.url), 'utf8');
const globeSource = await readFile(new URL('./experiments/intro-particles/globe.js', import.meta.url), 'utf8');
function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`), body = source.indexOf('{', start);
  assert.ok(start >= 0);
  let depth = 1, end = body + 1;
  for (; end < source.length && depth; end++) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
  }
  assert.equal(depth, 0); return source.slice(start, end);
}
const placeOriginLabel = new Function('clamp', `return (${functionSource(globeSource, 'placeOriginLabel')});`)(THREE.MathUtils.clamp);
const createParticleIntro = new Function('THREE', 'gsap', 'createParticles', 'HEART_BOUNDS', 'createChoreography', 'createPlayback', 'toStoryProgress', 'STORY_DURATION', 'placeOriginLabel',
  controllerSource.replace(/^import .*;\r?$/gm, '').replace('export function createParticleIntro', 'function createParticleIntro') + '\nreturn createParticleIntro;')(
  THREE, gsap, createParticles, HEART_BOUNDS, createChoreography, createPlayback, toStoryProgress, STORY_DURATION, placeOriginLabel,
);

class Surface {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.listeners = new Map(); this.children = []; this.dataset = {};
    this.attributes = new Map(); this.hidden = false; this.value = ''; this.captures = new Set();
    this.style = { removeProperty(name) { delete this[name]; }, setProperty(name, value) { this[name] = value; } };
  }
  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(listener);
  }
  emit(type, values = {}) {
    const event = { type, target: this, preventDefault() {}, stopPropagation() {}, ...values };
    for (const listener of this.listeners.get(type) || []) listener(event);
  }
  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name); }
  getBoundingClientRect() { return { top: this.top ?? 680, left: 0, width: 390, height: 30 }; }
  closest() { return ['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA'].includes(this.tagName) ? this : null; }
  setPointerCapture(id) { this.captures.add(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
}
const oldGlobals = new Map(['document', 'window', 'navigator', 'innerWidth', 'innerHeight'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const documentStub = new Surface(), windowStub = new Surface();
const elements = Object.fromEntries(['content', 'labels', 'connectors', 'caption', 'timeline', 'progress', 'stage'].map(name => [`#particle-intro-${name}`, new Surface(name === 'progress' ? 'input' : 'div')]));
const root = new Surface(); root.querySelector = selector => elements[selector];
const footer = new Surface(); footer.top = 690;
documentStub.hidden = false;
documentStub.createElement = tag => new Surface(tag);
documentStub.createElementNS = (_, tag) => new Surface(tag);
documentStub.getElementById = id => id === 'bottom-nav' ? footer : null;
for (const [key, value] of Object.entries({ document: documentStub, window: windowStub, navigator: { deviceMemory: 2, hardwareConcurrency: 2 }, innerWidth: 390, innerHeight: 844 })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

const latLonToVec3 = (lat, lon, radius = 12) => {
  const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
};
const overviewDistance = (width, height) => Math.max(60, 51 / (width / height));
const scene = new THREE.Scene(), globeGroup = new THREE.Group(); scene.add(globeGroup);
const camera = new THREE.PerspectiveCamera(45, 390 / 844, .1, 1000); camera.position.set(0, 0, 80);
const globeMaterial = new THREE.MeshBasicMaterial(), globeMesh = new THREE.Mesh(new THREE.SphereGeometry(12, 12, 8), globeMaterial); globeGroup.add(globeMesh);
const overviewMaterial = new THREE.LineBasicMaterial(), wireMaterial = new THREE.LineBasicMaterial();
const border = new THREE.BufferGeometry().setFromPoints([latLonToVec3(48, 17, 12.045), latLonToVec3(49, 20, 12.045)]);
const detailMaterial = new THREE.LineBasicMaterial(), detailLine = new THREE.LineSegments(border, detailMaterial); globeGroup.add(detailLine);
const detailLayers = [{ iso: 'SVK', line: detailLine, material: detailMaterial, emphasis: 0 }];
const controls = { enabled: true, enableDamping: true, autoRotate: true, target: new THREE.Vector3(), update() {} };
let renderCount = 0, clearAlpha = -1, finishCount = 0, firstFrameCount = 0, finalPosition, language = 'sk';
const renderer = {
  setClearColor(color, alpha) { clearAlpha = alpha; },
  render(nextScene, nextCamera) { assert.equal(nextScene, scene); assert.equal(nextCamera, camera); renderCount++; },
};
const theme = { paper: new THREE.Color('#f5f4f0'), ink: new THREE.Color('#292a28'), dark: 0, olive: 0 };
const modes = [];
let controller;
const near = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
const clock = () => gsap.globalTimeline.getChildren().find(child => Math.abs(child.duration() - STORY_DURATION) < 1e-6);

try {
  controller = createParticleIntro({ scene, camera, renderer, controls, globeGroup, globeMesh, globeMaterial,
    overviewMaterial, wireMaterial, detailLayers,
    formationPositions: new Float32Array([12, 0, 0, 0, 12, 0, 0, 12, 0, 0, 0, 12]),
    radius: 12, latLonToVec3, overviewDistance, origins: config.origins, root,
    getTheme: () => theme, getLanguage: () => language,
    onFinish() { finishCount++; finalPosition = camera.position.clone(); },
    onMode: mode => modes.push(mode), onFirstFrame: () => firstFrameCount++,
  });
  assert.equal(scene.children.length, 2, 'Only the FX group is added to the native scene');
  assert.equal(elements['#particle-intro-content'].hidden, true);
  controller.start(); gsap.ticker.sleep();
  assert.equal(controller.active, true); assert.equal(controller.mode, 'auto'); near(controller.progress, 0);
  assert.ok(renderCount > 0, 'The first frame is synchronous'); assert.equal(firstFrameCount, 1);
  assert.equal(controls.enabled, false); assert.equal(controls.autoRotate, false); assert.equal(clearAlpha, 1);
  assert.equal(elements['#particle-intro-content'].hidden, false);
  const effect = scene.getObjectByName('intro-story-particles'); assert.ok(effect?.visible);
  assert.equal(effect.children.length,3,'Native intro must not retain a heart ribbon or pen layer');

  root.emit('pointerdown', { target: new Surface('button'), pointerId: 1, clientY: 500 });
  assert.equal(controller.mode, 'auto', 'UI controls must not take over the story');
  root.emit('pointerdown', { pointerId: 2, clientY: 500 });
  root.emit('pointermove', { pointerId: 2, clientY: 100 });
  assert.equal(controller.mode, 'manual'); near(controller.progress, 0, .001);
  root.emit('pointerup', { pointerId: 2 });
  root.emit('pointerdown', { pointerId: 3, clientY: 500 });
  root.emit('pointermove', { pointerId: 3, clientY: 200 });
  near(controller.progress, 300 / (844 * 7)); root.emit('pointerup', { pointerId: 3 });

  const range = elements['#particle-intro-progress']; range.value = '890'; range.emit('input'); controller.render(390, 844);
  near(controller.progress, .89); assert.equal(controller.mode, 'manual');
  const cloudCamera = camera.position.clone();
  for (const [paper, ink, dark, olive] of [
    ['#f5f4f0', '#292a28', 0, 0], ['#11120f', '#f5f4f0', 1, 0],
    ['#303D29', '#F4EBDC', 1, 1], ['#F4EBDC', '#303D29', 0, 1],
  ]) {
    theme.paper.set(paper); theme.ink.set(ink); theme.dark = dark; theme.olive = olive;
    controller.render(390, 844); near(controller.progress, .89);
    assert.ok(camera.position.distanceTo(cloudCamera) < 1e-9, 'Theme switching cannot restart or move the story');
    assert.ok(effect.children[0].material.uniforms.uColor.value.equals(theme.ink));
  }
  language = 'en'; controller.refreshLanguage();
  assert.equal(range.getAttribute('aria-label'), 'Intro progress'); near(controller.progress, .89);
  controller.toggle(); gsap.ticker.sleep(); assert.equal(controller.mode, 'auto');
  controller.toggle(); assert.equal(controller.mode, 'manual');
  documentStub.hidden = true; documentStub.emit('visibilitychange');
  documentStub.hidden = false; documentStub.emit('visibilitychange');
  assert.equal(controller.mode, 'manual'); assert.equal(clock().paused(), true, 'Manual hold survives tab return');

  controller.finish();
  assert.equal(finishCount, 1); near(controller.progress, 1);
  near(finalPosition.length(), overviewDistance(390, 844));
  const expectedHome = latLonToVec3((config.origins[0].lat + config.origins[1].lat) / 2, (config.origins[0].lon + config.origins[1].lon) / 2, 1);
  assert.ok(finalPosition.clone().normalize().angleTo(expectedHome) < 1e-7, 'Finish callback receives the settled home-facing camera');
  controller.leave();
  assert.ok(camera.position.distanceTo(finalPosition) < 1e-9, 'Leaving must preserve the handoff camera');
  assert.equal(controller.active, false); assert.equal(effect.visible, false); assert.equal(clearAlpha, 0);
  assert.equal(globeMaterial.transparent, false); assert.equal(globeMaterial.opacity, 1); assert.equal(globeMesh.visible, true);
  near(globeGroup.rotation.y, 0); assert.equal(elements['#particle-intro-content'].hidden, true);
  assert.equal(scene.getObjectByName('native-intro-origin-markers').visible, false);

  controller.start(); gsap.ticker.sleep(); controller.suspend('context'); assert.equal(clock().paused(), true);
  controller.resume('context'); gsap.ticker.sleep(); assert.equal(clock().paused(), false);
  documentStub.hidden = true; documentStub.emit('visibilitychange'); assert.equal(clock().paused(), true);
  controller.leave(); documentStub.hidden = false;
  controller.start(); gsap.ticker.sleep();
  assert.equal(controller.mode, 'auto'); assert.equal(clock().paused(), false, 'Restart clears a previous hidden-session suspension');
  assert.equal(firstFrameCount, 1, 'Startup cloud dismisses only once');
  controller.toggle(); controller.suspend('context'); controller.resume('context');
  assert.equal(controller.mode, 'manual'); assert.equal(clock().paused(), true);
  assert.ok(modes.includes('auto') && modes.includes('manual') && modes.includes('complete'));
  console.log('Native intro controller passed: one scene, synchronous first frame, manual takeover/seek, four themes without reset, final camera handoff, cleanup, visibility/context pause and restart.');
} finally {
  controller?.leave(); gsap.globalTimeline.clear(); gsap.ticker.sleep();
  for (const [key, descriptor] of oldGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
