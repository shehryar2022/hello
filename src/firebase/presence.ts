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
 * peers within `activeWindowMs`, sorted descending by GDP.
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
    .sort((a, b) => (b.gdp || 0) - (a.gdp || 0));
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
