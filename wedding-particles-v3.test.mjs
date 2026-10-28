// Focused offline lifecycle checks for the native Journey -> Wedding morph.
// Real Three.js and GSAP; only the browser renderer is replaced. No RSVP writes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { createWeddingParticles } from './wedding-particles-v3.js';
const { gsap } = createRequire(import.meta.url)('gsap');
const mainSource = await readFile(new URL('./main-v3.js', import.meta.url), 'utf8');
const weddingSource = await readFile(new URL('./wedding-v3.js', import.meta.url), 'utf8');
const htmlSource = await readFile(new URL('./index-v3.html', import.meta.url), 'utf8');
function sourceFunction(name) {
  let start = mainSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing native routing function ${name}.`);
  if (mainSource.slice(start - 6, start) === 'async ') start -= 6;
  let end = mainSource.indexOf('{', start) + 1, depth = 1;
  for (; depth && end < mainSource.length; end += 1) {
    if (mainSource[end] === '{') depth += 1;
    if (mainSource[end] === '}') depth -= 1;
  }
  assert.equal(depth, 0);
  return mainSource.slice(start, end);
}
// Exercise the actual routing functions, replacing only their external scene,
// mask-renderer and UI services. This also covers asynchronous cancellation.
const makeRoutingHarness = new Function('context', `
  let state=context.state??'journey',revision=0,weddingTargetRevision=0,weddingParticleCount=0;
  let weddingTargetAbort,weddingParticles,weddingChapter;
  const stats={entered:[],started:0,finished:0,applied:[],resumed:[],suspended:[],samples:0};
  const elements={'globe-fallback':{hidden:true},'wedding-scene':{style:{},querySelector(){return {};}}};
  const $=id=>elements[id]??{};
  const renderer=context.noRenderer?null:{getContext:()=>({isContextLost:()=>!!context.contextLost})};
  const reducedMotion={matches:!!context.reduced},mobile=()=>true;
  const finishStartupCloud=()=>{},pauseStory=()=>{},hideAllScreensImmediate=()=>{},setActiveNav=()=>{},announce=()=>{},t=key=>key;
  const killActiveSectionTransition=()=>++revision,setState=next=>{state=next;};
  const showScreen=()=>{},applyGlobeTheme=()=>{},getParticleTheme=()=>({});
  const createWedding=()=>({enter:options=>stats.entered.push(options)});
  const wedding={},THREE={},gsap={set(){}},scene={},camera={},controls={},globeGroup={},globeMesh={},overviewGeometry={},framing={},GLOBE_RADIUS=12,overviewDistance=()=>80;
  const weddingTargetSampler=async(...args)=>{stats.samples++;return context.sample?context.sample(...args):new Float32Array(22000*3);};
  const weddingParticlesFactory=()=>({active:true,start(){stats.started++;},suspend(reason){stats.suspended.push(reason);},resume(reason){stats.resumed.push(reason);},setTargets(points){stats.applied.push(points);}});
  function finishWeddingEntry(request){if(request===revision&&state==='final-transition'){stats.finished++;state='wedding';}}
  ${sourceFunction('refreshWeddingParticleTarget')}
  ${sourceFunction('playWeddingTransition')}
  return {stats,play:playWeddingTransition,refresh:refreshWeddingParticleTarget,get state(){return state;},cancel(){revision++;state='intro';},invalidate(){weddingTargetRevision++;}};
`);
async function checkNativeRouting() {
  for (const options of [
    { reduced: true }, { contextLost: true }, { state: 'intro', noRenderer: true },
  ]) {
    const route = makeRoutingHarness(options); await route.play();
    assert.deepEqual(route.stats.entered, [{ immediate: true, focus: false }]);
    assert.equal(route.stats.finished, 1); assert.equal(route.stats.started, 0); assert.equal(route.stats.samples, 0);
    assert.equal(route.state, 'wedding', 'Reduced motion and unavailable WebGL must reveal native Wedding directly.');
  }
  const duplicate = makeRoutingHarness({ state: 'final-transition' }); await duplicate.play();
  assert.equal(duplicate.stats.entered.length, 0); assert.equal(duplicate.stats.started, 0);
  let release;
  const pendingMask = new Promise(resolve => { release = resolve; });
  const cancelled = makeRoutingHarness({ sample: () => pendingMask });
  const pending = cancelled.play(); cancelled.cancel(); release(new Float32Array(22000 * 3)); await pending;
  assert.equal(cancelled.stats.started, 0); assert.equal(cancelled.stats.finished, 0);
  assert.equal(cancelled.state, 'intro', 'A stale invitation mask cannot navigate after cancellation.');

  let releaseFirst;
  let calls = 0;
  const changedLayout = makeRoutingHarness({ sample: () => ++calls === 1
    ? new Promise(resolve => { releaseFirst = resolve; }) : new Float32Array(22000 * 3) });
  const preparing = changedLayout.play(); changedLayout.invalidate(); releaseFirst(new Float32Array(22000 * 3)); await preparing;
  assert.equal(changedLayout.stats.samples, 2, 'A language/viewport change during preparation requires a fresh mask.');
  assert.equal(changedLayout.stats.started, 1); assert.equal(changedLayout.stats.finished, 0);

  const resolves = [];
  const race = makeRoutingHarness({ sample: () => calls++ === 0 ? new Float32Array(22000 * 3)
    : new Promise(resolve => resolves.push(resolve)) });
  calls = 0; await race.play();
  const first = race.refresh(), second = race.refresh();
  const stale = new Float32Array(22000 * 3), latest = new Float32Array(22000 * 3); latest[0] = .4;
  resolves[0](stale); await first; assert.equal(race.stats.applied.length, 0);
  resolves[1](latest); await second; assert.equal(race.stats.applied.length, 1); assert.equal(race.stats.applied[0], latest);
  assert.deepEqual(race.stats.resumed, ['target'], 'Only the newest prepared target may resume the transition.');

  assert.doesNotMatch(htmlSource, /id=["']final-transition-screen["']/);
  assert.doesNotMatch(mainSource, /animateTransitionLines\(tl,\s*\$\('final-transition-screen'\)/);
  assert.match(mainSource, /state==='final-transition'&&weddingParticles\?\.active\)\{weddingParticles\.render/);
  assert.match(mainSource, /weddingParticles\?\.dispose\(\);weddingParticles=null/);
  assert.match(weddingSource, /enter\(\{immediate=false,focus=true\}/);
  assert.match(weddingSource, /if\(immediate\)\{[\s\S]*?gsap\.set\(panels,\{opacity:1,y:0\}\)/,
    'The real invitation must arrive settled, without replaying its stagger.');
}
const oldGlobals = new Map(['document', 'innerWidth', 'innerHeight'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
for (const [key, value] of Object.entries({ document: { hidden: false }, innerWidth: 390, innerHeight: 844 })) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

const near = (a, b, tolerance = 1e-8, message = `${a} != ${b}`) => assert.ok(Math.abs(a - b) <= tolerance, message);
const nearArray = (actual, expected, tolerance = 1e-8) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => near(value, expected[index], tolerance));
};
const targetCount = 256;
function targets(phase = 0) {
  const array = new Float32Array(targetCount * 3);
  for (let index = 0; index < targetCount; index += 1) {
    const angle = index / targetCount * Math.PI * 2 + phase;
    array[index * 3] = Math.cos(angle) * .65;
    array[index * 3 + 1] = Math.sin(angle) * .8;
  }
  return array;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 390 / 844, .1, 1000);
camera.position.set(27, 17, 42); camera.up.set(.02, 1, 0).normalize(); camera.lookAt(1, -2, 0);
camera.setViewOffset(390, 844, 8, -22, 390, 844); camera.updateMatrixWorld(true);
const globeGroup = new THREE.Group();
globeGroup.rotation.set(.11, .32, -.08); scene.add(globeGroup);
const sphereMaterial = new THREE.MeshBasicMaterial({ color: '#f5f4f0', transparent: false, opacity: 1, depthWrite: true });
const globeMesh = new THREE.Mesh(new THREE.SphereGeometry(12, 20, 12), sphereMaterial); globeGroup.add(globeMesh);
const overviewGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(12.02, 0, 0), new THREE.Vector3(0, 12.02, 0),
  new THREE.Vector3(0, 0, 12.02), new THREE.Vector3(-12.02, 0, 0),
]);
const borderMaterial = new THREE.LineBasicMaterial({ color: '#54584f', transparent: true, opacity: .37, depthWrite: false });
const borders = new THREE.LineSegments(overviewGeometry, borderMaterial); globeGroup.add(borders);
const markerMaterial = new THREE.MeshBasicMaterial({ color: '#ff5577', transparent: true, opacity: .71, depthWrite: false });
const marker = new THREE.Mesh(new THREE.SphereGeometry(.1, 4, 4), markerMaterial);
marker.name = 'native-city-marker'; globeGroup.add(marker);
const hiddenMarker = new THREE.Mesh(marker.geometry, markerMaterial); hiddenMarker.visible = false; globeGroup.add(hiddenMarker);
const controls = { enabled: true, autoRotate: true, target: new THREE.Vector3(1, 2, 3), update() {} };
const framing = { x: .04, y: .065 };
const clearColor = new THREE.Color('#102030'); let clearAlpha = .25, renderCount = 0;
const renderer = {
  getPixelRatio: () => 2,
  getClearColor: target => target.copy(clearColor),
  getClearAlpha: () => clearAlpha,
  setClearColor: (color, alpha = 1) => { clearColor.set(color); clearAlpha = alpha; },
  render(nextScene, nextCamera) { assert.equal(nextScene, scene); assert.equal(nextCamera, camera); renderCount += 1; },
};
const theme = { paper: new THREE.Color('#f5f4f0'), ink: new THREE.Color('#292a28'), dark: 0, olive: 0 };
let reveal = -1, finishCount = 0, restoreExpectedOnFinish;
const originalSceneChildren = [...scene.children];
function snapshot() {
  return {
    position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), up: camera.up.toArray(),
    view: structuredClone(camera.view), projection: camera.projectionMatrix.toArray(),
    globeQuaternion: globeGroup.quaternion.toArray(), globeVisible: globeGroup.visible,
    controls: { enabled: controls.enabled, autoRotate: controls.autoRotate, target: controls.target.toArray() },
    framing: { ...framing },
    objects: [...globeGroup.children].map(object => ({ object, visible: object.visible })),
    materials: [sphereMaterial, borderMaterial, markerMaterial].map(material => ({
      material, transparent: material.transparent, opacity: material.opacity, depthWrite: material.depthWrite,
    })),
    clearColor: clearColor.clone(), clearAlpha,
  };
}
function assertRestored(previous) {
  nearArray(camera.position.toArray(), previous.position);
  nearArray(camera.quaternion.toArray(), previous.quaternion);
  nearArray(camera.up.toArray(), previous.up);
  assert.deepEqual(camera.view, previous.view); nearArray(camera.projectionMatrix.toArray(), previous.projection);
  nearArray(globeGroup.quaternion.toArray(), previous.globeQuaternion);
  assert.equal(globeGroup.visible, previous.globeVisible);
  assert.equal(controls.enabled, previous.controls.enabled); assert.equal(controls.autoRotate, previous.controls.autoRotate);
  nearArray(controls.target.toArray(), previous.controls.target); assert.deepEqual(framing, previous.framing);
  previous.objects.forEach(({ object, visible }) => assert.equal(object.visible, visible));
  previous.materials.forEach(({ material, transparent, opacity, depthWrite }) => {
    assert.equal(material.transparent, transparent); near(material.opacity, opacity); assert.equal(material.depthWrite, depthWrite);
  });
  assert.ok(clearColor.equals(previous.clearColor)); near(clearAlpha, previous.clearAlpha);
}
const controller = createWeddingParticles({
  THREE, gsap, scene, camera, renderer, controls, globeGroup, globeMesh, overviewGeometry, framing,
  radius: 12, overviewDistance: (width, height) => Math.max(60, 51 / (width / height)),
  getTheme: () => theme, count: targetCount,
  onReveal(alpha) { reveal = alpha; },
  onFinish() { assertRestored(restoreExpectedOnFinish); finishCount += 1; },
});
const currentClock = () => gsap.globalTimeline.getChildren().find(child => Math.abs(child.duration() - 6.4) < 1e-6);
const effectPoints = () => {
  let pointCloud;
  scene.traverse(object => { if (object.isPoints) pointCloud = object; });
  return pointCloud;
};

try {
  const original = snapshot();
  controller.start(targets()); gsap.ticker.sleep();
  assert.equal(controller.active, true); assert.equal(controls.enabled, false); assert.equal(controls.autoRotate, false);
  assert.ok(renderCount > 0, 'The first frame must be synchronous, avoiding an empty canvas.');
  const firstCloud = effectPoints(); assert.ok(firstCloud, 'A single GPU particle cloud must own the visual transition.');
  assert.equal(firstCloud.geometry.getAttribute('position').count, targetCount);
  assert.ok(currentClock(), 'The transition must have one bounded GSAP clock.');
  controller.seek(.47); gsap.ticker.sleep();
  assert.equal(finishCount, 0); assert.ok(reveal <= .001, 'The real invitation must stay hidden during the explosion.');
  controller.leave();
  assert.equal(controller.active, false); assert.equal(finishCount, 0, 'Cancellation must never enter Wedding.');
  assertRestored(original);
  controller.finish(); assert.equal(finishCount, 0, 'Finishing a cancelled transition must be inert.');

  // Repeat visits must snapshot the current scene, including a selected close-up.
  camera.position.set(-13, 8, 18); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  globeGroup.visible = true; borders.visible = false; marker.visible = true;
  sphereMaterial.transparent = true; sphereMaterial.opacity = .89; sphereMaterial.depthWrite = false;
  controls.enabled = false; controls.autoRotate = false; framing.x = -.02;
  const closeup = snapshot();
  restoreExpectedOnFinish = closeup;
  controller.start(targets()); gsap.ticker.sleep(); controller.seek(.92); gsap.ticker.sleep();
  assert.ok(reveal > 0 && reveal < 1, 'Native HTML should crossfade only after particles reach the invitation.');
  const beforeTheme = camera.position.clone(), beforeQuaternion = camera.quaternion.clone();
  const clock = currentClock(); const progress = effectPoints().material.uniforms.uProgress.value;
  for (const [paper, ink, dark, olive] of [
    ['#f5f4f0', '#292a28', 0, 0], ['#11120f', '#f5f4f0', 1, 0],
    ['#303D29', '#F4EBDC', 1, 1], ['#F4EBDC', '#303D29', 0, 1],
  ]) {
    theme.paper.set(paper); theme.ink.set(ink); theme.dark = dark; theme.olive = olive;
    controller.render(390, 844);
    near(effectPoints().material.uniforms.uProgress.value, progress); assert.ok(camera.position.distanceTo(beforeTheme) < 1e-8);
    assert.ok(camera.quaternion.angleTo(beforeQuaternion) < 1e-7, 'Palette changes cannot restart camera motion.');
    const colors = Object.values(effectPoints().material.uniforms).map(uniform => uniform.value).filter(value => value?.isColor);
    assert.ok(colors.some(color => color.equals(theme.ink)), 'The particle ink must follow the exact active palette.');
  }
  const updatedTargets = targets(.3);
  controller.setTargets(updatedTargets); controller.render(390, 844); near(effectPoints().material.uniforms.uProgress.value, progress);
  assert.deepEqual(effectPoints().geometry.getAttribute('aTarget').array, updatedTargets);
  assert.equal(finishCount, 0, 'A translated invitation must not finish or restart the animation.');
  controller.suspend('visibility'); assert.equal(clock.paused(), true);
  const held = effectPoints().material.uniforms.uProgress.value; controller.render(390, 844);
  near(effectPoints().material.uniforms.uProgress.value, held);
  controller.suspend('context'); controller.resume('visibility'); assert.equal(clock.paused(), true);
  controller.resume('context'); gsap.ticker.sleep(); assert.equal(clock.paused(), false);

  // Resizing changes the actual camera projection, not the progress or target identities.
  controller.seek(.96); gsap.ticker.sleep();
  for (const [width, height] of [[390, 844], [844, 390], [1440, 900], [390, 844]]) {
    camera.aspect = width / height; camera.clearViewOffset(); camera.updateProjectionMatrix();
    const before = effectPoints().material.uniforms.uProgress.value; controller.render(width, height);
    const uniforms = effectPoints().material.uniforms;
    near(uniforms.uProgress.value, before);
    for (let index = 0; index < updatedTargets.length; index += 3) {
      // Evaluate the real shader's destination using its uploaded matrices.
      const eye = new THREE.Vector4(updatedTargets[index], updatedTargets[index + 1], 0, 1)
        .applyMatrix4(uniforms.uInverseProjection.value);
      eye.multiplyScalar(1 / eye.w);
      const targetEye = new THREE.Vector3(eye.x, eye.y, eye.z).multiplyScalar(uniforms.uTargetDepth.value / -eye.z);
      const projected = targetEye.applyMatrix4(uniforms.uCameraWorld.value).project(camera);
      near(projected.x, updatedTargets[index], 1e-9); near(projected.y, updatedTargets[index + 1], 1e-9);
    }
  }
  controller.seek(1); gsap.ticker.sleep();
  near(reveal, 1); assert.equal(controller.active, true, 'Seeking must not invoke the automatic completion callback.');
  assert.equal(finishCount, 0);
  controller.finish();
  assert.equal(controller.active, false); assert.equal(finishCount, 1); assertRestored(closeup);
  controller.finish(); controller.leave(); assert.equal(finishCount, 1, 'The Wedding handoff must occur exactly once.');

  // Invalid targets cannot put the scene into a half-active transition.
  assert.throws(() => controller.start(new Float32Array(3)), /target|count|length/i);
  assert.equal(controller.active, false); assertRestored(closeup);
  controller.start(targets()); gsap.ticker.sleep();
  assert.throws(() => controller.setTargets(new Float32Array(3)), /target|count|length/i);
  const invalidTargets = targets(); invalidTargets[3] = NaN;
  assert.throws(() => controller.setTargets(invalidTargets), /target|count|length/i);
  assert.equal(controller.active, true); controller.leave(); assertRestored(closeup);
  controller.dispose(); assert.deepEqual(scene.children, originalSceneChildren);
  await checkNativeRouting();

  console.log('Wedding particles: synchronous frame, cancellation/restore, one-time settled handoff, four palettes, resize/translation projection, suspension, target validation, direct fallback and asynchronous routing races passed.');
} finally {
  controller.leave(); controller.dispose(); gsap.globalTimeline.clear(); gsap.ticker.sleep();
  for (const [key, descriptor] of oldGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
  }
}
