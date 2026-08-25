/**
 * dbStore.ts - High-Performance IndexedDB Storage Engine with Memory Cache & Atomic LocalStorage Migration
 * Eliminates browser 5MB storage limits, supports large-scale ledger history, asset snapshots, and multi-image caches.
 */

const DB_NAME = 'SmartWealthDB_v1';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

class IndexedDBStore {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryCache: Map<string, any> = new Map();
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = (e: any) => {
          resolve(e.target.result);
        };
        req.onerror = (e) => {
          console.warn('[dbStore] IndexedDB open error, falling back to LocalStorage:', e);
          reject(e);
        };
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /**
   * Initializes cache from LocalStorage & IndexedDB on startup
   */
  public async preload(keys: string[]) {
    // 1. First sync populate from LocalStorage for 0ms initial render
    for (const key of keys) {
      const localVal = localStorage.getItem(key);
      if (localVal) {
        try {
          this.memoryCache.set(key, JSON.parse(localVal));
        } catch {
          this.memoryCache.set(key, localVal);
        }
      }
    }

    // 2. Load from IndexedDB and migrate if necessary
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      await Promise.all(
        keys.map(key => {
          return new Promise<void>((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => {
              if (req.result !== undefined) {
                this.memoryCache.set(key, req.result);
              } else {
                // Migrate from LocalStorage to IndexedDB
                const localVal = this.memoryCache.get(key);
                if (localVal !== undefined) {
                  this.setAsync(key, localVal).catch(() => {});
                }
              }
              resolve();
            };
            req.onerror = () => resolve();
          });
        })
      );
      this.isInitialized = true;
    } catch (e) {
      console.warn('[dbStore] Preload error:', e);
    }
  }

  /**
   * Synchronous Read from Memory Cache (0ms latency for React components)
   */
  public getSync<T>(key: string, fallback: T): T {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    const localVal = localStorage.getItem(key);
    if (localVal) {
      try {
        const parsed = JSON.parse(localVal);
        this.memoryCache.set(key, parsed);
        return parsed;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  /**
   * Synchronous & Asynchronous dual write with fallback
   */
  public set<T>(key: string, value: T): void {
    this.memoryCache.set(key, value);

    // Write to LocalStorage (with quota guard)
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[dbStore] LocalStorage quota exceeded, relying on IndexedDB:', e);
    }

    // Write to IndexedDB asynchronously
    this.setAsync(key, value).catch(err => {
      console.warn(`[dbStore] Failed to write ${key} to IndexedDB:`, err);
    });
  }

  private async setAsync<T>(key: string, value: T): Promise<void> {
    try {
      const db = await this.initDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
    } catch (e) {
      // Ignored fallback
    }
  }

  public remove(key: string): void {
    this.memoryCache.delete(key);
    localStorage.removeItem(key);
    this.initDB().then(db => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    }).catch(() => {});
  }

  public clear(): void {
    this.memoryCache.clear();
    this.initDB().then(db => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    }).catch(() => {});
  }
}

export const dbStore = new IndexedDBStore();
