import type { AppDB, PayrollRecord } from '@/types';
import { defaultDB, normalize } from './storage';

export const API = 'https://payroll-api.payroll-gautam.workers.dev';
const TK = 'payroll.token';
export const getToken = () => localStorage.getItem(TK) ?? '';
export const setToken = (t: string) => localStorage.setItem(TK, t);

interface Item { k: string; v: string; rev: number }
const synced = new Map<string, Item>();

const call = async (path: string, init?: RequestInit) => {
  const r = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` } });
  if (r.status === 401) throw new Error('AUTH');
  if (!r.ok) throw new Error('HTTP');
  return r;
};

const split = (db: AppDB) => {
  const o: Record<string, string> = { settings: JSON.stringify(db.settings), employees: JSON.stringify(db.employees) };
  const m: Record<string, PayrollRecord[]> = {};
  db.payroll.forEach((r) => (m[`pay:${r.year}-${String(r.month).padStart(2, '0')}`] ??= []).push(r));
  for (const k in m) o[k] = JSON.stringify(m[k]);
  return o;
};

export const join = (items: Item[]): AppDB => {
  const d = defaultDB();
  items.forEach(({ k, v }) => {
    const x = JSON.parse(v);
    if (k === 'settings') d.settings = x;
    else if (k === 'employees') d.employees = x;
    else if (k.startsWith('pay:')) d.payroll.push(...x);
  });
  return normalize(d);
};

export async function pull(): Promise<Item[]> {
  const { items } = (await (await call('/api/all')).json()) as { items: Item[] };
  synced.clear();
  items.forEach((i) => synced.set(i.k, i));
  return items;
}

export async function push(db: AppDB): Promise<'ok' | 'conflict'> {
  const now = split(db);
  synced.forEach((_, k) => { if (!(k in now) && k.startsWith('pay:')) now[k] = '[]'; });
  const changes = Object.entries(now)
    .filter(([k, v]) => synced.get(k)?.v !== v)
    .map(([k, v]) => ({ k, v, baseRev: synced.get(k)?.rev ?? 0 }));
  if (!changes.length) return 'ok';
  const j = (await (await call('/api/save', { method: 'POST', body: JSON.stringify({ changes }) })).json()) as { revs: Record<string, number>; conflicts: string[] };
  changes.forEach((c) => { if (j.revs[c.k]) synced.set(c.k, { k: c.k, v: c.v, rev: j.revs[c.k] }); });
  return j.conflicts.length ? 'conflict' : 'ok';
}
