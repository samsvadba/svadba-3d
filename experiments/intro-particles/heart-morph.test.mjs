// Focused checks for two luminous pens drawing small hearts, their opposed
// flight and impact, then direct geographic reformation without a large heart.
// Uses the rendered poses, actual ribbon geometry and existing V3 camera.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import config from '../../config-v3.js';
import { createParticles, sampleHeartPose, HEART_BOUNDS } from './particles.js';
import { createChoreography } from './choreography.js';
import { sampleHeartTrace, sampleHeartContour, HEART_TRACE_SEGMENTS } from './heart-light-trails.js';
import { toStoryProgress, STORY_DURATION } from './pacing.js';

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
const marker = geometry.getAttribute('aMarker'), markerActive = geometry.getAttribute('aMarkerActive');
const explosion = geometry.getAttribute('aExplosion');
const attributes = Object.fromEntries(Object.entries(geometry.attributes).map(([key, value]) => [key, value.array]));
const ribbon = effect.group.getObjectByName('two-light-drawn-heart-contours');
const pens = effect.group.getObjectByName('two-heart-tracing-light-cores');
assert.ok(ribbon?.isMesh && pens?.isPoints, 'Missing the continuous light stroke or its luminous pens');
assert.equal(ribbon.geometry.getAttribute('position').count, HEART_TRACE_SEGMENTS * 6 * 2);
assert.equal(pens.geometry.getAttribute('position').count, 4, 'Only two cores and their subtle halos are needed');
assert.equal(ribbon.material.uniforms, uniforms); assert.equal(pens.material.uniforms, uniforms);
const lightAttributes = [ribbon, pens].map(object => Object.fromEntries(
  Object.entries(object.geometry.attributes).map(([key, value]) => [key, value.array])));
const poseA = { center: new THREE.Vector3(), scale: 1, angle: 0 };
const poseB = { center: new THREE.Vector3(), scale: 1, angle: 0 };
const trace = { reveal: 0, coreAlpha: 0, tipWeight: 0, tip: new THREE.Vector3() };
const color = new THREE.Color('#303D29');

// The original large-heart sampler and random streams remain available. The
// small hearts use only the native badge contour and a few faint inner points.
let densityA = 0, densityB = 0;
let outlineCount = 0, innerCount = 0;
const markerCounts = [0, 0];
for (let i = 0; i < heart.count; i++) {
  assert.equal(sides.getX(i), i % 2 ? -1 : 1, 'A new random stream changed twin membership');
  if (active.getX(i)) sides.getX(i) > 0 ? densityA++ : densityB++;
  if (markerActive.getX(i)) {
    markerCounts[sides.getX(i) > 0 ? 0 : 1]++;
    if (markerActive.getX(i) > .5) outlineCount++; else innerCount++;
  }
}
assert.equal(densityA, 11000); assert.equal(densityB, 11000);
assert.deepEqual(markerCounts, [180, 180]);
assert.equal(outlineCount, 312); assert.equal(innerCount, 48);
// The ribbon and pen share the same closed contour as the existing globe badge;
// no raster image, wide WebGL line or dense particle cloud forms the small heart.
const ribbonPoints = ribbon.geometry.getAttribute('position');
const ribbonFractions = ribbon.geometry.getAttribute('aU');
const contourPoint = new THREE.Vector3();
for (let i = 0; i < ribbonPoints.count; i++) {
  const fraction = ribbonFractions.getX(i);
  sampleHeartContour(fraction, contourPoint);
  assert.ok(contourPoint.distanceTo(new THREE.Vector3().fromBufferAttribute(ribbonPoints, i)) < 1e-5,
    'Stroke geometry and the drawing pen follow different contours');
  const nativeIndex = Math.round(fraction * HEART_TRACE_SEGMENTS) % HEART_TRACE_SEGMENTS;
  assert.ok(Math.hypot(ribbonPoints.getX(i) - marker.getX(nativeIndex * 2),
    ribbonPoints.getY(i) - marker.getY(nativeIndex * 2)) < 1e-5, 'The native heart silhouette changed');
}
assert.ok(sampleHeartContour(0, contourPoint).distanceTo(sampleHeartContour(1, new THREE.Vector3())) < 1e-12,
  'The traced stroke does not close cleanly');
assert.match(ribbon.material.fragmentShader, /if\s*\(vU\s*>\s*uHeartTrace\)\s*discard/,
  'Unrevealed parts of the contour must stay hidden');
assert.match(ribbon.material.vertexShader, /uPixelRatio\s*\*\s*2\.0\s*\/\s*uViewport\s*\*\s*clip\.w/,
  'The thin screen-space stroke must preserve its CSS width on Retina displays');
