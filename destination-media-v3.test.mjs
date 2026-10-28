import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import config from './config-v3.js';
import { destinationVideoUrl, createDestinationBuffer, createDestinationParticles, createDestinationWatchdog } from './destination-media-v3.js';

const first=config.locations[0].fullscreenVideo;
const silent=destinationVideoUrl(first);
assert.match(silent,/\/ac_none,vc_h264,f_mp4\//);
assert.doesNotMatch(silent,/f_auto/);
assert.match(silent,/w_1080,q_auto\/IMG_1009$/);
assert.equal(destinationVideoUrl('https://example.org/video.mp4'),'https://example.org/video.mp4');
const calls=[],created=[],revoked=[];
const fetcher=async url=>{calls.push(url);return new Response(new Uint8Array(8),{headers:{'content-type':'video/mp4'}});};
const objectUrls={createObjectURL:blob=>{const value=`blob:${created.length}`;created.push({value,size:blob.size});return value;},revokeObjectURL:url=>revoked.push(url)};
const settle=async()=>{for(let i=0;i<10;i++)await new Promise(setImmediate);};
const buffer=createDestinationBuffer(config.locations,{fetcher,objectUrls,maxFileBytes:16,maxBytes:64});
buffer.plan(0);await settle();
assert.equal(calls.length,3,'exactly three upcoming films are buffered');
assert.equal(buffer.sourceFor(config.locations[0]),'blob:0');
buffer.plan(2,config.locations[1]);await settle();
assert.equal(calls.length,5,'cached films are reused');
assert.equal(buffer.sourceFor(config.locations[1]),'blob:1','active film stays pinned');
assert.ok(revoked.includes('blob:0'),'old film memory is released');
buffer.clear();assert.equal(revoked.length,created.length,'all object URLs released on leaving');
const oversized=createDestinationBuffer(config.locations,{fetcher,objectUrls,maxFileBytes:4,maxBytes:16});
const previous=created.length;oversized.plan(0);await settle();
assert.equal(created.length,previous,'stream limit stops oversized preloads');
assert.equal(oversized.sourceFor(config.locations[0]),silent,'normal streaming remains available');
const disabled=createDestinationBuffer(config.locations,{fetcher,objectUrls,enabled:false});
const before=calls.length;disabled.plan(0);await settle();assert.equal(calls.length,before,'data saver disables speculative transfers');
const main=await readFile(new URL('./main-v3.js',import.meta.url),'utf8');
assert.ok(main.indexOf('if(loc.fullscreenVideo)prepareFullscreenVideo(loc);')<main.indexOf('flyCamera(loc.lat, loc.lon, memoryDistance(), 1.3'));
assert.doesNotMatch(main,/textContent=t\('videoLoading'\)/);
assert.match(main,/destinationParticles\.reveal\(destinationVideo\)/);

// Run the actual production preparation/open/readiness handlers. A WebKit-like
// player rejects an invisible media element, making the old ordering fail here.
const playback=main.slice(main.indexOf('function prepareFullscreenVideo('),main.indexOf('function closeFullscreenVideo('));
function playerFixture({blob=false,outcomes=[],tv=false}={}) {
  const events=new Map(),elements=new Map(),deferred=new Map();let plays=0,timerId=0,bufferCalls=0,stops=0;
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,style:{removeProperty(){},setProperty(){}},setAttribute(){},focus(){}});return elements.get(id);};
  const video={src:'',paused:true,ended:false,opacity:0,currentTime:0,load(){},pause(){this.paused=true;},getAttribute(){return this.src;},addEventListener:(type,fn)=>events.set(type,fn),
    play(){plays++;assert.equal(element('scene').autoAlpha,1,'scene is visible before play');assert.equal(this.opacity,1,'video is visible beneath the particles');assert.equal(this.muted,true);assert.equal(this.playsInline,true);
      const error=outcomes.shift();if(error==='pending')return new Promise(()=>{});if(error)return Promise.reject(Object.assign(new Error(error),{name:error}));this.paused=false;return Promise.resolve();}};
  const state={active:false,closing:false,externalHold:false};
  const watch={active:false,start(){this.active=true;},stop(){this.active=false;},snapshot(){return {active:this.active};}};
  const context=vm.createContext({destinationVideo:video,videoScene:element('scene'),fullscreenVideo:state,destinationPlaybackPending:null,destinationSourceFallback:false,
    tvVideoMode:tv,tvVideoVariant:1,diagnosticPlayTimer:undefined,diagnosticAutoWaiting:false,destinationPlaybackFailed:false,destinationWatchdog:watch,
    tvDiagnostics:{open(){},attempt(){},variant(){},playResult(){},focusRetry(){}},setTimeout:fn=>{deferred.set(++timerId,fn);return timerId;},clearTimeout:id=>deferred.delete(id),
    document:{hidden:false,body:{dataset:{}}},window:{matchMedia:()=>({matches:false})},revision:1,currentIndex:0,locations:config.locations,reducedMotion:{matches:false},
    destinationBuffer:{sourceFor:()=>{bufferCalls++;return blob?'blob:cached':silent;}},destinationVideoUrl,destinationParticles:{start(){},stop(){stops++;}},syncMusic(){},refreshInstagramCopy(){},
    cityName:loc=>loc.key,countryText:()=>'',t:key=>key,$:element,gsap:{set:(target,values)=>Object.assign(target,values)}});
  vm.runInContext(playback,context);
  context.prepareFullscreenVideo(config.locations[0]);assert.equal(plays,0,'preparing never plays a hidden film');
  return {context,state,video,events,element,watch,plays:()=>plays,bufferCalls:()=>bufferCalls,stops:()=>stops,open:()=>context.openFullscreenVideo(),runDeferred(){const tasks=[...deferred.values()];deferred.clear();tasks.forEach(fn=>fn());}};
}
const automatic=playerFixture();automatic.open();await settle();
assert.equal(automatic.video.paused,false);assert.equal(automatic.video.autoplay,true);assert.equal(automatic.element('destination-video-retry').hidden,true);
const blobRejected=playerFixture({blob:true,outcomes:['NotAllowedError']});blobRejected.open();await settle();
assert.equal(blobRejected.plays(),2);assert.equal(blobRejected.video.src,silent);assert.equal(blobRejected.video.paused,false,'HTTPS fallback starts without a new tap');
const interrupted=playerFixture({outcomes:['AbortError']});interrupted.open();await settle();
assert.equal(interrupted.element('destination-video-retry').hidden,true,'source cancellation is not reported as gesture denial');
interrupted.events.get('canplay')();await settle();assert.equal(interrupted.video.paused,false);
const blocked=playerFixture({outcomes:['NotAllowedError']});blocked.open();await settle();blocked.events.get('canplay')();await settle();
assert.equal(blocked.plays(),1,'a real policy denial does not create a retry loop');assert.equal(blocked.element('destination-video-retry').hidden,false);
assert.equal(blocked.element('destination-video-return').hidden,false);assert.ok(blocked.stops()>0,'denial clears the particle overlay');
for(const reason of ['externalHold','closing']){
  const held=playerFixture({outcomes:['AbortError']});held.open();held.state[reason]=true;await settle();held.events.get('canplay')();await settle();
  assert.equal(held.plays(),1,`${reason} cannot restart playback`);
}

