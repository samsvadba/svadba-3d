// Opt-in, temporary TV diagnostics, using the production video element/player.
// No source probes, prefetches, automatic variant switches or external service.
export function createTVVideoDiagnostics({ enabled, scene, video, onVariant, onDirectPlay, onBack, onSound, readMusic, readWatchdog }) {
  if (!enabled) return { open() {}, close() {}, attempt() {}, playResult() {}, timeout() {}, variant() {}, focusRetry() {} };
  const panel = document.createElement('section');panel.id = 'tv-video-diagnostics';
  panel.setAttribute('aria-label','TV video diagnostika');
  panel.innerHTML = '<h2>TV TEST VIDEA</h2><p data-tv="variant"></p><pre data-tv="report" aria-live="off"></pre><div class="tv-test-actions"><button type="button" data-tv="one">1 · AKTUÁLNA HTTPS</button><button type="button" data-tv="two">2 · PÔVODNÁ HTTPS</button><button type="button" data-tv="three">3 · PREHRAŤ KLIKNUTÍM</button><button type="button" data-tv="retry">ZOPAKOVAŤ TEST</button><button type="button" data-tv="sound">HUDBA</button><button type="button" data-tv="back">SPÄŤ DO CESTY</button></div><p class="tv-test-help">Bez blob cache a prednačítavania. Testy 1 a 2 majú rovnaký automatický štart po 6 s, bez kliknutia na prehratie. Ak po 15 s nehrá 1, skúste 2; ak nehrá ani 2, stlačte 3. Na fotografii musí byť vidieť currentTime.</p>';
  scene.append(panel);
  const el = key => panel.querySelector(`[data-tv="${key}"]`);
  let current = 1, timer, play = 'nezavolané', activation = '—', result = '', title = '', source = '';
  const labels = {1:'1 / AKTUÁLNA HTTPS · automaticky · ac_none,vc_h264,f_mp4',2:'2 / PÔVODNÁ HTTPS · automaticky · loc.fullscreenVideo',3:'3 / PÔVODNÁ HTTPS · play() priamo z kliknutia'};
  const number = value => Number.isFinite(value) ? value.toFixed(2) : '—';
  function render() {
    const watch = readWatchdog(), music = readMusic();
    let frames = 'n/a';
    try { frames = video.getVideoPlaybackQuality?.().totalVideoFrames ?? video.webkitDecodedFrameCount ?? 'n/a'; } catch { /* Optional TV API must never interrupt play(). */ }
    el('variant').textContent = `${title} — ${labels[current]}`;
    el('report').textContent = [
      `play(): ${play}    userActivation pri play(): ${activation}`, `MediaError.code: ${video.error?.code || 0} ${video.error?.message || ''}`,
      `readyState: ${video.readyState}    networkState: ${video.networkState}`,
      `currentTime: ${number(video.currentTime)} s    paused: ${video.paused}    ended: ${video.ended}`,
      `Postup videa: ${number(watch.advanced)} s    decoded frames: ${frames}`,
      `Stav: ${result || (watch.advanced >= .75 ? 'VIDEO POSTUPOVALO — overte aj pohyb obrazu' : 'ČAKÁ SA NA SKUTOČNÝ POSTUP VIDEA')}`,
      `Hudba: ${music.enabled ? 'ZAPNUTÁ' : 'VYPNUTÁ'} / ${music.paused ? 'paused' : 'hrá'} / ${number(music.time)} s / error ${music.error || 0}`,
      `Zdroj: ${source}`,
    ].join('\n');
    el('one').disabled = current === 1;el('two').disabled = current === 2;
    el('three').disabled = current === 1;
    el('sound').textContent = music.enabled ? 'VYPNÚŤ HUDBU' : 'ZAPNÚŤ HUDBU';
  }
  panel.addEventListener('click',event=>event.stopPropagation());
  el('one').onclick = () => onVariant(1);
  el('two').onclick = () => onVariant(2);
  // No timeout, promise, animation or load wait before the actual play call.
  el('three').onclick = () => { onDirectPlay();render(); };
  el('retry').onclick = () => current === 3 ? onDirectPlay() : onVariant(current);
  el('sound').onclick = () => { onSound();render(); };
  el('back').onclick = onBack;
  return {
    open(location, url) { title = location.key;source = url;clearInterval(timer);render();timer = setInterval(render,500); },
    close() { clearInterval(timer); },
    attempt() { play = 'pending';activation = navigator.userActivation?.isActive ?? 'n/a';result = '';render(); },
    playResult(error) { play = error ? `${error.name || 'Error'}: ${error.message || error}` : 'resolved (samotné resolved nepotvrdzuje prehrávanie)';render(); },
    timeout(state) { result = state.status === 'stalled' ? 'ZASEKNUTÉ — 10 s bez postupu; prekryv ukončený' : 'ČASOVÝ LIMIT 15 s — prekryv ukončený';render(); },
    variant(value) { current = value;play = 'nezavolané';activation = '—';result = ''; },
    focusRetry() { el('retry').focus({preventScroll:true}); },
  };
}
