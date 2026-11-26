export const VERSION_ENDPOINT = '/version.json';
export const VERSION_POLL_INTERVAL_MS = 60_000;
export const RELOAD_GUARD_KEY = 'cet_update_reload_guard';
export const VERSION_BROADCAST_CHANNEL = 'cet_version_channel';
const RELOAD_GUARD_WINDOW_MS = 120_000;
const RELOAD_GUARD_MAX_ATTEMPTS = 2;

export interface VersionManifest {
  version: string;
  builtAt?: number;
}

export interface ReloadGuardRecord {
  fromVersion: string;
  targetVersion: string;
  ts: number;
  attempts: number;
}

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function getRunningAppVersion(): string {
  try {
    if (typeof __APP_VERSION__ === 'string' && __APP_VERSION__.trim()) {
      return __APP_VERSION__.trim();
    }
  } catch {
    // Fallback outside Vite runtime (e.g. direct Node unit tests)
  }
  return 'dev';
}

export function parseVersionManifest(raw: unknown): VersionManifest | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.version !== 'string') return null;
  const version = obj.version.trim();
  if (!version || version.length > 128) return null;
  const builtAt =
    typeof obj.builtAt === 'number' && Number.isFinite(obj.builtAt) && obj.builtAt > 0
      ? Math.floor(obj.builtAt)
      : undefined;
  return builtAt !== undefined ? { version, builtAt } : { version };
}

export function isNewerVersionDeployed(
  runningVersion: string,
  remoteManifest: VersionManifest | null,
): boolean {
  if (!runningVersion || !remoteManifest?.version) return false;
  return remoteManifest.version !== runningVersion;
}

export async function fetchLatestVersion(
  fetchImpl: typeof fetch = globalThis.fetch,
  endpoint = VERSION_ENDPOINT,
  timeoutMs = 8_000,
): Promise<VersionManifest | null> {
  if (typeof fetchImpl !== 'function') return null;
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${endpoint}${sep}t=${Date.now()}`;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer =
    controller && typeof setTimeout === 'function'
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      signal: controller?.signal,
    });
    if (!res.ok) return null;
    const ctype = res.headers?.get?.('content-type') || '';
    if (ctype && !/json/i.test(ctype)) {
      // Avoid parsing SPA HTML fallback as JSON
      return null;
    }
    const json: unknown = await res.json();
    return parseVersionManifest(json);
  } catch {
    // Never trigger false update alerts or crash on offline/transient network failures
    return null;
  } finally {
    if (timer !== null && typeof clearTimeout === 'function') {
      clearTimeout(timer);
    }
  }
}

function getDefaultSessionStorage(): StorageWriter | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

function readReloadGuard(storage: StorageReader | null): ReloadGuardRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(RELOAD_GUARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReloadGuardRecord>;
    if (
      typeof parsed.fromVersion === 'string' &&
      typeof parsed.targetVersion === 'string' &&
      typeof parsed.ts === 'number' &&
      Number.isFinite(parsed.ts) &&
      typeof parsed.attempts === 'number' &&
      Number.isFinite(parsed.attempts)
    ) {
      return {
        fromVersion: parsed.fromVersion,
        targetVersion: parsed.targetVersion,
        ts: parsed.ts,
        attempts: parsed.attempts,
      };
    }
  } catch {
    // ignore malformed entry
  }
  return null;
}

/**
 * Checks whether reloading for `targetVersion` is safe or if repeated recent reloads
 * still loaded the stale bundle (indicating CDN/browser caching).
 */
export function evaluateUpdateReloadGuard(
  runningVersion: string,
  targetVersion: string,
  nowMs = Date.now(),
  storage: StorageReader | null = getDefaultSessionStorage(),
): { allowAutoReload: boolean; loopDetected: boolean; attempts: number } {
  const prev = readReloadGuard(storage);
  if (
    prev &&
    prev.fromVersion === runningVersion &&
    prev.targetVersion === targetVersion &&
    nowMs - prev.ts >= 0 &&
    nowMs - prev.ts < RELOAD_GUARD_WINDOW_MS &&
    prev.attempts >= RELOAD_GUARD_MAX_ATTEMPTS
  ) {
    return { allowAutoReload: false, loopDetected: true, attempts: prev.attempts };
  }
  return {
    allowAutoReload: true,
    loopDetected: false,
    attempts: prev && prev.targetVersion === targetVersion ? prev.attempts : 0,
  };
}

export function recordUpdateReloadAttempt(
  runningVersion: string,
  targetVersion: string,
  nowMs = Date.now(),
  storage: StorageWriter | null = getDefaultSessionStorage(),
): void {
  if (!storage) return;
  try {
    const prev = readReloadGuard(storage);
    const sameCycle =
      prev &&
      prev.fromVersion === runningVersion &&
      prev.targetVersion === targetVersion &&
      nowMs - prev.ts >= 0 &&
      nowMs - prev.ts < RELOAD_GUARD_WINDOW_MS;
    const next: ReloadGuardRecord = {
      fromVersion: runningVersion,
      targetVersion,
      ts: nowMs,
      attempts: sameCycle ? prev.attempts + 1 : 1,
    };
    storage.setItem(RELOAD_GUARD_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

export function clearUpdateReloadGuardIfMatched(
  runningVersion: string,
  storage: StorageWriter | null = getDefaultSessionStorage(),
): void {
  if (!storage) return;
  try {
    const prev = readReloadGuard(storage);
    if (prev && prev.fromVersion !== runningVersion) {
      storage.removeItem(RELOAD_GUARD_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Unregisters stale service workers and clears Cache Storage without touching
 * Firebase Auth persistence (`localStorage` / `IndexedDB`).
 */
export async function clearAppCachesBeforeReload(): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker?.getRegistrations) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister().catch(() => false)));
    }
  } catch {
    // ignore
  }
  try {
    if (typeof window !== 'undefined' && 'caches' in window && window.caches?.keys) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k).catch(() => false)));
    }
  } catch {
    // ignore
  }
}

export function buildCacheBustedUrl(href: string, targetVersion: string): string {
  try {
    const u = new URL(href);
    u.searchParams.set('_v', targetVersion);
    return u.toString();
  } catch {
    return href;
  }
}
