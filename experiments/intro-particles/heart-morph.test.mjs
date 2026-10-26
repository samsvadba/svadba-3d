// Focused numerical checks for the two-heart union and geographic reformation.
// Uses the actual rendered poses, particle attributes and existing V3 camera.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import config from '../../config-v3.js';
import { createParticles, sampleHeartPose, HEART_BOUNDS } from './particles.js';
import { createChoreography } from './choreography.js';

const globeSource = await readFile(new URL('./globe.js', import.meta.url), 'utf8');
const prototypeSource = await readFile(new URL('./main.js', import.meta.url), 'utf8');
const nativeSource = await readFile(new URL('../../intro-particles-v3.js', import.meta.url), 'utf8');
const countries = JSON.parse(await readFile(new URL('../../countries-v3.json', import.meta.url), 'utf8'));
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
const radius = config.GLOBE_RADIUS;
const latLonToVec3 = new Function('THREE', 'RADIUS', `return (${sourceFunction('latLonToVec3')})`)(THREE, radius);
const overviewDistance = new Function(`return (${sourceFunction('overviewDistance')})`)();
const boundaryGeometry = new Function('THREE', 'RADIUS', 'latLonToVec3', `return (${sourceFunction('boundaryGeometry')})`)(THREE, radius, latLonToVec3);
const geometrySource = boundaryGeometry(countries);
const origins = config.origins.map(origin => latLonToVec3(origin.lat, origin.lon, radius + .065));
const homeDirection = latLonToVec3((config.origins[0].lat + config.origins[1].lat) / 2,
  (config.origins[0].lon + config.origins[1].lon) / 2, 1);
const choreography = createChoreography({ homeDirection, startDirection: latLonToVec3(30, 15, 1), radius });
const effect = createParticles({ count: 42000, mobile: true, formationPositions: geometrySource.getAttribute('position').array });
const particles = effect.group.children[0], geometry = particles.geometry, uniforms = particles.material.uniforms;
const shader = particles.material.vertexShader;
const heart = geometry.getAttribute('aHeart'), sides = geometry.getAttribute('aHeartSide');
const active = geometry.getAttribute('aHeartActive'), geography = geometry.getAttribute('aFormation');
const explosion = geometry.getAttribute('aExplosion');
const attributes = Object.fromEntries(Object.entries(geometry.attributes).map(([key, value]) => [key, value.array]));
const poseA = { center: new THREE.Vector3(), scale: 1, angle: 0 };
const poseB = { center: new THREE.Vector3(), scale: 1, angle: 0 };
const color = new THREE.Color('#303D29');

// Two equally dense clouds reuse the original sampler and random streams.
let densityA = 0, densityB = 0;
for (let i = 0; i < heart.count; i++) {
  assert.equal(sides.getX(i), i % 2 ? -1 : 1, 'A new random stream changed twin membership');
  if (active.getX(i)) sides.getX(i) > 0 ? densityA++ : densityB++;
}
assert.equal(densityA, 11000); assert.equal(densityB, 11000);
assert.match(shader, /mix\(uHeartCenterB,\s*uHeartCenterA,\s*heartSide\)/);
assert.match(shader, /mix\(uHeartAngleB,\s*uHeartAngleA,\s*heartSide\)/);
assert.match(shader, /turn\s*\*\s*aHeart\s*\*\s*uHeartScale\s*\+\s*heartCenter/);
assert.match(shader, /worldPosition\s*=\s*mix\(worldPosition,\s*aFormation,\s*reform\)\s*\+\s*curl/,
  'Geography must be the actual world-space target, without the heart basis or offset');
assert.match(shader, /vec3 curl\s*=\s*cross\(aExplosion,\s*aFormation\s*\/\s*max\(length\(aFormation\),\s*0\.0001\)\)[\s\S]*?sin\(reform\s*\*\s*3\.14159265\)/,
  'The reversible curl must vanish at both geographic morph endpoints');
