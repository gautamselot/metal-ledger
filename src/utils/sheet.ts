import * as XLSX from 'xlsx';

export type Row = Record<string, string>;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function readRows(file: File): Promise<Row[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  return raw.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [norm(k), String(v).trim()])));
}

export const pick = (r: Row, ...keys: string[]) => {
  for (const k of keys) if (r[k]) return r[k];
  return '';
};

export function saveSheet(name: string, rows: Record<string, string | number>[]) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Sheet1');
  XLSX.writeFile(wb, name);
}
