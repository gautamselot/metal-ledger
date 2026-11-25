import { useState } from 'react';
import { FileUp, X } from 'lucide-react';
import type { Employee, SetDB, Unit } from '@/types';
import { uid } from '@/utils/storage';
import { pick, readRows, saveSheet } from '@/utils/sheet';

export default function ExcelImportModal({ setDb, unit, onClose }: { setDb: SetDB; unit: Unit; onClose: () => void }) {
  const [msg, setMsg] = useState('');
  const load = async (f?: File) => {
    if (!f) return;
    try {
      const rows = await readRows(f);
      const list: Employee[] = rows
        .map((r) => ({
          id: uid(),
          empCode: pick(r, 'empcode', 'employeecode', 'code', 'empid'),
          name: pick(r, 'name', 'employeename', 'workername'),
          designation: pick(r, 'designation'),
          unit,
          dailyRate: Number(pick(r, 'dailyrate', 'rate', 'wage')),
          accNo: pick(r, 'accno', 'accountno', 'accountnumber').replace(/\s/g, ''),
          ifsc: pick(r, 'ifsc').toUpperCase(),
          aadhaar: pick(r, 'aadhaar', 'aadhar').replace(/\s/g, ''),
          active: true,
        }))
        .filter((e) => e.empCode && e.name && e.dailyRate > 0);
      if (!list.length) return setMsg('No valid rows. Needs Emp Code, Name, Daily Rate columns.');
      let added = 0, updated = 0;
      setDb((d) => {
        const emps = [...d.employees];
        list.forEach((n) => {
          const i = emps.findIndex((e) => e.unit === unit && e.empCode === n.empCode);
          if (i >= 0) { emps[i] = { ...n, id: emps[i].id }; updated++; } else { emps.push(n); added++; }
        });
        return { ...d, employees: emps };
      });
      setMsg(`Imported ${list.length} workers into ${unit}.`);
    } catch {
      setMsg('Could not read this file.');
    }
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mh">
          <h3>Import workers into {unit}</h3>
          <button className="icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="muted">Columns: Emp Code, Name, Designation, Daily Rate, Acc No, IFSC, Aadhaar. Existing codes are updated.</p>
        <div className="row">
          <label className="btn primary"><FileUp size={16} /> Choose file
            <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { load(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <button className="link" onClick={() => saveSheet('workers-template.xlsx', [{ 'Emp Code': 'E001', Name: 'Ramesh Kumar', Designation: 'Operator', 'Daily Rate': 850, 'Acc No': '', IFSC: '', Aadhaar: '' }])}>Sample file</button>
        </div>
        {msg && <p className="muted">{msg}</p>}
      </div>
    </div>
  );
}