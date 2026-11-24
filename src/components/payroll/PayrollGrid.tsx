import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CalendarDays, FileSpreadsheet, Shuffle, Wand2, X } from 'lucide-react';
import type { AppDB, Employee, ImportedPayout, OTMultiplier, PayrollRecord, SetDB } from '@/types';
import { generate, MONTHS } from '@/utils/reverseCalculator';
import { exportMuster } from '@/utils/excelExporter';
import type { Period } from '../layout/Header';
import BulkPayoutUpload from './BulkPayoutUpload';
import DayEditorDrawer from './DayEditorDrawer';

interface Draft { rate: string; target: string; mult: OTMultiplier }
const inr = (n: number) => n.toLocaleString('en-IN');

export default function PayrollGrid({ db, setDb, period }: { db: AppDB; setDb: SetDB; period: Period }) {
  const { month, year } = period;
  const s = db.settings;
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [q, setQ] = useState('');
  const [plant, setPlant] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  const plants = useMemo(() => [...new Set(db.employees.map((e) => e.department).filter((p): p is string => !!p))].sort(), [db.employees]);
  const emps = useMemo(
    () =>
      db.employees
        .filter((e) => e.active && (!plant || e.department === plant) && (e.name + e.empCode).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.empCode.localeCompare(b.empCode, undefined, { numeric: true })),
    [db.employees, q, plant]
  );
  const recOf = (id: string) => db.payroll.find((r) => r.employeeId === id && r.month === month && r.year === year);
  const val = (e: Employee): Draft => {
    const d = draft[e.id];
    const r = recOf(e.id);
    return { rate: d?.rate ?? String(r?.dailyRate ?? e.dailyRate), target: d?.target ?? (r ? String(r.targetPayout) : ''), mult: d?.mult ?? r?.otMultiplier ?? s.defaultOTMultiplier };
  };
  const setF = (e: Employee, k: keyof Draft, v: string | number) => setDraft((p) => ({ ...p, [e.id]: { ...val(e), [k]: v } as Draft }));

  const gen = (e: Employee, force = false): PayrollRecord | null => {
    const v = val(e);
    const T = Math.round(+v.target), R = Math.round(+v.rate);
    if (!(T > 0) || !(R > 0)) return null;
    const old = recOf(e.id);
    if (old && !force && old.targetPayout === T && old.dailyRate === R && old.otMultiplier === v.mult) return old;
    return generate({ id: old?.id, employeeId: e.id, month, year, dailyRate: R, targetPayout: T, otMultiplier: v.mult, shiftHours: s.shiftHours });
  };

  const commit = (recs: PayrollRecord[]) => {
    const ids = new Set(recs.map((r) => r.employeeId));
    setDb((d) => ({ ...d, payroll: [...d.payroll.filter((r) => !(r.month === month && r.year === year && ids.has(r.employeeId))), ...recs] }));
    setDraft((p) => {
      const n = { ...p };
      ids.forEach((id) => { delete n[id]; });
      return n;
    });
  };

  const genAll = () => {
    const active = db.employees.filter((e) => e.active);
    const recs = active.map((e) => gen(e)).filter((r): r is PayrollRecord => !!r);
    commit(recs);
    setMsg(`Generated ${recs.length} of ${active.length} active workers.`);
  };

  const applyBulk = (list: ImportedPayout[]) => {
    const next = { ...draft };
    const miss: string[] = [];
    let hit = 0;
    list.forEach((p) => {
      const e = db.employees.find((x) => x.empCode === p.empCode);
      if (!e) { miss.push(p.empCode); return; }
      next[e.id] = { ...val(e), target: String(p.targetPayout) };
      hit++;
    });
    setDraft(next);
    return `${hit} matched.${miss.length ? ` Not found: ${miss.slice(0, 5).join(', ')}${miss.length > 5 ? '…' : ''}` : ''} Press Generate all.`;
  };

  const nav = (ev: KeyboardEvent<HTMLInputElement>, col: string, i: number) => {
    const d = ev.key === 'Enter' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    ev.preventDefault();
    const el = document.querySelector<HTMLInputElement>(`[data-c="${col}-${i + d}"]`);
    el?.focus();
    el?.select();
  };

  const exp = async () => {
    try { await exportMuster(db, month, year); } catch (e) { setMsg((e as Error).message); }
  };

  const monthRecs = db.payroll.filter((r) => r.month === month && r.year === year && db.employees.some((e) => e.id === r.employeeId));
  const totalPay = monthRecs.reduce((a, r) => a + r.targetPayout, 0);
  const editRec = editId ? db.payroll.find((r) => r.id === editId) : undefined;
  const editEmp = editRec ? db.employees.find((e) => e.id === editRec.employeeId) : undefined;

  return (
    <section>
      <div className="bar">
        <h2>{MONTHS[month - 1]} {year} <span className="muted">{monthRecs.length} generated · ₹{inr(totalPay)}</span></h2>
        <div className="row">
          <input placeholder="Search name or code" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={plant} onChange={(e) => setPlant(e.target.value)} aria-label="Plant">
            <option value="">All plants</option>
            {plants.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button className="btn primary" onClick={genAll}><Wand2 size={16} /> Generate all</button>
          <button className="btn" onClick={exp}><FileSpreadsheet size={16} /> Export Excel</button>
        </div>
      </div>
      <div className="bar sub">
        <BulkPayoutUpload onApply={applyBulk} />
        {msg && <span className="muted">{msg}</span>}
      </div>

      <div className="tablewrap">
        <table className="grid">
          <thead>
            <tr><th>Code</th><th>Name</th><th>Plant</th><th className="num">Daily rate</th><th className="num">Target payout</th><th>OT rate</th><th className="num">Present</th><th className="num">Absent</th><th className="num">OT pay</th><th /></tr>
          </thead>
          <tbody>
            {emps.map((e, i) => {
              const v = val(e), r = recOf(e.id), dirty = !!draft[e.id];
              return (
                <tr key={e.id} className={dirty ? 'dirty' : ''}>
                  <td>{e.empCode}</td>
                  <td>{e.name}</td>
                  <td>{e.department}</td>
                  <td><input className="cell" type="number" data-c={`rate-${i}`} value={v.rate} onChange={(x) => setF(e, 'rate', x.target.value)} onKeyDown={(x) => nav(x, 'rate', i)} /></td>
                  <td><input className="cell" type="number" data-c={`target-${i}`} placeholder="0" value={v.target} onChange={(x) => setF(e, 'target', x.target.value)} onKeyDown={(x) => nav(x, 'target', i)} /></td>
                  <td>
                    <select value={v.mult} onChange={(x) => setF(e, 'mult', +x.target.value)}>
                      <option value={1}>1.0×</option><option value={1.5}>1.5×</option><option value={2}>2.0×</option>
                    </select>
                  </td>
                  <td className="num">{r ? r.presentDays : '–'}</td>
                  <td className="num">{r ? r.absentDays : '–'}</td>
                  <td className={r && r.otPay < 0 ? 'num neg' : 'num'}>{r ? inr(r.otPay) : '–'}</td>
                  <td className="acts">
                    <button className="icon" title="Reshuffle attendance" disabled={!r && !(+v.target > 0)} onClick={() => { const n = gen(e, true); if (n) commit([n]); }}><Shuffle size={16} /></button>
                    <button className="icon" title="Edit days" disabled={!r} onClick={() => r && setEditId(r.id)}><CalendarDays size={16} /></button>
                    <button className="icon" title="Clear" disabled={!r} onClick={() => r && setDb((d) => ({ ...d, payroll: d.payroll.filter((p) => p.id !== r.id) }))}><X size={16} /></button>
                  </td>
                </tr>
              );
            })}
            {!emps.length && <tr><td colSpan={10} className="empty">No active workers. Add them in the Employees tab.</td></tr>}
          </tbody>
        </table>
      </div>

      {editRec && editEmp && (
        <DayEditorDrawer
          key={editRec.id + editRec.seed}
          rec={editRec}
          emp={editEmp}
          s={s}
          onClose={() => setEditId(null)}
          onSave={(r) => setDb((d) => ({ ...d, payroll: d.payroll.map((p) => (p.id === r.id ? r : p)) }))}
        />
      )}
    </section>
  );
}