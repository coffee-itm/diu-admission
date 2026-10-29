import { describe, it, expect, vi, afterEach } from 'vitest';
import { toCSV, downloadCSV } from './csvExport.js';

describe('toCSV', () => {
  const cols = [{ header: 'name', key: 'name' }, { header: 'n', value: (r) => r.n * 2 }];

  it('writes header and CRLF lines', () => {
    expect(toCSV([{ name: 'a', n: 1 }], cols)).toBe('name,n\r\na,2\r\n');
  });

  it('escapes comma, quote and newline', () => {
    const csv = toCSV([{ name: 'a,b', n: 1 }, { name: 'say "hi"', n: 1 }, { name: 'x\ny', n: 1 }], cols);
    expect(csv).toContain('"a,b",2');
    expect(csv).toContain('"say ""hi""",2');
    expect(csv).toContain('"x\ny",2');
  });

  it('keeps Bangla names intact', () => {
    expect(toCSV([{ name: 'রহিম', n: 1 }], cols)).toContain('\r\nরহিম,2');
  });
});

describe('downloadCSV', () => {
  afterEach(() => vi.restoreAllMocks());

  it('prepends a UTF-8 BOM', async () => {
    let blob;
    URL.createObjectURL = vi.fn((b) => { blob = b; return 'blob:x'; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadCSV('f.csv', 'a,b\r\n');
    expect(blob.type).toContain('text/csv');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });
});
