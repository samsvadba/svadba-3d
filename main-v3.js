import { gsap } from 'gsap';
import config from './config-v3.js';
import countries from './countries-v3.json';
import './style-v3.css';

// Reference architecture: WeddingApp config, separate fullscreen screens,
// interruptible GSAP section timelines, OrbitControls, flyToAndShow,
// and a projected SVG marker-to-media connector. No document scroll routing.
const { locations, GLOBE_RADIUS, intro, wedding } = config;
const $ = (id) => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = () => innerWidth < 768;
const duration = (seconds) => reducedMotion.matches ? 0 : seconds;
const base = import.meta.env.BASE_URL;
const asset = (path) => `${base}${path}`;
const screens = ['intro-overlay', 'journey-scene', 'transition-screen', 'final-transition-screen', 'wedding-handoff'];
let state = 'loading', revision = 0, activeSectionTimeline, currentIndex = -1;
let globeInitPromise, THREE, scene, camera, renderer, controls, globeGroup;
let cameraMoving = false, hoveredIndex = -1, pointerDown;
const visited = new Set(), markerData = [];
const framing = { x: 0, y: 0 };
const connector = $('memory-connector');
const view = { width: 0, height: 0 };

function setState(next) {
  state = next;
  document.body.dataset.state = next;
  if (controls) controls.enabled = next === 'journey' && !cameraMoving;
  $('label-layer').inert = next !== 'journey';
}

function showScreen(id, interactive = true) {
  const el = $(id);
  el.setAttribute('aria-hidden', 'false');
  el.inert = !interactive;
  gsap.set(el, { autoAlpha: 1 });
}

function hideAllScreensImmediate() {
  screens.forEach(id => {
    $(id).inert = true;
    $(id).setAttribute('aria-hidden', 'true');
    gsap.set($(id), { autoAlpha: 0 });
  });
}

function unloadMedia() {
  $('modal-instagram').removeAttribute('src');
  $('modal-instagram').hidden = true;
  $('modal-image').hidden = true;
  $('instagram-link').hidden = true;
  $('media-error').hidden = true;
  $('modal').inert = true;
  $('modal').setAttribute('aria-hidden', 'true');
  gsap.set($('modal'), { autoAlpha: 0 });
  connector.style.visibility = 'hidden';
}

function killActiveSectionTransition() {
  revision++;
  activeSectionTimeline?.kill();
  activeSectionTimeline = null;
  gsap.killTweensOf($('modal'));
  gsap.killTweensOf(framing);
  if (camera) gsap.killTweensOf(camera.position);
  cameraMoving = false;
  hoveredIndex = -1;
  unloadMedia();
  $('intro-video-bg').pause();
  gsap.set('.trans-line, .sub-line', { opacity: 0 });
  return revision;
}

function setActiveNav(section) {
  ['intro', 'journey', 'wedding'].forEach((name, i) => {
    const btn = $(`nav-${name}`);
    if (name === section) btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
    document.querySelectorAll('.nav-dot')[i].classList.toggle('active', i <= ['intro', 'journey', 'wedding'].indexOf(section));
  });
  const progress = section === 'intro' ? 0 : section === 'wedding' ? 100 : 50 + visited.size / locations.length * 45;
  $('nav-fill').style.width = `${progress}%`;
  $('journey-count').textContent = visited.size ? `(${visited.size}/${locations.length})` : '';
}

function announce(text) { $('app-status').textContent = text; }

