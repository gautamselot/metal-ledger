import { useState } from 'react';
import { FileUp } from 'lucide-react';
import type { ImportedPayout } from '@/types';
import { pick, readRows, saveSheet } from '@/utils/sheet';

export default function BulkPayoutUpload({ onApply }: { onApply: (p: ImportedPayout[]) => string }) {
  const [msg, setMsg] = useState('');
  const load = async (f?: File) => {
    if (!f) return;
    try {
      const list = (await readRows(f))
        .map((r) => ({ name: pick(r, 'name', 'employeename', 'workername'), targetPayout: Number(pick(r, 'targetpayout', 'payout', 'amount', 'netpay')) }))
        .filter((p) => p.name && p.targetPayout > 0);
      setMsg(list.length ? onApply(list) : 'No rows found. Needs Name and Target Payout columns.');
    } catch {
      setMsg('Could not read this file.');
    }
  };
  return (
    <div className="row">
      <label className="btn"><FileUp size={16} /> Upload payouts
        <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { load(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      <button className="link" onClick={() => saveSheet('payout-template.xlsx', [{ Name: 'Ramesh Kumar', 'Target Payout': 15000 }])}>Sample file</button>
      {msg && <span className="muted">{msg}</span>}
    </div>
  );
}
