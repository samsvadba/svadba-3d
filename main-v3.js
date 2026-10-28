import { weddingMonogram, names } from './brand-v3.js';
import { gsap } from 'gsap';
import config from './config-v3.js';
import countries from './countries-v3.json';
import './style-v3.css';
import { createWedding } from './wedding-v3.js';
import { createOrigins } from './origins-v3.js';
import { bindGlobeInput } from './globe-input-v3.js';
import { createGallery } from './gallery-v3.js';
import { createDestinationBuffer, createDestinationParticles, createDestinationWatchdog, destinationVideoUrl } from './destination-media-v3.js';
import { createTVVideoDiagnostics } from './tv-video-diagnostics-v3.js';

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
const lineartIntro = document.documentElement.dataset.intro === 'lineart';
const particleIntroEnabled = document.documentElement.dataset.intro === 'particles';
let particleIntro, particleIntroFactory, particleTheme;
let weddingParticles, weddingParticlesFactory, weddingTargetSampler, weddingTargetAbort;
let weddingTargetRevision=0, weddingTargetRefreshTimer, weddingParticleCount=22000;
let introLineartPromise, introLineartStarted = false, introLineartPaths = [];
const screens = ['intro-overlay', 'journey-scene', 'transition-screen', 'wedding-scene'];
let weddingChapter;
let galleryChapter;
let originMarkers;
let state = 'loading', revision = 0, activeSectionTimeline, currentIndex = -1;
let destinationReady=false, lastDestinationIndex=-1;
let entranceActive=false, autoStoryPending=false;
let storyCycleEnd=-1;
let storyActive=false, storyIndex=0, storyStarted=false, storyTimer, queuedDestination=null;
let globeInitPromise, THREE, scene, camera, renderer, controls, globeGroup;
let cameraMoving = false, hoveredIndex = -1;
const globeSurface = $('globe-surface');
const visited = new Set(), markerData = [];
const framing = { x: 0, y: 0 };
const connector = $('memory-connector');
const view = { width: 0, height: 0 };
const journeyMotion = { focus: 0, spin: 0 };
const entranceSweep = Math.PI * 1.65;
let globeFlight, lastFrame = 0, idleSince = 0, dragging = false, layoutDirty = true;
let globeMesh, globeMaterial, overviewMaterial, overviewGeometry, wireMaterial, detailPromise, detailReady = 0;
const detailLayers = [];
const countryByCity=Object.fromEntries(locations.map(loc=>[loc.key,loc.countryCode]));
const layout = { minY:100, maxY:500, margin:20, modal:null };
let worldPoint, projectedPoint, surfaceNormal, cameraDirection, centerPoint;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const smoothstep = (a,b,n) => {const t=clamp((n-a)/(b-a),0,1);return t*t*(3-2*t);};
const fullscreenVideo = { active:false, closing:false, timeline:null, externalHold:false, resumeStory:false };
const videoScene=$('destination-video-scene'), destinationVideo=$('destination-video');
const tvVideoMode=new URLSearchParams(location.search).get('tv-video')==='1';
let tvVideoVariant=1, diagnosticPlayTimer, diagnosticAutoWaiting=false;
const destinationBuffer=createDestinationBuffer(locations,{enabled:!tvVideoMode&&!navigator.connection?.saveData&&!/^(slow-)?2g$/.test(navigator.connection?.effectiveType||'')});
const destinationParticles=createDestinationParticles($('destination-video-particles'),{reducedMotion,getColor:()=>getParticleTheme().ink.getStyle(),getBackground:()=>getParticleTheme().paper.getStyle()});
let destinationSourceFallback=false;
let destinationPlaybackPending=null;
let destinationPlaybackFailed=false;
const destinationWatchdog=createDestinationWatchdog(destinationVideo,{
  onTimeout:status=>{failFullscreenVideo('videoTimeout');tvDiagnostics.timeout(status);},
  onProgress:status=>{if(status.advanced>=.15)destinationParticles.reveal(destinationVideo);},
});
const tvDiagnostics=createTVVideoDiagnostics({
  enabled:tvVideoMode,scene:videoScene,video:destinationVideo,
  onVariant:switchTVVideoVariant,onDirectPlay:playTVVideoDirectly,
  onBack:()=>{pauseStory();closeFullscreenVideo();},onSound:()=>toggleMusic(),
  readMusic:()=>({enabled:preferences.sound,paused:music.paused,time:music.currentTime,error:music.error?.code}),
  readWatchdog:()=>destinationWatchdog.snapshot(),
});
const androidInstagram = /Android/i.test(navigator.userAgent);
let instagramCopy, instagramCopyHelp, instagramCopyField;
if(androidInstagram){
  instagramCopy=document.createElement('button');instagramCopy.id='destination-instagram-copy';instagramCopy.type='button';instagramCopy.hidden=true;
  instagramCopyHelp=document.createElement('p');instagramCopyHelp.id='destination-instagram-copy-help';instagramCopyHelp.hidden=true;instagramCopyHelp.setAttribute('role','status');
  instagramCopyField=document.createElement('input');instagramCopyField.id='destination-instagram-url';instagramCopyField.readOnly=true;instagramCopyField.hidden=true;
  $('destination-video-highlight').after(instagramCopy,instagramCopyHelp,instagramCopyField);
  instagramCopy.addEventListener('click',copyInstagramHighlight);
}

function refreshInstagramCopy(){
  if(!instagramCopy)return;
  instagramCopy.hidden=!locations[currentIndex]?.instagramHighlight;
  instagramCopy.textContent=t('instagramCopy');instagramCopy.title=t('instagramBrowserHint');
  instagramCopyField.setAttribute('aria-label',t('instagramCopy'));
  if(!instagramCopyHelp.hidden)instagramCopyHelp.textContent=t(instagramCopyHelp.dataset.key);
}

function holdInstagramDestination(){
  if(!fullscreenVideo.externalHold)fullscreenVideo.resumeStory=storyActive;
  fullscreenVideo.externalHold=true;
  destinationWatchdog.stop();clearTimeout(diagnosticPlayTimer);
  destinationVideo.autoplay=false;
  pauseStory();destinationVideo.pause();
  // Return/focus never reopens Instagram or resumes the story; playback is explicit.
  $('destination-video-retry').textContent=t('videoResume');
  $('destination-video-retry').hidden=false;
}

async function copyInstagramHighlight(event){
  event.stopPropagation();
  const url=locations[currentIndex]?.instagramHighlight;
  if(!url||!fullscreenVideo.active||fullscreenVideo.closing||instagramCopy.disabled)return;
  holdInstagramDestination();
  const request=revision;instagramCopy.disabled=true;
  const current=()=>request===revision&&fullscreenVideo.active&&!fullscreenVideo.closing;
  try{
    await navigator.clipboard.writeText(url);
    if(!current())return;
    instagramCopyField.hidden=true;instagramCopyField.value='';
    instagramCopyHelp.dataset.key='instagramCopied';
  }catch{
    if(!current())return;
    // Clipboard permission/API failure: expose the exact original address for manual copy.
    instagramCopyField.value=url;instagramCopyField.hidden=false;
    instagramCopyField.focus({preventScroll:true});instagramCopyField.select();
    instagramCopyHelp.dataset.key='instagramCopyManual';
  }finally{
    if(current()){
      instagramCopy.disabled=false;instagramCopyHelp.hidden=false;
      instagramCopyHelp.textContent=t(instagramCopyHelp.dataset.key);
    }
  }
}

function resetFullscreenVideo() {
  fullscreenVideo.timeline?.kill();
  destinationWatchdog.stop();tvDiagnostics.close();clearTimeout(diagnosticPlayTimer);
  destinationParticles.stop();
  videoScene.style.removeProperty('--destination-backdrop');
  gsap.killTweensOf(destinationVideo);
  destinationPlaybackPending=null;destinationVideo.autoplay=false;
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
  fullscreenVideo.externalHold=false;fullscreenVideo.resumeStory=false;
  if(instagramCopy){instagramCopy.hidden=true;instagramCopy.disabled=false;instagramCopyHelp.hidden=true;instagramCopyField.hidden=true;instagramCopyField.value='';}
  delete document.body.dataset.fullscreenVideo;
  $('utility-controls').inert=false;syncMusic();
}

function prepareFullscreenVideo(loc) {
  destinationWatchdog.stop();clearTimeout(diagnosticPlayTimer);
  diagnosticAutoWaiting=tvVideoMode&&tvVideoVariant!==3;
  // A single small still fills wide screens; never decode a second video.
  videoScene.style.removeProperty('--destination-backdrop');
  if(window.matchMedia('(min-width: 900px) and (min-aspect-ratio: 4/3)').matches){
    const source=new URL(loc.fullscreenVideo);
    if(source.hostname==='res.cloudinary.com'&&source.pathname.includes('/video/upload/')){
      const asset=source.pathname.split('/').pop();
      const backdrop=source.origin+source.pathname.split('/video/upload/')[0]+'/video/upload/so_0,w_960,q_auto,f_jpg/'+asset;
      videoScene.style.setProperty('--destination-backdrop', 'url("'+backdrop+'")');
    }
  }
  destinationPlaybackPending=null;destinationPlaybackFailed=false;
  destinationVideo.muted=true;destinationVideo.defaultMuted=true;destinationVideo.volume=0;destinationVideo.playsInline=true;
  destinationVideo.autoplay=false;destinationVideo.preload='auto';
  destinationSourceFallback=false;
  destinationVideo.src=tvVideoMode?(tvVideoVariant===1?destinationVideoUrl(loc.fullscreenVideo):loc.fullscreenVideo):destinationBuffer.sourceFor(loc);destinationVideo.load();
  $('destination-video-title').textContent=cityName(loc);
  $('destination-video-country').textContent=countryText(loc);
  const highlight=$('destination-video-highlight');
  highlight.hidden=!loc.instagramHighlight;
  $('destination-video-highlight-text').textContent=t('moreFromTrip');
  if(loc.instagramHighlight)highlight.href=loc.instagramHighlight;
  else highlight.removeAttribute('href');
  refreshInstagramCopy();
  $('destination-video-status').textContent='';
  $('destination-video-retry').textContent=t('play');
  $('destination-video-retry').hidden=true;
  $('destination-video-return').hidden=true;
  // Safari must see a visible muted video; the full-screen particle canvas
  // covers its first frame instead of hiding the media element with opacity:0.
  gsap.set(destinationVideo,{opacity:1,scale:reducedMotion.matches?1:1.035});
}

