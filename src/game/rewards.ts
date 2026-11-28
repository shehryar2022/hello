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
  { day: 1, title: 'Treasury Starter', icon: '🌅', coins: 1_500, diamonds: 1 },
  { day: 2, title: 'Trade Dividend', icon: '🪙', coins: 4_500, diamonds: 2 },
  { day: 3, title: 'Civic Reserve', icon: '🏛️', coins: 12_000, diamonds: 2 },
  { day: 4, title: 'Expansion Grant', icon: '⚡', coins: 30_000, diamonds: 3 },
  {
    day: 5,
    title: 'Sovereign Vault',
    icon: '👑',
    coins: 75_000,
    diamonds: 6,
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

// ==================== 20-QUEST DAILY ROTATION POOL ====================
export interface DailyQuestDef {
  id: string;
  t: string;
  cat: 'build' | 'economy' | 'civic' | 'research' | 'trade';
  f: (s: GameState, ctx?: { rank: number }) => number;
  g: number;
  r: number; // Diamonds
  coins: number;
}

const totalOwnedBuildings = (s: GameState) =>
  Object.values(s.b || {}).reduce((acc, v) => acc + Math.max(0, Math.floor(Number(v) || 0)), 0);

const totalUpgradeLevels = (s: GameState) =>
  Object.values(s.gx?.lvl || {}).reduce((acc, v) => acc + Math.max(0, Math.floor(Number(v) || 1) - 1), 0);

const totalResearchedTechs = (s: GameState) =>
  Object.values(s.tech || {}).filter((v) => Number(v) > 0).length;

const totalStickersOwned = (s: GameState) =>
  Object.values(s.stk || {}).reduce((acc, v) => acc + Math.max(0, Math.floor(Number(v) || 0)), 0);

const totalPoliciesActive = (s: GameState) =>
  Object.values(s.pol || {}).filter((v) => Number(v) > 0).length;

export const DAILY_QUEST_POOL: readonly DailyQuestDef[] = [
  { id: 'dq_bld_20', t: 'Urban Planner: Maintain 20+ buildings', cat: 'build', f: totalOwnedBuildings, g: 20, r: 1, coins: 2_500 },
  { id: 'dq_bld_60', t: 'Civic Architect: Own 60+ total buildings', cat: 'build', f: totalOwnedBuildings, g: 60, r: 2, coins: 12_000 },
  { id: 'dq_bld_140', t: 'Metropolitan Drive: Own 140+ total buildings', cat: 'build', f: totalOwnedBuildings, g: 140, r: 2, coins: 45_000 },
  { id: 'dq_upg_10', t: 'Structural Upgrade: Hold 10+ total upgrade levels', cat: 'build', f: totalUpgradeLevels, g: 10, r: 1, coins: 6_000 },
  { id: 'dq_upg_35', t: 'Modern District: Hold 35+ total upgrade levels', cat: 'build', f: totalUpgradeLevels, g: 35, r: 2, coins: 25_000 },
  { id: 'dq_res_3', t: 'Lab Director: Unlock 3+ Research Upgrades', cat: 'research', f: totalResearchedTechs, g: 3, r: 1, coins: 8_000 },
  { id: 'dq_res_10', t: 'R&D Initiative: Unlock 10+ Research Upgrades', cat: 'research', f: totalResearchedTechs, g: 10, r: 2, coins: 35_000 },
  { id: 'dq_hap_75', t: 'Citizen Harmony: Reach 75% Happiness', cat: 'civic', f: (s) => Math.floor(s.hap || 0), g: 75, r: 1, coins: 5_000 },
  { id: 'dq_hap_88', t: 'Golden Morale: Sustain 88% Happiness', cat: 'civic', f: (s) => Math.floor(s.hap || 0), g: 88, r: 2, coins: 20_000 },
  { id: 'dq_appr_72', t: 'Public Mandate: Maintain 72% Approval', cat: 'civic', f: (s) => Math.floor(s.appr || 0), g: 72, r: 1, coins: 7_500 },
  { id: 'dq_pol_3', t: 'Cabinet Agenda: Enact 3+ National Policies', cat: 'civic', f: totalPoliciesActive, g: 3, r: 1, coins: 8_500 },
  { id: 'dq_pol_8', t: 'Policy Suite: Enact 8+ National Policies', cat: 'civic', f: totalPoliciesActive, g: 8, r: 2, coins: 30_000 },
  { id: 'dq_trd_1', t: 'Port Clearance: Complete 1+ Trade Contract', cat: 'trade', f: (s) => Math.floor(s.intlTrade?.completedCount || 0), g: 1, r: 1, coins: 9_000 },
  { id: 'dq_trd_5', t: 'Maritime Envoy: Complete 5+ Trade Contracts', cat: 'trade', f: (s) => Math.floor(s.intlTrade?.completedCount || 0), g: 5, r: 2, coins: 32_000 },
  { id: 'dq_stk_8', t: 'Sticker Collector: Own 8+ Stickers', cat: 'economy', f: totalStickersOwned, g: 8, r: 1, coins: 4_500 },
  { id: 'dq_fuse_2', t: 'Sticker Synthesis: Fuse 2+ Stickers', cat: 'economy', f: (s) => Math.floor(s.fused || 0), g: 2, r: 2, coins: 15_000 },
  { id: 'dq_pop_65', t: 'Growing Nation: Reach 65M Population', cat: 'civic', f: (s) => Math.floor(s.pop || 0), g: 65, r: 1, coins: 10_000 },
  { id: 'dq_cash_50k', t: 'Liquidity Reserve: Hold ₨ 50,000 Coins', cat: 'economy', f: (s) => Math.floor(s.cash || 0), g: 50_000, r: 1, coins: 7_500 },
  { id: 'dq_cash_5m', t: 'Treasury Surplus: Hold ₨ 5,000,000 Coins', cat: 'economy', f: (s) => Math.floor(s.cash || 0), g: 5_000_000, r: 2, coins: 60_000 },
  { id: 'dq_rank_5', t: 'Rising Republic: Reach National Rank 5', cat: 'economy', f: (s) => Math.floor(s.rank || 1), g: 5, r: 2, coins: 25_000 },
];

export interface DailyQuestViewItem {
  index: number;
  def: DailyQuestDef;
  progress: number;
  goal: number;
  ready: boolean;
  claimed: boolean;
}

export interface DailyQuestsView {
  dayKey: string;
  quests: DailyQuestViewItem[];
  readyCount: number;
  claimedCount: number;
  history: RewardHistoryEntry[];
}

export function selectDailyQuestIds(dayStr: string): number[] {
  let seed = 2166136261;
  for (let i = 0; i < dayStr.length; i += 1) {
    seed ^= dayStr.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const idx = Array.from({ length: DAILY_QUEST_POOL.length }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = Math.floor((seed / 4294967296) * (i + 1));
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }
  return idx.slice(0, 5);
}

export function getDailyQuestsView(
  s: GameState,
  dayKey: string,
  rankPos = 999,
): DailyQuestsView {
  const activeIndices = selectDailyQuestIds(dayKey);
  const claimedSet = new Set<number>(
    s.questDay === dayKey && Array.isArray(s.questIds) ? s.questIds : [],
  );
  let readyCount = 0;
  let claimedCount = 0;
  const quests: DailyQuestViewItem[] = activeIndices.map((idx) => {
    const def = DAILY_QUEST_POOL[idx] || DAILY_QUEST_POOL[0];
    const progress = Math.max(0, Math.floor(def.f(s, { rank: rankPos })));
    const claimed = claimedSet.has(idx);
    const ready = !claimed && progress >= def.g;
    if (claimed) claimedCount += 1;
    if (ready) readyCount += 1;
    return { index: idx, def, progress, goal: def.g, ready, claimed };
  });
  return {
    dayKey,
    quests,
    readyCount,
    claimedCount,
    history: Array.isArray(s.qHist) ? s.qHist : [],
  };
}

export function applyClaimDailyQuest(
  s: GameState,
  questId: string,
  dayKey: string,
  rankPos = 999,
): {
  ok: boolean;
  state: GameState;
  coinsAdded: number;
  diamondsAdded: number;
  quest?: DailyQuestDef;
  reason?: string;
} {
  const qIdx = DAILY_QUEST_POOL.findIndex((q) => q.id === questId);
  if (qIdx < 0) {
    return { ok: false, state: s, coinsAdded: 0, diamondsAdded: 0, reason: 'Unknown daily quest' };
  }
  const activeIndices = selectDailyQuestIds(dayKey);
  if (!activeIndices.includes(qIdx)) {
    return { ok: false, state: s, coinsAdded: 0, diamondsAdded: 0, reason: 'Quest is not in today’s rotation' };
  }
  const prevIds = s.questDay === dayKey && Array.isArray(s.questIds) ? s.questIds : [];
  if (prevIds.includes(qIdx)) {
    return { ok: false, state: s, coinsAdded: 0, diamondsAdded: 0, reason: 'Daily quest already claimed today' };
  }
  const def = DAILY_QUEST_POOL[qIdx];
  const progress = def.f(s, { rank: rankPos });
  if (progress < def.g) {
    return { ok: false, state: s, coinsAdded: 0, diamondsAdded: 0, reason: 'Daily quest goal not yet reached' };
  }
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  const safeGems = Number.isFinite(s.gems) ? Math.max(0, Math.floor(s.gems)) : 0;
  const entry: RewardHistoryEntry = {
    day: dayKey,
    label: def.t.slice(0, 48),
    coins: def.coins,
    diamonds: def.r,
  };
  const nextHist = [entry, ...(Array.isArray(s.qHist) ? s.qHist : [])].slice(0, 8);
  return {
    ok: true,
    quest: def,
    coinsAdded: def.coins,
    diamondsAdded: def.r,
    state: {
      ...s,
      cash: Math.min(1e13, safeCash + def.coins),
      gems: Math.min(1e9, safeGems + def.r),
      questDay: dayKey,
      questIds: [...prevIds, qIdx].slice(0, 10),
      qHist: nextHist,
    },
  };
}

