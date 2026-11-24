import { useState } from 'react';
import { Download, X } from 'lucide-react';
import type { Employee, SetDB } from '@/types';
import { pick, readRows, saveSheet } from '@/utils/sheet';
import { plantName, uid } from '@/utils/storage';

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
          department: plantName(pick(r, 'plant', 'department', 'dept')),
          dailyRate: Number(pick(r, 'dailyrate', 'rate', 'wage', 'perdayrate')) || 0,
          accNo: pick(r, 'accno', 'accountno', 'accountnumber', 'bankaccount', 'bankaccountno').replace(/\s/g, ''),
          ifsc: pick(r, 'ifsc', 'ifsccode').toUpperCase(),
          aadhaar: pick(r, 'aadhaar', 'aadhar', 'adhar', 'aadhaarno', 'aadharno', 'adharno').replace(/\s/g, ''),
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
        const keep = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== '' && v !== 0));
        const i = emps.findIndex((e) => e.empCode === r.empCode);
        if (i >= 0) emps[i] = { ...emps[i], ...keep };
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
        <p className="muted">Columns: Emp Code, Name, Designation, Plant, Daily Rate, Acc No, IFSC, Aadhaar. Existing codes are updated; blank cells keep current values.</p>
        <div className="row">
          <button className="btn" onClick={() => saveSheet('workers-template.xlsx', [{ 'Emp Code': 'E001', Name: 'Ramesh Kumar', Designation: 'Operator', Plant: 'Plant 1', 'Daily Rate': 650, 'Acc No': '123456789012', IFSC: 'SBIN0001234', Aadhaar: '123412341234' }])}>
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