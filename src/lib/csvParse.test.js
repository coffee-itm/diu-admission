import { describe, it, expect } from 'vitest';
import { parseCSV } from './csvParse.js';

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
