import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

type MatchReason = { key: string; label: string; detail: string; score: number; weight: number };
type RecyclerMatch = { facilityId: string; name: string; city: string; distanceKm: number | null; serviceRadiusKm: number; verificationStatus: string; compatibleMaterials: string[]; score: number; reasons: MatchReason[] };
type MatchResponse = { pickupId: string; strategy: string; weights: Record<string, number>; matches: RecyclerMatch[] };

export const RecyclerMatches: React.FC<{ pickupId: string }> = ({ pickupId }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MatchResponse | null>(null);
  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (loaded) return;
    setLoading(true); setError('');
    try { setResult(await api<MatchResponse>(`/pickups/${encodeURIComponent(pickupId)}/recycler-matches`)); setLoaded(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Recycler matches could not be loaded.'); }
    finally { setLoading(false); }
  };
  return <div className="rounded-xl border border-indigo-100 bg-indigo-50/50">
    <button type="button" aria-expanded={open} onClick={() => void toggle()} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-indigo-900"><span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4"/>Why recyclers match this pickup</span>{open?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</button>
    {open&&<div className="space-y-3 border-t border-indigo-100 p-3">{loading&&<p className="text-xs text-slate-500">Comparing compatible facilities…</p>}{error&&<p role="alert" className="text-xs text-rose-700">{error}</p>}{result?.matches.length===0&&!loading&&!error&&<p className="text-xs text-slate-600">No facility currently meets the material and service area requirements.</p>}{result?.matches.map((match,index)=><article key={match.facilityId} className="rounded-lg border border-white bg-white p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{match.name}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><MapPin className="h-3 w-3"/>{match.city}{match.distanceKm===null?' · distance unavailable':` · ${match.distanceKm} km away`} · {match.serviceRadiusKm} km service radius</p></div><span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800">{match.score}%</span></div><div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-700"><ShieldCheck className="h-3 w-3"/>{match.verificationStatus}</span>{match.compatibleMaterials.map(value=><span key={value} className="rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-800">{value.replaceAll('_',' ')}</span>)}</div><ul className="mt-3 space-y-1.5">{match.reasons.map(reason=><li key={reason.key} className="text-[11px] leading-relaxed text-slate-600"><div className="flex items-center justify-between gap-2"><span className="font-semibold text-slate-800">{reason.label}</span><span className="shrink-0 font-mono text-[10px] text-slate-400">{reason.score}/100 · weight {Math.round(reason.weight*100)}%</span></div><p>{reason.detail}</p></li>)}</ul>{index===0&&<p className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400">Top result · score uses weighted-v1 criteria</p>}</article>)}<p className="text-[10px] leading-relaxed text-slate-400">Scores explain fit for this request; collectors choose whether to accept a pickup. A missing coordinate uses same-city fallback and is shown as unknown distance.</p></div>}
  </div>;
};
