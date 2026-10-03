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
const journeyMotion = { focus: 0, spin: 0 };
let globeFlight, lastFrame = 0, idleSince = 0, dragging = false, layoutDirty = true;
let overviewMaterial, wireMaterial, detailPromise, detailReady = 0;
const detailLayers = [];
const countryByCity = { granada:'ESP', malaga:'ESP', sevilla:'ESP', trnava:'SVK', london:'GBR', liverpool:'GBR', madeira:'PRT', tokyo:'JPN', firenze:'ITA', sardinia:'ITA', seoul:'KOR', beijing:'CHN' };
const layout = { minY:100, maxY:500, margin:20, modal:null };
let worldPoint, projectedPoint, surfaceNormal, cameraDirection, centerPoint;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const smoothstep = (a,b,n) => {const t=clamp((n-a)/(b-a),0,1);return t*t*(3-2*t);};
const fullscreenVideo = { active:false, closing:false, timeline:null };
const videoScene=$('destination-video-scene'), destinationVideo=$('destination-video');

function resetFullscreenVideo() {
  fullscreenVideo.timeline?.kill();
  gsap.killTweensOf(destinationVideo);
  destinationVideo.pause();
  if(destinationVideo.hasAttribute('src')){
    destinationVideo.removeAttribute('src');destinationVideo.load();
  }
  videoScene.inert=true;videoScene.setAttribute('aria-hidden','true');
  gsap.set(videoScene,{autoAlpha:0});
  if(fullscreenVideo.active){
    $('app').inert=false;$('persistent-header').inert=false;$('bottom-nav').inert=false;
  }
  fullscreenVideo.active=false;fullscreenVideo.closing=false;
  delete document.body.dataset.fullscreenVideo;
}

function prepareFullscreenVideo(loc) {
  destinationVideo.muted=true;destinationVideo.defaultMuted=true;
  destinationVideo.src=loc.fullscreenVideo;destinationVideo.load();
  $('destination-video-title').textContent=loc.name;
  $('destination-video-country').textContent=loc.subname;
  $('destination-video-status').textContent='Načítavam spomienku…';
  $('destination-video-retry').hidden=true;
  gsap.set(destinationVideo,{opacity:0,scale:reducedMotion.matches?1:1.035});
}

function playFullscreenVideo() {
  const request=revision;
  destinationVideo.play()?.catch(()=>{
    if(request!==revision||!fullscreenVideo.active||fullscreenVideo.closing)return;
    $('destination-video-status').textContent='Ťuknutím spustíte video.';
    $('destination-video-retry').hidden=false;
  });
}

function openFullscreenVideo() {
  fullscreenVideo.active=true;
  document.body.dataset.fullscreenVideo='true';
  videoScene.inert=false;videoScene.setAttribute('aria-hidden','false');
  $('app').inert=true;$('persistent-header').inert=true;$('bottom-nav').inert=true;
  fullscreenVideo.timeline=gsap.to(videoScene,{autoAlpha:1,duration:duration(.85),ease:'power2.inOut'});
  $('destination-video-close').focus({preventScroll:true});
  playFullscreenVideo();
}

function closeFullscreenVideo() {
  if(fullscreenVideo.closing)return;
  fullscreenVideo.closing=true;
  fullscreenVideo.timeline?.kill();
  destinationVideo.pause();
  fullscreenVideo.timeline=gsap.to(videoScene,{autoAlpha:0,duration:duration(.6),ease:'power2.inOut',onComplete:()=>{
    resetFullscreenVideo();closeModal();
  }});
}
destinationVideo.addEventListener('playing',()=>{
  if(!fullscreenVideo.active||fullscreenVideo.closing){destinationVideo.pause();return;}
  $('destination-video-status').textContent='';$('destination-video-retry').hidden=true;
  gsap.to(destinationVideo,{opacity:1,scale:1,duration:duration(1.1),ease:'power2.out'});
});
destinationVideo.addEventListener('error',()=>{
  if(!destinationVideo.hasAttribute('src'))return;
  $('destination-video-status').textContent='Video sa nepodarilo načítať.';
  $('destination-video-retry').hidden=false;
});
$('destination-video-close').onclick=closeFullscreenVideo;
$('destination-video-retry').onclick=()=>{destinationVideo.load();playFullscreenVideo();};
videoScene.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const close=$('destination-video-close'),retry=$('destination-video-retry');
  if(retry.hidden){event.preventDefault();close.focus();}
  else if(event.shiftKey&&document.activeElement===close){event.preventDefault();retry.focus();}
  else if(!event.shiftKey&&document.activeElement===retry){event.preventDefault();close.focus();}
});

