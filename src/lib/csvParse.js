// RFC 4180 CSV parser. No dependencies.
// parseCSVDetailed returns { rows: [{ cells, line }], error }; `line` is the 1-based file line
// where the record starts. Fully blank lines are dropped but still counted for line numbers.
export function parseCSVDetailed(text) {
  const src = String(text ?? '');
  const body = src.charCodeAt(0) === 0xfeff ? src.slice(1) : src;
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  let line = 1;
  let rowLine = 1;
  let quoteLine = 1;

  while (i < body.length) {
    const ch = body[i];
    if (inQuotes) {
      if (ch === '"') {
        if (body[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        if (ch === '\n' || (ch === '\r' && body[i + 1] !== '\n')) line++;
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
      quoteLine = line;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && body[i + 1] === '\n') i++;
      row.push(field);
      rows.push({ cells: row, line: rowLine });
      row = [];
      field = '';
      line++;
      rowLine = line;
    } else {
      field += ch;
    }
    i++;
  }
  if (inQuotes) {
    return { rows: [], error: { line: quoteLine, message: 'Unterminated quoted field' } };
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push({ cells: row, line: rowLine });
  }
  // Drop fully blank lines
  return { rows: rows.filter((r) => r.cells.some((c) => c.trim() !== '')), error: null };
}

// Returns an array of row arrays (strings). Backward-compatible wrapper.
export function parseCSV(text) {
  return parseCSVDetailed(text).rows.map((r) => r.cells);
}
