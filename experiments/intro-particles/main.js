import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import config from '../../config-v3.js';
import { weddingMonogram } from '../../brand-v3.js';
import { bindGlobeInput } from '../../globe-input-v3.js';
import { createGlobe, placeOriginLabel } from './globe.js';
import { createParticles, HEART_BOUNDS } from './particles.js';
import { createChoreography } from './choreography.js';
import { createPlayback } from './playback.js';
import { toStoryProgress, STORY_DURATION } from './pacing.js';
import './style.css';

gsap.registerPlugin(ScrollTrigger);
const $=id=>document.getElementById(id), root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const smooth=(a,b,p)=>THREE.MathUtils.smoothstep(p,a,b);
const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const preferences={theme:read('sm-theme','light')==='dark'?'dark':'light',palette:read('sm-palette','classic')==='olive'?'olive':'classic',language:read('sm-language','sk')==='en'?'en':'sk'};
const copy={
  sk:{manual:'Posúvajte nahor alebo nadol. Príbeh ovládate vy.',play:'Pokračovať v úvode',pause:'Pozastaviť úvod',skip:'Preskočiť úvod ↘',replay:'Pozrieť úvod znova',journey:'Cesta',wedding:'Svadba',navigation:'Pokračovanie príbehu',globe:'Interaktívny glóbus. Potiahnite na otočenie, dvoma prstami priblížte.',progress:'Priebeh príbehu',error:'3D scénu sa nepodarilo spustiť. Svadobné informácie môžete otvoriť priamo.',context:'Obnovujeme 3D scénu…'},
  en:{manual:'Scroll up or down. You are in control.',play:'Continue the intro',pause:'Pause the intro',skip:'Skip intro ↘',replay:'Watch intro again',journey:'Journey',wedding:'Wedding',navigation:'Continue our story',globe:'Interactive globe. Drag to rotate, pinch with two fingers to zoom.',progress:'Story progress',error:'The 3D scene could not start. You can open the wedding information directly.',context:'Restoring the 3D scene…'}
};
let globe,fx,trigger,playback,choreography,pose,progress=0,mode='loading',interactive=false,flight=null,frame=0,dirty=true,lastTime=0,themeFrame=0;
let width=innerWidth,height=innerHeight,lastStage=-1,contextLost=false,syncingScroll=false,syncToken=0;
const manualAnchor={scroll:0,progress:0},ignoredPointers=new Set(),suspensions=new Set();
let ignoreWheelUntil=0,exploreExit=null;
const originalHeight=height;root.style.setProperty('--story-height',originalHeight+'px');
const origins=config.origins.map(o=>({...o,position:null,label:null,mesh:null}));
const cities=[];
const startDirection=new THREE.Vector3(),homeDirection=new THREE.Vector3();
const exitRotation=new THREE.Quaternion(),exitDirection=new THREE.Vector3(),identity=new THREE.Quaternion();
const originVectors=[],particleColor=new THREE.Color();
const markerView=new THREE.Vector3();
const theme={paper:'',ink:'',dark:false,olive:false};
const displayedTheme={paper:new THREE.Color(),ink:new THREE.Color(),dark:0,olive:0};
let themeTween=null,themeReady=false;
let startupCloudVisible=true;
function dismissStartupCloud(){
  if(!startupCloudVisible)return;
  startupCloudVisible=false;window.dispatchEvent(new Event('intro-particles:first-frame'));
}
$('story-monogram').innerHTML=weddingMonogram();

