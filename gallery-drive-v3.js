// Apps Script HTML Service bridge: no cross-origin REST/CORS workaround or client OAuth token.
export function validateScriptUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === 'https://script.google.com' && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) && !url.search && !url.hash && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function googleFrameOrigin(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 'script.google.com' || /^[a-z0-9-]+\.googleusercontent\.com$/.test(url.hostname)); } catch { return false; }
}
export function createDriveBridge(scriptUrl) {
  const url = validateScriptUrl(scriptUrl);
  if (!url) return null;
  const channel = [...crypto.getRandomValues(new Uint8Array(24))].map(byte => byte.toString(16).padStart(2,'0')).join('');
  let target = null, origin = null, iframe = null, startPromise = null;
  const pending = new Map();
  function start() {
    if (startPromise) return startPromise;
    startPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { window.removeEventListener('message',handshake); startPromise = null; iframe?.remove(); reject({code:'TIMEOUT'}); }, 30000);
      function handshake(event) {
        if (event.data?.type !== 'gallery:ready' || event.data.channel !== channel || !googleFrameOrigin(event.origin)) return;
        target = event.source; origin = event.origin; clearTimeout(timeout); window.removeEventListener('message',handshake); resolve();
      }
      window.addEventListener('message',handshake);
      iframe = document.createElement('iframe'); iframe.hidden = true; iframe.title = 'Google Drive gallery bridge'; iframe.referrerPolicy = 'no-referrer';
      iframe.src = `${url}?channel=${channel}`; document.body.append(iframe);
    });
    return startPromise;
  }
  window.addEventListener('message', event => {
    if (event.source !== target || event.origin !== origin || event.data?.channel !== channel || event.data.type !== 'gallery:result') return;
    const task = pending.get(event.data.id); if (!task) return;
    clearTimeout(task.timer); pending.delete(event.data.id);
    const result = event.data.result;
    if (!result?.ok) task.reject(result?.error || {code:'STORAGE'});
    else task.resolve(result.result ?? result);
  });
  return { async call(action,data={}) {
    await start();
    return new Promise((resolve,reject) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(() => { pending.delete(id); reject({code:'TIMEOUT'}); },180000);
      pending.set(id,{resolve,reject,timer});
      target.postMessage({type:'gallery:call',channel,id,action,data},origin);
    });
  } };
}

export async function preparePhoto(file) {
  let image;
  let source = file;
  try { image = await decodeImage(source); }
  catch {
    if (!/heic|heif/i.test(file.type + file.name)) throw {code:'IMAGE_DECODE'};
    // Free LGPL libheif decoder, loaded only when native HEIC decoding is unavailable.
    const { heicTo } = await import('./vendor/heic-to.js');
    try { source = await heicTo({blob:file,type:'image/jpeg',quality:.92}); image = await decodeImage(source); }
    catch { throw {code:'IMAGE_DECODE'}; }
  }
  try {
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 50_000_000) throw {code:'IMAGE_DECODE'};
    async function jpeg(maxSide,quality,byteLimit) {
      const ratio = Math.min(1,maxSide / Math.max(image.naturalWidth,image.naturalHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(image.naturalWidth*ratio)); canvas.height = Math.max(1,Math.round(image.naturalHeight*ratio));
      const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height);
      let blob;
      do { blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality)); quality -= .12; }
      while (blob && blob.size > byteLimit && quality >= .35);
      canvas.width = canvas.height = 1;
      if (!blob) throw {code:'IMAGE_DECODE'};
      if (blob.size > byteLimit) throw {code:'IMAGE_DECODE'};
      return blobBase64(blob);
    }
    return { name:file.name, original:await blobBase64(file), thumbnail:await jpeg(480,.76,180000), preview:await jpeg(1600,.84,800000) };
  } finally { URL.revokeObjectURL(image.src); }
}
function decodeImage(blob) {
  return new Promise((resolve,reject) => { const image = new Image(); image.onload=()=>resolve(image); image.onerror=()=>{URL.revokeObjectURL(image.src);reject({code:'IMAGE_DECODE'});}; image.src=URL.createObjectURL(blob); });
}
function blobBase64(blob) {
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject({code:'IMAGE_DECODE'});reader.readAsDataURL(blob);});
}
export function jpegObjectUrl(result) {
  if (result?.mime !== 'image/jpeg' || typeof result.base64 !== 'string' || result.base64.length > 1100000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(result.base64)) throw {code:'IMAGE_DECODE'};
  return URL.createObjectURL(new Blob([Uint8Array.from(atob(result.base64),c=>c.charCodeAt(0))],{type:'image/jpeg'}));
}
