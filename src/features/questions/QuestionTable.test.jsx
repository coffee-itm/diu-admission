import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionTable } from './QuestionTable.jsx';

const question = {
  id: 'q_math_001',
  section: 'MATH',
  text: 'What is 15% of 200?',
  options: [
    { id: 'a', text: '25' },
    { id: 'b', text: '30' },
    { id: 'c', text: '35' },
    { id: 'd', text: '40' },
  ],
  correctAnswer: 'b',
  difficulty: 'easy',
};

describe('QuestionTable', () => {
  it('renders the full question id', () => {
    render(<QuestionTable questions={[question]} />);

    expect(screen.getByText('q_math_001')).toBeInTheDocument();
  });
});
