import type { AppDB, AppSettings, OTMultiplier, SetDB } from '@/types';

export default function CompanySettings({ db, setDb }: { db: AppDB; setDb: SetDB }) {
  const s = db.settings;
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setDb((d) => ({ ...d, settings: { ...d.settings, [k]: v } }));
  const onLogo = (f?: File) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g|gif)$/.test(f.type)) return alert('Use a PNG or JPG logo.');
    if (f.size > 500_000) return alert('Logo must be under 500 KB.');
    const r = new FileReader();
    r.onload = () => set('logoBase64', String(r.result));
    r.readAsDataURL(f);
  };
  return (
    <section>
      <div className="bar"><h2>Company settings</h2></div>
      <div className="card form">
        <label>Company name<input value={s.companyName} onChange={(e) => set('companyName', e.target.value)} /></label>
        <label>Address<input value={s.address} onChange={(e) => set('address', e.target.value)} /></label>
        <label>Standard shift (hours)<input type="number" min={1} value={s.shiftHours} onChange={(e) => set('shiftHours', Math.max(1, +e.target.value))} /></label>
        <label>Default OT rate
          <select value={s.defaultOTMultiplier} onChange={(e) => set('defaultOTMultiplier', +e.target.value as OTMultiplier)}>
            <option value={1}>1.0×</option><option value={1.5}>1.5×</option><option value={2}>2.0×</option>
          </select>
        </label>
      
        <div className="logo">
          <span>Company logo</span>
          {s.logoBase64 && <img src={s.logoBase64} alt="Company logo" />}
          <div className="row">
            <label className="btn">{s.logoBase64 ? 'Replace logo' : 'Upload logo'}<input type="file" accept="image/png,image/jpeg,image/gif" hidden onChange={(e) => onLogo(e.target.files?.[0])} /></label>
            {s.logoBase64 && <button className="btn" onClick={() => set('logoBase64', undefined)}>Remove</button>}
          </div>
          <small className="muted">Shown in the sidebar and the Excel header. PNG or JPG, under 500 KB.</small>
        </div>
      </div>
    </section>
  );
}
