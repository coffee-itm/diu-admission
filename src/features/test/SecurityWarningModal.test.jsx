import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SecurityWarningModal } from './SecurityWarningModal.jsx';

describe('SecurityWarningModal', () => {
  beforeEach(() => {
    document.documentElement.requestFullscreen = vi.fn();
  });
  afterEach(() => {
    cleanup();
    delete document.documentElement.requestFullscreen;
  });

  const renderModal = (isFullscreen) =>
    render(
      <SecurityWarningModal isOpen message="m" onDismiss={() => {}} onReturnToFullscreen={() => {}} isFullscreen={isFullscreen} />
    );

  it('shows the return button when not in fullscreen', () => {
    renderModal(false);
    expect(document.getElementById('security-return-fullscreen')).not.toBeNull();
  });

  it('hides the return button while fullscreen is active', () => {
    renderModal(true);
    expect(screen.queryByText('Return to fullscreen')).toBeNull();
  });
});
