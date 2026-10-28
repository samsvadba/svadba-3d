import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import config from './config-v3.js';

// Execute the production audio handlers without network or guest data.
const source=await readFile(new URL('./main-v3.js',import.meta.url),'utf8');
const line=prefix=>{const result=source.split(/\r?\n/).find(value=>value.startsWith(prefix));assert.ok(result,prefix);return result;};
const block=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const production=[
  line('function readPreference('),line('function savePreference('),
  line('const preferences='),line('const asset = '),
  block('const music=new Audio();','const t=key=>'),
  block('function syncSoundControl(){','function toast('),
  line("$('utility-sound').onclick="),
  line("document.addEventListener('visibilitychange',syncMusic)"),
  'let loaded=false; function finishLoading(){loaded=true;testStats.entries++;}',
  block("$('entry-button').onclick=", "$('entry-button').focus"),
  'globalThis.player={preferences,music,syncMusic,enter:$("entry-button").onclick,recoverMusicAfterVideoFocus,armRecovery(){musicVideoRecoveryUntil=performance.now()+2000;musicVideoRecoveryUsed=false;}};',
].join('\n');
assert.doesNotMatch(source,/addEventListener\([^\n]+unlockMusic/,'Ordinary interactions cannot enable audio');
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};

function harness(saved={}) {
  const storage=new Map(Object.entries(saved)),attributes=new Map(),events=new Map();
  const sound={setAttribute:(key,value)=>attributes.set(key,value),getAttribute:key=>attributes.get(key)};
  const stats={audio:0,storyCalls:0,entries:0};
  const entry={},entryScreen={};
  const document={hidden:false,body:{dataset:{entryPending:'true'},append(){}},addEventListener:(type,fn)=>events.set(type,fn)};
  const fullscreenVideo={active:false,closing:false,externalHold:false};
  class AudioMock {
    constructor(){stats.audio++;this.paused=true;this.currentTime=0;this.playCalls=0;this.listeners=new Map();}
    addEventListener(type,fn){this.listeners.set(type,fn);}
    getAttribute(key){return key==='src'?this.src:null;}
    play(){this.playCalls++;this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const context=vm.createContext({
    Audio:AudioMock,config,document,base:'/svadba-3d/',fullscreenVideo,queueMicrotask,performance:{now:()=>100},testStats:stats,duration:value=>value,
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
    $:id=>{if(id==='entry-button')return entry;if(id==='entry-screen')return entryScreen;assert.equal(id,'utility-sound');return sound;},t:key=>key,
    pauseStory:()=>stats.storyCalls++,particleIntro:{toggle:()=>stats.storyCalls++},
    applyLanguage(){},toast(){},
    entryTransition:{leave(done){assert.equal(context.player.music.playCalls,1,'Music starts synchronously before the particle departure');done();}},
    gsap:{killTweensOf(){},to(target,options){if('volume' in options)target.volume=options.volume;options.onComplete?.();}},
  });
  vm.runInContext(production,context);
  return {...context.player,storage,sound,stats,document,events,fullscreenVideo,entryScreen};
}

for(const saved of [{},{'sm-sound':'on'},{'sm-sound':'off'}]) {
  const app=harness(saved);
  app.syncMusic();await settle();
  assert.equal(app.preferences.sound,false,'Every page starts muted');
  assert.equal(app.sound.getAttribute('aria-pressed'),'false');
  assert.equal(app.music.playCalls,0,'No automatic playback attempt');
  assert.equal(app.music.src,undefined,'No track fetched before enable');
  assert.equal(app.music.preload,'none');
  assert.notEqual(app.music.autoplay,true);
  for(const type of ['pointerup','click','keydown'])assert.equal(app.events.has(type),false);

  app.sound.onclick();await settle();
  assert.equal(app.music.paused,false,'Sound icon starts the track');
  assert.equal(app.music.playCalls,1);
  assert.equal(app.sound.getAttribute('aria-pressed'),'true');
  assert.equal(app.music.src,'/svadba-3d/'+config.audio.backgroundMusic);
  assert.equal(app.music.currentTime,0);
  assert.equal(app.music.loop,true);
  assert.equal(app.music.volume,.45);
  assert.equal(app.stats.storyCalls,0,'Sound control never toggles or pauses Story');
  assert.equal(app.stats.audio,1);

  app.music.currentTime=12;
  app.document.hidden=true;app.events.get('visibilitychange')();
  assert.equal(app.music.paused,true);
  app.document.hidden=false;app.events.get('visibilitychange')();await settle();
  assert.equal(app.music.paused,false);
  assert.equal(app.music.currentTime,12,'Returning preserves track position');
  app.sound.onclick();await settle();
  assert.equal(app.music.paused,true);
  assert.equal(app.storage.get('sm-sound'),'off');
  app.events.get('visibilitychange')();await settle();
  assert.equal(app.music.paused,true,'Explicit mute remains off');
  assert.equal(app.stats.storyCalls,0);
}
const entry=harness();
entry.enter();await settle();
assert.equal(entry.music.paused,false,'Entry click starts music before asynchronous story work');
assert.equal(entry.music.playCalls,1);assert.equal(entry.stats.entries,1);
assert.equal(entry.preferences.theme,'dark');assert.equal(entry.preferences.palette,'classic');
entry.enter();await settle();assert.equal(entry.stats.entries,1,'Entry is idempotent');
entry.fullscreenVideo.active=true;entry.armRecovery();entry.music.paused=true;
entry.recoverMusicAfterVideoFocus();await settle();
assert.equal(entry.music.paused,false,'TV decoder handover restores music');
const recovered=entry.music.playCalls;
entry.music.paused=true;entry.recoverMusicAfterVideoFocus();await settle();
assert.equal(entry.music.playCalls,recovered,'Recovery is bounded, never a play retry loop');
entry.armRecovery();entry.fullscreenVideo.externalHold=true;
entry.recoverMusicAfterVideoFocus();await settle();assert.equal(entry.music.playCalls,recovered);
entry.fullscreenVideo.externalHold=false;entry.armRecovery();entry.sound.onclick();
entry.recoverMusicAfterVideoFocus();await settle();assert.equal(entry.music.playCalls,recovered,'Explicit mute wins over recovery');
assert.equal(entry.stats.storyCalls,0,'Entry and sound never accidentally pause Story');
console.log('Music V3 passed: entry gesture, one player, bounded TV recovery, explicit mute/Instagram hold, loop/fade and visibility.');
