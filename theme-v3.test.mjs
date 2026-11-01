// Offline palette, first-paint hydration and independent control regression checks.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import './public/theme-v3.js';

const api = globalThis.SMWeddingTheme;
const ids = ['classic', 'olive', 'red', 'orange', 'yellow', 'green', 'turquoise', 'blue', 'indigo', 'purple'];
const expected = {
  classic: ['#20221f', '#f5f4f0', '#ece9df', '#292a28'],
  olive: ['#303D29', '#F4EBDC', '#F4EBDC', '#303D29'],
  red: ['#AC2846', '#FF8294', '#4B1423', '#FFA9B4', '#FF9BAE'],
  orange: ['#AE4308', '#FFB15A', '#4F2008', '#FFC98E', '#FFAD66'],
  yellow: ['#806300', '#FFDB4D', '#423300', '#FFE883', '#FFE16A'],
  green: ['#1E6C46', '#91D68E', '#143A26', '#B8E9AC', '#A5E894'],
  turquoise: ['#006A79', '#62D4D4', '#003E49', '#9AE7E3', '#6AE4E4'],
  blue: ['#263DA2', '#8EB8FF', '#15235D', '#B4CFFF', '#88B7FF'],
  indigo: ['#423A92', '#ADACF2', '#282250', '#CECAFF', '#B4B0FF'],
  purple: ['#6B2D96', '#C8A2E9', '#3F1B5F', '#E0C5F5', '#D6AEFF'],
};
const linear = hex => [1, 3, 5].map(i => {
  const v = parseInt(hex.slice(i, i + 2), 16) / 255;
  return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
});
const storage = values => ({getItem: key => values[key] ?? null});
function root() {
  const variables = new Map();
  return {dataset: {}, variables, style: {setProperty: (name, value) => variables.set(name, value)}};
}
assert.deepEqual(api.palettes.map(p => p.id), ids);
assert.equal(api.initial.palette, 'classic'); assert.equal(api.initial.mode, 'dark');
for (const id of ids) for (const mode of ['light', 'dark']) {
  const theme = api.get(id, mode), [dark, light, third, fourth, accent] = expected[id];
  assert.equal(theme.palette, id); assert.equal(theme.mode, mode);
  assert.equal(theme.tokens.paper, mode === 'dark' ? dark : light);
  assert.equal(theme.colored, !['classic', 'olive'].includes(id));
  assert.equal(theme.nonClassic, id !== 'classic');
  assert.equal(api.get(id, mode), theme, 'Stable palettes should be cached');
  for (const name of ['paper', 'ink', 'muted', 'accent', 'line', 'border', 'surface', 'globe-line', 'globe-point']) {
    assert.match(theme.tokens[name], /^#[0-9a-f]{6}$/i, `${id}/${mode}: ${name}`);
  }
  if (theme.colored) {
    assert.equal(theme.tokens.ink, mode === 'dark' ? '#FFFFFF' : third);
    assert.equal(theme.tokens.surface, mode === 'dark' ? third : fourth);
    assert.equal(theme.tokens.accent, mode === 'dark' ? accent : dark);
    for (const name of ['ink', 'muted']) assert.ok(api.contrast(theme.tokens[name], theme.tokens.paper) >= 4.5, `${id}/${mode}: ${name} requires 4.5:1`);
    for (const name of ['border', 'globe-line', 'globe-point']) assert.ok(api.contrast(theme.tokens[name], theme.tokens.paper) >= 3, `${id}/${mode}: ${name} requires 3:1`);
  } else assert.equal(theme.tokens.ink, mode === 'dark' ? third : fourth);
  assert.deepEqual(theme.colors.paper, linear(theme.tokens.paper));
  assert.deepEqual(theme.colors.ink, linear(theme.tokens.ink));
  assert.deepEqual(theme.colors.line, linear(theme.tokens['globe-line']));
  assert.deepEqual(theme.colors.point, linear(theme.tokens['globe-point']));
  const documentRoot = root();
  assert.equal(api.apply(documentRoot, id, mode), theme);
  assert.deepEqual(documentRoot.dataset, {palette: id, theme: mode, mode, colored: String(theme.colored)});
  assert.equal(documentRoot.variables.get('--paper'), theme.tokens.paper);
  assert.equal(documentRoot.variables.get('--ink'), theme.tokens.ink);
  const restored = api.restore(storage({'sm-palette': id, 'sm-theme': mode}));
  assert.equal(restored, theme, 'Existing storage keys must restore the exact selection');
}
assert.equal(api.get('unknown', 'light'), api.get('classic', 'light'));
assert.equal(api.get('purple', 'invalid'), api.get('purple', 'dark'));
assert.equal(api.restore(storage({})), api.get());
assert.equal(api.restore({getItem() {throw new Error('Storage blocked');}}), api.get());

// Execute the exact blocking head script with browser-like roots, before main loads.
const bootstrap = await readFile(new URL('./public/theme-v3.js', import.meta.url), 'utf8');
for (const id of ids) for (const mode of ['light', 'dark']) {
  const documentRoot = root();
  const context = {document: {documentElement: documentRoot}, localStorage: storage({'sm-palette': id, 'sm-theme': mode})};
  vm.runInNewContext(bootstrap, context);
  assert.equal(context.SMWeddingTheme.initial.palette, id);
  assert.equal(context.SMWeddingTheme.initial.mode, mode);
  assert.equal(documentRoot.dataset.palette, id); assert.equal(documentRoot.dataset.theme, mode);
  assert.equal(documentRoot.variables.get('--paper'), api.get(id, mode).tokens.paper);
}
const blockedContext = {document: {documentElement: root()}, localStorage: {getItem() {throw new Error('Private storage');}}};
vm.runInNewContext(bootstrap, blockedContext);
assert.equal(blockedContext.document.documentElement.dataset.palette, 'classic');
assert.equal(blockedContext.document.documentElement.dataset.mode, 'dark');
const html = await readFile(new URL('./index-v3.html', import.meta.url), 'utf8');
const bootstrapTag = html.match(/<script\b[^>]*src=["'][^"']*theme-v3\.js(?:\?[^"']*)?["'][^>]*>/)?.[0];
assert.ok(bootstrapTag, 'Shared palette bootstrap must run in the document head');
assert.ok(!/\b(?:async|defer|type=["']module)/.test(bootstrapTag), 'First-paint bootstrap must be blocking');
assert.ok(html.indexOf(bootstrapTag) < html.indexOf('<style'), 'Theme must hydrate before the first background style');

// Run the production controls, not a duplicate implementation of their state changes.
const main = await readFile(new URL('./main-v3.js', import.meta.url), 'utf8');
function sourceFunction(name) {
  const start = main.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  let end = main.indexOf('{', start) + 1, depth = 1;
  while (depth && end < main.length) {if (main[end] === '{') depth++; else if (main[end] === '}') depth--; end++;}
  return main.slice(start, end);
}
for (const id of ids) for (const mode of ['light', 'dark']) {
  const saved = new Map(), preferences = {palette: id, theme: mode}; let applications = 0;
  const context = {preferences, savePreference: (k, v) => saved.set(k, v), applyMood: () => applications++, SMWeddingTheme: api, themeSystem: api};
  vm.runInNewContext(`${sourceFunction('selectThemePalette')}\n${sourceFunction('toggleThemeMode')}`, context);
  context.toggleThemeMode();
  assert.equal(preferences.palette, id, 'Mode toggle must retain palette');
  assert.equal(preferences.theme, mode === 'dark' ? 'light' : 'dark');
  assert.equal(saved.get('sm-theme'), preferences.theme);
  for (const next of ids) {
    const heldMode = preferences.theme;
    context.selectThemePalette(next);
    assert.equal(preferences.palette, next); assert.equal(preferences.theme, heldMode, 'Palette selection must retain mode');
    assert.equal(saved.get('sm-palette'), next);
  }
  const previousPalette = preferences.palette;
  context.selectThemePalette('invalid'); assert.equal(preferences.palette, previousPalette, 'Invalid palettes must not enter saved state');
  assert.ok(applications > 0);
}

// Execute the actual material update using real Three.js objects, without WebGL.
const globeMaterial = new THREE.MeshBasicMaterial(), overviewMaterial = new THREE.LineBasicMaterial(), wireMaterial = new THREE.LineBasicMaterial();
const markerGeometry = new THREE.SphereGeometry(.02, 4, 4), markerMaterial = new THREE.MeshBasicMaterial();
const mesh = new THREE.Mesh(markerGeometry, markerMaterial); mesh.position.set(1, 2, 3);
const geometryPositions = markerGeometry.attributes.position.array.slice();
const mood = {revision: 0}, context = {THREE, mood, particleTheme: null, globeMaterial, overviewMaterial, wireMaterial,
  markerData: [{mesh}], appliedGlobeTheme: {material: null, revision: null, markers: 0}};
vm.runInNewContext(`${sourceFunction('themeTweenValues')}\n${sourceFunction('getParticleTheme')}\n${sourceFunction('applyGlobeTheme')}`, context);
let sharedTheme;
function nearColor(actual, expectedColor) {assert.ok(actual.distanceTo ? actual.distanceTo(expectedColor) < 1e-9 : ['r', 'g', 'b'].every(k => Math.abs(actual[k] - expectedColor[k]) < 1e-9));}
for (const id of ids) for (const mode of ['light', 'dark']) {
  const selected = api.get(id, mode), n = Number(mode === 'dark');
  Object.assign(mood, context.themeTweenValues(selected), {value: n, palette: Number(selected.nonClassic), revision: mood.revision + 1});
  context.applyGlobeTheme();
  const particle = context.getParticleTheme();
  if (sharedTheme) assert.equal(particle, sharedTheme, 'Theme changes must reuse the particle color object'); else sharedTheme = particle;
  nearColor(particle.paper, new THREE.Color(selected.tokens.paper)); nearColor(particle.ink, new THREE.Color(selected.tokens.ink));
  assert.equal(particle.dark, n); assert.equal(particle.olive, Number(selected.nonClassic));
  if (selected.nonClassic) {
    nearColor(globeMaterial.color, new THREE.Color(selected.tokens.paper));
    nearColor(overviewMaterial.color, new THREE.Color(selected.tokens['globe-line']));
    nearColor(wireMaterial.color, new THREE.Color(selected.tokens['globe-line']));
    nearColor(markerMaterial.color, new THREE.Color(selected.tokens['globe-point']));
  } else {
    nearColor(globeMaterial.color, new THREE.Color().setRGB(.913 * (1 - n) + .014 * n, .905 * (1 - n) + .016 * n, .871 * (1 - n) + .014 * n));
    nearColor(overviewMaterial.color, new THREE.Color().setRGB(.127 * (1 - n) + .68 * n, .138 * (1 - n) + .70 * n, .114 * (1 - n) + .64 * n));
  }
  assert.equal(context.globeMaterial, globeMaterial); assert.equal(context.overviewMaterial, overviewMaterial); assert.equal(context.wireMaterial, wireMaterial);
  assert.equal(mesh.geometry, markerGeometry); assert.equal(mesh.material, markerMaterial); assert.deepEqual(mesh.position.toArray(), [1, 2, 3]);
  assert.deepEqual(markerGeometry.attributes.position.array, geometryPositions);
  context.applyGlobeTheme(); nearColor(context.getParticleTheme().paper, particle.paper);
}
markerGeometry.dispose(); markerMaterial.dispose(); globeMaterial.dispose(); overviewMaterial.dispose(); wireMaterial.dispose();
console.log('Theme V3 passed: all twenty exact themes, original palettes, contrast, linear WebGL colors and real material reuse, blocked/legacy storage, blocking hydration, and independent palette/mode controls.');