function save(){try{for(const [k,v] of Object.entries(preferences))localStorage.setItem('sm-'+k,v);}catch{}}
function applyTheme(){
  root.dataset.theme=preferences.theme;root.dataset.palette=preferences.palette;
  $('utility-mood').setAttribute('aria-pressed',String(preferences.palette==='classic'&&preferences.theme==='dark'));
  $('utility-palette').setAttribute('aria-pressed',String(preferences.palette==='olive'));
  for(const palette of ['classic','olive']){
    const dark=!(preferences.palette===palette&&preferences.theme==='dark');
    const key=palette==='classic'?(dark?'classicDark':'classicLight'):(dark?'paletteOlive':'paletteIvory');
    const button=$(palette==='classic'?'utility-mood':'utility-palette');button.title=button.ariaLabel=config.ui[preferences.language][key];
  }
  const css=getComputedStyle(root);Object.assign(theme,{paper:css.getPropertyValue('--paper').trim(),ink:css.getPropertyValue('--ink').trim(),dark:preferences.theme==='dark',olive:preferences.palette==='olive'});
  document.querySelector('meta[name="theme-color"]').content=theme.paper;
  if(globe){
    themeTween?.kill();
    const from={paper:displayedTheme.paper.clone(),ink:displayedTheme.ink.clone(),dark:displayedTheme.dark,olive:displayedTheme.olive};
    const targetPaper=new THREE.Color(theme.paper),targetInk=new THREE.Color(theme.ink),blend={t:0};
    const paint=()=>{
      displayedTheme.paper.copy(from.paper).lerp(targetPaper,blend.t);displayedTheme.ink.copy(from.ink).lerp(targetInk,blend.t);
      displayedTheme.dark=THREE.MathUtils.lerp(from.dark,Number(theme.dark),blend.t);displayedTheme.olive=THREE.MathUtils.lerp(from.olive,Number(theme.olive),blend.t);
      globe.setTheme(displayedTheme);particleColor.copy(displayedTheme.ink);
      for(const o of origins)o.mesh.material.color.copy(globe.markerColor);for(const c of cities)c.mesh.material.color.copy(globe.markerColor);
      dirty=true;schedule();
    };
    if(!themeReady||reduced.matches){blend.t=1;paint();}else themeTween=gsap.to(blend,{t:1,duration:.5,ease:'none',onUpdate:paint});
    themeReady=true;
  }else particleColor.set(theme.ink);
  themeFrame=performance.now()+550;dirty=true;schedule();
}
function chooseTheme(palette){preferences.theme=preferences.palette===palette&&preferences.theme==='dark'?'light':'dark';preferences.palette=palette;save();applyTheme();}
function language(){
  root.lang=preferences.language;const d=copy[preferences.language];
  $('utility-language').textContent=preferences.language.toUpperCase();$('utility-language').title=$('utility-language').ariaLabel=config.ui[preferences.language].language;
  document.querySelector('label[for="story-progress"]').textContent=d.progress;
  $('story-replay').textContent=d.replay;$('story-journey').textContent=d.journey;$('story-wedding').textContent=d.wedding;
  $('story-skip').textContent=d.skip;$('bottom-nav').ariaLabel=d.navigation;$('globe-interaction').ariaLabel=d.globe;
  lastStage=-1;applyTheme();updateCopy(progress);dirty=true;schedule();
}
$('utility-mood').onclick=()=>chooseTheme('classic');$('utility-palette').onclick=()=>chooseTheme('olive');
$('utility-language').onclick=()=>{preferences.language=preferences.language==='sk'?'en':'sk';save();language();};

function stageIndex(p){return p<.18?0:p<.37?1:p<.54?2:p<.64?3:p<.70?4:5;}
function updateCopy(p){
  const stage=stageIndex(toStoryProgress(p)),d=copy[preferences.language];
  if(stage!==lastStage){$('story-stage-number').textContent=String(stage+1).padStart(2,'0')+' / 06';lastStage=stage;}
  document.body.dataset.mode=mode;
  $('stage-instruction').textContent=d.manual;
  $('story-caption').hidden=mode!=='manual';$('story-timeline').hidden=mode!=='manual';
  $('bottom-nav').hidden=mode!=='complete';$('story-skip').hidden=mode==='loading'||mode==='complete';
  $('utility-story').hidden=mode==='complete';$('utility-story').disabled=!playback;
  $('utility-story').title=$('utility-story').ariaLabel=mode==='auto'?d.pause:d.play;
  $('utility-story').setAttribute('aria-pressed',String(mode==='auto'));
  $('story-header').style.opacity=smooth(.99,1,p);
  $('story-header').setAttribute('aria-hidden',String(p<.99));
  $('story-progress').value=String(Math.round(p*1000));
  $('story-stage').dataset.progress=p.toFixed(6);
  $('story-stage').dataset.mode=mode;
}

