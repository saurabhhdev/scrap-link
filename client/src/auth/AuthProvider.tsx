import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from '../lib/api';

export type Role = 'collector' | 'recycler' | 'admin';
export type AuthUser = { id: string; name: string; phone: string; role: Role; createdAt?: string };
type AuthResponse = { success: true; data: { user: AuthUser; token: string } };
type AuthContextValue = { user: AuthUser | null; loading: boolean; login: (phone: string, password: string) => Promise<AuthUser>; register: (name: string, phone: string, password: string, role: 'collector' | 'recycler') => Promise<AuthUser>; logout: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!getToken()) { setLoading(false); return; } api<{ success: true; data: { user: AuthUser } }>('/auth/me').then(({ data }) => setUser(data.user)).catch(clearToken).finally(() => setLoading(false)); }, []);
  const authenticate = async (path: string, payload: Record<string, string>) => { const { data } = await api<AuthResponse>(path, { method: 'POST', body: JSON.stringify(payload) }); setToken(data.token); setUser(data.user); return data.user; };
  const logout = async () => { try { await api('/auth/logout', { method: 'POST' }); } finally { clearToken(); setUser(null); } };
  return <AuthContext.Provider value={{ user, loading, login: (phone, password) => authenticate('/auth/login', { phone, password }), register: (name, phone, password, role) => authenticate('/auth/register', { name, phone, password, role }), logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider.'); return context; }
