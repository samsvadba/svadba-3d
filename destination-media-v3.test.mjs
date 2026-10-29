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
  const events=new Map(),elements=new Map(),deferred=new Map(),trace=[];let plays=0,timerId=0,bufferCalls=0,stops=0;
  const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,style:{removeProperty(){},setProperty(){}},setAttribute(){},focus(){}});return elements.get(id);};
  const video={src:'',paused:true,ended:false,opacity:0,currentTime:0,load(){},pause(){this.paused=true;},getAttribute(){return this.src;},addEventListener:(type,fn)=>events.set(type,fn),
    play(){plays++;assert.equal(element('scene').autoAlpha,1,'scene is visible before play');assert.equal(this.opacity,1,'video is visible beneath the particles');assert.equal(this.muted,true);assert.equal(this.playsInline,true);
      const error=outcomes.shift();if(error==='pending')return new Promise(()=>{});if(error)return Promise.reject(Object.assign(new Error(error),{name:error}));this.paused=false;return Promise.resolve();}};
  const state={active:false,closing:false,externalHold:false};
  const watch={active:false,start(){this.active=true;},stop(){this.active=false;},snapshot(){return {active:this.active};}};
  const context=vm.createContext({destinationVideo:video,videoScene:element('scene'),fullscreenVideo:state,destinationPlaybackPending:null,destinationSourceFallback:false,
    tvVideoMode:tv,tvVideoVariant:1,diagnosticPlayTimer:undefined,diagnosticAutoWaiting:false,destinationPlaybackFailed:false,destinationWatchdog:watch,destinationPlaybackEpoch:0,destinationDeferredPlay:null,
    tvDiagnostics:Object.fromEntries(['open','attempt','variant','playResult','focusRetry','control','returned','timer','exception'].map(name=>[name,(...args)=>trace.push([name,...args])])),setTimeout:fn=>{deferred.set(++timerId,fn);return timerId;},clearTimeout:id=>deferred.delete(id),
    document:{hidden:false,visibilityState:'visible',body:{dataset:{}}},window:{matchMedia:()=>({matches:false})},revision:1,currentIndex:0,locations:config.locations,reducedMotion:{matches:false},
    destinationBuffer:{sourceFor:()=>{bufferCalls++;return blob?'blob:cached':silent;}},destinationVideoUrl,destinationParticles:{start(){},stop(){stops++;}},syncMusic(){},refreshInstagramCopy(){},
    cityName:loc=>loc.key,countryText:()=>'',t:key=>key,$:element,gsap:{set:(target,values)=>Object.assign(target,values)}});
  vm.runInContext(playback,context);
  context.prepareFullscreenVideo(config.locations[0]);assert.equal(plays,0,'preparing never plays a hidden film');
  return {context,state,video,events,element,watch,trace,deferred,plays:()=>plays,bufferCalls:()=>bufferCalls,stops:()=>stops,open:()=>context.openFullscreenVideo(),runDeferred(){const tasks=[...deferred.values()];deferred.clear();tasks.forEach(fn=>fn());}};
}
const automatic=playerFixture();automatic.open();await settle();
assert.equal(automatic.video.paused,false);assert.equal(automatic.video.autoplay,false);assert.equal(automatic.element('destination-video-retry').hidden,true);
assert.equal(automatic.plays(),1,'normal page calls play immediately, without the six-second diagnostic timer');assert.equal(automatic.deferred.size,0);
const directProduction=playerFixture({blob:true});directProduction.open();await settle();
assert.equal(directProduction.bufferCalls(),0,'normal page bypasses blob sources just like the successful TV trial');
assert.equal(directProduction.plays(),1);assert.equal(directProduction.video.src,silent);assert.equal(directProduction.video.paused,false);
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
const endedHandler=main.slice(main.indexOf("destinationVideo.addEventListener('ended'"),main.indexOf("$('destination-video-retry').onclick="));
for(const tv of [false,true]){
  const finished=playerFixture({tv});let next=0,back=0;
  Object.assign(finished.context,{storyActive:true,nextMemory(){next++;},closeFullscreenVideo(){back++;}});
  vm.runInContext(endedHandler,finished.context);finished.events.get('ended')();
  assert.equal(next,1,'ended advances Story, including TV diagnostics');
  finished.context.storyActive=false;finished.events.get('ended')();assert.equal(back,1,'Explore returns to Journey');
  finished.state.externalHold=true;finished.events.get('ended')();assert.equal(next,1);assert.equal(back,1,'Instagram hold never advances automatically');
}
const manualNext=playerFixture({tv:true});manualNext.context.tvVideoVariant=3;manualNext.context.prepareFullscreenVideo(config.locations[0]);manualNext.open();
assert.equal(manualNext.plays(),0);assert.ok(manualNext.stops()>0,'waiting for the explicit TV button never leaves an endless particle overlay');
const hung=playerFixture({outcomes:['pending']});hung.open();hung.context.failFullscreenVideo('videoTimeout');
assert.equal(hung.context.destinationPlaybackPending,null,'unresolved play cannot lock retry');assert.equal(hung.video.paused,true);
assert.equal(hung.element('destination-video-retry').hidden,false);assert.equal(hung.element('destination-video-return').hidden,false);
assert.ok(hung.stops()>0,'timeout clears particles even without play rejection');
const retryHandler=main.slice(main.indexOf("$('destination-video-retry').onclick="),main.indexOf("videoScene.addEventListener('keydown'"));
vm.runInContext(retryHandler,hung.context);hung.element('destination-video-retry').onclick();
assert.equal(hung.plays(),2,'retry immediately calls the same player after an unresolved attempt');await settle();assert.equal(hung.video.paused,false);

