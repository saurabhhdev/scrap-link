import React, { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../services/api';
import { useI18n } from '../../i18n/I18nContext';

type LedgerTransaction = {
  transactionId: string; pickupId: string; occurredAt: string;
  materials: { material: string; label: string; weightKg: number; value: number }[];
  weightKg: number; amount: number; currency: string; status: 'paid' | 'pending' | 'failed';
  payment: { method: string; provider: string; status: string; paidAt: string | null };
};
type LedgerData = {
  summary: { totalEarnings: number; paidAmount: number; pendingAmount: number; failedAmount: number; transactionCount: number; totalWeightKg: number };
  monthly: { month: string; total: number; paid: number; pending: number; failed: number }[];
  byMaterial: { material: string; label: string; amount: number; weightKg: number; transactions: number }[];
  transactions: LedgerTransaction[];
  materialOptions: string[];
};
const MATERIALS = ['paper', 'cardboard', 'pet_plastic', 'hdpe', 'metal', 'copper', 'aluminium', 'e_waste', 'glass'];
const MATERIAL_LABELS: Record<string, string> = { paper:'Paper',cardboard:'Cardboard',pet_plastic:'PET plastic',hdpe:'HDPE plastic',metal:'Metal',copper:'Copper',aluminium:'Aluminium',e_waste:'E-waste',glass:'Glass' };
const formatMoney = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);
const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const monthLabel = (value: string) => new Date(`${value}-01T00:00:00.000Z`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });

