export type UserRole = 'household' | 'collector' | 'recycler' | 'admin';

/** Material catalog entry loaded from the backend. */
export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
}

/** Dated market observation; each update creates a history point. */
export interface Price {
  id: string;
  materialId: string;
  amount: number;
  location: string;
  date: string;
  source: string;
}

export interface WasteCategory {
  id: string;
  name: string;
  hindiName: string;
  ratePerKg: number;
  unit: string;
  iconName: string;
  tagColor: string;
  description: string;
  carbonOffsetPerKg: number; // in kg CO2e avoided per kg recycled
  waterSavedPerKg: number; // in Liters
}

export interface MaterialBookingItem {
  categoryId: string;
  categoryName: string;
  estimatedKg: number;
  ratePerKg: number;
  estimatedValue: number;
  condition?: 'clean' | 'mixed' | 'damaged';
}

export type PickupStatus = 
  | 'requested' 
  | 'accepted' 
  | 'in_transit' 
  | 'collected' 
  | 'at_sorting' 
  | 'recycled';

export interface TraceabilityEvent {
  stage: 'request_created' | 'collector_assigned' | 'weighed_collected' | 'sorting_hub' | 'recycler_processing' | 'epr_issued';
  title: string;
  description: string;
  timestamp: string;
  location: string;
  gpsCoords?: { lat: number; lng: number };
  actorName: string;
  actorRole: string;
  verifiedByBadge?: string;
  hashDigest: string;
  metricHighlight?: string;
}

export interface PickupRequest {
  id: string; // e.g. "KC-2026-004821"
  householdId: string;
  householdName: string;
  householdPhone: string;
  address: string;
  city: string;
  ward: string;
  pincode: string;
  lat: number;
  lng: number;
  items: MaterialBookingItem[];
  totalEstimatedKg: number;
  totalEstimatedValue: number;
  status: PickupStatus;
  preferredDate: string;
  preferredTimeSlot: string;
  notes?: string;
  condition?: 'clean' | 'mixed' | 'damaged';
  assignedCollectorId?: string;
  assignedCollectorName?: string;
  assignedCollectorPhone?: string;
  createdAt: string;
  scheduledAt: string;
  collectedAt?: string;
  sortedAt?: string;
  recycledAt?: string;
  actualWeightKg?: number;
  actualPaidAmount?: number;
  paymentMode?: 'UPI' | 'Cash' | 'Direct Jan-Dhan Transfer';
  upiTransactionId?: string;
  verificationPin: string;
  qrCodeData: string;
  eprCertificateId?: string;
  recyclingBatchId?: string;
  cryptographicHash: string;
  timeline: TraceabilityEvent[];
}

export interface Collector {
  id: string; // e.g. "KC-COL-004821"
  name: string;
  hindiName: string;
  photoUrl: string;
  phone: string;
  rating: number;
  reviewCount: number;
  totalPickups: number;
  totalWasteKg: number;
  monthlyEarnings: number;
  distanceKm: number;
  acceptedMaterials: string[];
  isVerified: boolean;
  verificationBadges: string[];
  govtIdNumber: string; // e.g. "ESHR-9942-8812-4011"
  ayushmanCardNo: string;
  cpcbTrainingCert: string;
  vehicleType: string;
  vehiclePlateNo: string;
  todayPickups: number;
  todayEarnings: number;
  pendingRequestsCount: number;
  completedPickupsCount: number;
  status: 'available' | 'on_pickup' | 'offline';
  currentLocation: {
    lat: number;
    lng: number;
    areaName: string;
  };
}

export interface Recycler {
  id: string; // e.g. "REC-DEL-041"
  name: string;
  facilityType: string; // e.g. "Authorized Polymer Reprocessor"
  cpcbLicenseNo: string;
  location: string;
  state: string;
  contactPerson: string;
  phone: string;
  email: string;
  acceptedMaterials: string[];
  totalTonsProcessed: number;
  eprCreditsIssued: number;
  isoCertifications: string[];
  co2OffsetTotalTons: number;
  verificationStatus?: 'verified' | 'pending' | 'unverified';
}

export interface RecyclingBatch {
  id: string; // e.g. "BATCH-2026-EPR-882"
  directLotId?: string;
  isDemo?: boolean;
  materialType: string;
  totalWeightKg: number;
  sourceWasteIds: string[];
  collectorIds: string[];
  sortingCenterHub: string;
  recyclerId: string;
  recyclerName: string;
  receivedAt: string;
  processedAt?: string;
  purityGrade: 'A+ (Ultra Pure)' | 'A (Industrial Grade)' | 'B (Secondary Blend)' | 'Unassessed';
  status: 'inbound' | 'received' | 'processed';
  eprCreditCertificateNo?: string;
  co2SavedKg: number;
  waterSavedLitres: number;
  handoverId?: string;
}

export interface HandoverRecord {
  handoverId: string;
  lotId: string;
  collectorId: string;
  recyclerId: string;
  material: string;
  weightKg: number;
  value: number;
  timestamp: string;
  location: { city: string; facility: string };
  payment: { amount: number; mode: string; status: 'recorded' | 'unavailable'; paidAt?: string };
  confirmations: {
    collector: { confirmed: boolean; confirmedAt?: string };
    recycler: { confirmed: boolean; confirmedAt?: string };
  };
  integrityHash: string;
}

export interface MandiRate {
  id: string;
  material: string;
  subcategory: string;
  rate: number;
  previousRate: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  unit: string;
  minBulkKg: number;
  demandLevel: 'High' | 'Surging' | 'Moderate';
  industrialBuyer: string;
}

export interface ImpactStats {
  totalWasteRecoveredKg: number;
  totalCollectorsConnected: number;
  totalVerifiedRecyclers: number;
  totalHouseholdsServed: number;
  estimatedCo2AvoidedKg: number;
  totalCollectorEarningsRupees: number;
  landfillVolumeSavedM3: number;
  treesEquivalentSaved: number;
  totalPickupsCompleted?: number;
  totalPcrPelletsSuppliedKg?: number;
  activeWardsCovered?: number;
}
