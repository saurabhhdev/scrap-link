import React from 'react';
import { 
  Truck, 
  Calendar, 
  Clock, 
  MapPin, 
  QrCode, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  Phone, 
  Coins, 
  Scale, 
  ShieldCheck, 
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { IconPlate } from '../ui/IconPlate';

export const CustomerDashboard: React.FC = () => {
  const { 
    currentUser, 
    pickups, 
    setActiveTab, 
    viewWasteDetails,
    wasteCategories
  } = useApp();

  const customerName = currentUser?.name || '';
  const customerPhone = currentUser?.phone || '';
  const customerWard = currentUser?.ward || '';

  // Pickups for this customer
  const myPickups = currentUser ? pickups.filter(p => p.householdId === currentUser.id) : [];

  const activePickups = myPickups.filter(p => p.status === 'requested' || p.status === 'in_transit');
  const pastPickups = myPickups.filter(p => p.status === 'collected' || p.status === 'at_sorting' || p.status === 'recycled');

  // Real computed totals for this customer
  const totalSoldKg = pastPickups.reduce((sum, p) => sum + (p.actualWeightKg || p.totalEstimatedKg || 0), 0);
  const totalEarnedRupees = pastPickups.reduce((sum, p) => sum + (p.actualPaidAmount || p.totalEstimatedValue || 0), 0);

  return (
    <div className="py-8 bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Customer Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Customer Scrap Portal</span>
              <span className="text-emerald-300">•</span>
              <span className="text-emerald-700 font-mono text-[11px]">{customerWard}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Welcome back, {customerName.split(' ')[0]} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage your doorstep scrap pickups, check calibrated weights, and view digital UPI receipts.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('schedule')}
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-800/10 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Book Scrap Pickup</span>
            </button>
            <button
              onClick={() => setActiveTab('rates')}
              className="inline-flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              <Coins className="w-4 h-4 text-emerald-700" />
              <span>Mandi Rates</span>
            </button>
          </div>
        </div>

        {/* 3 Real-time Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <IconPlate 
              icon={<Scale className="w-4 h-4" />} 
              variant="emerald" 
              size="md" 
            />
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {totalSoldKg.toFixed(1)} <span className="text-xs font-normal text-slate-500 font-sans">kg</span>
              </div>
              <span className="text-xs font-bold text-emerald-700">Total Recyclables Diverted</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">From your doorstep</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <IconPlate 
              icon={<Coins className="w-4 h-4" />} 
              variant="teal" 
              size="md" 
            />
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ₹{totalEarnedRupees.toLocaleString('en-IN')}
              </div>
              <span className="text-xs font-bold text-teal-700">Instant UPI Jan-Dhan Payouts</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">Zero middleman cut</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <IconPlate 
              icon={<FileCheck2 className="w-4 h-4" />} 
              variant="indigo" 
              size="md" 
            />
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {pastPickups.length} Pickups
              </div>
              <span className="text-xs font-bold text-indigo-700">Completed Collections</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              {activePickups.length > 0 ? `${activePickups.length} currently active` : 'All requests fulfilled'}
            </span>
          </div>
        </div>

        {/* Active Doorstep Pickups Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Active Doorstep Pickups ({activePickups.length})
            </h2>
            {activePickups.length === 0 && (
              <span className="text-xs text-slate-400 font-mono">No pending requests</span>
            )}
          </div>

          {activePickups.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Active Pickup Scheduled</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Have old newspapers, Amazon boxes, plastic containers, or scrap metal lying around? Schedule a verified collector now.
              </p>
              <button
                onClick={() => setActiveTab('schedule')}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Schedule Doorstep Collection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {activePickups.map((pickup) => (
                <div 
                  key={pickup.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5"
                >
                  {/* Top Bar: Waste ID & Status */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Waste ID</span>
                      <span className="text-sm font-bold font-mono text-slate-900">{pickup.id}</span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 ${
                      pickup.status === 'in_transit'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${pickup.status === 'in_transit' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
                      <span>{pickup.status === 'in_transit' ? 'Partner En Route' : 'Awaiting Partner Match'}</span>
                    </span>
                  </div>

                  {/* Scheduled Slot & Address */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                      <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Date & Slot</span>
                      </div>
                      <div className="font-semibold text-slate-800">
                        {pickup.preferredDate}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {pickup.preferredTimeSlot}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                      <div className="flex items-center space-x-1.5 text-slate-500 text-[11px]">
                        <Scale className="w-3.5 h-3.5" />
                        <span>Estimated Scrap</span>
                      </div>
                      <div className="font-semibold text-slate-800 font-mono">
                        ~{pickup.totalEstimatedKg.toFixed(1)} kg
                      </div>
                      <div className="text-[11px] text-emerald-700 font-bold font-mono">
                        ~₹{pickup.totalEstimatedValue} (Mandi rate)
                      </div>
                    </div>
                  </div>

                  {/* Verification PIN & QR Pass for Arriving Collector */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                        Doorstep Security PIN
                      </span>
                      <div className="text-3xl font-black font-mono tracking-widest text-white">
                        {pickup.verificationPin}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Share with collector upon arrival to unlock calibrated scale
                      </span>
                    </div>

                    <div className="bg-white p-2 rounded-xl shrink-0">
                      <QRCodeSVG 
                        value={pickup.qrCodeData || pickup.id} 
                        size={64} 
                        level="M" 
                      />
                    </div>
                  </div>

                  {/* Assigned Collector Details */}
                  {pickup.assignedCollectorName && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                          {pickup.assignedCollectorName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{pickup.assignedCollectorName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">e-Shram Verified Partner</span>
                        </div>
                      </div>

                      {pickup.assignedCollectorPhone && (
                        <a 
                          href={`tel:${pickup.assignedCollectorPhone}`}
                          className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium text-xs inline-flex items-center space-x-1"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Action Link to Trace Ledger */}
                  <div className="pt-1">
                    <button
                      onClick={() => viewWasteDetails(pickup.id)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <span>View Live Traceability Journey</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Digital Receipts & Completed Collections */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Completed Pickups & Verified UPI Receipts ({pastPickups.length})
          </h2>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Waste ID</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Materials</th>
                    <th className="py-3 px-4">Calibrated Weight</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Payment Ref</th>
                    <th className="py-3 px-4 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {pastPickups.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {p.id}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-sans">
                        {p.preferredDate}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-slate-700">
                        {p.items.map(it => it.categoryName.split(' ')[0]).join(', ')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 font-bold">
                        {(p.actualWeightKg || p.totalEstimatedKg).toFixed(1)} kg
                      </td>
                      <td className="py-3.5 px-4 text-emerald-700 font-bold">
                        ₹{(p.actualPaidAmount || p.totalEstimatedValue).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {p.upiTransactionId || 'UPI-JanDhan'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => viewWasteDetails(p.id)}
                          className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs inline-flex items-center space-x-1 cursor-pointer font-sans"
                        >
                          <span>Receipt</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Live Scrap Mandi Rates Preview */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Today's Mandi Scrap Rates</h3>
              <p className="text-xs text-slate-500">Live wholesale scrap benchmarks (Delhi NCR)</p>
            </div>
            <button
              onClick={() => setActiveTab('rates')}
              className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              View Full Rate Card →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {wasteCategories.slice(0, 4).map((cat) => (
              <div key={cat.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[11px] text-slate-500 font-medium block truncate">
                  {cat.name.split('(')[0]}
                </span>
                <div className="text-xl font-bold font-mono text-slate-900">
                  ₹{cat.ratePerKg} <span className="text-xs font-normal text-slate-400">/kg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
