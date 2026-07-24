import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@history-content:';
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;
const memory = new Map<string, { expiresAt: number; value: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();

type CacheEnvelope<T> = { expiresAt: number; value: T };

export async function cachedLoad<T>(
  key: string,
  loader: () => Promise<T>,
  options: { ttlMs?: number; forceRefresh?: boolean } = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const storageKey = `${CACHE_PREFIX}${key}`;
  if (!options.forceRefresh) {
    const local = memory.get(storageKey);
    if (local && local.expiresAt > Date.now()) return local.value as T;
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const cached = JSON.parse(raw) as CacheEnvelope<T>;
        if (cached.expiresAt > Date.now()) {
          memory.set(storageKey, cached);
          return cached.value;
        }
      }
    } catch {
      await AsyncStorage.removeItem(storageKey).catch(() => undefined);
    }
  }

  const running = inFlight.get(storageKey);
  if (running) return running as Promise<T>;
  const request = loader().then(async (value) => {
    const envelope: CacheEnvelope<T> = { expiresAt: Date.now() + ttlMs, value };
    memory.set(storageKey, envelope);
    await AsyncStorage.setItem(storageKey, JSON.stringify(envelope));
    return value;
  }).finally(() => inFlight.delete(storageKey));
  inFlight.set(storageKey, request);
  return request;
}

export async function invalidateContentCache(prefix = '') {
  const keys = await AsyncStorage.getAllKeys();
  const targets = keys.filter((key) => key.startsWith(`${CACHE_PREFIX}${prefix}`));
  targets.forEach((key) => memory.delete(key));
  if (targets.length) await AsyncStorage.multiRemove(targets);
}

interface StaticManifest {
  contentVersion: string;
  files: Record<string, { url: string; sha256: string }>;
}

const STATIC_CACHE_PREFIX = '@history-static:';
const MANIFEST_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
let manifestMemory: StaticManifest | null = null;
let manifestCheckedAt = 0;

function contentBaseUrl() {
  return (process.env.EXPO_PUBLIC_CONTENT_BASE_URL ?? '').replace(/\/$/, '');
}

async function loadManifest(force = false): Promise<StaticManifest | null> {
  const baseUrl = contentBaseUrl();
  if (!baseUrl) return null;
  if (!force && manifestMemory && Date.now() - manifestCheckedAt < MANIFEST_CHECK_INTERVAL_MS) return manifestMemory;
  const cachedRaw = await AsyncStorage.getItem(`${STATIC_CACHE_PREFIX}manifest`);
  let cached: StaticManifest | null = null;
  try { cached = cachedRaw ? JSON.parse(cachedRaw) as StaticManifest : null; } catch { /* bỏ cache hỏng */ }
  try {
    const response = await fetch(`${baseUrl}/manifest.json`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json() as StaticManifest;
    if (!manifest.contentVersion || !manifest.files) throw new Error('Manifest không hợp lệ');
    manifestMemory = manifest;
    manifestCheckedAt = Date.now();
    await AsyncStorage.setItem(`${STATIC_CACHE_PREFIX}manifest`, JSON.stringify(manifest));
    return manifest;
  } catch {
    manifestMemory = cached;
    manifestCheckedAt = Date.now();
    return cached;
  }
}

export async function getStaticJson<T>(logicalPath: string): Promise<T | null> {
  const baseUrl = contentBaseUrl();
  if (!baseUrl) return null;
  const cacheKey = `${STATIC_CACHE_PREFIX}file:${logicalPath}`;
  const cachedRaw = await AsyncStorage.getItem(cacheKey);
  let cached: { sha256: string; value: T } | null = null;
  try { cached = cachedRaw ? JSON.parse(cachedRaw) as { sha256: string; value: T } : null; } catch { /* bỏ cache hỏng */ }

  const manifest = await loadManifest(!cached);
  const descriptor = manifest?.files[logicalPath];
  if (cached && (!descriptor || descriptor.sha256 === cached.sha256)) return cached.value;
  if (!descriptor) return cached?.value ?? null;
  try {
    const response = await fetch(`${baseUrl}/${descriptor.url.replace(/^\//, '')}`);
    if (!response.ok) return null;
    const value = await response.json() as T;
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ sha256: descriptor.sha256, value }));
    return value;
  } catch {
    return cached?.value ?? null;
  }
}
