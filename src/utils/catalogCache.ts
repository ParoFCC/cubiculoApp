import { MMKV } from "react-native-mmkv";

const storage = new MMKV({ id: "catalog-cache" });

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  ts: number;
  data: T;
}

export function setCached<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { ts: Date.now(), data };
  storage.set(key, JSON.stringify(entry));
}

export function getCached<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts < TTL_MS) return entry.data;
  } catch {
    // corrupted entry — fall through and return null
  }
  return null;
}

export function invalidateCache(key: string): void {
  storage.delete(key);
}
