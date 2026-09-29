export type OfflineState = 'draft' | 'queued' | 'syncing' | 'synced' | 'failed';
export interface CollectionOperation {
  id: string; ownerId: string; pickupId: string; payload: { measuredKg: number; paidAmount: number; paymentMode: 'UPI' | 'Cash' | 'Direct Jan-Dhan Transfer' };
  state: OfflineState; attempts: number; error?: string; createdAt: string; updatedAt: string;
}
interface CacheEntry<T = unknown> { key: string; value: T; savedAt: string; }
const DB_NAME = 'scraplink-offline';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Offline storage is not available in this browser.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('cache')) db.createObjectStore('cache', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('operations')) db.createObjectStore('operations', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open offline storage.'));
  });
}

async function runRequest<T>(storeName: 'cache' | 'operations', mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = run(transaction.objectStore(storeName));
    let result: T | undefined;
    request.onsuccess = () => { result = request.result as T; };
    request.onerror = () => reject(request.error || new Error('Offline storage operation failed.'));
    transaction.oncomplete = () => { db.close(); resolve(result as T); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Offline storage transaction failed.')); };
  });
}

export async function cacheValue<T>(key: string, value: T) { await runRequest('cache', 'readwrite', (store) => store.put({ key, value, savedAt: new Date().toISOString() } satisfies CacheEntry<T>)); }
export async function readCachedValue<T>(key: string): Promise<T | null> { const result = await runRequest<CacheEntry<T> | undefined>('cache', 'readonly', (store) => store.get(key)); return result?.value ?? null; }
export async function saveOperation(operation: CollectionOperation) { await runRequest('operations', 'readwrite', (store) => store.put(operation)); }
export async function readOperations(): Promise<CollectionOperation[]> { return runRequest('operations', 'readonly', (store) => store.getAll()); }
export async function deleteOperation(id: string) { await runRequest('operations', 'readwrite', (store) => store.delete(id)); }
export function makeOperationId() { return `local-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`; }
