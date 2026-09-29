import React, { useState } from 'react';
import { 
  Plus, 
  Minus, 
  Trash2, 
  Truck, 
  Calendar, 
  Clock, 
  MapPin, 
  FileText, 
  Check, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Radio, 
  Star, 
  Phone, 
  QrCode, 
  CheckCircle2,
  Navigation,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MaterialBookingItem, Collector, PickupRequest } from '../../types';

export const SchedulePickup: React.FC = () => {
  const { 
    bookPickup, 
    collectors, 
    currentUser,
    wasteCategories,
    setActiveTab, 
    viewWasteDetails,
    viewCollectorProfile
  } = useApp();

  // Step 1: Material Selection & Estimated Value
  // Step 2: Address & Schedule
  // Step 3: Radar Scan & Nearby Collector Matching
  // Step 4: Booking Confirmation with Waste ID & QR
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Selected Materials State
  const [selectedItems, setSelectedItems] = useState<{ [catId: string]: number }>({});

  // Schedule Details State
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    phone: currentUser?.phone || '',
    address: '',
    city: '',
    ward: currentUser?.ward || '',
    pincode: '',
    condition: 'mixed' as 'clean' | 'mixed' | 'damaged',
    date: new Date().toISOString().split('T')[0],
    slot: '10:00 AM - 12:00 PM',
    notes: ''
  });

  // Selected Collector for booking
  const [createdBooking, setCreatedBooking] = useState<PickupRequest | null>(null);

  // Calculate totals
  const bookingItems: MaterialBookingItem[] = Object.entries(selectedItems)
    .filter(([_, qty]) => qty > 0)
    .map(([catId, qty]) => {
      const cat = wasteCategories.find(c => c.id === catId);
      if (!cat) return null;
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        estimatedKg: qty,
        ratePerKg: cat.ratePerKg,
        estimatedValue: Math.round(qty * cat.ratePerKg)
      };
    }).filter((item): item is MaterialBookingItem => Boolean(item));

  const totalKg = bookingItems.reduce((acc, curr) => acc + curr.estimatedKg, 0);
  const totalValue = bookingItems.reduce((acc, curr) => acc + curr.estimatedValue, 0);

  const handleQtyChange = (catId: string, delta: number) => {
    setSelectedItems(prev => {
      const current = prev[catId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [catId]: next };
    });
  };

  const handleDirectQty = (catId: string, value: string) => {
    const val = parseInt(value, 10);
    setSelectedItems(prev => ({
      ...prev,
      [catId]: isNaN(val) ? 0 : Math.max(0, val)
    }));
  };

  const handleProceedToSchedule = () => {
    if (totalKg === 0) return;
    setCurrentStep(2);
  };

  const handleStartRadarScan = () => setCurrentStep(3);

  const handleConfirmPickup = async (collector?: Collector) => {
    try {
      const newPickup = await bookPickup(
      bookingItems,
      {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        ward: formData.ward,
        pincode: formData.pincode,
        condition: formData.condition,
        notes: formData.notes,
        date: formData.date,
        slot: formData.slot
      },
      collector?.id
    );

      setCreatedBooking(newPickup);
      setCurrentStep(4);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to create the pickup request.');
    }
  };

  return (
    <div className="py-10 bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Progress Tracker */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {[
              { num: 1, label: 'Materials & Value' },
              { num: 2, label: 'Address & Slot' },
              { num: 3, label: 'Collector Match' },
              { num: 4, label: 'Waste ID & QR' }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === s.num 
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                    : currentStep > s.num 
                      ? 'bg-brand-100 text-brand-700' 
                      : 'bg-slate-200 text-slate-500'
                }`}>
                  {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-[11px] mt-1 hidden sm:block ${currentStep === s.num ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* STEP 1: MATERIAL SELECTION */}
        {currentStep === 1 && (
          <div className="space-y-8">
            <div className="text-center max-w-xl mx-auto space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
                Step 1 of 4
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Select Your Recyclables
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Choose the scrap types and estimate kilograms. Live rates are updated daily from the Mandi.
              </p>
            </div>

            {/* Grid of Materials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wasteCategories.map((cat) => {
                const qty = selectedItems[cat.id] || 0;
                const isSelected = qty > 0;

                return (
                  <div 
                    key={cat.id}
                    className={`rounded-2xl p-4 transition-all border-2 ${
                      isSelected 
                        ? 'border-brand-500 bg-white shadow-md' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${cat.tagColor}`}>
                          ₹{cat.ratePerKg}/kg
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">{cat.name}</h4>
                        <p className="text-[11px] text-slate-500">{cat.hindiName}</p>
                      </div>

                      {/* Material subtotal */}
                      {isSelected && (
                        <div className="text-right">
                          <span className="text-xs font-bold text-brand-600">₹{qty * cat.ratePerKg}</span>
                          <span className="block text-[10px] text-slate-400">Est. payout</span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 min-h-[32px]">
                      {cat.description}
                    </p>

                    {/* Quantity Selector Counter */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium">Quantity (kg):</span>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(cat.id, -2)}
                          disabled={qty === 0}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center disabled:opacity-30 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        
                        <input
                          type="number"
                          value={qty}
                          onChange={(e) => handleDirectQty(cat.id, e.target.value)}
                          className="w-12 text-center text-xs font-bold text-slate-900 border border-slate-200 rounded-md py-1 focus:outline-hidden focus:border-brand-500"
                        />

                        <button
                          type="button"
                          onClick={() => handleQtyChange(cat.id, 2)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Summary Bar */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-20 md:bottom-4">
              <div className="flex items-center space-x-6">
                <div>
                  <span className="text-xs text-slate-500 block">Total Estimated Weight</span>
                  <span className="text-xl font-bold text-slate-900">{totalKg} kg</span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-xs text-slate-500 block">Estimated Household Payout</span>
                  <span className="text-xl font-extrabold text-emerald-600">₹{totalValue}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToSchedule}
                disabled={totalKg === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <span>Continue to Schedule</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: ADDRESS & SCHEDULE */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
                Step 2 of 4
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Pickup Address & Time Slot
              </h2>
              <p className="text-xs text-slate-500">
                Ensure doorstep availability. Collectors arrive with a calibrated scale.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (for UPI & OTP)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="waste-condition" className="mb-1 block text-xs font-semibold text-slate-700">Waste condition</label>
                <select id="waste-condition" value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value as typeof formData.condition })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:border-brand-500 focus:outline-hidden">
                  <option value="clean">Clean and separated</option>
                  <option value="mixed">Mixed materials</option>
                  <option value="damaged">Wet or damaged</option>
                </select>
              </div>

              {/* Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Pickup Address</label>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, address: 'Flat 402, Nilgiri Apartments, Barakhamba Road, Connaught Place' })}
                    className="text-[11px] text-brand-600 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>Use Delhi GPS Landmark</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:outline-hidden"
                  placeholder="House/Flat No., Building, Street, Landmark"
                />
              </div>

              {/* City, Ward & Pincode */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Municipal Ward</label>
                  <input
                    type="text"
                    value={formData.ward}
                    onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Preferred Date & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Date</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Time Slot</label>
                  <select
                    value={formData.slot}
                    onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:outline-hidden bg-white"
                  >
                    <option>08:00 AM - 10:00 AM</option>
                    <option>10:00 AM - 12:00 PM</option>
                    <option>02:00 PM - 04:00 PM</option>
                    <option>04:00 PM - 06:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Special Pickup Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Lift is operational; scrap is on 4th floor"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Back & Submit Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Back to Materials
              </button>

              <button
                type="button"
                onClick={handleStartRadarScan}
                className="inline-flex items-center space-x-2 px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Find Available Collectors</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: RADAR SCAN & NEARBY COLLECTORS */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                Step 3 of 4
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Verified Nearby Collectors
              </h2>
              <p className="text-xs text-slate-500">
                Select a verified collector account, or leave the request open for a collector to accept.
              </p>
            </div>

              <div className="space-y-4 max-w-3xl mx-auto">
                {/* List of matched collectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {collectors.slice(0, 4).map((c) => {
                    return (
                      <div 
                        key={c.id}
                        className="bg-white rounded-2xl p-5 border-2 border-slate-200 hover:border-brand-500 hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Top row */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <img 
                                src={c.photoUrl} 
                                alt={c.name}
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs"
                              />
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                    Verified ✓
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500">{c.vehicleType}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="inline-flex items-center space-x-1 text-xs font-bold text-amber-500">
                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                <span>{c.rating}</span>
                              </span>
                              <span className="block text-[10px] text-slate-400">({c.reviewCount} reviews)</span>
                            </div>
                          </div>

                          {/* Distance & Area */}
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-center justify-between mb-3">
                            <span className="flex items-center space-x-1 text-brand-700 font-semibold">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{c.distanceKm} km away</span>
                            </span>
                            <span className="text-slate-400 truncate max-w-[140px]">{c.currentLocation.areaName}</span>
                          </div>

                          {/* Credentials & badges */}
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {c.verificationBadges.slice(0, 2).map((b, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleConfirmPickup(c)}
                            className="flex-1 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors cursor-pointer text-center"
                          >
                            Request Pickup
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              viewCollectorProfile(c.id);
                            }}
                            className="py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            View Profile
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
                {collectors.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center"><p className="text-sm text-slate-600">No verified collectors are available yet. You can register the pickup request and an eligible collector can accept it later.</p><button type="button" onClick={() => void handleConfirmPickup()} className="mt-4 min-h-11 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white">Request without assigning a collector</button></div>}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Modify Address or Time Slot
                  </button>
                </div>
              </div>
          </div>
        )}

        {/* STEP 4: BOOKING CONFIRMED & WASTE ID */}
        {currentStep === 4 && createdBooking && (
          <div className="max-w-xl mx-auto space-y-6">
            
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-6">
              
              {/* Success Badge */}
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Pickup Dispatched & Registered
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                  Pickup Confirmed!
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {createdBooking.assignedCollectorName ? 'Your pickup is assigned to a collector.' : 'Your request is saved and available for a verified collector to accept.'}
                </p>
              </div>

              {/* Waste ID & Verification PIN Box */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400 uppercase font-mono">Unique Waste ID</span>
                  <span className="text-xs text-emerald-400 font-mono">SHA-256 Ledger Linked</span>
                </div>
                
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-brand-400">
                  {createdBooking.id}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <span>Assigned Collector: <strong>{createdBooking.assignedCollectorName || 'Awaiting acceptance'}</strong></span>
                  <span>Doorstep PIN: <strong className="font-mono text-amber-400">{createdBooking.verificationPin}</strong></span>
                </div>
              </div>

              {/* Booking Snapshot */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Estimated Weight:</span>
                  <span className="font-bold text-slate-900">{createdBooking.totalEstimatedKg} kg</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Estimated Value:</span>
                  <span className="font-bold text-emerald-600">₹{createdBooking.totalEstimatedValue}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Scheduled Slot:</span>
                  <span className="font-semibold text-slate-900">{createdBooking.preferredDate} ({createdBooking.preferredTimeSlot})</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Address:</span>
                  <span className="text-slate-700 truncate max-w-[240px]">{createdBooking.address}</span>
                </div>
              </div>

              {/* Next Actions in Platform Workflow */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => viewWasteDetails(createdBooking.id)}
                  className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Track This Waste in Live Traceability Ledger</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('collector')}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Truck className="w-4 h-4" />
                  <span>Switch to Collector View to Accept & Weigh</span>
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
