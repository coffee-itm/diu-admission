import { z } from 'zod';
import { SECTION_ORDER, DIFFICULTY } from '../../lib/constants.js';

export const questionSchema = z.object({
  section: z.enum(SECTION_ORDER, {
    error: (iss) => (iss.input === undefined || iss.input === ''
      ? 'Section is required'
      : `Section must be one of ${SECTION_ORDER.join(', ')}`),
  }),
  text: z.string().min(5, 'Question text must be at least 5 characters'),
  options: z.array(
    z.object({
      id: z.string().min(1, 'Option ID is required'),
      text: z.string().min(1, 'Option text is required'),
    })
  ).length(4, 'Must have exactly 4 options'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  difficulty: z.enum(Object.keys(DIFFICULTY), { error: 'Difficulty is required' }),
  explanation: z.string().optional(),
  tags: z.array(z.string().trim().toLowerCase()).max(10, 'At most 10 tags').default([]),
}).superRefine((q, ctx) => {
  const seen = new Set();
  q.options.forEach((o, i) => {
    const key = o.text.trim().toLowerCase();
    if (!key) return;
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: ['options', i, 'text'], message: 'Option text must be unique' });
    }
    seen.add(key);
  });
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
