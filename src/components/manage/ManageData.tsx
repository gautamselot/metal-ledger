import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Eye, EyeOff, FileUp, Plus, Settings2, Trash2 } from 'lucide-react';
import { UNITS } from '@/types';
import type { AppDB, AppSettings, Employee, OTMultiplier, PayrollRecord, SetDB, Unit } from '@/types';
import { generate, MONTHS } from '@/utils/reverseCalculator';
import { exportJSON, importJSON, uid } from '@/utils/storage';
import { saveSheet } from '@/utils/sheet';
import type { Period } from '../layout/Header';
import ExcelImportModal from '../employees/ExcelImportModal';
import CompanySettings from '../settings/CompanySettings';
import Cell from './Cell';
import type { Check } from './Cell';

interface P { db: AppDB; setDb: SetDB }
const inr = (n: number) => n.toLocaleString('en-IN');
const byPlant = (a: Employee, b: Employee) => a.unit.localeCompare(b.unit) || a.empCode.localeCompare(b.empCode, undefined, { numeric: true });
const nextCode = (list: Employee[]) => String(Math.max(0, ...list.map((e) => parseInt(e.empCode, 10) || 0)) + 1);

const BASE: [string, string][] = [['unit', 'Plant'], ['empCode', 'Code'], ['name', 'Name'], ['designation', 'Designation'], ['dailyRate', 'Daily rate'], ['accNo', 'Account no'], ['ifsc', 'IFSC'], ['aadhaar', 'Aadhaar'], ['active', 'Active']];
const label = (k: string) => BASE.find((b) => b[0] === k)?.[1] ?? k.slice(2);