function addMarkers(){
  for(const [index,o] of origins.entries()){
    o.position=globe.latLonToVec3(o.lat,o.lon,globe.radius+.065);originVectors.push(o.position);
    o.mesh=new THREE.Mesh(new THREE.SphereGeometry(.009,12,8),new THREE.MeshBasicMaterial({color:globe.markerColor,transparent:true,opacity:0,depthTest:true}));
    o.mesh.position.copy(o.position);globe.scene.add(o.mesh);
    o.label=document.createElement('div');o.label.className='origin-label';o.label.dataset.side=index?'left':'right';
    const strong=document.createElement('strong'),small=document.createElement('span');strong.textContent=o.person;small.textContent=o.name;o.label.append(strong,small);$('origin-labels').append(o.label);
    o.line=document.createElementNS('http://www.w3.org/2000/svg','line');$('origin-connectors').append(o.line);
  }
  for(const [index,loc] of config.locations.entries()){
    const position=globe.latLonToVec3(loc.lat,loc.lon,globe.radius+.08);
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),new THREE.MeshBasicMaterial({color:globe.markerColor,transparent:true,opacity:0}));mesh.position.copy(position);globe.scene.add(mesh);
    const label=document.createElement('button');label.type='button';label.className='city-label';label.innerHTML='<span class="city-name"></span><span class="city-subname"></span>';
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');$('destination-connectors').append(line);$('destination-labels').append(label);
    label.onclick=()=>focusCity(index);cities.push({loc,position,mesh,label,line,index});
  }
}

function updateLabels(p){
  const surfaceTop=$('globe-interaction').getBoundingClientRect().top;
  const sizeMarker=(mesh,radius)=>{
    markerView.copy(mesh.position).applyMatrix4(globe.camera.matrixWorldInverse);
    const worldPerPixel=2*Math.max(.01,-markerView.z)*Math.tan(THREE.MathUtils.degToRad(22.5))/height;
    mesh.scale.setScalar(2.5*worldPerPixel/radius);
  };
  const alpha=pose?.originReveal||0;
  const originCountry=alpha>.01?globe.projectCountryBounds('SVK'):null,occupied=[];
  const originFooter=mode==='manual'?$('story-caption'):$('utility-controls');
  const originBottom=Math.min(height-85,originFooter.getBoundingClientRect().top-22);
  $('origin-connectors').setAttribute('viewBox',`0 0 ${width} ${height}`);
  $('origin-labels').setAttribute('aria-hidden',String(alpha<.01));
  for(const [index,o] of origins.entries()){
    const point=globe.projectSurface(o.position),visible=alpha>.01&&point.visible;
    o.mesh.material.opacity=visible?alpha:0;o.mesh.visible=visible;sizeMarker(o.mesh,.009);
    const labelWidth=width<768?118:148,labelHeight=width<768?72:80;
    const placement=placeOriginLabel({index,point,country:originCountry,labelWidth,labelHeight,width,height,bottom:originBottom,occupied});
    const {x,y}=placement;if(visible)occupied.push(placement);
    o.label.style.transform=`translate3d(${x}px,${y}px,0)`;o.label.style.opacity=visible?alpha:0;
    for(const [key,value] of Object.entries({x1:point.x,y1:point.y,x2:THREE.MathUtils.clamp(point.x,x-6,x+labelWidth+6),y2:THREE.MathUtils.clamp(point.y,y-8,y+labelHeight+8)}))o.line.setAttribute(key,value);
    o.line.style.opacity=visible?String(alpha*.32):'0';
  }
  const reveal=pose?.finalReveal||0,slots={left:[],right:[]};
  const labelTop=height<560?80:140;
  const footer=mode==='complete'?$('bottom-nav'):mode==='manual'?$('story-caption'):$('utility-controls');
  const labelBottom=Math.max(labelTop,Math.min(height-200,footer.getBoundingClientRect().top-52));
  $('destination-connectors').setAttribute('viewBox',`0 0 ${width} ${height}`);
  for(const c of cities){
    const point=globe.projectSurface(c.position);c.point=point;
    c.mesh.visible=reveal>.01&&point.visible;c.mesh.material.opacity=reveal;sizeMarker(c.mesh,.045);
    c.label.style.visibility='hidden';c.label.style.pointerEvents='none';c.label.tabIndex=-1;c.line.style.opacity=0;
    if(!point.visible||reveal<.01||point.facing<.12)continue;
    c.side=point.x<width/2?'left':'right';slots[c.side].push(c);
  }
  for(const [side,list] of Object.entries(slots)){
    list.sort((a,b)=>b.point.facing-a.point.facing);
    const max=Math.max(1,Math.min(6,1+Math.floor((labelBottom-labelTop)/64)));
    const visible=list.slice(0,max).sort((a,b)=>a.point.y-b.point.y);
    visible.forEach((c,i)=>{
      const y=labelTop+i*(labelBottom-labelTop)/Math.max(1,visible.length-1),x=side==='left'?22:width-145;
      c.label.querySelector('.city-name').textContent=c.loc.names?.[preferences.language]||c.loc.name;
      c.label.querySelector('.city-subname').textContent=preferences.language==='en'?(c.loc.countryEn||c.loc.subname):c.loc.subname;
      c.label.dataset.side=side;c.label.style.transform=`translate3d(${x}px,${y-surfaceTop}px,0)`;c.label.style.opacity=reveal;c.label.style.visibility='visible';c.label.style.pointerEvents=interactive?'auto':'none';c.label.tabIndex=interactive?0:-1;
      for(const [k,v] of Object.entries({x1:c.point.x,y1:c.point.y,x2:side==='left'?x+105:x,y2:y+22}))c.line.setAttribute(k,v);
      c.line.style.opacity=String(reveal*.24);
    });
  }
}

