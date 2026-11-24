import type { AppDB, PayrollRecord, Unit } from '@/types';

const KEY = 'payroll.db';
const OLD_KEY = 'metalledger.db';

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const UNIT_MAP: Record<string, Unit> = { bhalwani: 'Plant 1', supa: 'Plant 2', 'plant 1': 'Plant 1', 'plant 2': 'Plant 2' };
export const unitName = (s?: string): Unit => UNIT_MAP[(s ?? '').trim().toLowerCase()] ?? 'Plant 1';

export const defaultDB = (): AppDB => ({
  version: 2,
  settings: { companyName: 'Your Company Name', address: '', shiftHours: 12, defaultOTMultiplier: 1 },
  employees: [],
  payroll: [],
});

function normalize(d: AppDB): AppDB {
  const base = defaultDB();
  return {
    ...base,
    ...d,
    version: 2,
    settings: { ...base.settings, ...d.settings },
        employees: d.employees.map((e) => {
      const { department, ...x } = e as typeof e & { department?: string };
      return { ...x, unit: unitName(x.unit ?? department) };
    }),
    payroll: d.payroll.map((r) => {
      const { adjustment = 0, ...x } = r as PayrollRecord & { adjustment?: number };
      return { ...x, otPay: x.otPay + adjustment };
    }),
  };
}

export function loadDB(): AppDB {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (raw) return normalize({ ...defaultDB(), ...JSON.parse(raw) });
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
  downloadBlob(`payroll-backup-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' }));

export async function importJSON(file: File): Promise<AppDB> {
  const d = JSON.parse(await file.text());
  if (!d || !Array.isArray(d.employees) || !Array.isArray(d.payroll) || !d.settings) throw new Error('Not a valid Payroll backup file.');
  return normalize({ ...defaultDB(), ...d });
}