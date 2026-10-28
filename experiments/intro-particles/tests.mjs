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
import { toStoryProgress, STORY_DURATION } from './pacing.js';

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
assert.deepEqual(STORY_PHASES.gather, [.72, .795]);

assert.equal(STORY_DURATION, 25.5);
assert.deepEqual(STORY_PHASES.formation, [0,.144]);
assert.deepEqual(STORY_PHASES.overview, [.144,.18]);
for (const [seconds, score] of [[0,0],[4,.144],[5,.18],[7.5,.30],[8.12,.37],[8.3,.39],[13.3,.64],[15,.72],[15.6,.735],[18.2,.795],[21.7,.87],[22.4,.895],[25.3,.995],[25.5,1]]) {
  assert.ok(Math.abs(toStoryProgress(seconds/STORY_DURATION)-score)<1e-10);
}
for (let milliseconds=0;milliseconds<=5000;milliseconds+=5) {
  assert.ok(Math.abs(toStoryProgress(milliseconds/1000/STORY_DURATION)-milliseconds*.000036)<1e-10,
    'Opening retiming interrupts the shared cloud/globe motion');
}
// The five-second formation stays intact; the towns/retreat are now concise,
// leaving the latter passage for heart-marker flight, impact and geographic reform.
assert.deepEqual(STORY_PHASES.twins, [.795,.87]);
assert.deepEqual(STORY_PHASES.heartImpact, [.87,.895]);
assert.ok(!('heart' in STORY_PHASES) && !('heartRegather' in STORY_PHASES), 'Large shared heart stage must be removed');
assert.deepEqual(STORY_PHASES.reform, [.895,.995]);
let previousScore = -1;
for (let i=0;i<=10000;i++) { const score=toStoryProgress(i/10000); assert.ok(score>=previousScore && score>=0 && score<=1); previousScore=score; }
const detail = JSON.parse(await readFile(new URL('../../geography-detail-v3.json', import.meta.url), 'utf8'));
const slovakia = detail.features.find(feature=>feature.iso==='SVK');
assert.ok(slovakia && slovakia.rings[0].length>100, 'Slovakia must use existing geographic data');
assert.ok(!/countryFillGeometry|originFill/.test(globeSource), 'Slovakia must have an outline only, without a surface fill');