function cameraStory(p){
  const score=toStoryProgress(p);
  pose=choreography.sample(score,{width,height,overviewDistance:globe.overviewDistance,heartBounds:HEART_BOUNDS});
  if(!interactive){
    globe.camera.position.copy(pose.position);
    // Blend the last free-globe view back into the score when scrubbing upward.
    // Spherical orientation + radial interpolation never crosses the Earth.
    if(exploreExit&&p>.97){
      const weight=smooth(.97,1,p),radius=THREE.MathUtils.lerp(pose.cameraRadius,exploreExit.radius,weight);
      exitRotation.copy(identity).slerp(exploreExit.rotation,weight);
      globe.camera.position.normalize().applyQuaternion(exitRotation).multiplyScalar(radius);
    }
    globe.camera.lookAt(pose.target);globe.camera.updateMatrixWorld();
  }
  globe.group.rotation.y=pose.formationRotation;
  fx.update({progress:score,origins:originVectors,merge:pose.merge,heartScale:pose.heartScale,color:particleColor,dark:displayedTheme.dark,basis:pose.basis,starBasis:pose.basis,formationRotation:pose.formationRotation,formationSurface:score>=.64?pose.globeOpacity:pose.globeReveal});
  globe.globeMesh.visible=pose.globeReveal>.001;
  globe.globeMaterial.opacity=pose.globeOpacity;
}

function renderStory(){
  if(!globe||!fx||!choreography||contextLost)return;
  const nextInteractive=progress>=.999999;
  if(nextInteractive!==interactive){
    if(nextInteractive)cameraStory(progress);
    flight?.kill();flight=null;interactive=nextInteractive;globe.setInteractive(interactive);
    document.body.toggleAttribute('data-explore',interactive);$('globe-interaction').tabIndex=interactive?0:-1;
    if(interactive){globe.controls.target.set(0,0,0);globe.controls.update();}
  }
  if(interactive&&!flight)globe.updateControls(Math.min(.04,(performance.now()-lastTime)/1000||1/60));
  cameraStory(progress);
  globe.camera.updateMatrixWorld();updateCopy(progress);updateLabels(progress);
  globe.render(pose.geographyOpacity,pose.originFocus);dismissStartupCloud();lastTime=performance.now();
}
function schedule(){if(!frame&&!suspensions.size)frame=requestAnimationFrame(tick);}
function tick(){frame=0;if(!globe||contextLost||suspensions.size)return;if(dirty||interactive||themeFrame>performance.now()){dirty=false;renderStory();}if(interactive||themeFrame>performance.now())schedule();}

function focusCity(index){
  if(!interactive)return;flight?.kill();
  const end=globe.latLonToVec3(cities[index].loc.lat,cities[index].loc.lon,1),start=globe.camera.position.clone().normalize(),distance=globe.camera.position.length(),motion={t:0};
  const rotation=new THREE.Quaternion().setFromUnitVectors(start,end),turn=new THREE.Quaternion();
  globe.setInteractive(false);
  flight=gsap.to(motion,{t:1,duration:reduced.matches?0:1.8,ease:'sine.inOut',onUpdate:()=>{
    const radius=THREE.MathUtils.lerp(distance,Math.max(17,globe.radius*1.45),motion.t)+Math.sin(Math.PI*motion.t)*8;
    turn.copy(identity).slerp(rotation,motion.t);globe.camera.position.copy(start).applyQuaternion(turn).multiplyScalar(radius);globe.camera.lookAt(0,0,0);dirty=true;schedule();
  },onComplete:()=>{flight=null;globe.setInteractive(true);}});
}

