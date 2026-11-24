import { useState } from 'react';
import { X } from 'lucide-react';
import type { AppSettings, DayEntry, Employee, PayrollRecord } from '@/types';
import { MONTHS, recalc } from '@/utils/reverseCalculator';

export default function DayEditorDrawer({ rec, emp, s, onSave, onClose }: { rec: PayrollRecord; emp: Employee; s: AppSettings; onSave: (r: PayrollRecord) => void; onClose: () => void }) {
  const [days, setDays] = useState<DayEntry[]>(rec.days);
  const cur = recalc({ ...rec, days }, s.shiftHours);
  const toggle = (n: number) => setDays((d) => d.map((x): DayEntry => (x.day === n ? { ...x, status: x.status === 'P' ? 'A' : 'P', otHours: 0 } : x)));
  const setOT = (n: number, v: number) =>
    setDays((d) => d.map((x): DayEntry => (x.day === n ? { ...x, otHours: Math.min(s.maxOTPerDay, Math.max(0, Math.round(v * 2) / 2)) } : x)));
  const wd = (n: number) => new Date(rec.year, rec.month - 1, n).toLocaleDateString('en-IN', { weekday: 'short' });

  return (
    <div className="overlay right" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="mh">
          <div><h3>{emp.name}</h3><span className="muted">{emp.empCode} · {MONTHS[rec.month - 1]} {rec.year} · target ₹{rec.targetPayout.toLocaleString('en-IN')}</span></div>
          <button className="icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="muted">Tap a day to switch present/absent. Set overtime hours on present days.</p>
        <div className="days">
          {days.map((d) => (
            <div key={d.day} className={d.status === 'P' ? 'day p' : 'day a'}>
              <button onClick={() => toggle(d.day)}>
                <b>{d.day}</b><small>{wd(d.day)}</small><span>{d.status}</span>
              </button>
              <input type="number" step={0.5} min={0} max={s.maxOTPerDay} disabled={d.status === 'A'} value={d.otHours || ''} placeholder="OT" onChange={(e) => setOT(d.day, +e.target.value)} aria-label={`OT hours day ${d.day}`} />
            </div>
          ))}
        </div>
        <dl className="sum">
          <div><dt>Present</dt><dd>{cur.presentDays}</dd></div>
          <div><dt>Absent</dt><dd>{cur.absentDays}</dd></div>
          <div><dt>OT hours</dt><dd>{cur.otHours}</dd></div>
          <div><dt>OT pay</dt><dd>₹{cur.otPay.toLocaleString('en-IN')}</dd></div>
          <div><dt>Adjustment</dt><dd className={cur.adjustment < 0 ? 'neg' : ''}>₹{cur.adjustment.toLocaleString('en-IN')}</dd></div>
        </dl>
        {cur.adjustment < 0 && <p className="err">Attendance and overtime exceed the target by ₹{(-cur.adjustment).toLocaleString('en-IN')}. Remove a present day or some overtime.</p>}
        <div className="row end">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={cur.adjustment < 0} onClick={() => { onSave(cur); onClose(); }}>Save changes</button>
        </div>
      </aside>
    </div>
  );
}
