import { questionSchema } from './questionSchema.js';

export const IMPORT_HEADER = [
  'section', 'text', 'option_a', 'option_b', 'option_c', 'option_d',
  'correct_answer', 'difficulty', 'explanation', 'tags',
];

export const MAX_IMPORT_ROWS = 2000;

const OPTION_IDS = ['a', 'b', 'c', 'd'];

// rows: output of parseCSVDetailed().rows ([{ cells, line }], header first) or, for
// compatibility, parseCSV() output (string[][]; line = index + 1). `row` in errors is the file line.
export function mapRows(input) {
  const rows = (input ?? []).map((r, i) => (Array.isArray(r) ? { cells: r, line: i + 1 } : r));
  if (!rows || rows.length === 0) {
    return { valid: [], errors: [{ row: 1, messages: ['File is empty'] }] };
  }
  const header = rows[0].cells.map((h) => h.trim().toLowerCase());
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
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    return {
      valid: [],
      errors: [{ row: 1, messages: [`Too many rows (max ${MAX_IMPORT_ROWS}); found ${rows.length - 1}`] }],
    };
  }
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  const get = (r, name) => (r[col[name]] ?? '').trim();

  const valid = [];
  const errors = [];
  rows.slice(1).forEach(({ cells: r, line: rowNum }) => {
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
