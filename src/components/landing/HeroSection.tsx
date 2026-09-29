import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, QrCode, Search, Truck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HeroSection: React.FC = () => {
  const { setActiveTab, viewWasteDetails } = useApp();
  const [trackInput, setTrackInput] = useState('');

  const handleTrackSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (trackInput.trim()) viewWasteDetails(trackInput.trim().toUpperCase());
  };

  return (
    <section className="border-b border-[#dfe5dc] bg-[#f7f7f2] py-16 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#c9ddc9] bg-[#edf5e9] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#365a4e] shadow-[0_0_24px_rgba(107,166,105,0.18)] sm:text-xs">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#73a96e] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#4e8a56] shadow-[0_0_10px_rgba(78,138,86,0.75)]" />
            </span>
            <span className="live-glow-copy">Household scrap, properly connected</span>
          </p>
          <h1 className="text-4xl font-semibold tracking-[-0.045em] text-[#173d35] sm:text-5xl lg:text-6xl">A clearer way to recycle your scrap.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Book a doorstep pickup, receive a digital collection record, and follow your material through the recycling journey.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => setActiveTab('schedule')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#173d35] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#285247]"><Truck className="h-4 w-4" />Book a pickup<ArrowRight className="h-4 w-4" /></button>
            <button onClick={() => setActiveTab('rates')} className="rounded-lg border border-[#cdd7cb] bg-white px-5 py-3 text-sm font-semibold text-[#365a4e] transition hover:bg-[#edf1ea]">Check material rates</button>
          </div>
        </div>
        <div className="rounded-2xl border border-[#dfe5dc] bg-white p-6 shadow-[0_16px_45px_-30px_rgba(23,61,53,0.35)] sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e8f0e7] text-[#365a4e]"><QrCode className="h-5 w-5" /></div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">Track a collection</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Enter the collection ID from your receipt to view its recorded status.</p>
          <form onSubmit={handleTrackSubmit} className="mt-5 flex gap-2"><label className="sr-only" htmlFor="collection-id">Collection ID</label><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input id="collection-id" value={trackInput} onChange={(event) => setTrackInput(event.target.value)} placeholder="Enter collection ID" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm uppercase outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></div><button type="submit" disabled={!trackInput.trim()} className="rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Track</button></form>
          <div className="mt-7 border-t border-slate-100 pt-5 text-sm text-slate-600"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Transparent collection records</div><div className="mt-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Clear pickup and processing status</div></div>
        </div>
      </div>
    </section>
  );
};