function setState(next) {
  state = next;
  document.body.dataset.state = next;
  if (controls) {
    controls.enabled = next === 'journey' && !cameraMoving;
    controls.autoRotate = next === 'journey' && !reducedMotion.matches;
    idleSince = performance.now();
  }
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
  resetFullscreenVideo();
  $('modal-instagram').removeAttribute('src');
  $('modal-instagram').hidden = true;
  $('modal-image').hidden = true;
  $('instagram-link').hidden = true;
  $('media-error').hidden = true;
  $('media-error').classList.remove('empty-memory');
  $('media-error').textContent = 'Fotografiu sa nepodarilo načítať.';
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
  globeFlight?.kill();
  gsap.killTweensOf(journeyMotion);
  dragging = false; journeyMotion.spin = 0;
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
  journeyMotion.focus = 0; layoutDirty = true;
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

function overviewDistance() { return Math.max(60, 51 / (innerWidth / innerHeight)); }
function memoryDistance() { return mobile() ? 18 : 15.8; }

function flyCamera(lat, lon, distance, seconds, onComplete) {
  if (!camera) { onComplete?.(); return; }
  globeFlight?.kill();
  gsap.killTweensOf(camera.position);
  controls.autoRotate = false;
  controls.enabled = false;
  // Flush residual OrbitControls damping before the independent camera flight.
  const saved = camera.position.clone();
  controls.enableDamping = false; controls.update();
  camera.position.copy(saved); camera.lookAt(0,0,0); controls.enableDamping = true;
  cameraMoving = true; journeyMotion.spin = 0;
  const start = camera.position.clone().normalize();
  const end = latLonToVec3(lat,lon,1);
  const rotation = new THREE.Quaternion().setFromUnitVectors(start,end);
  const identity = new THREE.Quaternion(), step = new THREE.Quaternion();
  const direction = new THREE.Vector3();
  const flight = { turn:0, radius:camera.position.length() };
  const update = () => {
    step.copy(identity).slerp(rotation,flight.turn);
    direction.copy(start).applyQuaternion(step);
    camera.position.copy(direction).multiplyScalar(Math.max(GLOBE_RADIUS+2.5,flight.radius));
    camera.lookAt(0,0,0);
  };
  const complete = () => {
    cameraMoving=false;
    controls.update();
    controls.enabled=state==='journey';
    controls.autoRotate=state==='journey'&&!reducedMotion.matches;
    idleSince=performance.now();
    onComplete?.();
  };
  if (reducedMotion.matches || seconds===0) {
    flight.turn=1; flight.radius=distance; update(); complete(); return;
  }
  globeFlight=gsap.timeline({onUpdate:update,onComplete:complete});
  if(state==='memory') {
    // Orient on the sphere, then descend radially: never cut through the Earth.
    globeFlight.to(flight,{turn:1,radius:Math.max(flight.radius,30),duration:.95,ease:'power2.inOut'})
      .to(flight,{radius:distance,duration:1.65,ease:'power3.inOut'});
  } else globeFlight.to(flight,{turn:1,radius:distance,duration:seconds,ease:'power2.inOut'});
}

function createLabels() {
  locations.forEach((loc, index) => {
    const label = document.createElement('button');
    label.className = `city-label ${loc.side}-side`;
    label.dataset.city = loc.key;
    // Geographic placement replaces the config's old fixed label slots.
    label.setAttribute('aria-label',loc.name+' — '+loc.subname);
    const name = document.createElement('span'); name.className = 'city-name'; name.textContent = loc.name;
    const sub = document.createElement('span'); sub.className = 'city-subname'; sub.textContent = loc.subname;
    label.append(name, sub);
    label.onclick = () => flyToAndShow(index);
    label.onpointerenter = label.onfocus = () => { hoveredIndex = index; };
    label.onpointerleave = label.onblur = () => { hoveredIndex = -1; };
    $('label-layer').append(label);
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.classList.add('city-connector'); line.dataset.city=loc.key;
    $('svg-canvas').insertBefore(line,connector);
    markerData.push({ element:label, mesh:null, line, index, side:loc.side,
      x:0,y:0,targetX:0,targetY:0,px:0,py:0,alpha:0,width:100,height:34,
      initialized:false,facing:0,visible:false });
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
      controls.autoRotateSpeed = 0;
      controls.dampingFactor = .075;
      controls.rotateSpeed = mobile() ? .5 : .65;
      controls.addEventListener('start',()=>{dragging=true;journeyMotion.spin=0;controls.autoRotate=false;});
      controls.addEventListener('end',()=>{dragging=false;idleSince=performance.now()+900;});
      worldPoint=new THREE.Vector3(); projectedPoint=new THREE.Vector3();
      surfaceNormal=new THREE.Vector3(); cameraDirection=new THREE.Vector3(); centerPoint=new THREE.Vector3();
      $('three-canvas').tabIndex=0;
      globeGroup = new THREE.Group();
      scene.add(globeGroup);
      globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 128, 96), new THREE.MeshBasicMaterial({color: 0xf5f4f0})));
      wireMaterial=new THREE.LineBasicMaterial({color:0x8e918c,transparent:true,opacity:.08,depthWrite:false});
      const netSource=new THREE.IcosahedronGeometry(GLOBE_RADIUS,3);
      const netEdges=new THREE.WireframeGeometry(netSource);
      const netPositions=netEdges.attributes.position, netPoints=[];
      const netA=new THREE.Vector3(),netB=new THREE.Vector3(),netPoint=new THREE.Vector3();
      for(let edge=0;edge<netPositions.count;edge+=2){
        netA.fromBufferAttribute(netPositions,edge);netB.fromBufferAttribute(netPositions,edge+1);
        for(let segment=0;segment<8;segment++)for(const t of [segment/8,(segment+1)/8]){
          netPoint.copy(netA).lerp(netB,t).normalize().multiplyScalar(GLOBE_RADIUS+.04);
          netPoints.push(netPoint.x,netPoint.y,netPoint.z);
        }
      }
      const netGeometry=new THREE.BufferGeometry();
      netGeometry.setAttribute('position',new THREE.Float32BufferAttribute(netPoints,3));
      globeGroup.add(new THREE.LineSegments(netGeometry,wireMaterial));
      netEdges.dispose();netSource.dispose();
      const pointGeometry = new THREE.SphereGeometry(.13, 12, 10);
      const pointMaterial = new THREE.MeshBasicMaterial({color: 0x252724,transparent:true,depthWrite:false});
      locations.forEach((loc, index) => {
        const mesh = new THREE.Mesh(pointGeometry, pointMaterial.clone());
        mesh.position.copy(latLonToVec3(loc.lat, loc.lon, GLOBE_RADIUS + .17));
        globeGroup.add(mesh);
        markerData[index].mesh = mesh;
      });
      overviewMaterial=new THREE.LineBasicMaterial({color:0x64685f,transparent:true,opacity:.26,depthWrite:false});
      globeGroup.add(new THREE.LineSegments(boundaryGeometry(countries),overviewMaterial));
      loadGeographicDetail();
      const measureObserver=new ResizeObserver(()=>{layoutDirty=true;});
      markerData.forEach(item=>measureObserver.observe(item.element));
      measureObserver.observe($('modal')); measureObserver.observe($('persistent-header'));
      document.fonts?.ready.then(()=>{layoutDirty=true;});
      $('three-canvas').addEventListener('webglcontextlost', event => {
        event.preventDefault();
        $('globe-fallback').hidden = false;
        connector.style.visibility = 'hidden';
        showFallbackLabels();
      });
      $('three-canvas').addEventListener('webglcontextrestored', () => { $('globe-fallback').hidden = true; layoutDirty=true; });
      renderer.setAnimationLoop(animate);
    } catch (error) {
      console.warn('Globe unavailable:', error.message);
      $('globe-fallback').hidden = false;
      $('three-canvas').hidden = true;
      renderer = null; camera = null; controls = null;
      showFallbackLabels();
    }
  })();
  return globeInitPromise;
}