function EmployeesTab({ db, setDb }: P) {
  const [q, setQ] = useState('');
  const [plant, setPlant] = useState<'all' | Unit>('all');
  const [st, setSt] = useState<'all' | 'active' | 'inactive'>('all');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [to, setTo] = useState<Unit>(UNITS[0]);
  const [imp, setImp] = useState(false);
  const [panel, setPanel] = useState(false);
  const [nc, setNc] = useState('');

  const s = db.settings;
  const cols = s.customCols ?? [];
  const keys = [...BASE.map((b) => b[0]), ...cols.map((c) => 'c:' + c)];
  const saved = (s.colOrder ?? []).filter((k) => keys.includes(k));
  const order = [...saved, ...keys.filter((k) => !saved.includes(k))];
  const hidden = new Set(s.colHidden ?? []);
  const visible = order.filter((k) => !hidden.has(k));
  const setS = (p: Partial<AppSettings>) => setDb((d) => ({ ...d, settings: { ...d.settings, ...p } }));

  const list = useMemo(
    () =>
      db.employees
        .filter((e) => (plant === 'all' || e.unit === plant) && (st === 'all' || (st === 'active') === e.active) && (e.name + e.empCode).toLowerCase().includes(q.toLowerCase()))
        .sort(byPlant),
    [db.employees, plant, st, q]
  );
  const upd = (e: Employee, p: Partial<Employee>) => setDb((d) => ({ ...d, employees: d.employees.map((x) => (x.id === e.id ? { ...x, ...p } : x)) }));
  const clash = (code: string, u: Unit, id: string) => db.employees.some((x) => x.unit === u && x.empCode === code && x.id !== id);

  const code = (e: Employee): Check => (v) => {
    const c = v.trim();
    if (!c) return 'Emp code is required.';
    if (clash(c, e.unit, e.id)) return `Emp code ${c} already exists in ${e.unit}.`;
    upd(e, { empCode: c });
  };
  const name = (e: Employee): Check => (v) => (v.trim() ? void upd(e, { name: v.trim().replace(/\s+/g, ' ') }) : 'Name is required.');
  const rate = (e: Employee): Check => (v) => (+v > 0 ? void upd(e, { dailyRate: Math.round(+v) }) : 'Daily rate must be above 0.');
  const acc = (e: Employee): Check => (v) => {
    const a = v.replace(/\s/g, '');
    if (a && !/^\d{9,18}$/.test(a)) return 'Account no must be 9 to 18 digits.';
    upd(e, { accNo: a });
  };
  const ifsc = (e: Employee): Check => (v) => {
    const i = v.trim().toUpperCase();
    if (i && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(i)) return 'IFSC must be 11 characters, e.g. SBIN0001234.';
    upd(e, { ifsc: i });
  };
  const aadhaar = (e: Employee): Check => (v) => {
    const a = v.replace(/\s/g, '');
    if (a && !/^\d{12}$/.test(a)) return 'Aadhaar must be 12 digits.';
    upd(e, { aadhaar: a });
  };
  const mv = (e: Employee, u: Unit) => (clash(e.empCode, u, e.id) ? alert(`Code ${e.empCode} already exists in ${u}. Change the code first.`) : upd(e, { unit: u }));

  const add = () =>
    setDb((d) => ({ ...d, employees: [...d.employees, { id: uid(), empCode: nextCode(d.employees.filter((e) => e.unit === to)), name: 'New worker', designation: '', unit: to, dailyRate: 0, accNo: '', ifsc: '', aadhaar: '', active: true }] }));

  const nameErr = (n: string, except?: string) => {
    if (!n) return 'Column name is required.';
    const l = n.toLowerCase();
    if (BASE.some((b) => b[1].toLowerCase() === l) || cols.some((c) => c !== except && c.toLowerCase() === l)) return 'A column with this name already exists.';
  };
  const addCol = () => {
    const n = nc.trim();
    const e = nameErr(n);
    if (e) return alert(e);
    setS({ customCols: [...cols, n], colOrder: [...order, 'c:' + n] });
    setNc('');
  };
  const rename = (h: string): Check => (v) => {
    const n = v.trim();
    if (n === h) return;
    const e = nameErr(n, h);
    if (e) return e;
    const ren = (l: string[]) => l.map((k) => (k === 'c:' + h ? 'c:' + n : k));
    setDb((d) => ({
      ...d,
      settings: { ...d.settings, customCols: cols.map((c) => (c === h ? n : c)), colOrder: ren(order), colHidden: ren([...hidden]) },
      employees: d.employees.map((x) => (x.custom && h in x.custom ? { ...x, custom: Object.fromEntries(Object.entries(x.custom).map(([k, val]) => [k === h ? n : k, val])) } : x)),
    }));
  };
  const delCol = (h: string) => {
    if (!confirm(`Delete column "${h}" and its values for all workers?`)) return;
    const keep = (l: string[]) => l.filter((k) => k !== 'c:' + h);
    setDb((d) => ({
      ...d,
      settings: { ...d.settings, customCols: cols.filter((c) => c !== h), colOrder: keep(order), colHidden: keep([...hidden]) },
      employees: d.employees.map((x) => (x.custom && h in x.custom ? { ...x, custom: Object.fromEntries(Object.entries(x.custom).filter(([k]) => k !== h)) } : x)),
    }));
  };
  const move = (k: string, dir: -1 | 1) => {
    const i = order.indexOf(k);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const n = [...order];
    [n[i], n[j]] = [n[j], n[i]];
    setS({ colOrder: n });
  };
  const toggle = (k: string) => setS({ colHidden: hidden.has(k) ? [...hidden].filter((x) => x !== k) : [...hidden, k] });
  const reset = () => setS({ colOrder: undefined, colHidden: undefined });

  const tog = (id: string) => setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOn = list.length > 0 && list.every((e) => sel.has(e.id));
  const togAll = () => setSel(allOn ? new Set() : new Set(list.map((e) => e.id)));
  const bulkSet = (active: boolean) => setDb((d) => ({ ...d, employees: d.employees.map((e) => (sel.has(e.id) ? { ...e, active } : e)) }));
  const bulkMove = (u: Unit) => {
    const picked = db.employees.filter((e) => sel.has(e.id) && e.unit !== u);
    const ok = new Set(picked.filter((e) => !clash(e.empCode, u, e.id)).map((e) => e.id));
    if (ok.size < picked.length) alert(`${picked.length - ok.size} worker(s) not moved: same Emp code already exists in ${u}.`);
    setDb((d) => ({ ...d, employees: d.employees.map((e) => (ok.has(e.id) ? { ...e, unit: u } : e)) }));
  };
  const bulkDel = () => {
    if (!confirm(`Delete ${sel.size} worker(s) and all their payroll records?`)) return;
    setDb((d) => ({ ...d, employees: d.employees.filter((e) => !sel.has(e.id)), payroll: d.payroll.filter((p) => !sel.has(p.employeeId)) }));
    setSel(new Set());
  };

  const val = (k: string, e: Employee): string | number =>
    k === 'unit' ? e.unit : k === 'empCode' ? e.empCode : k === 'name' ? e.name : k === 'designation' ? e.designation ?? '' : k === 'dailyRate' ? e.dailyRate
      : k === 'accNo' ? e.accNo ?? '' : k === 'ifsc' ? e.ifsc ?? '' : k === 'aadhaar' ? e.aadhaar ?? '' : k === 'active' ? (e.active ? 'Yes' : 'No') : e.custom?.[k.slice(2)] ?? '';
  const exp = () => {
    if (!list.length) return alert('Nothing to export.');
    saveSheet(`employees-${new Date().toISOString().slice(0, 10)}.xlsx`, list.map((e) => Object.fromEntries(visible.map((k) => [label(k), val(k, e)]))));
  };

  const cell = (k: string, e: Employee) => {
    switch (k) {
      case 'unit': return <select value={e.unit} onChange={(x) => mv(e, x.target.value as Unit)}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>;
      case 'empCode': return <Cell v={e.empCode} onSave={code(e)} w={70} />;
      case 'name': return <Cell v={e.name} onSave={name(e)} w={190} />;
      case 'designation': return <Cell v={e.designation ?? ''} onSave={(v) => void upd(e, { designation: v.trim() })} w={130} />;
      case 'dailyRate': return <Cell v={e.dailyRate || ''} onSave={rate(e)} w={90} num />;
      case 'accNo': return <Cell v={e.accNo ?? ''} onSave={acc(e)} w={160} />;
      case 'ifsc': return <Cell v={e.ifsc ?? ''} onSave={ifsc(e)} w={120} />;
      case 'aadhaar': return <Cell v={e.aadhaar ?? ''} onSave={aadhaar(e)} w={130} />;
      case 'active': return <input type="checkbox" checked={e.active} onChange={(x) => upd(e, { active: x.target.checked })} />;
      default: {
        const h = k.slice(2);
        return <Cell v={e.custom?.[h] ?? ''} onSave={(v) => void upd(e, { custom: { ...e.custom, [h]: v.trim() } })} w={120} />;
      }
    }
  };

  return (
    <>
      <div className="bar">
        <div className="row">
          <input placeholder="Search name or code" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={plant} onChange={(e) => setPlant(e.target.value as 'all' | Unit)}>
            <option value="all">All plants</option>{UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
          <select value={st} onChange={(e) => setSt(e.target.value as typeof st)}>
            <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
          <span className="muted">{list.length} shown</span>
        </div>
        <div className="row">
          <button className={panel ? 'btn primary' : 'btn'} onClick={() => setPanel(!panel)}><Settings2 size={16} /> Columns</button>
          <select value={to} onChange={(e) => setTo(e.target.value as Unit)} aria-label="Target plant">{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
          <button className="btn" onClick={() => setImp(true)}><FileUp size={16} /> Import to {to}</button>
          <button className="btn" onClick={add}><Plus size={16} /> Add to {to}</button>
          <button className="btn" onClick={exp}><Download size={16} /> Export</button>
        </div>
      </div>

      {panel && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="bar" style={{ marginBottom: 6 }}>
            <h3>Columns</h3>
            <button className="link" onClick={reset}>Reset to default</button>
          </div>
          <p className="muted">Arrows reorder, the eye shows or hides, and your own columns can be renamed or deleted. Built-in columns can be hidden but not deleted.</p>
          {order.map((k, i) => (
            <div key={k} className="row" style={{ padding: '4px 0', borderTop: '1px solid var(--line)', flexWrap: 'nowrap' }}>
              <button className="icon" disabled={i === 0} onClick={() => move(k, -1)} title="Move up"><ArrowUp size={16} /></button>
              <button className="icon" disabled={i === order.length - 1} onClick={() => move(k, 1)} title="Move down"><ArrowDown size={16} /></button>
              <div style={{ flex: 1, opacity: hidden.has(k) ? 0.45 : 1 }}>
                {k.startsWith('c:') ? <Cell v={label(k)} onSave={rename(label(k))} w={200} /> : label(k)}
              </div>
              <button className="icon" disabled={k === 'name'} onClick={() => toggle(k)} title={hidden.has(k) ? 'Show column' : 'Hide column'}>
                {hidden.has(k) ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              {k.startsWith('c:') ? <button className="icon" onClick={() => delCol(label(k))} title="Delete column"><Trash2 size={16} /></button> : <span style={{ width: 30 }} />}
            </div>
          ))}
          <div className="row" style={{ marginTop: 10 }}>
            <input placeholder="New column name" value={nc} onChange={(e) => setNc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCol()} />
            <button className="btn primary" onClick={addCol}><Plus size={16} /> Add column</button>
          </div>
        </div>
      )}

      {sel.size > 0 && (
        <div className="bar sub">
          <div className="row">
            <b>{sel.size} selected</b>
            <button className="btn" onClick={() => bulkSet(true)}>Activate</button>
            <button className="btn" onClick={() => bulkSet(false)}>Deactivate</button>
            {UNITS.map((u) => <button key={u} className="btn" onClick={() => bulkMove(u)}>Move to {u}</button>)}
            <button className="btn" onClick={bulkDel}><Trash2 size={16} /> Delete</button>
          </div>
        </div>
      )}
      <div className="tablewrap">
        <table className="grid">
          <thead>
            <tr>
              <th><input type="checkbox" checked={allOn} onChange={togAll} /></th>
              {visible.map((k) => <th key={k} className={k === 'dailyRate' ? 'num' : ''}>{label(k)}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td><input type="checkbox" checked={sel.has(e.id)} onChange={() => tog(e.id)} /></td>
                {visible.map((k) => <td key={k}>{cell(k, e)}</td>)}
                <td className="acts"><button className="icon" title="Delete" onClick={() => { if (confirm(`Delete ${e.name} and all their payroll records?`)) setDb((d) => ({ ...d, employees: d.employees.filter((x) => x.id !== e.id), payroll: d.payroll.filter((p) => p.employeeId !== e.id) })); }}><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={visible.length + 2} className="empty">No workers match. Add one or import an Excel sheet.</td></tr>}
          </tbody>
        </table>
      </div>
      {imp && <ExcelImportModal setDb={setDb} unit={to} onClose={() => setImp(false)} />}
    </>
  );
}

function PayrollTab({ db, setDb, period }: P & { period: Period }) {
  const { month, year } = period;
  const [plant, setPlant] = useState<'all' | Unit>('all');
  const rows = useMemo(
    () =>
      db.payroll
        .filter((r) => r.month === month && r.year === year)
        .map((r) => ({ r, e: db.employees.find((e) => e.id === r.employeeId) }))
        .filter((x): x is { r: PayrollRecord; e: Employee } => !!x.e && (plant === 'all' || x.e.unit === plant))
        .sort((a, b) => byPlant(a.e, b.e)),
    [db.payroll, db.employees, month, year, plant]
  );
  const regen = (r: PayrollRecord, p: Partial<Pick<PayrollRecord, 'dailyRate' | 'targetPayout' | 'otMultiplier'>>) =>
    setDb((d) => ({
      ...d,
      payroll: d.payroll.map((x) =>
        x.id === r.id
          ? generate({ id: r.id, employeeId: r.employeeId, month, year, dailyRate: p.dailyRate ?? r.dailyRate, targetPayout: p.targetPayout ?? r.targetPayout, otMultiplier: p.otMultiplier ?? r.otMultiplier, shiftHours: d.settings.shiftHours, seed: r.seed })
          : x
      ),
    }));
  const clear = () => {
    if (!rows.length || !confirm(`Delete ${rows.length} payroll records for ${MONTHS[month - 1]} ${year}?`)) return;
    const ids = new Set(rows.map((x) => x.r.id));
    setDb((d) => ({ ...d, payroll: d.payroll.filter((p) => !ids.has(p.id)) }));
  };
  return (
    <>
      <div className="bar">
        <div className="row">
          <b>{MONTHS[month - 1]} {year}</b>
          <select value={plant} onChange={(e) => setPlant(e.target.value as 'all' | Unit)}>
            <option value="all">All plants</option>{UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
          <span className="muted">{rows.length} records · ₹{inr(rows.reduce((a, x) => a + x.r.targetPayout, 0))} · change month in the top bar. Editing re-generates attendance.</span>
        </div>
        <button className="btn" onClick={clear}><Trash2 size={16} /> Delete all shown</button>
      </div>
      <div className="tablewrap">
        <table className="grid">
          <thead><tr><th>Plant</th><th>Code</th><th>Name</th><th className="num">Daily rate</th><th className="num">Target payout</th><th>OT rate</th><th className="num">Present</th><th className="num">Absent</th><th className="num">OT pay</th><th /></tr></thead>
          <tbody>
            {rows.map(({ r, e }) => (
              <tr key={r.id}>
                <td>{e.unit}</td><td>{e.empCode}</td><td>{e.name}</td>
                <td><Cell v={r.dailyRate} onSave={(v) => (+v > 0 ? void regen(r, { dailyRate: Math.round(+v) }) : 'Rate must be above 0.')} w={90} num /></td>
                <td><Cell v={r.targetPayout} onSave={(v) => (+v > 0 ? void regen(r, { targetPayout: Math.round(+v) }) : 'Payout must be above 0.')} w={110} num /></td>
                <td>
                  <select value={r.otMultiplier} onChange={(x) => regen(r, { otMultiplier: +x.target.value as OTMultiplier })}>
                    <option value={1}>1.0×</option><option value={1.5}>1.5×</option><option value={2}>2.0×</option>
                  </select>
                </td>
                <td className="num">{r.presentDays}</td><td className="num">{r.absentDays}</td>
                <td className={r.otPay < 0 ? 'num neg' : 'num'}>{inr(r.otPay)}</td>
                <td className="acts"><button className="icon" title="Delete" onClick={() => setDb((d) => ({ ...d, payroll: d.payroll.filter((p) => p.id !== r.id) }))}><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={10} className="empty">No payroll records for this month. Generate them in the Payroll tab.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DataTab({ db, setDb }: P) {
  const restore = async (f?: File) => {
    if (!f) return;
    try {
      const d = await importJSON(f);
      if (confirm(`Replace all current data with this backup (${d.employees.length} employees, ${d.payroll.length} payroll records)?`)) setDb(d);
    } catch (e) {
      alert((e as Error).message);
    }
  };
  return (
    <div className="card">
      <h3>Backup</h3>
      <p className="muted">{db.employees.length} employees · {db.payroll.length} payroll records. Download a backup regularly.</p>
      <div className="row">
        <button className="btn" onClick={() => exportJSON(db)}><Download size={16} /> Download backup</button>
        <label className="btn"><FileUp size={16} /> Restore backup
          <input type="file" accept=".json" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
    </div>
  );
}

const TABS = [['employees', 'Employees'], ['payroll', 'Payroll records'], ['company', 'Company'], ['data', 'Data & security']] as const;

export default function ManageData({ db, setDb, period }: P & { period: Period }) {
  const [t, setT] = useState<(typeof TABS)[number][0]>('employees');
  return (
    <section>
      <div className="bar">
        <h2>Manage</h2>
        <div className="row">{TABS.map(([id, l]) => <button key={id} className={t === id ? 'btn primary' : 'btn'} onClick={() => setT(id)}>{l}</button>)}</div>
      </div>
      {t === 'employees' && <EmployeesTab db={db} setDb={setDb} />}
      {t === 'payroll' && <PayrollTab db={db} setDb={setDb} period={period} />}
      {t === 'company' && <CompanySettings db={db} setDb={setDb} />}
      {t === 'data' && <DataTab db={db} setDb={setDb} />}
    </section>
  );
}