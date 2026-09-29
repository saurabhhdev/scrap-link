import React, { useState } from 'react';
import { 
  Search, 
  QrCode, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Building2, 
  Truck, 
  Home, 
  Warehouse, 
  Award, 
  Lock, 
  Download, 
  FileText, 
  Copy, 
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';
import { PickupRequest } from '../../types';

export const WasteTracker: React.FC = () => {
  const { 
    searchWasteId, 
    setSearchWasteId, 
    currentUser,
    pickups, 
    viewWasteDetails,
    setActiveTab,
    batches
  } = useApp();

  const [inputVal, setInputVal] = useState(searchWasteId || '');
  const [showCertModal, setShowCertModal] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Find requested pickup or fallback to first
  const currentPickup: PickupRequest | undefined = pickups.find(
    p => p.id.toUpperCase() === (searchWasteId || inputVal).toUpperCase()
  );
  const currentBatch = currentPickup?.recyclingBatchId ? batches.find((batch) => batch.id === currentPickup.recyclingBatchId) : undefined;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setSearchWasteId(inputVal.trim().toUpperCase());
    }
  };

  const handleCopyHash = () => {
    if (currentPickup?.cryptographicHash) {
      navigator.clipboard?.writeText(currentPickup.cryptographicHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };


  return (
    <div className="py-10 bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>National Circularity Standard • Tamper-Evident Ledger</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            End-to-End Waste Traceability
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Immutable chain-of-custody tracking every kilogram from citizen doorstep to certified reprocessor.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto space-y-3">
          <form 
            onSubmit={handleSearch}
            className="flex items-center bg-white p-2 rounded-2xl border-2 border-slate-300 shadow-md focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all"
          >
            <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              placeholder="Enter your waste ID"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full px-3 py-2 text-sm sm:text-base font-mono tracking-wider focus:outline-hidden uppercase"
            />
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer shrink-0"
            >
              Track Waste
            </button>
          </form>

        </div>

        {/* Waste Traceability Profile Summary Card */}
        {currentPickup && (
          <div className="space-y-8">
            
            {/* Top Overview & QR Visual Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Left col: ID, Status, Items (8 cols) */}
              <div className="md:col-span-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xl sm:text-2xl font-black font-mono tracking-wider text-slate-900">
                    {currentPickup.id}
                  </span>
                  
                  {/* Status Badge */}
                  {currentPickup.status === 'recycled' && (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Current Status: Successfully Recycled ✓</span>
                    </span>
                  )}
                  {currentPickup.status === 'at_sorting' && (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                      <Warehouse className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Current Status: At Municipal MRF Sorting Hub</span>
                    </span>
                  )}
                  {currentPickup.status === 'collected' && (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
                      <Truck className="w-3.5 h-3.5 text-teal-600" />
                      <span>Current Status: Doorstep Weighed & Collected</span>
                    </span>
                  )}
                  {currentPickup.status === 'in_transit' && (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Current Status: Collector In Transit</span>
                    </span>
                  )}
                  {currentPickup.status === 'requested' && (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                      <Home className="w-3.5 h-3.5 text-slate-600" />
                      <span>Current Status: Pickup Requested</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Generator</span>
                    <strong className="text-slate-900">{currentPickup.householdName}</strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Verified Weight</span>
                    <strong className="text-emerald-700 font-mono">
                      {currentPickup.actualWeightKg || currentPickup.totalEstimatedKg} kg
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Assigned Collector</span>
                    <strong className="text-slate-900">{currentPickup.assignedCollectorName || 'Not assigned'}</strong>
                  </div>
                </div>

                {/* Materials list */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="text-slate-500 font-medium py-1">Materials:</span>
                  {currentPickup.items.map((it, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                      {it.categoryName} ({it.estimatedKg} kg)
                    </span>
                  ))}
                </div>

                {/* Cryptographic Hash Band */}
                <div className="bg-slate-900 text-slate-300 p-3 rounded-xl border border-slate-800 font-mono text-[11px] flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate pr-2">
                    <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
                    <span className="truncate">Hash: {currentPickup.cryptographicHash}</span>
                  </div>
                  <button
                    onClick={handleCopyHash}
                    className="text-xs text-brand-400 hover:text-brand-300 shrink-0 font-sans cursor-pointer flex items-center space-x-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedHash ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Right col: QR Code Visual & Certificate Trigger (4 cols) */}
              <div className="md:col-span-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center space-y-3">
                <div className="bg-white p-3 rounded-2xl shadow-sm inline-block border border-slate-200">
                  <QRCodeSVG 
                    value={currentPickup.qrCodeData} 
                    size={130} 
                    level="H" 
                    includeMargin={false}
                  />
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  Scan to verify chain-of-custody
                </div>

                {currentPickup.status === 'recycled' && (
                  <button
                    onClick={() => setShowCertModal(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Award className="w-4 h-4 text-brand-400" />
                    <span>View Recycling Certificate</span>
                  </button>
                )}
              </div>

            </div>

            {/* Visual Timeline Section */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
              <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Chronological Chain-of-Custody Timeline
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable event sequence recorded across municipal nodes and authenticated actors.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                  {currentPickup.timeline.length} Verified Milestones
                </span>
              </div>

              {/* Timeline Items */}
              <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-brand-500">
                {currentPickup.timeline.map((event, index) => {
                  return (
                    <div key={index} className="relative group">
                      
                      {/* Node Bullet Circle */}
                      <div className="absolute -left-6 sm:-left-8 top-1 w-6 h-6 rounded-full bg-brand-500 text-slate-950 flex items-center justify-center font-bold text-xs ring-4 ring-white shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>

                      {/* Content Card */}
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 hover:border-brand-400 hover:bg-white transition-all space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                            <span>{event.title}</span>
                            {event.metricHighlight && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-300">
                                {event.metricHighlight}
                              </span>
                            )}
                          </h4>
                          <span className="text-xs font-mono text-slate-500 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{event.timestamp}</span>
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {event.description}
                        </p>

                        {/* Location & Actor Meta */}
                        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-brand-600" />
                            <span>{event.location}</span>
                          </span>

                          <div className="flex items-center space-x-3">
                            <span>Actor: <strong>{event.actorName}</strong> ({event.actorRole})</span>
                            {event.verifiedByBadge && (
                              <span className="font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                                {event.verifiedByBadge}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

        {!currentPickup && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">{currentUser ? 'No pickup matches that ID in your account.' : 'Sign in with an account that has access to this pickup, then enter its waste ID.'}</div>}

        {/* Certificate Modal */}
        {showCertModal && currentPickup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-8 border border-slate-200 shadow-2xl relative space-y-6">
              
              <div className="border-4 border-double border-emerald-600 p-6 rounded-2xl relative text-center space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🌿</span>
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    CPCB EPR GREEN REGISTRY
                  </span>
                  <button 
                    onClick={() => setShowCertModal(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-800">
                    Central Pollution Control Board • Extended Producer Responsibility
                  </h3>
                  <h2 className="text-2xl font-serif font-black text-slate-900">
                    Official Green Certificate of Verifiable Recycling
                  </h2>
                  <p className="text-xs text-slate-500 italic">
                    Issued under Plastic Waste Management Rules 2022 & E-Waste Rules
                  </p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs font-mono space-y-1 text-slate-800">
                  <div className="flex justify-between">
                    <span>Certificate Ref:</span>
                    <strong>{currentPickup.eprCertificateId || 'Not issued'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Batch Digest:</span>
                    <strong>{currentPickup.cryptographicHash.slice(0, 24)}...</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Material Quantity:</span>
                    <strong>{currentPickup.actualWeightKg || currentPickup.totalEstimatedKg} Kilograms Verified</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Industrial Recycler:</span>
                    <strong>{currentBatch?.recyclerName || 'Not recorded'}</strong>
                  </div>
                </div>

                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  This record reflects the collection and processing details saved for this pickup. <strong>{currentPickup.assignedCollectorName || 'No collector assigned'}</strong>
                </p>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    <span className="block font-bold text-slate-800">Verified Origin</span>
                    <span className="text-[10px]">Household to Polymer Flakes</span>
                  </div>

                  <div className="w-16 h-16 bg-white p-1 rounded border border-slate-200">
                    <QRCodeSVG value={currentPickup.qrCodeData} size={56} />
                  </div>

                  <div>
                    <span className="block font-bold text-slate-800">Circular Stamp</span>
                    <span className="text-[10px]">Zero Landfill Guaranteed</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center space-x-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download EPR Certificate</span>
                </button>
                <button
                  onClick={() => setShowCertModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
