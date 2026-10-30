// Opt-in observation of the NORMAL player. No source changes, delays, retries,
// storage, network requests, or calls to play/pause/load from this module.
export function createVideoPlayLog({enabled,video,readContext}) {
  if(!enabled)return {begin(){return null;},result(){}};
  const read=fn=>{try{return fn();}catch(error){return {unavailable:String(error?.message||error)};}};
  const startedAt=performance.now(),records=[];
  let serial=0,current,firstAutomaticRejection,manualComparison,button,dialog,field;
  const at=()=>({utc:new Date().toISOString(),elapsedMs:Math.round(performance.now()-startedAt)});
  function snapshot(){
    return {
      ...at(),context:read(readContext),source:read(()=>video.getAttribute('src')),currentSrc:read(()=>video.currentSrc),
      muted:read(()=>video.muted),defaultMuted:read(()=>video.defaultMuted),volume:read(()=>video.volume),
      playsInline:read(()=>video.playsInline),playsinlineAttribute:read(()=>video.hasAttribute('playsinline')),
      mutedAttribute:read(()=>video.hasAttribute('muted')),autoplay:read(()=>video.autoplay),
      paused:read(()=>video.paused),ended:read(()=>video.ended),currentTime:read(()=>video.currentTime),
      readyState:read(()=>video.readyState),networkState:read(()=>video.networkState),
      mediaError:read(()=>video.error?{code:video.error.code,message:video.error.message}:null),
      hidden:read(()=>document.hidden),visibilityState:read(()=>document.visibilityState),
      userActivation:read(()=>navigator.userActivation?{isActive:navigator.userActivation.isActive,hasBeenActive:navigator.userActivation.hasBeenActive}:{supported:false}),
      connected:read(()=>video.isConnected),presentation:read(()=>{
        const rect=video.getBoundingClientRect(),css=getComputedStyle(video);
        return {width:rect.width,height:rect.height,display:css.display,visibility:css.visibility,opacity:css.opacity};
      }),
    };
  }
  function report(){
    return JSON.stringify({schema:1,mode:'video-log=1; normal source and timing; no TV test delay',
      page:location.href,userAgent:navigator.userAgent,vendor:navigator.vendor,
      firstAutomaticRejection:firstAutomaticRejection||null,manualComparison:manualComparison||null,attempts:records},null,2);
  }
  function offerReport(){
    if(button)return;
    // Appears only AFTER capture. Never steals focus from the existing Play button.
    button=document.createElement('button');button.type='button';button.id='video-play-log-open';button.textContent='Záznam videa';
    button.style.cssText='position:fixed;z-index:10000;top:calc(env(safe-area-inset-top,0px) + 80px);right:16px;padding:10px 14px;border:1px solid currentColor;background:var(--paper);color:var(--ink);font:14px sans-serif;';
    button.onclick=()=>{
      if(!dialog){
        dialog=document.createElement('dialog');dialog.id='video-play-log';dialog.setAttribute('aria-labelledby','video-play-log-title');
        dialog.style.cssText='width:min(680px,90vw);max-height:80dvh;box-sizing:border-box;overflow:auto;background:var(--paper);color:var(--ink);padding:20px;border:1px solid currentColor;';
        const title=document.createElement('h2');title.id='video-play-log-title';title.textContent='Záznam prehrávania videa';
        field=document.createElement('textarea');field.readOnly=true;field.setAttribute('aria-label','Diagnostický záznam na odoslanie');field.style.cssText='width:100%;height:45dvh;box-sizing:border-box;font:12px monospace;background:inherit;color:inherit;';
        const copy=document.createElement('button');copy.type='button';copy.textContent='Skopírovať záznam';
        const status=document.createElement('p');status.setAttribute('role','status');
        copy.onclick=async()=>{
          field.value=report();
          try{await navigator.clipboard.writeText(field.value);status.textContent='Záznam skopírovaný. Môžete ho vložiť do správy.';}
          catch{field.focus();field.select();status.textContent='Podržte označený text a zvoľte Kopírovať.';}
        };
        const close=document.createElement('button');close.type='button';close.textContent='Zavrieť';close.onclick=()=>dialog.close();
        dialog.append(title,field,copy,close,status);document.body.append(dialog);
        dialog.addEventListener('close',()=>button.focus({preventScroll:true}));
      }
      field.value=report();dialog.showModal();
    };
    document.body.append(button);
  }
  // Progress confirms playback; promise resolution alone does not.
  video.addEventListener('playing',()=>{try{if(current&&!current.playing)current.playing=snapshot();}catch{}});
  video.addEventListener('timeupdate',()=>{
    try{
      if(!current||current.advanced||video.paused||video.seeking)return;
      if(video.getAttribute('src')!==current.call.source)return;
      if(video.currentTime-current.call.currentTime>=.25)current.advanced=snapshot();
    }catch{}
  });
  return {
    begin({manual,origin}){
      try{
        const record={id:++serial,manual,origin,call:snapshot(),outcome:'pending'};
        current=record;records.push(record);if(records.length>12)records.shift();
        if(manual&&firstAutomaticRejection&&!manualComparison&&record.call.context?.city===firstAutomaticRejection.call.context?.city&&record.call.source===firstAutomaticRejection.call.source)manualComparison=record;
        return record;
      }catch{return null;}
    },
    result(record,error){
      try{
        if(!record||record.outcome!=='pending')return;
        // Preserve the original rejection and live state BEFORE the player handles it.
        record.settlement=snapshot();record.outcome=error?'rejected':'resolved';
        if(error)record.error={name:error.name,message:error.message,code:error.code,stack:error.stack};
        if(error?.name==='NotAllowedError'&&!record.manual&&!firstAutomaticRejection){
          firstAutomaticRejection=record;offerReport();
        }
      }catch{ /* Observability must never interrupt playback/error recovery. */ }
    },
  };
}
