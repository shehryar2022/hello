import {
  BOOSTERS,
  BUILDINGS,
  FISCAL_COMMIT_BASE_COST,
  FISCAL_COMMIT_CD_MS,
  GOVS,
  GX_GOV_BUILDINGS,
  GX_LEVEL_MULTS,
  GX_ROADS,
  MAX_CONSTRUCTION_QUEUE,
  MAX_RANK,
  MIN_RANK,
  NATIONAL_POLICIES,
  POLICY_CATEGORY_CD_MS,
  POLICY_PRESETS,
  RANKS,
  STICKERS,
  SUBSCRIPTIONS,
  TECH_TREE,
  TZ,
  WORLD_EVENTS,
  EV_LEN_MS,
  EV_SLOT_MS,
  LEGACY_BUILDING_MIGRATION_MAP,
} from './constants';
import type {
  BoosterDef,
  BoosterId,
  BuildingCategory,
  BuildingDef,
  ConstructionSlot,
  EconomySnapshot,
  GameState,
  PolicyCategoryId,
  RankDef,
} from './types';

export const LEGACY_PROVINCE_MIGRATED_KEY = '__prov_migrated_v1';
export const POLICY_COOLDOWN_PREFIX = 'pc_';
export const FISCAL_COOLDOWN_KEY = 'pc_fiscal';
export const QUEUE_FINISH_PREFIX = 'cq_';
export const QUEUE_QTY_PREFIX = 'cb_';
export const BOOSTER_ACTIVE_PREFIX = 'ba_';
export const BOOSTER_DAILY_PREFIX = 'bc_';

export const POLICY_BOUNDS: Record<string, [number, number]> = {
  tax: [5, 45],
  fuel: [0, 50],
  carbon: [0, 30],
  luxury: [0, 25],
  corp: [0, 30],
  gst: [0, 25],
  prop: [0, 15],
  duty: [0, 30],
  tourism: [0, 20],
  digital: [0, 20],
  wealth: [0, 20],
  wel: [0, 50],
  edu: [0, 30],
  rd: [0, 25],
  green: [0, 25],
  transitSub: [0, 25],
};

const KARACHI_YMD_COMPACT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function karachiDateInt(ms = Date.now()): number {
  const safe = Number.isFinite(ms) ? ms : Date.now();
  const str = KARACHI_YMD_COMPACT.format(new Date(safe)).replace(/-/g, '');
  return Math.max(20200101, Math.min(20991231, Number(str) || 20260101));
}

