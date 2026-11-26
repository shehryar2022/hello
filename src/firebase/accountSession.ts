import { COUNTRIES, SAVE_KEY } from '../game/constants';
import { freshState, migrateState } from '../game/rules';
import type { CountryTuple, GameState } from '../game/types';

export const OFFLINE_SAVE_KEY = `${SAVE_KEY}_offline`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  return null;
}

/**
 * Returns the strictly isolated localStorage key for the active account.
 * Authenticated users always get `cet_save_v1_${uid}` and never share a key
 * with offline mode or another account.
 */
export function saveStorageKeyForUid(uid: string | null | undefined): string {
  const clean = typeof uid === 'string' ? uid.trim() : '';
  return clean ? `${SAVE_KEY}_${clean}` : OFFLINE_SAVE_KEY;
}

/**
 * Checks whether an offline save exists (without ever touching authenticated UID keys).
 */
export function hasOfflineSave(storage: StorageLike | null = getDefaultStorage()): boolean {
  if (!storage) return false;
  try {
    return Boolean(storage.getItem(OFFLINE_SAVE_KEY) || storage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}

/**
 * Loads cached save state strictly for the given UID (or offline guest key when uid is null).
 * Authenticated users NEVER fall back to or import the legacy shared `cet_save_v1` key.
 */
export function readAccountSave(
  uid: string | null,
  storage: StorageLike | null = getDefaultStorage(),
): GameState | null {
  if (!storage) return null;
  const key = saveStorageKeyForUid(uid);
  try {
    let raw = storage.getItem(key);
    // Legacy shared `cet_save_v1` is strictly offline-guest-only, never imported into cloud accounts
    if (!raw && uid === null) {
      raw = storage.getItem(SAVE_KEY);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return migrateState(parsed as Partial<GameState>);
  } catch {
    return null;
  }
}

/**
 * Persists game state strictly to the UID-scoped key (or offline key when uid is null).
 */
export function writeAccountSave(
  uid: string | null,
  state: GameState,
  storage: StorageLike | null = getDefaultStorage(),
  nowMs = Date.now(),
): boolean {
  if (!storage) return false;
  try {
    const key = saveStorageKeyForUid(uid);
    const toStore: GameState = { ...state, t: nowMs };
    storage.setItem(key, JSON.stringify(toStore));
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates that an async operation still belongs to the same active user and auth sequence.
 */
export function isSessionStillValid(
  currentUid: string | null,
  expectedUid: string | null,
  currentSeq: number,
  expectedSeq: number,
): boolean {
  return currentUid === expectedUid && currentSeq === expectedSeq;
}

/**
 * Initializes the in-memory game state for an authenticated cloud account strictly from
 * its Firestore `saves/${uid}` document or `freshState()` — never from another account's
 * state or shared localStorage.
 */
export function buildInitialCloudState(
  cloudSaveRaw: Partial<GameState> | null | undefined,
  countryCode: string,
  countryName: string,
): GameState {
  const base =
    cloudSaveRaw && typeof cloudSaveRaw === 'object'
      ? migrateState(cloudSaveRaw)
      : freshState();
  const matched = COUNTRIES.find((c) => c[0] === countryCode);
  return {
    ...base,
    country: matched || [countryCode || 'PK', countryName || 'Pakistan'],
  };
}

/**
 * Builds the seed state when an account completes onboarding.
 * Always starts from `freshState()` (or the account's existing `saves/${uid}` if present)
 * with only the chosen country applied — never inheriting offline or previous-account progress.
 */
export function buildOnboardingSeedState(countryCode: string): GameState {
  const base = freshState();
  const chosen: CountryTuple = COUNTRIES.find((c) => c[0] === countryCode) || COUNTRIES[0];
  return {
    ...base,
    country: chosen,
  };
}