export const CollectorEarningsLedger: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('all');
  const [material, setMaterial] = useState('all');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams();
      if (from) query.set('from', from);
      if (to) query.set('to', to);
      if (status !== 'all') query.set('status', status);
      if (material !== 'all') query.set('material', material);
      setData(await api<LedgerData>(`/collector/ledger?${query.toString()}`));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load the earnings ledger.'); }
    finally { setLoading(false); }
  }, [from, to, status, material]);
  useEffect(() => { void load(); }, [load]);

  return <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{t('finance')}</p><h2 className="mt-1 text-xl font-black text-slate-900">{t('earningsLedger')}</h2><p className="mt-1 text-sm text-slate-600">{t('ledgerHelp')}</p></div><button type="button" onClick={()=>void load()} className="min-h-11 self-start rounded-lg border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">{t('refresh')}</button></div>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      {label:t('totalEarnings'),value:formatMoney(data?.summary.totalEarnings||0),tone:'text-slate-900'},
      {label:t('paid'),value:formatMoney(data?.summary.paidAmount||0),tone:'text-emerald-700'},
      {label:t('pending'),value:formatMoney(data?.summary.pendingAmount||0),tone:'text-amber-700'},
      {label:t('transactionsWeight'),value:`${data?.summary.transactionCount||0} · ${(data?.summary.totalWeightKg||0).toLocaleString('en-IN')} kg`,tone:'text-indigo-700'}
    ].map(metric=><article key={metric.label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">{metric.label}</p><p className={`mt-2 text-xl font-black ${metric.tone}`}>{metric.value}</p></article>)}</div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-sm font-bold text-slate-700">{t('from')}<input aria-label={t('from')} type="date" value={from} onChange={e=>setFrom(e.target.value)} className="clean-input mt-1 block w-full"/></label><label className="text-sm font-bold text-slate-700">{t('to')}<input aria-label={t('to')} type="date" value={to} onChange={e=>setTo(e.target.value)} className="clean-input mt-1 block w-full"/></label><label className="text-sm font-bold text-slate-700">{t('paymentStatus')}<select aria-label={t('paymentStatus')} value={status} onChange={e=>setStatus(e.target.value)} className="clean-input mt-1 block w-full"><option value="all">{t('allStatuses')}</option><option value="paid">{t('paid')}</option><option value="pending">{t('pending')}</option><option value="failed">{t('failed')}</option></select></label><label className="text-sm font-bold text-slate-700">{t('material')}<select aria-label={t('material')} value={material} onChange={e=>setMaterial(e.target.value)} className="clean-input mt-1 block w-full"><option value="all">{t('allMaterials')}</option>{[...new Set([...(data?.materialOptions||[]),...MATERIALS])].map(key=><option key={key} value={key}>{MATERIAL_LABELS[key]||key}</option>)}</select></label></div>
    {loading?<div className="py-10 text-center text-base font-semibold text-slate-600">{t('loading')}</div>:<>
      <div className="grid gap-4 xl:grid-cols-2"><article className="rounded-2xl border border-slate-200 p-4"><h3 className="font-bold text-slate-900">{t('monthlyEarnings')}</h3><p className="mt-1 text-sm text-slate-600">{t('monthlyHelp')}</p><div className="mt-4 h-64">{data?.monthly.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tickFormatter={monthLabel} tickLine={false} axisLine={false} fontSize={11}/><YAxis tickFormatter={value=>`₹${Number(value).toLocaleString('en-IN')}`} tickLine={false} axisLine={false} fontSize={10} width={68}/><Tooltip labelFormatter={value=>monthLabel(String(value))} formatter={value=>formatMoney(Number(value))}/><Legend/><Bar dataKey="paid" name={t('paid')} stackId="earnings" fill="#16835d" radius={[3,3,0,0]}/><Bar dataKey="pending" name={t('pending')} stackId="earnings" fill="#e9a23b"/><Bar dataKey="failed" name={t('failed')} stackId="earnings" fill="#dc6262"/></BarChart></ResponsiveContainer>:<div className="grid h-full place-items-center text-sm text-slate-500">{t('noChartData')}</div>}</div></article>
        <article className="rounded-2xl border border-slate-200 p-4"><h3 className="font-bold text-slate-900">Earnings by material</h3><p className="mt-1 text-xs text-slate-500">Recorded transaction value split across collected materials</p><div className="mt-4 h-64">{data?.byMaterial.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={data.byMaterial} layout="vertical" margin={{ left: 8, right: 16 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tickFormatter={value=>`₹${Number(value).toLocaleString('en-IN')}`} tickLine={false} axisLine={false} fontSize={10}/><YAxis type="category" dataKey="label" width={130} tickLine={false} axisLine={false} fontSize={10}/><Tooltip formatter={(value, name)=>name==='amount'?formatMoney(Number(value)):`${Number(value).toFixed(1)} kg`}/><Bar dataKey="amount" name="Value" fill="#4f63bd" radius={[0,5,5,0]}/></BarChart></ResponsiveContainer>:<div className="grid h-full place-items-center text-xs text-slate-400">No material breakdown for this filter.</div>}</div></article></div>
      {data?.summary.failedAmount ? <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-800">Failed payments awaiting reconciliation: {formatMoney(data.summary.failedAmount)}.</p>:null}
        <div className="overflow-hidden rounded-2xl border border-slate-200"><div className="border-b border-slate-100 px-4 py-3"><h3 className="font-bold text-slate-900">Transaction history</h3></div>{data?.transactions.length?<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date / transaction</th><th className="px-4 py-3">Material</th><th className="px-4 py-3">Weight</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{data.transactions.map(row=><tr key={row.transactionId}><td className="px-4 py-3"><strong className="block text-slate-800">{formatDate(row.occurredAt)}</strong><span className="mt-1 block font-mono text-[10px] text-slate-400">{row.transactionId} · {row.pickupId}</span></td><td className="px-4 py-3 text-slate-700">{row.materials.map(line=>line.label).join(', ')||'Collection'}</td><td className="px-4 py-3 font-mono">{row.weightKg.toFixed(1)} kg</td><td className="px-4 py-3 font-mono font-bold text-slate-900">{formatMoney(row.amount)}</td><td className="px-4 py-3 text-slate-600">{row.payment.method}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${row.status==='paid'?'bg-emerald-50 text-emerald-800':row.status==='failed'?'bg-rose-50 text-rose-800':'bg-amber-50 text-amber-800'}`}>{row.status}</span></td></tr>)}</tbody></table></div>:<div className="p-8 text-center text-sm text-slate-500">No collection transactions match these filters.</div>}</div>
      <p className="text-[11px] leading-relaxed text-slate-400">Payment records are provider-neutral. UPI and Jan-Dhan entries remain pending until an authorized settlement is recorded; gateway integrations can be connected through the payment provider adapter.</p>
    </>}
  </section>;
};