export function totalBuildings(s: GameState): number {
  return Object.values(s.b || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

export function gxLevelMult(s: GameState, id: string): number {
  const l = s.gx?.lvl?.[id] || 1;
  return GX_LEVEL_MULTS[l - 1] || 1;
}

export function gxAverageCondition(
  s: GameState,
  list: Array<[string, string, string, number]>,
): number {
  const cond = s.gx?.cond || {};
  let total = 0;
  for (const item of list) {
    total += cond[item[0]] == null ? 100 : cond[item[0]];
  }
  return total / list.length;
}

export function gxMultiplier(s: GameState): number {
  const b = gxAverageCondition(s, GX_GOV_BUILDINGS);
  const r = gxAverageCondition(s, GX_ROADS);
  const pb = s.gx?.pb || 0;
  const blk = s.gx?.blk || 0;
  return (b >= 60 ? 1 : 0.88 + (0.12 * b) / 60) * (0.92 + (0.08 * r) / 100) * (1 + pb) * (blk > 0 ? 0.85 : 1);
}

export function gxHappinessMod(s: GameState): number {
  const b = gxAverageCondition(s, GX_GOV_BUILDINGS);
  const r = gxAverageCondition(s, GX_ROADS);
  const ph = s.gx?.ph || 0;
  return ph - (Math.max(0, 60 - b) / 60) * 10 - (Math.max(0, 50 - r) / 50) * 3;
}

export function getGovDefinition(s: GameState) {
  return GOVS.find((g) => g.id === s.gov) || GOVS[0];
}

export function currentWorldEvent(nowMs: number) {
  const slot = Math.floor(nowMs / EV_SLOT_MS);
  const hash = Math.imul(slot, 2654435761) >>> 0;
  if (hash % 2 !== 0) return null;
  const start = slot * EV_SLOT_MS;
  if (nowMs - start >= EV_LEN_MS) return null;
  return {
    ev: WORLD_EVENTS[(hash >>> 3) % WORLD_EVENTS.length],
    left: EV_LEN_MS - (nowMs - start),
  };
}

export function stickerUniqueCount(s: GameState): number {
  const st = s.stk || {};
  return Object.keys(st).filter((k) => STICKERS.some((x) => x.id === k) && st[k] > 0).length;
}

export function stickerBonus(s: GameState): number {
  return stickerUniqueCount(s) * 0.005;
}

export function hasTech(s: GameState, techId: string): boolean {
  return Boolean(s.tech && (s.tech[techId] || 0) > 0);
}

export function techCount(s: GameState): number {
  return TECH_TREE.filter((t) => (s.tech?.[t.id] || 0) > 0).length;
}

export function getActiveSubscription(s: GameState, nowMs = Date.now()) {
  const sub = s.sub;
  if (!sub?.tier || !sub.exp || sub.exp <= nowMs) return null;
  const def = SUBSCRIPTIONS.find((x) => x.id === sub.tier);
  if (!def) return null;
  return {
    def,
    startedAt: Math.max(0, sub.exp - def.durMs),
    exp: sub.exp,
    leftMs: Math.max(0, sub.exp - nowMs),
    lastClaimDay: sub.lastClaimDay || '',
  };
}

export function getDevelopmentDiscount(s: GameState, nowMs = Date.now()): number {
  const active = getActiveSubscription(s, nowMs);
  const subDisc = active ? active.def.discountRate : 0;
  const techDisc = hasTech(s, 'civil_corps') ? 0.05 : 0;
  return Math.min(0.35, subDisc + techDisc);
}

// ---------- National Policy System (9 categories, 3 stances each, 5-min cooldown) ----------

export function policyCooldownKey(catId: PolicyCategoryId): string {
  return `${POLICY_COOLDOWN_PREFIX}${catId.replace(/^p_/, '')}`;
}

export function getPolicyStance(s: GameState, catId: PolicyCategoryId): 0 | 1 | 2 {
  const raw = Math.floor(Number(s.tech?.[catId]) || 0);
  if (raw === 1 || raw === 2) return raw;
  return 0;
}

export function getPolicyCooldownLeftMs(
  s: GameState,
  catId: PolicyCategoryId,
  nowMs = Date.now(),
): number {
  const key = policyCooldownKey(catId);
  const until = Number(s.milestones?.[key] || 0);
  return Math.max(0, Math.floor(until - nowMs));
}

export function canChangePolicyStance(
  s: GameState,
  catId: PolicyCategoryId,
  stance: 0 | 1 | 2,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; cost: number; cooldownLeftMs: number } {
  const cat = NATIONAL_POLICIES.find((p) => p.id === catId);
  if (!cat) return { ok: false, reason: 'Unknown policy category', cost: 0, cooldownLeftMs: 0 };
  const cur = getPolicyStance(s, catId);
  if (cur === stance) return { ok: false, reason: 'Already active', cost: 0, cooldownLeftMs: 0 };
  const cooldownLeftMs = getPolicyCooldownLeftMs(s, catId, nowMs);
  if (cooldownLeftMs > 0) {
    return {
      ok: false,
      reason: `Cooldown: ${Math.ceil(cooldownLeftMs / 1000)}s remaining`,
      cost: cat.options[stance].cost,
      cooldownLeftMs,
    };
  }
  const opt = cat.options[stance];
  const cost = Math.max(0, opt.cost);
  if (!Number.isFinite(s.cash) || s.cash < cost) {
    return { ok: false, reason: 'Not enough Coins', cost, cooldownLeftMs: 0 };
  }
  return { ok: true, cost, cooldownLeftMs: 0 };
}

export function applyChangePolicyStance(
  s: GameState,
  catId: PolicyCategoryId,
  stance: 0 | 1 | 2,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; cost: number; label?: string; reason?: string } {
  const check = canChangePolicyStance(s, catId, stance, nowMs);
  if (!check.ok) return { ok: false, state: s, cost: check.cost, reason: check.reason };
  const cat = NATIONAL_POLICIES.find((p) => p.id === catId)!;
  const opt = cat.options[stance];
  const nextTech = { ...(s.tech || {}) };
  if (stance === 0) {
    delete nextTech[catId];
  } else {
    nextTech[catId] = stance;
  }
  const cdKey = policyCooldownKey(catId);
  const nextMilestones = {
    ...(s.milestones || {}),
    [cdKey]: Math.floor(nowMs + POLICY_CATEGORY_CD_MS),
  };
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  return {
    ok: true,
    cost: check.cost,
    label: opt.label,
    state: {
      ...s,
      cash: Math.max(0, safeCash - check.cost),
      tech: nextTech,
      milestones: nextMilestones,
    },
  };
}

// ---------- Draft & Commit Fiscal Reform (prevents tax-flipping right before Collect Tax) ----------

export function getFiscalCommitCost(s: GameState): number {
  const bCount = totalBuildings(s);
  return Math.max(FISCAL_COMMIT_BASE_COST, Math.floor(FISCAL_COMMIT_BASE_COST * (1 + bCount * 0.25)));
}

export function getFiscalCooldownLeftMs(s: GameState, nowMs = Date.now()): number {
  const until = Number(s.milestones?.[FISCAL_COOLDOWN_KEY] || 0);
  return Math.max(0, Math.floor(until - nowMs));
}

export function hasFiscalDraftChanges(
  s: GameState,
  draft: Partial<Record<keyof GameState, number>>,
): boolean {
  for (const [k, bounds] of Object.entries(POLICY_BOUNDS)) {
    const curVal = Math.round(Number((s as unknown as Record<string, number>)[k]) || 0);
    const rawDraft = draft[k as keyof GameState];
    if (typeof rawDraft !== 'number' || !Number.isFinite(rawDraft)) continue;
    const clamped = Math.round(Math.max(bounds[0], Math.min(bounds[1], rawDraft)));
    if (clamped !== curVal) return true;
  }
  return false;
}

export function canCommitFiscalReform(
  s: GameState,
  draft: Partial<Record<keyof GameState, number>>,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; cost: number; cooldownLeftMs: number } {
  const cost = getFiscalCommitCost(s);
  if (!hasFiscalDraftChanges(s, draft)) {
    return { ok: false, reason: 'No pending tax/spending changes', cost, cooldownLeftMs: 0 };
  }
  const cdLeft = getFiscalCooldownLeftMs(s, nowMs);
  if (cdLeft > 0) {
    return {
      ok: false,
      reason: `Fiscal reform cooldown: ${Math.ceil(cdLeft / 1000)}s`,
      cost,
      cooldownLeftMs: cdLeft,
    };
  }
  if (!Number.isFinite(s.cash) || s.cash < cost) {
    return { ok: false, reason: `Need ₨ ${Math.floor(cost).toLocaleString('en-US')} to enact reform`, cost, cooldownLeftMs: 0 };
  }
  return { ok: true, cost, cooldownLeftMs: 0 };
}

export function applyCommitFiscalReform(
  s: GameState,
  draft: Partial<Record<keyof GameState, number>>,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; cost: number; reason?: string } {
  const check = canCommitFiscalReform(s, draft, nowMs);
  if (!check.ok) return { ok: false, state: s, cost: check.cost, reason: check.reason };
  const next: GameState = {
    ...s,
    cash: Math.max(0, s.cash - check.cost),
    milestones: {
      ...(s.milestones || {}),
      [FISCAL_COOLDOWN_KEY]: Math.floor(nowMs + FISCAL_COMMIT_CD_MS),
    },
  };
  for (const [k, bounds] of Object.entries(POLICY_BOUNDS)) {
    const rawDraft = draft[k as keyof GameState];
    if (typeof rawDraft === 'number' && Number.isFinite(rawDraft)) {
      (next as unknown as Record<string, number>)[k] = Math.round(
        Math.max(bounds[0], Math.min(bounds[1], rawDraft)),
      );
    }
  }
  return { ok: true, state: next, cost: check.cost };
}

export function extractFiscalDraft(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(POLICY_BOUNDS)) {
    out[k] = Number((s as unknown as Record<string, number>)[k]) || 0;
  }
  return out;
}

export function presetToFiscalDraft(
  baseDraft: Record<string, number>,
  presetId: 'balanced' | 'revenue' | 'welfare',
): Record<string, number> {
  const preset = POLICY_PRESETS.find((p) => p.id === presetId);
  if (!preset) return baseDraft;
  const next = { ...baseDraft };
  for (const [k, rawVal] of Object.entries(preset.values)) {
    const bounds = POLICY_BOUNDS[k];
    if (bounds && typeof rawVal === 'number') {
      next[k] = Math.round(Math.max(bounds[0], Math.min(bounds[1], rawVal)));
    }
  }
  return next;
}

// ---------- Boosters V2 (7 balanced boosters, daily caps, cooldowns, no stacking) ----------

export function boosterActiveKey(id: BoosterId): string {
  return `${BOOSTER_ACTIVE_PREFIX}${id}`;
}

export function boosterDailyKey(id: BoosterId): string {
  return `${BOOSTER_DAILY_PREFIX}${id}`;
}

export function getBoosterActivationInfo(
  s: GameState,
  boosterId: BoosterId,
  nowMs = Date.now(),
): {
  active: boolean;
  activeLeftSec: number;
  cooldownLeftSec: number;
  usedToday: number;
  dailyLimit: number;
} {
  const def = BOOSTERS.find((b) => b.id === boosterId);
  if (!def) {
    return { active: false, activeLeftSec: 0, cooldownLeftSec: 0, usedToday: 0, dailyLimit: 1 };
  }
  const rawCd = s.boosterCd || {};
  const activatedAt = Number(rawCd[boosterActiveKey(boosterId)] || rawCd[boosterId] || 0);
  const activeEnd = def.dur > 0 && activatedAt > 0 ? activatedAt + def.dur * 1000 : 0;
  const cdEnd = activatedAt > 0 ? activatedAt + def.cd * 1000 : 0;
  const activeLeftSec = activeEnd > nowMs ? Math.ceil((activeEnd - nowMs) / 1000) : 0;
  const cooldownLeftSec = cdEnd > nowMs ? Math.ceil((cdEnd - nowMs) / 1000) : 0;

  // Tax boost uses activeFx.taxSurge for "active until collected"
  const isTaxActive = boosterId === 'tax_boost' && Boolean(s.activeFx?.taxSurge);

  const todayInt = karachiDateInt(nowMs);
  const packedDaily = Math.floor(Number(rawCd[boosterDailyKey(boosterId)] || 0));
  const storedDate = Math.floor(packedDaily / 100);
  const storedCount = packedDaily % 100;
  const usedToday = storedDate === todayInt ? Math.max(0, storedCount) : 0;

  return {
    active: activeLeftSec > 0 || isTaxActive,
    activeLeftSec,
    cooldownLeftSec,
    usedToday,
    dailyLimit: def.dailyLimit,
  };
}

export function isBoosterActive(s: GameState, boosterId: BoosterId, nowMs = Date.now()): boolean {
  return getBoosterActivationInfo(s, boosterId, nowMs).active;
}

export function getActiveShopIncomeBooster(s: GameState, nowMs = Date.now()) {
  const fx = s.activeFx || {};
  if (fx.incomeBoostEnd && fx.incomeBoostEnd > nowMs && fx.incomeBoostMult && fx.incomeBoostMult > 1) {
    return {
      active: true,
      id: fx.incomeBoostId || '',
      mult: Math.min(1.6, fx.incomeBoostMult),
      leftSec: Math.ceil((fx.incomeBoostEnd - nowMs) / 1000),
    };
  }
  return { active: false, id: '', mult: 1, leftSec: 0 };
}

export function halveRemainingConstructionTimers(s: GameState, nowMs = Date.now()): Record<string, number> {
  const nextMilestones = { ...(s.milestones || {}) };
  for (const [k, rawVal] of Object.entries(nextMilestones)) {
    if (!k.startsWith(QUEUE_FINISH_PREFIX)) continue;
    const finishAt = Number(rawVal);
    if (Number.isFinite(finishAt) && finishAt > nowMs) {
      const rem = finishAt - nowMs;
      nextMilestones[k] = Math.floor(nowMs + Math.max(1000, rem * 0.5));
    }
  }
  return nextMilestones;
}

export function canBuyBoosterV2(
  s: GameState,
  booster: BoosterDef,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; cooldownLeftSec: number; usedToday: number; dailyLimit: number } {
  const info = getBoosterActivationInfo(s, booster.id, nowMs);
  if (info.usedToday >= booster.dailyLimit) {
    return {
      ok: false,
      reason: `Daily limit reached (${info.usedToday}/${booster.dailyLimit})`,
      cooldownLeftSec: info.cooldownLeftSec,
      usedToday: info.usedToday,
      dailyLimit: booster.dailyLimit,
    };
  }
  if (info.cooldownLeftSec > 0) {
    return {
      ok: false,
      reason: `Cooldown: ${info.cooldownLeftSec}s`,
      cooldownLeftSec: info.cooldownLeftSec,
      usedToday: info.usedToday,
      dailyLimit: booster.dailyLimit,
    };
  }
  if (booster.isIncomeBoost && getActiveShopIncomeBooster(s, nowMs).active) {
    return {
      ok: false,
      reason: 'Another income booster is already active',
      cooldownLeftSec: 0,
      usedToday: info.usedToday,
      dailyLimit: booster.dailyLimit,
    };
  }
  if (booster.id === 'tax_boost' && s.activeFx?.taxSurge) {
    return {
      ok: false,
      reason: 'Tax Collection Boost is already primed',
      cooldownLeftSec: 0,
      usedToday: info.usedToday,
      dailyLimit: booster.dailyLimit,
    };
  }
  if (!Number.isFinite(s.cash) || booster.cost <= 0 || s.cash < booster.cost) {
    return {
      ok: false,
      reason: 'Not enough Coins',
      cooldownLeftSec: 0,
      usedToday: info.usedToday,
      dailyLimit: booster.dailyLimit,
    };
  }
  return {
    ok: true,
    cooldownLeftSec: 0,
    usedToday: info.usedToday,
    dailyLimit: booster.dailyLimit,
  };
}

export function applyBuyBoosterV2(
  s: GameState,
  booster: BoosterDef,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; reason?: string } {
  const check = canBuyBoosterV2(s, booster, nowMs);
  if (!check.ok) return { ok: false, state: s, reason: check.reason };

  const todayInt = karachiDateInt(nowMs);
  const nextCount = Math.min(99, check.usedToday + 1);
  const nextCd = {
    ...(s.boosterCd || {}),
    [boosterActiveKey(booster.id)]: Math.floor(nowMs),
    [boosterDailyKey(booster.id)]: todayInt * 100 + nextCount,
  };

  let nextMilestones = s.milestones || {};
  let nextHap = s.hap;
  const nextFx = { ...(s.activeFx || {}) };

  if (booster.id === 'income_boost') {
    nextFx.incomeBoostEnd = Math.floor(nowMs + booster.dur * 1000);
    nextFx.incomeBoostMult = 1.35;
    nextFx.incomeBoostId = booster.id;
  } else if (booster.id === 'growth_boost') {
    nextFx.incomeBoostEnd = Math.floor(nowMs + booster.dur * 1000);
    nextFx.incomeBoostMult = 1.6;
    nextFx.incomeBoostId = booster.id;
  } else if (booster.id === 'tax_boost') {
    nextFx.taxSurge = 1;
  } else if (booster.id === 'build_speed_boost') {
    nextMilestones = halveRemainingConstructionTimers(s, nowMs);
  } else if (booster.id === 'emp_boost') {
    nextHap = Math.min(100, Math.max(0, (s.hap || 60) + 8));
  }

  return {
    ok: true,
    state: {
      ...s,
      cash: Math.max(0, s.cash - booster.cost),
      hap: nextHap,
      boosterCd: nextCd,
      activeFx: nextFx,
      milestones: nextMilestones,
    },
  };
}

// ---------- National Building Construction Queue & Speed ----------

export function getBuildSpeedMultiplier(s: GameState, nowMs = Date.now()): number {
  let mult = 1;
  if (isBoosterActive(s, 'build_speed_boost', nowMs)) {
    mult *= 2.0;
  }
  const pInf = getPolicyStance(s, 'p_inf');
  if (pInf === 1) mult += 0.25;
  else if (pInf === 2) mult -= 0.1;
  return Math.max(0.5, mult);
}

export function buildingCost(def: BuildingDef, level: number, discountRate = 0): number {
  const scale = def.costScale || 1.24;
  const raw = def.cost * Math.pow(scale, Math.max(0, level));
  const clampedDisc = Math.max(0, Math.min(0.45, discountRate));
  return Math.max(1, Math.ceil(raw * (1 - clampedDisc)));
}

export function bulkBuildingCost(
  def: BuildingDef,
  startCount: number,
  qty: number,
  discountRate = 0,
): number {
  const count = Math.max(1, Math.min(50, Math.floor(qty)));
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += buildingCost(def, startCount + i, discountRate);
  }
  return total;
}

