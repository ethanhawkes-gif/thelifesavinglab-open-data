// Deterministic exports. Same release input -> byte-identical output.
export const CSV_COLUMNS = ['id', 'label', 'year', 'place', 'toll', 'cause', 'confidence', 'tier', 'source_id', 'source_citation'];

/** RFC 4180 field escaping; also neutralizes spreadsheet formula injection. */
export function csvEscape(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[\s]*[=+\-@|\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/** Observations as CSV, rows sorted by id, CRLF line endings. */
export function toCSV(observations) {
  const rows = [...observations].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return [CSV_COLUMNS.join(','), ...rows.map((o) => CSV_COLUMNS.map((c) => csvEscape(o[c])).join(','))].join('\r\n') + '\r\n';
}
