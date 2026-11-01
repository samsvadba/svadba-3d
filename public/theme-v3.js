// Shared palette source and blocking first-paint bootstrap. No media/Three work.
(function(scope){
  'use strict';
  const palettes=Object.freeze([
    {id:'classic',sk:'Neutrálna',en:'Classic',dark:'#20221f',light:'#f5f4f0',darkInk:'#ece9df',lightInk:'#292a28'},
    {id:'olive',sk:'Olive & Ivory',en:'Olive & Ivory',dark:'#303D29',light:'#F4EBDC',darkInk:'#F4EBDC',lightInk:'#303D29'},
    {id:'red',sk:'Červená',en:'Red',dark:'#9D2742',deeper:'#5E182E',light:'#FFE0E7',secondary:'#FFF0F3',accent:'#FF7B92'},
    {id:'orange',sk:'Oranžová',en:'Orange',dark:'#9B411B',deeper:'#672813',light:'#FFE4D2',secondary:'#FFF2E7',accent:'#FF9D60'},
    {id:'yellow',sk:'Žltá / zlatá',en:'Yellow / gold',dark:'#8A6010',deeper:'#5E420A',light:'#FFF0B8',secondary:'#FFF8DC',accent:'#FFCE55'},
    {id:'green',sk:'Zelená / smaragdová',en:'Green / emerald',dark:'#0D7051',deeper:'#074734',light:'#D9F7E6',secondary:'#F0FFF5',accent:'#61E3A4'},
    {id:'turquoise',sk:'Tyrkysová',en:'Turquoise',dark:'#0A7385',deeper:'#074653',light:'#DDF7FA',secondary:'#F0FCFE',accent:'#62E0E9'},
    {id:'blue',sk:'Modrá',en:'Blue',dark:'#2454A3',deeper:'#15366D',light:'#DEEAFE',secondary:'#F0F6FF',accent:'#83B6FF'},
    {id:'indigo',sk:'Indigo',en:'Indigo',dark:'#413C99',deeper:'#28245F',light:'#E6E3FF',secondary:'#F3F1FF',accent:'#A49BFF'},
    {id:'purple',sk:'Fialová',en:'Purple',dark:'#451F61',deeper:'#321949',light:'#F1D9F8',secondary:'#F6E8FC',accent:'#A846D9'},
  ].map(Object.freeze));
  const byId=Object.fromEntries(palettes.map(p=>[p.id,p]));
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const linear=hex=>rgb(hex).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const luminance=hex=>linear(hex).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const mix=(fg,bg,a)=>'#'+rgb(fg).map((v,i)=>Math.round((v*a+rgb(bg)[i]*(1-a))*255).toString(16).padStart(2,'0')).join('');
  const cache=new Map();
  function get(palette='classic',mode='dark'){
    const p=Object.hasOwn(byId,palette)?byId[palette]:byId.classic,night=mode!=='light',key=p.id+':'+(night?'dark':'light');
    if(cache.has(key))return cache.get(key);
    const colored=!['classic','olive'].includes(p.id),nonClassic=p.id!=='classic';
    const paper=night?p.dark:p.light,ink=night?(p.darkInk||'#FFFFFF'):(p.lightInk||p.deeper);
    const muted=colored?mix(ink,paper,.9):ink,line=colored?mix(ink,paper,.78):nonClassic?ink:night?'#56594f':'#d5d3cc';
    const accent=colored?(night?p.accent:p.dark):ink;let point=accent;
    for(let amount=0;contrast(point,paper)<3&&amount<1;amount+=.05)point=mix(ink,accent,amount);
    const tokens={paper,ink,muted,accent,line,border:line,
      surface:colored?(night?p.deeper:p.secondary):nonClassic?paper:night?'#292c26':'#e8e6df',
      'bg-secondary':colored?(night?p.deeper:p.secondary):paper,'globe-line':ink,'globe-point':nonClassic?point:ink,
      connector:nonClassic?ink:night?'#c1c4b8':'#777a72','selected-border':nonClassic?ink:night?'#aeb3a2':'#8b8c84',
      'media-paper':nonClassic?paper:night?'#292c26':'#e8e6df',origin:night?'#c48b94':'#80434c','empty-ink':nonClassic?muted:'#77796f',
      'nav-track':nonClassic?line:'#8886','nav-border':nonClassic?line:'#888','video-ink':p.id==='olive'?'#F4EBDC':'#FFFFFF',
      'video-backdrop':nonClassic?paper:'#24231f',
      'hover-paper':nonClassic?ink:'#ffffff18','hover-ink':nonClassic?paper:'inherit','embed-paper':nonClassic?paper:'#fff',
      'memory-shadow':nonClassic?'none':'0 16px 65px #26251d0b','video-caption-shadow':p.id==='olive'?'none':'0 1px 14px #0004',
      'video-control-shadow':p.id==='olive'?'none':'drop-shadow(0 1px 4px #0007)'};
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
