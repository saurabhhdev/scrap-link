import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Cpu, 
  Scale, 
  CreditCard, 
  Award, 
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TiltCard3D } from '../ui/TiltCard3D';
import { IconPlate } from '../ui/IconPlate';

export const ModernBentoFeatures: React.FC = () => {
  const { setActiveTab, impactStats } = useApp();

  return (
    <section className="py-20 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-0.5 rounded-md border border-slate-200">
            Technical Architecture
          </span>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Institutionalizing Informal Recycling
          </h2>

          <p className="text-sm text-slate-600 leading-relaxed">
            Eliminating leakages, scale tampering, and verification fraud with reliable civic technologies.
          </p>
        </div>

        {/* 3D Tilt Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-6">
          
          {/* Card 1: Cryptographic Traceability Ledger (Col 7) */}
          <div className="lg:col-span-7">
            <TiltCard3D depth={10} glareColor="rgba(16, 185, 129, 0.15)">
              <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between h-full space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <IconPlate 
                      icon={<Lock className="w-5 h-5 text-emerald-400" />} 
                      variant="dark" 
                      size="lg" 
                    />
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-300 border border-slate-700 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>SHA-256 Record Digest</span>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Pickup Record Integrity
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Pickup status and collection details are saved in the database with a SHA-256 integrity digest. GPS and external certificates are not assumed.
                    </p>
                  </div>

                  {/* Terminal Simulation */}
                  <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-xs space-y-2 text-slate-300">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 border-b border-slate-800 pb-2">
                      <span>LAST LEDGER COMMIT</span>
                      <span className="text-amber-300 font-semibold">STATE: RECORD-BASED</span>
                    </div>
                    <div className="flex items-center space-x-2 text-emerald-300 font-semibold truncate pt-0.5">
                      <Cpu className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span className="truncate">{impactStats.totalPickupsCompleted ? `${impactStats.totalPickupsCompleted} collection records` : 'No collection records yet'}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                      <span>Stored records: MongoDB</span>
                      <span>Proof: SHA-256 digest</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setActiveTab('trace')}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Inspect Active Waste Ledger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </TiltCard3D>
          </div>

          {/* Card 2: Legal Metrology IoT Scale (Col 5) */}
          <div className="lg:col-span-5">
            <TiltCard3D depth={10} glareColor="rgba(6, 182, 212, 0.12)">
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col justify-between h-full space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <IconPlate 
                      icon={<Scale className="w-5 h-5" />} 
                      variant="teal" 
                      size="lg" 
                    />
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                      Collector-entered weight
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Legal Metrology Scale Verification
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Collectors enter the measured weight during collection. Hardware scale integration can be added when supported equipment is configured.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center space-y-0.5">
                    <span className="text-[10px] uppercase font-mono text-slate-500">Doorstep Scale Precision</span>
                    <div className="text-3xl font-extrabold text-slate-900 font-mono">
                      No measurements <span className="text-sm font-sans text-slate-500 font-normal">recorded</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      Weights are saved from collector submissions.
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab('collector')}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Open Collector Partner App</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </TiltCard3D>
          </div>

          {/* Card 3: 100% Direct Payouts (Col 4) */}
          <div className="lg:col-span-4">
            <TiltCard3D depth={10}>
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-2.5">
                  <IconPlate 
                    icon={<CreditCard className="w-5 h-5" />} 
                    variant="emerald" 
                    size="lg" 
                  />
                  <h3 className="text-base font-bold text-slate-900">
                    Payment status tracking
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Collection payouts are recorded in the transaction ledger. Payment provider integration is not configured.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-slate-500">
                    <span>Payment provider:</span>
                    <span className="text-emerald-700 font-bold">Not connected</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Ledger status:</span>
                    <span className="text-slate-800 font-bold">Live records</span>
                  </div>
                </div>
              </div>
            </TiltCard3D>
          </div>

          {/* Card 4: CPCB EPR Compliance (Col 4) */}
          <div className="lg:col-span-4">
            <TiltCard3D depth={10} glareColor="rgba(99, 102, 241, 0.12)">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-2.5">
                  <IconPlate 
                    icon={<Award className="w-5 h-5" />} 
                    variant="indigo" 
                    size="lg" 
                  />
                  <h3 className="text-base font-bold text-slate-900">
                    Processing references
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Recyclers can record an external processing reference. The platform does not verify external certificates.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-slate-500">
                    <span>Material collected:</span>
                    <span className="text-indigo-700 font-bold">{impactStats.totalWasteRecoveredKg.toLocaleString('en-IN')} kg</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>External certificate verification:</span>
                    <span className="text-amber-700 font-bold">Not connected</span>
                  </div>
                </div>
              </div>
            </TiltCard3D>
          </div>

          {/* Card 5: Social Security & e-Shram (Col 4) */}
          <div className="lg:col-span-4">
            <TiltCard3D depth={10} glareColor="rgba(20, 184, 166, 0.12)">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between h-full">
                <div className="space-y-2.5">
                  <IconPlate 
                    icon={<ShieldCheck className="w-5 h-5" />} 
                    variant="teal" 
                    size="lg" 
                  />
                  <h3 className="text-base font-bold text-slate-900">
                    Collector credentials
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Collectors can save optional identity and credential details to their account profile.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1 font-mono">
                  <div className="flex justify-between text-slate-500">
                    <span>Credential status:</span>
                    <span className="text-emerald-700 font-bold">Account record</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Government integration:</span>
                    <span className="text-slate-800 font-bold">Not connected</span>
                  </div>
                </div>
              </div>
            </TiltCard3D>
          </div>

        </div>

      </div>
    </section>
  );
};