function applyFraming() {
  camera.setViewOffset(view.width, view.height, view.width * framing.x, view.height * framing.y, view.width, view.height);
}

function boundaryGeometry(rings) {
  const positions=[];
  const a=new THREE.Vector3(),b=new THREE.Vector3(),p=new THREE.Vector3(),q=new THREE.Vector3();
  const radius=GLOBE_RADIUS+.045;
  rings.forEach(ring=>{
    for(let i=1;i<ring.length;i++) {
      a.copy(latLonToVec3(ring[i-1][1],ring[i-1][0],1));
      b.copy(latLonToVec3(ring[i][1],ring[i][0],1));
      const steps=Math.max(1,Math.ceil(a.angleTo(b)/.012));
      // Great-circle subdivision keeps every chord outside the opaque globe.
      for(let j=0;j<steps;j++) {
        p.copy(a).lerp(b,j/steps).normalize().multiplyScalar(radius);
        q.copy(a).lerp(b,(j+1)/steps).normalize().multiplyScalar(radius);
        positions.push(p.x,p.y,p.z,q.x,q.y,q.z);
      }
    }
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  return geometry;
}

function loadGeographicDetail() {
  if(!THREE || detailPromise)return detailPromise;
  detailPromise=import('./geography-detail-v3.json').then(({default:data})=>{
    for(const feature of data.features) {
      const material=new THREE.LineBasicMaterial({color:0x64685f,transparent:true,opacity:0,depthWrite:false});
      const line=new THREE.LineSegments(boundaryGeometry(feature.rings),material);
      line.visible=false; globeGroup.add(line);
      detailLayers.push({iso:feature.iso,line,material});
    }
  }).catch(()=>{ /* Overview geometry remains available if optional detail fails. */ });
  return detailPromise;
}

function measureJourneyLayout() {
  layoutDirty=false;
  const header=$('persistent-header').getBoundingClientRect();
  const instruction=$('journey-instruction').getBoundingClientRect();
  layout.margin=mobile()?12:Math.max(24,innerWidth*.035);
  layout.minY=Math.max(header.bottom+24,mobile()?96:100);
  layout.maxY=Math.max(layout.minY+100,instruction.top-20);
  layout.modal=$('modal').getBoundingClientRect();
  markerData.forEach(item=>{
    item.width=item.element.offsetWidth || (mobile()?95:126);
    item.height=item.element.offsetHeight || 36;
  });
}

function showFallbackLabels() {
  if($('globe-fallback').hidden)return;
  measureJourneyLayout();
  markerData.forEach((item,i)=>{
    const side=i<6?'left':'right';
    item.element.dataset.side=side;
    const x=side==='left'?layout.margin:innerWidth-layout.margin-item.width;
    const y=layout.minY+(i%6)*(layout.maxY-layout.minY)/6;
    item.element.style.transform=`translate3d(${x}px,${y}px,0)`;
    item.element.style.opacity='1'; item.element.style.visibility='visible';
    item.element.style.pointerEvents=state==='memory'?'none':'auto';
    item.element.tabIndex=0; item.element.removeAttribute('aria-hidden');
    item.line.style.visibility='hidden';
  });
}

// Ordered relaxation: geographic Y drives placement; viewport bounds and gaps
// are enforced twice, also after damping so moving labels cannot overlap.
function separateLabels(items,key,minY,maxY,gap=9) {
  if(!items.length)return;
  items.sort((a,b)=>a[key]-b[key] || a.index-b.index);
  let cursor=minY;
  for(const item of items){item[key]=Math.max(cursor,Math.min(item[key],maxY-item.height));cursor=item[key]+item.height+gap;}
  cursor=maxY;
  for(let i=items.length-1;i>=0;i--){const item=items[i];item[key]=Math.min(item[key],cursor-item.height);cursor=item[key]-gap;}
  if(items[0][key]<minY){
    const spacing=(maxY-minY-items[items.length-1].height)/Math.max(1,items.length-1);
    items.forEach((item,i)=>{item[key]=minY+i*spacing;});
  }
}

function animate(time) {
  const dt=Math.min(.05,Math.max(.001,(time-(lastFrame||time-16.7))/1000));
  lastFrame=time;
  if(document.hidden||!['transition','journey','memory'].includes(state))return;
  if(!$('globe-fallback').hidden){showFallbackLabels();return;}
  if(view.width!==innerWidth||view.height!==innerHeight){
    view.width=innerWidth;view.height=innerHeight;
    renderer.setSize(view.width,view.height);
    camera.aspect=view.width/view.height;camera.updateProjectionMatrix();layoutDirty=true;
  }
  if(layoutDirty)measureJourneyLayout();
  applyFraming();
  if(!cameraMoving){
    // Touch focus survives closing a memory on Safari; it must not freeze idle rotation.
    const canSpin=state==='journey'&&!dragging&&!reducedMotion.matches&&performance.now()>idleSince;
    journeyMotion.spin+=( (canSpin?.65:0)-journeyMotion.spin)*(1-Math.exp(-dt*2.2));
    controls.autoRotate=canSpin || journeyMotion.spin>.001;
    controls.autoRotateSpeed=journeyMotion.spin;
    controls.update(dt);
  }
  camera.updateMatrixWorld();globeGroup.updateMatrixWorld(true);
  const detail=smoothstep(0,1,(36-camera.position.length())/18);
  if(detailLayers.length)detailReady+=(1-detailReady)*(1-Math.exp(-dt*3));
  const mix=detail*detailReady;
  overviewMaterial.opacity=.26*(1-mix*.86);
  wireMaterial.opacity=.08*(1-detail*.94);
  const selectedCountry=currentIndex>=0?countryByCity[locations[currentIndex].key]:null;
  for(const layer of detailLayers){
    layer.material.opacity=mix*(layer.iso===selectedCountry?.52:.19);
    layer.line.visible=layer.material.opacity>.002;
  }
  updateGeographicLabels(dt);
  renderer.render(scene,camera);
  updateConnector();
}

function updateGeographicLabels(dt) {
  const blend=1-Math.exp(-dt*10),fade=1-Math.exp(-dt*9);
  centerPoint.set(0,0,0).project(camera);
  const cx=(centerPoint.x+1)*view.width/2;
  const distance=camera.position.length();
  const radius=view.height*.5/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*GLOBE_RADIUS/Math.sqrt(distance*distance-GLOBE_RADIUS*GLOBE_RADIUS);
  const sides={left:[],right:[]};
  for(const item of markerData){
    item.mesh.getWorldPosition(worldPoint);
    surfaceNormal.copy(worldPoint).normalize();
    cameraDirection.copy(camera.position).sub(worldPoint).normalize();
    // Perspective-correct horizon: dot(normal, camera - surfacePoint), not
    // just camera direction from origin (which leaks backside lines on zoom).
    item.facing=surfaceNormal.dot(cameraDirection);
    projectedPoint.copy(worldPoint).project(camera);
    item.px=(projectedPoint.x+1)*view.width/2;item.py=(1-projectedPoint.y)*view.height/2;
    const onScreen=projectedPoint.z<1&&Math.abs(projectedPoint.x)<1.02&&Math.abs(projectedPoint.y)<1.02;
    item.visible=item.facing>.012&&onScreen;
    let alpha=onScreen?smoothstep(.012,.16,item.facing):0;
    const selected=item.index===currentIndex;
    alpha*=selected?1:1-journeyMotion.focus;
    const dx=item.px-cx,threshold=Math.min(30,radius*.15);
    const desired=selected && state==='memory'?'left':dx < -threshold?'left':dx>threshold?'right':item.side;
    // Fade across the side boundary instead of sliding a label over the map.
    if(desired!==item.side){
      alpha=0;
      if(item.alpha<.04){item.side=desired;item.initialized=false;}
    }
    item.alpha+=(alpha-item.alpha)*fade;
    if(!item.visible)item.alpha=Math.min(item.alpha,Math.max(0,item.facing)*5);
    const markerAlpha=item.visible?smoothstep(.012,.13,item.facing)*(selected?1:1-journeyMotion.focus*.92):0;
    item.mesh.material.opacity=markerAlpha;item.mesh.visible=markerAlpha>.005;
    // Keep dark points small in screen space during the strong camera zoom.
    const markerDistance=worldPoint.distanceTo(camera.position);
    const pixelSize=selected?3:2;
    item.mesh.scale.setScalar(clamp(pixelSize*markerDistance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/(view.height*.5*.13),.08,1.5));
    item.targetY=clamp(item.py-item.height/2,layout.minY,layout.maxY-item.height);
    const edge=item.side==='left'?cx-radius-18-item.width+dx*.12:cx+radius+18+dx*.12;
    const leftMax=Math.max(layout.margin,cx-item.width-22);
    const rightMin=Math.min(view.width-layout.margin-item.width,cx+22);
    item.targetX=item.side==='left'?clamp(edge,layout.margin,leftMax):clamp(edge,rightMin,view.width-layout.margin-item.width);
    if(item.alpha>.015 || alpha>.015)sides[item.side].push(item);
    item.element.dataset.side=item.side;
  }
  // Dense European clusters may exceed one edge's height on landscape phones.
  // Move the innermost projected points to the other edge, deterministically.
  for(const side of ['left','right']){
    const other=side==='left'?'right':'left';
    const capacity=Math.max(1,Math.floor((layout.maxY-layout.minY)/((sides[side][0]?.height||34)+9)));
    while(sides[side].length>capacity&&sides[other].length<capacity){
      let candidate=sides[side].reduce((a,b)=>Math.abs(a.px-cx)<Math.abs(b.px-cx)?a:b);
      sides[side].splice(sides[side].indexOf(candidate),1);sides[other].push(candidate);
      candidate.side=other;candidate.element.dataset.side=other;
      candidate.targetX=other==='left'?layout.margin:view.width-layout.margin-candidate.width;
    }
  }
  for(const items of Object.values(sides)){
    if(state==='journey' && journeyMotion.focus<.1){
      items.sort((a,b)=>a.py-b.py || a.index-b.index);
      const spread=Math.min(layout.maxY-layout.minY,mobile()?view.height*.58:view.height*.52);
      const middle=(layout.minY+layout.maxY)/2;
      items.forEach((item,rank)=>{
        // Open, staggered composition; order and continuous motion still come from projection.
        const slot=middle+(items.length===1?0:(rank/(items.length-1)-.5)*spread);
        item.targetY=clamp(slot*.8+item.targetY*.2,layout.minY,layout.maxY-item.height);
        const inset=[0,24,8,40][rank%4]*(mobile()?1:1.5);
        item.targetX+=item.side==='left'?inset:-inset;
        item.targetX=clamp(item.targetX,layout.margin,view.width-layout.margin-item.width);
      });
    }
    separateLabels(items,'targetY',layout.minY,layout.maxY);
    for(const item of items){
      if(!item.initialized){item.x=item.targetX;item.y=item.targetY;item.initialized=true;}
      else{item.x+=(item.targetX-item.x)*blend;item.y+=(item.targetY-item.y)*blend;}
    }
    separateLabels(items,'y',layout.minY,layout.maxY);
  }
  for(const item of markerData){
    const shown=item.alpha>.015 && item.visible;
    item.element.style.transform=`translate3d(${item.x.toFixed(2)}px,${item.y.toFixed(2)}px,0)`;
    item.element.style.opacity=item.alpha.toFixed(3);
    item.element.style.visibility=shown?'visible':'hidden';
    item.element.style.pointerEvents=shown&&state==='journey'&&!cameraMoving?'auto':'none';
    item.element.tabIndex=shown?0:-1;
    item.element.setAttribute('aria-hidden',shown?'false':'true');
    item.line.style.visibility=shown?'visible':'hidden';
    item.line.style.opacity=(item.alpha*.38).toFixed(3);
    if(shown){
      item.line.setAttribute('x1',item.px.toFixed(2));item.line.setAttribute('y1',item.py.toFixed(2));
      item.line.setAttribute('x2',(item.side==='left'?item.x+item.width:item.x).toFixed(2));
      item.line.setAttribute('y2',(item.y+item.height/2).toFixed(2));
    }
  }
}

function updateConnector() {
  const item=markerData[currentIndex];
  if(state!=='memory'||!item?.visible||$('modal').inert||!layout.modal){connector.style.visibility='hidden';return;}
  const rect=layout.modal;
  connector.setAttribute('x1',item.px);connector.setAttribute('y1',item.py);
  connector.setAttribute('x2',mobile()?rect.left+rect.width/2:rect.left);
  connector.setAttribute('y2',mobile()?rect.top:rect.top+rect.height/2);
  connector.style.visibility='visible';
}


function flyToAndShow(index) {
  if (!['journey', 'memory'].includes(state)) return;
  const request = killActiveSectionTransition();
  currentIndex = index;
  setState('memory');
  gsap.to(journeyMotion,{focus:1,duration:duration(1.7),ease:'power2.inOut'});
  loadGeographicDetail();
  setActiveNav('journey');
  const loc = locations[index];
  if(loc.fullscreenVideo)prepareFullscreenVideo(loc);
  gsap.set($('journey-instruction'), { autoAlpha: 0 });
  markerData.forEach((item, i) => item.element.classList.toggle('selected', i === index));
  $('modal-city').textContent = loc.name;
  $('modal-location').textContent = loc.special === 'engagement' ? `Zásnuby · ${loc.subname}` : (loc.description || loc.subname);
  $('memory-number').textContent = `${String(index + 1).padStart(2,'0')} / ${String(locations.length).padStart(2,'0')}`;
  const targetFraming = mobile() ? {x:0, y:.29} : {x:.22, y:0};
  gsap.to(framing, {...targetFraming, duration:duration(2.6), ease:'power2.inOut'});
  flyCamera(loc.lat, loc.lon, memoryDistance(), 1.3, () => {
    if (revision !== request) return;
    if(loc.fullscreenVideo){
      visited.add(index);markerData[index].element.classList.add('visited');setActiveNav('journey');
      openFullscreenVideo();announce(`${loc.name}, ${loc.subname}. Video spomienka.`);return;
    }
    if (loc.type === 'instagram') {
      $('modal-instagram').src = loc.media;
      $('modal-instagram').hidden = false;
      $('instagram-link').href = loc.external;
      $('instagram-link').hidden = false;
    } else if (loc.type === 'text') {
      $('media-error').textContent = loc.name;
      $('media-error').classList.add('empty-memory');
      $('media-error').hidden = false;
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
    layoutDirty=true;
    gsap.to($('modal'), {autoAlpha:1,duration:duration(.6)});
    $('modal-city').focus({preventScroll:true});
    announce(`${loc.name}, ${loc.subname}. Spomienka ${index + 1} zo ${locations.length}.`);
  });
}

function closeModal() {
  if (state !== 'memory') return;
  if(fullscreenVideo.active){closeFullscreenVideo();return;}
  const previous = currentIndex;
  killActiveSectionTransition();
  setState('journey');
  currentIndex = -1;
  gsap.to(framing, {x:0,y:.065,duration:duration(.8)});
  const loc = locations[previous];
  gsap.to(journeyMotion,{focus:0,duration:duration(1.8),ease:'power2.inOut'});
  flyCamera(loc.lat,loc.lon,overviewDistance(),1.8);
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
  if (state !== 'journey' || cameraMoving || !camera || !pointerDown || Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>6) return;
  let closest = -1, distance = 15;
  markerData.forEach((item,index) => {
    const world = item.mesh.getWorldPosition(worldPoint);
    if (surfaceNormal.copy(world).normalize().dot(cameraDirection.copy(camera.position).sub(world).normalize()) < .02) return;
    const p = world.project(camera);
    const delta = Math.hypot((p.x+1)*innerWidth/2-event.clientX,(1-p.y)*innerHeight/2-event.clientY);
    if (delta < distance) {closest=index;distance=delta;}
  });
  if (closest >= 0) flyToAndShow(closest);
});
window.addEventListener('resize', () => {
  layoutDirty=true;
  if (!camera) {showFallbackLabels();return;}
  if (state === 'memory') {
    gsap.killTweensOf(framing);
    framing.x = mobile() ? 0 : .22; framing.y = mobile() ? .29 : 0;
    const loc = locations[currentIndex];
    if (!cameraMoving) flyCamera(loc.lat,loc.lon,memoryDistance(),0);
  } else if (state === 'journey' && !cameraMoving) camera.position.normalize().multiplyScalar(overviewDistance());
});
reducedMotion.addEventListener('change', () => {
  if (controls) controls.autoRotate=state==='journey'&&!reducedMotion.matches;
  journeyMotion.spin=0;
  if(reducedMotion.matches && globeFlight) globeFlight.progress(1);
});
$('three-canvas').addEventListener('pointercancel',()=>{pointerDown=null;dragging=false;idleSince=performance.now()+900;});
$('three-canvas').addEventListener('keydown',event=>{
  if(state!=='journey'||cameraMoving||!camera||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();
  const spherical=new THREE.Spherical().setFromVector3(camera.position);
  spherical.theta += event.key==='ArrowLeft'?.13:event.key==='ArrowRight'?-.13:0;
  spherical.phi=clamp(spherical.phi+(event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0),.1,Math.PI-.1);
  camera.position.setFromSpherical(spherical); controls.update(); idleSince=performance.now()+1800;
});
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