// Regression: readyState=4 can coexist with a hidden document. The six-second
// callback must retain its intent, rather than losing the only play attempt.
const hiddenTrial=playerFixture({tv:true});hiddenTrial.open();hiddenTrial.context.document.hidden=true;hiddenTrial.runDeferred();
assert.equal(hiddenTrial.plays(),0);assert.ok(hiddenTrial.context.destinationDeferredPlay);assert.equal(hiddenTrial.watch.active,true);
assert.ok(hiddenTrial.trace.some(e=>e[0]==='timer'&&e[1]==='scheduled'));
assert.ok(hiddenTrial.trace.some(e=>e[0]==='timer'&&e[1]==='fired'));
assert.ok(hiddenTrial.trace.some(e=>e[0]==='returned'&&e[2].includes('document.hidden')));
hiddenTrial.context.document.hidden=false;hiddenTrial.context.resumeDeferredDestinationPlay('visibilitychange');
hiddenTrial.context.resumeDeferredDestinationPlay('focus');hiddenTrial.context.resumeDeferredDestinationPlay('pageshow');
assert.equal(hiddenTrial.plays(),1,'foreground resumes exactly once, even with three lifecycle events');await settle();
const hiddenTimeout=playerFixture({tv:true});hiddenTimeout.open();hiddenTimeout.context.document.hidden=true;hiddenTimeout.runDeferred();
hiddenTimeout.context.failFullscreenVideo('videoTimeout',true);assert.ok(hiddenTimeout.stops()>0);assert.ok(hiddenTimeout.context.destinationDeferredPlay.timedOut);
hiddenTimeout.context.document.hidden=false;hiddenTimeout.context.resumeDeferredDestinationPlay('visibilitychange');
assert.equal(hiddenTimeout.plays(),1,'a deferred timeout retains one foreground attempt, without keeping the overlay');await settle();
for(const change of ['closing','externalHold','inactive','city','revision','source','cancel']){
  const f=playerFixture({tv:true});f.open();f.context.document.hidden=true;f.runDeferred();
  if(change==='inactive')f.state.active=false;
  else if(change==='city')f.context.currentIndex=1;
  else if(change==='revision')f.context.revision++;
  else if(change==='source')f.video.src='https://example.org/another.mp4';
  else if(change==='cancel')f.context.cancelDestinationPlayback('scene-close');
  else f.state[change]=true;
  f.context.document.hidden=false;f.context.resumeDeferredDestinationPlay('focus');assert.equal(f.plays(),0,change+' cancels stale intent');
}
const hiddenOpen=playerFixture();hiddenOpen.context.document.hidden=true;hiddenOpen.open();
assert.equal(hiddenOpen.watch.active,true,'normal hidden scene also has a watchdog before play is called');
const cancelledTimer=playerFixture({tv:true});cancelledTimer.open();const stale=[...cancelledTimer.deferred.values()][0];
cancelledTimer.context.cancelDestinationPlayback('Instagram-hold');stale();assert.equal(cancelledTimer.plays(),0);
assert.ok(cancelledTimer.trace.some(e=>e[0]==='timer'&&e[1]==='cancelled'&&e[2]==='Instagram-hold'));
assert.ok(cancelledTimer.trace.some(e=>e[0]==='returned'&&e[2].includes('stale timer')));
for(const [key,value,reason] of [['active',false,'scene inactive'],['closing',true,'scene closing'],['externalHold',true,'Instagram hold']]){
  const f=playerFixture();f.state.active=true;f.state[key]=value;f.context.playFullscreenVideo();
  assert.ok(f.trace.some(e=>e[0]==='returned'&&e[2]===reason),'guard explains '+reason);
}
const setupException=playerFixture();Object.defineProperty(setupException.video,'muted',{set(){throw Error('test setup exception');}});setupException.open();
assert.equal(setupException.plays(),0);assert.ok(setupException.trace.some(e=>e[0]==='exception'&&e[1].includes('media-setup')));
assert.ok(setupException.stops()>0,'an exception before play clears particles and exposes recovery');
assert.match(main,/createDestinationBuffer\(locations,\{enabled:false\}\)/,'normal and diagnostic pages both disable speculative blob downloads');
assert.doesNotMatch(main,/createEntryParticles|entryTransition/,'entry particle animation removed');

