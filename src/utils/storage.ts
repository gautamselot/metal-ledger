import type { AppDB } from '@/types';

const KEY = 'metalledger.db';

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const defaultDB = (): AppDB => ({
  version: 1,
  settings: { companyName: 'Your Company Name', address: '', shiftHours: 12, defaultOTMultiplier: 1, maxOTPerDay: 4 },
  employees: [],
  payroll: [],
});

export function loadDB(): AppDB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const base = defaultDB();
      return { ...base, ...d, settings: { ...base.settings, ...d.settings } };
    }
  } catch {
    /* fall through to defaults */
  }
  return defaultDB();
}

export function saveDB(db: AppDB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    alert('Browser storage is full. Download a backup and remove the company logo or old data.');
  }
}

export function downloadBlob(name: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const exportJSON = (db: AppDB) =>
  downloadBlob(`metalledger-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' }));

export async function importJSON(file: File): Promise<AppDB> {
  const d = JSON.parse(await file.text());
  if (!d || !Array.isArray(d.employees) || !Array.isArray(d.payroll) || !d.settings) throw new Error('Not a valid MetalLedger backup file.');
  const base = defaultDB();
  return { ...base, ...d, settings: { ...base.settings, ...d.settings } };
}
