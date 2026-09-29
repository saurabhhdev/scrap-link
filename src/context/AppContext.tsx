import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  UserRole, 
  PickupRequest, 
  Collector, 
  Recycler, 
  RecyclingBatch, 
  ImpactStats,
  MaterialBookingItem,
  WasteCategory
} from '../types';
import { api, clearToken, setToken } from '../services/api';
import { readOperations, saveOperation, CollectionOperation, makeOperationId } from '../services/offlineStore';
import { ApiError } from '../services/api';
import { connectRealtime, subscribeRealtime } from '../services/realtime';
import { DEMO_ACCOUNTS, demoBatches, demoCollectors, demoMaterials, demoRecyclers, makeDemoPickups } from '../data/demoData';

export type AppTab = 
  | 'landing' 
  | 'customer'
  | 'schedule' 
  | 'collector' 
  | 'trace' 
  | 'recycler' 
  | 'impact' 
  | 'rates' 
  | 'admin' 
  | 'identity'
  | 'price-board'
  | 'create-lot'
  | 'my-lots'
  | 'offers'
  | 'earnings'
  | 'safety'
  | 'marketplace';

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  subtitle?: string;
  ward?: string;
  photoUrl?: string;
  eShramNo?: string;
  isDemo?: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'success' | 'info' | 'alert';
  readAt?: string | null;
  isDemo?: boolean;
}

interface AppContextType {
  role: UserRole;
  currentUser: AuthUser | null;
  login: (credential: string, password: string, expectedRole?: UserRole) => Promise<void>;
  register: (details: { name: string; phone: string; password: string; role: Exclude<UserRole, 'admin'>; facilityName?: string; city?: string }) => Promise<void>;
  logout: () => void;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  searchWasteId: string;
  setSearchWasteId: (id: string) => void;
  pickups: PickupRequest[];
  collectors: Collector[];
  activeCollector: Collector;
  viewCollectorProfile: (collectorId: string) => void;
  recyclers: Recycler[];
  activeRecycler: Recycler;
  batches: RecyclingBatch[];
  wasteCategories: WasteCategory[];
  impactStats: ImpactStats;
  notifications: NotificationItem[];
  addNotification: (title: string, message: string, type?: 'success' | 'info' | 'alert') => void;
  clearNotifications: () => void;
  
  // Core workflows
  bookPickup: (
    items: MaterialBookingItem[], 
    household: { name: string; phone: string; address: string; city?: string; ward?: string; pincode?: string; latitude?: number; longitude?: number; condition?: 'clean' | 'mixed' | 'damaged'; notes?: string; slot: string; date: string },
    collectorId?: string
  ) => Promise<PickupRequest>;
  acceptPickup: (pickupId: string, collectorId: string) => Promise<void>;
  rejectPickup: (pickupId: string) => Promise<void>;
  completeCollection: (
    pickupId: string, 
    measuredKg: number, 
    paidAmount: number, 
    paymentMode: 'UPI' | 'Cash' | 'Direct Jan-Dhan Transfer'
  ) => Promise<'synced' | 'queued'>;
  confirmBatchReceived: (batchId: string) => Promise<void>;
  processBatchAndIssueEPR: (batchId: string, externalReference: string) => Promise<void>;
  