// Timed checks use a deterministic clock, not sleeping or a real media endpoint.
let clock=0,tickWatch,cancellations=0,hidden=false,failures=[];
const watched={currentTime:0,paused:true,seeking:false,ended:false};
const guard=createDestinationWatchdog(watched,{now:()=>clock,isHidden:()=>hidden,repeat:fn=>{tickWatch=fn;return 1;},cancel:()=>cancellations++,onTimeout:state=>failures.push(state.status)});
guard.start();clock=14999;tickWatch();assert.equal(failures.length,0);clock=15000;tickWatch();
assert.deepEqual(failures,['startup-timeout'],'a never-settled play times out');tickWatch();assert.equal(failures.length,1,'stale ticks cannot repeat the failure');
clock=20000;guard.start();clock=20500;watched.currentTime=.8;watched.paused=false;tickWatch();assert.equal(guard.snapshot().advanced,.8);
clock=30499;tickWatch();assert.equal(failures.length,1);clock=30500;tickWatch();assert.equal(failures[1],'stalled');
clock=40000;watched.currentTime=0;guard.start();hidden=true;clock=45000;tickWatch();clock=50000;guard.visibility();clock=55000;guard.visibility();
assert.equal(failures.length,3,'hidden polls and visibility events never reset the deadline');assert.equal(guard.snapshot().stopReason,'timeout');
hidden=false;clock=60000;guard.start();clock=65000;guard.visibility();clock=70000;guard.visibility();clock=75000;tickWatch();assert.equal(failures.length,4,'visible paused scene also fails at exactly 15 seconds');
clock=80000;guard.start();watched.ended=true;tickWatch();assert.equal(guard.snapshot().active,false);assert.equal(failures.length,4);assert.ok(cancellations>=5);
assert.equal(guard.snapshot().status,'ended');assert.equal(guard.snapshot().stopReason,'ended');
let watchError;watched.ended=false;watched.paused=false;watched.currentTime=0;
const errorGuard=createDestinationWatchdog(watched,{now:()=>clock,isHidden:()=>false,repeat:fn=>{tickWatch=fn;return 1;},cancel(){},onProgress(){throw Error('test progress exception');},onError:error=>watchError=error});
errorGuard.start();clock+=500;watched.currentTime=1;tickWatch();assert.equal(errorGuard.snapshot().active,false);assert.equal(watchError.message,'test progress exception');

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
console.log('PASS: TV timer schedule/fire/cancel; hidden deferred attempt resumes once; stale/hold/close cancellation; guard/exception telemetry; fixed 15s/10s deadlines including hidden/visibility; retry and overlay cleanup; unchanged video sources/cache variants; particle coverage. TV hardware remains untested.');