export function getConstructionQueue(s: GameState, nowMs = Date.now()): ConstructionSlot[] {
  const ms = s.milestones || {};
  const out: ConstructionSlot[] = [];
  const speed = getBuildSpeedMultiplier(s, nowMs);
  for (const [k, rawFinish] of Object.entries(ms)) {
    if (!k.startsWith(QUEUE_FINISH_PREFIX)) continue;
    const buildingId = k.slice(QUEUE_FINISH_PREFIX.length);
    const def = BUILDINGS.find((b) => b.id === buildingId);
    if (!def) continue;
    const finishAt = Math.floor(Number(rawFinish) || 0);
    if (finishAt <= 0) continue;
    const qty = Math.max(1, Math.min(50, Math.floor(Number(ms[`${QUEUE_QTY_PREFIX}${buildingId}`]) || 1)));
    const totalSec = Math.max(1, Math.ceil((def.buildSec * (1 + (qty - 1) * 0.4)) / speed));
    out.push({ buildingId, qty, finishAt, totalSec });
  }
  return out.sort((a, b) => a.finishAt - b.finishAt);
}

export function canStartBuildingConstruction(
  s: GameState,
  id: string,
  qty: 1 | 5,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; cost: number; durationSec: number } {
  const def = BUILDINGS.find((b) => b.id === id);
  if (!def) return { ok: false, reason: 'Unknown building', cost: 0, durationSec: 0 };

  const currentRank = Math.max(MIN_RANK, Math.floor(Number(s.rank) || MIN_RANK));
  if (currentRank < def.reqRank) {
    const reqRankDef = RANKS[def.reqRank] || RANKS[MIN_RANK];
    return {
      ok: false,
      reason: `Requires Rank ${def.reqRank} (${reqRankDef.n})`,
      cost: 0,
      durationSec: 0,
    };
  }

  const ownedTotal = totalBuildings(s);
  const reqB = def.reqBuildings || 0;
  if (ownedTotal < reqB) {
    return {
      ok: false,
      reason: `Requires ${reqB} total buildings (${ownedTotal}/${reqB})`,
      cost: 0,
      durationSec: 0,
    };
  }

  const count = s.b?.[id] || 0;
  if (count >= 10_000) {
    return { ok: false, reason: 'Max building count reached', cost: 0, durationSec: 0 };
  }

  const queue = getConstructionQueue(s, nowMs);
  if (def.buildSec > 0) {
    if (queue.some((q) => q.buildingId === id)) {
      return { ok: false, reason: 'Already under construction', cost: 0, durationSec: 0 };
    }
    if (queue.length >= MAX_CONSTRUCTION_QUEUE) {
      return { ok: false, reason: `Construction queue full (${MAX_CONSTRUCTION_QUEUE}/${MAX_CONSTRUCTION_QUEUE})`, cost: 0, durationSec: 0 };
    }
  }

  const clampedQty = Math.min(qty, 10_000 - count);
  const cost = bulkBuildingCost(def, count, clampedQty, getDevelopmentDiscount(s, nowMs));
  const speed = getBuildSpeedMultiplier(s, nowMs);
  const durationSec = def.buildSec <= 0 ? 0 : Math.max(2, Math.ceil((def.buildSec * (1 + (clampedQty - 1) * 0.4)) / speed));

  if (!Number.isFinite(s.cash) || cost <= 0 || s.cash < cost) {
    return { ok: false, reason: 'Not enough Coins', cost, durationSec };
  }
  return { ok: true, cost, durationSec };
}