for (const count of [16000, 42000, 60000]) {
  const effect = createParticles({ count, mobile: count < 60000, formationPositions });
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
  const heartNormals = geometry.getAttribute('aHeartNormal');
  assert.equal(heartNormals.itemSize, 4, 'Heart rim must use an existing shell normal and classification');
  const active = geometry.getAttribute('aHeartActive');
  const expectedCount = count <= 16000 ? 10000 : count < 60000 ? 22000 : 33000;
  assert.equal([...active.array].filter(Boolean).length, expectedCount, 'Adaptive heart density changed');
  assert.ok(!geometry.hasAttribute('aHeartMeta'), 'Later contour/cloud categories remain');
  assert.equal(effect.group.children[0].material.fragmentShader, originalPointFragment);
  assert.ok(!/lightWave|heartbeat|bodyWave|cloudStructure|glint/.test(effect.group.children[0].material.vertexShader), 'Later heart effects remain');
  const historical = originalRandom();
  let interior = 0, rimShell = 0;
  for (let i = 0; i < count; i += 1) {
    let draws = 0;
    const original = heartPoint(() => { draws += 1; return historical(); });
    historical(); historical(); // The original direction samples, then its seeds.
    const expectedSeed = [historical(), historical(), historical()];
    for (let axis = 0; axis < 3; axis += 1) assert.ok(Math.abs(heartSeeds.array[i*3+axis]-expectedSeed[axis]) < 6e-8, 'Original brightness/size seed changed');
    const [x,y,z] = original;
    assert.ok(Math.abs(Math.hypot(heartNormals.getX(i),heartNormals.getY(i),heartNormals.getZ(i))-1)<1e-7, 'Heart rim normal is not normalized');
    assert.ok(heartNormals.getW(i)===0 || heartNormals.getW(i)===1, 'Heart rim shell mask is not binary');
    if (draws===3) assert.equal(heartNormals.getW(i),1,'Original surface points lost rim classification');
    const cleft = .042 * Math.exp(-x*x/.025) * THREE.MathUtils.smoothstep(y,.55,.88);
    const tip = .016 * THREE.MathUtils.smoothstep(-y,.92,1.11);
    const taper = THREE.MathUtils.lerp(.76,.90,THREE.MathUtils.smoothstep(y,-.18,.40));
    const expected = [x*.90,((y-cleft+tip)*taper-.08)*1.04,z*.86];
    for (let axis = 0; axis < 3; axis += 1) assert.ok(Math.abs(heart.array[i*3+axis]-expected[axis]) < 1.2e-7, 'Heart differs from original samples plus the documented geometry refinement');
    assert.equal(active.getX(i), i < expectedCount ? 1 : 0);
    if (i < expectedCount) {
      if (draws === 4) interior += 1;
      rimShell += heartNormals.getW(i);
      assert.ok(heartField(x,y+.13,z) < .00002, 'Original volumetric surface was lost');
    }
  }
  assert.ok(interior > expectedCount*.15 && interior < expectedCount*.21, 'Original 82% shell / 18% interior distribution changed');
  assert.ok(rimShell>expectedCount*.80 && rimShell<expectedCount*.90, 'Rim emphasis leaks across the whole heart volume');
  const size = new THREE.Box3().setFromBufferAttribute(heart).getSize(new THREE.Vector3());
  assert.ok(size.x > 2.02 && size.x <= HEART_BOUNDS.width, 'Refined heart exceeds the unchanged horizontal framing');
  assert.ok(size.y > 1.85 && size.y < 1.96, 'The four-percent height restoration changed');
  assert.ok(size.z > 1.10 && size.z <= HEART_BOUNDS.depth, 'Original spatial volume was replaced by a flat or shallow cloud');
  assert.ok(size.x / size.y > 1.04 && size.x / size.y < 1.14, 'Heart lost its balanced proportions');
  const burstBudget=count<=16000?12000:count<60000?30000:45000;
  for (const progress of [0,.105,.179,.18,.64,.795,.83,.86999,.87,.90,.93499,.935,.97,.999,1,.05]) {
    effect.update({progress,origins,merge:new THREE.Vector3(0,0,20),color:new THREE.Color('#303D29')});
    assert.equal(geometry.drawRange.start,0);
    assert.equal(geometry.drawRange.count,progress<.18||progress>=.87?count:progress>=.795&&progress<.87?360:burstBudget,'Only the two compact marker contours are drawn between their formation and impact');
  }
  effect.dispose();
  assert.equal(effect.group.children.length, 0);
}

const effect = createParticles({ count: 42000, mobile: true, formationPositions });
const snapshots = effect.group.children.map(object => ({
  uuid: object.geometry.uuid,
  attributes: Object.fromEntries(Object.entries(object.geometry.attributes).map(([name, attribute]) => [name, attribute.array])),
}));
const homeDirection = latLonToVec3((config.origins[0].lat + config.origins[1].lat) / 2, (config.origins[0].lon + config.origins[1].lon) / 2, 1);
const startDirection = latLonToVec3(30, 15, 1);
const choreography = createChoreography({ homeDirection, startDirection, radius });
const gathering = choreography.sample(toStoryProgress(2/STORY_DURATION), { width:390,height:844,overviewDistance });
assert.ok(gathering.formationProgress>0 && gathering.formationProgress<1);
assert.ok(gathering.formationRotation>-Math.PI*4 && gathering.formationRotation<-.5,
  'The cloud must already rotate while it is still gathering');
