import { questionSchema } from './questionSchema.js';

export const IMPORT_HEADER = [
  'section', 'text', 'option_a', 'option_b', 'option_c', 'option_d',
  'correct_answer', 'difficulty', 'explanation', 'tags',
];

const OPTION_IDS = ['a', 'b', 'c', 'd'];

// rows: output of parseCSV (header first). Row numbers are 1-based including the header.
export function mapRows(rows) {
  if (!rows || rows.length === 0) {
    return { valid: [], errors: [{ row: 1, messages: ['File is empty'] }] };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = IMPORT_HEADER.filter((h) => !header.includes(h));
  if (missing.length > 0) {
    return {
      valid: [],
      errors: [{
        row: 1,
        messages: [`Invalid header. Missing column(s): ${missing.join(', ')}. Expected: ${IMPORT_HEADER.join(',')}`],
      }],
    };
  }
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  const get = (r, name) => (r[col[name]] ?? '').trim();

  const valid = [];
  const errors = [];
  rows.slice(1).forEach((r, idx) => {
    const rowNum = idx + 2;
    const correct = get(r, 'correct_answer').toLowerCase();
    const candidate = {
      section: get(r, 'section').toUpperCase(),
      text: get(r, 'text'),
      options: OPTION_IDS.map((id) => ({ id, text: get(r, `option_${id}`) })),
      correctAnswer: correct,
      difficulty: get(r, 'difficulty').toLowerCase(),
      explanation: get(r, 'explanation'),
      tags: get(r, 'tags').split('|').map((t) => t.trim()).filter(Boolean),
    };
    const messages = [];
    const parsed = questionSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.length ? `${issue.path.join('.')}: ` : '';
        messages.push(`${path}${issue.message}`);
      }
    }
    if (!OPTION_IDS.includes(correct)) {
      messages.push('correctAnswer: must be one of a, b, c, d');
    }
    if (messages.length > 0) errors.push({ row: rowNum, messages });
    else valid.push(parsed.data);
  });
  return { valid, errors };
}
