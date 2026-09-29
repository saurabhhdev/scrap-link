import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { HeroSection } from './components/landing/HeroSection';
import { HowItWorks } from './components/landing/HowItWorks';
import { CustomerDashboard } from './components/household/CustomerDashboard';
import { SchedulePickup } from './components/household/SchedulePickup';
import { CollectorDashboard } from './components/collector/CollectorDashboard';
import { DigitalIdentityCard } from './components/collector/DigitalIdentityCard';
import { WasteTracker } from './components/traceability/WasteTracker';
import { RecyclerDashboard } from './components/recycler/RecyclerDashboard';
import { ImpactDashboard } from './components/impact/ImpactDashboard';
import { ScrapRateCalculator } from './components/rates/ScrapRateCalculator';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { PriceBoard } from './components/prices/PriceBoard';
import { CollectorLotCreator } from './components/collector/CollectorLotCreator';
import { CollectorMyLots } from './components/collector/CollectorMyLots';
import { RecyclerOfferInbox } from './components/collector/RecyclerOfferInbox';
import { CollectorEarningsLedger } from './components/collector/CollectorEarningsLedger';
import { SafetyGuide } from './components/collector/SafetyGuide';
import { RecyclerMarketplace } from './components/recycler/RecyclerMarketplace';

export const MainContent: React.FC = () => {
  const { activeTab } = useApp();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-brand-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar onOpenAuth={() => setIsAuthOpen(true)} />

      {/* Main View Router with Framer Motion Page Transitions */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {activeTab === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <HeroSection />
              <HowItWorks />
            </motion.div>
          )}

          {activeTab === 'customer' && (
            <motion.div
              key="customer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <CustomerDashboard />
            </motion.div>
          )}

          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <SchedulePickup />
            </motion.div>
          )}

          {activeTab === 'collector' && (
            <motion.div
              key="collector"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <CollectorDashboard />
            </motion.div>
          )}

          {activeTab === 'identity' && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <DigitalIdentityCard />
            </motion.div>
          )}

          {activeTab === 'create-lot' && <motion.div key="create-lot" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><CollectorLotCreator /></div></motion.div>}
          {activeTab === 'my-lots' && <motion.div key="my-lots" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><div className="px-4 py-8 sm:px-6 lg:px-8"><CollectorMyLots /></div></motion.div>}
          {activeTab === 'offers' && <motion.div key="offers" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><RecyclerOfferInbox /></div></motion.div>}
          {activeTab === 'earnings' && <motion.div key="earnings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><div className="px-4 py-8 sm:px-6 lg:px-8"><CollectorEarningsLedger /></div></motion.div>}
          {activeTab === 'safety' && <motion.div key="safety" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><div className="px-4 py-8 sm:px-6 lg:px-8"><SafetyGuide /></div></motion.div>}
          {activeTab === 'marketplace' && <motion.div key="marketplace" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}><div className="py-8"><RecyclerMarketplace /></div></motion.div>}

          {activeTab === 'trace' && (
            <motion.div
              key="trace"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <WasteTracker />
            </motion.div>
          )}

          {activeTab === 'recycler' && (
            <motion.div
              key="recycler"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <RecyclerDashboard />
            </motion.div>
          )}

          {activeTab === 'impact' && (
            <motion.div
              key="impact"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <ImpactDashboard />
            </motion.div>
          )}

          {activeTab === 'rates' && (
            <motion.div
              key="rates"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <ScrapRateCalculator />
            </motion.div>
          )}

          {activeTab === 'price-board' && (
            <motion.div key="price-board" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <PriceBoard />
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <AdminDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Role-based Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};

export default function App() {
  return <MainContent />;
}
