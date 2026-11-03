// The picker stays inside the existing utility bar, including in the gallery.
export function createThemePicker({trigger,container,palettes,getSelection,onSelect,getLanguage,getLabel,reducedMotion}){
  const panel=document.createElement('div');panel.id='theme-picker';panel.className='theme-picker';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',panel.id);trigger.setAttribute('aria-expanded','false');
  let opened=false,hideTimer;
  const buttons=palettes.map(p=>{
    const button=document.createElement('button');button.type='button';button.className='theme-swatch';button.dataset.palette=p.id;
    const circle=document.createElement('span');circle.setAttribute('aria-hidden','true');circle.style.setProperty('--swatch',p.dark);button.append(circle);
    button.addEventListener('click',()=>{onSelect(p.id);close(true);});panel.append(button);return button;
  });container.append(panel);
  function refresh(){
    const selected=getSelection(),language=getLanguage()==='en'?'en':'sk',label=getLabel();
    trigger.setAttribute('aria-label',label);trigger.title=label;panel.setAttribute('aria-label',label);
    buttons.forEach((b,i)=>{const p=palettes[i];b.setAttribute('aria-label',p[language]);b.title=p[language];b.setAttribute('aria-pressed',String(selected===p.id));b.tabIndex=selected===p.id?0:-1;});
  }
  function close(focus=false){
    if(!opened)return;opened=false;panel.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');clearTimeout(hideTimer);
    if(reducedMotion.matches)panel.hidden=true;else hideTimer=setTimeout(()=>{panel.hidden=true;},180);
    if(focus)trigger.focus({preventScroll:true});
  }
  function open(){
    clearTimeout(hideTimer);refresh();opened=true;panel.hidden=false;
    const bar=container.getBoundingClientRect(),nav=document.getElementById('bottom-nav')?.getBoundingClientRect();
    panel.style.setProperty('bottom',Math.max(bar.height+12,nav&&nav.height?bar.bottom-nav.top+12:0)+'px');
    panel.classList.add('is-open');trigger.setAttribute('aria-expanded','true');(buttons.find(b=>b.tabIndex===0)||buttons[0]).focus({preventScroll:true});
  }
  trigger.addEventListener('click',()=>opened?close(true):open());
  panel.addEventListener('keydown',event=>{
    const i=buttons.indexOf(document.activeElement),columns=Math.min(3,buttons.length);let next;
    if(event.key==='ArrowRight')next=(i+1)%buttons.length;
    else if(event.key==='ArrowLeft')next=(i+buttons.length-1)%buttons.length;
    else if(event.key==='ArrowDown')next=(i+columns)%buttons.length;
    else if(event.key==='ArrowUp')next=(i+buttons.length-columns)%buttons.length;
    else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;
    else if(event.key==='Tab'){close();return;}
    if(next!==undefined){event.preventDefault();event.stopPropagation();buttons.forEach((b,j)=>b.tabIndex=j===next?0:-1);buttons[next].focus();}
  });
  document.addEventListener('keydown',event=>{if(opened&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}},true);
  document.addEventListener('pointerdown',event=>{if(opened&&!panel.contains(event.target)&&!trigger.contains(event.target))close();},{capture:true,passive:true});
  new MutationObserver(()=>{if(opened&&(container.inert||container.hidden))close();}).observe(container,{attributes:true,attributeFilter:['inert','hidden']});
  refresh();return {refresh,close};
}
