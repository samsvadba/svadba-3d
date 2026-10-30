import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createVideoPlayLog} from './video-play-log-v3.js';

const nodes=[],events=new Map();let copied='';
function node(tag){
  const value={tag,children:[],style:{},textContent:'',value:'',setAttribute(){},append(...children){this.children.push(...children);},addEventListener(){},focus(){},select(){},showModal(){this.open=true;},close(){this.open=false;}};
  nodes.push(value);return value;
}
globalThis.document={hidden:false,visibilityState:'visible',body:node('body'),createElement:node};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'iPhone Safari test fixture',vendor:'Apple test fixture',userActivation:{isActive:false,hasBeenActive:true},clipboard:{async writeText(value){copied=value;}}}});
globalThis.location={href:'https://example.org/index-v3.html?video-log=1'};
globalThis.getComputedStyle=()=>({display:'block',visibility:'visible',opacity:'1'});
const video={currentSrc:'https://example.org/original.mp4',muted:true,defaultMuted:true,volume:0,playsInline:true,autoplay:false,paused:true,ended:false,currentTime:0,readyState:4,networkState:1,error:null,isConnected:true,
  getAttribute:()=>video.currentSrc,hasAttribute:()=>true,getBoundingClientRect:()=>({width:390,height:844}),addEventListener:(name,callback)=>events.set(name,callback),
  play(){throw Error('logger must never play');},pause(){throw Error('logger must never pause');},load(){throw Error('logger must never load');}};
let city='vienna';const log=createVideoPlayLog({enabled:true,video,readContext:()=>({city})});
const automatic=log.begin({manual:false,origin:'scene-open'});
assert.equal(nodes.length,1,'no diagnostic UI or focus changes before rejection');
const denied=Object.assign(new Error('The operation is not allowed. Original Safari message.'),{name:'NotAllowedError'});
log.result(automatic,denied);
video.muted=false; // Simulate subsequent player state changes; the capture stays intact.
const open=nodes.find(n=>n.id==='video-play-log-open');assert.ok(open);assert.equal(open.textContent,'Záznam videa');
open.onclick();let report=JSON.parse(nodes.find(n=>n.tag==='textarea').value);
assert.equal(report.firstAutomaticRejection.error.message,denied.message);
assert.equal(report.firstAutomaticRejection.error.stack,denied.stack);
assert.equal(report.firstAutomaticRejection.call.muted,true);assert.equal(report.firstAutomaticRejection.settlement.muted,true);
assert.equal(report.firstAutomaticRejection.call.playsInline,true);assert.equal(report.firstAutomaticRejection.call.hidden,false);
assert.deepEqual(report.firstAutomaticRejection.call.userActivation,{isActive:false,hasBeenActive:true});
assert.equal(report.firstAutomaticRejection.origin,'scene-open');
video.muted=true;navigator.userActivation.isActive=true;
const manual=log.begin({manual:true,origin:'retry-click'});video.paused=false;log.result(manual);
events.get('playing')();video.currentTime=.4;events.get('timeupdate')();
for(let i=0;i<14;i++){city='another';log.begin({manual:false,origin:'canplay'});}
await nodes.find(n=>n.textContent==='Skopírovať záznam').onclick();report=JSON.parse(copied);
assert.equal(report.attempts.length,12,'bounded history');assert.equal(report.firstAutomaticRejection.id,automatic.id,'first automatic failure is pinned');
assert.equal(report.manualComparison.id,manual.id,'same-destination manual comparison is pinned');
assert.equal(report.manualComparison.outcome,'resolved');assert.equal(report.manualComparison.advanced.currentTime,.4,'actual media progression confirms manual success');
assert.equal(report.manualComparison.call.userActivation.isActive,true);assert.equal(report.manualComparison.origin,'retry-click');
Object.defineProperty(navigator,'userActivation',{get(){throw Error('optional API unavailable');}});
assert.doesNotThrow(()=>log.begin({manual:false,origin:'canplay'}));
assert.equal(createVideoPlayLog({enabled:false}).begin(),null);

const main=await readFile(new URL('./main-v3.js',import.meta.url),'utf8');
assert.match(main,/enabled:!tvVideoMode&&new URLSearchParams\(location.search\)\.get\('video-log'\)===\s*'1'/);
const reject=main.slice(main.indexOf('}).catch(error=>{',main.indexOf('const playRecord=')),main.indexOf("// A cancelled load",main.indexOf('const playRecord=')));
assert.ok(reject.indexOf('videoPlayLog.result(playRecord,error)')<reject.indexOf('destinationPlaybackPending!==attempt'),'rejection captured before stale checks and state/error handling');
const module=await readFile(new URL('./video-play-log-v3.js',import.meta.url),'utf8');
assert.doesNotMatch(module,/setTimeout|setInterval|fetch\(|\.play\(|\.pause\(|\.load\(|localStorage/,'observer never controls media, timing, storage or networking');
console.log('PASS: original error/message/stack and pre-handler snapshots; normal timing/source observer; manual comparison with real progress; bounded pinned records; iPhone copy UI; missing activation API; disabled mode. Real Safari rejection requires the user log.');
