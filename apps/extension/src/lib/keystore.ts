import { generateDeviceKey } from '@devnull-github/client';

/**
 * The device key, as a non-extractable CryptoKeyPair in the extension's own IndexedDB. Background only.
 */

const DB = 'devnull-github';
const STORE = 'keys';
const KEY = 'device';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function loadKey(): Promise<CryptoKeyPair | null> {
  return ((await run('readonly', (store) => store.get(KEY))) as CryptoKeyPair | undefined) ?? null;
}

/** The stored key, or a new one, stored first. */
export async function loadOrCreateKey(): Promise<CryptoKeyPair> {
  const existing = await loadKey();
  if (existing) return existing;

  const keyPair = await generateDeviceKey();
  await run('readwrite', (store) => store.put(keyPair, KEY));

  return keyPair;
}

/** Forgets the key. Signing in again makes a new one, which the user approves as a new device. */
export async function deleteKey(): Promise<void> {
  await run('readwrite', (store) => store.delete(KEY));
}