const formed = choreography.sample(toStoryProgress(4/STORY_DURATION), { width:390,height:844,overviewDistance });
assert.equal(formed.globeReveal,1, 'The globe must be fully visible after four seconds');
assert.equal(formed.formationProgress,1);
assert.ok(formed.formationRotation<-.6 && formed.formationRotation>-.8,
  'The completed globe must still coast through its final approximately 42 degrees');
let previousSpinAngle = -Math.PI*4, greatestSpinSpeed = 0, firstSpinSpeed = 0, finalSpinSpeed = 0;
let previousCoastSpeed=Infinity;
for (let i = 1; i <= 5000; i += 1) {
  const seconds = i/1000;
  const angle = choreography.sample(toStoryProgress(seconds/STORY_DURATION), { width:390,height:844,overviewDistance }).formationRotation;
  const speed = (angle-previousSpinAngle)*1000;
  assert.ok(speed>=-1e-8, 'Opening spin reverses');
  if (i===1) firstSpinSpeed=speed;
  if (i===5000) finalSpinSpeed=speed;
  if (i>=4000) {
    assert.ok(speed<=previousCoastSpeed+1e-8, 'The completed globe speeds up instead of coasting');
    previousCoastSpeed=speed;
  }
  greatestSpinSpeed=Math.max(greatestSpinSpeed,speed);
  previousSpinAngle=angle;
}
assert.ok(Math.abs(previousSpinAngle)<1e-10, 'Two visible turns did not finish before approach');
assert.ok(greatestSpinSpeed<Math.PI*1.51, 'The shared five-second spin exceeds its intended 0.75 turns/s peak');
assert.ok(firstSpinSpeed<.0001 && finalSpinSpeed<.0001, 'Visible spin starts or stops abruptly');
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
    ...uniforms.uHeartCenterA.value, ...uniforms.uHeartCenterB.value,
    uniforms.uHeartAngleA.value, uniforms.uHeartAngleB.value, uniforms.uHeartScale.value,
    uniforms.uProgress.value, uniforms.uScale.value, uniforms.uFormationRotation.value,
    uniforms.uFormationSurface.value, uniforms.uGlobeRadius.value, Number(effect.group.children[0].material.depthTest),
    uniforms.uTrailReveal.value, uniforms.uTrailSpread.value, uniforms.uStarCoreLimit.value,
    uniforms.uStarHaloLimit.value, uniforms.uStarGrainLimit.value, uniforms.uStarHaloOpacity.value,
    pose.globeOpacity, pose.geographyOpacity, pose.originFocus,
    ...effect.group.children.map(object => Number(object.visible))];
}

