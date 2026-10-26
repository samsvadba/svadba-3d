const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

/** One timeline is shared by automatic playback and manual seeking. */
export function createPlayback({ gsap, duration = 40, onProgress = () => {}, onMode = () => {}, onFinish = () => {} }) {
  const clock = { value: 0 };
  let mode = 'manual', suspended = false, resumeAuto = false, completed = false, disposed = false;
  const changeMode = next => {
    if (mode !== next) { mode = next; onMode(next); }
  };
  const publish = () => {
    clock.value = clamp(clock.value);
    if (clock.value < 1) completed = false;
    onProgress(clock.value);
  };
  const complete = () => {
    if (disposed) return;
    timeline.pause();
    resumeAuto = false;
    changeMode('complete');
    if (!completed) { completed = true; onFinish(); }
  };
  const timeline = gsap.timeline({ paused: true, onUpdate: publish, onComplete: complete });
  timeline.to(clock, { value: 1, duration: Math.max(0.01, Number(duration) || 40), ease: 'none' });

  function position(value) {
    timeline.pause().progress(clamp(value), true);
    // GSAP's suppressed callbacks let mode and progress be published together.
    clock.value = clamp(value);
    completed = clock.value < 1 ? false : completed;
  }
  function play() {
    if (disposed || clock.value >= 1) return api;
    changeMode('auto');
    if (suspended) resumeAuto = true;
    else timeline.play();
    return api;
  }
  function pause() {
    if (disposed) return api;
    timeline.pause(); resumeAuto = false;
    changeMode(clock.value >= 1 ? 'complete' : 'manual');
    return api;
  }
  function seek(value) {
    if (disposed) return api;
    resumeAuto = false; position(value);
    changeMode(clock.value >= 1 ? 'complete' : 'manual');
    publish();
    if (clock.value >= 1) complete();
    return api;
  }
  function start({ from = 0 } = {}) {
    if (disposed) return api;
    resumeAuto = false; position(from);
    changeMode(clock.value >= 1 ? 'complete' : 'auto');
    publish();
    if (clock.value >= 1) complete();
    else if (suspended) resumeAuto = true;
    else timeline.play();
    return api;
  }
  const api = {
    start, play, pause, seek,
    restart: () => start({ from: 0 }),
    finish: () => seek(1),
    suspend() {
      if (disposed) return false;
      if (!suspended) { resumeAuto = mode === 'auto'; suspended = true; }
      timeline.pause();
      return resumeAuto;
    },
    resume() {
      if (disposed || !suspended) return api;
      const shouldPlay = resumeAuto && mode === 'auto' && clock.value < 1;
      suspended = false; resumeAuto = false;
      if (shouldPlay) timeline.play();
      return api;
    },
    dispose() {
      disposed = true; suspended = false; resumeAuto = false; timeline.kill();
    },
    get progress() { return clamp(clock.value); },
    get mode() { return mode; },
    get timeline() { return timeline; },
  };
  return api;
}
