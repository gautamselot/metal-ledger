import { useState } from 'react';
import { X } from 'lucide-react';
import type { AppSettings, DayEntry, Employee, PayrollRecord } from '@/types';
import { MONTHS, recalc } from '@/utils/reverseCalculator';

const inr = (n: number) => n.toLocaleString('en-IN');

export default function DayEditorDrawer({ rec, emp, s, onSave, onClose }: { rec: PayrollRecord; emp: Employee; s: AppSettings; onSave: (r: PayrollRecord) => void; onClose: () => void }) {
  const [days, setDays] = useState<DayEntry[]>(rec.days);
  const cur = recalc({ ...rec, days }, s.shiftHours);
  const toggle = (n: number) => setDays((d) => d.map((x): DayEntry => (x.day === n ? { ...x, status: x.status === 'P' ? 'A' : 'P' } : x)));
  const wd = (n: number) => new Date(rec.year, rec.month - 1, n).toLocaleDateString('en-IN', { weekday: 'short' });

  return (
    <div className="overlay right" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="mh">
          <div><h3>{emp.name}</h3><span className="muted">{emp.empCode} · {MONTHS[rec.month - 1]} {rec.year}</span></div>
          <button className="icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="muted">Tap a day to switch present/absent. Net payout stays fixed; OT pay is whatever is above the days' pay.</p>
        <div className="days">
          {days.map((d) => (
            <div key={d.day} className={d.status === 'P' ? 'day p' : 'day a'}>
              <button onClick={() => toggle(d.day)}>
                <b>{d.day}</b><small>{wd(d.day)}</small><span>{d.status}</span>
              </button>
            </div>
          ))}
        </div>
        <dl className="sum">
          <div><dt>Present</dt><dd>{cur.presentDays}</dd></div>
          <div><dt>Absent</dt><dd>{cur.absentDays}</dd></div>
          <div><dt>OT pay</dt><dd className={cur.otPay < 0 ? 'neg' : ''}>₹{inr(cur.otPay)}</dd></div>
          <div><dt>Net payout</dt><dd>₹{inr(rec.targetPayout)}</dd></div>
        </dl>
        {cur.otPay < 0 && <p className="err">Present days exceed the payout by ₹{inr(-cur.otPay)}. Mark a day absent.</p>}
        <div className="row end">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={cur.otPay < 0} onClick={() => { onSave(cur); onClose(); }}>Save changes</button>
        </div>
      </aside>
    </div>
  );
}