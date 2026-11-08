import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAntiCheat } from './useAntiCheat.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

let hidden = false;
let fsActive = true;
const switchTab = () => {
  act(() => {
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    hidden = false;
  });
};
const exitFullscreen = () => {
  act(() => {
    fsActive = false;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
};

describe('useAntiCheat', () => {
  beforeEach(() => {
    hidden = false;
    fsActive = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => (fsActive ? document.documentElement : null),
    });
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue();
    useAntiCheatStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    delete document.hidden;
    delete document.fullscreenElement;
    delete document.documentElement.requestFullscreen;
  });

  it('warns on the 2nd tab switch and auto-submits once at the 5th', () => {
    const onAutoSubmit = vi.fn();
    const { result } = renderHook(() => useAntiCheat({ onAutoSubmit }));

    switchTab();
    expect(result.current.showWarning).toBe(false);
    switchTab();
    expect(result.current.showWarning).toBe(true);
    switchTab();
    switchTab();
    expect(onAutoSubmit).not.toHaveBeenCalled();
    switchTab();
    switchTab(); // beyond the threshold must not re-fire
    expect(onAutoSubmit).toHaveBeenCalledTimes(1);
    expect(useAntiCheatStore.getState().tabSwitchCount).toBe(6);
  });

  it('counts exactly 5 switches at the moment of auto-submit', () => {
    const onAutoSubmit = vi.fn(() => {
      expect(useAntiCheatStore.getState().tabSwitchCount).toBe(5);
    });
    renderHook(() => useAntiCheat({ onAutoSubmit }));
    for (let i = 0; i < 5; i++) switchTab();
    expect(onAutoSubmit).toHaveBeenCalledTimes(1);
  });

  it('auto-submits once on the 3rd fullscreen exit', () => {
    const onAutoSubmit = vi.fn();
    renderHook(() => useAntiCheat({ onAutoSubmit }));
    exitFullscreen();
    exitFullscreen();
    expect(onAutoSubmit).not.toHaveBeenCalled();
    exitFullscreen();
    exitFullscreen();
    expect(onAutoSubmit).toHaveBeenCalledTimes(1);
    expect(useAntiCheatStore.getState().fullscreenExitCount).toBe(4);
  });

  it('logs fullscreen_unsupported once and does not count exits when the API is absent', () => {
    delete document.documentElement.requestFullscreen;
    const onAutoSubmit = vi.fn();
    renderHook(() => useAntiCheat({ onAutoSubmit }));
    exitFullscreen();
    exitFullscreen();
    const st = useAntiCheatStore.getState();
    expect(st.fullscreenExitCount).toBe(0);
    expect(st.securityEvents.filter((e) => e.type === 'fullscreen_unsupported')).toHaveLength(1);
    expect(onAutoSubmit).not.toHaveBeenCalled();
  });

  it('calls the callback from the latest render', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useAntiCheat({ onAutoSubmit: cb }), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });
    for (let i = 0; i < 5; i++) switchTab();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('logs and counts cut and paste attempts', () => {
    renderHook(() => useAntiCheat({ onAutoSubmit: vi.fn() }));
    act(() => {
      document.dispatchEvent(new Event('cut', { cancelable: true }));
      document.dispatchEvent(new Event('paste', { cancelable: true }));
    });
    const s = useAntiCheatStore.getState();
    expect(s.copyAttemptCount).toBe(2);
    const types = s.securityEvents.map((e) => e.type);
    expect(types).toContain('cut_attempt');
    expect(types).toContain('paste_attempt');
  });

  it('prompts to return to fullscreen on mount without counting an exit', () => {
    fsActive = false;
    const { result } = renderHook(() => useAntiCheat({ onAutoSubmit: vi.fn() }));
    expect(result.current.showWarning).toBe(true);
    expect(result.current.fullscreenExitCount).toBe(0);
    expect(useAntiCheatStore.getState().securityEvents).toHaveLength(0);
  });

  it('shows no mount prompt when fullscreen is active or unsupported', () => {
    const a = renderHook(() => useAntiCheat({ onAutoSubmit: vi.fn() }));
    expect(a.result.current.showWarning).toBe(false);
    a.unmount();
    fsActive = false;
    delete document.documentElement.requestFullscreen;
    const b = renderHook(() => useAntiCheat({ onAutoSubmit: vi.fn() }));
    expect(b.result.current.showWarning).toBe(false);
  });

  it('ignores visibilitychange after pagehide but counts a normal hide', () => {
    renderHook(() => useAntiCheat({ onAutoSubmit: vi.fn() }));
    switchTab();
    expect(useAntiCheatStore.getState().tabSwitchCount).toBe(1);
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    switchTab();
    expect(useAntiCheatStore.getState().tabSwitchCount).toBe(1);
  });

  it('counts tab switches again after pagehide then pageshow', () => {
    renderHook(() => useAntiCheat({ onAutoSubmit: vi.fn() }));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
      window.dispatchEvent(new Event('pageshow'));
    });
    switchTab();
    expect(useAntiCheatStore.getState().tabSwitchCount).toBe(1);
  });

  it('a cancelled beforeunload does not disable tab-switch detection', () => {
    renderHook(() => useAntiCheat({ onAutoSubmit: vi.fn() }));
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    switchTab();
    expect(useAntiCheatStore.getState().tabSwitchCount).toBe(1);
  });

  it('adds page-lifecycle listeners on mount and removes them on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useAntiCheat({ onAutoSubmit: vi.fn() }));
    for (const t of ['pagehide', 'pageshow']) {
      expect(add.mock.calls.some((c) => c[0] === t)).toBe(true);
    }
    unmount();
    for (const t of ['pagehide', 'pageshow']) {
      const added = add.mock.calls.find((c) => c[0] === t)[1];
      expect(remove.mock.calls.some((c) => c[0] === t && c[1] === added)).toBe(true);
    }
    add.mockRestore();
    remove.mockRestore();
  });
});
