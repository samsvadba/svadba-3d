// Standard derived delivery strips the film's audio. TV diagnostics can bypass
// this transform; original configured URLs remain authoritative and unchanged.
export function destinationVideoUrl(source) {
  const url = new URL(source);
  if (url.hostname !== 'res.cloudinary.com' || !url.pathname.includes('/video/upload/')) return source;
  url.pathname = url.pathname.replace('/video/upload/', '/video/upload/ac_none,vc_h264,f_mp4/').replace(/,f_auto(?=[,/]|$)/g, '');
  return url.href;
}

// Bound both an unresolved play() and a decoder/network stall. Only advancing
// media time counts as progress; canplay/playing/promise resolution do not.
export function createDestinationWatchdog(video, { onTimeout, onProgress = () => {}, isHidden = () => document.hidden, now = () => performance.now(), repeat = setInterval, cancel = clearInterval, startupMs = 15000, stallMs = 10000 } = {}) {
  let timer = null, lastAt = 0, lastTime = 0, advanced = 0, started = false, status = 'idle';
  const snapshot = () => ({ active:timer !== null, advanced, started, status });
  function stop() { if (timer !== null) cancel(timer);timer = null; }
  function tick() {
    if (timer === null) return;
    if (isHidden()) { lastAt = now();lastTime = video.currentTime || 0;return; }
    if (video.ended) { status = 'ended';stop();return; }
    const time = video.currentTime || 0, delta = time-lastTime;
    if (!video.paused && !video.seeking && delta > .02) {
      advanced += delta;started = true;lastAt = now();status = 'advancing';onProgress(snapshot());
    }
    lastTime = time;
    if (now()-lastAt >= (started ? stallMs : startupMs)) {
      status = started ? 'stalled' : 'startup-timeout';stop();onTimeout(snapshot());
    }
  }
  return {
    start() { stop();lastAt = now();lastTime = video.currentTime || 0;advanced = 0;started = false;status = 'waiting';timer = repeat(tick,500); },
    stop,
    visibility() { lastAt = now();lastTime = video.currentTime || 0; },
    snapshot,
  };
}

// Fetch bytes, not hidden playing/decoding video elements. Keep only three ahead
// plus the active film, with hard per-film and total memory limits.
export function createDestinationBuffer(locations, { fetcher = fetch, objectUrls = URL, enabled = true, maxFileBytes = 12 * 1024 * 1024, maxBytes = 48 * 1024 * 1024 } = {}) {
  const cache = new Map(), skipped = new Set();
  let wanted = [], pinned = null, pending = null, running = false, paused = false, bytes = 0;
  function evict(url) {
    const item = cache.get(url); if (!item) return;
    objectUrls.revokeObjectURL(item.url); bytes -= item.size; cache.delete(url);
  }
  async function download(url, signal) {
    const response = await fetcher(url, { signal, cache: 'force-cache', priority: 'low' });
    if (!response.ok) throw Error('Video unavailable');
    const length = Number(response.headers.get('content-length'));
    const type = response.headers.get('content-type') || '';
    if (length > maxFileBytes || !type.startsWith('video/')) { await response.body?.cancel(); return null; }
    if (!response.body?.getReader) return length > 0 ? response.blob() : null;
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > maxFileBytes) { await reader.cancel(); return null; }
        chunks.push(value);
      }
      return size ? new Blob(chunks, { type }) : null;
    } finally { reader.releaseLock(); }
  }
  async function pump() {
    if (running || paused || !enabled) return;
    running = true;
    try {
      let url;
      while (!paused && (url = wanted.find(value => !cache.has(value) && !skipped.has(value)))) {
        const controller = new AbortController(); pending = { url, controller };
        try {
          const blob = await download(url, controller.signal);
          if (!blob) { skipped.add(url); continue; }
          if (controller.signal.aborted || (!wanted.includes(url) && url !== pinned)) continue;
          if (blob.size > maxFileBytes || bytes + blob.size > maxBytes) { skipped.add(url); continue; }
          cache.set(url, { url: objectUrls.createObjectURL(blob), size: blob.size }); bytes += blob.size;
        } catch { if (!controller.signal.aborted) skipped.add(url); }
        finally { pending = null; }
      }
    } finally { running = false; }
  }
  return {
    sourceFor(location) { const url = destinationVideoUrl(location.fullscreenVideo); return cache.get(url)?.url || url; },
    plan(start, current = null) {
      pinned = current?.fullscreenVideo ? destinationVideoUrl(current.fullscreenVideo) : null;
      wanted = locations.slice(Math.max(0, start), Math.max(0, start) + 3).filter(item => item.fullscreenVideo).map(item => destinationVideoUrl(item.fullscreenVideo));
      for (const url of cache.keys()) if (url !== pinned && !wanted.includes(url)) evict(url);
      if (pending && pending.url !== pinned && !wanted.includes(pending.url)) pending.controller.abort();
      void pump();
    },
    pause(value) { paused = value; if (paused) pending?.controller.abort(); else void pump(); },
    clear() { wanted = []; pinned = null; pending?.controller.abort(); for (const url of cache.keys()) evict(url); },
  };
}

