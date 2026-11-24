import { useEffect, useState } from 'react';
import type { AppDB, Unit } from '@/types';
import { loadDB, saveDB } from '@/utils/storage';
import Header from './components/layout/Header';
import type { Period } from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import type { Tab } from './components/layout/Sidebar';
import EmployeeManager from './components/employees/EmployeeManager';
import PayrollGrid from './components/payroll/PayrollGrid';

export default function App() {
  const [db, setDb] = useState<AppDB>(loadDB);
  const [tab, setTab] = useState<Tab>('payroll');
  const [unit, setUnit] = useState<Unit>('Supa');
  const [period, setPeriod] = useState<Period>(() => ({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }));
  useEffect(() => saveDB(db), [db]);

  return (
    <div className="app">
      <Sidebar tab={tab} setTab={setTab} unit={unit} setUnit={setUnit} employees={db.employees} />
      <div className="main">
        <Header period={period} setPeriod={setPeriod} db={db} setDb={setDb} />
        <main>
          {tab === 'payroll' && <PayrollGrid key={`${period.month}-${period.year}-${unit}`} db={db} setDb={setDb} period={period} unit={unit} />}
          {tab === 'employees' && <EmployeeManager db={db} setDb={setDb} unit={unit} />}
        </main>
      </div>
    </div>
  );
}