const trials=playerFixture({tv:true,outcomes:['NotAllowedError','NotAllowedError']});trials.open();trials.events.get('canplay')();assert.equal(trials.plays(),0,'readiness cannot bypass the controlled automatic delay');trials.runDeferred();await settle();
assert.equal(trials.bufferCalls(),0,'TV trials bypass blob cache entirely');assert.equal(trials.video.src,silent);
trials.context.switchTVVideoVariant(2);
assert.equal(trials.video.src,first,'variant 2 changes only the URL, to the exact configured original');
assert.equal(trials.plays(),1,'automatic trial is outside the switching click stack');
trials.runDeferred();await settle();assert.equal(trials.plays(),2);
trials.context.playTVVideoDirectly();assert.equal(trials.plays(),3,'variant 3 calls play synchronously in the real button handler');
assert.equal(trials.video.src,first,'the click trial retains the same original URL');await settle();
trials.video.paused=true;trials.events.get('canplay')();await settle();assert.equal(trials.plays(),3,'manual trial never auto-reopens');
const manualNext=playerFixture({tv:true});manualNext.context.tvVideoVariant=3;manualNext.context.prepareFullscreenVideo(config.locations[0]);manualNext.open();
assert.equal(manualNext.plays(),0);assert.ok(manualNext.stops()>0,'waiting for the explicit TV button never leaves an endless particle overlay');
const hung=playerFixture({outcomes:['pending']});hung.open();hung.context.failFullscreenVideo('videoTimeout');
assert.equal(hung.context.destinationPlaybackPending,null,'unresolved play cannot lock retry');assert.equal(hung.video.paused,true);
assert.equal(hung.element('destination-video-retry').hidden,false);assert.equal(hung.element('destination-video-return').hidden,false);
assert.ok(hung.stops()>0,'timeout clears particles even without play rejection');
const retryHandler=main.slice(main.indexOf("$('destination-video-retry').onclick="),main.indexOf("videoScene.addEventListener('keydown'"));
vm.runInContext(retryHandler,hung.context);hung.element('destination-video-retry').onclick();
assert.equal(hung.plays(),2,'retry immediately calls the same player after an unresolved attempt');await settle();assert.equal(hung.video.paused,false);
assert.match(main,/enabled:!tvVideoMode&&/,'TV trials disable all speculative downloads');
assert.doesNotMatch(main,/createEntryParticles|entryTransition/,'entry particle animation removed');