export function applyStartBuildingConstruction(
  s: GameState,
  id: string,
  qty: 1 | 5,
  nowMs = Date.now(),
): {
  ok: boolean;
  state: GameState;
  instant: boolean;
  newCount: number;
  cost: number;
  durationSec: number;
  reason?: string;
} {
  const check = canStartBuildingConstruction(s, id, qty, nowMs);
  if (!check.ok) {
    return {
      ok: false,
      state: s,
      instant: false,
      newCount: s.b?.[id] || 0,
      cost: check.cost,
      durationSec: check.durationSec,
      reason: check.reason,
    };
  }

  const def = BUILDINGS.find((b) => b.id === id)!;
  const count = s.b?.[id] || 0;
  const clampedQty = Math.min(qty, 10_000 - count);
  const nextCash = Math.max(0, s.cash - check.cost);

  if (check.durationSec <= 0 || def.buildSec <= 0) {
    const newCount = count + clampedQty;
    return {
      ok: true,
      instant: true,
      newCount,
      cost: check.cost,
      durationSec: 0,
      state: {
        ...s,
        cash: nextCash,
        b: { ...s.b, [id]: newCount },
      },
    };
  }

  const finishAt = Math.floor(nowMs + check.durationSec * 1000);
  return {
    ok: true,
    instant: false,
    newCount: count,
    cost: check.cost,
    durationSec: check.durationSec,
    state: {
      ...s,
      cash: nextCash,
      milestones: {
        ...(s.milestones || {}),
        [`${QUEUE_FINISH_PREFIX}${id}`]: finishAt,
        [`${QUEUE_QTY_PREFIX}${id}`]: clampedQty,
      },
    },
  };
}

