import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppDB, Unit } from '@/types';
import { loadDB, saveDB } from '@/utils/storage';
import { getToken, join, pull, push, setToken } from '@/utils/cloud';
import Header from './components/layout/Header';
import type { Period } from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import type { Tab } from './components/layout/Sidebar';
import EmployeeManager from './components/employees/EmployeeManager';
import PayrollGrid from './components/payroll/PayrollGrid';
import ManageData from './components/manage/ManageData';

type Sync = 'boot' | 'login' | 'error' | 'saved' | 'saving' | 'offline';

export default function App() {
  const [db, setDb] = useState<AppDB>(loadDB);
  const [sync, setSync] = useState<Sync>(getToken() ? 'boot' : 'login');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<Tab>('payroll');
  const [unit, setUnit] = useState<Unit>('Plant 1');
  const [period, setPeriod] = useState<Period>(() => ({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }));
  const dbRef = useRef(db);
  const timer = useRef<number>();
  const live = useRef(false);
  const dirty = useRef(false);
  dbRef.current = db;

  const load = useCallback(async () => {
    setSync('boot');
    try {
      const items = await pull();
      const cloud = items.length ? join(items) : null;
      const local = loadDB();
      const next = !cloud || (!cloud.employees.length && local.employees.length > 0) ? local : cloud;
      setDb(next);
      live.current = true;
      setSync('saved');
    } catch (e) {
      if ((e as Error).message === 'AUTH') { setToken(''); setErr('Wrong password'); setSync('login'); }
      else setSync('error');
    }
  }, []);

  const flush = useCallback(async () => {
    if (!live.current) return;
    try {
      if ((await push(dbRef.current)) === 'conflict') {
        if (confirm('Another PC saved newer data.\n\nOK = load their data (your last change is dropped).\nCancel = keep mine and overwrite.')) setDb(join(await pull()));
        else { await pull(); await push(dbRef.current); }
      }
      dirty.current = false;
      setSync('saved');
    } catch (e) {
      setSync((e as Error).message === 'AUTH' ? 'login' : 'offline');
    }
  }, []);

  useEffect(() => { if (getToken()) load(); }, [load]);

  useEffect(() => {
    saveDB(db);
    if (!live.current) return;
    dirty.current = true;
    setSync('saving');
    clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 1200);
  }, [db, flush]);

  useEffect(() => {
    Object.assign(window, { __sync: { flush } });
    const refresh = async () => {
      if (!live.current || dirty.current || document.hidden) return;
      try {
        const n = join(await pull());
        if (JSON.stringify(n) !== JSON.stringify(dbRef.current)) setDb(n);
        setSync('saved');
      } catch { /* offline */ }
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', flush);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('online', flush); };
  }, [flush]);

  if (sync === 'login')
    return (
      <div className="overlay" style={{ background: 'var(--ink)' }}>
        <form className="modal" onSubmit={(e) => { e.preventDefault(); setToken(pw.trim()); setErr(''); load(); }}>
          <h3>Payroll login</h3>
          <p className="muted">Enter the shared company password.</p>
          <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} style={{ width: '100%' }} />
          {err && <p className="err">{err}</p>}
          <div className="row end"><button className="btn primary">Open</button></div>
        </form>
      </div>
    );

  if (sync === 'boot' || sync === 'error')
    return (
      <div className="overlay" style={{ background: 'var(--ink)', color: '#fff' }}>
        {sync === 'boot' ? 'Loading…' : <div className="row">Cannot reach server. <button className="btn" onClick={load}>Retry</button></div>}
      </div>
    );

  return (
    <div className="app">
      <Sidebar tab={tab} setTab={setTab} unit={unit} setUnit={setUnit} employees={db.employees} />
      <div className="main">
        <Header period={period} setPeriod={setPeriod} db={db} setDb={setDb} />
        <main>
          {tab === 'payroll' && <PayrollGrid key={`${period.month}-${period.year}-${unit}`} db={db} setDb={setDb} period={period} unit={unit} />}
          {tab === 'manage' && <ManageData db={db} setDb={setDb} period={period} />}
          {tab === 'settings' && <CompanySettings db={db} setDb={setDb} />}
        </main>
      </div>
      <div style={{ position: 'fixed', right: 14, bottom: 10, fontSize: 12, padding: '3px 10px', borderRadius: 10, zIndex: 30, color: 'var(--ink)', background: sync === 'saved' ? '#e1f3e8' : sync === 'offline' ? '#fde2e0' : '#fff7ed' }}>
        {sync === 'saved' ? '☁ Synced' : sync === 'saving' ? '☁ Saving…' : '⚠ Offline, will sync'}
      </div>
    </div>
  );
}