assert.match(pens.material.vertexShader, /heartWorld\(uHeartTip\s*\*\s*uHeartTipWeight,\s*aSide\)/);
assert.match(shader, /dust\s*=\s*vAlpha\s*\*\s*\(1\.0\s*-\s*smoothPhase\(0\.70,\s*0\.735\)\)/,
  'The previous particle explosion must clear before the clean stroke is drawn');
assert.match(shader, /step\(0\.965,\s*aHeartSeed\.x\)/,
  'Only a few secondary sparks may accompany the stroke, rather than a dense tiny blob');
assert.match(shader, /mix\(uHeartCenterB,\s*uHeartCenterA,\s*heartSide\)/);
assert.match(shader, /mix\(uHeartAngleB,\s*uHeartAngleA,\s*heartSide\)/);
assert.match(shader, /turn\s*\*\s*aMarker\s*\*\s*uMarkerScale\s*\*\s*uScale/);
assert.match(shader, /marker\s*\+\s*heartCenter\s*\*\s*uScale/);
assert.doesNotMatch(shader, /vec3\s+heart\s*=/, 'The large shared heart must never be a rendered destination');
assert.match(shader, /heartImpact\s*=\s*phase\(0\.87,\s*0\.895\)/);
assert.match(shader, /impactReveal\s*=\s*smoothPhase\(0\.87,\s*0\.882\)/);
assert.doesNotMatch(shader, /bigGather|shatter/, 'No large-heart regather/dwell/shatter passage may remain');
assert.match(shader, /localPosition\s*=\s*debris/);
assert.match(shader, /reform\s*=\s*smoothPhase\(0\.895,\s*0\.995\)/, 'The impact must lead directly into geographic reformation');
assert.match(shader, /worldPosition\s*=\s*mix\(worldPosition,\s*aFormation,\s*reform\)\s*\+\s*curl/,
  'Geography must be the actual world-space target, without the heart basis or offset');
assert.match(shader, /vec3 curl\s*=\s*cross\(aExplosion,\s*aFormation\s*\/\s*max\(length\(aFormation\),\s*0\.0001\)\)[\s\S]*?sin\(reform\s*\*\s*3\.14159265\)/,
  'The reversible curl must vanish at both geographic morph endpoints');
assert.match(shader, /vAlpha\s*=\s*mix\(markerAlpha\s*\*\s*sparkMask,\s*vAlpha,\s*impactReveal\)/,
  'Restored particle density must fade in continuously from marker-only alpha');
