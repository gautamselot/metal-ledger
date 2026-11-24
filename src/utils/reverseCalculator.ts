import type { DayEntry, OTMultiplier, PayrollRecord } from '@/types';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const daysIn = (month: number, year: number) => new Date(year, month, 0).getDate();
export const newSeed = () => (Math.random() * 2 ** 31) | 0;

const SAT_ALL_FROM = 20; // present days >= this: all Saturdays present; below: at least 2

const rng = (s: number) => () => {
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const hrs = (pay: number, rate: number, mult: number, shift: number) => (rate > 0 ? Math.round((pay / ((rate / shift) * mult)) * 2) / 2 : 0);

export interface CalcInput {
  id?: string;
  employeeId: string;
  month: number;
  year: number;
  dailyRate: number;
  targetPayout: number;
  otMultiplier: OTMultiplier;
  shiftHours: number;
  seed?: number;
}

export function generate(i: CalcInput): PayrollRecord {
  const seed = i.seed ?? newSeed();
  const rand = rng(seed);
  const N = daysIn(i.month, i.year);
  const R = Math.max(0, Math.round(i.dailyRate));
  const T = Math.max(0, Math.round(i.targetPayout));
  const present = R > 0 ? Math.min(N, Math.floor(T / R)) : 0;
  const otPay = T - present * R;

  const shuffle = <A>(a: A[]) => {
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(rand() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  };
  const all = Array.from({ length: N }, (_, k) => k + 1);
  const sats = shuffle(all.filter((d) => new Date(i.year, i.month - 1, d).getDay() === 6));
  const forced = sats.slice(0, present >= SAT_ALL_FROM ? sats.length : Math.min(2, present));
  const rest = shuffle(all.filter((d) => !forced.includes(d)));
  const set = new Set([...forced, ...rest.slice(0, present - forced.length)]);
  const days: DayEntry[] = all.map((d) => ({ day: d, status: set.has(d) ? 'P' : 'A' }));

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
    otHours: hrs(otPay, R, i.otMultiplier, i.shiftHours),
    otPay,
    days,
    seed,
  };
}

export function recalc(r: PayrollRecord, shiftHours: number): PayrollRecord {
  const p = r.days.filter((d) => d.status === 'P').length;
  const otPay = r.targetPayout - p * r.dailyRate;
  return { ...r, presentDays: p, absentDays: r.days.length - p, otPay, otHours: hrs(Math.max(0, otPay), r.dailyRate, r.otMultiplier, shiftHours) };
}