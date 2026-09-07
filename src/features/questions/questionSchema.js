import { z } from 'zod';
import { SECTION_ORDER, DIFFICULTY } from '../../lib/constants.js';

export const questionSchema = z.object({
  section: z.enum(SECTION_ORDER, { required_error: 'Section is required' }),
  text: z.string().min(5, 'Question text must be at least 5 characters'),
  options: z.array(
    z.object({
      id: z.string().min(1, 'Option ID is required'),
      text: z.string().min(1, 'Option text is required'),
    })
  ).length(4, 'Must have exactly 4 options'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  difficulty: z.enum(Object.keys(DIFFICULTY), { required_error: 'Difficulty is required' }),
  explanation: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const defaultQuestionValues = {
  section: 'MATH',
  text: '',
  options: [
    { id: 'a', text: '' },
    { id: 'b', text: '' },
    { id: 'c', text: '' },
    { id: 'd', text: '' },
  ],
  correctAnswer: 'a',
  difficulty: 'medium',
  explanation: '',
  tags: [],
};
