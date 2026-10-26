// Offline numerical checks: no browser, network or production mutations.
// node experiments/intro-particles/tests.mjs
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {heartField,heartPoint,originalPointFragment} from './original-heart.js';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import config from '../../config-v3.js';
import { createParticles, HEART_BOUNDS } from './particles.js';
import { createChoreography, STORY_PHASES } from './choreography.js';

const globeSource = await readFile(new URL('./globe.js', import.meta.url), 'utf8');
const countries = JSON.parse(await readFile(new URL('../../countries-v3.json', import.meta.url), 'utf8'));
// Historical code is copied verbatim from the first implementation, 2f7b1ed.
const historicalHash = createHash('sha256').update([heartField.toString(), heartPoint.toString(), originalPointFragment].join('\n').replace(/\r\n/g, '\n')).digest('hex');
assert.equal(historicalHash, 'f3cc9b8ab8f6c59d8354fb2b15e9c5dc433664977697a051bdfe1bbceb0391d0', 'The first sampler or sprite has changed');
function originalRandom() {
  let state = 0x534d2027;
  return () => { state = (Math.imul(state,1664525)+1013904223)>>>0; return state/4294967296; };
}

// Load existing pure geographic helpers without constructing a WebGL DOM.
function functionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  const body = source.indexOf('{', start);
  let depth = 1, end = body + 1;
  for (; end < source.length && depth; end += 1) {
    if (source[end] === '{') depth += 1;
    else if (source[end] === '}') depth -= 1;
  }
  assert.equal(depth, 0, `Incomplete ${name}`);
  return source.slice(start, end);
}
const radius = config.GLOBE_RADIUS;
assert.equal(radius, 12);
const latLonToVec3 = new Function('THREE', 'RADIUS', `return (${functionSource(globeSource, 'latLonToVec3')});`)(THREE, radius);
const overviewDistance = new Function(`return (${functionSource(globeSource, 'overviewDistance')});`)();
const boundaryGeometry = new Function('THREE', 'RADIUS', 'latLonToVec3', `return (${functionSource(globeSource, 'boundaryGeometry')});`)(THREE, radius, latLonToVec3);
const applyFramingSource = functionSource(globeSource, 'applyFraming');
const sourceGeometry = boundaryGeometry(countries);
const formationPositions = sourceGeometry.getAttribute('position').array;
assert.ok(formationPositions.length > 10000, 'Expected actual V3 country boundaries');

const origins = config.origins.map(origin => latLonToVec3(origin.lat, origin.lon, radius + .065));
assert.deepEqual(config.origins.map(origin => origin.name), ['Hlohovec', 'Cífer']);
for (const [index, origin] of config.origins.entries()) {
  assert.ok(Math.abs(origins[index].length() - radius - .065) < 1e-10);
  const recovered = THREE.MathUtils.radToDeg(Math.asin(origins[index].y / origins[index].length()));
  assert.ok(Math.abs(recovered - origin.lat) < 1e-9);
  assert.ok(origin.lat > 48 && origin.lat < 49 && origin.lon > 17 && origin.lon < 18);
}
const separationKm = origins[0].angleTo(origins[1]) * 6371;
assert.ok(separationKm > 20 && separationKm < 35);
assert.deepEqual(STORY_PHASES.stars, [.37, .64]);
assert.deepEqual(STORY_PHASES.gather, [.735, .85]);

