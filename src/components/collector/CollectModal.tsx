import React, { useEffect, useState } from 'react';
import {
  Scale,
  CreditCard,
  CheckCircle2,
  X,
  Smartphone,
  ShieldCheck,
  QrCode,
  Coins
} from 'lucide-react';
import { PickupRequest } from '../../types';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../i18n/I18nContext';

interface CollectModalProps {
  pickup: PickupRequest;
  onClose: () => void;
}

export const CollectModal: React.FC<CollectModalProps> = ({ pickup, onClose }) => {
  const { completeCollection, saveCollectionDraft, offlineOperations, isOnline } = useApp();
  const { t } = useI18n();

  const [measuredWeight, setMeasuredWeight] = useState<number>(pickup.totalEstimatedKg || 0);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'Cash' | 'Direct Jan-Dhan Transfer'>('UPI');
  const [customerPin, setCustomerPin] = useState<string>('');
  const [draftNotice, setDraftNotice] = useState('');

  useEffect(() => {
    const draft = offlineOperations.find((item) => item.pickupId === pickup.id && item.state === 'draft');
    if (draft) { setMeasuredWeight(draft.payload.measuredKg); setPaymentMode(draft.payload.paymentMode); }
  }, [offlineOperations, pickup.id]);

  // Auto calculate amount based on material average rate or estimated total
  const estimatedUnitPrice = pickup.totalEstimatedKg > 0 ? pickup.totalEstimatedValue / pickup.totalEstimatedKg : 0;
  const totalAmount = Math.round(measuredWeight * estimatedUnitPrice);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await completeCollection(pickup.id, measuredWeight, totalAmount, paymentMode);
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to complete this pickup.');
    }
  };

  const handleSaveDraft = async () => {
    await saveCollectionDraft(pickup.id, { measuredKg: measuredWeight, paidAmount: totalAmount, paymentMode });
    setDraftNotice(t('draftSaved'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">

        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{t('doorstepWeigh')}</h3>
              <p className="text-sm text-slate-300 font-mono">{t('wasteId')}: {pickup.id}</p>
            </div>
          </div>

            <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleComplete} className="p-6 space-y-5">

          {/* Customer & Address Preview */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between font-semibold text-slate-900">
              <span>{pickup.householdName}</span>
              <span className="text-slate-500">{pickup.householdPhone}</span>
            </div>
            <p className="text-slate-600 line-clamp-1">{pickup.address}</p>
          </div>

          {/* Actual measured weight entry */}
          <div className="bg-emerald-50/50 p-4 rounded-2xl border-2 border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>{t('scaleInput')}</span>
              </div>

              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded border border-emerald-200">Manual entry</span>
            </div>

            <div className="flex items-baseline justify-between bg-white p-3 rounded-xl border border-emerald-200">
              <span className="text-base font-bold text-slate-700">{t('liveWeight')}:</span>
              <div className="flex items-baseline space-x-1">
                <input
                  type="number"
                  step="0.1"
                  value={measuredWeight}
                  onChange={(e) => setMeasuredWeight(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right text-2xl font-black text-slate-900 font-mono focus:outline-hidden"
                />
                <span className="text-sm font-bold text-slate-600">kg</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-emerald-700">
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enter the measured weight from your scale</span>
              </span>
            </div>
          </div>

          {/* Instant Payout Amount Box */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-sm text-slate-300 block">{t('citizenPayout')}</span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-brand-400 font-mono">₹{totalAmount}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              {t('paymentMethod')}
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['UPI', 'Cash', 'Direct Jan-Dhan Transfer'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`p-2 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                    paymentMode === mode
                      ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{t('cashPaid')}</p>
          </div>

          {/* Customer OTP / PIN Verification */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                {t('customerPin')}
              </label>
              <span className="text-[11px] text-slate-400">PIN: {pickup.verificationPin}</span>
            </div>
            <input
              type="text"
              placeholder={`${t('enterPin')} (${pickup.verificationPin})`}
              value={customerPin}
              onChange={(e) => setCustomerPin(e.target.value)}
              className="w-full text-center text-sm font-mono tracking-widest px-3 py-2 border border-slate-300 rounded-xl focus:border-brand-500 focus:outline-hidden"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isOnline ? t('recordCollection') : t('queueCollection')} · ₹{totalAmount}</span>
          </button>

          {!isOnline && <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{t('queuedNote')}</p>}
          {draftNotice && <p role="status" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">{draftNotice}. {t('offlineDraftNote')}</p>}
          <button type="button" onClick={() => void handleSaveDraft()} className="min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-800">{t('saveDraft')}</button>

        </form>

      </div>
    </div>
  );
};