function playFullscreenVideo(manual=false) {
  if(!fullscreenVideo.active||fullscreenVideo.closing||fullscreenVideo.externalHold||document.hidden||destinationPlaybackPending)return;
  if(destinationPlaybackFailed||(tvVideoMode&&tvVideoVariant===3&&!manual))return;
  if(diagnosticAutoWaiting&&!manual)return;
  const request=revision, source=destinationVideo.getAttribute('src'), attempt={};
  destinationPlaybackPending=attempt;
  destinationVideo.muted=true;
  if(!destinationWatchdog.snapshot().active)destinationWatchdog.start();
  tvDiagnostics.attempt();
  let playing;
  try{playing=destinationVideo.play();}catch(error){playing=Promise.reject(error);}
  Promise.resolve(playing).then(()=>{
    if(destinationPlaybackPending===attempt)tvDiagnostics.playResult();
  }).catch(error=>{
    if(destinationPlaybackPending!==attempt||request!==revision||source!==destinationVideo.getAttribute('src')||!fullscreenVideo.active||fullscreenVideo.closing||fullscreenVideo.externalHold)return;
    tvDiagnostics.playResult(error);
    // Loading/cancelling a source is not a request for another user gesture.
    if(error.name==='AbortError')return;
    // Some Safari versions reject a prefetched blob despite accepting the same
    // silent HTTPS film. Retry the original delivery once, never another player.
    if(fallbackDestinationSource())return;
    failFullscreenVideo(error.name==='NotAllowedError'?'videoTap':'videoError');
  }).finally(()=>{if(destinationPlaybackPending===attempt)destinationPlaybackPending=null;});
}

function fallbackDestinationSource() {
  if(tvVideoMode)return false; // Never silently change a controlled TV trial.
  if(!destinationVideo.getAttribute('src')?.startsWith('blob:')||destinationSourceFallback)return false;
  destinationSourceFallback=true;destinationPlaybackPending=null;
  destinationVideo.src=destinationVideoUrl(locations[currentIndex].fullscreenVideo);destinationVideo.load();
  if(fullscreenVideo.active)playFullscreenVideo();
  return true;
}

function failFullscreenVideo(message) {
  if(!fullscreenVideo.active||fullscreenVideo.closing||fullscreenVideo.externalHold)return;
  destinationWatchdog.stop();destinationParticles.stop();clearTimeout(diagnosticPlayTimer);
  destinationPlaybackPending=null;destinationPlaybackFailed=true;destinationVideo.autoplay=false;destinationVideo.pause();
  $('destination-video-status').textContent=t(message);
  $('destination-video-retry').textContent=t('play');$('destination-video-retry').hidden=tvVideoMode;
  $('destination-video-return').hidden=tvVideoMode;
  if(tvVideoMode)tvDiagnostics.focusRetry();else $('destination-video-retry').focus({preventScroll:true});
}

function scheduleTVAutomaticPlayback() {
  diagnosticAutoWaiting=true;clearTimeout(diagnosticPlayTimer);
  // Same delay in A and B: the variant switch must not silently grant autoplay
  // permission. C alone calls play() synchronously inside its actual click.
  diagnosticPlayTimer=setTimeout(()=>{
    diagnosticAutoWaiting=false;
    if(!fullscreenVideo.active||fullscreenVideo.closing||fullscreenVideo.externalHold||destinationPlaybackFailed)return;
    destinationVideo.autoplay=true;playFullscreenVideo();
  },6000);
}

function switchTVVideoVariant(variant) {
  if(!tvVideoMode||!fullscreenVideo.active||fullscreenVideo.closing||!locations[currentIndex]?.fullscreenVideo)return;
  destinationVideo.autoplay=false;destinationVideo.pause();
  tvVideoVariant=variant;tvDiagnostics.variant(variant);
  prepareFullscreenVideo(locations[currentIndex]);destinationParticles.start();
  destinationWatchdog.start();
  tvDiagnostics.open(locations[currentIndex],destinationVideo.getAttribute('src'));
  scheduleTVAutomaticPlayback();
}

function playTVVideoDirectly() {
  if(!tvVideoMode||tvVideoVariant===1||!fullscreenVideo.active||fullscreenVideo.closing)return;
  tvVideoVariant=3;tvDiagnostics.variant(3);destinationVideo.autoplay=false;
  diagnosticAutoWaiting=false;
  destinationWatchdog.stop();clearTimeout(diagnosticPlayTimer);destinationPlaybackPending=null;destinationPlaybackFailed=false;
  destinationVideo.pause();
  $('destination-video-retry').hidden=true;$('destination-video-return').hidden=true;$('destination-video-status').textContent='';
  if(destinationVideo.error)destinationVideo.load();
  playFullscreenVideo(true); // Real button click -> play(), no await/animation.
}

destinationVideo.addEventListener('canplay',()=>{
  if(destinationVideo.paused&&!destinationVideo.ended&&$('destination-video-retry').hidden)playFullscreenVideo();
});

function openFullscreenVideo() {
  fullscreenVideo.active=true;
  destinationParticles.start();
  if(tvVideoMode&&tvVideoVariant===3)destinationParticles.stop(); // Await the explicit button without an endless cloud.
  syncMusic();$('utility-controls').inert=true;
  document.body.dataset.fullscreenVideo='true';
  videoScene.inert=false;videoScene.setAttribute('aria-hidden','false');
  $('app').inert=true;$('persistent-header').inert=true;$('bottom-nav').inert=true;
  // Make the media visible before requesting playback. The particles provide
  // the reveal; an invisible fading parent can block Safari autoplay.
  gsap.set(videoScene,{autoAlpha:1});
  if(tvVideoMode&&tvVideoVariant!==3)destinationWatchdog.start();
  tvDiagnostics.open(locations[currentIndex],destinationVideo.getAttribute('src'));
  destinationVideo.autoplay=!tvVideoMode;
  $('destination-video-close').focus({preventScroll:true});
  if(tvVideoMode&&tvVideoVariant!==3)scheduleTVAutomaticPlayback();
  else playFullscreenVideo();
}

function closeFullscreenVideo(afterOverview=null) {
  if(typeof afterOverview!=='function')afterOverview=null;
  if(!fullscreenVideo.active||fullscreenVideo.closing)return;
  fullscreenVideo.closing=true;destinationReady=false;updateDestinationNavigation();
  destinationWatchdog.stop();tvDiagnostics.close();clearTimeout(diagnosticPlayTimer);
  destinationVideo.autoplay=false;
  fullscreenVideo.timeline?.kill();
  destinationVideo.pause();
  fullscreenVideo.timeline=gsap.to(videoScene,{autoAlpha:0,duration:duration(.6),ease:'power2.inOut',onComplete:()=>{
    resetFullscreenVideo();closeModal(afterOverview);
  }});
}
destinationVideo.addEventListener('playing',()=>{
  if(!fullscreenVideo.active||fullscreenVideo.closing||fullscreenVideo.externalHold||destinationPlaybackFailed){destinationVideo.pause();return;}
  $('destination-video-status').textContent='';$('destination-video-retry').hidden=true;
  $('destination-video-return').hidden=true;
  if(!destinationWatchdog.snapshot().active)destinationWatchdog.start();
  musicVideoRecoveryUntil=performance.now()+2000;musicVideoRecoveryUsed=false;
  syncMusic();
  gsap.to(destinationVideo,{opacity:1,scale:1,duration:duration(1.1),ease:'power2.out'});
});
destinationVideo.addEventListener('error',()=>{
  if(!destinationVideo.hasAttribute('src'))return;
  if(fallbackDestinationSource())return;
  failFullscreenVideo('videoError');
});
$('destination-video-close').onclick=()=>{pauseStory();closeFullscreenVideo();};
$('destination-video-return').onclick=()=>{pauseStory();closeFullscreenVideo();};
// Native external navigation only: never reopen Instagram on focus/visibility/pageshow.
$('destination-video-highlight').addEventListener('click',event=>{
  if(!fullscreenVideo.active||fullscreenVideo.closing||!locations[currentIndex]?.instagramHighlight){event.preventDefault();return;}
  event.stopPropagation();
  holdInstagramDestination();
});
destinationVideo.addEventListener('ended',()=>{
  if(fullscreenVideo.externalHold)return;
  destinationWatchdog.stop();
  if(tvVideoMode)return; // Keep the result readable for a TV photograph; NEXT still works.
  storyActive?nextMemory():closeFullscreenVideo();
});
$('destination-video-retry').onclick=()=>{
  if(!fullscreenVideo.active||fullscreenVideo.closing)return;
  if(fullscreenVideo.externalHold){
    fullscreenVideo.externalHold=false;fullscreenVideo.resumeStory=false;
    if(destinationVideo.ended)destinationVideo.currentTime=0;
    if(destinationVideo.error)destinationVideo.load();
    $('destination-video-retry').textContent=t('play');$('destination-video-retry').hidden=true;
    destinationPlaybackPending=null;destinationPlaybackFailed=false;
    playFullscreenVideo(true);
  }else{
    destinationPlaybackPending=null;destinationPlaybackFailed=false;
    $('destination-video-retry').hidden=true;$('destination-video-return').hidden=true;$('destination-video-status').textContent='';
    destinationVideo.load();playFullscreenVideo(true);
  }
};
videoScene.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const diagnosticButtons=tvVideoMode?[...videoScene.querySelectorAll('#tv-video-diagnostics button')]:[];
  const focusable=[...diagnosticButtons,$('destination-video-highlight'),instagramCopy,instagramCopyField,$('destination-video-next'),$('destination-video-close'),$('destination-video-retry'),$('destination-video-return')].filter(el=>el&&!el.hidden&&!el.disabled);
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});

