import React from 'react';
import { ArrowRight, ClipboardList, Info, Scale } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ScrapRateCalculator: React.FC = () => {
  const { wasteCategories, setActiveTab } = useApp();
  const rates = wasteCategories.filter((material) => material.ratePerKg > 0);
  const hasRates = rates.length > 0;

  return <div className="min-h-[calc(100vh-4rem)] bg-[#f7faf8] py-10"><div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
    <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Pricing</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Material rates</h1><p className="mt-3 text-sm leading-6 text-slate-600">Rates are published only when they have been confirmed for your service area. Your final collection receipt always shows the measured weight and agreed value.</p></div>
    {hasRates ? <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="divide-y divide-slate-100">{rates.map((rate) => <div key={rate.id} className="flex items-center justify-between px-6 py-4"><div><p className="font-semibold text-slate-900">{rate.name}</p><p className="mt-1 text-sm text-slate-500">{rate.id.replaceAll('_', ' ')}</p></div><p className="font-semibold text-slate-900">₹{rate.ratePerKg.toFixed(1)} / {rate.unit}</p></div>)}</div></div> : <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><Scale className="mx-auto h-9 w-9 text-emerald-700" /><h2 className="mt-5 text-xl font-bold text-slate-900">Rates are not available yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">No price observations have been saved for active materials. Rates will appear here when an administrator adds database records.</p><button onClick={() => setActiveTab('schedule')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"><ClipboardList className="h-4 w-4" />Request a pickup<ArrowRight className="h-4 w-4" /></button></div>}
    <div className="mt-6 flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"><Info className="h-4 w-4 shrink-0 text-emerald-700" /><p>Final value depends on material type, cleanliness, and the verified weight recorded at collection.</p></div>
  </div></div>;
};