function captureExploreExit(){
  if(!interactive)return;
  exitDirection.copy(globe.camera.position).normalize();
  exploreExit={radius:globe.camera.position.length(),rotation:new THREE.Quaternion().setFromUnitVectors(homeDirection,exitDirection)};
}
function syncScroll(p=progress){
  if(!trigger)return;
  const token=++syncToken;syncingScroll=true;
  window.scrollTo({top:p*trigger.end,behavior:'instant'});
  manualAnchor.scroll=window.scrollY;manualAnchor.progress=p;
  ScrollTrigger.update();
  requestAnimationFrame(()=>{if(token===syncToken)syncingScroll=false;});
}
function pauseForManual(){
  if(!playback||playback.mode==='complete')return;
  playback.pause();syncScroll();dirty=true;schedule();
}
function resumeAutomatic(){
  if(!playback)return;
  syncScroll();playback.play();dirty=true;schedule();
}
function restart(){
  if(!playback)return;
  flight?.kill();flight=null;exploreExit=null;ignoredPointers.clear();
  syncScroll(0);playback.restart();if(suspensions.size)playback.suspend();
}
$('utility-story').onclick=()=>playback?.mode==='auto'?pauseForManual():resumeAutomatic();
$('story-replay').onclick=restart;
$('story-skip').onclick=()=>playback?.finish();
$('story-progress').addEventListener('input',()=>{
  if(!playback)return;
  const value=Number($('story-progress').value)/1000;
  if(value<1)captureExploreExit();
  playback.seek(value);syncScroll(value);
});

