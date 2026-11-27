import { ACTIVE_WINDOW_MS, HEARTBEAT_MS } from '../game/constants';
import type { PlayerProfile } from '../game/types';

export const PRESENCE_QUERY_BUFFER_MS = 120_000;
export const HEARTBEAT_RETRY_GAP_MS = 30_000;

/**
 * Determines whether a player's `lastSeen` timestamp qualifies as online
 * against server-calibrated time. Tolerates minor forward server-time jitter.
 */
export function isPlayerOnline(
  seenMs: number | undefined,
  nowSrvMs: number,
  activeWindowMs = ACTIVE_WINDOW_MS,
): boolean {
  if (!seenMs || !Number.isFinite(seenMs) || seenMs <= 0) return false;
  if (!Number.isFinite(nowSrvMs)) return false;
  return nowSrvMs - seenMs <= activeWindowMs;
}

/**
 * Filters raw player profiles down to the signed-in user plus currently online
 * peers within `activeWindowMs`, sorted descending by GDP with deterministic ID tie-break.
 */
export function filterAndSortLeaderboard(
  players: PlayerProfile[],
  myUid: string,
  nowSrvMs: number,
  activeWindowMs = ACTIVE_WINDOW_MS,
): PlayerProfile[] {
  const byId = new Map<string, PlayerProfile>();
  for (const p of players) {
    if (!p?.id) continue;
    const prev = byId.get(p.id);
    if (!prev || (p.seen || 0) >= (prev.seen || 0)) {
      byId.set(p.id, p);
    }
  }
  return Array.from(byId.values())
    .filter((p) => p.id === myUid || isPlayerOnline(p.seen, nowSrvMs, activeWindowMs))
    .sort((a, b) => {
      const diff = (b.gdp || 0) - (a.gdp || 0);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });
}

function mergeProfileFields(prev: PlayerProfile | undefined, next: PlayerProfile): PlayerProfile {
  if (!prev) return next;
  const nextSeen = Math.max(prev.seen || 0, next.seen || 0);
  const incomingHasName = Boolean(next.username && next.username.trim().length > 0);
  const incomingHasCountry = Boolean(next.countryCode && next.countryName);
  const incomingSubValid = Boolean(next.subTier);
  const resolveCos = (nextVal: string | undefined, prevVal: string | undefined) =>
    typeof nextVal === 'string' ? nextVal : prevVal;
  return {
    ...prev,
    ...next,
    username: incomingHasName ? next.username : prev.username,
    usernameLower: incomingHasName ? next.usernameLower || next.username.toLowerCase() : prev.usernameLower,
    countryCode: incomingHasCountry ? next.countryCode : prev.countryCode,
    countryName: incomingHasCountry ? next.countryName : prev.countryName,
    rank: next.rank > 0 ? next.rank : prev.rank,
    level: next.level > 0 ? next.level : prev.level,
    subTier: incomingSubValid ? next.subTier : next.subTier === '' ? '' : prev.subTier,
    subExp: incomingSubValid ? next.subExp : next.subExp ?? prev.subExp,
    cosFrame: resolveCos(next.cosFrame, prev.cosFrame),
    cosNameFx: resolveCos(next.cosNameFx, prev.cosNameFx),
    cosBadge: resolveCos(next.cosBadge, prev.cosBadge),
    seen: nextSeen > 0 ? nextSeen : prev.seen,
    stats: next.stats
      ? {
          buildings: next.stats.buildings ?? prev.stats?.buildings ?? 0,
          completedTrades: next.stats.completedTrades ?? prev.stats?.completedTrades ?? 0,
          tradesSent: next.stats.tradesSent ?? prev.stats?.tradesSent ?? 0,
          tradesReceived: next.stats.tradesReceived ?? prev.stats?.tradesReceived ?? 0,
          cashTraded: next.stats.cashTraded ?? prev.stats?.cashTraded ?? 0,
          gemsTraded: next.stats.gemsTraded ?? prev.stats?.gemsTraded ?? 0,
        }
      : prev.stats,
  };
}

export interface MergeLeaderboardOptions {
  fromCache?: boolean;
  isPrunePass?: boolean;
  ownProfileOverride?: PlayerProfile | null;
  activeWindowMs?: number;
}

/**
 * Merges incoming leaderboard snapshots against previous profiles so that:
 * 1. Empty cached snapshots during listener resubscription do not blank valid rows.
 * 2. Incomplete incoming snapshots never overwrite valid cached names/countries/ranks.
 * 3. Peers temporarily missing from a single snapshot boundary stay visible while their
 *    cached `seen` timestamp remains well inside the active window (except during prune passes).
 * 4. The signed-in user's own profile override stays authoritative and never blinks out.
 */
