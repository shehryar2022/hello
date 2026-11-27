import { ACHIEVEMENTS, STICKERS, TZ } from './constants';
import type { GameState, RewardHistoryEntry, StickerDef } from './types';

export interface DailySlotDef {
  day: 1 | 2 | 3 | 4 | 5;
  title: string;
  icon: string;
  coins: number;
  diamonds: number;
  bonusLabel?: string;
  grantsSticker?: boolean;
}

export const DAILY_SLOT_REWARDS: readonly DailySlotDef[] = [
  { day: 1, title: 'Treasury Starter', icon: '🌅', coins: 1_500, diamonds: 2 },
  { day: 2, title: 'Trade Dividend', icon: '🪙', coins: 4_500, diamonds: 3 },
  { day: 3, title: 'Civic Reserve', icon: '🏛️', coins: 12_000, diamonds: 5 },
  { day: 4, title: 'Expansion Grant', icon: '⚡', coins: 30_000, diamonds: 8 },
  {
    day: 5,
    title: 'Sovereign Vault',
    icon: '👑',
    coins: 75_000,
    diamonds: 15,
    bonusLabel: '+1 Rare Sticker',
    grantsSticker: true,
  },
] as const;

export type DailySlotStatus = 'claimed' | 'available' | 'locked';

export interface DailySlotView extends DailySlotDef {
  status: DailySlotStatus;
}

export interface DailyRewardsView {
  slots: DailySlotView[];
  canClaimToday: boolean;
  claimedToday: boolean;
  activeSlotDay: number;
  completedInCycle: number;
  msUntilNextReset: number;
  history: RewardHistoryEntry[];
}

const KARACHI_YMD = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const KARACHI_YMD_HMS = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function rewardsDayKey(nowMs = Date.now()): string {
  const safe = Number.isFinite(nowMs) ? nowMs : Date.now();
  return KARACHI_YMD.format(new Date(safe));
}

export function rewardsWeekKey(nowMs = Date.now()): string {
  const ymd = rewardsDayKey(nowMs);
  const [y, m, d] = ymd.split('-').map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getKarachiParts(nowMs: number) {
  const safe = Number.isFinite(nowMs) ? nowMs : Date.now();
  const parts = KARACHI_YMD_HMS.formatToParts(new Date(safe));
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = Number(p.value) || 0;
  }
  return {
    year: map.year || 2026,
    month: map.month || 1,
    day: map.day || 1,
    hour: map.hour === 24 ? 0 : (map.hour || 0),
    minute: map.minute || 0,
    second: map.second || 0,
  };
}

export function msUntilNextKarachiDay(nowMs = Date.now()): number {
  const p = getKarachiParts(nowMs);
  const elapsedTodayMs = ((p.hour * 60 + p.minute) * 60 + p.second) * 1000;
  return Math.max(1000, 86_400_000 - elapsedTodayMs);
}

export function getDailyRewardsView(s: GameState, nowMs = Date.now()): DailyRewardsView {
  const today = rewardsDayKey(nowMs);
  const claimedToday = Boolean(s.dLastDay && s.dLastDay === today);
  const rawCompleted = Math.max(0, Math.min(5, Math.floor(Number(s.dSlot) || 0)));
  // After Day 5 is claimed and a new day arrives, start cleanly on a fresh 5-day cycle
  const completedInCycle = !claimedToday && rawCompleted >= 5 ? 0 : rawCompleted;
  const canClaimToday = !claimedToday;
  const activeSlotDay = claimedToday
    ? Math.max(1, completedInCycle)
    : Math.min(5, completedInCycle + 1);

  const slots: DailySlotView[] = DAILY_SLOT_REWARDS.map((def) => {
    let status: DailySlotStatus = 'locked';
    if (def.day <= completedInCycle) {
      status = 'claimed';
    } else if (canClaimToday && def.day === completedInCycle + 1) {
      status = 'available';
    }
    return { ...def, status };
  });

  return {
    slots,
    canClaimToday,
    claimedToday,
    activeSlotDay,
    completedInCycle,
    msUntilNextReset: msUntilNextKarachiDay(nowMs),
    history: Array.isArray(s.dHist) ? s.dHist : [],
  };
}

export function applyClaimDailySlot(
  s: GameState,
  nowMs = Date.now(),
  rng: () => number = Math.random,
): {
  ok: boolean;
  state: GameState;
  slot?: DailySlotDef;
  coinsAdded: number;
  diamondsAdded: number;
  sticker: StickerDef | null;
  reason?: string;
} {
  const view = getDailyRewardsView(s, nowMs);
  if (!view.canClaimToday) {
    return {
      ok: false,
      state: s,
      coinsAdded: 0,
      diamondsAdded: 0,
      sticker: null,
      reason: 'Daily reward already claimed today',
    };
  }
  const slotIdx = Math.max(0, Math.min(4, view.completedInCycle));
  const slot = DAILY_SLOT_REWARDS[slotIdx];
  const today = rewardsDayKey(nowMs);

  let nextStk = s.stk || {};
  let grantedSticker: StickerDef | null = null;
  if (slot.grantsSticker) {
    const rarePool = STICKERS.filter((st) => st.r >= 2);
    const pool = rarePool.length ? rarePool : STICKERS;
    grantedSticker = pool[Math.floor(rng() * pool.length) % pool.length];
    nextStk = { ...nextStk, [grantedSticker.id]: (nextStk[grantedSticker.id] || 0) + 1 };
  }

  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  const safeGems = Number.isFinite(s.gems) ? Math.max(0, Math.floor(s.gems)) : 0;
  const entry: RewardHistoryEntry = {
    day: today,
    label: `Day ${slot.day}: ${slot.title}`,
    coins: slot.coins,
    diamonds: slot.diamonds,
    bonus: grantedSticker ? `${grantedSticker.e} ${grantedSticker.n}` : undefined,
  };
  const nextHist = [entry, ...(Array.isArray(s.dHist) ? s.dHist : [])].slice(0, 8);

  return {
    ok: true,
    slot,
    coinsAdded: slot.coins,
    diamondsAdded: slot.diamonds,
    sticker: grantedSticker,
    state: {
      ...s,
      cash: Math.min(1e13, safeCash + slot.coins),
      gems: Math.min(1e9, safeGems + slot.diamonds),
      stk: nextStk,
      dSlot: slot.day,
      dLastDay: today,
      dHist: nextHist,
    },
  };
}

export function formatCountdownShort(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSec / 86_400);
  const h = Math.floor((totalSec % 86_400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
}

export function computeReadyAchievementCount(s: GameState): number {
  let count = 0;
  for (const a of ACHIEVEMENTS) {
    if (!s.achievements?.[a.id] && a.f(s) >= a.goal) count += 1;
  }
  return count;
}
