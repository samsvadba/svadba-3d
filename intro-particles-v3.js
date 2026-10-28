import * as THREE from 'three';
import { gsap } from 'gsap';
import { createParticles, HEART_BOUNDS } from './experiments/intro-particles/particles.js';
import { createChoreography } from './experiments/intro-particles/choreography.js';
import { createPlayback } from './experiments/intro-particles/playback.js';
import { toStoryProgress, STORY_DURATION } from './experiments/intro-particles/pacing.js';
import { placeOriginLabel } from './experiments/intro-particles/globe.js';

const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, p) => THREE.MathUtils.smoothstep(p, a, b);
const svgNS = 'http://www.w3.org/2000/svg';

/** The accepted intro, using V3's existing renderer, camera and globe. */
export function createParticleIntro({
  scene, camera, renderer, controls, globeGroup, globeMesh, globeMaterial,
  overviewMaterial, wireMaterial, detailLayers, formationPositions,
  radius = 12, latLonToVec3, overviewDistance, origins, root,
  getTheme, getLanguage = () => 'sk', getText = key => key,
  reducedMotion = false, onFinish = () => {}, onMode = () => {},
  onFirstFrame = () => {},
}) {
  const content = root.querySelector('#particle-intro-content');
  const labels = root.querySelector('#particle-intro-labels');
  const connectors = root.querySelector('#particle-intro-connectors');
  const caption = root.querySelector('#particle-intro-caption');
  const timeline = root.querySelector('#particle-intro-timeline');
  const range = root.querySelector('#particle-intro-progress');
  const stage = root.querySelector('#particle-intro-stage');
  if (!content || !labels || !connectors || !caption || !timeline || !range || !stage) {
    throw new Error('The native particle intro requires its existing intro overlay.');
  }

  let width = Math.max(1, innerWidth), height = Math.max(1, innerHeight);
  let active = false, progress = 0, mode = 'manual', finished = false;
  let firstFrame = false, lastStage = -1, lastRange = -1;
  let wheelUntil = 0, pointer = null, rendering = false;
  const ignoredPointers = new Set(), suspensions = new Set();
  const reduced = () => typeof reducedMotion === 'boolean' ? reducedMotion : reducedMotion.matches;
  const weak = (navigator.deviceMemory || 4) <= 2 || (navigator.hardwareConcurrency || 4) <= 2;
  const fx = createParticles({
    count: weak ? 16000 : width < 768 ? 42000 : 60000,
    mobile: width < 768,
    formationPositions: typeof formationPositions === 'function' ? formationPositions() : formationPositions,
  });
  fx.group.visible = false;
  scene.add(fx.group);

  const originGroup = new THREE.Group();
  originGroup.name = 'native-intro-origin-markers';
  originGroup.visible = false;
  globeGroup.add(originGroup);
  const markerGeometry = new THREE.SphereGeometry(.009, 12, 8);
  const originData = origins.map((origin, index) => {
    const position = latLonToVec3(origin.lat, origin.lon, radius + .065);
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthTest: true });
    const mesh = new THREE.Mesh(markerGeometry, material);
    mesh.position.copy(position); originGroup.add(mesh);
    const label = document.createElement('div');
    label.className = 'particle-origin-label'; label.dataset.side = index ? 'left' : 'right';
    const person = document.createElement('strong'), town = document.createElement('span');
    person.textContent = origin.person; town.textContent = origin.name;
    label.append(person, town); labels.append(label);
    const line = document.createElementNS(svgNS, 'line'); connectors.append(line);
    return { position, material, mesh, label, line };
  });
  const originVectors = originData.map(origin => origin.position);
  const homeDirection = latLonToVec3(
    (origins[0].lat + origins[1].lat) / 2,
    (origins[0].lon + origins[1].lon) / 2, 1,
  );
  const choreography = createChoreography({
    homeDirection, startDirection: latLonToVec3(30, 15, 1), radius,
  });
  const particleColor = new THREE.Color(), markerColor = new THREE.Color();
  const world = new THREE.Vector3(), projected = new THREE.Vector3();
  const normal = new THREE.Vector3(), direction = new THREE.Vector3(), markerView = new THREE.Vector3();
  const countryBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };

  const text = (key, sk, en) => {
    const value = getText(key);
    return value && value !== key ? value : getLanguage() === 'en' ? en : sk;
  };
  function refreshLanguage() {
    caption.textContent = text('introManual', 'Posúvajte nahor alebo nadol. Príbeh ovládate vy.', 'Scroll up or down. You are in control.');
    range.setAttribute('aria-label', text('introProgress', 'Priebeh úvodu', 'Intro progress'));
    lastStage = -1; updateUI();
  }
  function updateUI() {
    const manual = active && mode === 'manual';
    caption.hidden = !manual; timeline.hidden = !manual;
    root.dataset.particleMode = mode;
    content.dataset.mode = mode; content.dataset.progress = progress.toFixed(6);
    const score = toStoryProgress(progress);
    const nextStage = score < .18 ? 0 : score < .37 ? 1 : score < .54 ? 2 : score < .64 ? 3 : score < .72 ? 4 : score < .895 ? 5 : 6;
    if (nextStage !== lastStage) {
      stage.textContent = `${String(nextStage + 1).padStart(2, '0')} / 07`; lastStage = nextStage;
    }
    const value = Math.round(progress * 1000);
    if (value !== lastRange) { range.value = String(value); lastRange = value; }
  }

  // Native V3 owns the sole render loop. The playback timeline only writes the
  // shared score; no second requestAnimationFrame or document scroll is created.
  const playback = createPlayback({
    gsap, duration: STORY_DURATION,
    onProgress(value) { progress = value; if (active) updateUI(); },
    onMode(value) { mode = value; if (active) { updateUI(); onMode(value); } },
    onFinish() {
      if (!active || finished) return;
      finished = true;
      // The handoff inherits the final geographic camera pose, not the previous
      // frame of the dissolving heart, even for an explicit skip.
      if (!rendering) render(width, height);
      onFinish();
    },
  });

  function applyFraming() {
    const offsetY = width >= 768 ? height * (height < 560 ? .18 : .12) : 0;
    camera.aspect = width / height;
    camera.setViewOffset(width, height, 0, offsetY, width, height);
    camera.updateProjectionMatrix();
  }
  function resize(nextWidth = innerWidth, nextHeight = innerHeight) {
    width = Math.max(1, nextWidth); height = Math.max(1, nextHeight);
    if (active) applyFraming();
  }
  function projectSurface(position) {
    world.copy(position); globeGroup.localToWorld(world);
    normal.copy(world).normalize(); direction.copy(camera.position).sub(world).normalize();
    const facing = normal.dot(direction);
    projected.copy(world).project(camera);
    return {
      x: (projected.x + 1) * width / 2,
      y: (1 - projected.y) * height / 2,
      visible: facing > .025 && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1,
    };
  }
  function projectSlovakia() {
    const positions = detailLayers.find(layer => layer.iso === 'SVK')?.line.geometry.attributes.position;
    if (!positions) return null;
    countryBounds.minX = countryBounds.minY = Infinity;
    countryBounds.maxX = countryBounds.maxY = -Infinity;
    for (let i = 0; i < positions.count; i++) {
      world.fromBufferAttribute(positions, i); globeGroup.localToWorld(world);
      normal.copy(world).normalize(); direction.copy(camera.position).sub(world).normalize();
      if (normal.dot(direction) <= .025) continue;
      projected.copy(world).project(camera);
      if (projected.z < -1 || projected.z > 1) continue;
      const x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2;
      countryBounds.minX = Math.min(countryBounds.minX, x); countryBounds.maxX = Math.max(countryBounds.maxX, x);
      countryBounds.minY = Math.min(countryBounds.minY, y); countryBounds.maxY = Math.max(countryBounds.maxY, y);
    }
    return Number.isFinite(countryBounds.minX) ? countryBounds : null;
  }
  function updateOrigins(alpha) {
    const visible = alpha > .01;
    originGroup.visible = visible;
    labels.setAttribute('aria-hidden', String(!visible));
    connectors.setAttribute('viewBox', `0 0 ${width} ${height}`);
    if (!visible) {
      for (const origin of originData) { origin.label.style.opacity = '0'; origin.line.style.opacity = '0'; }
      return;
    }
    const country = projectSlovakia(), occupied = [];
    const footer = mode === 'manual' ? caption : document.getElementById('bottom-nav');
    const footerTop = footer?.getBoundingClientRect().top || height - 170;
    const bottom = Math.min(height - 150, footerTop - 24);
    const labelWidth = width < 768 ? 118 : 148, labelHeight = width < 768 ? 72 : 80;
    originData.forEach((origin, index) => {
      const point = projectSurface(origin.position), shown = visible && point.visible;
      origin.mesh.visible = shown; origin.material.opacity = shown ? alpha : 0;
      markerView.copy(origin.mesh.position).applyMatrix4(globeGroup.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      const worldPerPixel = 2 * Math.max(.01, -markerView.z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / height;
      origin.mesh.scale.setScalar(2.5 * worldPerPixel / .009);
      const placement = placeOriginLabel({ index, point, country, labelWidth, labelHeight, width, height, bottom, occupied });
      if (shown) occupied.push(placement);
      const { x, y } = placement;
      origin.label.style.transform = `translate3d(${x}px,${y}px,0)`;
      origin.label.style.opacity = shown ? String(alpha) : '0';
      const values = { x1: point.x, y1: point.y, x2: clamp(point.x, x - 6, x + labelWidth + 6), y2: clamp(point.y, y - 8, y + labelHeight + 8) };
      for (const [key, value] of Object.entries(values)) origin.line.setAttribute(key, String(value));
      origin.line.style.opacity = shown ? String(alpha * .32) : '0';
    });
  }
  function paintGeography(pose, theme) {
    const n = Number(theme.dark), palette = Number(theme.olive);
    globeMaterial.color.setRGB(.913 * (1 - n) + .014 * n, .905 * (1 - n) + .016 * n, .871 * (1 - n) + .014 * n).lerp(theme.paper, palette);
    overviewMaterial.color.setRGB(.127 * (1 - n) + .68 * n, .138 * (1 - n) + .70 * n, .114 * (1 - n) + .64 * n).lerp(theme.ink, palette);
    wireMaterial.color.setRGB(.27 * (1 - n) + .65 * n, .28 * (1 - n) + .67 * n, .26 * (1 - n) + .61 * n).lerp(theme.ink, palette);
    markerColor.setRGB(.019 * (1 - n) + .84 * n, .02 * (1 - n) + .81 * n, .018 * (1 - n) + .72 * n).lerp(theme.ink, palette);
    for (const origin of originData) origin.material.color.copy(markerColor);
    const detail = smooth(0, 1, (36 - camera.position.length()) / 18);
    const mix = detailLayers.length ? detail : 0;
    overviewMaterial.opacity = .26 * (1 - mix * .86) * pose.geographyOpacity;
    wireMaterial.opacity = .08 * (1 - detail * .94) * pose.geographyOpacity;
    for (const layer of detailLayers) {
      layer.material.color.setRGB(.392 * (1 - n) + .69 * n, .408 * (1 - n) + .70 * n, .373 * (1 - n) + .65 * n).lerp(theme.ink, palette);
      layer.material.opacity = detail * .19 * pose.geographyOpacity;
      if (layer.iso === 'SVK') {
        layer.material.opacity = THREE.MathUtils.lerp(layer.material.opacity, .9 * pose.geographyOpacity, pose.originFocus);
        layer.material.color.lerp(theme.ink, pose.originFocus);
      }
      layer.line.visible = layer.material.opacity > .002;
    }
  }
  function render(nextWidth = width, nextHeight = height) {
    if (!active) return false;
    rendering = true;
    try {
      if (nextWidth !== width || nextHeight !== height) resize(nextWidth, nextHeight);
      const score = toStoryProgress(progress);
      const pose = choreography.sample(score, { width, height, overviewDistance, heartBounds: HEART_BOUNDS });
      camera.position.copy(pose.position); camera.up.set(0, 1, 0); camera.lookAt(pose.target); camera.updateMatrixWorld();
      globeGroup.rotation.set(0, pose.formationRotation, 0); globeGroup.updateMatrixWorld(true);
      const theme = getTheme(); particleColor.copy(theme.ink);
      globeMaterial.transparent = true; globeMaterial.opacity = pose.globeOpacity;
      globeMesh.visible = pose.globeReveal > .001;
      paintGeography(pose, theme);
      fx.update({ progress: score, origins: originVectors, merge: pose.merge, heartScale: pose.heartScale,
        color: particleColor, dark: theme.dark, basis: pose.basis, starBasis: pose.basis,
        formationRotation: pose.formationRotation, formationSurface: score >= .87 ? pose.globeOpacity : pose.globeReveal });
      updateOrigins(pose.originReveal);
      renderer.setClearColor(theme.paper, 1); renderer.render(scene, camera);
      if (!firstFrame) { firstFrame = true; onFirstFrame(); }
      return true;
    } finally { rendering = false; }
  }

  function start() {
    playback.pause(); playback.resume(); active = true; finished = false;
    progress = 0; mode = 'auto'; pointer = null; ignoredPointers.clear(); wheelUntil = 0;
    suspensions.clear();
    const position = camera.position.clone(), orientation = camera.quaternion.clone();
    const damping = controls.enableDamping;
    controls.autoRotate = false; controls.enabled = false; controls.enableDamping = false; controls.update();
    camera.position.copy(position); camera.quaternion.copy(orientation); controls.enableDamping = damping;
    controls.target.set(0, 0, 0);
    content.hidden = false; fx.group.visible = true; globeGroup.visible = true;
    root.style.touchAction = 'none'; resize(innerWidth, innerHeight); refreshLanguage();
    render(width, height);
    if (document.hidden) suspend('hidden');
    if (reduced()) playback.finish(); else playback.start();
    if (suspensions.size) playback.suspend();
    return api;
  }
  function leave() {
    active = false; playback.pause(); playback.resume(); pointer = null; ignoredPointers.clear(); suspensions.clear();
    content.hidden = true; fx.group.visible = false; originGroup.visible = false;
    caption.hidden = timeline.hidden = true;
    for (const origin of originData) { origin.label.style.opacity = '0'; origin.line.style.opacity = '0'; }
    globeGroup.rotation.set(0, 0, 0); globeGroup.updateMatrixWorld(true);
    globeMesh.visible = true; globeMaterial.opacity = 1; globeMaterial.transparent = false;
    controls.target.set(0, 0, 0); controls.autoRotate = false;
    camera.up.set(0, 1, 0); root.style.removeProperty('touch-action');
    renderer.setClearColor(0, 0);
    return api;
  }
  function toggle() {
    if (!active) return false;
    if (playback.mode === 'auto') playback.pause(); else playback.play();
    return true;
  }
  function finish() { if (active) playback.finish(); return api; }
  function suspend(reason = 'parent') {
    if (!active || suspensions.has(reason)) return;
    suspensions.add(reason); playback.suspend();
  }
  function resume(reason = 'parent') {
    if (!active) return;
    suspensions.delete(reason);
    if (!suspensions.size) playback.resume();
  }

  const isUI = target => Boolean(target?.closest?.('button,a,input,select,textarea,[role="button"],#utility-controls,#bottom-nav'));
  const pauseForManual = () => { if (active && mode === 'auto') playback.pause(); };
  root.addEventListener('pointerdown', event => {
    if (!active || isUI(event.target)) return;
    event.preventDefault(); event.stopPropagation();
    try { root.setPointerCapture(event.pointerId); } catch { /* Optional on legacy Safari. */ }
    if (mode === 'auto' || ignoredPointers.size) {
      ignoredPointers.add(event.pointerId); pauseForManual(); return;
    }
    if (!pointer) pointer = { id: event.pointerId, y: event.clientY, progress };
  }, { capture: true });
  root.addEventListener('pointermove', event => {
    if (!active) return;
    if (ignoredPointers.has(event.pointerId)) { event.preventDefault(); event.stopPropagation(); return; }
    if (pointer?.id !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    playback.seek(clamp(pointer.progress + (pointer.y - event.clientY) / (height * 7), 0, 1));
  }, { capture: true, passive: false });
  function endPointer(event) {
    const ignored = ignoredPointers.delete(event.pointerId), tracked = pointer?.id === event.pointerId;
    if (!ignored && !tracked) return;
    if (tracked) pointer = null;
    event.preventDefault(); event.stopPropagation();
    try { root.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released. */ }
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) root.addEventListener(type, endPointer, { capture: true });
  root.addEventListener('wheel', event => {
    if (!active || isUI(event.target)) return;
    event.preventDefault(); event.stopPropagation();
    const now = performance.now();
    if (mode === 'auto' || now < wheelUntil) { wheelUntil = now + 140; pauseForManual(); return; }
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
    playback.seek(clamp(progress + delta / (height * 7), 0, 1));
  }, { capture: true, passive: false });
  document.addEventListener('keydown', event => {
    if (!active || isUI(event.target)) return;
    if (!['Escape', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) return;
    event.preventDefault();
    if (mode === 'auto') { pauseForManual(); return; }
    if (event.key === ' ') { playback.play(); return; }
    if (event.key === 'Escape') return;
    const direction = ['PageDown', 'ArrowDown'].includes(event.key) ? 1 : -1;
    playback.seek(clamp(progress + direction * (event.key.startsWith('Page') ? .08 : .018), 0, 1));
  });
  range.addEventListener('input', () => { if (active) playback.seek(Number(range.value) / 1000); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend('hidden'); else resume('hidden');
  });
  window.addEventListener('pagehide', () => suspend('page'));
  window.addEventListener('pageshow', () => { resume('page'); if (!document.hidden) resume('hidden'); });

  const api = {
    start, leave, render, toggle, finish, resize, refreshLanguage, suspend, resume,
    get active() { return active; }, get mode() { return mode; }, get progress() { return progress; },
  };
  content.hidden = true; refreshLanguage();
  return api;
}
