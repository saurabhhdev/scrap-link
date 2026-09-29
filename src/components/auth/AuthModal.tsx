import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, LoaderCircle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ScrapLinkLogo } from '../ui/ScrapLinkLogo';
import { DEMO_ACCOUNTS } from '../../data/demoData';

interface AuthModalProps { isOpen: boolean; onClose: () => void }
const portalOptions = [
  { role: 'household', label: 'Customer' },
  { role: 'collector', label: 'Collector' },
  { role: 'recycler', label: 'Recycler' },
  { role: 'admin', label: 'Admin' },
] as const;
export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useApp();
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<(typeof portalOptions)[number]['role']>('household');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setIsSubmitting(true); setErrorMessage('');
    try { await login(credential.trim(), password, selectedRole); onClose(); }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Sign-in failed. Check your details and try again.'); }
    finally { setIsSubmitting(false); }
  };

  return <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#102e28]/65 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="auth-title" className="relative grid w-full max-w-4xl overflow-hidden rounded-t-[28px] border border-white/70 bg-[#fcfcf8] shadow-[0_28px_90px_-24px_rgba(8,35,28,.5)] sm:rounded-[28px] md:grid-cols-[.88fr_1.12fr]">
      <aside className="hidden flex-col justify-between bg-[#173d35] p-8 text-white md:flex lg:p-10"><div><ScrapLinkLogo dark /><div className="mt-16"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#c8d9b8]">One connected circular economy</p><h2 className="mt-4 text-3xl font-bold">From pickup to recovery, all in one place.</h2><p className="mt-4 text-sm leading-6 text-[#d1dfd6]">Sign in once. ScrapLink identifies your role and opens the right workspace.</p></div></div><p className="text-xs text-[#d1dfd6]">Secure role based access · MongoDB backed accounts</p></aside>
      <div className="relative p-5 sm:p-8 lg:p-10">
        <button ref={closeRef} type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close sign-in dialog" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e9e1] bg-white text-slate-500 hover:bg-[#f1f4ee] disabled:opacity-50"><X className="h-4 w-4" /></button>
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#65806e]">Secure portal access</p><h1 id="auth-title" className="mt-2 text-3xl font-bold tracking-tight text-[#173d35]">Welcome back</h1><p className="mt-1 text-sm text-slate-600">Choose your account type and sign in to its portal.</p>
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-semibold text-slate-800">Select portal</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {portalOptions.map(({ role, label }) => <button key={role} type="button" aria-pressed={selectedRole === role} onClick={() => { setSelectedRole(role); setErrorMessage(''); }} className={`min-h-10 rounded-xl border px-2 text-xs font-bold transition sm:text-sm ${selectedRole === role ? 'border-[#173d35] bg-[#173d35] text-white' : 'border-[#ccd8cb] bg-white text-slate-700 hover:border-[#47755e]'}`}>{label}</button>)}
          </div>
        </fieldset>
        <div className="mt-4 rounded-xl border border-[#dce6d8] bg-[#f2f6ef] p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#526d59]">Sample logins · select to fill</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((account) => <button key={account.role} type="button" onClick={() => { setSelectedRole(account.role); setCredential(account.email); setPassword(account.password); setErrorMessage(''); }} className="rounded-lg border border-[#d5dfd2] bg-white px-2.5 py-2 text-left text-xs font-semibold text-[#173d35] transition hover:border-[#47755e] hover:bg-[#f9fbf7]">
              <span className="block">{account.label}</span><span className="mt-0.5 block truncate font-normal text-slate-500">{account.email}</span>
            </button>)}
          </div>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-800">{selectedRole === 'household' ? 'Customer' : portalOptions.find((option) => option.role === selectedRole)?.label} email, phone or account ID<input autoFocus value={credential} onChange={(event) => setCredential(event.target.value)} required autoComplete="username" className="mt-1.5 min-h-12 w-full rounded-xl border border-[#ccd8cb] bg-white px-3.5 text-sm outline-none focus:border-[#47755e] focus:ring-4 focus:ring-[#47755e]/10" placeholder={`Enter ${portalOptions.find((option) => option.role === selectedRole)?.label} account identifier`} /></label>
          <label className="block text-sm font-semibold text-slate-800">Password<input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={128} type="password" autoComplete="current-password" className="mt-1.5 min-h-12 w-full rounded-xl border border-[#ccd8cb] bg-white px-3.5 text-sm outline-none focus:border-[#47755e] focus:ring-4 focus:ring-[#47755e]/10" placeholder="Your password" /></label>
          {errorMessage && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">{errorMessage}</p>}
          <button type="submit" disabled={isSubmitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#173d35] px-4 text-sm font-bold text-white transition hover:bg-[#244f43] disabled:cursor-wait disabled:opacity-70">{isSubmitting ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Signing in…</> : <>Sign in<ArrowRight className="h-4 w-4" /></>}</button>
        </form>
      </div>
    </section>
  </div>;
};