function playIntroTextAnimations() {
  killActiveSectionTransition();
  hideAllScreensImmediate();
  setState('intro');
  setActiveNav('intro');
  showScreen('intro-overlay');
  currentIndex = -1;
  if (intro.video) {
    const video = $('intro-video-bg');
    video.src = asset(intro.video);
    video.oncanplay = () => { video.hidden = false; };
    video.play().catch(() => { video.hidden = true; });
  }
  const tl = gsap.timeline();
  activeSectionTimeline = tl;
  gsap.set('.title-layout', { autoAlpha: reducedMotion.matches ? 1 : 0 });
  if (!reducedMotion.matches) {
    document.querySelectorAll('.sub-line').forEach(line => {
      tl.to(line, { opacity: 1, duration: .6 }).to(line, { opacity: 0, duration: .5, delay: .55 });
    });
    tl.to('.title-layout', { autoAlpha: 1, duration: 1.2 });
  }
  announce('Simona a Martin. A journey of us.');
}

// Keep the reference's line-by-line transition choreography.
function animateTransitionLines(tl, screen, hold = .8) {
  screen.querySelectorAll('.trans-line').forEach(line => {
    tl.to(line, { opacity: 1, duration: duration(.65), ease: 'power2.inOut' })
      .to(line, { opacity: 0, duration: duration(.55), delay: reducedMotion.matches ? .45 : hold, ease: 'power2.inOut' });
  });
}

async function playJourneyTransition() {
  const request = killActiveSectionTransition();
  hideAllScreensImmediate();
  setState('transition');
  setActiveNav('journey');
  showScreen('transition-screen', false);
  announce('Pripravujeme glóbus našich ciest.');
  await ensureGlobeScene();
  if (request !== revision) return;
  currentIndex = -1;
  framing.x = 0; framing.y = .065;
  showScreen('journey-scene', false);
  gsap.set([$ ('label-layer'), $('journey-instruction')], { autoAlpha: 0 });
  if (camera) {
    const start = latLonToVec3(30, 15, overviewDistance() * 1.6);
    camera.position.copy(start);
    controls.autoRotate = !reducedMotion.matches;
    flyCamera(30, 15, overviewDistance(), 2.4);
  }
  const tl = gsap.timeline();
  activeSectionTimeline = tl;
  animateTransitionLines(tl, $('transition-screen'));
  tl.to($('transition-screen'), { autoAlpha: 0, duration: duration(.4) })
    .call(() => {
      $('transition-screen').setAttribute('aria-hidden', 'true');
      showScreen('journey-scene');
      setState('journey');
      announce('Vyberte mesto alebo otočte glóbus.');
    })
    .to([$ ('label-layer'), $('journey-instruction')], { autoAlpha: 1, duration: duration(.7) });
}

function playWeddingTransition() {
  killActiveSectionTransition();
  hideAllScreensImmediate();
  setState('final-transition');
  setActiveNav('wedding');
  showScreen('final-transition-screen', false);
  announce('And now, Our new adventure begins.');
  const tl = gsap.timeline();
  activeSectionTimeline = tl;
  animateTransitionLines(tl, $('final-transition-screen'), .75);
  tl.to($('final-transition-screen'), { autoAlpha: 0, duration: duration(.5) })
    .call(() => {
      $('final-transition-screen').setAttribute('aria-hidden', 'true');
      setState('handoff');
      showScreen('wedding-handoff');
      gsap.set($('wedding-handoff'), { opacity: 0 });
      announce('Pokračujeme na svadobný web.');
    })
    .to($('wedding-handoff'), { opacity: 1, duration: duration(.7) })
    .call(() => { window.location.assign(wedding.url); }, [], '+=1.6');
}

