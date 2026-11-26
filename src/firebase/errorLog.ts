export type ErrorSource = 'firestore' | 'auth' | 'sync' | 'runtime';

export interface AppErrorEntry {
  id: string;
  time: number;
  source: ErrorSource;
  operationType?: string;
  path?: string | null;
  code?: string;
  message: string;
  details?: string;
}

const MAX_ERRORS = 30;
const DEDUPE_WINDOW_MS = 3000;

let entries: AppErrorEntry[] = [];
const listeners = new Set<() => void>();
let listenersInstalled = false;

function notify() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // Ignore subscriber errors
    }
  }
}

export function getErrorLog(): AppErrorEntry[] {
  return entries;
}

export function subscribeErrorLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearErrorLog(): void {
  if (entries.length === 0) return;
  entries = [];
  notify();
}

export function recordAppError(input: {
  source: ErrorSource;
  message: string;
  code?: string;
  operationType?: string;
  path?: string | null;
  details?: string;
}): AppErrorEntry {
  const now = Date.now();
  const cleanMsg = (input.message || 'Unknown error').trim().slice(0, 500);
  const cleanPath = input.path ?? null;
  const cleanCode = input.code ? String(input.code).slice(0, 80) : undefined;

  const duplicate = entries.find(
    (e) =>
      now - e.time < DEDUPE_WINDOW_MS &&
      e.source === input.source &&
      e.path === cleanPath &&
      e.message === cleanMsg &&
      e.code === cleanCode,
  );
  if (duplicate) return duplicate;

  const entry: AppErrorEntry = {
    id: `${now}_${Math.random().toString(36).slice(2, 8)}`,
    time: now,
    source: input.source,
    operationType: input.operationType,
    path: cleanPath,
    code: cleanCode,
    message: cleanMsg,
    details: input.details ? input.details.slice(0, 4000) : undefined,
  };

  entries = [entry, ...entries].slice(0, MAX_ERRORS);
  notify();
  return entry;
}

export function extractErrorCode(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err || 'Unknown error');
  }
}

export function formatErrorLogReport(list: AppErrorEntry[] = entries): string {
  if (!list.length) return 'No errors recorded.';
  return list
    .map((e, idx) => {
      const ts = new Date(e.time).toISOString();
      const head = `[${idx + 1}] ${ts} | ${e.source.toUpperCase()}${e.code ? ` (${e.code})` : ''}${e.operationType ? ` | op=${e.operationType}` : ''}${e.path ? ` | path=${e.path}` : ''}`;
      return e.details ? `${head}\n${e.message}\n${e.details}` : `${head}\n${e.message}`;
    })
    .join('\n\n---\n\n');
}

export function installGlobalErrorListeners(): void {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;

  window.addEventListener('error', (event) => {
    const msg = event.message || extractErrorMessage(event.error);
    if (!msg || /ResizeObserver|WebSocket|vite-hmr/i.test(msg)) return;
    recordAppError({
      source: 'runtime',
      message: msg,
      details: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : undefined,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = extractErrorMessage(event.reason);
    const code = extractErrorCode(event.reason);
    if (!msg || /ResizeObserver|WebSocket|vite-hmr|cancelled-popup-request/i.test(`${code} ${msg}`)) {
      return;
    }
    recordAppError({
      source: code.startsWith('auth/') ? 'auth' : 'runtime',
      code: code || undefined,
      message: msg,
    });
  });
}