export function tickConstructionQueue(
  s: GameState,
  nowMs = Date.now(),
): { state: GameState; completed: Array<{ buildingId: string; qty: number; name: string }> } {
  const ms = s.milestones;
  if (!ms) return { state: s, completed: [] };

  let anyCompleted = false;
  const nextB = { ...(s.b || {}) };
  const nextMilestones = { ...ms };
  const completed: Array<{ buildingId: string; qty: number; name: string }> = [];

  for (const [k, rawFinish] of Object.entries(ms)) {
    if (!k.startsWith(QUEUE_FINISH_PREFIX)) continue;
    const buildingId = k.slice(QUEUE_FINISH_PREFIX.length);
    const finishAt = Number(rawFinish) || 0;
    const def = BUILDINGS.find((b) => b.id === buildingId);
    if (!def) {
      delete nextMilestones[k];
      delete nextMilestones[`${QUEUE_QTY_PREFIX}${buildingId}`];
      anyCompleted = true;
      continue;
    }
    if (finishAt > 0 && finishAt <= nowMs) {
      const qty = Math.max(1, Math.min(50, Math.floor(Number(ms[`${QUEUE_QTY_PREFIX}${buildingId}`]) || 1)));
      const cur = nextB[buildingId] || 0;
      nextB[buildingId] = Math.min(10_000, cur + qty);
      delete nextMilestones[k];
      delete nextMilestones[`${QUEUE_QTY_PREFIX}${buildingId}`];
      completed.push({ buildingId, qty, name: def.n });
      anyCompleted = true;
    }
  }

  if (!anyCompleted) return { state: s, completed };
  return {
    state: {
      ...s,
      b: nextB,
      milestones: nextMilestones,
    },
    completed,
  };
}

// ---------- Centralized National Economy Engine ----------

export function taxInfo(s: GameState) {
  const t = s.tax || 20;
  const c = s.carbon || 0;
  const l = s.luxury || 0;
  const co = s.corp || 0;
  const g = s.gst || 0;
  const p = s.prop || 0;
  const d = s.duty || 0;
  const f = s.fuel || 0;
  const tr = s.tourism || 0;
  const dg = s.digital || 0;
  const w = s.wealth || 0;

  const b = s.b || {};
  const raw =
    0.45 +
    t / 50 +
    c / 100 +
    l / 120 +
    (co / 150) * (1 + (b.business_districts || 0) * 0.05) +
    g / 70 * (1 + (b.shopping_centers || 0) * 0.04) +
    (p / 60) * Math.max(0.6, Math.min(2, (s.pop || 48) / 50)) +
    (d / 90) * (1 + ((b.ports || 0) + (b.airports || 0)) * 0.06) +
    (tr / 85) * (1 + ((b.airports || 0) + (b.shopping_centers || 0)) * 0.05) +
    (dg / 90) * (1 + ((b.tech_parks || 0) + (b.data_centers || 0)) * 0.05) +
    (w / 105) * (1 + (b.business_districts || 0) * 0.04);

  const burden =
    t + co * 0.8 + g + p + d * 0.6 + c * 0.7 + l * 0.5 + f * 0.4 + tr * 0.4 + dg * 0.5 + w * 0.35;

  const pTax = getPolicyStance(s, 'p_tax');
  const pEmp = getPolicyStance(s, 'p_emp');
  const evBase = Math.max(0, Math.min(0.75, (burden - 30) / 70 + Math.max(0, 50 - (s.appr ?? 50)) / 400));
  const ev = pTax === 1 ? evBase * 0.75 : evBase;

  let policyTaxMult = 1;
  if (pTax === 1) policyTaxMult *= 0.9;
  else if (pTax === 2) policyTaxMult *= 1.14;
  if (pEmp === 1) policyTaxMult *= 0.94;

  return { mult: raw * (1 - ev) * policyTaxMult, raw, burden, ev };
}

export function getTechIncomeMult(s: GameState): number {
  let bonus = 0;
  if (hasTech(s, 'smart_grid')) bonus += 0.04;
  if (hasTech(s, 'auto_customs')) bonus += 0.03;
  if (hasTech(s, 'sovereign_vault')) bonus += 0.04;
  return 1 + bonus;
}

export function getResearchCostMult(s: GameState, nowMs = Date.now()): number {
  let mult = 1;
  if (isBoosterActive(s, 'research_boost', nowMs)) mult *= 0.8;
  if (getPolicyStance(s, 'p_edu') === 2) mult *= 0.88;
  return Math.max(0.5, mult);
}

export function getResearchSpeedMult(s: GameState, nowMs = Date.now()): number {
  let mult = 1;
  if (isBoosterActive(s, 'research_boost', nowMs)) mult += 0.25;
  if (getPolicyStance(s, 'p_edu') === 1) mult += 0.14;
  return mult;
}

