import { Download, Upload } from 'lucide-react';
import type { AppDB, SetDB } from '@/types';
import { MONTHS } from '@/utils/reverseCalculator';
import { exportJSON, importJSON } from '@/utils/storage';

export interface Period { month: number; year: number }

export default function Header({ period, setPeriod, db, setDb }: { period: Period; setPeriod: (p: Period) => void; db: AppDB; setDb: SetDB }) {
  const y = new Date().getFullYear();
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
    <header className="topbar">
      <div className="row">
        <select value={period.month} onChange={(e) => setPeriod({ ...period, month: +e.target.value })} aria-label="Month">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={period.year} onChange={(e) => setPeriod({ ...period, year: +e.target.value })} aria-label="Year">
          {Array.from({ length: 7 }, (_, k) => y - 3 + k).map((v) => <option key={v}>{v}</option>)}
        </select>
      </div>
      <div className="row">
        <button className="btn" onClick={() => exportJSON(db)}><Download size={16} /> Backup</button>
        <label className="btn">
          <Upload size={16} /> Restore
          <input type="file" accept=".json" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      </div>
    </header>
  );
}
