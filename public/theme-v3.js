// Shared palette source and blocking first-paint bootstrap. No media/Three work.
(function(scope){
  'use strict';
  const palettes=Object.freeze([
    {id:'classic',sk:'Neutrálna',en:'Classic',dark:'#20221f',light:'#f5f4f0',darkInk:'#ece9df',lightInk:'#292a28'},
    {id:'olive',sk:'Olive & Ivory',en:'Olive & Ivory',dark:'#303D29',light:'#F4EBDC',darkInk:'#F4EBDC',lightInk:'#303D29'},
    {id:'purple',sk:'Fialová / ametystová',en:'Purple / amethyst',dark:'#5B247F',light:'#C8A2E9'},
  ].map(Object.freeze));
  const byId=Object.fromEntries(palettes.map(p=>[p.id,p]));
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const linear=hex=>rgb(hex).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const luminance=hex=>linear(hex).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const cache=new Map();
  function get(palette='classic',mode='dark'){
    const p=Object.hasOwn(byId,palette)?byId[palette]:byId.classic,night=mode!=='light',key=p.id+':'+(night?'dark':'light');
    if(cache.has(key))return cache.get(key);
    const colored=!['classic','olive'].includes(p.id),nonClassic=p.id!=='classic';
    const paper=night?p.dark:p.light,ink=colored?(night?p.light:p.dark):night?p.darkInk:p.lightInk;
    const muted=ink,line=nonClassic?ink:night?'#56594f':'#d5d3cc',accent=ink;
    const tokens={paper,ink,muted,accent,line,border:line,
      surface:nonClassic?paper:night?'#292c26':'#e8e6df',
      'bg-secondary':paper,'globe-line':ink,'globe-point':ink,
      connector:nonClassic?ink:night?'#c1c4b8':'#777a72','selected-border':nonClassic?ink:night?'#aeb3a2':'#8b8c84',
      'media-paper':nonClassic?paper:night?'#292c26':'#e8e6df',origin:colored?ink:night?'#c48b94':'#80434c','empty-ink':nonClassic?muted:'#77796f',
      'nav-track':nonClassic?line:'#8886','nav-border':nonClassic?line:'#888','video-ink':colored?p.light:p.id==='olive'?'#F4EBDC':'#FFFFFF',
      'video-backdrop':nonClassic?paper:'#24231f',
      'hover-paper':nonClassic?ink:'#ffffff18','hover-ink':nonClassic?paper:'inherit','embed-paper':nonClassic?paper:'#fff',
      'memory-shadow':nonClassic?'none':'0 16px 65px #26251d0b','video-caption-shadow':nonClassic?'none':'0 1px 14px #0004',
      'video-control-shadow':nonClassic?'none':'drop-shadow(0 1px 4px #0007)'};
    const result=Object.freeze({palette:p.id,mode:night?'dark':'light',colored,nonClassic,tokens:Object.freeze(tokens),
      colors:Object.freeze({paper:linear(paper),ink:linear(ink),line:linear(tokens['globe-line']),point:linear(tokens['globe-point'])})});
    cache.set(key,result);return result;
  }
  function restore(storage){try{return get(storage.getItem('sm-palette')||'classic',storage.getItem('sm-theme')||'dark');}catch{return get();}}
  function apply(root,palette,mode){
    const selected=get(palette,mode);root.dataset.palette=selected.palette;root.dataset.theme=root.dataset.mode=selected.mode;root.dataset.colored=String(selected.colored);
    for(const [name,value] of Object.entries(selected.tokens))root.style.setProperty('--'+name,value);return selected;
  }
  let initial=get();
  if(typeof document!=='undefined'){try{initial=restore(scope.localStorage);}catch{}apply(document.documentElement,initial.palette,initial.mode);}
  scope.SMWeddingTheme=Object.freeze({palettes,get,restore,apply,initial,contrast});
})(globalThis);
