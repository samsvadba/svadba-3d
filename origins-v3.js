// Origin markers are independent of destinations, progress and the Story sequence.
export function createOrigins(root, origins, {THREE,gsap,reducedMotion,radius}) {
  const layer=document.createElement('div');layer.className='origin-layer';
  const lines=document.createElementNS('http://www.w3.org/2000/svg','svg');lines.classList.add('origin-leaders');layer.append(lines);
  const point=new THREE.Vector3(),normal=new THREE.Vector3(),direction=new THREE.Vector3(),projected=new THREE.Vector3();
  const moment={value:0};let timeline;
  const items=origins.map((origin,i)=>{
    const phi=(90-origin.lat)*Math.PI/180,theta=(origin.lon+180)*Math.PI/180;
    const position=new THREE.Vector3(-radius*Math.sin(phi)*Math.cos(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.sin(theta));
    const button=document.createElement('button');button.type='button';button.className='origin-marker';button.tabIndex=-1;
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20S3 14.5 3 8.5C3 3.8 9 2.8 12 7c3-4.2 9-3.2 9 1.5C21 14.5 12 20 12 20Z"/></svg><span class="origin-tooltip"><strong></strong><span></span></span>';
    button.querySelector('strong').textContent=origin.name;button.querySelector('.origin-tooltip>span').textContent=origin.person;
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',event=>{event.stopPropagation();const open=button.getAttribute('aria-expanded')!=='true';items.forEach(item=>item.button.setAttribute('aria-expanded','false'));button.setAttribute('aria-expanded',String(open));});
    button.addEventListener('keydown',event=>{if(event.key==='Escape'){button.setAttribute('aria-expanded','false');button.blur();}});
    const line=document.createElementNS(lines.namespaceURI,'line');lines.append(line);layer.append(button);
    return {origin,position,button,line,side:i===0?1:-1};
  });
  root.append(layer);
  document.addEventListener('pointerdown',event=>{if(!layer.contains(event.target))items.forEach(item=>item.button.setAttribute('aria-expanded','false'));},{passive:true});
  return {
    refreshLanguage(label){items.forEach(({origin,button})=>button.setAttribute('aria-label',`${origin.name} — ${origin.person}. ${label}`));},
    pulse(delay=0){timeline?.kill();moment.value=0;if(reducedMotion.matches)return;timeline=gsap.timeline().to(moment,{value:1,duration:.28,delay,ease:'sine.inOut'}).to(moment,{value:0,duration:.65,ease:'sine.inOut'});},
    reset(){timeline?.kill();moment.value=0;layer.style.visibility='hidden';},
    get highlight(){return moment.value;},
    update(camera,group,width,height,overview,interactive){
      const reveal=Math.max(overview,moment.value*.8);
      layer.style.visibility=reveal>.005?'visible':'hidden';
      lines.setAttribute('viewBox',`0 0 ${width} ${height}`);
      for(const item of items){
        point.copy(item.position);group.localToWorld(point);normal.copy(point).normalize();direction.copy(camera.position).sub(point).normalize();
        projected.copy(point).project(camera);
        const facing=normal.dot(direction),shown=facing>.025&&Math.abs(projected.x)<.94&&Math.abs(projected.y)<.88&&projected.z<1&&reveal>.005;
        const alpha=shown?reveal*Math.min(1,(facing-.025)/.12):0;
        const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2;
        // Nearby home towns share a small globe area: short leaders preserve the
        // true geographic anchors while keeping two separate 44px touch targets.
        const bx=x+item.side*25,by=y-20;
        item.button.style.transform=`translate3d(${bx-22}px,${by-22}px,0)`;
        item.button.style.opacity=alpha;item.button.style.visibility=shown?'visible':'hidden';
        item.button.style.setProperty('--origin-pulse',1+moment.value*.12);
        item.button.style.pointerEvents=shown&&interactive?'auto':'none';item.button.tabIndex=shown&&interactive?0:-1;
        item.button.setAttribute('aria-hidden',String(!shown));
        if(!shown)item.button.setAttribute('aria-expanded','false');
        item.line.setAttribute('x1',x);item.line.setAttribute('y1',y);item.line.setAttribute('x2',bx);item.line.setAttribute('y2',by);
        item.line.style.opacity=alpha*.28;
      }
    }
  };
}
