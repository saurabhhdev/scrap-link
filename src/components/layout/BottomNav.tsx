import React from 'react';
import { Home, Truck, Search, Activity, User, Coins, ShieldCheck, Building2, LayoutDashboard } from 'lucide-react';
import { AppTab, useApp } from '../../context/AppContext';

interface BottomNavProps {
  onOpenAuth: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = () => {
  const { activeTab, setActiveTab, role } = useApp();

  const getRoleTabs = (): { id: AppTab; label: string; icon: React.ReactNode }[] => {
    if (role === 'household') {
      return [
        { id: 'customer', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'schedule', label: 'Pickup', icon: <Truck className="h-4 w-4" /> },
        { id: 'price-board', label: 'Prices', icon: <Coins className="h-4 w-4" /> },
        { id: 'trace', label: 'Trace', icon: <Search className="h-4 w-4" /> },
        { id: 'landing', label: 'Overview', icon: <Home className="h-4 w-4" /> },
      ];
    }
    if (role === 'collector') {
      return [
        { id: 'collector', label: 'Dashboard', icon: <Truck className="h-4 w-4" /> },
        { id: 'create-lot', label: 'Create Lot', icon: <Building2 className="h-4 w-4" /> },
        { id: 'offers', label: 'Offers', icon: <Search className="h-4 w-4" /> },
        { id: 'earnings', label: 'Earnings', icon: <Coins className="h-4 w-4" /> },
        { id: 'identity', label: 'Profile', icon: <User className="h-4 w-4" /> },
      ];
    }
    if (role === 'recycler') {
      return [
        { id: 'recycler', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
        { id: 'marketplace', label: 'Market', icon: <Building2 className="h-4 w-4" /> },
        { id: 'marketplace', label: 'Offers', icon: <Search className="h-4 w-4" /> },
        { id: 'recycler', label: 'Analytics', icon: <Activity className="h-4 w-4" /> },
        { id: 'price-board', label: 'Prices', icon: <Coins className="h-4 w-4" /> },
      ];
    }
    if (role === 'admin') {
      return [
        { id: 'admin', label: 'Admin', icon: <ShieldCheck className="h-4 w-4" /> },
        { id: 'impact', label: 'Telemetry', icon: <Activity className="h-4 w-4" /> },
        { id: 'trace', label: 'Ledger', icon: <Search className="h-4 w-4" /> },
        { id: 'rates', label: 'Rates', icon: <Coins className="h-4 w-4" /> },
        { id: 'landing', label: 'Overview', icon: <Home className="h-4 w-4" /> },
      ];
    }
    return [
      { id: 'landing', label: 'Home', icon: <Home className="h-4 w-4" /> },
      { id: 'schedule', label: 'Pickup', icon: <Truck className="h-4 w-4" /> },
      { id: 'rates', label: 'Rates', icon: <Coins className="h-4 w-4" /> },
      { id: 'impact', label: 'Telemetry', icon: <Activity className="h-4 w-4" /> },
      { id: 'trace', label: 'Trace', icon: <Search className="h-4 w-4" /> },
    ];
  };

  const tabs = getRoleTabs();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-lg md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl py-1 transition-all ${
                isActive ? 'scale-105 font-bold text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`rounded-xl p-1 ${isActive ? 'bg-emerald-50 text-emerald-700' : ''}`}>
                {tab.icon}
              </div>
              <span className="mt-0.5 text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
