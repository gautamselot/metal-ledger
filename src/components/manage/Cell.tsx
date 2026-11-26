import { useEffect, useState } from 'react';

export type Check = (v: string) => string | void;

export default function Cell({ v, onSave, w = 110, num }: { v: string | number; onSave: Check; w?: number; num?: boolean }) {
  const [t, setT] = useState(String(v));
  useEffect(() => setT(String(v)), [v]);
  const done = () => {
    if (t === String(v)) return;
    const e = onSave(t);
    if (e) { alert(e); setT(String(v)); }
  };
  return (
    <input
      className="cell"
      style={{ width: w, textAlign: num ? 'right' : 'left' }}
      inputMode={num ? 'numeric' : undefined}
      value={t}
      onChange={(e) => setT(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}