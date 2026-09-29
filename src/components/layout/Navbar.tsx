import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  User, 
  Truck, 
  Building2, 
  ShieldCheck, 
  X,
  LogOut,
} from 'lucide-react';
import { useApp, AppTab } from '../../context/AppContext';
import { UserRole } from '../../types';
import { ScrapLinkLogo } from '../ui/ScrapLinkLogo';
import { Language, useI18n } from '../../i18n/I18nContext';

interface NavbarProps {
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const { language, setLanguage, t } = useI18n();
  const { 
    role, 
    currentUser,
    logout,
    activeTab, 
    setActiveTab, 
    notifications, 
    viewWasteDetails,
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState('');
  const [quickSearchInput, setQuickSearchInput] = useState('');

  const handleQuickSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (quickSearchInput.trim()) {
      viewWasteDetails(quickSearchInput.trim().toUpperCase());
      setQuickSearchInput('');
    }
  };

  // Dynamically compute navigation links based on active role
  const getNavLinks = (): { id: AppTab; label: string; anchor?: string }[] => {
    if (role === 'household') {
      return [
        { id: 'schedule', label: 'Book Pickup' },
        { id: 'rates', label: 'Rates' },
        { id: 'trace', label: 'Track' },
      ];
    }
    if (role === 'collector') {
      return [
        { id: 'collector', label: 'Dashboard' },
        { id: 'create-lot', label: 'Create Lot' },
        { id: 'my-lots', label: 'My Lots' },
        { id: 'offers', label: 'Offers' },
        { id: 'identity', label: 'Profile' }
      ];
    }
    if (role === 'admin') {
      return [
        { id: 'admin', label: 'Dashboard' },
        { id: 'admin', label: 'Users', anchor: 'admin-users' },
        { id: 'admin', label: 'Requests & Lots', anchor: 'admin-requests' },
        { id: 'admin', label: 'Analytics', anchor: 'admin-analytics' }
      ];
    }
    if (role === 'recycler') {
      return [
        { id: 'recycler', label: 'Dashboard' },
        { id: 'marketplace', label: 'Marketplace', anchor: 'available-lots' },
        { id: 'marketplace', label: 'My Offers', anchor: 'my-offers' },
        { id: 'recycler', label: 'Transactions' },
      ];
    }
    return [
      { id: 'landing', label: 'Overview' },
      { id: 'schedule', label: 'Book Pickup' },
      { id: 'rates', label: 'Rates' },
      { id: 'impact', label: 'Impact' },
      { id: 'trace', label: 'Track' }
    ];
  };

  const navLinks = getNavLinks();
  const navTranslation: Record<string, string> = { 'My Dashboard': 'navDashboard', 'Book Pickup': 'navBook', Rates: 'navRates', 'Price Board': 'navPrices', Track: 'navTrack', Home: 'navHome', Identity: 'navIdentity', 'Pickup Queue': 'navQueue', Overview: 'navOverview', Impact: 'navImpact', Batches: 'navBatches' };

  const roleMeta: Record<UserRole, { label: string; icon: React.ReactNode; badgeColor: string }> = {
    household: {
      label: 'Customer / Seller',
      icon: <User className="w-3.5 h-3.5" />,
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    collector: {
      label: 'Collector Partner',
      icon: <Truck className="w-3.5 h-3.5" />,
      badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    recycler: {
      label: 'Recycler Hub',
      icon: <Building2 className="w-3.5 h-3.5" />,
      badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
    admin: {
      label: 'Municipal Admin',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
    },
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#dfe5dc] bg-[#f7f7f2]/95 backdrop-blur-md">
      {/* Main Navbar */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between sm:h-16">
          
          {/* Logo & Primary Nav */}
          <div className="flex min-w-0 items-center space-x-4">
            <button
              type="button"
              onClick={() => setActiveTab(currentUser ? (currentUser.role === 'household' ? 'customer' : currentUser.role) : 'landing')}
              className="group flex shrink-0 cursor-pointer items-center space-x-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              <ScrapLinkLogo />
            </button>

            {/* Role-Specific Navigation Links */}
            <nav aria-label="Main navigation" className="hidden min-w-0 items-center gap-1 lg:flex">
              {navLinks.map((link) => {
                const isActive = link.anchor ? activeAnchor === link.anchor : activeTab === link.id && !activeAnchor;
                return (
                  <button
                    key={`${link.id}-${link.label}`}
                    type="button"
                    data-active={isActive}
                    onClick={() => {
                      setActiveTab(link.id);
                      setActiveAnchor(link.anchor || '');
                      if (link.anchor) window.setTimeout(() => document.getElementById(link.anchor!)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
                    }}
                    className={`cursor-pointer whitespace-nowrap rounded-xl px-3 py-2 text-[13px] font-bold tracking-[-0.01em] transition-all duration-200 ${role === 'household' ? 'navbar-link-glow' : ''} ${
                      isActive
                        ? 'bg-[#e8f0e7] text-[#173d35] shadow-sm ring-1 ring-inset ring-[#cdddc9]'
                        : 'text-slate-600 hover:bg-white hover:text-[#173d35] hover:shadow-sm'
                    }`}
                  >
                    {t(navTranslation[link.label] || link.label)}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action Group */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <label className="sr-only" htmlFor="language-picker">{t('language')}</label>
            <select id="language-picker" value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label={t('language')} className="h-10 rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:px-2">
              <option value="en">EN</option><option value="hi">हिंदी</option><option value="mr">मराठी</option>
            </select>
            
            {/* Quick Waste ID Search */}
            <form onSubmit={handleQuickSearch} className="relative hidden items-center xl:flex">
              <input
                type="text"
                placeholder="Collection ID"
                value={quickSearchInput}
                onChange={(e) => setQuickSearchInput(e.target.value)}
                className="w-36 lg:w-44 rounded-lg border border-[#dfe5dc] bg-white py-2 pl-7 pr-2.5 text-xs font-mono transition-all placeholder:text-slate-400 focus:border-[#5b7c67] focus:outline-hidden"
              />
              <Search className="pointer-events-none absolute left-2.5 h-3 w-3 text-slate-400" />
            </form>

            {/* Notifications */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white py-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Live Operational Events
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNotifications(false)}
                      className="cursor-pointer text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-xs text-slate-500">No events logged yet.</div>
                    ) : (
                      notifications.map((notification) => (
                        <div key={notification.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold text-slate-900">{notification.title}</div>
                              <div className="mt-1 text-[11px] text-slate-600">{notification.message}</div>
                            </div>
                            <span className="text-[10px] text-slate-400">{notification.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {currentUser && (
              <div aria-label={`${roleMeta[role].label} account${currentUser.isDemo ? ', demo mode' : ''}`} className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-2 text-xs font-semibold sm:px-3 ${roleMeta[role].badgeColor}`}>
                {roleMeta[role].icon}<span className="hidden sm:inline">{currentUser.name.split(' ')[0]}</span>{currentUser.isDemo && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-amber-900">DEMO</span>}
              </div>
            )}

            {/* Portal Login / Switch Button */}
            {currentUser ? (
              <button
                type="button"
                onClick={logout}
                aria-label="Sign out"
                className="inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 cursor-pointer sm:px-3"
                title="Sign out"
              >
                <LogOut className="w-3 h-3 text-slate-500" />
                <span className="hidden md:inline">Sign out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="h-10 rounded-lg bg-[#173d35] px-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#285247] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 cursor-pointer sm:px-4"
              >
                Sign in
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
