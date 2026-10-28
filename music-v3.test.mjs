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
  'globalThis.player={preferences,music,syncMusic};',
].join('\n');
assert.doesNotMatch(source,/addEventListener\([^\n]+unlockMusic/,'Ordinary interactions cannot enable audio');
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};

function harness(saved={}) {
  const storage=new Map(Object.entries(saved)),attributes=new Map(),events=new Map();
  const sound={setAttribute:(key,value)=>attributes.set(key,value),getAttribute:key=>attributes.get(key)};
  const stats={audio:0,storyCalls:0};
  const document={hidden:false,body:{append(){}},addEventListener:(type,fn)=>events.set(type,fn)};
  class AudioMock {
    constructor(){stats.audio++;this.paused=true;this.currentTime=0;this.playCalls=0;this.listeners=new Map();}
    addEventListener(type,fn){this.listeners.set(type,fn);}
    getAttribute(key){return key==='src'?this.src:null;}
    play(){this.playCalls++;this.paused=false;return Promise.resolve();}
    pause(){this.paused=true;}
  }
  const context=vm.createContext({
    Audio:AudioMock,config,document,base:'/svadba-3d/',
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
    $:id=>{assert.equal(id,'utility-sound');return sound;},t:key=>key,
    pauseStory:()=>stats.storyCalls++,particleIntro:{toggle:()=>stats.storyCalls++},
    applyLanguage(){},toast(){},
    gsap:{killTweensOf(){},to(target,options){target.volume=options.volume;}},
  });
  vm.runInContext(production,context);
  return {...context.player,storage,sound,stats,document,events};
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
console.log('Music V3 passed: muted on load, sound-icon-only playback, independent Story, loop/fade and visibility.');