for (const count of [8000, 16000, 24000]) {
  const effect = createParticles({ count, mobile: count < 24000, formationPositions });
  const geometry = effect.group.children[0].geometry;
  for (const object of effect.group.children) {
    for (const [name, attribute] of Object.entries(object.geometry.attributes)) {
      assert.ok(attribute.array.every(Number.isFinite), `${name} has invalid GPU values`);
    }
    assert.ok(!Object.keys(object.material.uniforms).some(name => /time|clock|delta/i.test(name)), 'Effect has an independent clock');
  }
  for (const attribute of Object.values(geometry.attributes)) assert.equal(attribute.count, count);
  const starKinds = effect.group.children[1].geometry.getAttribute('aKind').array;
  assert.equal(starKinds.filter(kind => kind === 1).length, 2, 'Expected just two restrained star cores');
  assert.equal(starKinds.filter(kind => kind === 2).length, 2, 'Expected just two secondary halos');
  const formation = geometry.getAttribute('aFormation');
  const point = new THREE.Vector3();
  for (let i = 0; i < count; i += 1) {
    point.fromBufferAttribute(formation, i);
    assert.ok(Math.abs(point.length() - radius - .045) < .0001, 'Formation lost its geographic surface target');
  }

  const heart = geometry.getAttribute('aHeart');
  const heartSeeds = geometry.getAttribute('aHeartSeed');
  const active = geometry.getAttribute('aHeartActive');
  const expectedCount = count <= 8000 ? 5200 : count < 24000 ? 9000 : 14000;
  assert.equal([...active.array].filter(Boolean).length, expectedCount, 'First-prototype heart density changed');
  assert.ok(!geometry.hasAttribute('aHeartMeta'), 'Later contour/cloud categories remain');
  assert.equal(effect.group.children[0].material.fragmentShader, originalPointFragment);
  assert.ok(!/lightWave|heartbeat|bodyWave|cloudStructure|glint/.test(effect.group.children[0].material.vertexShader), 'Later heart effects remain');
  const historical = originalRandom();
  let interior = 0;
  for (let i = 0; i < count; i += 1) {
    let draws = 0;
    const original = heartPoint(() => { draws += 1; return historical(); });
    historical(); historical(); // The original direction samples, then its seeds.
    const expectedSeed = [historical(), historical(), historical()];
    for (let axis = 0; axis < 3; axis += 1) assert.ok(Math.abs(heartSeeds.array[i*3+axis]-expectedSeed[axis]) < 6e-8, 'Original brightness/size seed changed');
    const [x,y,z] = original;
    const cleft = .028 * Math.exp(-x*x/.025) * THREE.MathUtils.smoothstep(y,.55,.88);
    const tip = .018 * THREE.MathUtils.smoothstep(-y,.92,1.11);
    const expected = [x*.90,(y-cleft+tip)*.96,z*.91];
    for (let axis = 0; axis < 3; axis += 1) assert.ok(Math.abs(heart.array[i*3+axis]-expected[axis]) < 1.2e-7, 'Heart differs from original samples plus the documented geometry refinement');
    assert.equal(active.getX(i), i < expectedCount ? 1 : 0);
    if (i < expectedCount) {
      if (draws === 4) interior += 1;
      assert.ok(heartField(x,y+.13,z) < .00002, 'Original volumetric surface was lost');
    }
  }
  assert.ok(interior > expectedCount*.15 && interior < expectedCount*.21, 'Original 82% shell / 18% interior distribution changed');
  const size = new THREE.Box3().setFromBufferAttribute(heart).getSize(new THREE.Vector3());
  assert.ok(size.x > 2.02 && size.x <= HEART_BOUNDS.width, 'Refined heart exceeds the unchanged horizontal framing');
  assert.ok(size.y > 2.08 && size.y <= HEART_BOUNDS.height, 'Refined proportions lost their height');
  assert.ok(size.z > 1.18 && size.z <= HEART_BOUNDS.depth, 'Original spatial volume was replaced by a flat or shallow cloud');
  assert.ok(size.x / size.y < .99, 'Heart became too wide');
  effect.dispose();
  assert.equal(effect.group.children.length, 0);
}

const effect = createParticles({ count: 16000, mobile: true, formationPositions });
const snapshots = effect.group.children.map(object => ({
  uuid: object.geometry.uuid,
  attributes: Object.fromEntries(Object.entries(object.geometry.attributes).map(([name, attribute]) => [name, attribute.array])),
}));
const homeDirection = latLonToVec3((config.origins[0].lat + config.origins[1].lat) / 2, (config.origins[0].lon + config.origins[1].lon) / 2, 1);
const startDirection = latLonToVec3(30, 15, 1);
const choreography = createChoreography({ homeDirection, startDirection, radius });
const color = new THREE.Color('#303D29');
const star = new THREE.Vector3(), projected = new THREE.Vector3();
const earthCenter = new THREE.Vector3();
const starProjections = [new THREE.Vector3(), new THREE.Vector3()];
let minimumCamera = Infinity, minimumStarRadius = Infinity, minimumStarDepth = Infinity, edgeMargin = Infinity;
let minimumSeparateCores = Infinity;
const viewports = [[390, 844], [430, 932], [844, 390], [1440, 720], [1440, 900]];

