// Focused geometric check for the rotating Americas/cloud handover.
// Offline only: no browser, network or production changes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import config from '../../config-v3.js';
import { createParticles } from './particles.js';

const radius = config.GLOBE_RADIUS;
const rings = JSON.parse(await readFile(new URL('../../countries-v3.json', import.meta.url), 'utf8'));
const globeSource = await readFile(new URL('./globe.js', import.meta.url), 'utf8');
const particleSource = await readFile(new URL('./particles.js', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('./main.js', import.meta.url), 'utf8');
function sourceFunction(name) {
  const start = globeSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing actual globe helper ${name}`);
  let end = globeSource.indexOf('{', start) + 1, depth = 1;
  for (; depth; end++) {
    assert.ok(end < globeSource.length, `Incomplete ${name}`);
    if (globeSource[end] === '{') depth++;
    if (globeSource[end] === '}') depth--;
  }
  return globeSource.slice(start, end);
}
const latLonToVec3 = new Function('THREE', 'RADIUS', `return (${sourceFunction('latLonToVec3')})`)(THREE, radius);
const boundaryGeometry = new Function('THREE', 'RADIUS', 'latLonToVec3', `return (${sourceFunction('boundaryGeometry')})`)(THREE, radius, latLonToVec3);

// Run the actual GLSL helper's scalar algebra in JS. Only vector operators and
// declarations need translation; the ray/sphere condition itself is unchanged.
const helper = particleSource.match(/float formationVisibility\(vec3 position, vec3 eye, float radius, float surface\)\s*\{([\s\S]*?)\n\s*\}/);
assert.ok(helper, 'Missing gradual formation visibility shader');
const helperBody = helper[1].replace(/\b(?:vec3|float)\b/g, 'let')
  .replace('position - eye', 'position.clone().sub(eye)')
  .replace('ray / distance', 'ray.clone().divideScalar(distance)');
const visibility = new Function('dot', 'length', 'max', 'sqrt', 'step', 'clamp',
  `return function(position, eye, radius, surface) {${helperBody}}`)(
    (a, b) => a.dot(b), a => a.length(), Math.max, Math.sqrt,
    (edge, value) => value < edge ? 0 : 1, THREE.MathUtils.clamp,
  );
assert.match(particleSource, /formationAlpha\s*=[\s\S]*?\*\s*formationVisibility\(worldPosition,\s*cameraPosition,\s*uGlobeRadius,\s*uFormationSurface\)/,
  'Actual forming cloud must use gradual visibility, not just declare it');
assert.match(mainSource, /formationSurface\s*:\s*score\s*>=\s*\.935\s*\?\s*pose\.globeOpacity\s*:\s*pose\.globeReveal/,
  'Sphere and formation shader must share the same surface reveal');
assert.match(particleSource, /material\.depthTest\s*=\s*p\s*>=\s*\.18\s*&&\s*\(p\s*<\s*\.935\s*\|\|\s*p\s*>=\s*1\)/,
  'Hardware depth must be bypassed only for opening/final geographic formation');

// Compare against Three's independent exact Ray.intersectSphere oracle,
// including camera distances used on desktop and portrait.
const sphere = new THREE.Sphere(new THREE.Vector3(), radius);
const ray = new THREE.Ray(), hit = new THREE.Vector3();
const point = new THREE.Vector3(), direction = new THREE.Vector3();
const axis = new THREE.Vector3(0, 1, 0);
const samples = rings.flat().filter(([lon, lat], i) => i % 4 === 0 && lon > -169 && lon < -40 && lat > -56 && lat < 72);
assert.ok(samples.length > 400, 'Missing actual American coastline samples');
let hiddenCount = 0, visibleCount = 0;
for (const distance of [60, 110.4]) {
  const eye = latLonToVec3(30, 15, distance);
  for (let degree = -720; degree <= 0; degree += 3) {
    for (const [lon, lat] of samples) {
      point.copy(latLonToVec3(lat, lon, radius + .045)).applyAxisAngle(axis, degree * Math.PI / 180);
      direction.copy(point).sub(eye).normalize();
      ray.set(eye, direction);
      const intersection = ray.intersectSphere(sphere, hit);
      const expected = !!intersection && eye.distanceTo(hit) < eye.distanceTo(point) - .02;
      const hidden = visibility(point, eye, radius, 1) === 0;
      assert.equal(hidden, expected, `Incorrect hemisphere at ${degree}°, ${lat}/${lon}`);
      if (hidden) hiddenCount++; else visibleCount++;
      // Transparent surface reveal fades the rear cloud continuously. It must
      // never perform a full opaque-depth cut as soon as opacity becomes >0.
      for (const surface of [0, .001, .1, .4, .8, 1]) {
        const alpha = visibility(point, eye, radius, surface);
        assert.equal(alpha, hidden ? 1 - surface : 1);
        assert.ok(alpha >= 0 && alpha <= 1);
        if (surface === .001) assert.ok(alpha >= .999);
      }
    }
  }
}
assert.ok(hiddenCount > 10000 && visibleCount > 10000, 'Both hemispheres must be exercised through both full turns');

// Every actual great-circle segment, including its midpoint, stays outside
// the analytic Earth. Coastlines cannot flicker through the sphere itself.
const geometry = boundaryGeometry(rings), positions = geometry.getAttribute('position');
const effect = createParticles({ count: 3000, mobile: true, formationPositions: positions.array });
const particles = effect.group.getObjectByName('geographic-formation-burst-volumetric-heart');
const stars = effect.group.getObjectByName('two-geographic-stars-and-trails');
assert.ok(particles?.material && stars?.material);
assert.ok(Math.abs(particles.material.uniforms.uGlobeRadius.value - radius) < .00001);
for (const progress of [0, .08, .17999, .18, .4, .85, .93499, .935, .955, .995, .99999, 1, .12, 0]) {
  for (const formationSurface of [0, .5, 1]) {
    effect.update({ progress, formationSurface,
      origins: [latLonToVec3(48.43, 17.8), latLonToVec3(48.31, 17.49)],
      merge: latLonToVec3(48.37, 17.64, radius + 8), color: new THREE.Color('#292a28'),
    });
    assert.equal(particles.material.depthTest, progress >= .18 && (progress < .935 || progress >= 1), 'Formation depth ownership must work forward and backward');
    assert.equal(particles.material.uniforms.uFormationSurface.value, formationSurface, 'Surface reveal was not supplied to the actual shader');
    assert.equal(stars.material.depthTest, true, 'Formation bypass leaked into the stars');
  }
}
effect.dispose();
const a = new THREE.Vector3(), b = new THREE.Vector3();
let minClearance = Infinity;
for (let i = 0; i < positions.count; i += 2) {
  a.fromBufferAttribute(positions, i); b.fromBufferAttribute(positions, i + 1);
  minClearance = Math.min(minClearance, a.length() - radius, b.length() - radius,
    a.add(b).multiplyScalar(.5).length() - radius);
}
geometry.dispose();
assert.ok(minClearance > .044, `Coastline/sphere z-fighting: ${minClearance}`);
console.log(`PASS — ${hiddenCount + visibleCount} Americas samples through 720° match Three ray/sphere occlusion; no early opaque cut; coastline clearance ≥${minClearance.toFixed(5)}.`);
