import React, { useState } from 'react';
import { 
  Building2, 
  Package, 
  CheckCircle2, 
  Scale, 
  Award, 
  Sparkles, 
  Clock, 
  FileCheck, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RecyclingBatch } from '../../types';
import { RecyclerMarketplace } from './RecyclerMarketplace';

export const RecyclerDashboard: React.FC = () => {
  const { 
    activeRecycler, 
    batches, 
    confirmBatchReceived, 
    processBatchAndIssueEPR, 
    viewWasteDetails 
  } = useApp();

  const [filterMaterial, setFilterMaterial] = useState<string>('all');

  const batchWeight = (matches: string[]) => batches.filter(batch => matches.some(value => batch.materialType.toLowerCase().includes(value))).reduce((total, batch) => total + batch.totalWeightKg, 0);
  const incomingPaperKg = batchWeight(['paper', 'pulp', 'cardboard']);
  const incomingPlasticKg = batchWeight(['plastic', 'polymer', 'pet', 'hdpe']);
  const incomingMetalKg = batchWeight(['metal', 'iron', 'copper', 'aluminium']);
  const incomingEWasteKg = batchWeight(['e-waste', 'electronic', 'pcb']);

  const filteredBatches = filterMaterial === 'all' 
    ? batches 
    : batches.filter(b => b.materialType.toLowerCase().includes(filterMaterial.toLowerCase()));

  return (
    <>
    <div className="py-8 bg-slate-50"><RecyclerMarketplace /></div>
    <div className="py-8 bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-indigo-700 flex items-center justify-center shadow-xs">
              <Building2 className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-slate-900">
                  {activeRecycler.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Verified Industrial Recycler ✓
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                License: <strong className="font-mono text-slate-700">{activeRecycler.cpcbLicenseNo}</strong> • {activeRecycler.location}
              </p>
              <div className="flex items-center space-x-2 text-xs text-slate-600 mt-1">
                <span className="text-emerald-700 font-semibold">{activeRecycler.totalTonsProcessed} Tons Processed</span>
                <span>•</span>
                <span className="text-indigo-700 font-semibold">{activeRecycler.eprCreditsIssued} EPR Credits Issued</span>
                <span>•</span>
                <span className="text-slate-400">ISCC PLUS & ISO 14001</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>CPCB EPR Portal Connected</span>
            </span>
          </div>
        </div>

        {/* Incoming Materials Overview Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Incoming Materials Queue</h2>
                <p className="text-xs text-slate-500">Recorded batch weights by material category</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Today's Batch Manifest</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block">Paper Products</span>
              <div className="text-2xl font-black text-amber-700 mt-1 font-mono">
                {incomingPaperKg} kg
              </div>
              <span className="text-[11px] text-slate-500">Old newspapers & books</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block">Polymers & Plastic</span>
              <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                {incomingPlasticKg} kg
              </div>
              <span className="text-[11px] text-slate-500">Sorted rPET & HDPE flakes</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block">Scrap Metal</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {incomingMetalKg} kg
              </div>
              <span className="text-[11px] text-slate-500">Iron, copper, aluminium</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs font-medium text-slate-500 block">Electronic Scrap</span>
              <div className="text-2xl font-black text-indigo-600 mt-1 font-mono">
                {incomingEWasteKg} kg
              </div>
              <span className="text-[11px] text-slate-500">PCBs & telecom parts</span>
            </div>
          </div>
        </div>

        {/* Recycling Batches Management Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Inbound & Processing Batches
              </h3>
              <p className="text-xs text-slate-500">
                Reconcile physical weights, certify purity grades, and issue blockchain-backed EPR credits.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-medium">Filter:</span>
              {(['all', 'polymer', 'pulp', 'metal'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterMaterial(f)}
                  className={`px-3 py-1.5 rounded-lg border capitalize transition-colors cursor-pointer ${
                    filterMaterial === f 
                      ? 'bg-slate-900 text-white font-bold border-slate-900' 
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Batches Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-6">Batch ID</th>
                  <th className="py-3.5 px-4">Material Type</th>
                  <th className="py-3.5 px-4">Quantity (kg)</th>
                  <th className="py-3.5 px-4">Origin Hub & Collectors</th>
                  <th className="py-3.5 px-4">Intake Date</th>
                  <th className="py-3.5 px-4">Verification Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.map((batch) => {
                  const isProcessed = batch.status === 'processed';
                  const isReceived = batch.status === 'received';
                  const isInbound = batch.status === 'inbound';

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">
                        {batch.id}
                        {batch.eprCreditCertificateNo && (
                          <span className="block text-[10px] text-emerald-600 font-normal">
                            {batch.eprCreditCertificateNo}
                          </span>
                        )}
                        {batch.handoverId && (
                          <a href={`/verify/${encodeURIComponent(batch.handoverId)}`} target="_blank" rel="noreferrer" className="mt-1 block font-sans text-[10px] font-semibold text-indigo-700 hover:underline">
                            Public handover · {batch.handoverId}
                          </a>
                        )}
                      </td>

                      <td className="py-4 px-4 font-semibold text-slate-800">
                        {batch.materialType}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Purity: {batch.purityGrade}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono font-extrabold text-slate-900 text-sm">
                        {batch.totalWeightKg.toLocaleString('en-IN')} kg
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-slate-700 block font-medium">{batch.sortingCenterHub}</span>
                        <div className="flex items-center space-x-1 text-[10px] text-slate-500 mt-0.5">
                          <span>Linked Waste IDs:</span>
                          {batch.sourceWasteIds.slice(0, 2).map((wid, i) => (
                            <button
                              key={i}
                              onClick={() => viewWasteDetails(wid)}
                              className="text-brand-600 hover:underline font-mono cursor-pointer"
                            >
                              {wid}
                            </button>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                        {batch.receivedAt.split('T')[0]}
                      </td>

                      <td className="py-4 px-4">
                        {isProcessed && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Recycling Verified ✓</span>
                          </span>
                        )}
                        {isReceived && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                            <Scale className="w-3.5 h-3.5 text-teal-600" />
                            <span>Received & Weighed</span>
                          </span>
                        )}
                        {isInbound && !batch.directLotId && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>In-Transit From Hub</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right space-x-2">
                        {isInbound && (
                          <button
                            onClick={() => confirmBatchReceived(batch.id)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            Confirm Received
                          </button>
                        )}

                        {isReceived && (
                          <button
                            onClick={() => {
                              const reference = window.prompt('Enter the external recycling certificate or processing reference:');
                              if (reference?.trim()) void processBatchAndIssueEPR(batch.id, reference.trim());
                            }}
                            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center space-x-1 inline-flex"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Verify Recycling</span>
                          </button>
                        )}

                        {isProcessed && (
                          <button
                            onClick={() => viewWasteDetails(batch.sourceWasteIds[0])}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
                          >
                            View Audit Log
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
    </>
  );
};
