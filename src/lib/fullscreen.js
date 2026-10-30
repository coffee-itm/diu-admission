// Fullscreen helpers (standard + webkit-prefixed). iOS Safari has no Fullscreen API.
// enterFullscreen() must be called synchronously from a user gesture (click).

export function isFullscreenSupported() {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement;
  return typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
}

export function isFullscreenActive() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

// Never throws; resolves true if the request was issued and accepted.
export function enterFullscreen() {
  try {
    const el = document.documentElement;
    if (typeof el.requestFullscreen === 'function') {
      return Promise.resolve(el.requestFullscreen()).then(() => true, () => false);
    }
    if (typeof el.webkitRequestFullscreen === 'function') {
      return Promise.resolve(el.webkitRequestFullscreen()).then(() => true, () => false);
    }
  } catch {
    // fall through
  }
  return Promise.resolve(false);
}