function latLonToVec3(lat, lon, radius) {
  const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

function overviewDistance() { return Math.max(60, 58 / (innerWidth / innerHeight)); }
function memoryDistance() { return mobile() ? Math.max(78, 44 / (innerWidth / innerHeight)) : 46; }

function flyCamera(lat, lon, distance, seconds, onComplete) {
  if (!camera) { onComplete?.(); return; }
  gsap.killTweensOf(camera.position);
  controls.autoRotate = false;
  controls.enabled = false;
  cameraMoving = true;
  const target = latLonToVec3(lat, lon, distance);
  gsap.to(camera.position, {
    x: target.x, y: target.y, z: target.z, duration: duration(seconds), ease: 'power2.inOut',
    onUpdate: () => camera.lookAt(0, 0, 0),
    onComplete: () => {
      cameraMoving = false;
      controls.update();
      controls.enabled = state === 'journey';
      controls.autoRotate = state === 'journey' && !reducedMotion.matches;
      onComplete?.();
    }
  });
}

function createLabels() {
  locations.forEach((loc, index) => {
    const label = document.createElement('button');
    label.className = `city-label ${loc.side}-side`;
    label.dataset.city = loc.key;
    label.style.top = loc.top;
    label.style[loc.side] = loc.x;
    const name = document.createElement('span'); name.className = 'city-name'; name.textContent = loc.name;
    const sub = document.createElement('span'); sub.className = 'city-subname'; sub.textContent = loc.subname;
    label.append(name, sub);
    label.onclick = () => flyToAndShow(index);
    label.onpointerenter = label.onfocus = () => { hoveredIndex = index; };
    label.onpointerleave = label.onblur = () => { hoveredIndex = -1; };
    $('label-layer').append(label);
    markerData.push({ element: label, mesh: null });
  });
}

async function ensureGlobeScene() {
  if (globeInitPromise) return globeInitPromise;
  globeInitPromise = (async () => {
    try {
      const [three, orbit] = await Promise.all([import('three'), import('three/addons/controls/OrbitControls.js')]);
      THREE = three;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .1, 1000);
      camera.position.copy(latLonToVec3(30, 15, overviewDistance()));
      renderer = new THREE.WebGLRenderer({ canvas: $('three-canvas'), antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1.5 : 2));
      renderer.setSize(innerWidth, innerHeight);
      controls = new orbit.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.autoRotateSpeed = .45;
      globeGroup = new THREE.Group();
      scene.add(globeGroup);
      globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 48, 32), new THREE.MeshBasicMaterial({color: 0xf5f4f0})));
      globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS + .025, 36, 24), new THREE.MeshBasicMaterial({color: 0x8e918c, wireframe: true, transparent: true, opacity: .08})));
      const pointGeometry = new THREE.SphereGeometry(.13, 12, 10);
      const pointMaterial = new THREE.MeshBasicMaterial({color: 0x252724});
      locations.forEach((loc, index) => {
        const mesh = new THREE.Mesh(pointGeometry, pointMaterial);
        mesh.position.copy(latLonToVec3(loc.lat, loc.lon, GLOBE_RADIUS + .17));
        globeGroup.add(mesh);
        markerData[index].mesh = mesh;
      });
      // Same Natural Earth boundary model as the reference, bundled locally.
      Promise.resolve(countries).then(rings => {
        const positions = [];
        rings.forEach(ring => {
          for (let i = 1; i < ring.length; i++) {
            [ring[i - 1], ring[i]].forEach(([lon, lat]) => {
              const p = latLonToVec3(lat, lon, GLOBE_RADIUS + .07);
              positions.push(p.x, p.y, p.z);
            });
          }
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        globeGroup.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color: 0x64685f, transparent: true, opacity: .26})));
      }).catch(() => announce('Mapa hraníc sa nenačítala; glóbus a spomienky sú dostupné.'));
      $('three-canvas').addEventListener('webglcontextlost', event => {
        event.preventDefault();
        $('globe-fallback').hidden = false;
        connector.style.visibility = 'hidden';
      });
      $('three-canvas').addEventListener('webglcontextrestored', () => { $('globe-fallback').hidden = true; });
      renderer.setAnimationLoop(animate);
    } catch (error) {
      console.warn('Globe unavailable:', error.message);
      $('globe-fallback').hidden = false;
      $('three-canvas').hidden = true;
      renderer = null; camera = null; controls = null;
    }
  })();
  return globeInitPromise;
}

function applyFraming() {
  camera.setViewOffset(view.width, view.height, view.width * framing.x, view.height * framing.y, view.width, view.height);
}

