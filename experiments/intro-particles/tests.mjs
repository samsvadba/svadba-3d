// Offline numerical checks only: no browser, network or production mutation.
// Run from the repository: node experiments/intro-particles/tests.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import config from '../../config-v3.js';
import { createParticles } from './particles.js';

const globeSource = await readFile(new URL('./globe.js', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('./main.js', import.meta.url), 'utf8');

// Execute the real isolated path/math functions, not a second copy of their
// equations. Their dependencies are supplied explicitly, without a WebGL DOM.
function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  const body = source.indexOf('{', start);
  let depth = 1;
  let end = body + 1;
  for (; end < source.length && depth; end += 1) {
    if (source[end] === '{') depth += 1;
    else if (source[end] === '}') depth -= 1;
  }
  assert.equal(depth, 0, `Incomplete ${name}`);
  return source.slice(start, end);
}
const radius = config.GLOBE_RADIUS;
assert.equal(radius, 12, 'The prototype must use the existing V3 globe radius');
const latLonToVec3 = new Function('THREE', 'RADIUS', `return (${functionSource(globeSource, 'latLonToVec3')});`)(THREE, radius);
const overviewDistance = new Function(`return (${functionSource(globeSource, 'overviewDistance')});`)();
const origins = config.origins.map(origin => latLonToVec3(origin.lat, origin.lon, radius + 0.065));
assert.deepEqual(config.origins.map(origin => origin.name), ['Hlohovec', 'Cífer']);
for (const [index, origin] of config.origins.entries()) {
  assert.ok(Math.abs(origins[index].length() - radius - 0.065) < 1e-10);
  const recoveredLatitude = THREE.MathUtils.radToDeg(Math.asin(origins[index].y / origins[index].length()));
  assert.ok(Math.abs(recoveredLatitude - origin.lat) < 1e-9, 'Origin lost its real latitude');
  assert.ok(origin.lat > 48 && origin.lat < 49 && origin.lon > 17 && origin.lon < 18);
}
const geographicSeparationKm = origins[0].angleTo(origins[1]) * 6371;
assert.ok(geographicSeparationKm > 20 && geographicSeparationKm < 35, 'Origins should remain geographically distinct');

for (const count of [5200, 9000, 14000]) {
  const effect = createParticles({ count, mobile: count < 14000 });
  const geometry = effect.group.children[0].geometry;
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    assert.equal(attribute.count, count, `${name} count changed`);
    assert.ok(attribute.array.every(Number.isFinite), `${name} has an invalid GPU value`);
  }
  const heart = geometry.getAttribute('aHeart');
  const box = new THREE.Box3().setFromBufferAttribute(heart);
  const size = box.getSize(new THREE.Vector3());
  assert.ok(size.x > 2 && size.y > 2 && size.z > 1.2, 'The heart must have real volume');
  assert.ok(size.z > size.x * 0.5, 'The heart cannot be a flattened outline');
  let surfaceCount = 0;
  for (let i = 0; i < count; i += 1) {
    const x = heart.getX(i), y = heart.getY(i) + 0.13, z = heart.getZ(i);
    const q = x * x + y * y + 2.25 * z * z - 1;
    const field = q * q * q - x * x * y * y * y - 0.1125 * z * z * y * y * y;
    if (Math.abs(field) < 0.00001) surfaceCount += 1;
  }
  const surfaceFraction = surfaceCount / count;
  assert.ok(surfaceFraction > 0.76 && surfaceFraction < 0.89, 'Expected both a dense shell and an interior population');
  for (const object of effect.group.children) {
    assert.ok(!Object.keys(object.material.uniforms).some(name => /time|clock|delta/i.test(name)), 'Animation must have no clock uniform');
  }
  effect.dispose();
  assert.equal(effect.group.children.length, 0, 'Effect cleanup left draw objects');
}

