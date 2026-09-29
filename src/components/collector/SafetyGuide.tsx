import React from 'react';
import { BatteryWarning, CircuitBoard, Cable, Monitor, Zap, Syringe, Flame, FlaskConical, ShieldAlert } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

const iconColors: Record<string, string> = { amber: 'bg-amber-100 text-amber-800', violet: 'bg-violet-100 text-violet-800', blue: 'bg-blue-100 text-blue-800', cyan: 'bg-cyan-100 text-cyan-800', yellow: 'bg-yellow-100 text-yellow-800', rose: 'bg-rose-100 text-rose-800', orange: 'bg-orange-100 text-orange-800', emerald: 'bg-emerald-100 text-emerald-800' };
const guides = [
  { icon: BatteryWarning, title: 'batteries', yes: 'batteryDo', no: 'batteryDont', color: 'amber' },
  { icon: Monitor, title: 'crt', yes: 'crtDo', no: 'crtDont', color: 'violet' },
  { icon: CircuitBoard, title: 'pcbs', yes: 'pcbDo', no: 'pcbDont', color: 'blue' },
  { icon: Cable, title: 'cables', yes: 'cableDo', no: 'cableDont', color: 'cyan' },
  { icon: Zap, title: 'electrical', yes: 'electricalDo', no: 'electricalDont', color: 'yellow' },
  { icon: Syringe, title: 'sharp', yes: 'sharpDo', no: 'sharpDont', color: 'rose' },
  { icon: Flame, title: 'burning', yes: 'burningDo', no: 'burningDont', color: 'orange' },
  { icon: FlaskConical, title: 'chemicals', yes: 'chemicalDo', no: 'chemicalDont', color: 'emerald' },
];

export const SafetyGuide: React.FC = () => {
  const { t } = useI18n();
  return <section aria-labelledby="safety-guide-title" className="rounded-3xl border-2 border-amber-200 bg-amber-50/70 p-5 sm:p-6">
    <div className="mb-5 flex items-start gap-3"><span className="rounded-2xl bg-amber-100 p-3 text-amber-800"><ShieldAlert size={30}/></span><div><h2 id="safety-guide-title" className="text-2xl font-black text-slate-900">{t('safetyTitle')}</h2><p className="mt-1 text-base font-medium text-slate-700">{t('safetyIntro')}</p></div></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{guides.map(({ icon: Icon, title, yes, no, color }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-3"><span className={`rounded-xl p-2.5 ${iconColors[color]}`}><Icon size={25}/></span><h3 className="text-lg font-extrabold text-slate-900">{t(title)}</h3></div>
      <p className="mb-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold leading-snug text-emerald-900"><b className="block text-xs uppercase tracking-wide">✓ {t('doLabel')}</b>{t(yes)}</p>
      <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold leading-snug text-rose-900"><b className="block text-xs uppercase tracking-wide">✕ {t('dontLabel')}</b>{t(no)}</p>
    </article>)}</div>
  </section>;
};
