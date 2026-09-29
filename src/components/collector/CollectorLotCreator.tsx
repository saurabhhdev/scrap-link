import React, { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, PackagePlus } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

type Material = { id: string; name: string; ratePerKg: number };
type LotResponse = { lot: { _id: string; material: string; weightKg: number; estimatedValue: number }; batchId: string };

export const CollectorLotCreator: React.FC = () => {
  const { currentUser } = useApp();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [material, setMaterial] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [condition, setCondition] = useState<'clean' | 'mixed' | 'damaged'>('mixed');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(currentUser?.ward || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<LotResponse['lot'] | null>(null);

  useEffect(() => {
    let active = true;
    void api<{ materials: Material[] }>('/catalog').then((data) => {
      if (!active) return;
      setMaterials(data.materials);
      setMaterial((current) => current || data.materials[0]?.id || '');
    }).catch((requestError) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load the material catalog.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setCreated(null);
    try {
      const data = await api<LotResponse>('/lots', { method: 'POST', body: JSON.stringify({ material, weightKg: Number(weightKg), condition, address, city }) });
      setCreated(data.lot); setWeightKg(''); setAddress('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not create the scrap lot.');
    } finally { setSaving(false); }
  };

  return <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-800"><PackagePlus size={18}/></span><div><h2 className="font-bold text-slate-900">Create scrap lot</h2><p className="mt-1 text-xs text-slate-500">Publish a measured lot to verified recyclers who accept its material.</p></div></div>
    {error && <p role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
    {created && <p role="status" className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"><CheckCircle2 size={15}/>Lot saved to MongoDB and published to matching recycler portals · {created.weightKg} kg</p>}
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs font-semibold text-slate-700">Material<select required value={material} onChange={(event) => setMaterial(event.target.value)} disabled={loading || !materials.length} className="clean-input mt-1 block w-full"><option value="" disabled>Select material</option>{materials.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · ₹{entry.ratePerKg}/kg reference</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-700">Measured weight (kg)<input required min="0.1" max="10000" step="0.1" type="number" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} className="clean-input mt-1 block w-full" placeholder="e.g. 18.5"/></label>
      <label className="text-xs font-semibold text-slate-700">Condition<select value={condition} onChange={(event) => setCondition(event.target.value as typeof condition)} className="clean-input mt-1 block w-full"><option value="clean">Clean</option><option value="mixed">Mixed</option><option value="damaged">Damaged</option></select></label>
      <label className="text-xs font-semibold text-slate-700 sm:col-span-2">Pickup area / address<input required maxLength={250} value={address} onChange={(event) => setAddress(event.target.value)} className="clean-input mt-1 block w-full" placeholder="Locality and pickup point"/></label>
      <label className="text-xs font-semibold text-slate-700">City<input required maxLength={80} value={city} onChange={(event) => setCity(event.target.value)} className="clean-input mt-1 block w-full" placeholder="City"/></label>
      <div className="flex items-end sm:col-span-2 lg:col-span-3"><button type="submit" disabled={saving || loading || !materials.length} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{saving ? <LoaderCircle size={16} className="animate-spin"/> : <PackagePlus size={16}/>}Publish lot</button></div>
    </form>
  </section>;
};
