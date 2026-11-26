import { CalendarCheck, Settings, Users } from 'lucide-react';
import { UNITS } from '@/types';
import type { Employee, Unit } from '@/types';
import PayrollLogo from './PayrollLogo';

export type Tab = 'payroll' | 'employees' | 'settings' | 'manage';
const items = [
  { id: 'payroll', label: 'Payroll', Icon: CalendarCheck },
  { id: 'employees', label: 'Employees', Icon: Users },
  { id: 'manage', label: 'Manage', Icon: Settings },
  { id: 'settings', label: 'Settings', Icon: Settings },
] as const;

export default function Sidebar({ tab, setTab, unit, setUnit, employees }: { tab: Tab; setTab: (t: Tab) => void; unit: Unit; setUnit: (u: Unit) => void; employees: Employee[] }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <PayrollLogo size={38} />
        <span>Payroll</span>
      </div>
      <div className="units" role="group" aria-label="Unit">
        {UNITS.map((u) => (
          <button key={u} className={unit === u ? 'unit on' : 'unit'} onClick={() => setUnit(u)}>
            {u}
            <small>{employees.filter((e) => e.unit === u && e.active).length} workers</small>
          </button>
        ))}
      </div>
      <nav>
        {items.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? 'nav on' : 'nav'} onClick={() => setTab(id)}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
