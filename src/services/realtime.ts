import { io, Socket } from 'socket.io-client';
import { apiOrigin, getToken } from './api';

export interface PlatformUpdate {
  resource: string;
  action: string;
  entityId?: string;
  at: string;
}

let socket: Socket | null = null;
const listeners = new Set<(event: PlatformUpdate) => void>();

export function connectRealtime() {
  const token = getToken();
  if (!token) return () => undefined;
  socket?.disconnect();
  socket = io(apiOrigin(), { auth: { token }, transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity, timeout: 10000 });
  socket.on('platform:update', (event: PlatformUpdate) => listeners.forEach((listener) => listener(event)));
  return () => { socket?.disconnect(); socket = null; };
}

export function subscribeRealtime(listener: (event: PlatformUpdate) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
