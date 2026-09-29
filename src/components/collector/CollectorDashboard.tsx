import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Scale, 
  Coins, 
  Check, 
  X, 
  Navigation, 
  ArrowUpRight, 
  ShieldCheck, 
  Star, 
  Award, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Radio,
  Map as MapIcon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PickupRequest } from '../../types';
import { CollectModal } from './CollectModal';
import { RecyclerOfferInbox } from './RecyclerOfferInbox';
import { RecyclerMatches } from './RecyclerMatches';
import { CollectorEarningsLedger } from './CollectorEarningsLedger';
import { CollectorOfflinePanel } from './CollectorOfflinePanel';
import { SafetyGuide } from './SafetyGuide';
import { CollectorLotCreator } from './CollectorLotCreator';
import { useI18n } from '../../i18n/I18nContext';

export const CollectorDashboard: React.FC = () => {
  const { t } = useI18n();
  const { 
    activeCollector, 
    pickups, 
    batches,
    acceptPickup, 
    rejectPickup, 
    setActiveTab, 
    viewWasteDetails 
  } = useApp();

  const [activeCollectModalPickup, setActiveCollectModalPickup] = useState<PickupRequest | null>(null);
  const [selectedRoutePickup, setSelectedRoutePickup] = useState<PickupRequest | null>(null);

  // Filter pickups relevant to collector
  const pendingRequests = pickups.filter(p => p.status === 'requested');
  const inTransitPickups = pickups.filter(p => p.status === 'in_transit');
  const completedPickups = pickups.filter(p => p.status === 'collected' || p.status === 'at_sorting' || p.status === 'recycled');
  const selectedRouteBatch = selectedRoutePickup?.recyclingBatchId ? batches.find((batch) => batch.id === selectedRoutePickup.recyclingBatchId) : undefined;

  return (
    <div className="py-8 bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <CollectorOfflinePanel />
        
        {/* Top Header & Dignity Status Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img 
                src={activeCollector.photoUrl} 
                alt={activeCollector.name} 
                className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-500 shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" title="Online & Active" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black text-slate-900">
                  {t('collector')}, {activeCollector.name.split(' ')[0]} 👋
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Verified Collector ✓
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Digital Partner ID: <strong className="font-mono text-slate-800">{activeCollector.id}</strong> • {activeCollector.vehicleType}
              </p>
              <div className="flex items-center space-x-2 text-xs text-slate-600 mt-1">
                <span className="flex items-center text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                  {activeCollector.rating}
                </span>
                <span>•</span>
                <span className="text-slate-500">{activeCollector.totalPickups} All-time pickups</span>
                <span>•</span>
                <span className="text-emerald-700 font-medium">{activeCollector.totalWasteKg.toLocaleString('en-IN')} kg diverted</span>
              </div>
            </div>
          </div>

          {/* Quick Profile & Certificate Switch */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('identity')}
              className="flex-1 md:flex-none inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Digital ID & Certificate</span>
            </button>
          </div>
        </div>

        {/* 4 Statistics KPIs Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-base font-bold text-slate-700 block">{t('todayPickups')}</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {activeCollector.todayPickups}
            </div>
            <span className="text-sm text-emerald-700 font-semibold">{t('dailyGoal')}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-base font-bold text-slate-700 block">{t('todayEarnings')}</span>
            <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
              ₹{activeCollector.todayEarnings.toLocaleString('en-IN')}
            </div>
            <span className="text-sm text-slate-600">{t('paymentRecorded')}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-base font-bold text-slate-700 block">{t('pendingPickups')}</span>
            <div className="text-2xl font-black text-amber-500 mt-1">
              {pendingRequests.length}
            </div>
            <span className="text-sm text-amber-800 font-semibold">{t('nearby')}</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-base font-bold text-slate-700 block">{t('completedPickups')}</span>
            <div className="text-2xl font-black text-teal-600 mt-1">
              {activeCollector.completedPickupsCount}
            </div>
            <span className="text-sm text-teal-800 font-semibold">{t('weighed')}</span>
          </div>
        </div>

        <SafetyGuide />

        <CollectorEarningsLedger />

        <RecyclerOfferInbox />
        <CollectorLotCreator />

        {/* Main Content Area: Requests Grid & Interactive Map Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Nearby Requests & In-Transit (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Active In-Transit Job (if any) */}
            {inTransitPickups.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-brand-700">
                  <Radio className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
                  <span>{t('activePickup')}</span>
                </div>

                {inTransitPickups.map((p) => (
                  <div 
                    key={p.id}
                    className="bg-emerald-50/40 rounded-2xl p-5 border-2 border-brand-500 shadow-md space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-brand-800 bg-brand-100 px-2 py-0.5 rounded border border-brand-200">
                          {p.id}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-1">{p.householdName}</h3>
                        <p className="text-xs text-slate-600 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{p.address}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-emerald-700 font-mono">~₹{p.totalEstimatedValue}</span>
                        <span className="block text-[10px] text-slate-500">{p.totalEstimatedKg} kg est.</span>
                      </div>
                    </div>

                    {/* Materials pill row */}
                    <div className="flex flex-wrap gap-1.5">
                      {p.items.map((it, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium text-slate-700">
                          {it.categoryName}: {it.estimatedKg}kg
                        </span>
                      ))}
                    </div>

                    {/* Action: Trigger Doorstep IoT Weighing */}
                    <div className="pt-2 flex items-center space-x-3">
                      <button
                        onClick={() => setActiveCollectModalPickup(p)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <Scale className="w-4 h-4" />
                        <span>{t('weigh')}</span>
                      </button>

                      <button
                        onClick={() => setSelectedRoutePickup(p)}
                        className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer flex items-center space-x-1"
                      >
                        <Navigation className="w-3.5 h-3.5 text-brand-600" />
                        <span>Navigate</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Nearby Pickup Requests Queue */}
            <div id="collector-pickups" className="scroll-mt-24 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <span>{t('pickupQueue')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                    {pendingRequests.length} Available
                  </span>
                </h2>
                <span className="text-sm text-slate-600">{t('activeOnly')}</span>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="text-base font-bold text-slate-800">{t('allNearbyDone')}</p>
                  <p className="text-sm text-slate-600">{t('newBookings')}</p>
                </div>
              ) : (
                pendingRequests.map((p) => (
                  <div 
                    key={p.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-slate-300 shadow-2xs space-y-3.5 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {p.id}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{p.preferredTimeSlot}</span>
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{p.householdName}</h4>
                        <p className="text-xs text-slate-600 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{p.address}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-extrabold text-emerald-600 font-mono">₹{p.totalEstimatedValue}</span>
                        <span className="block text-[10px] text-slate-400">Est. Scrap Value</span>
                      </div>
                    </div>

                    {/* Materials & Quantity preview */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        Materials: <strong className="text-slate-800">{p.items.map(i => i.categoryName).join(' • ')}</strong>
                      </span>
                      <span className="font-bold text-slate-900">{p.totalEstimatedKg} kg total</span>
                    </div>

                    <RecyclerMatches pickupId={p.id} />

                    {/* 3 Buttons: Accept, Navigate, Reject */}
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => acceptPickup(p.id, activeCollector.id)}
                        className="flex-1 min-h-14 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-base font-bold transition-colors cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('accept')}</span>
                      </button>

                      <button
                        onClick={() => setSelectedRoutePickup(p)}
                        className="min-h-14 py-3 px-4 rounded-xl border-2 border-slate-300 hover:bg-slate-50 text-slate-700 text-base font-semibold transition-colors cursor-pointer flex items-center space-x-2"
                      >
                        <Navigation className="w-3.5 h-3.5 text-brand-600" />
                        <span>{t('navigate')}</span>
                      </button>

                      <button
                        onClick={() => rejectPickup(p.id)}
                        className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-xs transition-colors cursor-pointer"
                        title="Dismiss Request"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

            {/* Completed Pickups Log */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                {t('recentCollections')}
              </h3>
              
              <div className="space-y-2">
                {completedPickups.slice(0, 3).map((cp) => (
                  <div 
                    key={cp.id}
                    onClick={() => viewWasteDetails(cp.id)}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs hover:border-brand-500 cursor-pointer transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 font-mono">{cp.id}</div>
                        <div className="text-[11px] text-slate-500">{cp.householdName} • {cp.actualWeightKg || cp.totalEstimatedKg} kg</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-emerald-600 font-mono">₹{cp.actualPaidAmount || cp.totalEstimatedValue}</span>
                      <span className="block text-[10px] text-slate-400 capitalize">{cp.paymentMode || 'UPI'} Paid</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Map Simulation (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 sticky top-24">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapIcon className="w-4 h-4 text-brand-600" />
                  <h3 className="text-sm font-bold text-slate-900">Route overview</h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                  Location not shared
                </span>
              </div>

              {/* Map Simulation Container */}
              <div className="relative h-72 rounded-2xl bg-slate-900 overflow-hidden border border-slate-800 shadow-inner flex flex-col justify-between p-4">
                {/* Background Map Graphic Pattern */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]" />
                
                {/* Vector Grid Roads Simulation */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 20 80 Q 150 120 280 60 T 400 180" fill="none" stroke="#34d399" strokeWidth="3" strokeDasharray="6,4" />
                  <path d="M 80 200 L 220 140 L 340 240" fill="none" stroke="#64748b" strokeWidth="2" />
                </svg>

                {/* Collector Icon Position (Pulsing) */}
                <div className="relative z-10 self-start bg-slate-900/90 text-white p-2 rounded-xl border border-emerald-500/50 shadow-lg flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-mono font-bold">{activeCollector.name || 'Collector account'}</span>
                </div>

                {/* Waypoint 1: Active Household Destination */}
                <div className="relative z-10 self-center bg-brand-500 text-slate-950 p-2.5 rounded-xl font-bold text-xs shadow-xl flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-slate-950" />
                  <span>
                    {selectedRoutePickup ? selectedRoutePickup.address : 'No active pickup selected'}
                  </span>
                </div>

                {/* Waypoint 2: Municipal Sorting Facility */}
                <div className="relative z-10 self-end bg-indigo-950/90 text-indigo-200 p-2 rounded-xl border border-indigo-700 text-[11px] font-mono flex items-center space-x-1">
                  <span>{selectedRouteBatch?.recyclerName || 'Recycler not assigned'}</span>
                </div>
              </div>

              {/* Navigation telemetry details */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Current Hub:</span>
                  <span className="font-semibold text-slate-800">{activeCollector.currentLocation.areaName || 'Not recorded'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Next Drop-off:</span>
                  <span className="font-semibold text-indigo-700">{selectedRouteBatch?.recyclerName || 'Not assigned'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Battery / Fuel Range:</span>
                  <span className="font-semibold text-emerald-600">Not recorded</span>
                </div>
              </div>

              {/* Button to test weighing */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    const target = inTransitPickups[0] || pickups[0];
                    setActiveCollectModalPickup(target);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Scale className="w-4 h-4 text-brand-400" />
                  <span>Simulate Doorstep Weigh & Pay</span>
                </button>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Collect Modal */}
      {activeCollectModalPickup && (
        <CollectModal 
          pickup={activeCollectModalPickup} 
          onClose={() => setActiveCollectModalPickup(null)} 
        />
      )}
    </div>
  );
};