// Timed checks use a deterministic clock, not sleeping or a real media endpoint.
let clock=0,tickWatch,cancellations=0,hidden=false,failures=[];
const watched={currentTime:0,paused:true,seeking:false,ended:false};
const guard=createDestinationWatchdog(watched,{now:()=>clock,isHidden:()=>hidden,repeat:fn=>{tickWatch=fn;return 1;},cancel:()=>cancellations++,onTimeout:state=>failures.push(state.status)});
guard.start();clock=14999;tickWatch();assert.equal(failures.length,0);clock=15000;tickWatch();
assert.deepEqual(failures,['startup-timeout'],'a never-settled play times out');tickWatch();assert.equal(failures.length,1,'stale ticks cannot repeat the failure');
clock=20000;guard.start();clock=20500;watched.currentTime=.8;watched.paused=false;tickWatch();assert.equal(guard.snapshot().advanced,.8);
clock=30499;tickWatch();assert.equal(failures.length,1);clock=30500;tickWatch();assert.equal(failures[1],'stalled');
clock=40000;watched.currentTime=0;guard.start();hidden=true;clock=60000;tickWatch();hidden=false;guard.visibility();clock=60001;tickWatch();assert.equal(failures.length,2,'hidden time is not counted as a visible loading failure');
watched.ended=true;tickWatch();assert.equal(guard.snapshot().active,false);assert.equal(failures.length,2);assert.ok(cancellations>=3);

// The portrait transition must span both viewport axes, including after the
// cloud has gathered, rather than fitting a small 9:16 frame at the centre.
const savedGlobals=new Map(['document','requestAnimationFrame','cancelAnimationFrame','devicePixelRatio'].map(key=>[key,globalThis[key]]));
try {
  const callbacks=new Map();let frameId=0,arcs=[],fills=[];let bounds={width:390,height:844};
  Object.assign(globalThis,{document:{hidden:false},devicePixelRatio:2,requestAnimationFrame:fn=>{callbacks.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>callbacks.delete(id)});
  const context={setTransform(){},clearRect(){arcs=[];fills=[];},fillRect:(...rect)=>fills.push(rect),beginPath(){},arc:(x,y)=>arcs.push([x,y]),fill(){}};
  const canvas={hidden:true,getContext:()=>context,getBoundingClientRect:()=>bounds};
  const particles=createDestinationParticles(canvas,{reducedMotion:{matches:false},getColor:()=>'#ece9df',getBackground:()=>'#20221f'});
  const tick=now=>{const next=callbacks.entries().next().value;assert.ok(next);callbacks.delete(next[0]);next[1](now);};
  for(const dimensions of [{width:390,height:844},{width:844,height:390}]){
    bounds=dimensions;particles.start();tick(performance.now()+1200);
    assert.deepEqual(fills[0],[0,0,bounds.width,bounds.height]);
    assert.ok(Math.min(...arcs.map(p=>p[0]))<bounds.width*.04&&Math.max(...arcs.map(p=>p[0]))>bounds.width*.96);
    assert.ok(Math.min(...arcs.map(p=>p[1]))<bounds.height*.04&&Math.max(...arcs.map(p=>p[1]))>bounds.height*.96);
    particles.reveal();tick(performance.now()+1000);assert.equal(canvas.hidden,true,'overlay clears after playback starts');
  }
  particles.stop();
} finally {for(const [key,value] of savedGlobals){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
console.log('PASS: buffer bounds; automatic/direct TV variants with exact URLs and no cache; unresolved-play/stall deadlines; retry/back and overlay cleanup; hold/close guards; full particle coverage. TV hardware remains untested.');
