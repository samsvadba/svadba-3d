// Offline geographic layout regression: no DOM, WebGL or network required.
// node experiments/intro-particles/label-layout.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import config from '../../config-v3.js';
import { createChoreography } from './choreography.js';

const source = await readFile(new URL('./globe.js', import.meta.url), 'utf8');
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  const body = source.indexOf('{', start);
  let depth = 1, end = body + 1;
  for (; end < source.length && depth; end++) {
    if (source[end] === '{') depth++;
    else if (source[end] === '}') depth--;
  }
  assert.equal(depth, 0, `Incomplete ${name}`);
  return source.slice(start, end);
}
assert.ok(!/originFill|countryFillGeometry|ShapeUtils\.triangulateShape/.test(source), 'Slovakia must have no fill');
assert.match(source, /layer\.iso === 'SVK'/, 'Slovakia boundary highlight is missing');
const radius = config.GLOBE_RADIUS;
const latLonToVec3 = new Function('THREE', 'RADIUS', `return (${functionSource('latLonToVec3')});`)(THREE, radius);
const placeOriginLabel = new Function('clamp', `return (${functionSource('placeOriginLabel')});`)(THREE.MathUtils.clamp);
const boundaryGeometry = new Function('THREE', 'RADIUS', 'latLonToVec3', `return (${functionSource('boundaryGeometry')});`)(THREE, radius, latLonToVec3);
const detail = JSON.parse(await readFile(new URL('../../geography-detail-v3.json', import.meta.url), 'utf8'));
const slovakia = detail.features.find(feature => feature.iso === 'SVK');
assert.ok(slovakia?.rings[0].length > 100, 'Use existing detailed Slovakia borders');
const geometry = boundaryGeometry(slovakia.rings), vertices = geometry.getAttribute('position');
const origins = config.origins.map(origin => latLonToVec3(origin.lat, origin.lon, radius + .065));
const home = latLonToVec3((config.origins[0].lat + config.origins[1].lat) / 2, (config.origins[0].lon + config.origins[1].lon) / 2, 1);
const choreography = createChoreography({ homeDirection: home, startDirection: latLonToVec3(30, 15, 1), radius });
const overlap = (a, b) => Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
  * Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
let checks = 0;
for (const [width, height] of [[390, 844], [430, 932], [844, 390], [1440, 720], [1440, 900]]) {
  const camera = new THREE.PerspectiveCamera(45, width / height, .1, 1000);
  new Function('camera', `return (${functionSource('applyFraming')});`)(camera)(width, height);
  const point = new THREE.Vector3();
  const screen = vector => {
    point.copy(vector).project(camera);
    return { x: (point.x + 1) * width / 2, y: (1 - point.y) * height / 2 };
  };
  for (let step = 275; step <= 449; step++) {
    const score = step / 1000, pose = choreography.sample(score, { width, height });
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    const country = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (let i = 0; i < vertices.count; i++) {
      const p = screen(new THREE.Vector3().fromBufferAttribute(vertices, i));
      country.minX = Math.min(country.minX, p.x); country.maxX = Math.max(country.maxX, p.x);
      country.minY = Math.min(country.minY, p.y); country.maxY = Math.max(country.maxY, p.y);
    }
    for (const manual of [false, true]) {
      const bottom = height - (manual ? height < 560 ? 148 : 180 : 85), occupied = [];
      origins.forEach((origin, index) => {
        const block = placeOriginLabel({ index, point: screen(origin), country,
          labelWidth: width < 768 ? 118 : 148, labelHeight: width < 768 ? 72 : 80,
          width, height, bottom, occupied });
        const context = `${width}x${height}, score ${score}, ${manual ? 'manual' : 'auto'}, origin ${index}`;
        assert.equal(overlap(block, country), 0, `Label overlaps Slovakia: ${context}`);
        assert.ok(occupied.every(other => overlap(block, other) === 0), `Labels overlap: ${context}`);
        assert.ok(block.minX >= 0 && block.maxX <= width && block.minY >= 0 && block.maxY <= bottom,
          `Label exceeds viewport or reserved footer: ${context}`);
        occupied.push(block); checks++;
      });
    }
  }
}
geometry.dispose();
console.log(`PASS: outline-only Slovakia and ${checks} origin label placements across five viewports, forward score states and both playback layouts.`);