assert.match(shader, /\(1\.0\s*-\s*aHeartActive\)\s*\*\s*smoothPhase\(0\.935,\s*0\.955\)/,
  'Extra formation particles must arrive from zero opacity after drawRange restoration');
assert.match(shader, /\*\s*formationVisibility\(worldPosition,\s*cameraPosition,\s*uGlobeRadius,\s*uFormationSurface\)/);
for (const source of [prototypeSource, nativeSource]) {
  assert.match(source, /formationSurface\s*:\s*score\s*>=\s*\.935\s*\?\s*pose\.globeOpacity\s*:\s*pose\.globeReveal/,
    'Final cloud hemisphere visibility must track the actual returning solid globe');
}

function snapshot(progress) {
  effect.update({ progress, origins, merge: new THREE.Vector3(0, 0, 20), color });
  assert.equal(sampleHeartPose(progress, 1, poseA), poseA, 'Pose sampling allocates/replaces its output');
  assert.equal(sampleHeartPose(progress, -1, poseB), poseB);
  assert.deepEqual(uniforms.uHeartCenterA.value.toArray(), poseA.center.toArray());
  assert.deepEqual(uniforms.uHeartCenterB.value.toArray(), poseB.center.toArray());
  assert.equal(uniforms.uHeartAngleA.value, poseA.angle);
  assert.equal(uniforms.uHeartAngleB.value, poseB.angle);
  assert.equal(uniforms.uHeartScale.value, poseA.scale);
  assert.equal(poseA.scale, poseB.scale, 'The fused clouds cannot have different scales');
  assert.ok([...poseA.center, ...poseB.center, poseA.scale, poseA.angle, poseB.angle].every(Number.isFinite));
  assert.equal(particles.material.depthTest, progress >= .18 && (progress < .935 || progress >= 1));
  assert.equal(geometry.drawRange.count, progress < .18 || progress >= .935 ? 42000 : 30000);
  for (const [key, value] of Object.entries(geometry.attributes)) assert.equal(value.array, attributes[key], 'Morph recreated a GPU attribute');
  return [...poseA.center, ...poseB.center, poseA.scale, poseA.angle, poseB.angle,
    Number(particles.visible), Number(particles.material.depthTest), geometry.drawRange.count];
}
const states = [];
let previousScale = 0;
for (let step = 0; step <= 1000; step++) {
  const progress = .64 + .36 * step / 1000;
  states.push(snapshot(progress));
  assert.ok(poseA.center.clone().add(poseB.center).length() < 1e-12, 'The twins lost their balanced trajectories');
  if (progress <= .915) {
    assert.ok(poseA.scale >= previousScale - 1e-12, 'Twin growth reverses before their union');
    previousScale = poseA.scale;
  }
  if (progress >= .915) {
    assert.ok(poseA.center.length() < 1e-12 && poseB.center.length() < 1e-12, 'Two displaced hearts remain after the union');
    assert.equal(poseA.angle, poseB.angle, 'The union retains two different orientations');
  }
}
for (let step = 1000; step >= 0; step--) {
  assert.deepEqual(snapshot(.64 + .36 * step / 1000), states[step], 'Morph changes when scrubbing backward');
}
// Explicitly re-enter the final state after the reverse traversal.
snapshot(1);
assert.ok(effect.group.children.every(object => !object.visible), 'Particles remain at the final handoff');
snapshot(.83);
const fixedPose = [...uniforms.uHeartCenterA.value, ...uniforms.uHeartCenterB.value, uniforms.uHeartScale.value];
for (const hex of ['#292a28', '#ece9df', '#303D29', '#F4EBDC']) {
  effect.update({ progress: .83, origins, merge: new THREE.Vector3(0, 0, 20), color: color.set(hex) });
  assert.deepEqual([...uniforms.uHeartCenterA.value, ...uniforms.uHeartCenterB.value, uniforms.uHeartScale.value], fixedPose,
    'Theme changes reset the current heart poses');
}

