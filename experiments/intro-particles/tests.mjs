// Offline numerical checks: no browser, network or production mutations.
// node experiments/intro-particles/tests.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import config from '../../config-v3.js';
import { createParticles, HEART_BOUNDS } from './particles.js';
import { createChoreography, STORY_PHASES } from './choreography.js';

const globeSource = await readFile(new URL('./globe.js', import.meta.url), 'utf8');
const countries = JSON.parse(await readFile(new URL('../../countries-v3.json', import.meta.url), 'utf8'));
const heartSvg = await readFile(new URL('./heart-outline.svg', import.meta.url), 'utf8');
const heartPath = heartSvg.match(/<path\b[^>]*\bd="([^"]+)"/s)?.[1];
assert.ok(heartPath, 'Missing the supplied SVG heart fixture');
const heartNumbers = heartPath.match(/[-+]?(?:\d*\.)?\d+/g).map(Number);
assert.equal((heartNumbers.length - 2) % 6, 0, 'Unexpected cubic SVG path');
const referenceRaw = [];
let curveStart = heartNumbers.slice(0, 2);
for (let offset = 2; offset < heartNumbers.length; offset += 6) {
  const cubic = [curveStart, heartNumbers.slice(offset, offset + 2), heartNumbers.slice(offset + 2, offset + 4), heartNumbers.slice(offset + 4, offset + 6)];
  for (let step = 0; step < 256; step += 1) {
    const t = step / 256, s = 1 - t;
    referenceRaw.push([0, 1].map(axis => s ** 3 * cubic[0][axis] + 3 * s * s * t * cubic[1][axis] + 3 * s * t * t * cubic[2][axis] + t ** 3 * cubic[3][axis]));
  }
  curveStart = cubic[3];
}
const referenceX = referenceRaw.map(point => point[0]), referenceY = referenceRaw.map(point => point[1]);
const referenceMinX = Math.min(...referenceX), referenceMaxX = Math.max(...referenceX);
const referenceMinY = Math.min(...referenceY), referenceMaxY = Math.max(...referenceY);
const referenceCenter = [(referenceMinX + referenceMaxX) / 2, (referenceMinY + referenceMaxY) / 2];
const referenceScale = 1.92 / (referenceMaxX - referenceMinX);
const referenceCurve = referenceRaw.map(([x, y]) => [(x - referenceCenter[0]) * referenceScale, (referenceCenter[1] - y) * referenceScale]);
const referenceHeight = (referenceMaxY - referenceMinY) * referenceScale;
const referenceNotch = [(heartNumbers[0] - referenceCenter[0]) * referenceScale, (referenceCenter[1] - heartNumbers[1]) * referenceScale];
const referenceTip = referenceCurve.reduce((low, point) => point[1] < low[1] ? point : low, referenceCurve[0]);
assert.ok(1.92 / referenceHeight > 1.21 && 1.92 / referenceHeight < 1.22, 'SVG proportions must be preserved with uniform scaling');
const insideReference = ([x, y]) => {
  let result = false;
  for (let i = 0, j = referenceCurve.length - 1; i < referenceCurve.length; j = i++) {
    const a = referenceCurve[i], b = referenceCurve[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
};
const referenceGrid = new Map(), gridSize = .06;
const gridKey = (x, y) => `${Math.floor(x / gridSize)},${Math.floor(y / gridSize)}`;
for (const point of referenceCurve) {
  const key = gridKey(...point);
  if (!referenceGrid.has(key)) referenceGrid.set(key, []);
  referenceGrid.get(key).push(point);
}
const distanceToReference = ([x, y]) => {
  let minimum = Infinity;
  const column = Math.floor(x / gridSize), row = Math.floor(y / gridSize);
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (const point of referenceGrid.get(`${column + dx},${row + dy}`) || []) minimum = Math.min(minimum, Math.hypot(x - point[0], y - point[1]));
  }
  return minimum;
};

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
  const heartMeta = geometry.getAttribute('aHeartMeta');
  assert.ok(heartMeta && heartMeta.itemSize === 3, 'Heart populations need their own GPU metadata');
  const box = new THREE.Box3().setFromBufferAttribute(heart);
  const size = box.getSize(new THREE.Vector3());
  assert.ok(size.x >= 1.90 && size.x <= HEART_BOUNDS.width);
  assert.ok(size.y >= referenceHeight - .02 && size.y <= Math.min(1.85, HEART_BOUNDS.height), 'Heart lost the supplied SVG proportions or exceeds existing framing');
  assert.ok(size.z > .15 && size.z <= .24, 'Heart should have shallow 2.5D depth, not the former inflated volume');
  const groups = [[], [], []], contourBins = new Array(256);
  let leftLobe = -Infinity, rightLobe = -Infinity, cleft = Infinity;
  let lowTip = 0, tipX = 0, centralInterior = 0, front = 0, back = 0;
  for (let i = 0; i < count; i += 1) {
    const x = heart.getX(i), y = heart.getY(i), z = heart.getZ(i);
    const category = heartMeta.getX(i), seed = heartMeta.getY(i), arc = heartMeta.getZ(i);
    assert.ok(Number.isInteger(category) && category >= 0 && category <= 2, 'Unknown heart population');
    assert.ok(seed >= 0 && seed <= 1 && arc >= 0 && arc <= 1, 'Heart metadata outside normalized range');
    assert.ok(Math.abs(z) <= .12, 'Heart particle escapes its shallow depth envelope');
    groups[category].push([x, y, z]);
    if (category === 0) {
      if (x < -.25 && x > -.85) leftLobe = Math.max(leftLobe, y);
      if (x > .25 && x < .85) rightLobe = Math.max(rightLobe, y);
      cleft = Math.min(cleft, Math.hypot(x - referenceNotch[0], y - referenceNotch[1]));
      if (Math.abs(x - referenceTip[0]) < .14 && y < referenceTip[1] + .055) { lowTip += 1; tipX += x; }
      const bin = Math.min(255, Math.floor(arc * 256));
      contourBins[bin] ||= [x, y];
    }
    if (category === 1) {
      assert.ok(Math.abs(z) <= .07, 'Interior is too thick for an airy 2.5D heart');
      if (Math.hypot(x, y) < .25) centralInterior += 1;
    }
    if (z > .035) front += 1;
    if (z < -.035) back += 1;
  }
  assert.equal(groups[0].length, Math.floor(count * .58), 'Contour must contain 58% of particles');
  assert.equal(groups[1].length, Math.floor(count * .32), 'Airy interior must contain 32% of particles');
  assert.equal(groups[2].length, count - groups[0].length - groups[1].length, 'Ambient population must contain the remaining 10%');
  assert.ok(leftLobe > .74 && rightLobe > .74, 'Rounded SVG upper lobes are missing');
  assert.ok(cleft < .02 && referenceNotch[1] < leftLobe - .22 && referenceNotch[1] < rightLobe - .22, 'The supplied central cleft is not defined');
  assert.ok(lowTip > count * .003, 'The supplied pointed lower tip is missing');
  assert.ok(Math.abs(tipX / lowTip - referenceTip[0]) < .04, 'The SVG lower-tip asymmetry was lost');
  assert.ok(centralInterior > count * .004 && centralInterior < count * .07, 'Interior became empty or a dense central blob');
  assert.ok(front > count * .15 && back > count * .15, 'Shallow heart needs particles on both sides of its depth plane');
  assert.ok(contourBins.filter(Boolean).length > 248, 'Contour has visible gaps along its perimeter');
  const contourDistances = groups[0].map(distanceToReference);
  assert.ok(contourDistances.every(distance => distance < .055), 'Contour differs from the uniformly scaled supplied SVG');
  assert.ok(contourDistances.filter(distance => distance > .009).length > groups[0].length * .15, 'Contour became a thin mechanical single-width line');
  const contourBox = new THREE.Box2().setFromPoints(groups[0].map(([x, y]) => new THREE.Vector2(x, y)));
  const contourSize = contourBox.getSize(new THREE.Vector2());
  assert.ok(Math.abs(contourSize.x / contourSize.y - 1.92 / referenceHeight) < .09, 'Heart was stretched horizontally or vertically instead of uniformly scaled');
  assert.ok(groups[1].filter(insideReference).length > groups[1].length * .93, 'Interior particles are not contained by the SVG silhouette');
  assert.ok(groups[2].filter(point => !insideReference(point)).length > groups[2].length * .70, 'Ambient particles collapse into another filled heart');
  const ambientSides = [0, 0, 0, 0];
  for (const [x, y] of groups[2]) ambientSides[(y >= 0 ? 2 : 0) + (x >= 0 ? 1 : 0)] += 1;
  assert.ok(ambientSides.every(total => total > groups[2].length * .10), 'Ambient particles cluster in only one part of the silhouette');
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
console.log('PASS — 8,000 / 16,000 / 24,000 finite GPU particles; actual country-border formation; 58/32/10 contour, airy interior and ambient heart populations.');
console.log('PASS — supplied SVG silhouette, uniform aspect ratio, asymmetric cleft/tip, shallow depth, variable contour band and distributed exterior particles.');
console.log('PASS — stable geometries/attributes; no independent clock; 1,001 forward/backward states identical across five viewports.');
console.log(`PASS — origins ${separationKm.toFixed(2)} km apart; minimum camera radius ${minimumCamera.toFixed(3)}; minimum star radius ${minimumStarRadius.toFixed(3)}.`);
console.log(`PASS — star depth ≥${minimumStarDepth.toFixed(2)}, edge clearance ≥${edgeMargin.toFixed(1)} px; fixed trajectory basis; clean final globe handoff.`);
console.log(`PASS — distinct star cores remain ≥${minimumSeparateCores.toFixed(1)} px apart through p=.61, without crossing before the p=.64 merger.`);
console.log('PASS — synchronized 225° formation spin settles to identity; clean two-core liftoff, no stationary trail cloud, restrained halo and narrow world-space wake.');
