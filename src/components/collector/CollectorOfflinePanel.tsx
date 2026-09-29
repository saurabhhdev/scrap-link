import React, { useState } from 'react';
import { RefreshCw, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CollectionOperation } from '../../services/offlineStore';
import { useI18n } from '../../i18n/I18nContext';

const stateIcon: Record<CollectionOperation['state'], string> = { draft: '📝', queued: '⏳', syncing: '🔄', synced: '✅', failed: '⚠️' };
export const CollectorOfflinePanel: React.FC = () => {
  const { isOnline, offlineOperations, retryOfflineSync, retryOfflineOperation } = useApp();
  const { language, t } = useI18n();
  const [speaking, setSpeaking] = useState(false);
  const speechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const readSafety = () => {
    if (!speechAvailable) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const text = document.getElementById('safety-guide-title')?.parentElement?.parentElement?.innerText || t('safetyTitle');
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
    utterance.onend = () => setSpeaking(false); utterance.onerror = () => setSpeaking(false); setSpeaking(true); window.speechSynthesis.speak(utterance);
  };
  const pending = offlineOperations.filter((item) => item.state === 'queued' || item.state === 'syncing').length;
  const label: Record<CollectionOperation['state'], string> = { draft: t('draft'), queued: t('queued'), syncing: t('syncing'), synced: t('synced'), failed: t('failed') };
  return <section aria-label="Connection and offline sync" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 text-base font-extrabold ${isOnline ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`} aria-live="polite">
        {isOnline ? <Wifi size={25}/> : <WifiOff size={25}/>}<span>{isOnline ? t('online') : t('offline')}</span>
      </div>
      <div className="flex gap-2">
        {speechAvailable && <button type="button" onClick={readSafety} className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-indigo-200 px-4 text-sm font-bold text-indigo-900" aria-pressed={speaking}>{speaking ? <VolumeX size={22}/> : <Volume2 size={22}/>}<span>{t(speaking ? 'speechOff' : 'speechOn')}</span></button>}
        <button type="button" onClick={() => void retryOfflineSync()} disabled={!isOnline || pending === 0} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-40"><RefreshCw size={20}/><span>{t('syncNow')} {pending > 0 ? `(${pending})` : ''}</span></button>
      </div>
    </div>
    {offlineOperations.length > 0 && <div className="space-y-2" aria-label="Saved collection states">{offlineOperations.slice(0, 6).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
      <div className="flex items-center gap-2"><span aria-hidden="true" className="text-xl">{stateIcon[item.state]}</span><span className="font-bold text-slate-800">{item.pickupId}</span><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-700">{label[item.state]}</span>{item.state === 'draft' && <span className="text-xs text-slate-500">{t('localOnly')}</span>}{item.state === 'queued' && <span className="text-xs text-slate-500">{t('queuedNote')}</span>}{item.error && <span className="text-xs text-rose-700">{item.error}</span>}</div>
      {item.state === 'failed' && <button type="button" onClick={() => void retryOfflineOperation(item.id)} disabled={!isOnline} className="min-h-10 rounded-lg border-2 border-rose-300 px-3 font-bold text-rose-800 disabled:opacity-40">{t('retry')}</button>}
    </div>)}</div>}
  </section>;
};