for (const [width, height] of viewports) {
  const camera = new THREE.PerspectiveCamera(45, width / height, .1, 1000);
  new Function('camera', `return (${applyFramingSource});`)(camera)(width, height);
  const fixedBasis = choreography.sample(0, { width, height, overviewDistance }).basis.toArray();
  const states = [];
  let greatestSilhouetteExcursion = 0;
  const excursions = [0,0];
  const flightUp = new THREE.Vector3(0,1,0).applyQuaternion(new THREE.Quaternion().fromArray(fixedBasis));
  let previousFormationRotation = -Infinity;
  const evaluate = progress => {
    const pose = choreography.sample(progress, { width, height, overviewDistance, heartBounds: HEART_BOUNDS });
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    effect.update({ progress, origins, merge: pose.merge, heartScale: pose.heartScale, color, basis: camera.quaternion, starBasis: pose.basis, formationRotation: pose.formationRotation, formationSurface: progress >= .87 ? pose.globeOpacity : pose.globeReveal });
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
    assert.equal(uniforms.uFormationSurface.value, progress >= .87 ? pose.globeOpacity : pose.globeReveal, 'Cloud occlusion differs from the visible globe surface');
    assert.equal(effect.group.children[0].material.depthTest, progress >= .18 && (progress < .87 || progress >= 1), 'The transparent forming sphere abruptly cuts off cloud geography');
    assert.ok(pose.formationRotation >= previousFormationRotation, 'Formation spin reverses during settling');
    previousFormationRotation = pose.formationRotation;
    if (progress === 0) assert.equal(pose.formationRotation, -Math.PI * 4);
    if (progress >= .18) assert.ok(Math.abs(pose.formationRotation) < 1e-12, 'Formation rotation leaks into geographic coordinates');
    assert.ok(uniforms.uTrailSpread.value <= .030, 'Trail width scales into a close-up particle cloud');
    if (progress >= .367 && progress <= .415) {
      assert.equal(uniforms.uTrailReveal.value, 0, 'Stationary origin renders a cluster of delayed tail particles');
      assert.ok(uniforms.uStarCoreLimit.value < 4.8, 'Close-up star core is oversized');
      assert.ok(uniforms.uStarHaloLimit.value < 14.5 && uniforms.uStarHaloOpacity.value < .13, 'Close-up halo is too heavy');
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
          excursions[index] = Math.max(excursions[index], projectedDistance / projectedEarthRadius);
        }
        if (progress === .55) {
          const signedHeight = star.clone().sub(pose.merge).dot(flightUp) / pose.heartScale;
          assert.ok(index === 0 ? signedHeight > .3 : signedHeight < -.3, 'Stars must fly in opposite vertical directions');
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
  assert.ok(excursions.every(value=>value>1.02), `Both stars must visibly clear the globe at ${width}×${height}: ${excursions}`);
  for (let i = 1000; i >= 0; i -= 1) assert.deepEqual(snapshot(camera, evaluate(i / 1000)), states[i], `Not reversible at p=${i / 1000}`);
  for (let index = 0; index < 2; index += 1) {
    const pose = evaluate(.37);
    assert.ok(effect.sampleStarPath(.37, index, star).distanceTo(origins[index]) < 1e-10);
    assert.ok(effect.sampleStarPath(.64, index, star).distanceTo(pose.merge) < 1e-10);
  }
  assert.equal(choreography.sample(.30,{width,height,overviewDistance}).originFocus,1);
  const final = evaluate(1);
  assert.equal(final.originFocus,0);
  assert.equal(final.finalReveal, 1); assert.equal(final.globeOpacity, 1); assert.equal(final.geographyOpacity, 1);
  assert.ok(effect.group.children.every(object => !object.visible), 'Particles remain at final handoff');
  assert.ok(Math.abs(camera.position.length() - overviewDistance(width, height)) < 1e-9);
}

effect.dispose(); sourceGeometry.dispose();
console.log('PASS — finite 16k / 42k / 60k formation points; original cached sampler/seed streams remain unchanged, without rendering a shared large heart.');
console.log('PASS — 2f7b1ed sampler/sprite checksum preserved; opposite star arcs stay clear until their impact.');
console.log('PASS — stable geometries/attributes; no independent clock; 1,001 forward/backward states identical across five viewports.');
console.log(`PASS — origins ${separationKm.toFixed(2)} km apart; minimum camera radius ${minimumCamera.toFixed(3)}; minimum star radius ${minimumStarRadius.toFixed(3)}.`);
console.log(`PASS — star depth ≥${minimumStarDepth.toFixed(2)}, edge clearance ≥${edgeMargin.toFixed(1)} px; fixed trajectory basis; clean final globe handoff.`);
console.log(`PASS — distinct star cores remain ≥${minimumSeparateCores.toFixed(1)} px apart through p=.61, without crossing before the p=.64 merger.`);
console.log(`PASS — cloud rotates while gathering for four seconds, then the completed globe coasts one second; 720° with smooth start/stop (peak ${(greatestSpinSpeed/(2*Math.PI)).toFixed(3)} turns/s); shortened towns/retreat and 25.5-second compact-heart/direct-geographic-reform score.`);
