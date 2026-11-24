import type { DayEntry, OTMultiplier, PayrollRecord } from '@/types';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const daysIn = (month: number, year: number) => new Date(year, month, 0).getDate();
export const newSeed = () => (Math.random() * 2 ** 31) | 0;

const rng = (s: number) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export interface CalcInput {
  id?: string;
  employeeId: string;
  month: number;
  year: number;
  dailyRate: number;
  targetPayout: number;
  otMultiplier: OTMultiplier;
  maxOTPerDay: number;
  shiftHours: number;
  seed?: number;
}

export function generate(i: CalcInput): PayrollRecord {
  const seed = i.seed ?? newSeed();
  const rand = rng(seed);
  const N = daysIn(i.month, i.year);
  const R = Math.max(0, Math.round(i.dailyRate));
  const T = Math.max(0, Math.round(i.targetPayout));
  const eff = (R / i.shiftHours) * i.otMultiplier;
  const present = R > 0 ? Math.min(N, Math.floor(T / R)) : 0;
  const rem = T - present * R;
  const maxUnits = Math.round(i.maxOTPerDay * 2);

  let units = eff > 0 ? Math.floor((rem / eff) * 2 + 1e-9) : 0;
  units = Math.min(units, present * maxUnits);
  const pay = (u: number) => Math.floor((u / 2) * eff + 1e-9);
  while (units > 0 && present * R + pay(units) > T) units--;

  const order = Array.from({ length: N }, (_, k) => k + 1);
  for (let k = N - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  const presentSet = new Set(order.slice(0, present));
  const days: DayEntry[] = Array.from({ length: N }, (_, k) => ({ day: k + 1, status: presentSet.has(k + 1) ? 'P' : 'A', otHours: 0 }));

  const pd = days.filter((d) => d.status === 'P');
  const alloc = new Array(pd.length).fill(0);
  let left = units;
  while (left > 0) {
    const open = alloc.map((v, k) => (v < maxUnits ? k : -1)).filter((k) => k >= 0);
    const k = open[Math.floor(rand() * open.length)];
    const add = Math.min(left, maxUnits - alloc[k], 2 + Math.floor(rand() * 3));
    alloc[k] += add;
    left -= add;
  }
  pd.forEach((d, k) => (d.otHours = alloc[k] / 2));

  const otPay = pay(units);
  return {
    id: i.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    employeeId: i.employeeId,
    month: i.month,
    year: i.year,
    dailyRate: R,
    targetPayout: T,
    otMultiplier: i.otMultiplier,
    presentDays: present,
    absentDays: N - present,
    otHours: units / 2,
    otPay,
    adjustment: T - present * R - otPay,
    days,
    seed,
  };
}

export function recalc(r: PayrollRecord, shiftHours: number): PayrollRecord {
  const p = r.days.filter((d) => d.status === 'P');
  const otHours = p.reduce((s, d) => s + d.otHours, 0);
  const otPay = Math.floor((otHours * r.dailyRate * r.otMultiplier) / shiftHours + 1e-9);
  return { ...r, presentDays: p.length, absentDays: r.days.length - p.length, otHours, otPay, adjustment: r.targetPayout - p.length * r.dailyRate - otPay };
}
