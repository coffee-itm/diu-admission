import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExamConfigPage } from './ExamConfigPage.jsx';
import { useExamConfigStore } from '../../store/examConfigStore.js';
import { mockExamConfig } from '../../data/mockExamConfig.js';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

// The page inputs have no ids yet (T-031), so reach them through their label.
const fieldInput = (label) => screen.getByText(label).parentElement.querySelector('input');

const save = () => fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

describe('ExamConfigPage validation', () => {
  beforeEach(() => {
    localStorage.clear();
    useExamConfigStore.setState({ config: structuredClone(mockExamConfig) });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['0', '-5', '', '2.5'])('rejects a duration of %s without saving', (typed) => {
    render(<ExamConfigPage />);
    fireEvent.change(fieldInput('Total Duration (Minutes)'), { target: { value: typed } });
    save();

    expect(screen.getByText(/duration/i, { selector: 'p' })).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
    expect(useExamConfigStore.getState().config.totalTimeMinutes).toBe(mockExamConfig.totalTimeMinutes);
  });

  it.each([
    ['Overall Minimum % (ELIGIBLE)', '-1'],
    ['Overall Minimum % (ELIGIBLE)', '101'],
    ['Per-Section Minimum %', '-1'],
    ['Per-Section Minimum %', '101'],
  ])('rejects %s of %s without saving', (label, typed) => {
    render(<ExamConfigPage />);
    fireEvent.change(fieldInput(label), { target: { value: typed } });
    save();

    expect(screen.getByText(/percentage/i, { selector: 'p' })).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
    expect(useExamConfigStore.getState().config.passingThresholds).toEqual(
      mockExamConfig.passingThresholds
    );
  });

  it('saves valid values', () => {
    vi.useFakeTimers();
    render(<ExamConfigPage />);
    fireEvent.change(fieldInput('Total Duration (Minutes)'), { target: { value: '60' } });
    fireEvent.change(fieldInput('Overall Minimum % (ELIGIBLE)'), { target: { value: '50' } });
    fireEvent.change(fieldInput('Per-Section Minimum %'), { target: { value: '40' } });
    save();

    act(() => vi.advanceTimersByTime(600));

    const config = useExamConfigStore.getState().config;
    expect(config.totalTimeMinutes).toBe(60);
    expect(config.passingThresholds).toEqual({ ...mockExamConfig.passingThresholds, overallMinPercent: 50, sectionMinPercent: 40 });
    expect(toast.success).toHaveBeenCalled();
    expect(screen.queryByText(/duration/i, { selector: 'p' })).not.toBeInTheDocument();
  });

  it('clears the error once the field is edited', () => {
    render(<ExamConfigPage />);
    fireEvent.change(fieldInput('Total Duration (Minutes)'), { target: { value: '0' } });
    save();
    expect(screen.getByText(/duration/i, { selector: 'p' })).toBeInTheDocument();

    fireEvent.change(fieldInput('Total Duration (Minutes)'), { target: { value: '90' } });
    expect(screen.queryByText(/duration/i, { selector: 'p' })).not.toBeInTheDocument();
  });

  it('ignores a section question count below 1', () => {
    render(<ExamConfigPage />);
    const countInput = screen.getAllByLabelText(/question count/i)[0];
    const original = useExamConfigStore.getState().config.sections[0].questionCount;

    fireEvent.change(countInput, { target: { value: '0' } });
    fireEvent.change(countInput, { target: { value: '-3' } });
    expect(useExamConfigStore.getState().config.sections[0].questionCount).toBe(original);

    fireEvent.change(countInput, { target: { value: '12' } });
    expect(useExamConfigStore.getState().config.sections[0].questionCount).toBe(12);
  });

  it('ignores a section time below 0', () => {
    render(<ExamConfigPage />);
    const timeInput = screen.getAllByLabelText(/recommended time/i)[0];
    const original = useExamConfigStore.getState().config.sections[0].timeMinutes;

    fireEvent.change(timeInput, { target: { value: '-1' } });
    expect(useExamConfigStore.getState().config.sections[0].timeMinutes).toBe(original);
  });
});
