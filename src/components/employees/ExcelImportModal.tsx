import { useState } from 'react';
import { Download, X } from 'lucide-react';
import type { Employee, SetDB } from '@/types';
import { pick, readRows, saveSheet } from '@/utils/sheet';
import { uid } from '@/utils/storage';

type Draft = Omit<Employee, 'id'>;

export default function ExcelImportModal({ onClose, setDb }: { onClose: () => void; setDb: SetDB }) {
  const [rows, setRows] = useState<Draft[]>([]);
  const [err, setErr] = useState('');

  const load = async (f?: File) => {
    if (!f) return;
    try {
      const list = (await readRows(f))
        .map((r): Draft => ({
          empCode: pick(r, 'empcode', 'empid', 'employeecode', 'employeeid', 'code', 'id'),
          name: pick(r, 'name', 'employeename', 'workername'),
          designation: pick(r, 'designation', 'role'),
          department: pick(r, 'department', 'dept'),
          dailyRate: Number(pick(r, 'dailyrate', 'rate', 'wage', 'perdayrate')) || 0,
          active: true,
        }))
        .filter((r) => r.empCode && r.name);
      setRows(list);
      setErr(list.length ? '' : 'No valid rows. The sheet needs Emp Code and Name columns.');
    } catch {
      setErr('Could not read this file. Use .xlsx or .csv.');
    }
  };

  const save = () => {
    setDb((d) => {
      const emps = [...d.employees];
      rows.forEach((r) => {
        const i = emps.findIndex((e) => e.empCode === r.empCode);
        if (i >= 0) emps[i] = { ...emps[i], ...r };
        else emps.push({ id: uid(), ...r });
      });
      return { ...d, employees: emps };
    });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mh"><h3>Import workers</h3><button className="icon" onClick={onClose}><X size={18} /></button></div>
        <p className="muted">Columns: Emp Code, Name, Designation, Department, Daily Rate. Existing codes are updated.</p>
        <div className="row">
          <button className="btn" onClick={() => saveSheet('workers-template.xlsx', [{ 'Emp Code': 'E001', Name: 'Ramesh Kumar', Designation: 'Operator', Department: 'Extrusion', 'Daily Rate': 650 }])}>
            <Download size={16} /> Sample template
          </button>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => load(e.target.files?.[0])} />
        </div>
        {err && <p className="err">{err}</p>}
        {rows.length > 0 && <p><b>{rows.length}</b> workers ready to import.</p>}
        <div className="row end">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!rows.length} onClick={save}>Import {rows.length || ''} workers</button>
        </div>
      </div>
    </div>
  );
}