function setState(next) {
  state = next;
  if(next==='wedding')destinationBuffer.clear();
  if(next==='intro'||next==='wedding'){pauseStory();}
  syncStoryUI();
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
  $('media-error').textContent = t('imageError');
  $('modal').inert = true;
  $('modal').setAttribute('aria-hidden', 'true');
  gsap.set($('modal'), { autoAlpha: 0 });
  connector.style.visibility = 'hidden';
}

function killActiveSectionTransition() {
  clearTimeout(weddingTargetRefreshTimer);
  weddingTargetRevision++;weddingTargetAbort?.abort();weddingTargetAbort=null;
  weddingParticles?.dispose();weddingParticles=null;
  particleIntro?.leave();
  appliedGlobeTheme.material = null;
  delete document.body.dataset.introPending;
  originMarkers?.reset();
  weddingChapter?.leave();
  clearTimeout(storyTimer);
  entranceActive=false;autoStoryPending=false;
  revision++;destinationReady=false;updateDestinationNavigation();
  activeSectionTimeline?.kill();
  activeSectionTimeline = null;
  gsap.killTweensOf($('modal'));
  gsap.killTweensOf([$ ('label-layer'), $('city-connectors'), $('journey-instruction')]);
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
  const progress = section === 'intro' ? 0 : section === 'wedding' ? 100 : 50 + Math.max(0,lastDestinationIndex+1) / locations.length * 45;
  $('nav-fill').style.width = `${progress}%`;
  $('journey-count').textContent = lastDestinationIndex>=0 ? `(${lastDestinationIndex+1}/${locations.length})` : '';
  $('destination-video-progress').textContent=currentIndex>=0?`${currentIndex+1} / ${locations.length}`:'';
}

function announce(text) { $('app-status').textContent = text; }

function loadIntroLineart() {
  // Keep the supplied artwork intact and out of the default video entry's download.
  return introLineartPromise ??= import('./intro-lineart-v3.svg?raw').then(({ default: svg }) => {
    const illustration = $('intro-lineart');
    illustration.innerHTML = svg;
    illustration.hidden = false;
    introLineartPaths = [...illustration.querySelectorAll('path')];
    return introLineartPaths;
  });
}

function playIntroTextAnimations() {
  if (particleIntroEnabled) playParticleIntro();
  else playLegacyIntro();
}

function finishStartupCloud() {
  window.dispatchEvent(new Event('intro-particles:first-frame'));
}

async function playParticleIntro() {
  const request = killActiveSectionTransition();
  hideAllScreensImmediate();
  currentIndex = -1;
  setState('intro'); setActiveNav('intro');
  document.body.dataset.introPending = 'true';
  showScreen('journey-scene', false); showScreen('intro-overlay');
  gsap.set([$ ('label-layer'), $('city-connectors'), $('journey-instruction')], {autoAlpha:0});
  announce(t('introStatus'));
  try {
    const modulePromise = particleIntroFactory ? null : import('./intro-particles-v3.js').then(module => { particleIntroFactory = module.createParticleIntro; });
    await Promise.all([ensureGlobeScene(), modulePromise]);
    if (request !== revision) return;
    if (!renderer || !camera) throw new Error('WebGL unavailable');
    await loadGeographicDetail();
    if (request !== revision) return;
    markerData.forEach(item => { if (item.mesh) item.mesh.visible = false; });
    if (!particleIntro) {
      particleIntro = particleIntroFactory({
        scene, camera, renderer, controls, globeGroup, globeMesh, globeMaterial,
        overviewMaterial, wireMaterial, detailLayers,
        formationPositions: overviewGeometry.attributes.position.array,
        radius: GLOBE_RADIUS, latLonToVec3, overviewDistance, origins: config.origins,
        root: $('intro-overlay'), getTheme: getParticleTheme,
        getLanguage: () => preferences.language, getText: t, reducedMotion,
        onFinish: enterJourneyFromIntro, onMode: syncStoryUI,
        onFirstFrame: () => { delete document.body.dataset.introPending; finishStartupCloud(); },
      });
    }
    applyGlobeTheme();
    particleIntro.start();
    if(galleryChapter?.isOpen())particleIntro.suspend('gallery');
    syncStoryUI();
    delete document.body.dataset.introPending;
  } catch (error) {
    if (request !== revision) return;
    console.warn('Particle intro unavailable:', error.message);
    finishStartupCloud();
    document.documentElement.dataset.intro = 'video';
    playLegacyIntro();
  }
}

function enterJourneyFromIntro() {
  // Keep the same renderer, globe and final camera pose; do not replay the
  // Journey entrance or replace the page after the heart dissolves.
  const offsetY = camera?.view?.enabled ? camera.view.offsetY / camera.view.height : 0;
  const request = killActiveSectionTransition();
  hideAllScreensImmediate(); showScreen('journey-scene');
  currentIndex = -1; storyIndex = 0; storyCycleEnd = -1; storyStarted = false;
  autoStoryPending = !reducedMotion.matches;
  journeyMotion.focus = 0; framing.x = 0; framing.y = offsetY;
  setState('journey'); setActiveNav('journey'); layoutDirty = true;
  gsap.to(framing, {y:.065, duration:duration(.7), ease:'sine.inOut'});
  gsap.set([$ ('label-layer'), $('city-connectors'), $('journey-instruction')], {autoAlpha:0});
  activeSectionTimeline = gsap.timeline()
    .to([$ ('label-layer'), $('city-connectors'), $('journey-instruction')], {autoAlpha:1, duration:duration(.7)})
    .to({}, {duration:2})
    .call(() => { if (request === revision && autoStoryPending) { autoStoryPending = false; startStory(); } });
  announce(t('storyHint'));
}

function playLegacyIntro() {
  const request=killActiveSectionTransition();
  hideAllScreensImmediate();
  setState('intro');setActiveNav('intro');showScreen('intro-overlay');currentIndex=-1;
  gsap.set('.title-layout',{autoAlpha:0});
  const tl=gsap.timeline({paused:true});activeSectionTimeline=tl;
  if(!reducedMotion.matches){
    document.querySelectorAll('.sub-line').forEach(line=>{
      tl.to(line,{opacity:1,duration:.6}).to(line,{opacity:0,duration:.5,delay:.55});
    });
  }
  tl.to('.title-layout',{autoAlpha:1,duration:duration(1.2)});
  let started=false;
  const startText=()=>{
    if(started||request!==revision||state!=='intro')return;
    started=true;tl.play();announce(t('introStatus'));
  };
  if(lineartIntro){
    loadIntroLineart().then(paths=>{
      if(request!==revision||state!=='intro')return;
      if(introLineartStarted||reducedMotion.matches){
        gsap.set(paths,{strokeDashoffset:0,fillOpacity:1,strokeOpacity:0});
      }else{
        paths.forEach(path=>{
          const length=path.getTotalLength();
          gsap.set(path,{fillOpacity:0,strokeOpacity:1,strokeDasharray:length,strokeDashoffset:length});
        });
        // Draw once as the existing title fades in, then restore the exact filled path.
        tl.call(()=>{introLineartStarted=true;},null,'-=.8')
          .to(paths,{strokeDashoffset:0,duration:3,ease:'power1.inOut'},'<')
          .to(paths,{fillOpacity:1,strokeOpacity:0,duration:.6},'-=.6');
      }
      startText();
    }).catch(startText);
  }else if(intro.video){
    const video=$('intro-video-bg');
    gsap.killTweensOf(video);gsap.set(video,{opacity:0});video.hidden=true;
    video.onplaying=()=>{
      if(request!==revision||state!=='intro')return;
      video.hidden=false;
      gsap.to(video,{opacity:1,duration:duration(.8),ease:'power2.out'});
      startText();
    };
    const fallback=()=>{
      if(request!==revision||state!=='intro')return;
      video.hidden=true;tl.progress(1);started=true;
    };
    video.onerror=fallback;
    video.src=/^https?:\/\//.test(intro.video)?intro.video:asset(intro.video);
    video.play().catch(fallback);
  }else startText();
}

// Keep the reference's line-by-line transition choreography.
function animateTransitionLines(tl, screen, hold = .8) {
  screen.querySelectorAll('.trans-line').forEach(line => {
    tl.to(line, { opacity: 1, duration: duration(.65), ease: 'power2.inOut' })
      .to(line, { opacity: 0, duration: duration(.55), delay: reducedMotion.matches ? .45 : hold, ease: 'power2.inOut' });
  });
}

