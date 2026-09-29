import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Award, 
  QrCode, 
  Download, 
  Share2, 
  CheckCircle2, 
  Calendar, 
  Star, 
  MapPin, 
  Truck, 
  Building2, 
  FileCheck2, 
  Printer, 
  ArrowLeft 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '../../context/AppContext';

export const DigitalIdentityCard: React.FC = () => {
  const { activeCollector, setActiveTab } = useApp();
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const verificationUrl = `${window.location.origin}/?collector=${encodeURIComponent(activeCollector.id)}`;

  const handleShare = () => {
    navigator.clipboard?.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-10 bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveTab('collector')}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Collector Dashboard</span>
          </button>

          <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            {activeCollector.isVerified ? 'Account verified' : 'Verification pending'}
          </span>
        </div>

        {/* Dignity Header Message */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            ScrapLink collector account
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Digital Collector Identity & Credentials
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Restoring dignity, legal recognition, and social security to India’s front-line circular economy champions.
          </p>
        </div>

        {/* Digital ID Card Preview (Physical Badge Look) */}
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-slate-700/80 relative overflow-hidden">
            
            {/* Holographic Watermark Band */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top Emblem Row */}
            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-5">
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl">🇮🇳</span>
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-100">
                    SBM Urban 2.0 • Green Card
                  </h4>
                  <p className="text-[10px] text-emerald-400 font-mono">
                    MoHUA Circular Economy Registry
                  </p>
                </div>
              </div>

              <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ACTIVE ✓
              </div>
            </div>

            {/* Middle Section: Photo & Identity */}
            <div className="flex items-start space-x-4 mb-6">
              <div className="relative shrink-0">
                <img 
                  src={activeCollector.photoUrl} 
                  alt={activeCollector.name} 
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                />
                {activeCollector.isVerified && <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full" title="Account verified">
                  <CheckCircle2 className="w-4 h-4" />
                </span>}
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-1.5">
                  <h2 className="text-xl font-black text-white">{activeCollector.name}</h2>
                </div>
                <p className="text-xs text-slate-300 font-hindi">{activeCollector.hindiName}</p>
                <div className="font-mono text-xs text-brand-300 font-bold tracking-wider pt-0.5">
                  {activeCollector.id}
                </div>
                <div className="flex items-center space-x-1 text-xs text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span className="font-bold">{activeCollector.rating} Rating</span>
                  <span className="text-slate-400">({activeCollector.totalPickups} Pickups)</span>
                </div>
              </div>
            </div>

            {/* Official Credentials Grid */}
            <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 space-y-2.5 text-xs mb-5 font-mono">
              <div className="flex justify-between items-center text-slate-400">
                <span>e-Shram UAN:</span>
                <span className="text-slate-100 font-bold">{activeCollector.govtIdNumber}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Ayushman Bharat:</span>
                <span className="text-emerald-400 font-bold">{activeCollector.ayushmanCardNo || 'Not provided'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>CPCB Skill Cert:</span>
                <span className="text-teal-300 font-bold">{activeCollector.cpcbTrainingCert || 'Not provided'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Vehicle Fleet:</span>
                <span className="text-slate-100">{activeCollector.vehicleType}</span>
              </div>
            </div>

            {/* Materials Accepted Tags */}
            <div className="mb-5 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Accepted Materials:
              </span>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {activeCollector.acceptedMaterials.map((m) => (
                  <span key={m} className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-medium">
                    {m}
                  </span>
                ))}
                {activeCollector.acceptedMaterials.length === 0 && <span className="text-slate-400">No materials configured</span>}
              </div>
            </div>

            {/* Bottom QR Verification & Total Diverted */}
            <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Total Waste Diverted</span>
                <span className="text-lg font-black text-emerald-400">{activeCollector.totalWasteKg.toLocaleString('en-IN')} kg</span>
                <span className="text-[10px] text-slate-400 block">Recorded collections</span>
              </div>

              {/* Dynamic QR Code for On-Street Inspection */}
              <div className="bg-white p-1.5 rounded-xl shadow-md">
                <QRCodeSVG value={verificationUrl} size={64} />
              </div>
            </div>

          </div>

          {/* Action Buttons: View Certificate & Share */}
          <div className="flex items-center space-x-3 mt-4">
            <button
              onClick={() => setShowCertificateModal(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center space-x-2"
            >
              <Award className="w-4 h-4" />
              <span>View Certificate</span>
            </button>

            <button
              onClick={handleShare}
              className="py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
              <span>{copied ? 'Link Copied!' : 'Share Profile'}</span>
            </button>
          </div>
        </div>

        {/* Certificate Modal */}
        {showCertificateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-8 border border-slate-200 shadow-2xl relative space-y-6">
              
              {/* Certificate Border Design */}
              <div className="border-4 border-double border-emerald-600 p-6 rounded-2xl relative text-center space-y-4">
                
                <div className="flex items-center justify-between">
                  <span className="text-3xl">🇮🇳</span>
                  <span className="text-xs font-mono font-bold text-slate-400">CERT-2026-KC-004821</span>
                  <button 
                    onClick={() => setShowCertificateModal(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-800">
                    Swachh Bharat Urban 2.0 • Circular India Mission
                  </h3>
                  <h2 className="text-2xl font-serif font-black text-slate-900">
                    Certificate of Formal Green Accreditation
                  </h2>
                  <p className="text-xs text-slate-500 italic">
                    This certifies that the undernamed informal waste practitioner has completed formal verification:
                  </p>
                </div>

                <div className="py-2">
                  <h1 className="text-2xl font-bold text-slate-900 font-serif underline decoration-brand-500 underline-offset-4">
                    {activeCollector.name}
                  </h1>
                  <p className="text-xs font-mono text-slate-600 mt-1">
                    Practitioner ID: {activeCollector.id} • e-Shram: {activeCollector.govtIdNumber}
                  </p>
                </div>

                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  This account has recorded <strong>{activeCollector.totalWasteKg.toLocaleString('en-IN')} kg</strong> of collected material. Verification and credentials reflect information recorded in ScrapLink.
                </p>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <div>
                    <span className="block font-bold text-slate-800">ScrapLink</span>
                    <span className="text-[10px]">Collector identity record</span>
                  </div>

                  <div className="w-16 h-16 bg-white p-1 rounded border border-slate-200">
                    <QRCodeSVG value={verificationUrl} size={56} />
                  </div>

                  <div>
                    <span className="block font-bold text-slate-800">{activeCollector.isVerified ? 'Verified account' : 'Pending verification'}</span>
                    <span className="text-[10px]">Status from platform records</span>
                  </div>
                </div>

              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center space-x-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Certificate</span>
                </button>
                <button
                  onClick={() => setShowCertificateModal(false)}
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
