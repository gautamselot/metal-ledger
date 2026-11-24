import { CalendarCheck, Settings, Users } from 'lucide-react';
import type { AppSettings } from '@/types';
import MetalLedgerLogo from './MetalLedgerLogo';

export type Tab = 'payroll' | 'employees' | 'settings';
const items = [
  { id: 'payroll', label: 'Payroll', Icon: CalendarCheck },
  { id: 'employees', label: 'Employees', Icon: Users },
  { id: 'settings', label: 'Company settings', Icon: Settings },
] as const;

export default function Sidebar({ tab, setTab, settings }: { tab: Tab; setTab: (t: Tab) => void; settings: AppSettings }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <MetalLedgerLogo size={38} />
        <span>MetalLedger</span>
      </div>
      <nav>
        {items.map(({ id, label, Icon }) => (
          <button key={id} className={tab === id ? 'nav on' : 'nav'} onClick={() => setTab(id)}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </nav>
      <div className="badge">
        {settings.logoBase64 ? <img src={settings.logoBase64} alt="" /> : <div className="ph">{settings.companyName.slice(0, 1)}</div>}
        <div>
          <b>{settings.companyName}</b>
          <small>{settings.address || 'Add address in settings'}</small>
        </div>
      </div>
    </aside>
  );
}
