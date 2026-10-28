import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const source = await readFile(new URL('./Code.gs',import.meta.url),'utf8');
// Actual Apps Script source, fake Google interfaces. These tests cannot prove a live Drive save.
const files=new Map(), props=new Map(), cache=new Map(); let next=0, failRole=null, full=false;
const Drive={
  About:{get:()=>({storageQuota:{limit:'1000000000',usage:full?'1000000000':'0'}})},
  Files:{
    create(meta,blob){if(meta.appProperties.role===failRole){failRole=null;throw Error('temporary outage');} const file={...meta,id:String(++next),trashed:false,createdTime:new Date().toISOString(),bytes:blob?.bytes||[],size:blob?.bytes.length||0,mimeType:blob?.type||meta.mimeType};files.set(file.id,file);return structuredClone(file);},
    get(id){return structuredClone(files.get(id));},
    update(meta,id){const file=files.get(id);Object.assign(file,meta);return structuredClone(file);},
    list(options){
      const parent=options.q.match(/^'([^']+)' in parents/)[1];
      const filters=[...options.q.matchAll(/key='([^']+)' and value='([^']+)'/g)].map(x=>[x[1],x[2]]);
      return {files:[...files.values()].filter(file=>!file.trashed&&file.parents?.includes(parent)&&filters.every(([k,v])=>file.appProperties[k]===v)).map(file=>structuredClone(file))};
    }
  }
};
function instance(){
  const sandbox={Drive,console:{warn(){}},Utilities:{base64Decode:s=>[...Buffer.from(s,'base64')],base64Encode:b=>Buffer.from(b).toString('base64'),newBlob:(bytes,type)=>({bytes,type}),formatDate:()=>new Date().toISOString().slice(0,10)},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},ScriptApp:{getOAuthToken:()=> 'test-token'},UrlFetchApp:{fetch:url=>{const id=url.match(/files\/([^?]+)/)[1];return {getResponseCode:()=>200,getContent:()=>files.get(id).bytes};}}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);return sandbox;
}
let app=instance();
assert.equal(app.galleryCall('status').ready,true);
assert.equal([...files.values()].filter(x=>x.mimeType==='application/vnd.google-apps.folder').length,1);
// Minimal structurally valid JPEG with SOF dimensions; server checks signatures/dimensions, not full decode.
const jpeg=Buffer.from([255,216,255,192,0,17,8,0,20,0,30,3,1,17,0,2,17,0,3,17,0,255,218,0,2,255,217]).toString('base64');
const data={id:'11111111-1111-4111-8111-111111111111',name:'Test.jpg',original:jpeg,thumbnail:jpeg,preview:jpeg};
const uploaded=app.galleryCall('upload',data);assert.equal(uploaded.ok,true);assert.equal(files.size,4);
assert.equal(app.galleryCall('uploadStatus',{id:data.id}).result.photo.id,data.id,'lost response is reconciled against the persisted original');
assert.equal(app.galleryCall('uploadStatus',{id:'66666666-6666-4666-8666-666666666666'}).result.photo,null);
assert.equal(app.galleryCall('uploadStatus',{id:'arbitrary-drive-id'}).error.code,'DENIED');
assert.equal(Buffer.from([...files.values()].find(x=>x.appProperties.role==='original').bytes).toString('base64'),jpeg);
assert.equal(app.galleryCall('upload',data).ok,true);assert.equal(files.size,4,'retry is idempotent');
assert.equal(app.galleryCall('media',{id:data.id,variant:'thumbnail'}).result.base64,jpeg);
app=instance();assert.equal(app.galleryCall('list',{}).result.photos[0].id,data.id,'new runtime reads persisted Drive metadata');
assert.equal(app.galleryCall('media',{id:'arbitrary-drive-id',variant:'original'}).error.code,'DENIED');
assert.equal(app.galleryCall('upload',{...data,id:'22222222-2222-4222-8222-222222222222',original:Buffer.from('<svg/>').toString('base64')}).error.code,'UNSUPPORTED_TYPE');
full=true;assert.equal(app.galleryCall('upload',{...data,id:'33333333-3333-4333-8333-333333333333'}).error.code,'DRIVE_QUOTA');full=false;
failRole='thumbnail';const retry={...data,id:'44444444-4444-4444-8444-444444444444'};
assert.equal(app.galleryCall('upload',retry).ok,false);
assert.equal(app.galleryCall('uploadStatus',{id:retry.id}).result.photo,null,'partial write cannot acknowledge success');
assert.equal(app.galleryCall('list',{}).result.photos.length,1,'partial save is never published');
assert.equal(app.galleryCall('upload',retry).ok,true);
assert.equal(app.galleryCall('list',{}).result.photos.length,2);
const heic=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypheic'),Buffer.alloc(12)]);
assert.equal(app.detect_([...heic]),'image/heic');
props.set('GALLERY_DAILY',JSON.stringify({day:new Date().toISOString().slice(0,10),count:500}));
assert.equal(app.galleryCall('upload',{...data,id:'55555555-5555-4555-8555-555555555555'}).error.code,'DRIVE_QUOTA');
assert.deepEqual(JSON.parse(await readFile(new URL('./appsscript.json',import.meta.url),'utf8')).oauthScopes,['https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/script.external_request']);
// Exercise the actual HTML Service bridge after a dropped upload response.
const bridgeSource=(await readFile(new URL('./Bridge.html',import.meta.url),'utf8')).match(/<script>([\s\S]*?)<\/script>/)[1].replace('<?= channel ?>',JSON.stringify('a'.repeat(48)));
let listener, statusReads=0, uploadCalls=0;const replies=[],timers=[];
const top={postMessage:value=>replies.push(value)};
const bridge={window:{top,addEventListener:(type,fn)=>{listener=fn;}},Date,setTimeout:fn=>timers.push(fn),google:{script:{get run(){
  let success,failure;return {withSuccessHandler(fn){success=fn;return this;},withFailureHandler(fn){failure=fn;return this;},galleryCall(action){
    if(action==='upload'){uploadCalls++;failure();}
    else {statusReads++;success({ok:true,result:{photo:statusReads===1?null:{id:data.id,name:data.name}}});}
  }};
}}}};
vm.createContext(bridge);vm.runInContext(bridgeSource,bridge);
listener({source:top,origin:'https://samsvadba.github.io',data:{type:'gallery:call',channel:'a'.repeat(48),id:'request-1',action:'upload',data}});
assert.equal(replies.filter(x=>x.type==='gallery:result').length,0,'pending original is not acknowledged');
timers.shift()();
assert.equal(uploadCalls,1,'lost response never resends the photo');
assert.equal(statusReads,2);
assert.equal(replies.find(x=>x.type==='gallery:result').result.result.photo.id,data.id);
console.log('PASS: Apps Script upload/list/media persistence, original bytes, retry, partial-write failure, type/HEIC signature, quota and narrow scopes (mock Google interfaces; no live Drive).');
