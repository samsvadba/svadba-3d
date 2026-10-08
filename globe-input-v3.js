// Share pointer input between the globe and its projected labels. OrbitControls
// owns capture/rotation/zoom; this layer only distinguishes a tap from a gesture.
export function bindGlobeInput(surface, { canInteract, onInteract, canTap, onTap }) {
  const pointers = new Set();
  let candidate = null, suppressClick = false;
  const moved = event => {
    if (candidate?.id === event.pointerId &&
        Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) > 6) candidate = null;
  };
  surface.addEventListener('pointerdown', event => {
    if (!canInteract()) { suppressClick = false; candidate = null; return; }
    const eligible = canTap();
    suppressClick = true;
    onInteract();
    pointers.add(event.pointerId);
    candidate = pointers.size === 1 && event.isPrimary && event.button === 0 && eligible
      ? { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp,
          target: event.target.closest('.city-label,.origin-marker') }
      : null;
  }, true);
  surface.addEventListener('pointermove', moved, true);
  surface.addEventListener('pointerup', event => {
    moved(event);
    const tap = candidate;
    candidate = null;
    pointers.delete(event.pointerId);
    if (tap?.id !== event.pointerId || pointers.size || event.timeStamp - tap.time > 650) return;
    // Let OrbitControls release capture before a destination flight takes over.
    queueMicrotask(() => { if (canTap()) onTap(tap.target, event.clientX, event.clientY); });
  }, true);
  const cancel = event => {
    if (!pointers.delete(event.pointerId)) return;
    candidate = null;
  };
  surface.addEventListener('pointercancel', cancel, true);
  surface.addEventListener('lostpointercapture', cancel, true);
  surface.addEventListener('click', event => {
    // Explicit qualified taps below replace retargeted pointer clicks. Keyboard
    // and assistive-technology activation (detail=0) keep their native behavior.
    if (event.detail && suppressClick) {
      event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false;
    }
  }, true);
  surface.addEventListener('wheel', () => {
    if (canInteract()) { candidate = null; onInteract(); }
  }, { capture: true, passive: true });
}