function animate() {
  if (document.hidden || !['transition', 'journey', 'memory'].includes(state)) return;
  if (view.width !== innerWidth || view.height !== innerHeight) {
    view.width = innerWidth; view.height = innerHeight;
    renderer.setSize(view.width, view.height);
    camera.aspect = view.width / view.height;
    camera.updateProjectionMatrix();
  }
  applyFraming();
  if (!cameraMoving) controls.update();
  renderer.render(scene, camera);
  updateConnector();
}

function updateConnector() {
  const selected = state === 'memory' ? currentIndex : state === 'journey' ? hoveredIndex : -1;
  if (selected < 0 || !markerData[selected]?.mesh || $('globe-fallback').hidden === false) {
    connector.style.visibility = 'hidden'; return;
  }
  const world = markerData[selected].mesh.getWorldPosition(new THREE.Vector3());
  const facing = world.clone().normalize().dot(camera.position.clone().normalize()) > .15;
  const p = world.project(camera);
  if (!facing || p.z >= 1) { connector.style.visibility = 'hidden'; return; }
  const rect = (state === 'memory' ? $('modal') : markerData[selected].element).getBoundingClientRect();
  const x = (p.x + 1) * innerWidth / 2, y = (1 - p.y) * innerHeight / 2;
  let endX = locations[selected].side === 'left' ? rect.right : rect.left;
  let endY = rect.top + rect.height / 2;
  if (state === 'memory') { endX = mobile() ? rect.left + rect.width / 2 : rect.left; endY = mobile() ? rect.top : rect.top + rect.height / 2; }
  connector.setAttribute('x1', x); connector.setAttribute('y1', y);
  connector.setAttribute('x2', endX); connector.setAttribute('y2', endY);
  connector.style.visibility = 'visible';
}

function flyToAndShow(index) {
  if (!['journey', 'memory'].includes(state)) return;
  const request = killActiveSectionTransition();
  currentIndex = index;
  setState('memory');
  setActiveNav('journey');
  const loc = locations[index];
  gsap.set($('journey-instruction'), { autoAlpha: 0 });
  markerData.forEach((item, i) => item.element.classList.toggle('selected', i === index));
  $('modal-city').textContent = loc.name;
  $('modal-location').textContent = loc.special === 'engagement' ? `Zásnuby · ${loc.subname}` : loc.subname;
  $('memory-number').textContent = `${String(index + 1).padStart(2,'0')} / ${String(locations.length).padStart(2,'0')}`;
  const targetFraming = mobile() ? {x:0, y:.29} : {x:.22, y:0};
  gsap.to(framing, {...targetFraming, duration:duration(1.2), ease:'power2.inOut'});
  flyCamera(loc.lat, loc.lon, memoryDistance(), 1.3, () => {
    if (revision !== request) return;
    if (loc.type === 'instagram') {
      $('modal-instagram').src = loc.media;
      $('modal-instagram').hidden = false;
      $('instagram-link').href = loc.external;
      $('instagram-link').hidden = false;
    } else {
      const img = $('modal-image');
      img.alt = `Simona a Martin — ${loc.name}`;
      img.onerror = () => { img.hidden = true; $('media-error').hidden = false; };
      img.src = asset(loc.media);
      img.hidden = false;
    }
    visited.add(index);
    markerData[index].element.classList.add('visited');
    setActiveNav('journey');
    $('video-skip-btn').innerHTML = visited.size === locations.length ? 'Naša svadba <span aria-hidden="true">↗</span>' : 'Ďalšia <span aria-hidden="true">↗</span>';
    $('modal').setAttribute('aria-hidden','false');
    $('modal').inert = false;
    gsap.to($('modal'), {autoAlpha:1,duration:duration(.6)});
    $('modal-city').focus({preventScroll:true});
    announce(`${loc.name}, ${loc.subname}. Spomienka ${index + 1} zo ${locations.length}.`);
  });
}

