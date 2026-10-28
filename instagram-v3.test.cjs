// Offline only: no Instagram navigation, clipboard access or production submissions.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'main-v3.js'),'utf8');
const config=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'config-v3.js'),'utf8').replace(/export default config;?\s*$/, 'config;'));
const helpers=source.slice(source.indexOf('const androidInstagram ='),source.indexOf('function resetFullscreenVideo()'));
const handlers=source.slice(source.indexOf("destinationVideo.addEventListener('playing'"),source.indexOf('function setState(next)'));
const next=source.slice(source.indexOf('function nextMemory(){'),source.indexOf('function syncStoryUI(){'));
const url=config.locations.find(loc=>loc.key==='vienna').instagramHighlight;
function fixture(userAgent,clipboard){
  const elements=new Map(),events={};
  function element(id){
    if(!elements.has(id))elements.set(id,{id,hidden:true,disabled:false,dataset:{},value:'',textContent:'',attrs:{},
      addEventListener(type,fn){events[id+':'+type]=fn;},setAttribute(k,v){this.attrs[k]=v;},after(){},focus(){this.focused=true;},select(){this.selected=true;}});
    return elements.get(id);
  }
  const video={currentTime:12,ended:false,pauses:0,loads:0,pause(){this.pauses++;},load(){this.loads++;},hasAttribute(){return true;},addEventListener(type,fn){events['video:'+type]=fn;}};
  const c={navigator:{userAgent,clipboard},document:{createElement(tag){return element('new-'+tag+'-'+elements.size);}},
    $:element,locations:[{instagramHighlight:url},{}],currentIndex:0,revision:3,state:'memory',destinationReady:true,
    destinationWatchdog:{stop(){}},diagnosticPlayTimer:undefined,clearTimeout,tvVideoMode:false,destinationPlaybackFailed:false,
    fullscreenVideo:{active:true,closing:false,externalHold:false,resumeStory:false},storyActive:true,destinationVideo:video,videoScene:element('scene'),
    gsap:{to(){}},duration:n=>n,t:key=>config.ui.sk[key],pauseStory(){c.storyActive=false;},playFullscreenVideo(){c.plays=(c.plays||0)+1;},
    closeFullscreenVideo(){c.closed=true;},syncStoryUI(){},navigateDestination(offset){c.next=offset;},window:{open(){throw Error('Unexpected navigation');}}};
  vm.createContext(c);vm.runInContext(helpers+handlers+next,c);
  return {c,video,element,events,run:code=>vm.runInContext(code,c)};
}
function event(){return {prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};}
(async()=>{
  for(const ua of ['iPhone Safari','Desktop Chrome','Android Chrome']){
    for(const story of [true,false]){
      const f=fixture(ua);f.c.storyActive=story;const e=event();
      f.events['destination-video-highlight:click'](e);
      assert.equal(e.prevented,false);assert.equal(e.stopped,true);
      assert.equal(f.c.fullscreenVideo.externalHold,true);assert.equal(f.c.storyActive,false);
      assert.equal(f.element('destination-video-retry').hidden,false);
      f.events['video:ended']();assert.equal(f.c.next,undefined);assert.equal(f.c.closed,undefined);
      f.events['video:playing']();assert.ok(f.video.pauses>=2);
      f.events['destination-video-highlight:click'](event());assert.equal(f.c.fullscreenVideo.resumeStory,story);
      f.element('destination-video-retry').onclick();
      assert.equal(f.video.currentTime,12);assert.equal(f.video.loads,0);assert.equal(f.c.plays,1);
      assert.equal(f.c.fullscreenVideo.externalHold,false);assert.equal(f.c.storyActive,false);
      assert.equal(f.run('Boolean(instagramCopy)'),ua.includes('Android'));
      const n=fixture(ua);n.c.storyActive=story;n.events['destination-video-highlight:click'](event());n.run('nextMemory()');
      assert.equal(n.c.next,1);assert.equal(n.c.storyActive,story);assert.equal(n.c.fullscreenVideo.externalHold,false);
    }
  }
  let copied;const success=fixture('Android Chrome',{writeText:async value=>{copied=value;}});
  success.run('refreshInstagramCopy()');await success.run('copyInstagramHighlight({stopPropagation(){}})');
  assert.equal(copied,url);assert.equal(success.run('instagramCopyHelp.dataset.key'),'instagramCopied');
  assert.equal(success.run('instagramCopyField.hidden'),true);assert.equal(success.c.storyActive,false);
  const errored=fixture('Android Chrome');errored.events['destination-video-highlight:click'](event());errored.video.error={};
  errored.element('destination-video-retry').onclick();assert.equal(errored.video.loads,1);assert.equal(errored.c.plays,1);
  success.c.currentIndex=1;success.run('refreshInstagramCopy()');assert.equal(success.run('instagramCopy.hidden'),true);
  for(const clipboard of [undefined,{writeText:async()=>{throw Error('Permission denied');}}]){
    const denied=fixture('Android Chrome',clipboard);await denied.run('copyInstagramHighlight({stopPropagation(){}})');
    assert.equal(denied.run('instagramCopyField.value'),url);assert.equal(denied.run('instagramCopyField.hidden'),false);
    assert.equal(denied.run('instagramCopyField.selected'),true);assert.equal(denied.run('instagramCopy.disabled'),false);
  }
  let resolve;const pending=fixture('Android Chrome',{writeText:()=>new Promise(r=>{resolve=r;})});
  const operation=pending.run('copyInstagramHighlight({stopPropagation(){}})');pending.c.revision++;resolve();await operation;
  assert.equal(pending.run('instagramCopyHelp.hidden'),true); // Stale clipboard response cannot affect the next city.
  const html=fs.readFileSync(path.join(__dirname,'index-v3.html'),'utf8');
  assert.match(html,/<a id="destination-video-highlight" target="_blank" rel="noopener noreferrer"/);
  // BFCache keeps every current chapter/destination in place. Only an active
  // particle intro may resume its existing clock; it must never restart V3.
  const pageshow=source.split('\n').find(line=>line.startsWith("window.addEventListener('pageshow'"));
  assert.ok(pageshow.includes("particleIntro.resume('page')"));
  assert.doesNotMatch(pageshow,/playIntroTextAnimations|playJourneyTransition|nextMemory|window\.open/);
  assert.ok(!/window\.open|location\s*=|location\.href|intent:|instagram:\/\//.test(helpers+handlers));
  for(const key of ['instagramCopy','instagramBrowserHint','instagramCopied','instagramCopyManual','videoResume']){
    assert.ok(config.ui.sk[key]);assert.ok(config.ui.en[key]);
  }
  console.log('PASS: Android clipboard/fallback, exact HTTPS URL, iOS/desktop native link, hold/resume/NEXT, stale async guard, no automatic navigation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
