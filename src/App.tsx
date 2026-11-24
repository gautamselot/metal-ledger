import { useEffect, useState } from 'react';
import type { AppDB } from '@/types';
import { loadDB, saveDB } from '@/utils/storage';
import Header from './components/layout/Header';
import type { Period } from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import type { Tab } from './components/layout/Sidebar';
import EmployeeManager from './components/employees/EmployeeManager';
import PayrollGrid from './components/payroll/PayrollGrid';
import CompanySettings from './components/settings/CompanySettings';

export default function App() {
  const [db, setDb] = useState<AppDB>(loadDB);
  const [tab, setTab] = useState<Tab>('payroll');
  const [period, setPeriod] = useState<Period>(() => ({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }));
  useEffect(() => saveDB(db), [db]);

  return (
    <div className="app">
      <Sidebar tab={tab} setTab={setTab} settings={db.settings} />
      <div className="main">
        <Header period={period} setPeriod={setPeriod} db={db} setDb={setDb} />
        <main>
          {tab === 'payroll' && <PayrollGrid key={`${period.month}-${period.year}`} db={db} setDb={setDb} period={period} />}
          {tab === 'employees' && <EmployeeManager db={db} setDb={setDb} />}
          {tab === 'settings' && <CompanySettings db={db} setDb={setDb} />}
        </main>
      </div>
    </div>
  );
}