  // Quick View helper
  viewWasteDetails: (wasteId: string) => void;
  isOnline: boolean;
  offlineOperations: CollectionOperation[];
  saveCollectionDraft: (pickupId: string, payload: CollectionOperation['payload']) => Promise<void>;
  retryOfflineSync: () => Promise<void>;
  retryOfflineOperation: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem('kc_role') as UserRole) || 'household';
  });
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('kc_user');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });
  const [activeTab, setActiveTabState] = useState<AppTab>(() => {
    return currentUser ? (currentUser.role === 'household' ? 'customer' : currentUser.role) : 'landing';
  });
  const [searchWasteId, setSearchWasteId] = useState<string>('');

  // Business records are populated only from the authenticated API.
  const [pickups, setPickups] = useState<PickupRequest[]>([]);

  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [selectedCollectorId, setSelectedCollectorId] = useState('');

  const [recyclers, setRecyclers] = useState<Recycler[]>([]);

  const [batches, setBatches] = useState<RecyclingBatch[]>([]);

  const [wasteCategories, setWasteCategories] = useState<WasteCategory[]>([]);

  // Dynamically calculate operational stats from actual state without hardcoded fake numbers
  const impactStats: ImpactStats = React.useMemo(() => {
    const completedList = pickups.filter(p => p.status === 'collected' || p.status === 'at_sorting' || p.status === 'recycled');
    const totalRecoveredKg = completedList.reduce((acc, p) => acc + (p.actualWeightKg || 0), 0);
    const totalEarningsRupees = completedList.reduce((acc, p) => acc + (p.actualPaidAmount || 0), 0);
    const households = new Set(pickups.map(p => p.householdId)).size;
    
    return {
      totalWasteRecoveredKg: Math.round(totalRecoveredKg * 10) / 10,
      totalCollectorsConnected: collectors.filter((collector) => collector.isVerified).length,
      totalVerifiedRecyclers: recyclers.filter((recycler) => recycler.verificationStatus === 'verified').length,
      totalHouseholdsServed: households,
      totalPcrPelletsSuppliedKg: 0,
      totalPickupsCompleted: completedList.length,
      totalCollectorEarningsRupees: totalEarningsRupees,
      estimatedCo2AvoidedKg: 0,
      landfillVolumeSavedM3: 0,
      treesEquivalentSaved: 0,
      activeWardsCovered: new Set(pickups.map(p => p.ward).filter(Boolean)).size
    };
  }, [pickups, collectors.length, recyclers.length]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [offlineOperations, setOfflineOperations] = useState<CollectionOperation[]>([]);
  const syncingQueue = useRef(false);

  // Active user contexts
  const activeCollector = collectors.find((entry) => entry.id === (currentUser?.role === 'collector' ? currentUser.id : selectedCollectorId)) || collectors.find((entry) => entry.id === currentUser?.id) || collectors[0] || { id: '', name: '', hindiName: '', photoUrl: '', phone: '', rating: 0, reviewCount: 0, totalPickups: 0, totalWasteKg: 0, monthlyEarnings: 0, distanceKm: 0, acceptedMaterials: [], isVerified: false, verificationBadges: [], govtIdNumber: '', ayushmanCardNo: '', cpcbTrainingCert: '', vehicleType: '', vehiclePlateNo: '', todayPickups: 0, todayEarnings: 0, pendingRequestsCount: 0, completedPickupsCount: 0, status: 'offline' as const, currentLocation: { lat: 0, lng: 0, areaName: '' } };
  const activeRecycler = recyclers.find((entry) => entry.id === currentUser?.id) || recyclers[0] || { id: '', name: '', facilityType: '', cpcbLicenseNo: '', location: '', state: '', contactPerson: '', phone: '', email: '', acceptedMaterials: [], totalTonsProcessed: 0, eprCreditsIssued: 0, isoCertifications: [], co2OffsetTotalTons: 0 };

  // Synchronize storage
  useEffect(() => {
    localStorage.setItem('kc_role', role);
  }, [role]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('kc_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('kc_user');
    }
  }, [currentUser]);

  useEffect(() => {
    let active = true;
    setOfflineOperations([]);
    if (!currentUser) return () => { active = false; };
    if (currentUser.isDemo) {
      setPickups(makeDemoPickups()); setCollectors(demoCollectors); setRecyclers(demoRecyclers); setBatches(demoBatches); setWasteCategories(demoMaterials);
      setNotifications([{ id: 'demo-notice', title: 'DEMO MODE', message: 'Sample accounts and simulated records are stored in this browser for your presentation.', time: 'Ready', type: 'info', isDemo: true }]);
      return () => { active = false; };
    }
    const refresh = () => Promise.all([
      api<{ pickups: PickupRequest[]; collectors: Collector[]; recyclers: Recycler[]; batches: RecyclingBatch[]; materials: Array<{ id: string; name: string; category: string; unit: string; ratePerKg: number }> }>('/bootstrap'),
      api<{ notifications: NotificationItem[] }>('/notifications')
    ]).then(([data, notificationData]) => { if (!active) return; setPickups(data.pickups || []); setCollectors(data.collectors || []); setRecyclers(data.recyclers || []); setBatches(data.batches || []); setWasteCategories((data.materials || []).map((m) => ({ ...m, hindiName: '', iconName: 'Recycle', tagColor: 'bg-emerald-50 text-emerald-800 border-emerald-200', description: '', carbonOffsetPerKg: 0, waterSavedPerKg: 0 }))); setNotifications(notificationData.notifications || []); })
      .catch(() => undefined);
    void api<{ user: AuthUser }>('/auth/me').then(({ user }) => { if (!active) return; setCurrentUser(user); setRoleState(user.role); void refresh(); }).catch(() => { if (active) { clearToken(); setCurrentUser(null); setRoleState('household'); setActiveTabState('landing'); setPickups([]); setCollectors([]); setRecyclers([]); setBatches([]); } });
    const disconnect = connectRealtime();
    const unsubscribe = subscribeRealtime((event) => { window.dispatchEvent(new CustomEvent('platform:update', { detail: event })); void refresh(); });
    void readOperations().then(async (items) => {
      const recovered = items.filter((item) => item.ownerId === currentUser.id).map((item) => item.state === 'syncing' ? { ...item, state: 'queued' as const, updatedAt: new Date().toISOString() } : item);
      await Promise.all(recovered.filter((item, index) => item !== items[index]).map(saveOperation));
      if (active) setOfflineOperations(recovered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      if (navigator.onLine && recovered.some((item) => item.state === 'queued')) void retryOfflineSync();
    }).catch(() => undefined);
    const online = () => setIsOnline(true); const offline = () => setIsOnline(false);
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    return () => { active = false; unsubscribe(); disconnect(); window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, [currentUser?.id]);

  const refreshOfflineOperations = useCallback(async () => {
    const items = await readOperations();
    setOfflineOperations(items.filter((item) => item.ownerId === currentUser?.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, [currentUser?.id]);

  const login = async (credential: string, password: string, expectedRole?: UserRole) => {
    const demoAccount = DEMO_ACCOUNTS.find((account) => account.email === credential.trim().toLowerCase());
    if (demoAccount && demoAccount.password === password) {
      if (expectedRole && demoAccount.role !== expectedRole) throw new Error(`Select the ${demoAccount.label} portal and try again.`);
      clearToken(); setCurrentUser(demoAccount.user); setRoleState(demoAccount.role);
      setActiveTabState(demoAccount.role === 'household' ? 'customer' : demoAccount.role);
      return;
    }
    const { user, token } = await api<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ credential, password })
    });
    if (expectedRole && user.role !== expectedRole) throw new Error(`Those details belong to the ${user.role} portal. Select that portal and try again.`);
    setToken(token);
    setCurrentUser(user);
    setRoleState(user.role);
    if (user.role === 'household') {
      setActiveTabState('customer');
    } else if (user.role === 'collector') {
      setActiveTabState('collector');
    } else if (user.role === 'recycler') {
      setActiveTabState('recycler');
    } else if (user.role === 'admin') {
      setActiveTabState('admin');
    }
  };

  const register = async (details: { name: string; phone: string; password: string; role: Exclude<UserRole, 'admin'>; facilityName?: string; city?: string }) => {
    const { user, token } = await api<{ user: AuthUser; token: string }>('/auth/register', {
      method: 'POST', body: JSON.stringify(details)
    });
    setToken(token);
    setCurrentUser(user);
    setRoleState(user.role);
    setActiveTabState(user.role === 'household' ? 'customer' : user.role);
  };

  const logout = () => {
    void api('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearToken();
    setCurrentUser(null);
    setRoleState('household');
    setActiveTabState('landing');
  };

  const setActiveTab = (tab: AppTab) => {
    const protectedRole: Partial<Record<AppTab, UserRole>> = { collector: 'collector', identity: 'collector', 'create-lot': 'collector', 'my-lots': 'collector', offers: 'collector', earnings: 'collector', safety: 'collector', recycler: 'recycler', marketplace: 'recycler', admin: 'admin' };
    const requiredRole = protectedRole[tab];
    if (requiredRole && currentUser?.role !== requiredRole) {
      setActiveTabState(currentUser ? (currentUser.role === 'household' ? 'customer' : currentUser.role) : 'landing');
      return;
    }
    setActiveTabState(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addNotification = (title: string, message: string, type: 'success' | 'info' | 'alert' = 'info') => {
    const item: NotificationItem = {
      id: `notif-${Date.now()}`,
      title,
      message,
      time: 'Just now',
      type
    };
    setNotifications(prev => [item, ...prev.slice(0, 7)]);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const viewWasteDetails = (wasteId: string) => {
    setSearchWasteId(wasteId);
    setActiveTab('trace');
  };
  const viewCollectorProfile = (collectorId: string) => { setSelectedCollectorId(collectorId); setActiveTab('identity'); };

  const bookPickup = (
    items: MaterialBookingItem[], 
    household: { name: string; phone: string; address: string; city?: string; ward?: string; pincode?: string; latitude?: number; longitude?: number; condition?: 'clean' | 'mixed' | 'damaged'; notes?: string; slot: string; date: string },
    collectorId?: string
  ): Promise<PickupRequest> => {
    if (currentUser?.isDemo) {
      const totalEstimatedKg = items.reduce((sum, item) => sum + item.estimatedKg, 0);
      const totalEstimatedValue = items.reduce((sum, item) => sum + item.estimatedValue, 0);
      const pickup: PickupRequest = { id: `DEMO-PU-${Date.now().toString().slice(-6)}`, householdId: currentUser.id, householdName: household.name, householdPhone: household.phone, address: household.address, city: household.city || 'Ludhiana', ward: household.ward || currentUser.ward || 'Model Town', pincode: household.pincode || '141002', lat: household.latitude || 30.9009, lng: household.longitude || 75.8573, items, totalEstimatedKg, totalEstimatedValue, status: 'requested', preferredDate: household.date, preferredTimeSlot: household.slot, notes: household.notes, condition: household.condition, createdAt: new Date().toISOString(), scheduledAt: new Date().toISOString(), verificationPin: '2048', qrCodeData: 'SCRAPLINK-DEMO', cryptographicHash: 'demo-record', timeline: [] };
      setPickups(previous => [pickup, ...previous]); return Promise.resolve(pickup);
    }
    return api<PickupRequest>('/pickups', { method: 'POST', body: JSON.stringify({ items, household, collectorId }) }).then((pickup) => {
      setPickups((previous) => [pickup, ...previous]);
      return pickup;
    });
  };

  // 2. Collector accepts pickup
  const acceptPickup = async (pickupId: string, collectorId: string) => {
    if (currentUser?.isDemo) { setPickups(previous => previous.map(p => p.id === pickupId ? { ...p, status: 'in_transit', assignedCollectorId: collectorId, assignedCollectorName: activeCollector.name, assignedCollectorPhone: activeCollector.phone } : p)); return; }
    const pickup = await api<PickupRequest>(`/pickups/${encodeURIComponent(pickupId)}/accept`, { method: 'POST' });
    setPickups((previous) => previous.map((entry) => entry.id === pickup.id ? pickup : entry));
  };

  // 3. Collector rejects pickup
  const rejectPickup = async (pickupId: string) => {
    if (currentUser?.isDemo) { setPickups(previous => previous.filter(p => p.id !== pickupId)); return; }
    await api(`/pickups/${encodeURIComponent(pickupId)}`, { method: 'DELETE' });
    setPickups(prev => prev.filter(p => p.id !== pickupId));
  };

  // 4. Collector completes pickup at doorstep
  const applyCompletedCollection = (response: { pickup: PickupRequest; batch: RecyclingBatch; transaction: { transactionId: string; status: 'paid' | 'pending' | 'failed' } }, payload: CollectionOperation['payload']) => {
    const { pickup, batch, transaction } = response;
    setPickups((previous) => previous.map((entry) => entry.id === pickup.id ? pickup : entry));
    setBatches((previous) => [batch, ...previous.filter((entry) => entry.id !== batch.id)]);
    try { confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } }); } catch { /* visual enhancement only */ }
  };

  const saveCollectionDraft = async (pickupId: string, payload: CollectionOperation['payload']) => {
    const now = new Date().toISOString();
    const previous = (await readOperations()).find((entry) => entry.ownerId === currentUser?.id && entry.pickupId === pickupId && entry.state === 'draft');
    if (!currentUser || currentUser.role !== 'collector') throw new Error('Sign in to the collector account before saving a collection draft.');
    const operation: CollectionOperation = { id: previous?.id || makeOperationId(), ownerId: currentUser.id, pickupId, payload, state: 'draft', attempts: 0, createdAt: previous?.createdAt || now, updatedAt: now };
    await saveOperation(operation); await refreshOfflineOperations();
  };

  const retryOfflineSync = async () => {
    if (!navigator.onLine || syncingQueue.current) return;
    syncingQueue.current = true;
    try {
      const pending = (await readOperations()).filter((entry) => entry.state === 'queued' && entry.ownerId === currentUser?.id);
      for (const entry of pending) {
        const syncing: CollectionOperation = { ...entry, state: 'syncing', attempts: entry.attempts + 1, error: undefined, updatedAt: new Date().toISOString() };
        await saveOperation(syncing); await refreshOfflineOperations();
        try {
          const response = await api<{ pickup: PickupRequest; batch: RecyclingBatch; transaction: { transactionId: string; status: 'paid' | 'pending' | 'failed' } }>(`/pickups/${encodeURIComponent(entry.pickupId)}/complete`, { method: 'POST', body: JSON.stringify(entry.payload) });
          const synced = { ...syncing, state: 'synced' as const, updatedAt: new Date().toISOString() };
          await saveOperation(synced); applyCompletedCollection(response, entry.payload);
        } catch (error) {
          const terminal = error instanceof ApiError && error.status !== undefined && error.status >= 400 && error.status < 500;
          if (!(error instanceof ApiError)) setIsOnline(false);
          await saveOperation({ ...syncing, state: terminal ? 'failed' : 'queued', error: error instanceof Error ? error.message : 'Sync failed. Try again.', updatedAt: new Date().toISOString() });
        }
        await refreshOfflineOperations();
      }
    } finally { syncingQueue.current = false; await refreshOfflineOperations(); }
  };

  const retryOfflineOperation = async (id: string) => {
    const entry = (await readOperations()).find((item) => item.id === id && item.ownerId === currentUser?.id);
    if (!entry || entry.state !== 'failed' || !navigator.onLine) return;
    await saveOperation({ ...entry, state: 'queued', error: undefined, updatedAt: new Date().toISOString() });
    await refreshOfflineOperations();
    await retryOfflineSync();
  };

  useEffect(() => {
    const handleReconnect = () => { setIsOnline(true); void retryOfflineSync(); };
    window.addEventListener('online', handleReconnect);
    if (navigator.onLine) void retryOfflineSync();
    return () => window.removeEventListener('online', handleReconnect);
  }, []);

  const completeCollection = async (
    pickupId: string, 
    measuredKg: number, 
    paidAmount: number, 
    paymentMode: 'UPI' | 'Cash' | 'Direct Jan-Dhan Transfer'
  ): Promise<'synced' | 'queued'> => {
    if (currentUser?.isDemo) {
      const pickup = pickups.find(p => p.id === pickupId); if (!pickup) throw new Error('Demo pickup not found.');
      const batch: RecyclingBatch = { id: `DEMO-BATCH-${Date.now()}`, materialType: pickup.items.map(i => i.categoryName).join(', '), totalWeightKg: measuredKg, sourceWasteIds: [pickup.id], collectorIds: [currentUser.id], sortingCenterHub: 'Ludhiana Sorting Hub', recyclerId: 'demo-recycler', recyclerName: 'GreenLoop Paper Recovery', receivedAt: new Date().toISOString(), purityGrade: 'A (Industrial Grade)', status: 'inbound', co2SavedKg: measuredKg * 1.8, waterSavedLitres: measuredKg * 9, isDemo: true };
      setPickups(previous => previous.map(p => p.id === pickupId ? { ...p, status: 'collected', actualWeightKg: measuredKg, actualPaidAmount: paidAmount, paymentMode, collectedAt: new Date().toISOString(), recyclingBatchId: batch.id } : p)); setBatches(previous => [batch, ...previous]);
      addNotification('Demo collection completed', `${measuredKg} kg recorded · ₹${paidAmount} simulated payment.`, 'success');
      try { confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } }); } catch { /* visual enhancement only */ }
      return 'synced';
    }
    const payload = { measuredKg, paidAmount, paymentMode };
    const previous = (await readOperations()).find((entry) => entry.ownerId === currentUser?.id && entry.pickupId === pickupId && entry.state === 'draft');
    const now = new Date().toISOString();
    if (!currentUser || currentUser.role !== 'collector') throw new Error('Sign in to the collector account before recording a collection.');
    const operation: CollectionOperation = { id: previous?.id || makeOperationId(), ownerId: currentUser.id, pickupId, payload, state: navigator.onLine ? 'syncing' : 'queued', attempts: navigator.onLine ? 1 : 0, createdAt: previous?.createdAt || now, updatedAt: now };
    await saveOperation(operation); await refreshOfflineOperations();
    if (!navigator.onLine) { addNotification('Saved to sync queue', 'This collection is queued on this device. The server has not confirmed it.', 'info'); return 'queued'; }
    try {
      const response = await api<{ pickup: PickupRequest; batch: RecyclingBatch; transaction: { transactionId: string; status: 'paid' | 'pending' | 'failed' } }>(`/pickups/${encodeURIComponent(pickupId)}/complete`, { method: 'POST', body: JSON.stringify(payload) });
      await saveOperation({ ...operation, state: 'synced', updatedAt: new Date().toISOString() }); await refreshOfflineOperations(); applyCompletedCollection(response, payload); return 'synced';
    } catch (error) {
      const terminal = error instanceof ApiError && error.status !== undefined && error.status >= 400 && error.status < 500;
      if (!(error instanceof ApiError)) setIsOnline(false);
      await saveOperation({ ...operation, state: terminal ? 'failed' : 'queued', error: error instanceof Error ? error.message : 'Sync failed. Try again.', updatedAt: new Date().toISOString() }); await refreshOfflineOperations();
      if (terminal) throw error;
      addNotification('Saved to sync queue', 'The server did not confirm this collection. It will retry when online.', 'alert'); return 'queued';
    }
  };

  // 5. Recycler confirms batch received
  const confirmBatchReceived = async (batchId: string) => {
    if (currentUser?.isDemo) { setBatches(previous => previous.map(b => b.id === batchId ? { ...b, status: 'received' } : b)); return; }
    const batch = await api<RecyclingBatch>(`/batches/${encodeURIComponent(batchId)}/receive`, { method: 'POST' });
    setBatches(prev => prev.map(b => b.id === batchId ? batch : b));
  };

  // 6. Recycler completes industrial processing & issues EPR Certificate
  const processBatchAndIssueEPR = async (batchId: string, externalReference: string) => {
    if (currentUser?.isDemo) { setBatches(previous => previous.map(b => b.id === batchId ? { ...b, status: 'processed', processedAt: new Date().toISOString(), eprCreditCertificateNo: `DEMO-EPR-${externalReference || '2048'}` } : b)); addNotification('Demo batch processed', 'A simulated EPR certificate was created.', 'success'); return; }
    const batch = await api<RecyclingBatch>(`/batches/${encodeURIComponent(batchId)}/process`, { method: 'POST', body: JSON.stringify({ externalReference }) });
    setBatches(prev => prev.map(b => b.id === batchId ? batch : b));
    const recycled = await api<{ pickups: PickupRequest[] }>('/bootstrap').then((data) => data.pickups);
    setPickups(recycled);

    try {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.5 }
      });
    } catch {
      // safe fallback
    }

  };

  return (
    <AppContext.Provider
      value={{
        role,
        currentUser,
        login,
        register,
        logout,
        activeTab,
        setActiveTab,
        searchWasteId,
        setSearchWasteId,
        pickups,
        collectors,
        activeCollector,
        viewCollectorProfile,
        recyclers,
        activeRecycler,
        batches,
        wasteCategories,
        impactStats,
        notifications,
        addNotification,
        clearNotifications,
        bookPickup,
        acceptPickup,
        rejectPickup,
        completeCollection,
        confirmBatchReceived,
        processBatchAndIssueEPR,
        viewWasteDetails,
        isOnline,
        offlineOperations,
        saveCollectionDraft,
        retryOfflineSync,
        retryOfflineOperation
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
