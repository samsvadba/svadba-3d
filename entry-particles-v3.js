// Sample the approved inline vector and the real entry button once. One small
// canvas reuses these points for assembly and departure; it is idle in between.
export function createEntryParticles({ screen, canvas, content, logo, button, reducedMotion }) {
  const context = canvas.getContext('2d'), root = document.documentElement;
  let points = [], frame = 0, phase = 'preparing', started = 0, complete, revision = 0;
  let width = 0, height = 0, seed = 20270430, observer;
  const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
  const clamp = n => Math.max(0,Math.min(1,n));
  const setContent = value => screen.style.setProperty('--entry-content-opacity',value);
  function stop() { cancelAnimationFrame(frame); frame = 0; canvas.hidden = true; }
  function finish() {
    stop();
    if (phase === 'leaving') {
      observer?.disconnect();screen.style.opacity = '0';phase = 'done';complete?.();
    } else {
      phase = 'idle';setContent(1);root.dataset.entryEffect = 'ready';
    }
  }
  function draw(now) {
    frame = 0;
    const bounds = screen.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1,1.5);
    if (width !== bounds.width || height !== bounds.height) {
      width = bounds.width;height = bounds.height;
      canvas.width = Math.round(width*dpr);canvas.height = Math.round(height*dpr);
      context.setTransform(dpr,0,0,dpr,0,0);
    }
    const leaving = phase === 'leaving', p = clamp((now-started)/(leaving ? 1050 : 1700));
    const ease = leaving ? p*p*(3-2*p) : 1-Math.pow(1-p,3);
    const css = getComputedStyle(screen);
    context.clearRect(0,0,width,height);context.fillStyle = css.color;
    setContent(leaving ? 1-clamp(p/.22) : clamp((p-.72)/.28));
    if (leaving) screen.style.opacity = String(1-clamp((p-.58)/.42));
    const alpha = leaving ? clamp(p/.12)*(1-clamp((p-.72)/.28)) : 1-clamp((p-.78)/.22);
    for (const point of points) {
      const t = leaving ? 1-ease : ease;
      const cloudX = .5+Math.cos(point.angle+(1-t)*.3)*point.radius;
      const cloudY = .5+Math.sin(point.angle+(1-t)*.3)*point.radius;
      const x = (cloudX*(1-t)+point.x*t)*width, y = (cloudY*(1-t)+point.y*t)*height;
      context.globalAlpha = alpha*point.alpha;
      context.beginPath();context.arc(x,y,point.size,0,Math.PI*2);context.fill();
    }
    context.globalAlpha = 1;
    if (p >= 1) { finish();return; }
    frame = requestAnimationFrame(draw);
  }
  async function sample() {
    const request = ++revision;
    const svg = logo.querySelector('svg');if (!svg || !context) return;
    const bounds = screen.getBoundingClientRect(), logoRect = logo.getBoundingClientRect(), buttonRect = button.getBoundingClientRect();
    const raster = document.createElement('canvas'), ctx = raster.getContext('2d',{willReadFrequently:true});
    if (!ctx) return;
    raster.width = Math.ceil(bounds.width);raster.height = Math.ceil(bounds.height);
    const clone = svg.cloneNode(true);
    // The raster is only a sampling mask. The visible logo keeps its one SVG source.
    clone.setAttribute('width',logoRect.width);clone.setAttribute('height',logoRect.height);
    clone.setAttribute('fill','#fff');clone.setAttribute('color','#fff');
    clone.removeAttribute('class');clone.removeAttribute('style');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));
    const image = new Image();
    try {
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});
      if (request !== revision || phase === 'leaving' || phase === 'done') return;
      ctx.drawImage(image,logoRect.left-bounds.left,logoRect.top-bounds.top,logoRect.width,logoRect.height);
      const css = getComputedStyle(button), text = button.textContent.trim();
      ctx.strokeStyle = '#fff';ctx.lineWidth = 1.5;
      ctx.strokeRect(buttonRect.left-bounds.left+.75,buttonRect.top-bounds.top+.75,buttonRect.width-1.5,buttonRect.height-1.5);
      ctx.fillStyle = '#fff';ctx.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;ctx.textBaseline = 'middle';
      const spacing = parseFloat(css.letterSpacing)||0;
      const advances = [...text].map(char=>ctx.measureText(char).width+spacing);
      let x = buttonRect.left-bounds.left+(buttonRect.width-advances.reduce((sum,n)=>sum+n,0)+spacing)/2;
      [...text].forEach((char,i)=>{ctx.fillText(char,x,buttonRect.top-bounds.top+buttonRect.height/2);x+=advances[i];});
      const pixels = ctx.getImageData(0,0,raster.width,raster.height).data, samples = [];
      for (let y=0;y<raster.height;y+=2) for (let x=0;x<raster.width;x+=2) {
        if (pixels[(y*raster.width+x)*4+3]>48) samples.push({x:x/bounds.width,y:y/bounds.height});
      }
      // Cap fill cost on phones without changing the approved silhouette.
      const stride = Math.max(1,samples.length/5500);
      points = samples.filter((_,i)=>Math.floor(i/stride)!==Math.floor((i-1)/stride)).map(point=>({
        ...point,angle:random()*Math.PI*2,radius:.12+Math.sqrt(random())*.62,size:.45+random()*.5,alpha:.5+random()*.5,
      }));
    } finally { URL.revokeObjectURL(url); }
  }
  async function prepare() {
    try {
      await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,700))]);
      await sample();
      if (phase !== 'preparing') return;
      if (!points.length || reducedMotion.matches || root.dataset.entryEffect !== 'pending') { finish();return; }
      phase = 'arriving';root.dataset.entryEffect = 'animating';canvas.hidden = false;
      started = performance.now();draw(started);
    } catch { if (phase === 'preparing') finish(); }
  }
  if (!context || reducedMotion.matches) finish();else void prepare();
  observer = new ResizeObserver(()=>{if(phase === 'idle')void sample().catch(()=>{});});observer.observe(content);
  return {
    leave(onComplete) {
      if (phase === 'leaving' || phase === 'done') return;
      ++revision;stop();complete = onComplete;phase = 'leaving';root.dataset.entryEffect = 'animating';
      if (reducedMotion.matches) { finish();return; }
      canvas.hidden = false;started = performance.now();draw(started);
    },
  };
}
