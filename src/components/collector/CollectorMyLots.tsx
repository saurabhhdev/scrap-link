import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Package } from 'lucide-react';
import { api } from '../../services/api';

type Lot = { _id: string; material: string; weightKg: number; condition: string; estimatedValue: number; quotedRate: number; status: string; location: { address: string; city: string }; createdAt: string };

export const CollectorMyLots: React.FC = () => {
  const [lots, setLots] = useState<Lot[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const result = await api<{ lots: Lot[] }>('/lots'); setLots(result.lots); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load your lots.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const refresh = () => void load(); window.addEventListener('platform:update', refresh); return () => window.removeEventListener('platform:update', refresh); }, [load]);
  return <section className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <header className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-900">My scrap lots</h2><p className="mt-1 text-xs text-slate-500">Lots saved for your collector account in MongoDB.</p></header>
    {error && <p role="alert" className="p-5 text-sm text-rose-700">{error}</p>}
    {!error && lots.length === 0 ? <div className="p-10 text-center"><Package className="mx-auto h-8 w-8 text-slate-300"/><p className="mt-3 font-semibold text-slate-800">No lots created yet</p></div> : <div className="divide-y divide-slate-100">{lots.map((lot) => <article key={lot._id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold capitalize text-slate-900">{lot.material.replaceAll('_', ' ')}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-600"><MapPin className="h-3.5 w-3.5"/>{lot.location.city} · {lot.location.address}</p><p className="mt-1 text-xs text-slate-500">{lot.weightKg} kg · {lot.condition} · ₹{lot.quotedRate}/kg reference</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-800">{lot.status.replaceAll('_', ' ')}</span><span className="text-sm font-bold text-slate-900">₹{lot.estimatedValue.toLocaleString('en-IN')}</span></div></article>)}</div>}
  </section>;
};
