import { describe, it, expect } from 'vitest';
import { parseCSV, parseCSVDetailed } from './csvParse.js';

describe('parseCSV', () => {
  it('parses simple rows with LF and no trailing newline', () => {
    expect(parseCSV('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('handles CRLF', () => {
    expect(parseCSV('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('handles quoted fields with embedded comma', () => {
    expect(parseCSV('a,"b,c"\n')).toEqual([['a', 'b,c']]);
  });
  it('handles escaped quotes', () => {
    expect(parseCSV('"say ""hi""",x')).toEqual([['say "hi"', 'x']]);
  });
  it('handles embedded newlines in quotes', () => {
    expect(parseCSV('"l1\nl2",x\r\ny,z')).toEqual([['l1\nl2', 'x'], ['y', 'z']]);
  });
  it('strips a leading BOM', () => {
    expect(parseCSV('﻿a,b\n')).toEqual([['a', 'b']]);
  });
  it('keeps empty fields and skips blank lines', () => {
    expect(parseCSV('a,,c\n\n1,2,3\n')).toEqual([['a', '', 'c'], ['1', '2', '3']]);
  });
});

describe('parseCSVDetailed', () => {
  it('reports an unterminated quote with its line', () => {
    const r = parseCSVDetailed('a,"b\n');
    expect(r.error).toEqual({ line: 1, message: 'Unterminated quoted field' });
  });
  it('keeps real line numbers across blank lines and multi-line fields', () => {
    const r = parseCSVDetailed('h1,h2\n\n"x\ny",z\nlast,row\n');
    expect(r.error).toBeNull();
    expect(r.rows.map((x) => x.line)).toEqual([1, 3, 5]);
  });
  it('counts CRLF as one line', () => {
    const r = parseCSVDetailed('a\r\n\r\nb\r\n');
    expect(r.rows.map((x) => x.line)).toEqual([1, 3]);
  });
});
