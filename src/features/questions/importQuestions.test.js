import { describe, it, expect } from 'vitest';
import { parseCSVDetailed } from '../../lib/csvParse.js';
import { mapRows, IMPORT_HEADER } from './importQuestions.js';

const ok = ['math', 'What is 15% of 200?', '25', '30', '35', '40', 'B', 'Easy', 'expl', 'Percentage|arithmetic'];

describe('mapRows', () => {
  it('maps a valid row to a question', () => {
    const { valid, errors } = mapRows([IMPORT_HEADER, ok]);
    expect(errors).toEqual([]);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({
      section: 'MATH',
      correctAnswer: 'b',
      difficulty: 'easy',
      tags: ['percentage', 'arithmetic'],
    });
    expect(valid[0].options).toEqual([
      { id: 'a', text: '25' }, { id: 'b', text: '30' }, { id: 'c', text: '35' }, { id: 'd', text: '40' },
    ]);
  });

  it('reports missing option with the right row number', () => {
    const bad = [...ok]; bad[4] = '';
    const { valid, errors } = mapRows([IMPORT_HEADER, ok, bad]);
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(3);
  });

  it('reports bad correct_answer', () => {
    const bad = [...ok]; bad[6] = 'z';
    const { errors } = mapRows([IMPORT_HEADER, bad]);
    expect(errors[0].row).toBe(2);
    expect(errors[0].messages.join(' ')).toMatch(/correctAnswer/);
  });

  it('reports unknown section', () => {
    const bad = [...ok]; bad[0] = 'PHYSICS';
    const { valid, errors } = mapRows([IMPORT_HEADER, bad]);
    expect(valid).toEqual([]);
    expect(errors[0].row).toBe(2);
  });

  it('rejects a wrong header with a single error', () => {
    const { valid, errors } = mapRows([['Section', 'Text'], ok]);
    expect(valid).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].messages[0]).toMatch(/Invalid header/);
  });
});

describe('mapRows hardening', () => {
  it('reports the real file line after a blank line', () => {
    const bad = [...ok]; bad[4] = '';
    const csv = [IMPORT_HEADER.join(','), '', bad.join(',')].join('\n');
    const { errors } = mapRows(parseCSVDetailed(csv).rows);
    expect(errors[0].row).toBe(3);
  });
  it('accepts 2000 rows and rejects 2001 with one error', () => {
    const mk = (n) => [IMPORT_HEADER, ...Array.from({ length: n }, () => ok)];
    expect(mapRows(mk(2000)).errors).toEqual([]);
    const r = mapRows(mk(2001));
    expect(r.valid).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].messages[0]).toMatch(/max 2000/);
  });
  it('lists valid sections for an invalid one', () => {
    const bad = [...ok]; bad[0] = 'HISTORY';
    const { errors } = mapRows([IMPORT_HEADER, bad]);
    expect(errors[0].messages.join(' ')).toMatch(/must be one of MATH, LOGIC/);
  });
});
