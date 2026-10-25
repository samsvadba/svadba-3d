import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import config from '../../config-v3.js';
import { monogram } from '../../brand-v3.js';
import { bindGlobeInput } from '../../globe-input-v3.js';
import { createGlobe } from './globe.js';
import { createParticles } from './particles.js';
import './style.css';

gsap.registerPlugin(ScrollTrigger);
const $=id=>document.getElementById(id), root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const smooth=(a,b,p)=>THREE.MathUtils.smoothstep(p,a,b);
const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
const preferences={theme:read('sm-theme','light')==='dark'?'dark':'light',palette:read('sm-palette','classic')==='olive'?'olive':'classic',language:read('sm-language','sk')==='en'?'en':'sk'};
const copy={
  sk:{stages:['Dve cesty.','Tu sa začal náš príbeh.','K sebe.','Stále bližšie.','Jeden okamih.','Jeden spoločný príbeh.','Naše spoločné chvíle.'],scroll:'Posúvajte nadol. Príbeh ovládate vy.',explore:'Potiahnite glóbus. Dvoma prstami priblížte.',back:'Späť k príbehu ↑',progress:'Priebeh príbehu',error:'3D scénu sa nepodarilo spustiť. Skúste obnoviť stránku v prehliadači s WebGL.',context:'Obnovujeme 3D scénu…'},
  en:{stages:['Two paths.','Where our story began.','Towards each other.','A little closer.','One moment.','One shared story.','Our shared moments.'],scroll:'Scroll to unfold our story.',explore:'Drag to rotate. Pinch with two fingers to zoom.',back:'Back to our story ↑',progress:'Story progress',error:'The 3D scene could not start. Please reload in a browser with WebGL.',context:'Restoring the 3D scene…'}
};
let globe,fx,trigger,progress=0,interactive=false,selected=-1,flight=null,frame=0,dirty=true,lastTime=0,themeFrame=0;
let width=innerWidth,height=innerHeight,lastStage=-1,contextLost=false;
const originalHeight=height;root.style.setProperty('--story-height',originalHeight+'px');
const origins=config.origins.map(o=>({...o,position:null,label:null,mesh:null}));
const cities=[];
const direction=new THREE.Vector3(),startDirection=new THREE.Vector3(),homeDirection=new THREE.Vector3();
const lookTarget=new THREE.Vector3(),merge=new THREE.Vector3(),basis=new THREE.Quaternion();
const originVectors=[],particleColor=new THREE.Color();
const theme={paper:'',ink:'',dark:false,olive:false};
const displayedTheme={paper:new THREE.Color(),ink:new THREE.Color(),dark:0,olive:0};
let themeTween=null,themeReady=false;
$('story-monogram').innerHTML=monogram;

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
  $('story-return').textContent=d.back;lastStage=-1;applyTheme();dirty=true;schedule();
}
$('utility-mood').onclick=()=>chooseTheme('classic');$('utility-palette').onclick=()=>chooseTheme('olive');
$('utility-language').onclick=()=>{preferences.language=preferences.language==='sk'?'en':'sk';save();language();};

function stageIndex(p){return p<.11?0:p<.265?1:p<.38?2:p<.595?3:p<.70?4:p<.94?5:6;}
function updateCopy(p){
  const stage=stageIndex(p),d=copy[preferences.language];
  if(stage!==lastStage){$('stage-copy').textContent=d.stages[stage];$('story-stage-number').textContent=String(stage+1).padStart(2,'0')+' / 07';lastStage=stage;}
  $('stage-instruction').textContent=interactive?d.explore:d.scroll;
  $('story-return').hidden=!interactive;
  $('story-header').style.opacity=smooth(.94,1,p);
  $('story-monogram').parentElement.setAttribute('aria-hidden',String(p<.94));
  $('story-progress').value=String(Math.round(p*1000));
  $('story-stage').dataset.progress=p.toFixed(6);
}

