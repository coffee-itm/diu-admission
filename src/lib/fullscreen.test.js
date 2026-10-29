import { describe, it, expect, vi, afterEach } from 'vitest';
import { isFullscreenSupported, enterFullscreen } from './fullscreen.js';

const el = document.documentElement;

afterEach(() => {
  delete el.requestFullscreen;
  delete el.webkitRequestFullscreen;
});

describe('fullscreen helpers', () => {
  it('uses the standard API when available', async () => {
    el.requestFullscreen = vi.fn().mockResolvedValue();
    expect(isFullscreenSupported()).toBe(true);
    await expect(enterFullscreen()).resolves.toBe(true);
    expect(el.requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it('falls back to the webkit-prefixed API', async () => {
    el.webkitRequestFullscreen = vi.fn();
    expect(isFullscreenSupported()).toBe(true);
    await expect(enterFullscreen()).resolves.toBe(true);
    expect(el.webkitRequestFullscreen).toHaveBeenCalledTimes(1);
  });

  it('resolves false without throwing when unsupported', async () => {
    expect(isFullscreenSupported()).toBe(false);
    await expect(enterFullscreen()).resolves.toBe(false);
  });

  it('resolves false when the request is rejected or throws', async () => {
    el.requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
    await expect(enterFullscreen()).resolves.toBe(false);
    el.requestFullscreen = vi.fn(() => { throw new Error('boom'); });
    await expect(enterFullscreen()).resolves.toBe(false);
  });
});