export function mergeLeaderboardProfiles(
  prevList: PlayerProfile[],
  incomingList: PlayerProfile[],
  myUid: string,
  nowSrvMs: number,
  options: MergeLeaderboardOptions = {},
): PlayerProfile[] {
  const activeWindowMs = options.activeWindowMs ?? ACTIVE_WINDOW_MS;
  if (options.fromCache && incomingList.length === 0 && prevList.length > 0 && !options.isPrunePass) {
    return prevList;
  }

  const prevById = new Map<string, PlayerProfile>();
  for (const p of prevList) {
    if (p?.id) prevById.set(p.id, p);
  }

  const mergedById = new Map<string, PlayerProfile>();
  for (const raw of incomingList) {
    if (!raw?.id) continue;
    const merged = mergeProfileFields(prevById.get(raw.id), raw);
    const existing = mergedById.get(raw.id);
    if (!existing || (merged.seen || 0) >= (existing.seen || 0)) {
      mergedById.set(raw.id, merged);
    }
  }

  // Retain recently seen peers across transient single-snapshot fluctuations until window expiry
  if (!options.isPrunePass) {
    for (const prev of prevList) {
      if (!prev?.id || mergedById.has(prev.id)) continue;
      if (prev.id === myUid || isPlayerOnline(prev.seen, nowSrvMs, Math.max(60_000, activeWindowMs - 15_000))) {
        mergedById.set(prev.id, prev);
      }
    }
  }

  if (options.ownProfileOverride && options.ownProfileOverride.id === myUid) {
    const existingOwn = mergedById.get(myUid) || prevById.get(myUid);
    mergedById.set(myUid, mergeProfileFields(existingOwn, options.ownProfileOverride));
  }

  return filterAndSortLeaderboard(Array.from(mergedById.values()), myUid, nowSrvMs, activeWindowMs);
}

/**
 * Shallow-semantic equality check for sorted leaderboard arrays so identical
 * snapshots / prune ticks avoid redundant React state updates and row re-renders.
 */
export function areLeaderboardListsEqual(a: PlayerProfile[], b: PlayerProfile[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.username !== y.username ||
      x.countryCode !== y.countryCode ||
      x.countryName !== y.countryName ||
      x.gdp !== y.gdp ||
      x.cash !== y.cash ||
      x.gems !== y.gems ||
      x.rank !== y.rank ||
      x.level !== y.level ||
      (x.subTier || '') !== (y.subTier || '') ||
      (x.subExp || 0) !== (y.subExp || 0) ||
      (x.cosFrame || '') !== (y.cosFrame || '') ||
      (x.cosNameFx || '') !== (y.cosNameFx || '') ||
      (x.cosBadge || '') !== (y.cosBadge || '') ||
      (x.stats?.buildings || 0) !== (y.stats?.buildings || 0) ||
      (x.stats?.completedTrades || 0) !== (y.stats?.completedTrades || 0)
    ) {
      return false;
    }
  }
  return true;
}


/**
 * Returns true if a heartbeat write should be triggered now.
 * - Normal cadence: at least `intervalMs` (default 3m) since the last successful write.
 * - Recovery cadence: if a previous heartbeat failed (so `lastSuccessMs` wasn't updated),
 *   retried after `retryGapMs` (default 30s).
 */
export function isHeartbeatDue(
  lastSuccessMs: number,
  lastAttemptMs: number,
  nowMs: number,
  intervalMs = HEARTBEAT_MS,
  retryGapMs = HEARTBEAT_RETRY_GAP_MS,
): boolean {
  if (lastSuccessMs <= 0) {
    return lastAttemptMs <= 0 || nowMs - lastAttemptMs >= retryGapMs;
  }
  const sinceSuccess = nowMs - lastSuccessMs;
  if (sinceSuccess < intervalMs - 5000) return false;
  return lastAttemptMs <= lastSuccessMs || nowMs - lastAttemptMs >= retryGapMs;
}

/**
 * Returns true when server-time calibration changed meaningfully (initial calibration
 * on skewed clocks or >=25s drift) so the active players query cutoff should refresh.
 */
export function shouldRefreshPresenceQuery(
  prevOffsetMs: number,
  nextOffsetMs: number,
  wasVerified: boolean,
  thresholdMs = 25_000,
): boolean {
  if (!wasVerified) {
    return Math.abs(nextOffsetMs - prevOffsetMs) >= thresholdMs;
  }
  return Math.abs(nextOffsetMs - prevOffsetMs) >= thresholdMs;
}