export function computeEconomySnapshot(
  s: GameState,
  options?: { tradeTier?: number; nowMs?: number; ignoreTempBoosters?: boolean },
): EconomySnapshot {
  const tradeTier = options?.tradeTier ?? 0;
  const nowMs = options?.nowMs ?? Date.now();
  const ignoreTemp = options?.ignoreTempBoosters ?? false;

  const pTax = getPolicyStance(s, 'p_tax');
  const pInd = getPolicyStance(s, 'p_ind');
  const pAgr = getPolicyStance(s, 'p_agr');
  const pEdu = getPolicyStance(s, 'p_edu');
  const pHlth = getPolicyStance(s, 'p_hlth');
  const pEmp = getPolicyStance(s, 'p_emp');
  const pTrd = getPolicyStance(s, 'p_trd');
  const pNrg = getPolicyStance(s, 'p_nrg');
  const pInf = getPolicyStance(s, 'p_inf');

  const prodBoostActive = !ignoreTemp && isBoosterActive(s, 'prod_boost', nowMs);
  const empBoostActive = !ignoreTemp && isBoosterActive(s, 'emp_boost', nowMs);
  const researchBoostActive = !ignoreTemp && isBoosterActive(s, 'research_boost', nowMs);
  const shopBoostInfo = ignoreTemp ? { active: false, id: '', mult: 1, leftSec: 0 } : getActiveShopIncomeBooster(s, nowMs);
  const growthBoostActive = !ignoreTemp && shopBoostInfo.active && shopBoostInfo.id === 'growth_boost';

  const sectorRaw: Record<Exclude<BuildingCategory, 'all'>, number> = {
    agriculture: 0,
    industry: 0,
    energy: 0,
    infrastructure: 0,
    commercial: 0,
    technology: 0,
    healthcare_edu: 0,
  };

  let energySupply = 12; // Base municipal generator capacity (MW)
  let energyDemand = 0;
  let jobsCreated = 0;
  let maintCostRaw = 0;
  let capitalEquity = 0;

  for (const d of BUILDINGS) {
    const count = Math.max(0, Math.floor(Number(s.b?.[d.id]) || 0));
    if (count <= 0) continue;
    const lvl = Math.max(1, Math.min(5, Math.floor(Number(s.gx?.lvl?.[d.id]) || 1)));
    const lvlMult = GX_LEVEL_MULTS[lvl - 1] || 1;

    capitalEquity += d.cost * count * (1 + (lvl - 1) * 0.45) * 1.15;

    let catIncomeMult = 1;
    if (d.cat === 'agriculture') {
      if (pAgr === 1) catIncomeMult *= 1.2;
      else if (pAgr === 2 && d.id === 'food_plant') catIncomeMult *= 1.12;
    } else if (d.cat === 'industry') {
      if (pInd === 1) catIncomeMult *= 1.18;
      else if (pInd === 2) catIncomeMult *= 1.1;
      if (pTrd === 2) catIncomeMult *= 1.15;
      else if (pTrd === 1) catIncomeMult *= 0.94;
    } else if (d.cat === 'energy') {
      if (pNrg === 1 && (d.id === 'solar_plants' || d.id === 'wind_farms')) catIncomeMult *= 1.18;
    } else if (d.cat === 'infrastructure') {
      if (pInf === 1) catIncomeMult *= 1.1;
      if (pTrd === 1) catIncomeMult *= 1.16;
      else if (pTrd === 2 && (d.id === 'ports' || d.id === 'airports')) catIncomeMult *= 0.92;
    } else if (d.cat === 'commercial') {
      if (pEmp === 2) catIncomeMult *= 1.08;
      if (pHlth === 2) catIncomeMult *= 0.97;
      if (pTrd === 1) catIncomeMult *= 1.16;
    } else if (d.cat === 'technology') {
      if (pEdu === 1) catIncomeMult *= 1.14;
      if (researchBoostActive) catIncomeMult *= 1.25;
    } else if (d.cat === 'healthcare_edu') {
      if (pEdu === 1) catIncomeMult *= 1.14;
    }

    const baseOut = d.inc * count * lvlMult * catIncomeMult;
    sectorRaw[d.cat] += baseOut;

    if (d.energy > 0) {
      let gen = d.energy * count * (1 + (lvl - 1) * 0.15);
      if (pNrg === 1 && (d.id === 'solar_plants' || d.id === 'wind_farms')) gen *= 1.18;
      if (pNrg === 2) gen *= 1.14;
      energySupply += gen;
    } else if (d.energy < 0) {
      let dem = Math.abs(d.energy) * count * (1 + (lvl - 1) * 0.08);
      if (d.cat === 'industry' && pInd === 2) dem *= 1.1;
      energyDemand += dem;
    }

    let j = d.jobs * count;
    if (d.cat === 'industry' && pInd === 2) j *= 0.92;
    if (pEmp === 1) j *= 1.12;
    jobsCreated += j;

    let m = d.maint * count * (1 + (lvl - 1) * 0.25);
    if (d.cat === 'industry' && pInd === 1) m *= 1.12;
    if (d.cat === 'agriculture' && pAgr === 1) m *= 1.15;
    if (d.cat === 'healthcare_edu') {
      if (pEdu === 1) m *= 1.12;
      else if (pEdu === 2) m *= 1.22;
      if (pHlth === 1) m *= 1.14;
      else if (pHlth === 2) m *= 1.26;
    }
    if (d.id === 'power_stations' && pNrg === 1) m *= 1.12;
    if (d.cat === 'energy' && pNrg === 2) m *= 0.92;
    if (d.cat === 'infrastructure' && pInf === 1) m *= 1.15;
    if (pInf === 2) m *= 0.9;
    maintCostRaw += m;
  }

  const rawBuildingSum = Object.values(sectorRaw).reduce((a, b) => a + b, 0);
  const baseGross = 2 + rawBuildingSum;

  const energyRatio = energyDemand <= 0 ? 1.2 : energySupply / energyDemand;
  const energyFactor =
    energyRatio >= 1.15
      ? 1.05
      : energyRatio >= 1.0
        ? 1 + (energyRatio - 1) * 0.33
        : Math.max(0.65, 0.65 + 0.35 * energyRatio);

  const laborPool = Math.max(15, Math.round((s.pop || 48) * 12));
  const employmentRate = Math.max(0, Math.min(1, jobsCreated / laborPool));
  let empFactor =
    (0.86 + 0.24 * employmentRate) *
    (empBoostActive ? 1.2 : 1) *
    (pEdu === 1 ? 1.06 : 1) *
    (pHlth === 1 ? 1.04 : 1);
  empFactor = Math.max(0.75, Math.min(1.45, empFactor));

  const consumerDemandMult =
    1 +
    Math.min(
      0.28,
      (s.b?.markets || 0) * 0.012 +
        (s.b?.shopping_centers || 0) * 0.025 +
        (s.b?.business_districts || 0) * 0.035,
    ) *
      (pEmp === 1 ? 1.04 : 1);

  let baseTradeExportBonus =
    tradeTier * 0.05 +
    Math.min(
      0.35,
      (s.b?.ports || 0) * 0.02 + (s.b?.airports || 0) * 0.03 + (s.b?.food_plant || 0) * 0.008,
    );
  if (pInd === 1) baseTradeExportBonus += 0.1;
  if (pAgr === 2) baseTradeExportBonus += 0.12;
  if (pTrd === 1) baseTradeExportBonus += 0.16;
  if (pTrd === 2) baseTradeExportBonus -= 0.08;
  baseTradeExportBonus = Math.max(-0.08, Math.min(0.75, baseTradeExportBonus));
  const tradeExportBonus = Math.max(
    -0.08,
    Math.min(0.75, baseTradeExportBonus + (growthBoostActive ? 0.2 : 0)),
  );
  const growthTradeLift = (1 + tradeExportBonus) / Math.max(0.5, 1 + baseTradeExportBonus);
  const tradeImportDrag = pTrd === 1 ? 0.03 : 0;

  // Inflation model
  const ti = taxInfo(s);
  const taxInflation = Math.max(0, ti.burden - 24) * 0.08;
  const agrFoodSupplyOffset = Math.min(1.5, ((s.b?.farms || 0) + (s.b?.greenhouses || 0)) * 0.05);
  let inflationRate = 2.0 + taxInflation - agrFoodSupplyOffset;
  if (pTax === 2) inflationRate *= 0.85;
  if (pAgr === 1) inflationRate -= 0.8;
  else if (pAgr === 2) inflationRate += 0.5;
  if (pTrd === 1) inflationRate -= 1.0;
  else if (pTrd === 2) inflationRate += 1.2;
  if (pNrg === 1) inflationRate -= 0.4;
  inflationRate = Math.max(0.5, Math.min(18, Number(inflationRate.toFixed(2))));
  const inflationDrag = Math.max(0.78, Math.min(1.02, 1 - Math.max(0, inflationRate - 2.8) * 0.014));

  let prodMult =
    energyFactor *
    empFactor *
    consumerDemandMult *
    inflationDrag *
    (1 + tradeExportBonus) *
    (1 - tradeImportDrag);
  if (prodBoostActive) prodMult *= 1.3;
  if (pTax === 1) prodMult *= 1.08;
  else if (pTax === 2) prodMult *= 0.96;

  const worldEv = currentWorldEvent(nowMs);
  const evMult = worldEv ? worldEv.ev.m : 1;
  const gov = getGovDefinition(s);
  const subMult = getActiveSubscription(s, nowMs)?.def.incomeMult ?? 1;
  const gemBoost = !ignoreTemp && (s.boost || 0) > 0 ? 2 : 1;
  // Strictly cap combined temporary shop + growth trade + gem multipliers to 2.5x
  const tempMult = Math.min(2.5 / Math.max(1, growthTradeLift), shopBoostInfo.mult * gemBoost);

  const rankDef = RANKS[Math.max(MIN_RANK, Math.min(MAX_RANK, Math.floor(s.rank || MIN_RANK)))] || RANKS[MIN_RANK];
  const rankMult = 1 + (rankDef.incomeBonusPct || 0) / 100;

  const greenCount = (s.b?.solar_plants || 0) + (s.b?.wind_farms || 0);
  const greenSynergy = 1 + Math.min(0.4, greenCount * (s.green || 0) * 0.0025);
  const transitSynergy = 1 + Math.min(0.38, ((s.b?.roads || 0) + (s.b?.railways || 0)) * (s.transitSub || 0) * 0.002);
  const rAndDSynergy = 1 + Math.min(0.4, ((s.b?.research_centers || 0) + (s.b?.universities || 0)) * 0.015);

  const macroMult =
    ti.mult *
    (1 + (s.hap - 50) / 200) *
    rAndDSynergy *
    tempMult *
    (1 + (s.edu || 0) / 200) *
    (1 + (s.rd || 0) / 140) *
    greenSynergy *
    transitSynergy *
    (1 + (s.fuel || 0) / 160) *
    (1 + stickerBonus(s)) *
    rankMult *
    gxMultiplier(s) *
    evMult *
    gov.inc *
    subMult *
    getTechIncomeMult(s);

  const totalMult = macroMult * prodMult;
  const buildingGross = baseGross * totalMult;

  const sectorIncome = { ...sectorRaw };
  for (const k of Object.keys(sectorIncome) as Array<Exclude<BuildingCategory, 'all'>>) {
    sectorIncome[k] = sectorIncome[k] * totalMult;
  }

  // Balanced operating expenses (maintenance + national salaries + policy spending)
  const maintCost = Math.min(buildingGross * 0.3, maintCostRaw * Math.max(0.75, ti.mult * 0.5));
  const salaryScale = 0.016 * (pEmp === 2 ? 1.12 : 1);
  const salaryCost = Math.min(buildingGross * 0.16, jobsCreated * salaryScale);
  const policySpendShare = Math.min(
    0.55,
    (((s.wel + s.edu) * 0.65 + (s.rd || 0) * 0.5 + (s.green || 0) * 0.4 + (s.transitSub || 0) * 0.35) / 100) * gov.wel,
  );
  const welfareCost = buildingGross * policySpendShare;
  const net = buildingGross - maintCost - salaryCost - welfareCost;

  // Real National GDP: anchored on capital equity + annualized productivity + human capital + bounded treasury
  // Never craters when spending liquid cash on buildings/gifts.
  const baseFlow = Math.max(0, net);
  const humanCapital = (s.pop || 48) * 220 + jobsCreated * 45 + techCount(s) * 150_000;
  const treasuryComponent = Math.min(1e12, Math.max(0, Number(s.cash) || 0) * 0.35);
  const realGdp = Math.max(
    1000,
    Math.min(1e13, Math.floor(capitalEquity + baseFlow * 180 + humanCapital + treasuryComponent)),
  );

  return {
    gross: buildingGross,
    net,
    buildingGross,
    maintCost,
    salaryCost,
    welfareCost,
    energySupply: Math.round(energySupply),
    energyDemand: Math.round(energyDemand),
    energyRatio: Number(energyRatio.toFixed(2)),
    energyFactor: Number(energyFactor.toFixed(3)),
    jobsCreated: Math.round(jobsCreated),
    laborPool,
    employmentRate: Number(employmentRate.toFixed(3)),
    inflationRate,
    inflationDrag: Number(inflationDrag.toFixed(3)),
    tradeExportBonus: Number(tradeExportBonus.toFixed(3)),
    tradeImportDrag,
    consumerDemandMult: Number(consumerDemandMult.toFixed(3)),
    prodMult: Number(prodMult.toFixed(3)),
    buildSpeedMult: Number(getBuildSpeedMultiplier(s, nowMs).toFixed(2)),
    researchCostMult: Number(getResearchCostMult(s, nowMs).toFixed(2)),
    researchSpeedMult: Number(getResearchSpeedMult(s, nowMs).toFixed(2)),
    realGdp,
    sectorIncome,
  };
}

