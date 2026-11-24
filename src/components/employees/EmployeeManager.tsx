import { useMemo, useState } from 'react';
import { FileUp, Pencil, Plus, Trash2 } from 'lucide-react';
import type { AppDB, Employee, SetDB } from '@/types';
import { uid } from '@/utils/storage';
import ExcelImportModal from './ExcelImportModal';

const blank = (): Employee => ({ id: '', empCode: '', name: '', designation: '', department: '', dailyRate: 0, active: true });

export default function EmployeeManager({ db, setDb }: { db: AppDB; setDb: SetDB }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [form, setForm] = useState<Employee | null>(null);
  const [imp, setImp] = useState(false);

  const list = useMemo(
    () =>
      db.employees
        .filter((e) => (filter === 'all' || (filter === 'active') === e.active) && (e.name + e.empCode).toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => a.empCode.localeCompare(b.empCode, undefined, { numeric: true })),
    [db.employees, q, filter]
  );

  const save = () => {
    if (!form) return;
    const f = { ...form, empCode: form.empCode.trim(), name: form.name.trim() };
    if (!f.empCode || !f.name || !(f.dailyRate > 0)) return alert('Emp code, name and a daily rate above 0 are required.');
    if (db.employees.some((e) => e.empCode === f.empCode && e.id !== f.id)) return alert('This Emp code already exists.');
    setDb((d) => ({ ...d, employees: f.id ? d.employees.map((e) => (e.id === f.id ? f : e)) : [...d.employees, { ...f, id: uid() }] }));
    setForm(null);
  };

  const remove = (e: Employee) => {
    if (confirm(`Delete ${e.name} and all their payroll records?`))
      setDb((d) => ({ ...d, employees: d.employees.filter((x) => x.id !== e.id), payroll: d.payroll.filter((p) => p.employeeId !== e.id) }));
  };

  const set = <K extends keyof Employee>(k: K, v: Employee[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <section>
      <div className="bar">
        <h2>Employees <span className="muted">{db.employees.length}</span></h2>
        <div className="row">
          <input placeholder="Search name or code" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All</option>
          </select>
          <button className="btn" onClick={() => setImp(true)}><FileUp size={16} /> Import Excel</button>
          <button className="btn primary" onClick={() => setForm(blank())}><Plus size={16} /> Add worker</button>
        </div>
      </div>

      {form && (
        <div className="card form">
          <label>Emp code<input value={form.empCode} onChange={(e) => set('empCode', e.target.value)} /></label>
          <label>Name<input value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label>Designation<input value={form.designation ?? ''} onChange={(e) => set('designation', e.target.value)} /></label>
          <label>Department<input value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} /></label>
          <label>Daily rate (₹)<input type="number" min={0} value={form.dailyRate || ''} onChange={(e) => set('dailyRate', +e.target.value)} /></label>
          <label className="chk"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Active</label>
          <div className="row end">
            <button className="btn" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn primary" onClick={save}>Save worker</button>
          </div>
        </div>
      )}

      <div className="tablewrap">
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Designation</th><th>Department</th><th className="num">Daily rate</th><th>Status</th><th /></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td>{e.empCode}</td><td>{e.name}</td><td>{e.designation}</td><td>{e.department}</td>
                <td className="num">₹{e.dailyRate.toLocaleString('en-IN')}</td>
                <td><span className={e.active ? 'tag ok' : 'tag'}>{e.active ? 'Active' : 'Inactive'}</span></td>
                <td className="acts">
                  <button className="icon" title="Edit" onClick={() => setForm(e)}><Pencil size={16} /></button>
                  <button className="icon" title="Delete" onClick={() => remove(e)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={7} className="empty">No workers yet. Add one or import an Excel sheet.</td></tr>}
          </tbody>
        </table>
      </div>
      {imp && <ExcelImportModal setDb={setDb} onClose={() => setImp(false)} />}
    </section>
  );
}