async function playJourneyTransition() {
  finishStartupCloud();
  const request = killActiveSectionTransition();
  storyIndex=0;storyCycleEnd=-1;storyStarted=false;autoStoryPending=true;
  gsap.set([$ ('label-layer'), $('city-connectors')],{autoAlpha:0});
  hideAllScreensImmediate();
  setState('transition');
  setActiveNav('journey');
  showScreen('transition-screen', false);
  announce(t('prepare'));
  gsap.set([$ ('label-layer'),$('city-connectors'),$('journey-instruction')],{autoAlpha:0});
  await ensureGlobeScene();
  if (request !== revision) return;
  currentIndex = -1;
  framing.x = 0; framing.y = .065;
  journeyMotion.focus = 0; layoutDirty = true;
  showScreen('journey-scene', false);
  gsap.set([$ ('label-layer'), $('city-connectors'), $('journey-instruction')], { autoAlpha: 0 });
  if (camera) {
    const start = latLonToVec3(30, 15, overviewDistance());
    if (!reducedMotion.matches) {
      const orbit = new THREE.Spherical().setFromVector3(start);
      orbit.theta += entranceSweep; orbit.radius *= 1.3;
      start.setFromSpherical(orbit);
    }
    camera.position.copy(start);
    camera.lookAt(0,0,0);
    controls.autoRotate = false; controls.enabled = false; cameraMoving = true;
  }
  const tl = gsap.timeline();
  activeSectionTimeline = tl;
  $('transition-screen').querySelectorAll('.trans-line:first-child').forEach(line=>{
    tl.to(line,{opacity:1,duration:duration(.3)}).to(line,{opacity:0,duration:duration(.25),delay:.3});
  });
  tl.to($('transition-screen'), { autoAlpha: 0, duration: duration(.4) })
    .call(() => {
      $('transition-screen').setAttribute('aria-hidden', 'true');
      showScreen('journey-scene');
      setState('journey');entranceActive=true;
      flyCamera(30,15,overviewDistance(),3,()=>{
        entranceActive=false;
        if(request!==revision)return;
        activeSectionTimeline=gsap.timeline()
          .to([$ ('label-layer'),$('city-connectors'),$('journey-instruction')],{autoAlpha:1,duration:duration(.7)})
          .to({}, {duration:2})
          .call(()=>{if(request===revision&&autoStoryPending){autoStoryPending=false;startStory();}});
      },false,true);
      announce(t('storyHint'));toast('storyHint');
    })
    .to({}, {duration:duration(3)});
}

function finishWeddingEntry(request) {
  if(request!==revision||state!=='final-transition')return;
  clearTimeout(weddingTargetRefreshTimer);
  weddingTargetRevision++;weddingTargetAbort?.abort();weddingTargetAbort=null;
  weddingParticles?.dispose();weddingParticles=null;
  appliedGlobeTheme.material=null;
  hideAllScreensImmediate();
  currentIndex=-1;setState('wedding');showScreen('wedding-scene');
  $('wedding-scene').querySelector('.w-invitation-names')?.focus({preventScroll:true});
  announce(t('navWedding'));
}

async function refreshWeddingParticleTarget() {
  if(state!=='final-transition'||!weddingParticles?.active||!weddingTargetSampler)return;
  const effect=weddingParticles,request=revision,targetRequest=++weddingTargetRevision;
  weddingTargetAbort?.abort();
  const abort=weddingTargetAbort=new AbortController();
  // Hold the finite clock while remeasuring text after a rotation or SK/EN change.
  effect.suspend('target');
  try {
    const targets=await weddingTargetSampler($('wedding-scene').querySelector('.w-invitation-inner'),{
      width:innerWidth,height:innerHeight,count:weddingParticleCount,signal:abort.signal,
    });
    if(request!==revision||targetRequest!==weddingTargetRevision||effect!==weddingParticles)return;
    effect.setTargets(targets);
    effect.resume('target');
  } catch(error) {
    if(error.name!=='AbortError'&&request===revision&&targetRequest===weddingTargetRevision)finishWeddingEntry(request);
  }
}

async function playWeddingTransition() {
  if(state==='wedding'||state==='final-transition')return;
  const fromGlobe=!!renderer&&['journey','memory','transition'].includes(state)&&$('globe-fallback').hidden;
  finishStartupCloud();pauseStory();
  const request=killActiveSectionTransition();
  hideAllScreensImmediate();setState('final-transition');setActiveNav('wedding');
  if(!weddingChapter)weddingChapter=createWedding($('wedding-scene'),wedding,{t,gsap,reducedMotion});
  // Final layout exists for sampling, but remains hidden and noninteractive.
  weddingChapter.enter({immediate:true,focus:false});
  if(!fromGlobe||reducedMotion.matches||renderer.getContext().isContextLost()){
    finishWeddingEntry(request);return;
  }
  showScreen('journey-scene',false);
  gsap.set([$ ('label-layer'),$('city-connectors'),$('journey-instruction')],{autoAlpha:0});
  announce(t('navWedding'));
  try {
    if(!weddingParticlesFactory){
      const [effect,sampler]=await Promise.all([import('./wedding-particles-v3.js'),import('./wedding-particle-target-v3.js')]);
      weddingParticlesFactory=effect.createWeddingParticles;weddingTargetSampler=sampler.sampleWeddingInvitation;
    }
    if(request!==revision||state!=='final-transition')return;
    const abort=weddingTargetAbort=new AbortController();
    const count=weddingParticleCount=mobile()?22000:30000;
    let targets,targetVersion,targetWidth,targetHeight;
    do {
      targetVersion=weddingTargetRevision;targetWidth=innerWidth;targetHeight=innerHeight;
      targets=await weddingTargetSampler($('wedding-scene').querySelector('.w-invitation-inner'),{
        width:targetWidth,height:targetHeight,count,signal:abort.signal,
      });
      if(request!==revision||state!=='final-transition')return;
    } while(targetVersion!==weddingTargetRevision||targetWidth!==innerWidth||targetHeight!==innerHeight);
    if(reducedMotion.matches){finishWeddingEntry(request);return;}
    applyGlobeTheme();
    weddingParticles=weddingParticlesFactory({
      THREE,gsap,scene,camera,renderer,controls,globeGroup,globeMesh,overviewGeometry,framing,
      radius:GLOBE_RADIUS,overviewDistance,getTheme:getParticleTheme,count,
      onReveal:alpha=>{if(request===revision){$('wedding-scene').style.opacity=String(alpha);$('wedding-scene').style.visibility=alpha>0?'visible':'hidden';}},
      onFinish:()=>finishWeddingEntry(request),
    });
    weddingParticles.start(targets);
  } catch(error) {
    if(error.name!=='AbortError'){
      console.warn('Wedding particle transition unavailable:',error.message);
      finishWeddingEntry(request);
    }
  }
}