// ---------- Player Ranks (1..10, multi-factor economic gates) ----------

export interface RankEligibility {
  def: RankDef;
  eligible: boolean;
  seqOk: boolean;
  alreadyOwned: boolean;
  gdpNow: number;
  buildingsNow: number;
  hapNow: number;
  techNow: number;
  cashNow: number;
  missingGdp: number;
  missingBuildings: number;
  missingHap: number;
  missingTech: number;
  missingCash: number;
  reason?: string;
}

export function getRankEligibility(s: GameState, targetRankId: number): RankEligibility {
  const def = RANKS[targetRankId] || RANKS[MIN_RANK];
  const currentRank = Math.max(MIN_RANK, Math.min(MAX_RANK, Math.floor(Number(s.rank) || MIN_RANK)));
  const alreadyOwned = currentRank >= targetRankId;
  const seqOk = targetRankId === currentRank + 1;

  const snap = computeEconomySnapshot(s, { ignoreTempBoosters: true });
  const gdpNow = snap.realGdp;
  const buildingsNow = totalBuildings(s);
  const hapNow = Math.round(s.hap || 0);
  const techNow = techCount(s);
  const cashNow = Math.max(0, Math.floor(Number(s.cash) || 0));

  const missingGdp = Math.max(0, def.minGdp - gdpNow);
  const missingBuildings = Math.max(0, def.minBuildings - buildingsNow);
  const missingHap = Math.max(0, def.minHap - hapNow);
  const missingTech = Math.max(0, def.minTech - techNow);
  const missingCash = Math.max(0, def.cost - cashNow);

  let reason: string | undefined;
  if (targetRankId <= MIN_RANK || targetRankId > MAX_RANK) {
    reason = 'Invalid rank';
  } else if (alreadyOwned) {
    reason = 'Already unlocked';
  } else if (!seqOk) {
    reason = `Unlock Rank ${currentRank + 1} first`;
  } else if (missingGdp > 0) {
    reason = `Need ₨ ${def.minGdp.toLocaleString('en-US')} Real GDP`;
  } else if (missingBuildings > 0) {
    reason = `Need ${def.minBuildings} national buildings`;
  } else if (missingHap > 0) {
    reason = `Need ${def.minHap}% citizen happiness`;
  } else if (missingTech > 0) {
    reason = `Need ${def.minTech} researched doctrine(s)`;
  } else if (missingCash > 0) {
    reason = 'Not enough Coins';
  }

  return {
    def,
    eligible: !alreadyOwned && seqOk && missingGdp === 0 && missingBuildings === 0 && missingHap === 0 && missingTech === 0 && missingCash === 0 && targetRankId > MIN_RANK && targetRankId <= MAX_RANK,
    seqOk,
    alreadyOwned,
    gdpNow,
    buildingsNow,
    hapNow,
    techNow,
    cashNow,
    missingGdp,
    missingBuildings,
    missingHap,
    missingTech,
    missingCash,
    reason,
  };
}

