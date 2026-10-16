// src/utils/csv.ts — minimal RFC-4180-ish CSV reader for the public sample
// questions page (ticket 24). Handles quoted fields, embedded commas/newlines
// and doubled quotes ("") — everything the shipped sample file uses.
//
// Deliberately tiny and dependency-free: the only consumer is /free-questions,
// which parses a static 846-byte file already served from /samples/.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** First row = headers; returns one object per data row, skipping blank lines. */
export function csvToObjects(text: string): Record<string, string>[] {
  const [header, ...rest] = parseCsv(text).filter(
    (r) => r.length > 1 || (r[0] ?? "").trim() !== "",
  );
  if (!header) return [];
  return rest.map((row) =>
    Object.fromEntries(header.map((key, i) => [key, row[i] ?? ""])),
  );
}