function closeModal() {
  if (state !== 'memory') return;
  const previous = currentIndex;
  killActiveSectionTransition();
  setState('journey');
  currentIndex = -1;
  gsap.to(framing, {x:0,y:.065,duration:duration(.8)});
  const loc = locations[previous];
  flyCamera(loc.lat,loc.lon,overviewDistance(),.9);
  gsap.set($('label-layer'), {autoAlpha:1});
  gsap.to($('journey-instruction'), {autoAlpha:1,duration:duration(.5)});
  markerData[previous].element.focus({preventScroll:true});
}

function nextMemory() {
  if (state !== 'memory') return;
  for (let offset = 1; offset <= locations.length; offset++) {
    const next = (currentIndex + offset) % locations.length;
    if (!visited.has(next)) { flyToAndShow(next); return; }
  }
  playWeddingTransition();
}

createLabels();
$('next-btn').onclick = $('nav-journey').onclick = playJourneyTransition;
$('header-home').onclick = $('nav-intro').onclick = playIntroTextAnimations;
$('nav-wedding').onclick = playWeddingTransition;
$('video-stop-btn').onclick = closeModal;
$('video-skip-btn').onclick = nextMemory;
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
$('three-canvas').addEventListener('pointerdown', event => { pointerDown = {x:event.clientX,y:event.clientY}; });
$('three-canvas').addEventListener('pointerup', event => {
  if (state !== 'journey' || !camera || !pointerDown || Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>6) return;
  let closest = -1, distance = 15;
  markerData.forEach((item,index) => {
    const world = item.mesh.position.clone();
    if (world.clone().normalize().dot(camera.position.clone().normalize()) < .15) return;
    const p = world.project(camera);
    const delta = Math.hypot((p.x+1)*innerWidth/2-event.clientX,(1-p.y)*innerHeight/2-event.clientY);
    if (delta < distance) {closest=index;distance=delta;}
  });
  if (closest >= 0) flyToAndShow(closest);
});
window.addEventListener('resize', () => {
  if (!camera) return;
  if (state === 'memory') {
    gsap.killTweensOf(framing);
    framing.x = mobile() ? 0 : .22; framing.y = mobile() ? .29 : 0;
    const loc = locations[currentIndex];
    if (!cameraMoving) flyCamera(loc.lat,loc.lon,memoryDistance(),0);
  } else if (state === 'journey' && !cameraMoving) camera.position.normalize().multiplyScalar(overviewDistance());
});
reducedMotion.addEventListener('change', () => { if (controls) controls.autoRotate = state === 'journey' && !reducedMotion.matches; });
window.addEventListener('pageshow', event => { if (event.persisted) playIntroTextAnimations(); });

let loaded = false;
function finishLoading() {
  if (loaded) return;
  loaded = true;
  clearTimeout(loadTimeout);
  $('preloader-percentage').textContent = '100%';
  $('loading-ring').style.setProperty('--p','100%');
  $('interactive-preloader').inert = true;
  $('interactive-preloader').setAttribute('aria-hidden','true');
  gsap.to($('interactive-preloader'), {autoAlpha:0,duration:duration(.45)});
  document.body.classList.remove('loading');
  $('persistent-header').inert = $('bottom-nav').inert = false;
  playIntroTextAnimations();
  const initialView = new URLSearchParams(location.search).get('view');
  if (initialView === 'journey') playJourneyTransition();
  if (initialView === 'wedding') playWeddingTransition();
}
const loadTimeout = setTimeout(finishLoading, 6000);
$('pl-skip-btn').onclick = finishLoading;
$('preloader-percentage').textContent = '50%';
$('loading-ring').style.setProperty('--p','50%');
const poster = $('intro-poster');
if (poster.complete) finishLoading();
else { poster.addEventListener('load',finishLoading,{once:true}); poster.addEventListener('error',finishLoading,{once:true}); }