assert.match(shader, /\*\s*formationVisibility\(worldPosition,\s*cameraPosition,\s*uGlobeRadius,\s*uFormationSurface\)/);
for (const source of [prototypeSource, nativeSource]) {
  assert.match(source, /formationSurface\s*:\s*score\s*>=\s*\.87\s*\?\s*pose\.globeOpacity\s*:\s*pose\.globeReveal/,
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
  const tip = trace.tip;
  assert.equal(sampleHeartTrace(progress, trace), trace, 'Trace sampling allocates/replaces its output');
  assert.equal(trace.tip, tip, 'Trace sampling replaced its cached tip vector');
  assert.equal(uniforms.uHeartTrace.value, trace.reveal);
  assert.equal(uniforms.uHeartCoreAlpha.value, trace.coreAlpha);
  assert.equal(uniforms.uHeartTipWeight.value, trace.tipWeight);
  assert.deepEqual(uniforms.uHeartTip.value.toArray(), trace.tip.toArray());
  assert.equal(ribbon.visible, progress > .735 && progress < .874);
  assert.equal(pens.visible, progress > .685 && progress < .803);
  assert.ok([...poseA.center, ...poseB.center, poseA.scale, poseA.angle, poseB.angle].every(Number.isFinite));
  assert.equal(particles.material.depthTest, progress >= .18 && (progress < .87 || progress >= 1));
  assert.equal(geometry.drawRange.count, progress < .18 || progress >= .87 ? 42000
    : progress >= .735 && progress < .87 ? 360 : 30000);
  for (const [key, value] of Object.entries(geometry.attributes)) assert.equal(value.array, attributes[key], 'Morph recreated a GPU attribute');
  for (const [index, object] of [ribbon, pens].entries()) {
    for (const [key, value] of Object.entries(object.geometry.attributes)) {
      assert.equal(value.array, lightAttributes[index][key], 'Trace animation recreated a GPU attribute');
    }
  }
  return [...poseA.center, ...poseB.center, poseA.scale, poseA.angle, poseB.angle,
    trace.reveal, trace.coreAlpha, trace.tipWeight, ...trace.tip,
    Number(ribbon.visible), Number(pens.visible), Number(particles.visible),
    Number(particles.material.depthTest), geometry.drawRange.count];
}
const states = [];
for (let step = 0; step <= 1000; step++) {
  const progress = .64 + .36 * step / 1000;
  states.push(snapshot(progress));
  assert.ok(poseA.center.clone().add(poseB.center).length() < 1e-12, 'The twins lost their balanced trajectories');
  assert.equal(poseA.scale, 1, 'The compact markers must never grow into a shared large heart');
  if (progress >= .87) {
    assert.ok(poseA.center.length() < 1e-12 && poseB.center.length() < 1e-12, 'Two displaced hearts remain after impact');
    assert.equal(poseA.angle, poseB.angle, 'The single cloud retains two different orientations');
  }
}
for (let step = 1000; step >= 0; step--) {
  assert.deepEqual(snapshot(.64 + .36 * step / 1000), states[step], 'Morph changes when scrubbing backward');
}
// Pens first split from the impact, draw a closed outline in about half a second,
// then fade away. The finished small hearts move only after tracing is complete.
const heldCenter = sampleHeartPose(.735, 1, poseA).center.clone();
let previousReveal = -1;
const previousTip = new THREE.Vector3();
for (let step = 0; step <= 200; step++) {
  const progress = .735 + .06 * step / 200;
  sampleHeartTrace(progress, trace);
  assert.ok(trace.reveal >= previousReveal && trace.reveal >= 0 && trace.reveal <= 1,
    'The stroke jumped backward or outside its closed contour');
  previousReveal = trace.reveal;
  assert.ok(sampleHeartPose(progress, 1, poseA).center.distanceTo(heldCenter) < 1e-12,
    'The hearts start flying before their outlines have been drawn');
  assert.equal(trace.coreAlpha, 1, 'The drawing tip disappears before completing the stroke');
  if (step) assert.ok(trace.tip.distanceTo(previousTip) < .06,
    'The luminous pen skips along the contour instead of tracing it continuously');
  previousTip.copy(trace.tip);
}
assert.equal(sampleHeartTrace(.735, trace).reveal, 0);
assert.equal(sampleHeartTrace(.795, trace).reveal, 1);
assert.equal(sampleHeartTrace(.803, trace).coreAlpha, 0, 'A luminous pen remains after the completed heart');
assert.equal(sampleHeartTrace(.735, trace).tipWeight, 1);
assert.equal(sampleHeartPose(.685, 1, poseA).center.length(), 0, 'Cores do not emerge from the original impact');
function secondsAtScore(score) {
  let low = 0, high = 1;
  for (let i = 0; i < 60; i++) {
    const middle = (low + high) / 2;
    if (toStoryProgress(middle) < score) low = middle; else high = middle;
  }
  return (low + high) / 2 * STORY_DURATION;
}
const traceSeconds = secondsAtScore(.795) - secondsAtScore(.735);
const flightSeconds = secondsAtScore(.87) - secondsAtScore(.795);
assert.ok(traceSeconds >= .5 && traceSeconds <= .6, `Tracing takes ${traceSeconds}s instead of about half a second`);
assert.ok(flightSeconds >= 2 && flightSeconds <= 2.3, `The opposed arcs take ${flightSeconds}s instead of a brief flight`);
// Opposed arcs have modest true depth and a gentle tilt, then arrive with impact
// velocity rather than easing to a halt before their centres touch.
const flightPoint = new THREE.Vector3();
let previousX = Infinity;
let maximumDepth = 0, maximumTilt = 0;
for (let step = 0; step <= 200; step++) {
  const progress = .795 + .075 * step / 200;
  sampleHeartPose(progress, 1, poseA);
  assert.ok(poseA.center.x <= previousX + 1e-12 && poseA.center.y >= -1e-12,
    'The finished hearts take a tangled loop rather than two clean opposing arcs');
  previousX = poseA.center.x;
  maximumDepth = Math.max(maximumDepth, poseA.center.z);
  maximumTilt = Math.max(maximumTilt, Math.abs(poseA.angle));
}
assert.ok(maximumDepth > .05 && maximumDepth <= .1, 'The small hearts lost their restrained spatial depth');
assert.ok(maximumTilt > .08 && maximumTilt <= 8 * Math.PI / 180, 'The heart tilt must remain subtle');
flightPoint.copy(sampleHeartPose(.87 - 1e-4, 1, poseA).center);
assert.ok(flightPoint.length() / 1e-4 > 10, 'The twins softly stop instead of striking each other');
assert.equal(sampleHeartPose(.87, 1, poseA).center.length(), 0);
assert.equal(sampleHeartPose(.87, -1, poseB).center.length(), 0);
// Explicitly re-enter the final state after the reverse traversal.
snapshot(1);
assert.ok(effect.group.children.every(object => !object.visible), 'Particles remain at the final handoff');
for (const progress of [.752, .77, .83]) {
  snapshot(progress);
  const fixedPose = [...uniforms.uHeartCenterA.value, ...uniforms.uHeartCenterB.value, uniforms.uHeartScale.value,
    uniforms.uHeartTrace.value, uniforms.uHeartCoreAlpha.value, uniforms.uHeartTipWeight.value, ...uniforms.uHeartTip.value];
  for (const [hex, dark] of [['#292a28', 0], ['#ece9df', 1], ['#303D29', 0], ['#F4EBDC', 1]]) {
    effect.update({ progress, origins, merge: new THREE.Vector3(0, 0, 20), color: color.set(hex), dark });
    assert.deepEqual([...uniforms.uHeartCenterA.value, ...uniforms.uHeartCenterB.value, uniforms.uHeartScale.value,
      uniforms.uHeartTrace.value, uniforms.uHeartCoreAlpha.value, uniforms.uHeartTipWeight.value, ...uniforms.uHeartTip.value], fixedPose,
      'Theme changes reset the current heart pose or drawing progress');
    assert.equal(ribbon.material.uniforms.uColor.value, uniforms.uColor.value);
    assert.equal(pens.material.uniforms.uColor.value, uniforms.uColor.value);
    assert.equal(ribbon.material.uniforms.uDark.value, dark);
    assert.equal(pens.material.uniforms.uDark.value, dark);
  }
}

// Project the ACTUAL marker samples through the camera and onBeforeRender sizing
// at DPR 1 and 3. The drawn contours remain compact and legible on a phone,
// instead of filling a quarter of the screen or becoming a dense point blob.
const point = new THREE.Vector3(), viewPoint = new THREE.Vector3(), axis = new THREE.Vector3(0, 1, 0);
const viewports = [[390,844], [430,932], [844,390], [1440,720], [1440,900]];
let edgeClearance = Infinity, minimumDepth = Infinity;
let minimumMarkerWidth = Infinity, maximumMarkerWidth = 0;
let minimumRibbonWidth = Infinity, maximumRibbonWidth = 0;
for (const [width, height] of viewports) {
  const camera = new THREE.PerspectiveCamera(45, width / height, .1, 1000);
  new Function('camera', `return (${sourceFunction('applyFraming')})`)(camera)(width, height);
  for (const dpr of [1, 3]) for (let step = 0; step <= 75; step++) {
    const progress = .735 + .1349 * step / 75;
    const pose = choreography.sample(progress, { width, height, overviewDistance, heartBounds: HEART_BOUNDS });
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    effect.update({ progress, origins, merge: pose.merge, heartScale: pose.heartScale, color,
      basis: camera.quaternion, starBasis: pose.basis, formationSurface: pose.globeReveal });
    particles.onBeforeRender({ getDrawingBufferSize: output => output.set(width * dpr, height * dpr),
      getPixelRatio: () => dpr }, null, camera);
    assert.deepEqual(uniforms.uViewport.value.toArray(), [width * dpr, height * dpr],
      'Ribbon extrusion uses a stale drawing-buffer size');
    const centers = [uniforms.uHeartCenterA.value, uniforms.uHeartCenterB.value];
    const angles = [uniforms.uHeartAngleA.value, uniforms.uHeartAngleB.value];
    const left = [Infinity, Infinity], right = [-Infinity, -Infinity];
    for (let i = 0; i < marker.count; i++) {
      if (!markerActive.getX(i)) continue;
      const index = sides.getX(i) > 0 ? 0 : 1;
      point.fromBufferAttribute(marker, i).applyAxisAngle(axis, angles[index])
        .multiplyScalar(uniforms.uMarkerScale.value).add(centers[index])
        .multiplyScalar(pose.heartScale).applyQuaternion(camera.quaternion).add(pose.merge);
      const depth = -viewPoint.copy(point).applyMatrix4(camera.matrixWorldInverse).z;
      minimumDepth = Math.min(minimumDepth, depth);
      assert.ok(depth > camera.near, `Heart crossed the camera: ${width}×${height}, p=${progress}, point=${i}`);
      point.project(camera);
      assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1,
        `Heart left viewport: ${width}×${height}, p=${progress}, point=${i}, NDC=${point.toArray()}`);
      edgeClearance = Math.min(edgeClearance, (1 - Math.abs(point.x)) * width / 2, (1 - Math.abs(point.y)) * height / 2);
      left[index] = Math.min(left[index], point.x); right[index] = Math.max(right[index], point.x);
    }
    for (let index = 0; index < 2; index++) {
      const markerWidth = (right[index] - left[index]) * width / 2;
      minimumMarkerWidth = Math.min(minimumMarkerWidth, markerWidth);
      maximumMarkerWidth = Math.max(maximumMarkerWidth, markerWidth);
      assert.ok(markerWidth >= 25 && markerWidth <= 32,
        `Marker size ${markerWidth.toFixed(2)}px at ${width}×${height}, DPR ${dpr}, p=${progress}`);
    }
    const ribbonLeft = [Infinity, Infinity], ribbonRight = [-Infinity, -Infinity];
    const ribbonSides = ribbon.geometry.getAttribute('aSide');
    for (let i = 0; i < ribbonPoints.count; i++) {
      const index = ribbonSides.getX(i) > 0 ? 0 : 1;
      point.fromBufferAttribute(ribbonPoints, i).applyAxisAngle(axis, angles[index])
        .multiplyScalar(uniforms.uMarkerScale.value).add(centers[index])
        .multiplyScalar(pose.heartScale).applyQuaternion(camera.quaternion).add(pose.merge);
      const depth = -viewPoint.copy(point).applyMatrix4(camera.matrixWorldInverse).z;
      assert.ok(depth > camera.near, 'The drawn heart contour crosses the camera');
      point.project(camera);
      // Include the outer, translucent ribbon's 1.55 CSS-pixel extrusion.
      const clearance = Math.min((1 - Math.abs(point.x)) * width / 2,
        (1 - Math.abs(point.y)) * height / 2) - 1.55;
      assert.ok(clearance > 0, `Drawn contour leaves viewport at ${width}×${height}, p=${progress}`);
      edgeClearance = Math.min(edgeClearance, clearance);
      ribbonLeft[index] = Math.min(ribbonLeft[index], point.x);
      ribbonRight[index] = Math.max(ribbonRight[index], point.x);
    }
    for (let index = 0; index < 2; index++) {
      const ribbonWidth = (ribbonRight[index] - ribbonLeft[index]) * width / 2;
      minimumRibbonWidth = Math.min(minimumRibbonWidth, ribbonWidth);
      maximumRibbonWidth = Math.max(maximumRibbonWidth, ribbonWidth);
      assert.ok(ribbonWidth >= 25 && ribbonWidth <= 32,
        `The clean stroke is not compact: ${ribbonWidth}px at ${width}×${height}, DPR ${dpr}`);
      assert.ok(Math.abs(ribbonWidth - (right[index] - left[index]) * width / 2) < .1,
        'Secondary sparks and the continuous stroke disagree on heart size');
    }
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
const released = new Set();
for (const object of [ribbon, pens]) for (const resource of [object.geometry, object.material]) {
  resource.addEventListener('dispose', () => released.add(resource));
}
effect.dispose(); geometrySource.dispose();
assert.equal(released.size, 4, 'The new stroke or pen geometry/material leaks on intro disposal');
console.log(`PASS — two luminous cores trace closed native-heart contours in ${traceSeconds.toFixed(2)}s, then fade; the finished hearts fly on short opposed arcs for ${flightSeconds.toFixed(2)}s.`);
console.log(`PASS — thin screen-space strokes and sparse sparks remain aligned; projected contours ${minimumRibbonWidth.toFixed(1)}–${maximumRibbonWidth.toFixed(1)}px, sparks ${minimumMarkerWidth.toFixed(1)}–${maximumMarkerWidth.toFixed(1)}px at DPR 1/3 over five viewports.`);
console.log('PASS — opposite spatial arcs end in a nonzero-speed collision, then debris reforms directly into the geographic globe; no large shared heart stage.');
console.log(`PASS — 1,001 forward/back states and all four palette variants preserve the current morph; final draw/depth visibility is clean.`);
console.log(`PASS — compact heart markers remain visible over five viewports; edge clearance ≥${edgeClearance.toFixed(1)} px, camera depth ≥${minimumDepth.toFixed(2)}.`);
console.log('PASS — geographic morph targets real V3 world-space boundaries; endpoint curl vanishes; analytic visibility follows returning globe opacity.');