// A light canvas transition: a spatial cloud gathers across the full viewport and
// dissolves into playback. No new renderer, library or competing video decoder.
export function createDestinationParticles(canvas, { reducedMotion, getColor, getBackground }) {
  const context = canvas.getContext('2d');
  if (!context) return { start() {}, reveal() {}, stop() {}, visibility() {} };
  const points = []; let seed = 20270430;
  const random = () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 1100; i++) points.push({ x:random(), y:random(), z:random(), angle:random()*Math.PI*2, size:.35+random()*.8 });
  let active = false, frame = 0, started = 0, ready = 0, width = 0, height = 0;
  const reduced = () => reducedMotion.matches;
  function draw(now) {
    frame = 0; if (!active || document.hidden) return;
    const bounds = canvas.getBoundingClientRect();
    if (width !== bounds.width || height !== bounds.height) {
      width = bounds.width; height = bounds.height;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = width*dpr; canvas.height = height*dpr; context.setTransform(dpr,0,0,dpr,0,0);
    }
    const arrival = Math.min(1, Math.max(0, (now-started)/1100));
    const exit = ready ? Math.min(1, (now-ready)/850) : 0;
    const gather = ready ? 1-Math.pow(1-exit,3) : arrival*.78;
    context.clearRect(0,0,width,height);
    context.globalAlpha = 1-exit; context.fillStyle = getBackground(); context.fillRect(0,0,width,height);
    context.fillStyle = getColor();
    for (const p of points) {
      const angle = p.angle + (reduced() ? 0 : (now-started)*.00016*(1-gather));
      const radius = Math.sqrt(p.z)*.72;
      const x = width/2 + Math.cos(angle)*radius*width*(1-gather) + (p.x-.5)*width*gather;
      const y = height/2 + Math.sin(angle)*radius*height*(1-gather) + (p.y-.5)*height*gather;
      context.globalAlpha = (.22+p.z*.62)*(1-exit);
      context.beginPath(); context.arc(x,y,p.size*(.65+p.z*.5),0,Math.PI*2); context.fill();
    }
    context.globalAlpha = 1;
    if (exit >= 1) { stop(); return; }
    if (!reduced()) frame = requestAnimationFrame(draw);
  }
  function stop() { active = false; cancelAnimationFrame(frame); frame = 0; canvas.hidden = true; }
  return {
    start() { stop(); active = true; ready = 0; started = performance.now(); canvas.hidden = false; draw(started); },
    reveal() { if (!active || ready) return; if (reduced()) { stop(); return; } ready = performance.now(); if (!frame) frame = requestAnimationFrame(draw); },
    stop,
    visibility() { if (!active) return; if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else if (!frame) draw(performance.now()); },
  };
}