function snapshot(camera, pose) {
  const uniforms = effect.group.children[0].material.uniforms;
  return [...camera.position, ...camera.quaternion, ...pose.basis, ...uniforms.uMerge.value,
    ...uniforms.uBasis.value.elements, ...uniforms.uStarBasis.value.elements,
    uniforms.uProgress.value, uniforms.uScale.value, uniforms.uFormationRotation.value,
    uniforms.uTrailReveal.value, uniforms.uTrailSpread.value, uniforms.uStarCoreLimit.value,
    uniforms.uStarHaloLimit.value, uniforms.uStarGrainLimit.value, uniforms.uStarHaloOpacity.value,
    pose.globeOpacity, pose.geographyOpacity,
    ...effect.group.children.map(object => Number(object.visible))];
}

for (const [width, height] of viewports) {
  const camera = new THREE.PerspectiveCamera(45, width / height, .1, 1000);
  new Function('camera', `return (${applyFramingSource});`)(camera)(width, height);
  const fixedBasis = choreography.sample(0, { width, height, overviewDistance }).basis.toArray();
  const states = [];
  let greatestSilhouetteExcursion = 0;
  let previousFormationRotation = -Infinity;
  const evaluate = progress => {
    const pose = choreography.sample(progress, { width, height, overviewDistance, heartBounds: HEART_BOUNDS });
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    effect.update({ progress, origins, merge: pose.merge, heartScale: pose.heartScale, color, basis: camera.quaternion, starBasis: pose.basis, formationRotation: pose.formationRotation });
    return pose;
  };
  for (let i = 0; i <= 1000; i += 1) {
    const progress = i / 1000, pose = evaluate(progress);
    const cameraRadius = camera.position.length();
    minimumCamera = Math.min(minimumCamera, cameraRadius);
    assert.ok(cameraRadius >= radius + 4.2 - 1e-9, `Camera too close at ${width}×${height} p=${progress}`);
    assert.ok(cameraRadius > radius * 1.25, 'Story camera violates the existing minimum zoom safety distance');
    assert.deepEqual(pose.basis.toArray(), fixedBasis, 'Star frame follows the moving camera');
    assert.ok(pose.heartScale > 0);
    const uniforms = effect.group.children[0].material.uniforms;
    assert.ok(Math.abs(uniforms.uFormationRotation.value - pose.formationRotation) < 1e-12, 'Geography and particle formation have different axes');
    assert.ok(pose.formationRotation >= previousFormationRotation, 'Formation spin reverses during settling');
    previousFormationRotation = pose.formationRotation;
    if (progress === 0) assert.equal(pose.formationRotation, -Math.PI * 1.25);
    if (progress >= .18) assert.ok(Math.abs(pose.formationRotation) < 1e-12, 'Formation rotation leaks into geographic coordinates');
    assert.ok(uniforms.uTrailSpread.value <= .030, 'Trail width scales into a close-up particle cloud');
    if (progress >= .367 && progress <= .415) {
      assert.equal(uniforms.uTrailReveal.value, 0, 'Stationary origin renders a cluster of delayed tail particles');
      assert.ok(uniforms.uStarCoreLimit.value < 3.7, 'Close-up star core is oversized');
      assert.ok(uniforms.uStarHaloLimit.value < 11.2 && uniforms.uStarHaloOpacity.value < .10, 'Close-up halo is too heavy');
    }
    if (progress >= .465) assert.equal(uniforms.uTrailReveal.value, 1, 'Moving stars should reveal their wake');
    for (const [index, object] of effect.group.children.entries()) {
      assert.equal(object.geometry.uuid, snapshots[index].uuid);
      for (const [name, attribute] of Object.entries(object.geometry.attributes)) {
        assert.equal(attribute.array, snapshots[index].attributes[name], 'Update recreated a GPU attribute');
      }
    }
    if (progress >= .367 && progress <= .66) {
      for (let index = 0; index < 2; index += 1) {
        effect.sampleStarPath(progress, index, star);
        minimumStarRadius = Math.min(minimumStarRadius, star.length());
        assert.ok(star.length() >= radius + .064, 'Star entered Earth');
        projected.copy(star).applyMatrix4(camera.matrixWorldInverse);
        minimumStarDepth = Math.min(minimumStarDepth, -projected.z);
        assert.ok(projected.z < -.1, 'Star crossed behind the camera');
        projected.copy(star).project(camera);
        starProjections[index].copy(projected);
        assert.ok(Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1, `Star left viewport ${width}×${height} p=${progress}`);
        edgeMargin = Math.min(edgeMargin, (1 - Math.abs(projected.x)) * width / 2, (1 - Math.abs(projected.y)) * height / 2);
        if (progress >= .50 && progress < .64) {
          earthCenter.set(0, 0, 0).project(camera);
          const projectedDistance = Math.hypot((projected.x - earthCenter.x) * width / 2, (projected.y - earthCenter.y) * height / 2);
          const projectedEarthRadius = radius / Math.sqrt(cameraRadius * cameraRadius - radius * radius) * height * camera.projectionMatrix.elements[5] / 2;
          greatestSilhouetteExcursion = Math.max(greatestSilhouetteExcursion, projectedDistance / projectedEarthRadius);
        }
      }
      if (progress >= .50 && progress < .638) {
        const dx = (starProjections[0].x - starProjections[1].x) * width / 2;
        const dy = (starProjections[0].y - starProjections[1].y) * height / 2;
        assert.ok(dx > 0, `Stars cross before the deliberate merger at ${width}×${height} p=${progress}`);
        if (progress <= .61) {
          const separation = Math.hypot(dx, dy);
          minimumSeparateCores = Math.min(minimumSeparateCores, separation);
          assert.ok(separation >= 20, `Star cores overlap early at ${width}×${height} p=${progress}`);
        }
      }
    }
    states.push(snapshot(camera, pose));
  }
  assert.ok(greatestSilhouetteExcursion > 1.04, `Flight never visibly clears Earth at ${width}×${height}`);
  for (let i = 1000; i >= 0; i -= 1) assert.deepEqual(snapshot(camera, evaluate(i / 1000)), states[i], `Not reversible at p=${i / 1000}`);
  for (let index = 0; index < 2; index += 1) {
    const pose = evaluate(.37);
    assert.ok(effect.sampleStarPath(.37, index, star).distanceTo(origins[index]) < 1e-10);
    assert.ok(effect.sampleStarPath(.64, index, star).distanceTo(pose.merge) < 1e-10);
  }
  const final = evaluate(1);
  assert.equal(final.finalReveal, 1); assert.equal(final.globeOpacity, 1); assert.equal(final.geographyOpacity, 1);
  assert.ok(effect.group.children.every(object => !object.visible), 'Particles remain at final handoff');
  assert.ok(Math.abs(camera.position.length() - overviewDistance(width, height)) < 1e-9);
}

effect.dispose(); sourceGeometry.dispose();
console.log('PASS — finite GPU particles, original 5,200 / 9,000 / 14,000 heart density, original random samples and size/brightness seeds.');
console.log('PASS — 2f7b1ed sampler/sprite checksum, original shell/interior volume, restrained geometry-only proportions; no later cloud or light-wave effects.');
console.log('PASS — stable geometries/attributes; no independent clock; 1,001 forward/backward states identical across five viewports.');
console.log(`PASS — origins ${separationKm.toFixed(2)} km apart; minimum camera radius ${minimumCamera.toFixed(3)}; minimum star radius ${minimumStarRadius.toFixed(3)}.`);
console.log(`PASS — star depth ≥${minimumStarDepth.toFixed(2)}, edge clearance ≥${edgeMargin.toFixed(1)} px; fixed trajectory basis; clean final globe handoff.`);
console.log(`PASS — distinct star cores remain ≥${minimumSeparateCores.toFixed(1)} px apart through p=.61, without crossing before the p=.64 merger.`);
console.log('PASS — synchronized 225° formation spin settles to identity; clean two-core liftoff, no stationary trail cloud, restrained halo and narrow world-space wake.');