function addMarkers(){
  for(const [index,o] of origins.entries()){
    o.position=globe.latLonToVec3(o.lat,o.lon,globe.radius+.065);originVectors.push(o.position);
    o.mesh=new THREE.Mesh(new THREE.SphereGeometry(.009,12,8),new THREE.MeshBasicMaterial({color:globe.markerColor,transparent:true,opacity:0,depthTest:true}));
    o.mesh.position.copy(o.position);globe.scene.add(o.mesh);
    o.label=document.createElement('div');o.label.className='origin-label';o.label.dataset.side=index?'left':'right';
    const strong=document.createElement('strong'),small=document.createElement('span');strong.textContent=o.name;small.textContent=o.person;o.label.append(strong,small);$('origin-labels').append(o.label);
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
  const alpha=smooth(.18,.23,p)*(1-smooth(.34,.45,p));
  $('origin-labels').setAttribute('aria-hidden',String(alpha<.01));
  for(const [index,o] of origins.entries()){
    const point=globe.projectSurface(o.position),visible=alpha>.01&&point.visible;
    o.mesh.material.opacity=visible?alpha:0;o.mesh.visible=visible;
    const x=THREE.MathUtils.clamp(point.x+(index?-34:34)+(index?-112:0),20,width-132);
    const y=THREE.MathUtils.clamp(point.y+(index?38:-70),100,height-230);
    o.label.style.transform=`translate3d(${x}px,${y}px,0)`;o.label.style.opacity=visible?alpha:0;
  }
  const reveal=smooth(.955,1,p),slots={left:[],right:[]};
  $('destination-connectors').setAttribute('viewBox',`0 0 ${width} ${height}`);
  for(const c of cities){
    const point=globe.projectSurface(c.position);c.point=point;
    c.mesh.visible=reveal>.01&&point.visible;c.mesh.material.opacity=reveal;
    c.label.style.visibility='hidden';c.label.style.pointerEvents='none';c.label.tabIndex=-1;c.line.style.opacity=0;
    if(!point.visible||reveal<.01||point.facing<.12)continue;
    c.side=point.x<width/2?'left':'right';slots[c.side].push(c);
  }
  for(const [side,list] of Object.entries(slots)){
    list.sort((a,b)=>b.point.facing-a.point.facing);
    const max=Math.max(2,Math.min(6,Math.floor((height-300)/64)));
    const visible=list.slice(0,max).sort((a,b)=>a.point.y-b.point.y);
    visible.forEach((c,i)=>{
      const y=140+i*(height-340)/Math.max(1,visible.length-1),x=side==='left'?22:width-145;
      c.label.querySelector('.city-name').textContent=c.loc.names?.[preferences.language]||c.loc.name;
      c.label.querySelector('.city-subname').textContent=preferences.language==='en'?(c.loc.countryEn||c.loc.subname):c.loc.subname;
      c.label.dataset.side=side;c.label.style.transform=`translate3d(${x}px,${y-surfaceTop}px,0)`;c.label.style.opacity=reveal;c.label.style.visibility='visible';c.label.style.pointerEvents=interactive?'auto':'none';c.label.tabIndex=interactive?0:-1;
      for(const [k,v] of Object.entries({x1:c.point.x,y1:c.point.y,x2:side==='left'?x+105:x,y2:y+22}))c.line.setAttribute(k,v);
      c.line.style.opacity=String(reveal*.24);
    });
  }
}

function cameraStory(p){
  const overview=globe.overviewDistance(width,height);
  const orient=smooth(.055,.19,p),approach=smooth(.12,.265,p),retreat=smooth(.265,.56,p);
  direction.copy(startDirection).lerp(homeDirection,orient).normalize();
  const zoom=approach*(1-retreat),radius=THREE.MathUtils.lerp(overview,globe.radius+.28,zoom);
  globe.camera.position.copy(direction).multiplyScalar(radius);
  lookTarget.copy(homeDirection).multiplyScalar(globe.radius*zoom);
  globe.camera.lookAt(lookTarget);globe.camera.updateMatrixWorld();
  // Every point on the camera path remains outside the Earth, including reversal.
  const depth=overview-(globe.radius+8),worldHeight=2*depth*Math.tan(THREE.MathUtils.degToRad(22.5));
  const scale=Math.min(worldHeight*(width/height)*.76/2.275,worldHeight*.61/2.211);
  merge.copy(homeDirection).multiplyScalar(globe.radius+8);
  basis.copy(globe.camera.quaternion);
  fx.update({progress:p,origins:originVectors,merge,heartScale:scale,color:particleColor,dark:theme.dark?1:0,basis});
  globe.globeMaterial.opacity=1-.7*smooth(.66,.77,p)*(1-smooth(.91,.99,p));
}

function renderStory(){
  if(!globe||contextLost)return;
  const nextInteractive=progress>=.9999;
  if(nextInteractive!==interactive){
    if(nextInteractive)cameraStory(progress);
    flight?.kill();flight=null;interactive=nextInteractive;globe.setInteractive(interactive);
    document.body.toggleAttribute('data-explore',interactive);$('globe-interaction').tabIndex=interactive?0:-1;
    if(interactive){globe.controls.target.set(0,0,0);globe.controls.update();}
  }
  if(!interactive)cameraStory(progress);
  else if(!flight)globe.updateControls(Math.min(.04,(performance.now()-lastTime)/1000||1/60));
  globe.camera.updateMatrixWorld();updateLabels(progress);updateCopy(progress);globe.render();lastTime=performance.now();
}
function schedule(){if(!frame)frame=requestAnimationFrame(tick);}
function tick(){frame=0;if(!globe||contextLost)return;if(dirty||interactive||themeFrame>performance.now()){dirty=false;renderStory();}if(interactive||themeFrame>performance.now())schedule();}

function focusCity(index){
  if(!interactive)return;selected=index;flight?.kill();
  const end=globe.latLonToVec3(cities[index].loc.lat,cities[index].loc.lon,1),start=globe.camera.position.clone().normalize(),distance=globe.camera.position.length(),motion={t:0};
  globe.setInteractive(false);
  flight=gsap.to(motion,{t:1,duration:reduced.matches?0:1.8,ease:'sine.inOut',onUpdate:()=>{
    const radius=THREE.MathUtils.lerp(distance,Math.max(17,globe.radius*1.45),motion.t)+Math.sin(Math.PI*motion.t)*8;
    globe.camera.position.copy(start).lerp(end,motion.t).normalize().multiplyScalar(radius);globe.camera.lookAt(0,0,0);dirty=true;schedule();
  },onComplete:()=>{flight=null;globe.setInteractive(true);}});
}

$('story-progress').addEventListener('input',()=>{if(trigger)window.scrollTo({top:(Number($('story-progress').value)/1000)*trigger.end,behavior:'instant'});});
$('story-return').onclick=()=>window.scrollTo({top:(trigger?.end||0)*.89,behavior:'instant'});
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
    fx=createParticles({count:weak?5200:width<768?9000:14000,mobile:width<768});globe.scene.add(fx.group);
    globe.globeMaterial.transparent=true;
    homeDirection.copy(globe.latLonToVec3((origins[0].lat+origins[1].lat)/2,(origins[0].lon+origins[1].lon)/2,1));
    startDirection.copy(globe.latLonToVec3(30,15,1));addMarkers();applyTheme();
    await globe.ensureDetail();$('story-loading').hidden=true;
    trigger=ScrollTrigger.create({trigger:$('story-track'),start:'top top',end:()=>Math.max(1,$('story-track').offsetHeight-innerHeight),invalidateOnRefresh:true,onUpdate:self=>{
      progress=self.progress;dirty=true;renderStory();schedule();
    }});
    progress=trigger.progress;renderStory();
    $('story-canvas').addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;cancelAnimationFrame(frame);frame=0;$('story-loading').hidden=false;$('story-loading').textContent=copy[preferences.language].context;});
    $('story-canvas').addEventListener('webglcontextrestored',()=>{contextLost=false;$('story-loading').hidden=true;dirty=true;schedule();});
  }catch(error){$('story-loading').textContent=copy[preferences.language].error;console.error('Isolated intro prototype:',error);}
}
let resizeFrame=0;
window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{width=innerWidth;height=innerHeight;globe?.resize(width,height);dirty=true;ScrollTrigger.refresh();schedule();});},{passive:true});
window.addEventListener('orientationchange',()=>{root.style.setProperty('--story-height',innerHeight+'px');},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{dirty=true;schedule();}});
window.addEventListener('pagehide',()=>{flight?.kill();cancelAnimationFrame(frame);frame=0;});
window.addEventListener('pageshow',()=>{dirty=true;ScrollTrigger.refresh();schedule();});
language();init();
