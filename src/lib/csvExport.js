function escapeField(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/**
 * Serialize rows to RFC 4180 CSV (CRLF line endings).
 * columns: [{ header, key } | { header, value: (row) => any }]
 */
export function toCSV(rows, columns) {
  const lines = [columns.map((c) => escapeField(c.header)).join(',')];
  for (const row of rows) {
    lines.push(
      columns.map((c) => escapeField(c.value ? c.value(row) : row[c.key])).join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}

/** Trigger a browser download; a UTF-8 BOM makes Excel read Bangla correctly. */
export function downloadCSV(filename, csv) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