// The first scene gesture only takes control. touch-action:none was active at
// pointerdown, so that entire touch cannot turn into an accidental native pan.
const isUI=target=>target.closest('button,a,input,#utility-controls,#bottom-nav');
$('story-stage').addEventListener('pointerdown',event=>{
  if(isUI(event.target)||!playback)return;
  if(playback.mode!=='auto'&&!ignoredPointers.size)return;
  event.preventDefault();event.stopPropagation();ignoredPointers.add(event.pointerId);
  try{$('story-stage').setPointerCapture(event.pointerId);}catch{}
  if(playback.mode==='auto')pauseForManual();
},{capture:true});
$('story-stage').addEventListener('pointermove',event=>{
  if(ignoredPointers.has(event.pointerId)){event.preventDefault();event.stopPropagation();}
},{capture:true,passive:false});
const endTakeover=event=>{
  if(!ignoredPointers.delete(event.pointerId))return;
  event.preventDefault();event.stopPropagation();
  try{$('story-stage').releasePointerCapture(event.pointerId);}catch{}
};
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('story-stage').addEventListener(type,endTakeover,{capture:true});
$('story-stage').addEventListener('wheel',event=>{
  if(isUI(event.target)||!playback)return;
  const now=performance.now();
  if(playback.mode==='auto'||now<ignoreWheelUntil){
    event.preventDefault();ignoreWheelUntil=now+140;
    if(playback.mode==='auto')pauseForManual();
  }
},{capture:true,passive:false});
document.addEventListener('keydown',event=>{
  if(playback?.mode!=='auto'||isUI(event.target))return;
  if(['Escape','PageDown','PageUp','ArrowDown','ArrowUp',' '].includes(event.key)){event.preventDefault();pauseForManual();}
});
$('globe-interaction').addEventListener('keydown',event=>{
  if(!interactive||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();const spherical=new THREE.Spherical().setFromVector3(globe.camera.position);
  spherical.theta+=event.key==='ArrowLeft'?.1:event.key==='ArrowRight'?-.1:0;
  spherical.phi=THREE.MathUtils.clamp(spherical.phi+(event.key==='ArrowUp'?-.08:event.key==='ArrowDown'?.08:0),.1,Math.PI-.1);
  globe.camera.position.setFromSpherical(spherical);globe.controls.update();dirty=true;schedule();
});

async function init(){
  try{
    globe=await createGlobe({canvas:$('story-canvas'),surface:$('globe-interaction'),onInteraction:()=>{flight?.kill();flight=null;dirty=true;schedule();}});
    bindGlobeInput($('globe-interaction'),{canInteract:()=>interactive&&!flight,canTap:()=>interactive&&!flight,onInteract:()=>{},onTap:target=>target?.click()});
    const weak=(navigator.deviceMemory||4)<=2||(navigator.hardwareConcurrency||4)<=2;
    fx=createParticles({count:weak?16000:width<768?42000:60000,mobile:width<768,formationPositions:globe.getFormationPositions()});globe.scene.add(fx.group);
    globe.globeMaterial.transparent=true;
    homeDirection.copy(globe.latLonToVec3((origins[0].lat+origins[1].lat)/2,(origins[0].lon+origins[1].lon)/2,1));
    startDirection.copy(globe.latLonToVec3(30,15,1));
    choreography=createChoreography({homeDirection,startDirection,radius:globe.radius});
    addMarkers();applyTheme();
    await globe.ensureDetail();
    playback=createPlayback({gsap,duration:STORY_DURATION,
      onMode:next=>{mode=next;updateCopy(progress);dirty=true;schedule();},
      onProgress:p=>{progress=p;dirty=true;schedule();},
      onFinish:()=>syncScroll(1)
    });
    trigger=ScrollTrigger.create({trigger:$('story-track'),start:'top top',end:()=>Math.max(1,$('story-track').offsetHeight-innerHeight),invalidateOnRefresh:true,onUpdate:self=>{
      if(syncingScroll||mode==='auto'||mode==='loading'||ignoredPointers.size||suspensions.size)return;
      let next=manualAnchor.progress+(window.scrollY-manualAnchor.scroll)/self.end;
      if(window.scrollY<=0)next=0;
      if(window.scrollY>=self.end-.5)next=1;
      next=THREE.MathUtils.clamp(next,0,1);
      if(next<1)captureExploreExit();
      playback.seek(next);
    }});
    $('story-canvas').addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;suspend('context');$('story-loading').hidden=false;$('story-loading').textContent=copy[preferences.language].context;});
    $('story-canvas').addEventListener('webglcontextrestored',()=>{contextLost=false;$('story-loading').hidden=true;unsuspend('context');});
    // Compile the actual scene before starting the single score. Reduced motion
    // opens the accessible final navigation; replay remains an explicit opt-in.
    progress=0;renderStory();
    await globe.renderer.compileAsync(globe.scene,globe.camera);
    $('story-loading').hidden=true;
    syncScroll(0);
    if(document.hidden)suspend('hidden');
    if(reduced.matches)playback.finish();else playback.start();
    if(suspensions.size)playback.suspend();
    dirty=true;schedule();
  }catch(error){
    dismissStartupCloud();
    mode='complete';updateCopy(1);$('story-replay').disabled=true;
    $('story-loading').hidden=false;$('story-loading').textContent=copy[preferences.language].error;
    console.error('Isolated intro prototype:',error);
  }
}
function suspend(reason){
  if(suspensions.has(reason))return;
  suspensions.add(reason);playback?.suspend();flight?.pause();
  cancelAnimationFrame(frame);frame=0;
}
function unsuspend(reason){
  suspensions.delete(reason);
  if(suspensions.size)return;
  playback?.resume();flight?.resume();lastTime=performance.now();dirty=true;schedule();
}
let resizeFrame=0;
window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{
  const changedWidth=Math.abs(width-innerWidth)>40;
  width=innerWidth;height=innerHeight;
  // Keep the scroll score stable as Safari's address bar expands/collapses.
  globe?.resize(width,height);
  if(changedWidth){
    root.style.setProperty('--story-height',height+'px');
    syncingScroll=true;ScrollTrigger.refresh();syncScroll();
  }
  dirty=true;schedule();
});},{passive:true});
document.addEventListener('visibilitychange',()=>document.hidden?suspend('hidden'):unsuspend('hidden'));
window.addEventListener('pagehide',()=>suspend('page'));
window.addEventListener('pageshow',()=>{unsuspend('page');syncScroll();});
reduced.addEventListener('change',()=>{if(reduced.matches)playback?.finish();});
language();init();
