import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAntiCheat } from './useAntiCheat.js';
import { useAntiCheatStore } from '../../store/antiCheatStore.js';

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

let hidden = false;
const switchTab = () => {
  act(() => {
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    hidden = false;
  });
};
const exitFullscreen = () => {
  act(() => {
    document.dispatchEvent(new Event('fullscreenchange'));
  });
};

describe('useAntiCheat', () => {
  beforeEach(() => {
    hidden = false;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => null });
    useAntiCheatStore.getState().reset();
  });

  afterEach(() => {
    cleanup();
    delete document.hidden;
    delete document.fullscreenElement;
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
});
