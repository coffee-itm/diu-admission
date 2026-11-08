import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionForm } from './QuestionForm.jsx';

const renderForm = () =>
  render(<QuestionForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

describe('QuestionForm ids', () => {
  it('gives every field and control a stable id', () => {
    renderForm();

    for (const id of [
      'question-form-section',
      'question-form-difficulty',
      'question-form-text',
      'question-form-explanation',
      'question-tags',
      'question-form-cancel',
      'question-form-submit',
    ]) {
      expect(document.getElementById(id), id).toBeInTheDocument();
    }

    for (const letter of ['a', 'b', 'c', 'd']) {
      expect(screen.getByPlaceholderText(`Option ${letter.toUpperCase()}`)).toHaveAttribute(
        'id',
        `question-form-option-${letter}`
      );
      expect(document.getElementById(`question-form-correct-answer-${letter}`)).toBeInTheDocument();
    }
  });

  it('links the labels of selects and textareas', () => {
    renderForm();

    expect(screen.getByLabelText(/^Section/)).toHaveAttribute('id', 'question-form-section');
    expect(screen.getByLabelText(/^Difficulty/)).toHaveAttribute('id', 'question-form-difficulty');
    expect(screen.getByLabelText(/^Question Text/)).toHaveAttribute('id', 'question-form-text');
    expect(screen.getByLabelText(/^Explanation/)).toHaveAttribute('id', 'question-form-explanation');
  });
});