function latLonToVec3(lat, lon, radius) {
  const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

function overviewDistance() { return Math.max(60, 51 / (innerWidth / innerHeight)); }
function memoryDistance() { return mobile() ? 18 : 15.8; }

function updateManualRotateSpeed(dt) {
  const near=controls.minDistance, far=controls.maxDistance;
  const distance=camera.position.distanceTo(controls.target);
  const zoom=clamp((distance-near)/Math.max(.001,far-near),0,1);
  // At the facing surface, perspective displacement per orbit radian is
  // proportional to focalLength * R / (distance - R). Focal length and R
  // cancel relative to the far view, so compensate with surface clearance.
  const clearance=near-GLOBE_RADIUS+zoom*(far-near);
  const compensated=clamp(clearance/Math.max(.001,far-GLOBE_RADIUS),.025,1);
  // User tuning: 30% more responsive, with the original far-view ceiling.
  const target=Math.min(1,compensated*1.3);
  controls.rotateSpeed+=(target-controls.rotateSpeed)*(1-Math.exp(-dt/.08));
}

function flyCamera(lat, lon, distance, seconds, onComplete, travel=false, entrance=false) {
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
  const overviewAtStart=overviewDistance(), overviewFlight=distance===overviewAtStart;
  // A broad entrance orbit accelerates then settles; geography stays fixed.
  const entry = entrance ? new THREE.Spherical().setFromVector3(end) : null;
  if (entry && !reducedMotion.matches) flight.radius = distance * 1.3;
  const update = () => {
    if (entry) direction.setFromSphericalCoords(1, entry.phi, entry.theta + entranceSweep * (1-flight.turn));
    else {
      step.copy(identity).slerp(rotation,flight.turn);
      direction.copy(start).applyQuaternion(step);
    }
    const radius=flight.radius*(overviewFlight?overviewDistance()/overviewAtStart:1);
    camera.position.copy(direction).multiplyScalar(Math.max(GLOBE_RADIUS+2.5,radius));
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
  if (entry) update();
  globeFlight=gsap.timeline({onUpdate:update,onComplete:complete});
  if(travel){
    const startRadius=flight.radius, peak=Math.max(overviewDistance()*.78,startRadius,distance);
    const path={t:0};
    globeFlight.to(path,{t:1,duration:3.2,ease:'sine.inOut',onUpdate:()=>{
      flight.turn=path.t;
      flight.radius=THREE.MathUtils.lerp(startRadius,distance,path.t)+(peak-Math.max(startRadius,distance))*Math.sin(Math.PI*path.t);
      journeyMotion.focus=Math.pow(Math.abs(2*path.t-1),2);
    }});
  }else if(state==='memory') {
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
    label.setAttribute('aria-label',cityName(loc)+' — '+loc.subname);
    const name = document.createElement('span'); name.className = 'city-name'; name.textContent = cityName(loc);
    const sub = document.createElement('span'); sub.className = 'city-subname'; sub.textContent = loc.subname;
    label.append(name, sub);
    label.onclick = () => flyToAndShow(index);
    label.onpointerenter = label.onfocus = () => { hoveredIndex = index; };
    label.onpointerleave = label.onblur = () => { hoveredIndex = -1; };
    $('label-layer').append(label);
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.classList.add('city-connector'); line.dataset.city=loc.key;
    $('city-connectors').append(line);
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
      controls = new orbit.OrbitControls(camera, globeSurface);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enableZoom = true;
      controls.zoomSpeed = 1;
      controls.minDistance = GLOBE_RADIUS * 1.25;
      controls.maxDistance = overviewDistance() * 1.3;
      controls.touches.ONE = THREE.TOUCH.ROTATE;
      controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      controls.autoRotateSpeed = 0;
      controls.dampingFactor = .05;
      controls.rotateSpeed = 1;
      controls.addEventListener('start',()=>{dragging=true;journeyMotion.spin=0;controls.autoRotate=false;});
      controls.addEventListener('end',()=>{dragging=false;idleSince=performance.now()+900;});
      worldPoint=new THREE.Vector3(); projectedPoint=new THREE.Vector3();
      surfaceNormal=new THREE.Vector3(); cameraDirection=new THREE.Vector3(); centerPoint=new THREE.Vector3();
      $('three-canvas').tabIndex=0;
      globeGroup = new THREE.Group();
      scene.add(globeGroup);
      originMarkers=createOrigins(globeSurface,config.origins,{THREE,gsap,reducedMotion,radius:GLOBE_RADIUS+.17});
      originMarkers.refreshLanguage(t('originLabel'));
      globeMesh = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 128, 96), (globeMaterial=new THREE.MeshBasicMaterial({color: 0xf5f4f0})));
      globeGroup.add(globeMesh);
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
      overviewGeometry = boundaryGeometry(countries);
      globeGroup.add(new THREE.LineSegments(overviewGeometry,overviewMaterial));
      loadGeographicDetail();
      const measureObserver=new ResizeObserver(()=>{layoutDirty=true;});
      markerData.forEach(item=>measureObserver.observe(item.element));
      measureObserver.observe($('modal')); measureObserver.observe($('persistent-header'));
      document.fonts?.ready.then(()=>{layoutDirty=true;});
      $('three-canvas').addEventListener('webglcontextlost', event => {
        event.preventDefault();
        if(state==='final-transition'){finishWeddingEntry(revision);return;}
        if (particleIntro?.active) { particleIntro.suspend('context'); return; }
        $('globe-fallback').hidden = false;
        connector.style.visibility = 'hidden';
        showFallbackLabels();
      });
      $('three-canvas').addEventListener('webglcontextrestored', () => { $('globe-fallback').hidden = true; globeSurface.style.touchAction='none'; controls.enabled=state==='journey'&&!cameraMoving; $('label-layer').classList.remove('fallback-list'); particleIntro?.resume('context'); layoutDirty=true; });
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
      detailLayers.push({iso:feature.iso,line,material,emphasis:0});
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
  globeSurface.style.touchAction='pan-y';
  if(controls)controls.enabled=false;
  $('label-layer').classList.add('fallback-list');
  markerData.forEach(item=>{
    item.element.style.transform='none';item.element.style.opacity='1';item.element.style.visibility='visible';
    item.element.style.pointerEvents=state==='journey'?'auto':'none';item.element.tabIndex=0;item.element.removeAttribute('aria-hidden');item.line.style.visibility='hidden';
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
  if(document.hidden||!(['transition','journey','memory'].includes(state)||(state==='intro'&&particleIntro?.active)||(state==='final-transition'&&weddingParticles?.active)))return;
  if(renderer.getContext().isContextLost())return;
  if(!$('globe-fallback').hidden){showFallbackLabels();return;}
  if(view.width!==innerWidth||view.height!==innerHeight){
    view.width=innerWidth;view.height=innerHeight;
    renderer.setSize(view.width,view.height);
    camera.aspect=view.width/view.height;camera.updateProjectionMatrix();layoutDirty=true;
  }
  if (state === 'intro' && particleIntro?.active) {
    applyGlobeTheme(); particleIntro.render(view.width, view.height); return;
  }
  if(state==='final-transition'&&weddingParticles?.active){weddingParticles.render(view.width,view.height);return;}
  if(layoutDirty)measureJourneyLayout();
  applyFraming();
  if(!cameraMoving){
    if(state==='journey')updateManualRotateSpeed(dt);
    // Touch focus survives closing a memory on Safari; it must not freeze idle rotation.
    const canSpin=state==='journey'&&!dragging&&!reducedMotion.matches&&performance.now()>idleSince;
    journeyMotion.spin+=( (canSpin?.78:0)-journeyMotion.spin)*(1-Math.exp(-dt*2.2));
    controls.autoRotate=canSpin || journeyMotion.spin>.001;
    controls.autoRotateSpeed=journeyMotion.spin;
    controls.update(dt);
  }
  camera.updateMatrixWorld();globeGroup.updateMatrixWorld(true);
  const detail=smoothstep(0,1,(36-camera.position.length())/18);
  if(detail>0&&!detailPromise)loadGeographicDetail();
  if(detailLayers.length)detailReady+=(1-detailReady)*(1-Math.exp(-dt*3));
  const mix=detail*detailReady;
  applyGlobeTheme();
  overviewMaterial.opacity=.26*(1-mix*.86);
  wireMaterial.opacity=.08*(1-detail*.94);
  const selectedCountry=currentIndex>=0?countryByCity[locations[currentIndex].key]:null;
  for(const layer of detailLayers){
    const target=layer.iso===selectedCountry?journeyMotion.focus:0;
    layer.emphasis+=(target-layer.emphasis)*(1-Math.exp(-dt*5));
    // The existing vector contour becomes dark; neighbors remain light, without fills.
    const night=mood.value,e=layer.emphasis;
    layer.material.color.setRGB((.392-.27*e)*(1-night)+(.69+.23*e)*night,(.408-.28*e)*(1-night)+(.70+.20*e)*night,(.373-.26*e)*(1-night)+(.65+.22*e)*night);
    // Emphasis uses opacity; all Olive boundaries share the exact foreground colour.
    layer.material.color.lerp(oliveGlobeColors.ink,mood.palette);
    layer.material.opacity=detailReady*(detail*.19+layer.emphasis*.76);
    layer.line.visible=layer.material.opacity>.002;
  }
  updateGeographicLabels(dt);
  originMarkers?.update(camera,globeGroup,view.width,view.height,state==='journey'&&!cameraMoving&&!entranceActive?Number(gsap.getProperty($('label-layer'),'opacity')):0,state==='journey'&&!cameraMoving);
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
    item.crowdAllowed=true;
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
    const markerReveal=Number(gsap.getProperty($('label-layer'),'opacity'));
    const homePulse=selected&&locations[item.index].key==='trnava'?(originMarkers?.highlight||0):0;
    const markerAlpha=Math.max(markerReveal,homePulse)*(item.visible?smoothstep(.012,.13,item.facing)*(selected?1:1-journeyMotion.focus*.92):0);
    item.mesh.material.opacity=markerAlpha;item.mesh.visible=markerAlpha>.005;
    // Keep dark points small in screen space during the strong camera zoom.
    const markerDistance=worldPoint.distanceTo(camera.position);
    const pixelSize=selected?3+homePulse*.5:2;
    item.mesh.scale.setScalar(clamp(pixelSize*markerDistance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/(view.height*.5*.13),.08,1.5));
    item.targetY=clamp(item.py-item.height/2,layout.minY,layout.maxY-item.height);
    const edge=item.side==='left'?cx-radius-18-item.width+dx*.12:cx+radius+18+dx*.12;
    const leftMax=Math.max(layout.margin,cx-item.width-22);
    const rightMin=Math.min(view.width-layout.margin-item.width,cx+22);
    item.targetX=item.side==='left'?clamp(edge,layout.margin,leftMax):clamp(edge,rightMin,view.width-layout.margin-item.width);
    if(item.visible&&(item.index===currentIndex||journeyMotion.focus<.99))sides[item.side].push(item);
    item.element.dataset.side=item.side;
  }
  // Dense European clusters may exceed one edge's height on landscape phones.
  // Move the innermost projected points to the other edge, deterministically.
  for(const side of ['left','right']){
    const other=side==='left'?'right':'left';
    const capacity=Math.max(1,Math.floor((layout.maxY-layout.minY)/(Math.max(24,...sides[side].map(item=>item.height))+9)));
    while(sides[side].length>capacity&&sides[other].length<capacity){
      let candidate=sides[side].reduce((a,b)=>Math.abs(a.px-cx)<Math.abs(b.px-cx)?a:b);
      sides[side].splice(sides[side].indexOf(candidate),1);sides[other].push(candidate);
      candidate.side=other;candidate.element.dataset.side=other;
      candidate.targetX=other==='left'?layout.margin:view.width-layout.margin-candidate.width;
    }
  }
  for(const items of Object.values(sides)){
    const capacity=Math.max(1,Math.floor((layout.maxY-layout.minY)/(Math.max(24,...items.map(item=>item.height))+9)));
    if(items.length>capacity){
      items.sort((a,b)=>(b.index===currentIndex?3:b.index===hoveredIndex?2:0)-(a.index===currentIndex?3:a.index===hoveredIndex?2:0)||b.facing-a.facing||a.index-b.index);
      for(const item of items.splice(capacity))item.crowdAllowed=false;
    }
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
    item.crowdAlpha=(item.crowdAlpha??1)+((item.crowdAllowed?1:0)-(item.crowdAlpha??1))*fade;
    const renderedAlpha=item.alpha*item.crowdAlpha;
    const shown=renderedAlpha>.015 && item.visible;
    item.element.style.transform=`translate3d(${item.x.toFixed(2)}px,${item.y.toFixed(2)}px,0)`;
    item.element.style.opacity=renderedAlpha.toFixed(3);
    item.element.style.visibility=shown?'visible':'hidden';
    item.element.style.pointerEvents=shown&&state==='journey'&&!cameraMoving?'auto':'none';
    item.element.tabIndex=shown?0:-1;
    item.element.setAttribute('aria-hidden',shown?'false':'true');
    item.line.style.visibility=shown?'visible':'hidden';
    item.line.style.opacity=(renderedAlpha*.38).toFixed(3);
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


function flyToAndShow(index, travel=false) {
  if (state!=='journey'||cameraMoving||!locations[index])return;
  const request = killActiveSectionTransition();
  currentIndex = index;lastDestinationIndex=index;
  if(storyActive)storyIndex=index;
  else{storyCycleEnd=index;storyIndex=(index+1)%locations.length;storyStarted=true;}
  setState('memory');
  if(!travel)gsap.to(journeyMotion,{focus:1,duration:duration(1.7),ease:'power2.inOut'});
  if(travel)gsap.set([$ ('label-layer'),$('city-connectors')],{autoAlpha:0});
  loadGeographicDetail();
  setActiveNav('journey');
  const loc = locations[index];
  if(loc.fullscreenVideo)prepareFullscreenVideo(loc);
  destinationBuffer.plan(index+1,loc);
  if(storyActive&&loc.key==='trnava')originMarkers?.pulse(travel?2.05:1.5);
  updateDestinationNavigation();
  gsap.set($('journey-instruction'), { autoAlpha: 0 });
  markerData.forEach((item, i) => item.element.classList.toggle('selected', i === index));
  $('modal-city').textContent = cityName(loc);
  $('modal-location').textContent = memoryLocation(loc);
  $('memory-number').textContent = `${String(index + 1).padStart(2,'0')} / ${String(locations.length).padStart(2,'0')}`;
  const targetFraming = mobile() ? {x:0, y:.29} : {x:.22, y:0};
  gsap.to(framing, {...targetFraming, duration:duration(2.6), ease:'power2.inOut'});
  flyCamera(loc.lat, loc.lon, memoryDistance(), 1.3, () => {
    if (revision !== request) return;
    journeyMotion.focus=1;
    if(loc.fullscreenVideo){
      visited.add(index);markerData[index].element.classList.add('visited');setActiveNav('journey');
      destinationReady=true;updateDestinationNavigation();
      openFullscreenVideo();announce(`${cityName(loc)}, ${countryText(loc)}. ${t('videoMemory')}`);return;
    }
    if (loc.type === 'instagram') {
      $('modal-instagram').src = loc.media;
      $('modal-instagram').hidden = false;
      $('instagram-link').href = loc.external;
      $('instagram-link').hidden = false;
    } else if (loc.type === 'text') {
      $('media-error').textContent = t('comingSoon');
      $('media-error').classList.add('empty-memory');
      $('media-error').hidden = false;
    } else {
      const img = $('modal-image');
      img.alt = `Simona a Martin — ${cityName(loc)}`;
      img.onerror = () => { img.hidden = true; $('media-error').hidden = false; };
      img.src = asset(loc.media);
      img.hidden = false;
    }
    visited.add(index);
    markerData[index].element.classList.add('visited');
    setActiveNav('journey');
    updateDestinationNavigation();
    destinationReady=true;updateDestinationNavigation();
    $('modal').setAttribute('aria-hidden','false');
    $('modal').inert = false;
    layoutDirty=true;
    gsap.to($('modal'), {autoAlpha:1,duration:duration(.6)});
    $('modal-city').focus({preventScroll:true});
    announce(`${cityName(loc)}, ${countryText(loc)}. ${t('memory')} ${index + 1} ${t('of')} ${locations.length}.`);
    if(storyActive)storyTimer=setTimeout(()=>{if(storyActive&&revision===request)nextMemory();},6000);
  },travel);
}

function closeModal(afterOverview=null) {
  if(typeof afterOverview!=='function')afterOverview=null;
  if(state!=='memory')return;
  if(fullscreenVideo.active){closeFullscreenVideo(afterOverview);return;}
  destinationReady=false;updateDestinationNavigation();
  if(afterOverview&&!$('modal').inert){
    $('modal').inert=true;
    gsap.to($('modal'),{autoAlpha:0,duration:duration(.45),onComplete:()=>returnToOverview(afterOverview)});
  }else returnToOverview(afterOverview);
}

function returnToOverview(afterOverview) {
  if(queuedDestination!==null){
    const target=queuedDestination;queuedDestination=null;
    killActiveSectionTransition();setState('journey');
    if(target===locations.length){storyActive=false;storyStarted=false;playWeddingTransition();}
    else flyToAndShow(target,true);
    return;
  }
  const previous=currentIndex;
  if(previous<0)return;
  const request=killActiveSectionTransition();
  setState(afterOverview?'transition':'journey');currentIndex=-1;
  gsap.to(framing,{x:0,y:.065,duration:duration(.8)});
  gsap.to(journeyMotion,{focus:0,duration:duration(1.8),ease:'power2.inOut'});
  const overviewUI=[$('label-layer'),$('city-connectors'),$('journey-instruction')];
  gsap.set(overviewUI,{autoAlpha:0});
  const loc=locations[previous];
  flyCamera(loc.lat,loc.lon,overviewDistance(),1.8,()=>{
    if(request!==revision)return;
    activeSectionTimeline=gsap.timeline();
    activeSectionTimeline.to(overviewUI,{autoAlpha:1,duration:duration(.55)});
    if(afterOverview){
      // A visible overview beat separates the two radial flights. Section navigation
      // cancels this same timeline/revision, so no queued destination can reopen later.
      activeSectionTimeline.to({}, {duration:duration(.3)}).call(()=>{
        if(request!==revision)return;
        setState('journey');afterOverview();
      });
    }else activeSectionTimeline.call(()=>{
      if(request===revision)markerData[previous].element.focus({preventScroll:true});
    });
  });
}

function updateDestinationNavigation() {
  const cycle=storyActive&&storyCycleEnd>=0;
  const finished=cycle&&currentIndex===storyCycleEnd;
  const next=cycle?(currentIndex+1)%locations.length:currentIndex+1;
  for(const id of ['video-skip-btn','destination-video-next']){
    const button=$(id);if(!button)return;
    button.disabled=!destinationReady;
    if(currentIndex<0)continue;
    const label=finished?t('back'):next<locations.length?t('nextJourney'):t('wedding');
    const name=finished?t('navJourney'):next<locations.length?cityName(locations[next]):t('navWedding');
    const eyebrow=document.createElement('span'),target=document.createElement('span'),arrow=document.createElement('span');
    eyebrow.className='next-eyebrow';eyebrow.textContent=label;
    target.className='next-city';target.textContent=name;
    arrow.className='next-arrow';arrow.textContent='→';arrow.setAttribute('aria-hidden','true');
    button.replaceChildren(eyebrow,target,arrow);button.setAttribute('aria-label',label+' — '+name);
  }
}

function navigateDestination(offset=1) {
  if(state!=='memory'||!destinationReady||fullscreenVideo.closing)return;
  if(storyActive&&storyCycleEnd>=0&&currentIndex===storyCycleEnd){
    pauseStory();storyIndex=(currentIndex+1)%locations.length;closeModal();return;
  }
  const target=storyActive&&storyCycleEnd>=0?(currentIndex+offset+locations.length)%locations.length:currentIndex+offset;
  if(target<0||target>locations.length)return;
  destinationReady=false;updateDestinationNavigation();
  clearTimeout(storyTimer);queuedDestination=target;
  closeModal(()=>{});
}
function nextMemory(){
  if(state!=='memory'||!destinationReady||fullscreenVideo.closing)return;
  if(fullscreenVideo.externalHold){
    storyActive=fullscreenVideo.resumeStory;
    fullscreenVideo.externalHold=false;fullscreenVideo.resumeStory=false;
    syncStoryUI();
  }
  navigateDestination(1);
}


function syncStoryUI(){
  const button=$('story-play');if(!button)return;
  if (state === 'intro' && particleIntro?.active) {
    const playing = particleIntro.mode === 'auto';
    const label = t(playing ? 'introPause' : particleIntro.progress > 0 ? 'introContinue' : 'introPlay');
    button.setAttribute('aria-label',label);button.title=label;
    button.setAttribute('aria-pressed',String(playing));button.disabled=false;
    return;
  }
  const label=t(storyActive?'storyPause':storyStarted?'storyContinue':'storyPlay');
  button.setAttribute('aria-label',label);button.title=label;
  button.setAttribute('aria-pressed',String(storyActive));
  button.disabled=state!=='journey'&&!storyActive;
}

function pauseStory(){
  storyActive=false;autoStoryPending=false;clearTimeout(storyTimer);queuedDestination=null;syncStoryUI();
}
function startStory(){
  if(state!=='journey'||cameraMoving)return;
  storyActive=true;storyStarted=true;syncStoryUI();
  flyToAndShow(storyIndex);
}
function interruptStoryGesture(){
  if((!storyActive&&!entranceActive&&!autoStoryPending)||fullscreenVideo.active)return;
  pauseStory();killActiveSectionTransition();currentIndex=-1;setState('journey');
  gsap.to(framing,{x:0,y:.065,duration:duration(.4)});
  gsap.to(journeyMotion,{focus:0,duration:duration(.4)});
  gsap.to([$ ('label-layer'),$('city-connectors'),$('journey-instruction')],{autoAlpha:1,duration:duration(.4)});
}
$('story-play').onclick=()=>{if(state==='intro'&&particleIntro?.active){particleIntro.toggle();return;}if(storyActive){pauseStory();if(state==='memory')closeModal();}else startStory();};
videoScene.addEventListener('click',event=>{
  if(storyActive&&!event.target.closest('button,a')){pauseStory();closeFullscreenVideo();}
});
bindGlobeInput(globeSurface, {
  canInteract: () => camera && $('globe-fallback').hidden && !fullscreenVideo.active &&
    (state==='journey' || (storyActive && state==='memory' && !destinationReady)),
  canTap: () => state==='journey' && !cameraMoving && !entranceActive,
  onInteract: () => {
    interruptStoryGesture();
    if(state==='journey' && !cameraMoving) controls.enabled=true;
    journeyMotion.spin=0; controls.autoRotate=false; idleSince=performance.now()+900;
  },
  onTap: (target,x,y) => {
    if(target) { target.click(); return; }
    let closest=-1, distance=15;
    markerData.forEach((item,index)=>{
      const world=item.mesh.getWorldPosition(worldPoint);
      if(surfaceNormal.copy(world).normalize().dot(cameraDirection.copy(camera.position).sub(world).normalize())<.02)return;
      const p=world.project(camera);
      const delta=Math.hypot((p.x+1)*innerWidth/2-x,(1-p.y)*innerHeight/2-y);
      if(delta<distance){closest=index;distance=delta;}
    });
    if(closest>=0)flyToAndShow(closest);
  }
});

// Independent, persistent utility preferences; audio is never loaded without a source.
function readPreference(key,fallback){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function savePreference(key,value){try{localStorage.setItem(key,value);}catch{}}
const preferences={sound:false,theme:'dark',palette:'classic',language:readPreference('sm-language','sk')==='en'?'en':'sk'};
const mood={value:preferences.theme==='dark'?1:0,palette:preferences.palette==='olive'?1:0};
function getParticleTheme() {
  if (!particleTheme) {
    const css = getComputedStyle(document.documentElement);
    particleTheme = {
      lightPaper:new THREE.Color('#f5f4f0'),darkPaper:new THREE.Color('#20221f'),
      lightInk:new THREE.Color('#292a28'),darkInk:new THREE.Color('#ece9df'),
      oliveColor:new THREE.Color(css.getPropertyValue('--olive').trim()),ivory:new THREE.Color(css.getPropertyValue('--ivory').trim()),
      paper:new THREE.Color(),ink:new THREE.Color(),pairPaper:new THREE.Color(),pairInk:new THREE.Color(),
      dark:0,olive:0,
    };
  }
  const theme=particleTheme,n=mood.value,p=mood.palette;
  theme.pairPaper.copy(theme.ivory).lerp(theme.oliveColor,n);
  theme.pairInk.copy(theme.oliveColor).lerp(theme.ivory,n);
  theme.paper.copy(theme.lightPaper).lerp(theme.darkPaper,n).lerp(theme.pairPaper,p);
  theme.ink.copy(theme.lightInk).lerp(theme.darkInk,n).lerp(theme.pairInk,p);
  theme.dark=n;theme.olive=p;
  return theme;
}
let oliveGlobeColors;
const appliedGlobeTheme={material:null,value:null,palette:null,markers:0};
const music=new Audio();music.loop=true;music.preload='none';music.crossOrigin='anonymous';music.volume=0;music.id='background-music';music.hidden=true;document.body.append(music);
let musicBlocked=false,musicPlayPending=null,musicPlayGesture=false,musicAttempt=0,musicFailed=false,toastTimer;
let musicVideoRecoveryUntil=0,musicVideoRecoveryUsed=false;
music.addEventListener('error',()=>{musicAttempt++;musicPlayPending=null;musicPlayGesture=false;musicBlocked=false;musicFailed=true;music.pause();preferences.sound=false;savePreference('sm-sound','off');applyLanguage();toast('musicUnavailable');});
const t=key=>config.ui[preferences.language][key]||key;
const localized=value=>typeof value==='object'?value?.[preferences.language]||value?.sk:value;
const cityName=loc=>localized(loc.names)||loc.name;
const countryText=loc=>preferences.language==='en'?(loc.countryEn||loc.subname):loc.subname;
const memoryLocation=loc=>loc.special==='engagement'?`${t('engagement')} · ${loc.subname}`:preferences.language==='en'?(loc.descriptionEn||countryText(loc)):(loc.description||loc.subname);
function syncSoundControl(){
  const enabled=preferences.sound;
  $('utility-sound').setAttribute('aria-pressed',String(enabled));
  $('utility-sound').setAttribute('aria-label',t(enabled?'soundOn':'soundOff'));
  $('utility-sound').title=$('utility-sound').getAttribute('aria-label');
}
function syncMusic(userGesture=false){
  userGesture=userGesture===true;
  if(!preferences.sound||document.hidden||musicFailed||!config.audio.backgroundMusic){
    musicAttempt++;musicPlayPending=null;musicPlayGesture=false;
    if(!preferences.sound||musicFailed)musicBlocked=false;
    gsap.killTweensOf(music);music.pause();syncSoundControl();return;
  }
  // A rejected autoplay attempt waits for a real gesture, without timer/focus retries.
  if(musicBlocked&&!userGesture)return;
  if(userGesture)musicBlocked=false;
  if(!music.getAttribute('src'))music.src=/^(https?:|\/)/.test(config.audio.backgroundMusic)?config.audio.backgroundMusic:asset(config.audio.backgroundMusic);
  if(musicPlayPending)return;
  if(!music.paused){syncSoundControl();return;}
  const attempt=++musicAttempt;
  const blocked=()=>{
    if(attempt!==musicAttempt||!preferences.sound||document.hidden)return;
    musicBlocked=true;music.pause();gsap.killTweensOf(music);music.volume=0;
    syncSoundControl();
  };
  let playing;
  try{playing=Promise.resolve(music.play());}catch(error){playing=Promise.reject(error);}
  const pending=playing;
  musicPlayGesture=userGesture;
  musicPlayPending=pending;
  pending.then(()=>{
    if(attempt!==musicAttempt||!preferences.sound||document.hidden)return;
    musicBlocked=false;syncSoundControl();
  },blocked).finally(()=>{if(attempt===musicAttempt){musicPlayPending=null;musicPlayGesture=false;}});
  gsap.killTweensOf(music);
  gsap.to(music,{volume:.45,duration:.8,ease:'sine.inOut'});
}
function toggleMusic(){
  preferences.sound=!preferences.sound;
  savePreference('sm-sound',preferences.sound?'on':'off');
  syncMusic(true);syncSoundControl();
  if(!config.audio.backgroundMusic)toast('noMusic');
}
// Some TV media stacks pause existing audio while acquiring a video decoder.
// Recover once during that handover; never override mute, a hidden tab or Instagram.
function recoverMusicAfterVideoFocus(){
  if(!preferences.sound||document.hidden||musicBlocked||musicFailed||musicVideoRecoveryUsed||!fullscreenVideo.active||fullscreenVideo.closing||fullscreenVideo.externalHold||performance.now()>musicVideoRecoveryUntil)return;
  musicVideoRecoveryUsed=true;
  queueMicrotask(()=>{if(preferences.sound&&!document.hidden&&fullscreenVideo.active&&!fullscreenVideo.closing&&!fullscreenVideo.externalHold)syncMusic();});
}
music.addEventListener('pause',recoverMusicAfterVideoFocus);
function toast(key){clearTimeout(toastTimer);$('utility-toast').dataset.key=key;$('utility-toast').textContent=t(key);$('utility-toast').hidden=false;toastTimer=setTimeout(()=>{$('utility-toast').hidden=true;},3200);}
function applyGlobeTheme(){
  if(!globeMaterial)return;
  // Recolour only while the mood changes or geometry is newly created.
  if(appliedGlobeTheme.material===globeMaterial&&appliedGlobeTheme.value===mood.value&&appliedGlobeTheme.palette===mood.palette&&appliedGlobeTheme.markers===markerData.length)return;
  Object.assign(appliedGlobeTheme,{material:globeMaterial,value:mood.value,palette:mood.palette,markers:markerData.length});
  // Cache linear-space colours from the same CSS tokens used by the interface.
  if(!oliveGlobeColors){
    const css=getComputedStyle(document.documentElement);
    oliveGlobeColors={olive:new THREE.Color(css.getPropertyValue('--olive').trim()),ivory:new THREE.Color(css.getPropertyValue('--ivory').trim()),paper:new THREE.Color(),ink:new THREE.Color()};
  }
  const n=mood.value;
  oliveGlobeColors.paper.copy(oliveGlobeColors.ivory).lerp(oliveGlobeColors.olive,n);
  oliveGlobeColors.ink.copy(oliveGlobeColors.olive).lerp(oliveGlobeColors.ivory,n);
  globeMaterial.color.setRGB(.913*(1-n)+.014*n,.905*(1-n)+.016*n,.871*(1-n)+.014*n);
  overviewMaterial.color.setRGB(.127*(1-n)+.68*n,.138*(1-n)+.70*n,.114*(1-n)+.64*n);
  wireMaterial.color.setRGB(.27*(1-n)+.65*n,.28*(1-n)+.67*n,.26*(1-n)+.61*n);
  globeMaterial.color.lerp(oliveGlobeColors.paper,mood.palette);
  overviewMaterial.color.lerp(oliveGlobeColors.ink,mood.palette);
  wireMaterial.color.lerp(oliveGlobeColors.ink,mood.palette);
  for(const item of markerData)item.mesh?.material.color.setRGB(.019*(1-n)+.84*n,.02*(1-n)+.81*n,.018*(1-n)+.72*n).lerp(oliveGlobeColors.ink,mood.palette);
}
function nextThemeFor(palette){return preferences.palette===palette&&preferences.theme==='dark'?'light':'dark';}
function themeControlLabel(palette){return t(palette==='olive'?(nextThemeFor(palette)==='dark'?'paletteOlive':'paletteIvory'):(nextThemeFor(palette)==='dark'?'classicDark':'classicLight'));}
function selectThemePair(palette){
  preferences.theme=nextThemeFor(palette);preferences.palette=palette;
  savePreference('sm-theme',preferences.theme);savePreference('sm-palette',palette);applyMood();
}
function applyMood(animate=true){
  document.documentElement.dataset.theme=preferences.theme;
  document.documentElement.dataset.palette=preferences.palette;
  $('utility-mood').setAttribute('aria-pressed',String(preferences.palette==='classic'&&preferences.theme==='dark'));
  $('utility-mood').setAttribute('aria-label',themeControlLabel('classic'));
  $('utility-mood').title=$('utility-mood').getAttribute('aria-label');
  $('utility-palette').setAttribute('aria-pressed',String(preferences.palette==='olive'));
  $('utility-palette').setAttribute('aria-label',themeControlLabel('olive'));
  $('utility-palette').title=$('utility-palette').getAttribute('aria-label');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',getComputedStyle(document.documentElement).getPropertyValue('--paper').trim());
  gsap.to(mood,{value:preferences.theme==='dark'?1:0,palette:preferences.palette==='olive'?1:0,duration:animate?duration(.5):0,overwrite:true,onUpdate:applyGlobeTheme});
}
function applyLanguage(){
  $('entry-button-text').textContent=t('enter');$('entry-button').setAttribute('aria-label',t('enterWithSound'));
  originMarkers?.refreshLanguage(t('originLabel'));
  document.documentElement.lang=preferences.language;
  document.title='Simona & Martin — '+t('story');
  galleryChapter?.refreshLanguage();
  const text=(selector,key)=>document.querySelectorAll(selector).forEach(el=>{el.textContent=t(key);});
  const attr=(id,key)=>$(id).setAttribute('aria-label',t(key));
  text('.header-subtitle, .title-layout .eyebrow','story');
  text('#nav-intro','navIntro');text('#nav-wedding','navWedding');
  $('nav-journey').firstChild.textContent=t('navJourney')+' ';
  $('intro-overlay').setAttribute('aria-label',t('navIntro'));
  document.querySelectorAll('#utility-controls button').forEach(button=>button.removeAttribute('title'));
  text('#pl-skip-btn','skip');attr('interactive-preloader','loading');
  text('#intro-copy .sub-line:first-child','intro1');text('#intro-copy .sub-line:last-child','intro2');
  $('next-btn').firstChild.textContent=t('explore')+' ';
  document.querySelector('#journey-instruction p').firstChild.textContent=t('journey1');text('#journey-instruction p span','journey2');
  text('#transition-screen .trans-line:first-child','journeyEntry');text('#transition-screen .trans-line:last-child','journey2');
  text('#globe-fallback','fallback');attr('three-canvas','canvas');attr('header-home','home');attr('bottom-nav','navigation');attr('label-layer','cities');
  attr('destination-video-close','back');attr('video-stop-btn','close');text('#destination-video-retry',fullscreenVideo.externalHold?'videoResume':'play');
  text('#destination-video-return','videoReturn');
  refreshInstagramCopy();
  updateDestinationNavigation();syncStoryUI();
  weddingChapter?.refreshLanguage();
  if(state==='final-transition')weddingTargetRevision++;
  if(weddingParticles?.active)refreshWeddingParticleTarget();
  particleIntro?.refreshLanguage();
  if(!$('media-error').classList.contains('empty-memory'))text('#media-error','imageError');
  for(const item of markerData){const loc=locations[item.index];item.element.setAttribute('aria-label',cityName(loc)+' — '+countryText(loc));item.element.querySelector('.city-subname').textContent=countryText(loc);item.element.querySelector('.city-name').textContent=cityName(loc);}
  if(currentIndex>=0){
    const loc=locations[currentIndex];$('modal-location').textContent=memoryLocation(loc);
    $('destination-video-country').textContent=countryText(loc);
    $('destination-video-highlight-text').textContent=t('moreFromTrip');
    $('modal-city').textContent=cityName(loc);$('destination-video-title').textContent=cityName(loc);
    if($('media-error').classList.contains('empty-memory'))$('media-error').textContent=t('comingSoon');
  }
  const status=$('destination-video-status');
  for(const key of ['videoLoading','videoTap','videoError','videoTimeout'])if(Object.values(config.ui).some(d=>d[key]===status.textContent)){status.textContent=t(key);break;}
  $('utility-language').textContent=preferences.language.toUpperCase();attr('utility-language','language');attr('utility-gallery','photos');attr('utility-controls','controls');
  syncSoundControl();$('utility-mood').setAttribute('aria-label',themeControlLabel('classic'));
  $('utility-palette').setAttribute('aria-label',themeControlLabel('olive'));
  if(!$('utility-toast').hidden)$('utility-toast').textContent=t($('utility-toast').dataset.key);
  $('journey-scene').setAttribute('aria-label','Journey — '+t('journey1'));
  $('transition-screen').setAttribute('aria-label',t('prepare'));
  $('wedding-scene').setAttribute('aria-label',t('navWedding'));
  $('instagram-link').textContent=t('instagram');
  document.querySelectorAll('#utility-controls button').forEach(button=>button.title=button.getAttribute('aria-label'));
  if(state==='intro')announce(t('introStatus'));
  if(state==='journey')announce(t('select'));
  if(state==='wedding')announce(t('navWedding'));
  layoutDirty=true;
}
$('utility-sound').onclick=toggleMusic;
$('utility-gallery').onclick=()=>{
  if(!galleryChapter)galleryChapter=createGallery({
    config:config.gallery,getLanguage:()=>preferences.language,
    onOpen:()=>{particleIntro?.suspend('gallery');if(storyActive)pauseStory();},
    onClose:()=>particleIntro?.resume('gallery'),
  });
  galleryChapter.open($('utility-gallery'));
};
$('utility-mood').onclick=()=>selectThemePair('classic');
$('utility-palette').onclick=()=>selectThemePair('olive');
$('utility-language').onclick=()=>{preferences.language=preferences.language==='sk'?'en':'sk';savePreference('sm-language',preferences.language);applyLanguage();};
document.addEventListener('visibilitychange',syncMusic);
document.addEventListener('visibilitychange',()=>{destinationBuffer.pause(document.hidden);destinationParticles.visibility();destinationWatchdog.visibility();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)weddingParticles?.suspend('visibility');else weddingParticles?.resume('visibility');
});
window.addEventListener('pagehide',()=>weddingParticles?.suspend('page'));

createLabels();
applyLanguage();
applyMood(false);
$('next-btn').onclick = $('nav-journey').onclick = ()=>{pauseStory();if(state==='intro'&&particleIntro?.active)particleIntro.finish();else playJourneyTransition();};
$('header-home').onclick = $('nav-intro').onclick = ()=>{pauseStory();playIntroTextAnimations();};
$('nav-wedding').onclick = ()=>{pauseStory();playWeddingTransition();};
$('video-stop-btn').onclick = ()=>{pauseStory();closeModal();};
$('video-skip-btn').onclick = nextMemory;
$('destination-video-next').onclick = event => { event.stopPropagation(); nextMemory(); };
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !particleIntro?.active){pauseStory();closeModal();} });
let previousOverview=overviewDistance();
window.addEventListener('resize', () => {
  layoutDirty=true;
  if(weddingParticles?.active){
    clearTimeout(weddingTargetRefreshTimer);weddingParticles.suspend('target');
    weddingTargetRefreshTimer=setTimeout(refreshWeddingParticleTarget,120);
  }
  const nextOverview=overviewDistance(), zoomRatio=nextOverview/previousOverview;
  previousOverview=nextOverview;
  if (!camera) {showFallbackLabels();return;}
  controls.maxDistance=nextOverview*1.3;
  if (state === 'memory') {
    gsap.killTweensOf(framing);
    framing.x = mobile() ? 0 : .22; framing.y = mobile() ? .29 : 0;
    const loc = locations[currentIndex];
    if (!cameraMoving) flyCamera(loc.lat,loc.lon,memoryDistance(),0);
  } else if (state === 'journey' && !cameraMoving) {
    // Safari toolbar/viewport changes preserve the user's relative zoom.
    const distance=clamp(camera.position.length()*zoomRatio,controls.minDistance,controls.maxDistance);
    camera.position.setLength(distance);
  }
});
reducedMotion.addEventListener('change', () => {
  if(reducedMotion.matches&&lineartIntro&&introLineartPaths.length){
    gsap.killTweensOf(introLineartPaths);
    gsap.set(introLineartPaths,{strokeDashoffset:0,fillOpacity:1,strokeOpacity:0});
    introLineartStarted=true;
  }
  if (controls) controls.autoRotate=state==='journey'&&!reducedMotion.matches;
  if (reducedMotion.matches && particleIntro?.active) particleIntro.finish();
  if(reducedMotion.matches&&state==='final-transition')finishWeddingEntry(revision);
  journeyMotion.spin=0;
  if(reducedMotion.matches && globeFlight) globeFlight.progress(1);
});
$('three-canvas').addEventListener('keydown',event=>{
  if(state!=='journey'||!camera||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();
  interruptStoryGesture();
  if(cameraMoving)return;
  controls.enabled=true;controls.autoRotate=false;journeyMotion.spin=0;
  const spherical=new THREE.Spherical().setFromVector3(camera.position);
  spherical.theta += event.key==='ArrowLeft'?.13:event.key==='ArrowRight'?-.13:0;
  spherical.phi=clamp(spherical.phi+(event.key==='ArrowUp'?-.1:event.key==='ArrowDown'?.1:0),.1,Math.PI-.1);
  camera.position.setFromSpherical(spherical); controls.update(); idleSince=performance.now()+1800;
});
// BFCache restores the existing section and playback state, never a fresh intro.
window.addEventListener('pageshow', () => { if (particleIntro?.active) particleIntro.resume('page');weddingParticles?.resume('page'); });

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
  $('app').inert=false;$('utility-controls').inert=false;
  $('persistent-header').inert = $('bottom-nav').inert = false;
  syncMusic();
  const initialView = new URLSearchParams(location.search).get('view');
  if(initialView!=='wedding')destinationBuffer.plan(0);
  if (initialView === 'journey') { finishStartupCloud(); playJourneyTransition(); }
  else if (initialView === 'wedding') { finishStartupCloud(); playWeddingTransition(); }
  else playIntroTextAnimations();
}
let loadTimeout;
$('pl-skip-btn').onclick = finishLoading;
$('preloader-percentage').textContent = '50%';
$('loading-ring').style.setProperty('--p','50%');
$('entry-button').onclick=()=>{
  if(loaded)return;
  // Keep play() inside this real click, before imports or animation promises.
  preferences.sound=true;savePreference('sm-sound','on');syncMusic(true);syncSoundControl();
  $('entry-screen').inert=true;delete document.body.dataset.entryPending;
  gsap.to($('entry-screen'),{autoAlpha:0,duration:duration(.35),onComplete:()=>{$('entry-screen').hidden=true;}});
  finishLoading();
};
$('entry-button').focus({preventScroll:true});

// One monogram and one calligraphic name lockup, at every display size.
$('entry-monogram').innerHTML=weddingMonogram();
document.querySelector('#header-home').innerHTML=weddingMonogram();
document.querySelector('.preloader-monogram').innerHTML=weddingMonogram();
const brandHero=document.querySelector('.title-layout h1');
brandHero.classList.add('brand-names');brandHero.innerHTML=names();