const effect = createParticles({ count: 9000, mobile: true });
const snapshots = effect.group.children.map(object => ({
  uuid: object.geometry.uuid,
  attributes: Object.fromEntries(Object.entries(object.geometry.attributes).map(([key, value]) => [key, value.array])),
}));
let minimumCameraRadius = Infinity;
let minimumHeartScale = Infinity;
const viewportResults = [];
for (const [width, height] of [[390, 844], [430, 932], [844, 390], [1440, 900]]) {
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  const globe = { radius, camera, globeMaterial: { opacity: 1 }, overviewDistance };
  const direction = new THREE.Vector3();
  const homeDirection = latLonToVec3((config.origins[0].lat + config.origins[1].lat) / 2, (config.origins[0].lon + config.origins[1].lon) / 2, 1);
  const startDirection = latLonToVec3(30, 15, 1);
  const merge = new THREE.Vector3(), lookTarget = new THREE.Vector3(), basis = new THREE.Quaternion();
  const cameraStory = new Function('THREE', 'globe', 'width', 'height', 'smooth', 'direction', 'startDirection', 'homeDirection', 'lookTarget', 'merge', 'basis', 'fx', 'originVectors', 'particleColor', 'theme', `return (${functionSource(mainSource, 'cameraStory')});`)(
    THREE, globe, width, height, (a, b, p) => THREE.MathUtils.smoothstep(p, a, b), direction, startDirection, homeDirection, lookTarget, merge, basis, effect, origins, new THREE.Color('#303D29'), { dark: false },
  );
  const states = [];
  let localMinimum = Infinity;
  for (let i = 0; i <= 1000; i += 1) {
    const progress = i / 1000;
    cameraStory(progress);
    const distance = camera.position.length();
    minimumCameraRadius = Math.min(minimumCameraRadius, distance);
    localMinimum = Math.min(localMinimum, distance);
    assert.ok(distance > radius, `Camera entered the globe at ${width}x${height}, p=${progress}`);
    const uniforms = effect.group.children[0].material.uniforms;
    assert.equal(uniforms.uProgress.value, progress);
    assert.ok(uniforms.uScale.value > 0);
    minimumHeartScale = Math.min(minimumHeartScale, uniforms.uScale.value);
    assert.ok(uniforms.uOriginA.value.distanceTo(origins[0]) < 1e-12);
    assert.ok(uniforms.uOriginB.value.distanceTo(origins[1]) < 1e-12);
    states.push([...camera.position, ...camera.quaternion, ...uniforms.uMerge.value, ...uniforms.uBasis.value.elements]);
    for (const [index, object] of effect.group.children.entries()) {
      assert.equal(object.geometry.uuid, snapshots[index].uuid);
      for (const [name, attribute] of Object.entries(object.geometry.attributes)) {
        assert.equal(attribute.array, snapshots[index].attributes[name], 'Update allocated a new GPU attribute');
      }
    }
  }
  // The same scroll position must reproduce the exact camera/uniform state on reversal.
  for (let i = 1000; i >= 0; i -= 1) {
    cameraStory(i / 1000);
    const uniforms = effect.group.children[0].material.uniforms;
    const state = [...camera.position, ...camera.quaternion, ...uniforms.uMerge.value, ...uniforms.uBasis.value.elements];
    assert.deepEqual(state, states[i], `Path is not reversible at p=${i / 1000}`);
  }
  viewportResults.push(`${width}×${height}: minimum camera radius ${localMinimum.toFixed(3)}`);
}
effect.dispose();
console.log('PASS — 5,200 / 9,000 / 14,000 finite GPU particles; dense analytic shell + interior; no time uniform.');
console.log('PASS — geometry/attribute identities stable through updates; forward/reverse camera and uniform states identical.');
console.log(`PASS — real origin separation ${geographicSeparationKm.toFixed(2)} km; markers at radius ${(radius + 0.065).toFixed(3)}.`);
console.log(`PASS — ${viewportResults.join('; ')}; heart scales positive (minimum ${minimumHeartScale.toFixed(3)}).`);