// Project every actual active particle through each supported camera, including
// the moving two-heart silhouettes and the short united-heart passage.
const point = new THREE.Vector3(), viewPoint = new THREE.Vector3(), axis = new THREE.Vector3(0, 1, 0);
const viewports = [[390,844], [430,932], [844,390], [1440,720], [1440,900]];
let edgeClearance = Infinity, minimumDepth = Infinity, maximumWidth = 0;
for (const [width, height] of viewports) {
  const camera = new THREE.PerspectiveCamera(45, width / height, .1, 1000);
  new Function('camera', `return (${sourceFunction('applyFraming')})`)(camera)(width, height);
  for (let step = 0; step <= 70; step++) {
    const progress = .795 + .14 * step / 70;
    const pose = choreography.sample(progress, { width, height, overviewDistance, heartBounds: HEART_BOUNDS });
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    effect.update({ progress, origins, merge: pose.merge, heartScale: pose.heartScale, color,
      basis: camera.quaternion, starBasis: pose.basis, formationSurface: pose.globeReveal });
    const centers = [uniforms.uHeartCenterA.value, uniforms.uHeartCenterB.value];
    const angles = [uniforms.uHeartAngleA.value, uniforms.uHeartAngleB.value];
    let left = Infinity, right = -Infinity;
    for (let i = 0; i < heart.count; i++) {
      if (!active.getX(i)) continue;
      const index = sides.getX(i) > 0 ? 0 : 1;
      point.fromBufferAttribute(heart, i).applyAxisAngle(axis, angles[index])
        .multiplyScalar(uniforms.uHeartScale.value).add(centers[index])
        .multiplyScalar(pose.heartScale).applyQuaternion(camera.quaternion).add(pose.merge);
      const depth = -viewPoint.copy(point).applyMatrix4(camera.matrixWorldInverse).z;
      minimumDepth = Math.min(minimumDepth, depth);
      assert.ok(depth > camera.near, `Heart crossed the camera: ${width}×${height}, p=${progress}, point=${i}`);
      point.project(camera);
      assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
        `Heart left viewport: ${width}×${height}, p=${progress}, point=${i}, NDC=${point.toArray()}`);
      edgeClearance = Math.min(edgeClearance, (1 - Math.abs(point.x)) * width / 2, (1 - Math.abs(point.y)) * height / 2);
      left = Math.min(left, point.x); right = Math.max(right, point.x);
    }
    maximumWidth = Math.max(maximumWidth, (right - left) * width / 2);
  }
}

// Geographic positions come directly from real V3 boundaries. The final shader
// endpoint has zero curl and no residual heart center/orientation transform.
for (let i = 0; i < geography.count; i++) {
  point.fromBufferAttribute(geography, i);
  assert.ok(Math.abs(point.length() - radius - .045) < 1e-4);
  const curl = new THREE.Vector3().fromBufferAttribute(explosion, i).cross(point.clone().normalize());
  const endpoint = new THREE.Vector3(50, -70, 90).lerp(point, 1)
    .addScaledVector(curl, Math.sin(Math.PI) * 6 * .16);
  assert.ok(endpoint.distanceTo(point) < 1e-12, 'Final point retains an offset from the geographic surface');
}
effect.dispose(); geometrySource.dispose();
console.log(`PASS — two balanced 11,000-point hearts use the actual GPU poses, join exactly and keep every existing GPU attribute.`);
console.log(`PASS — 1,001 forward/back states and all four palette variants preserve the current morph; final draw/depth visibility is clean.`);
console.log(`PASS — all actual heart points remain visible over five viewports; edge clearance ≥${edgeClearance.toFixed(1)} px, camera depth ≥${minimumDepth.toFixed(2)}; maximum projected width ${maximumWidth.toFixed(0)} px.`);
console.log('PASS — geographic morph targets real V3 world-space boundaries; endpoint curl vanishes; analytic visibility follows returning globe opacity.');