// ---------- Idempotent Legacy Province + 24-Building Migration ----------

interface LegacyProvinceShape {
  slot?: unknown;
  paidPrice?: unknown;
  allocTotal?: unknown;
  gdp?: unknown;
  pop?: unknown;
}

export function migrateLegacySaveToNational(
  raw: Record<string, unknown>,
  s: GameState,
): GameState {
  const rawMilestones = (raw.milestones && typeof raw.milestones === 'object' ? raw.milestones : {}) as Record<string, unknown>;
  if (Number(rawMilestones[LEGACY_PROVINCE_MIGRATED_KEY]) > 0) {
    // Already migrated: strictly preserve state (ensure rank >= 1 and marker kept)
    return {
      ...s,
      rank: Math.max(MIN_RANK, s.rank || MIN_RANK),
      milestones: { ...(s.milestones || {}), [LEGACY_PROVINCE_MIGRATED_KEY]: 1 },
    };
  }

  // First-time migration from legacy save (24 old building IDs & optional legacy provinces)
  const rawB = (raw.b && typeof raw.b === 'object' ? raw.b : {}) as Record<string, unknown>;
  const rawLvl = (
    raw.gx &&
    typeof raw.gx === 'object' &&
    (raw.gx as Record<string, unknown>).lvl &&
    typeof (raw.gx as Record<string, unknown>).lvl === 'object'
      ? (raw.gx as Record<string, unknown>).lvl
      : {}
  ) as Record<string, unknown>;

  const nextB = { ...s.b };
  const nextLvl = { ...s.gx.lvl };

  for (const [legacyKey, targetId] of Object.entries(LEGACY_BUILDING_MIGRATION_MAP)) {
    const qty = Math.floor(Number(rawB[legacyKey]));
    if (Number.isFinite(qty) && qty > 0) {
      nextB[targetId] = Math.min(10_000, (nextB[targetId] || 0) + qty);
      const oldLvl = Math.floor(Number(rawLvl[legacyKey]));
      if (Number.isFinite(oldLvl) && oldLvl >= 1 && oldLvl <= 5) {
        nextLvl[targetId] = Math.max(nextLvl[targetId] || 1, oldLvl);
      }
    }
  }

  let cashBonus = 0;
  let popBonus = 0;
  let migratedProvCount = 0;
  const legacyProvs = Array.isArray(raw.provinces) ? (raw.provinces as LegacyProvinceShape[]) : [];
  for (const p of legacyProvs) {
    if (!p || typeof p !== 'object') continue;
    migratedProvCount += 1;
    const slot = Math.max(1, Math.floor(Number(p.slot) || 1));
    const paid = Math.max(0, Number(p.paidPrice) || 0);
    const alloc = Math.max(0, Number(p.allocTotal) || 0);
    const gdp = Math.max(0, Number(p.gdp) || 0);
    const pPop = Math.max(0, Number(p.pop) || 0);

    if (slot > 1) {
      cashBonus += Math.round(paid * 0.5 + alloc * 0.8 + gdp * 0.25);
      popBonus += Math.max(1, Math.round(pPop * 0.5));
    } else {
      cashBonus += Math.round(alloc * 0.8);
    }
  }

  cashBonus = Math.min(2e12, Math.max(0, Math.floor(cashBonus)));
  popBonus = Math.min(500, Math.max(0, popBonus));

  const nextLog = Array.isArray(s.gx?.log) ? [...s.gx.log] : [];
  if (migratedProvCount > 0 || Object.keys(rawB).some((k) => k in LEGACY_BUILDING_MIGRATION_MAP && Number(rawB[k]) > 0)) {
    const summary =
      cashBonus > 0
        ? `National Charter migration: consolidated ${migratedProvCount || 1} region(s) (+₨ ${cashBonus.toLocaleString('en-US')})`.slice(0, 120)
        : 'National Charter migration: consolidated buildings into unified national economy';
    nextLog.unshift(summary);
  }

  return {
    ...s,
    cash: Math.min(1e13, Math.max(0, (s.cash || 0) + cashBonus)),
    pop: Math.min(100_000, Math.max(1, (s.pop || 48) + popBonus)),
    rank: Math.max(MIN_RANK, s.rank || MIN_RANK),
    b: nextB,
    gx: {
      ...s.gx,
      lvl: nextLvl,
      log: nextLog.slice(0, 8),
    },
    milestones: {
      ...(s.milestones || {}),
      [LEGACY_PROVINCE_MIGRATED_KEY]: 1,
    },
  };
}
