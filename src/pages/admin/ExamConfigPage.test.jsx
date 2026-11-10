import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExamConfigPage } from './ExamConfigPage.jsx';
import { useExamConfigStore } from '../../store/examConfigStore.js';
import { mockExamConfig } from '../../data/mockExamConfig.js';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

// Labelled inputs are linked via `htmlFor`, so reach them by their label (T-031).
const fieldInput = (label) => screen.getByLabelText(label);

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

  it('links every labelled input to its id', () => {
    render(<ExamConfigPage />);

    expect(screen.getByLabelText('Exam Title')).toHaveAttribute('id', 'exam-config-title');
    expect(screen.getByLabelText('Total Duration (Minutes)')).toHaveAttribute('id', 'exam-config-duration');
    expect(screen.getByLabelText('Overall Minimum % (ELIGIBLE)')).toHaveAttribute('id', 'exam-config-overall-min');
    expect(screen.getByLabelText('Per-Section Minimum %')).toHaveAttribute('id', 'exam-config-section-min');

    expect(screen.getByRole('button', { name: /save changes/i })).toHaveAttribute('id', 'exam-config-save');
    expect(screen.getByRole('button', { name: /restore defaults/i })).toHaveAttribute('id', 'exam-config-reset');

    useExamConfigStore.getState().config.sections.forEach((sec) => {
      expect(screen.getByLabelText(`${sec.name} question count`)).toHaveAttribute(
        'id',
        `exam-config-${sec.id}-count`
      );
      expect(screen.getByLabelText(`${sec.name} recommended time in minutes`)).toHaveAttribute(
        'id',
        `exam-config-${sec.id}-time`
      );
    });
  });

  it('clearing a section question count then typing a new value yields exactly that value', () => {
    render(<ExamConfigPage />);
    const countInput = screen.getAllByLabelText(/question count/i)[0];

    fireEvent.change(countInput, { target: { value: '' } });
    expect(countInput.value).toBe('');

    fireEvent.change(countInput, { target: { value: '9' } });
    expect(countInput.value).toBe('9');
  });

  it('blocks save with an inline error when a section question count is blank', () => {
    render(<ExamConfigPage />);
    const countInput = screen.getAllByLabelText(/question count/i)[0];
    const original = useExamConfigStore.getState().config.sections[0].questionCount;

    fireEvent.change(countInput, { target: { value: '' } });
    save();

    expect(screen.getByText(/enter a question count/i)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
    expect(useExamConfigStore.getState().config.sections[0].questionCount).toBe(original);
  });

  it('blocks save with an inline error when a section question count is out of range', () => {
    render(<ExamConfigPage />);
    const countInput = screen.getAllByLabelText(/question count/i)[0];
    const original = useExamConfigStore.getState().config.sections[0].questionCount;

    fireEvent.change(countInput, { target: { value: '0' } });
    save();
    expect(screen.getByText(/question count must be between 1 and 100/i)).toBeInTheDocument();
    expect(useExamConfigStore.getState().config.sections[0].questionCount).toBe(original);

    fireEvent.change(countInput, { target: { value: '101' } });
    save();
    expect(screen.getByText(/question count must be between 1 and 100/i)).toBeInTheDocument();
    expect(useExamConfigStore.getState().config.sections[0].questionCount).toBe(original);
  });

  it('blocks save with an inline error when a section time is out of range', () => {
    render(<ExamConfigPage />);
    const timeInput = screen.getAllByLabelText(/recommended time/i)[0];
    const original = useExamConfigStore.getState().config.sections[0].timeMinutes;

    fireEvent.change(timeInput, { target: { value: '-1' } });
    save();

    expect(screen.getByText(/time must be between 0 and 600 minutes/i)).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalled();
    expect(useExamConfigStore.getState().config.sections[0].timeMinutes).toBe(original);
  });

  it('persists a valid section edit on save', () => {
    vi.useFakeTimers();
    render(<ExamConfigPage />);
    const countInput = screen.getAllByLabelText(/question count/i)[0];
    const sectionId = useExamConfigStore.getState().config.sections[0].id;

    fireEvent.change(countInput, { target: { value: '12' } });
    save();
    act(() => vi.advanceTimersByTime(600));

    const saved = useExamConfigStore.getState().config.sections.find((s) => s.id === sectionId);
    expect(saved.questionCount).toBe(12);
    expect(toast.success).toHaveBeenCalled();
    expect(screen.queryByText(/question count must be between/i)).not.toBeInTheDocument();
  });
});
