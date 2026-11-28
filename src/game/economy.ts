import {
  ACHIEVEMENTS,
  BOOSTERS,
  BUILDING_POLICIES,
  BUILDING_UPGRADE_TIERS,
  BUILDINGS,
  CHALLENGES_2_0,
  FISCAL_COMMIT_BASE_COST,
  FISCAL_COMMIT_CD_MS,
  GOVS,
  GX_GOV_BUILDINGS,
  GX_PROJECT_TYPES,
  GX_ROADS,
  LEGACY_BUILDING_MIGRATION_MAP,
  LEGACY_RANK_V2_MAP,
  MAX_BUILDING_LEVEL,
  MAX_CONSTRUCTION_QUEUE,
  MAX_RANK,
  MAX_UPGRADE_QUEUE,
  MIN_RANK,
  NATIONAL_DECISIONS,
  NATIONAL_POLICIES,
  POLICY_CATEGORY_CD_MS,
  POLICY_PRESETS,
  RANKS,
  STICKERS,
  SUBSCRIPTIONS,
  TECH_TREE,
  TRADE_GOODS,
  TRADE_MILESTONES,
  TRADE_PARTNERS,
  TZ,
  WORLD_EVENTS,
  EV_LEN_MS,
  EV_SLOT_MS,
  getBuildingLevelMultiplier,
} from './constants';
import { getDiamondAssetBonuses } from './cosmetics';
import type {
  ActiveTradeContract,
  BoosterDef,
  BoosterId,
  BuildingDef,
  BuildingPolicyDef,
  BuildingPolicyId,
  ConstructionSlot,
  EconomySnapshot,
  ExcludeAllBuildingCategory,
  GameState,
  IntlTradeState,
  LocalMegaProjectSlot,
  NationalDecisionDef,
  PolicyCategoryId,
  ProjectType,
  RankDef,
  TradeGoodDef,
  TradeGoodId,
  UpgradeHistoryEntry,
  UpgradeQueueSlot,
} from './types';

export const LEGACY_PROVINCE_MIGRATED_KEY = '__prov_migrated_v1';
export const RANK_V2_MIGRATION_KEY = 'rankV2';
export const POLICY_COOLDOWN_PREFIX = 'pc_';
export const FISCAL_COOLDOWN_KEY = 'pc_fiscal';
export const QUEUE_FINISH_PREFIX = 'cq_';
export const QUEUE_QTY_PREFIX = 'cb_';
export const BOOSTER_ACTIVE_PREFIX = 'ba_';
export const BOOSTER_DAILY_PREFIX = 'bc_';
export { MAX_UPGRADE_QUEUE };
export const MAX_CONCURRENT_LOCAL_PROJECTS = 2;

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
  const l = Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(s.gx?.lvl?.[id]) || 1)));
  return getBuildingLevelMultiplier(l);
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
  // Medium-difficulty diminishing bonus across 70 stickers (caps at +28%)
  const uniq = stickerUniqueCount(s);
  return Math.min(0.28, uniq * 0.004);
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

export function getTechMaintReduction(s: GameState): number {
  let pct = 0;
  for (const t of TECH_TREE) {
    if (t.maintReductionPct && hasTech(s, t.id)) pct += t.maintReductionPct;
  }
  return Math.min(0.35, pct / 100);
}

export function getTechEnergyBonus(s: GameState): number {
  let pct = 0;
  for (const t of TECH_TREE) {
    if (t.energyBonusPct && hasTech(s, t.id)) pct += t.energyBonusPct;
  }
  return Math.min(0.55, pct / 100);
}

export function getTechHapBonus(s: GameState): number {
  let hap = 0;
  for (const t of TECH_TREE) {
    if (t.hapBonus && hasTech(s, t.id)) hap += t.hapBonus;
  }
  return Math.min(24, hap);
}

export function getTechTradeBonus(s: GameState): number {
  let pct = 0;
  for (const t of TECH_TREE) {
    if (t.tradeBonusPct && hasTech(s, t.id)) pct += t.tradeBonusPct;
  }
  return Math.min(0.45, pct / 100);
}

export function getTechBuildSpeedBonus(s: GameState): number {
  let pct = 0;
  for (const t of TECH_TREE) {
    if (t.buildSpeedPct && hasTech(s, t.id)) pct += t.buildSpeedPct;
  }
  return Math.min(0.6, pct / 100);
}

export function getTechResearchSpeedBonus(s: GameState): number {
  let pct = 0;
  for (const t of TECH_TREE) {
    if (t.researchSpeedPct && hasTech(s, t.id)) pct += t.researchSpeedPct;
  }
  return Math.min(0.65, pct / 100);
}

export function getDevelopmentDiscount(s: GameState, nowMs = Date.now()): number {
  const active = getActiveSubscription(s, nowMs);
  const subDisc = active ? active.def.discountRate : 0;
  const techDisc = hasTech(s, 'civil_corps') ? 0.05 : 0;
  const policyDisc = getPolicyStance(s, 'p_hou') === 2 ? 0.04 : 0;
  return Math.min(0.35, subDisc + techDisc + policyDisc);
}

// ---------- National Policy System (20 categories, 3 stances each, 5-min cooldown) ----------

export function policyCooldownKey(catId: PolicyCategoryId): string {
  return `${POLICY_COOLDOWN_PREFIX}${catId.replace(/^p_/, '')}`;
}

export function getPolicyStance(s: GameState, catId: PolicyCategoryId): 0 | 1 | 2 {
  const rawPol = Math.floor(Number(s.pol?.[catId]) || 0);
  if (rawPol === 1 || rawPol === 2) return rawPol;
  const rawLegacy = Math.floor(Number(s.tech?.[catId]) || 0);
  if (rawLegacy === 1 || rawLegacy === 2) return rawLegacy;
  return 0;
}

export function getPolicyCooldownLeftMs(
  s: GameState,
  catId: PolicyCategoryId,
  nowMs = Date.now(),
): number {
  const key = policyCooldownKey(catId);
  const until = Number(s.milestones?.[key] ?? s.decisionsCd?.[key] ?? 0);
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

const LEGACY_POLICY_SET = new Set<string>([
  'p_tax', 'p_ind', 'p_agr', 'p_edu', 'p_hlth', 'p_emp', 'p_trd', 'p_nrg', 'p_inf',
]);

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

  const nextPol: Record<string, 0 | 1 | 2> = { ...(s.pol || {}) };
  const nextTech = { ...(s.tech || {}) };

  if (stance === 0) {
    delete nextPol[catId];
    delete nextTech[catId];
  } else {
    nextPol[catId] = stance;
    if (LEGACY_POLICY_SET.has(catId)) {
      nextTech[catId] = stance;
    } else {
      delete nextTech[catId];
    }
  }

  const cdKey = policyCooldownKey(catId);
  const cdUntil = Math.floor(nowMs + POLICY_CATEGORY_CD_MS);
  const nextMilestones = { ...(s.milestones || {}) };
  const nextDecisionsCd = { ...(s.decisionsCd || {}) };
  if (LEGACY_POLICY_SET.has(catId)) {
    nextMilestones[cdKey] = cdUntil;
  } else {
    nextDecisionsCd[cdKey] = cdUntil;
  }

  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  return {
    ok: true,
    cost: check.cost,
    label: opt.label,
    state: {
      ...s,
      cash: Math.max(0, safeCash - check.cost),
      pol: nextPol,
      tech: nextTech,
      milestones: nextMilestones,
      decisionsCd: nextDecisionsCd,
    },
  };
}

// ---------- Draft & Commit Fiscal Reform ----------

export function getFiscalCommitCost(s: GameState): number {
  const bCount = totalBuildings(s);
  return Math.max(FISCAL_COMMIT_BASE_COST, Math.floor(FISCAL_COMMIT_BASE_COST * (1 + bCount * 0.2)));
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

// ---------- Boosters V2 ----------

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
  let mult = 1 + getTechBuildSpeedBonus(s);
  if (isBoosterActive(s, 'build_speed_boost', nowMs)) {
    mult *= 2.0;
  }
  const pInf = getPolicyStance(s, 'p_inf');
  if (pInf === 1) mult += 0.25;
  else if (pInf === 2) mult -= 0.1;
  if (getPolicyStance(s, 'p_urb') === 1) mult += 0.1;
  if (getPolicyStance(s, 'p_hou') === 2) mult += 0.15;
  if (getPolicyStance(s, 'p_tou') === 2) mult -= 0.04;
  return Math.max(0.5, mult);
}

export function buildingCost(def: BuildingDef, level: number, discountRate = 0): number {
  const scale = def.costScale || 1.22;
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

  if (def.reqTech && !hasTech(s, def.reqTech)) {
    const techDef = TECH_TREE.find((t) => t.id === def.reqTech);
    return {
      ok: false,
      reason: `Requires ${techDef?.n || def.reqTech} research`,
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

// ---------- Building Upgrade System (Levels 1..50 with 5 progression tiers & diminishing returns) ----------

export function getBuildingUpgradeTier(lvl: number) {
  const safe = Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(lvl) || 1)));
  return (
    BUILDING_UPGRADE_TIERS.find((t) => safe >= t.minLvl && safe <= t.maxLvl) ||
    BUILDING_UPGRADE_TIERS[BUILDING_UPGRADE_TIERS.length - 1]
  );
}

export function getBuildingUpgradeCostAndDur(
  s: GameState,
  def: BuildingDef,
  curLevel: number,
  count: number,
  nowMs = Date.now(),
): { cost: number; durSec: number } {
  if (curLevel >= MAX_BUILDING_LEVEL || count < 1) return { cost: 0, durSec: 0 };
  const tier = getBuildingUpgradeTier(curLevel + 1);
  const disc = getDevelopmentDiscount(s, nowMs);
  const countFactor = Math.max(1, Math.pow(count, 0.72));
  const lvlInTier = Math.max(0, curLevel - tier.minLvl + 1);
  const tierJump =
    curLevel < 10
      ? 0.42
      : curLevel < 20
        ? 1.15
        : curLevel < 30
          ? 3.2
          : curLevel < 40
            ? 9.0
            : 24.0;
  const rawCost = def.cost * countFactor * tierJump * Math.pow(tier.costFactor, lvlInTier);
  const cost = Math.max(25, Math.ceil(rawCost * (1 - disc)));

  const speed = getBuildSpeedMultiplier(s, nowMs);
  const rawDur = tier.baseDurSec + lvlInTier * (curLevel < 10 ? 1 : curLevel < 30 ? 2 : 3);
  const durSec = Math.max(3, Math.ceil(rawDur / speed));
  return { cost, durSec };
}

export interface BuildingLevelStats {
  level: number;
  incPerSec: number;
  maintPerSec: number;
  jobs: number;
  energy: number;
}

export interface BuildingUpgradeQuote {
  def: BuildingDef;
  count: number;
  curLevel: number;
  nextLevel: number;
  curMult: number;
  nextMult: number;
  isMax: boolean;
  tier: (typeof BUILDING_UPGRADE_TIERS)[number];
  cost: number;
  durSec: number;
  curStats: BuildingLevelStats;
  nextStats: BuildingLevelStats;
  deltas: {
    incDelta: number;
    maintDelta: number;
    jobsDelta: number;
    energyDelta: number;
  };
}

function statsForLevel(def: BuildingDef, count: number, lvl: number): BuildingLevelStats {
  const safeCount = Math.max(0, count);
  const safeLvl = Math.max(1, Math.min(MAX_BUILDING_LEVEL, lvl));
  const mult = getBuildingLevelMultiplier(safeLvl);
  const incPerSec = Number((def.inc * safeCount * mult).toFixed(2));
  const maintPerSec = Number((def.maint * safeCount * (1 + Math.pow(safeLvl - 1, 0.85) * 0.14)).toFixed(2));
  const jobs = Math.round(def.jobs * safeCount * (1 + (safeLvl - 1) * 0.04));
  const energy =
    def.energy >= 0
      ? Math.round(def.energy * safeCount * (1 + Math.pow(safeLvl - 1, 0.72) * 0.12))
      : -Math.round(Math.abs(def.energy) * safeCount * (1 + Math.pow(safeLvl - 1, 0.65) * 0.06));
  return { level: safeLvl, incPerSec, maintPerSec, jobs, energy };
}

export function getBuildingUpgradeQuote(
  s: GameState,
  buildingId: string,
  nowMs = Date.now(),
): BuildingUpgradeQuote | null {
  const def = BUILDINGS.find((b) => b.id === buildingId);
  if (!def) return null;
  const count = Math.max(0, Math.floor(Number(s.b?.[buildingId]) || 0));
  const curLevel = Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(s.gx?.lvl?.[buildingId]) || 1)));
  const isMax = curLevel >= MAX_BUILDING_LEVEL;
  const nextLevel = isMax ? MAX_BUILDING_LEVEL : curLevel + 1;
  const tier = getBuildingUpgradeTier(nextLevel);
  const { cost, durSec } = isMax || count < 1 ? { cost: 0, durSec: 0 } : getBuildingUpgradeCostAndDur(s, def, curLevel, count, nowMs);
  const curStats = statsForLevel(def, Math.max(1, count), curLevel);
  const nextStats = statsForLevel(def, Math.max(1, count), nextLevel);
  const curMult = getBuildingLevelMultiplier(curLevel);
  const nextMult = getBuildingLevelMultiplier(nextLevel);
  return {
    def,
    count,
    curLevel,
    nextLevel,
    curMult,
    nextMult,
    isMax,
    tier,
    cost,
    durSec,
    curStats,
    nextStats,
    deltas: {
      incDelta: Number((nextStats.incPerSec - curStats.incPerSec).toFixed(2)),
      maintDelta: Number((nextStats.maintPerSec - curStats.maintPerSec).toFixed(2)),
      jobsDelta: nextStats.jobs - curStats.jobs,
      energyDelta: nextStats.energy - curStats.energy,
    },
  };
}

export function getUpgradeQueue(s: GameState): UpgradeQueueSlot[] {
  return Array.isArray(s.upgQueue) ? s.upgQueue : [];
}

export function canStartBuildingUpgrade(
  s: GameState,
  buildingId: string,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; cost: number; durSec: number; targetLevel: number } {
  const quote = getBuildingUpgradeQuote(s, buildingId, nowMs);
  if (!quote) return { ok: false, reason: 'Unknown building', cost: 0, durSec: 0, targetLevel: 1 };
  if (quote.count < 1) {
    return { ok: false, reason: 'Construct at least 1 unit first', cost: 0, durSec: 0, targetLevel: quote.nextLevel };
  }
  if (quote.isMax) {
    return { ok: false, reason: `Max level (${MAX_BUILDING_LEVEL}) reached`, cost: 0, durSec: 0, targetLevel: MAX_BUILDING_LEVEL };
  }
  const queue = getUpgradeQueue(s);
  if (queue.some((q) => q.buildingId === buildingId)) {
    return { ok: false, reason: 'Upgrade already in progress', cost: quote.cost, durSec: quote.durSec, targetLevel: quote.nextLevel };
  }
  if (queue.length >= MAX_UPGRADE_QUEUE) {
    return { ok: false, reason: `Upgrade queue full (${MAX_UPGRADE_QUEUE}/${MAX_UPGRADE_QUEUE})`, cost: quote.cost, durSec: quote.durSec, targetLevel: quote.nextLevel };
  }
  if (!Number.isFinite(s.cash) || s.cash < quote.cost) {
    return { ok: false, reason: 'Not enough Coins', cost: quote.cost, durSec: quote.durSec, targetLevel: quote.nextLevel };
  }
  return { ok: true, cost: quote.cost, durSec: quote.durSec, targetLevel: quote.nextLevel };
}

export function applyStartBuildingUpgrade(
  s: GameState,
  buildingId: string,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; cost: number; durSec: number; targetLevel: number; slot?: UpgradeQueueSlot; reason?: string } {
  const check = canStartBuildingUpgrade(s, buildingId, nowMs);
  if (!check.ok) {
    return { ok: false, state: s, cost: check.cost, durSec: check.durSec, targetLevel: check.targetLevel, reason: check.reason };
  }
  const slot: UpgradeQueueSlot = {
    buildingId,
    fromLevel: check.targetLevel - 1,
    toLevel: check.targetLevel,
    finishAt: Math.floor(nowMs + check.durSec * 1000),
    totalSec: check.durSec,
    costPaid: check.cost,
  };
  return {
    ok: true,
    cost: check.cost,
    durSec: check.durSec,
    targetLevel: check.targetLevel,
    slot,
    state: {
      ...s,
      cash: Math.max(0, s.cash - check.cost),
      upgQueue: [...getUpgradeQueue(s), slot],
    },
  };
}

export function tickUpgradeQueue(
  s: GameState,
  nowMs = Date.now(),
): { state: GameState; completed: Array<{ buildingId: string; name: string; toLevel: number }> } {
  const queue = getUpgradeQueue(s);
  if (queue.length === 0) return { state: s, completed: [] };

  const remaining: UpgradeQueueSlot[] = [];
  const nextLvl = { ...(s.gx?.lvl || {}) };
  const nextHist: UpgradeHistoryEntry[] = Array.isArray(s.upgHist) ? [...s.upgHist] : [];
  const completed: Array<{ buildingId: string; name: string; toLevel: number }> = [];
  let changed = false;

  for (const slot of queue) {
    const def = BUILDINGS.find((b) => b.id === slot.buildingId);
    if (!def) {
      changed = true;
      continue;
    }
    if (slot.finishAt <= nowMs) {
      const cur = Math.max(1, Math.floor(Number(nextLvl[slot.buildingId]) || 1));
      const newLvl = Math.min(MAX_BUILDING_LEVEL, Math.max(cur + 1, slot.toLevel));
      nextLvl[slot.buildingId] = newLvl;
      nextHist.unshift({
        buildingId: slot.buildingId,
        name: def.n,
        fromLevel: cur,
        toLevel: newLvl,
        cost: slot.costPaid,
        atMs: Math.floor(slot.finishAt),
      });
      completed.push({ buildingId: slot.buildingId, name: def.n, toLevel: newLvl });
      changed = true;
    } else {
      remaining.push(slot);
    }
  }

  if (!changed) return { state: s, completed: [] };
  return {
    state: {
      ...s,
      gx: { ...s.gx, lvl: nextLvl },
      upgQueue: remaining,
      upgHist: nextHist.slice(0, 40),
    },
    completed,
  };
}

// ---------- Building Demolition ----------

export function getDemolishRefund(def: BuildingDef, qty = 1): number {
  const pct = def.demolishRefundPct ?? 0.45;
  return Math.max(1, Math.floor(def.cost * pct * Math.max(1, Math.floor(qty))));
}

export function canDemolishBuilding(
  s: GameState,
  id: string,
  qty = 1,
): { ok: boolean; reason?: string; refund: number } {
  const def = BUILDINGS.find((b) => b.id === id);
  if (!def) return { ok: false, reason: 'Unknown building', refund: 0 };
  const count = Math.max(0, Math.floor(Number(s.b?.[id]) || 0));
  const clamped = Math.max(1, Math.floor(qty));
  if (count < clamped) {
    return { ok: false, reason: 'Not enough owned buildings to demolish', refund: 0 };
  }
  return { ok: true, refund: getDemolishRefund(def, clamped) };
}

export function applyDemolishBuilding(
  s: GameState,
  id: string,
  qty = 1,
): { ok: boolean; state: GameState; refund: number; newCount: number; reason?: string } {
  const check = canDemolishBuilding(s, id, qty);
  if (!check.ok) {
    return { ok: false, state: s, refund: 0, newCount: s.b?.[id] || 0, reason: check.reason };
  }
  const cur = Math.max(0, Math.floor(Number(s.b?.[id]) || 0));
  const clamped = Math.max(1, Math.floor(qty));
  const newCount = Math.max(0, cur - clamped);
  const nextB = { ...(s.b || {}), [id]: newCount };
  const nextPolicies = { ...(s.bPolicies || {}) };
  if (newCount === 0) {
    delete nextPolicies[id];
  }
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  return {
    ok: true,
    refund: check.refund,
    newCount,
    state: {
      ...s,
      cash: Math.min(1e13, safeCash + check.refund),
      b: nextB,
      bPolicies: nextPolicies,
    },
  };
}

// ---------- Per-Building Management Policies ----------

export function getBuildingPolicyDef(id?: BuildingPolicyId | string): BuildingPolicyDef {
  return BUILDING_POLICIES.find((p) => p.id === id) || BUILDING_POLICIES[0];
}

export function getActiveBuildingPolicyId(s: GameState, buildingId: string): BuildingPolicyId {
  const raw = s.bPolicies?.[buildingId];
  if (raw && BUILDING_POLICIES.some((p) => p.id === raw)) return raw;
  return 'standard';
}

export function isBuildingPolicyAllowedFor(def: BuildingDef, policy: BuildingPolicyDef): boolean {
  return policy.categories.includes(def.cat);
}

export function canSetBuildingPolicy(
  s: GameState,
  buildingId: string,
  policyId: BuildingPolicyId,
): { ok: boolean; reason?: string; cost: number } {
  const def = BUILDINGS.find((b) => b.id === buildingId);
  if (!def) return { ok: false, reason: 'Unknown building', cost: 0 };
  const owned = Math.max(0, Math.floor(Number(s.b?.[buildingId]) || 0));
  if (owned < 1) return { ok: false, reason: 'Build at least 1 unit first', cost: 0 };
  const pol = BUILDING_POLICIES.find((p) => p.id === policyId);
  if (!pol) return { ok: false, reason: 'Unknown policy', cost: 0 };
  if (!isBuildingPolicyAllowedFor(def, pol)) {
    return { ok: false, reason: `Not applicable to ${def.cat} sector`, cost: 0 };
  }
  const curId = getActiveBuildingPolicyId(s, buildingId);
  if (curId === policyId) {
    return { ok: false, reason: 'Policy already active', cost: 0 };
  }

  if (pol.id !== 'standard' && pol.incompatibleWith?.length) {
    for (const sibling of BUILDINGS) {
      if (sibling.id === buildingId || sibling.cat !== def.cat) continue;
      if ((s.b?.[sibling.id] || 0) <= 0) continue;
      const sibPol = getActiveBuildingPolicyId(s, sibling.id);
      if (pol.incompatibleWith.includes(sibPol)) {
        const sibDef = getBuildingPolicyDef(sibPol);
        return {
          ok: false,
          reason: `Conflicts with ${sibDef.name} on ${sibling.n}`,
          cost: pol.applyCost,
        };
      }
    }
  }

  const cost = pol.id === 'standard' ? 0 : pol.applyCost;
  if (!Number.isFinite(s.cash) || s.cash < cost) {
    return { ok: false, reason: 'Not enough Coins', cost };
  }
  return { ok: true, cost };
}

export function applySetBuildingPolicy(
  s: GameState,
  buildingId: string,
  policyId: BuildingPolicyId,
): { ok: boolean; state: GameState; cost: number; reason?: string } {
  const check = canSetBuildingPolicy(s, buildingId, policyId);
  if (!check.ok) return { ok: false, state: s, cost: check.cost, reason: check.reason };
  const nextPolicies = { ...(s.bPolicies || {}) };
  if (policyId === 'standard') {
    delete nextPolicies[buildingId];
  } else {
    nextPolicies[buildingId] = policyId;
  }
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  return {
    ok: true,
    cost: check.cost,
    state: {
      ...s,
      cash: Math.max(0, safeCash - check.cost),
      bPolicies: nextPolicies,
    },
  };
}

// ---------- National Cabinet Decisions ----------

export function getNationalDecisionCooldownLeftSec(
  s: GameState,
  decisionId: string,
  nowMs = Date.now(),
): number {
  const until = Number(s.decisionsCd?.[decisionId] || 0);
  if (!Number.isFinite(until) || until <= nowMs) return 0;
  return Math.ceil((until - nowMs) / 1000);
}

export function canEnactNationalDecision(
  s: GameState,
  decision: NationalDecisionDef,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; cdLeftSec: number } {
  const curRank = Math.max(MIN_RANK, Math.floor(Number(s.rank) || MIN_RANK));
  if (curRank < decision.reqRank) {
    return { ok: false, reason: `Requires Rank ${decision.reqRank}`, cdLeftSec: 0 };
  }
  const totalB = totalBuildings(s);
  if (totalB < decision.reqBuildings) {
    return { ok: false, reason: `Requires ${decision.reqBuildings} buildings`, cdLeftSec: 0 };
  }
  const cdLeftSec = getNationalDecisionCooldownLeftSec(s, decision.id, nowMs);
  if (cdLeftSec > 0) {
    return { ok: false, reason: `Cooldown: ${cdLeftSec}s`, cdLeftSec };
  }
  if (!Number.isFinite(s.cash) || s.cash < decision.cost) {
    return { ok: false, reason: 'Not enough Coins', cdLeftSec: 0 };
  }
  return { ok: true, cdLeftSec: 0 };
}

export function applyEnactNationalDecision(
  s: GameState,
  decisionId: string,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; summary?: string; reason?: string } {
  const def = NATIONAL_DECISIONS.find((d) => d.id === decisionId);
  if (!def) return { ok: false, state: s, reason: 'Unknown decision' };
  const check = canEnactNationalDecision(s, def, nowMs);
  if (!check.ok) return { ok: false, state: s, reason: check.reason };

  const snap = computeEconomySnapshot(s, { nowMs, ignoreTempBoosters: true });
  const baseGross = Math.max(25, snap.gross);
  const baseNet = Math.max(20, snap.net);
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  const cashGain = def.cashDeltaPctGross ? Math.floor(baseGross * def.cashDeltaPctGross) : 0;
  const poolGain = def.taxPoolBoostSec ? Math.floor(baseNet * def.taxPoolBoostSec) : 0;
  const nextCash = Math.min(1e13, Math.max(0, safeCash - def.cost + cashGain));
  const capPool = Math.max(0, baseNet * (hasTech(s, 'sovereign_vault') ? 2400 : 1800));
  const nextPool =
    poolGain > 0
      ? (s.taxPool >= capPool ? s.taxPool : Math.min(capPool, (s.taxPool || 0) + poolGain))
      : s.taxPool;

  let nextCond = s.gx.cond;
  if (def.infraRepairBoost && def.infraRepairBoost > 0) {
    nextCond = { ...s.gx.cond };
    for (const k of Object.keys(nextCond)) {
      nextCond[k] = Math.min(100, (nextCond[k] ?? 100) + def.infraRepairBoost);
    }
  }

  const nextGems = Math.min(1e9, Math.max(0, Math.floor(s.gems || 0) + (def.gemsDelta || 0)));
  const nextHap = Math.min(100, Math.max(0, (s.hap || 60) + def.hapDelta));
  const nextAppr = Math.min(100, Math.max(0, (s.appr || 55) + def.apprDelta));
  const nextLog = [`Cabinet Decree: ${def.name}`, ...(s.gx?.log || [])].slice(0, 8);

  return {
    ok: true,
    summary: `${def.name} enacted`,
    state: {
      ...s,
      cash: nextCash,
      gems: nextGems,
      taxPool: nextPool,
      hap: nextHap,
      appr: nextAppr,
      decisionsCd: {
        ...(s.decisionsCd || {}),
        [def.id]: Math.floor(nowMs + def.cdSec * 1000),
      },
      gx: {
        ...s.gx,
        cond: nextCond,
        log: nextLog,
      },
    },
  };
}

export function unlockedAchievementCount(s: GameState): number {
  return ACHIEVEMENTS.filter((a) => Boolean(s.achievements?.[a.id])).length;
}

// ---------- Timed National Research Queue (50 Techs across 10 Categories) ----------

export function canStartResearch(
  s: GameState,
  techId: string,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; cost: number; durSec: number } {
  const def = TECH_TREE.find((t) => t.id === techId);
  if (!def) return { ok: false, reason: 'Unknown research', cost: 0, durSec: 0 };
  if (hasTech(s, techId)) return { ok: false, reason: 'Already researched', cost: def.cost, durSec: 0 };
  if (s.resQueue && s.resQueue.finishAt > nowMs) {
    return { ok: false, reason: 'Another research project is underway', cost: def.cost, durSec: def.durSec };
  }
  const curRank = Math.max(MIN_RANK, Math.floor(Number(s.rank) || MIN_RANK));
  if (def.reqRank && curRank < def.reqRank) {
    return { ok: false, reason: `Requires Rank ${def.reqRank}`, cost: def.cost, durSec: def.durSec };
  }
  if (def.prereq?.length) {
    const missing = def.prereq.find((pid) => !hasTech(s, pid));
    if (missing) {
      const mDef = TECH_TREE.find((t) => t.id === missing);
      return { ok: false, reason: `Requires prerequisite: ${mDef?.n || missing}`, cost: def.cost, durSec: def.durSec };
    }
  }
  const ownedBldgs = totalBuildings(s);
  if (ownedBldgs < def.reqBuildings) {
    return { ok: false, reason: `Requires ${def.reqBuildings} total buildings (${ownedBldgs}/${def.reqBuildings})`, cost: def.cost, durSec: def.durSec };
  }
  const cost = Math.max(1, Math.ceil(def.cost * getResearchCostMult(s, nowMs)));
  const durSec = Math.max(5, Math.ceil((def.durSec || 25) / getResearchSpeedMult(s, nowMs)));
  if (!Number.isFinite(s.cash) || s.cash < cost) {
    return { ok: false, reason: 'Not enough Coins', cost, durSec };
  }
  return { ok: true, cost, durSec };
}

export function applyStartResearch(
  s: GameState,
  techId: string,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; cost: number; durSec: number; reason?: string } {
  const check = canStartResearch(s, techId, nowMs);
  if (!check.ok) return { ok: false, state: s, cost: check.cost, durSec: check.durSec, reason: check.reason };
  return {
    ok: true,
    cost: check.cost,
    durSec: check.durSec,
    state: {
      ...s,
      cash: Math.max(0, s.cash - check.cost),
      resQueue: {
        techId,
        finishAt: Math.floor(nowMs + check.durSec * 1000),
        totalSec: check.durSec,
      },
    },
  };
}

export function tickResearchQueue(
  s: GameState,
  nowMs = Date.now(),
): { state: GameState; completedTechId: string | null; completedName: string | null } {
  const q = s.resQueue;
  if (!q || !q.techId) return { state: s, completedTechId: null, completedName: null };
  const def = TECH_TREE.find((t) => t.id === q.techId);
  if (!def) {
    return { state: { ...s, resQueue: null }, completedTechId: null, completedName: null };
  }
  if (q.finishAt > nowMs) {
    return { state: s, completedTechId: null, completedName: null };
  }
  return {
    completedTechId: def.id,
    completedName: def.n,
    state: {
      ...s,
      tech: { ...(s.tech || {}), [def.id]: 1 },
      resQueue: null,
      gx: {
        ...s.gx,
        log: [`Research Completed: ${def.n}`, ...(s.gx?.log || [])].slice(0, 8),
      },
    },
  };
}

// ---------- International Trade Engine (8 Goods, Dynamic Anti-Arbitrage Pricing) ----------

export interface TradeGoodQuote {
  good: TradeGoodDef;
  exportPrice: number;
  importPrice: number;
  demandTrendPct: number;
  unlocked: boolean;
}

export function getIntlTradeCapacity(s: GameState): {
  maxConcurrent: number;
  maxUnitsPerOrder: number;
  dailyVolumeCap: number;
  dailyVolumeUsed: number;
} {
  const b = s.b || {};
  const portInfra =
    (b.ports || 0) +
    (b.airports || 0) +
    (b.deep_sea_port || 0) +
    (b.intl_airport_terminal || 0) +
    (b.logistics_center || 0) +
    (b.trade_center || 0);
  const resCapMult = getPolicyStance(s, 'p_res') === 1 ? 1.1 : 1;
  const maxConcurrent = Math.min(4, 1 + Math.floor(portInfra / 4) + (hasTech(s, 'auto_customs') ? 1 : 0));
  const maxUnitsPerOrder = Math.min(55, Math.round((8 + portInfra * 2 + Math.floor((s.rank || 1) * 1.5)) * resCapMult));
  const dailyVolumeCap = Math.min(660, Math.round((80 + portInfra * 25 + (s.rank || 1) * 15) * resCapMult));
  const dailyVolumeUsed = Math.max(0, Math.floor(s.intlTrade?.dailyVolumeUsed || 0));
  return { maxConcurrent, maxUnitsPerOrder, dailyVolumeCap, dailyVolumeUsed };
}

export function getTradeGoodQuote(
  goodId: TradeGoodId,
  s: GameState,
  nowMs = Date.now(),
): TradeGoodQuote {
  const good = TRADE_GOODS.find((g) => g.id === goodId) || TRADE_GOODS[0];
  // Deterministic 10-minute global market window wave
  const bucket = Math.floor(nowMs / 600_000);
  const seed = goodId.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), bucket);
  const wave = Math.sin(seed * 0.73); // -1 .. +1
  const demandTrendPct = Math.round(wave * 14); // -14% .. +14%

  const tradeBoost =
    getTechTradeBonus(s) +
    (getPolicyStance(s, 'p_mar') === 1 ? 0.18 : 0) +
    (getPolicyStance(s, 'p_trd') === 1 ? 0.16 : 0) +
    (getPolicyStance(s, 'p_env') === 2 ? 0.04 : 0);
  const cappedExportMult = Math.min(1.28, 1 + tradeBoost * 0.4);
  const exportPrice = Math.max(10, Math.round(good.baseExportPrice * (1 + demandTrendPct / 100) * cappedExportMult));
  const importDisc = getPolicyStance(s, 'p_mar') === 2 ? 0.88 : 1;
  // Strict anti-arbitrage spread: importPrice is ALWAYS >= 1.55 * exportPrice
  const rawImport = Math.round(good.baseImportPrice * (1 - demandTrendPct * 0.005) * importDisc);
  const importPrice = Math.max(Math.ceil(exportPrice * 1.55), rawImport);

  return {
    good,
    exportPrice,
    importPrice,
    demandTrendPct,
    unlocked: (s.rank || MIN_RANK) >= good.minRank,
  };
}

export function canStartTradeContract(
  s: GameState,
  goodId: TradeGoodId,
  partner: string,
  direction: 'export' | 'import',
  units: number,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; upfrontCost: number; expectedPayout: number; durSec: number; unitPrice: number } {
  const quote = getTradeGoodQuote(goodId, s, nowMs);
  if (!quote.unlocked) {
    return { ok: false, reason: `Requires Rank ${quote.good.minRank}`, upfrontCost: 0, expectedPayout: 0, durSec: 0, unitPrice: 0 };
  }
  const partnerDef = TRADE_PARTNERS.find((p) => p.code === partner || p.name === partner);
  if (!partnerDef) {
    return { ok: false, reason: 'Invalid trade partner', upfrontCost: 0, expectedPayout: 0, durSec: 0, unitPrice: 0 };
  }
  const cap = getIntlTradeCapacity(s);
  const activeContracts = (s.intlTrade?.contracts || []).filter((c) => !c.completed);
  if (activeContracts.length >= cap.maxConcurrent) {
    return { ok: false, reason: `All ${cap.maxConcurrent} trade slots busy`, upfrontCost: 0, expectedPayout: 0, durSec: 0, unitPrice: 0 };
  }
  const clampedUnits = Math.max(1, Math.min(cap.maxUnitsPerOrder, Math.floor(units)));
  const dayStr = KARACHI_YMD_COMPACT.format(new Date(nowMs));
  const usedToday = s.intlTrade?.lastDayKey === dayStr ? cap.dailyVolumeUsed : 0;
  if (usedToday + clampedUnits > cap.dailyVolumeCap) {
    return { ok: false, reason: `Daily freight cap reached (${usedToday}/${cap.dailyVolumeCap})`, upfrontCost: 0, expectedPayout: 0, durSec: 0, unitPrice: 0 };
  }

  const unitPrice =
    direction === 'export'
      ? Math.round(quote.exportPrice * partnerDef.tariffBias)
      : quote.importPrice;
  const totalValue = unitPrice * clampedUnits;
  // Export requires a small logistics dispatch fee (22% of gross value); net gain on settlement is 78% of value
  const upfrontCost = direction === 'export' ? Math.max(50, Math.round(totalValue * 0.22)) : totalValue;
  const expectedPayout = direction === 'export' ? totalValue : 0;
  const durSec = Math.max(15, Math.min(60, 18 + Math.floor(clampedUnits * 0.6)));

  if (!Number.isFinite(s.cash) || s.cash < upfrontCost) {
    return { ok: false, reason: 'Not enough Coins', upfrontCost, expectedPayout, durSec, unitPrice };
  }
  return { ok: true, upfrontCost, expectedPayout, durSec, unitPrice };
}

export function applyStartTradeContract(
  s: GameState,
  goodId: TradeGoodId,
  partner: string,
  direction: 'export' | 'import',
  units: number,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; contract?: ActiveTradeContract; reason?: string } {
  const check = canStartTradeContract(s, goodId, partner, direction, units, nowMs);
  if (!check.ok) return { ok: false, state: s, reason: check.reason };
  const partnerDef = TRADE_PARTNERS.find((p) => p.code === partner || p.name === partner) || TRADE_PARTNERS[0];

  const cap = getIntlTradeCapacity(s);
  const clampedUnits = Math.max(1, Math.min(cap.maxUnitsPerOrder, Math.floor(units)));
  const dayStr = KARACHI_YMD_COMPACT.format(new Date(nowMs));
  const usedToday = s.intlTrade?.lastDayKey === dayStr ? cap.dailyVolumeUsed : 0;

  const contract: ActiveTradeContract = {
    id: `tr_${nowMs}_${Math.floor(Math.random() * 999)}`,
    partner: partnerDef.code,
    goodId,
    direction,
    units: clampedUnits,
    unitPrice: check.unitPrice,
    totalValue: check.unitPrice * clampedUnits,
    finishAt: Math.floor(nowMs + check.durSec * 1000),
    durSec: check.durSec,
  };

  const prev: IntlTradeState = s.intlTrade || {
    contracts: [],
    completedCount: 0,
    exportRevenue: 0,
    importSpend: 0,
    milestonesClaimed: {},
  };

  return {
    ok: true,
    contract,
    state: {
      ...s,
      cash: Math.max(0, s.cash - check.upfrontCost),
      intlTrade: {
        ...prev,
        contracts: [...(prev.contracts || []), contract].slice(-8),
        importSpend: prev.importSpend + (direction === 'import' ? check.upfrontCost : 0),
        lastDayKey: dayStr,
        dailyVolumeUsed: usedToday + clampedUnits,
      },
    },
  };
}

export function tickIntlTradeContracts(
  s: GameState,
  nowMs = Date.now(),
): { state: GameState; settled: ActiveTradeContract[] } {
  const trade = s.intlTrade;
  if (!trade || !Array.isArray(trade.contracts) || trade.contracts.length === 0) {
    return { state: s, settled: [] };
  }
  const active: ActiveTradeContract[] = [];
  const settled: ActiveTradeContract[] = [];
  let cashAdd = 0;
  let exportRevAdd = 0;
  let importBuffUntil = trade.importBuffUntil || 0;
  let hapAdd = 0;

  for (const c of trade.contracts) {
    if (!c.completed && c.finishAt <= nowMs) {
      settled.push(c);
      if (c.direction === 'export') {
        cashAdd += c.totalValue;
        exportRevAdd += c.totalValue;
      } else {
        importBuffUntil = Math.max(importBuffUntil, nowMs + 180_000);
        hapAdd += 1;
      }
    } else if (!c.completed) {
      active.push(c);
    }
  }

  if (settled.length === 0) return { state: s, settled: [] };

  return {
    settled,
    state: {
      ...s,
      cash: Math.min(1e13, (s.cash || 0) + cashAdd),
      hap: Math.min(100, (s.hap || 60) + hapAdd),
      intlTrade: {
        ...trade,
        contracts: active,
        completedCount: (trade.completedCount || 0) + settled.length,
        exportRevenue: Math.min(1e14, (trade.exportRevenue || 0) + exportRevAdd),
        importBuffUntil,
      },
    },
  };
}

export function claimTradeMilestone(
  s: GameState,
  milestoneId: string,
): { ok: boolean; state: GameState; rewardCoins: number; rewardGems: number; reason?: string } {
  const def = TRADE_MILESTONES.find((m) => m.id === milestoneId);
  if (!def) return { ok: false, state: s, rewardCoins: 0, rewardGems: 0, reason: 'Unknown trade milestone' };
  const trade = s.intlTrade || {
    contracts: [],
    completedCount: 0,
    exportRevenue: 0,
    importSpend: 0,
    milestonesClaimed: {},
  };
  if (trade.milestonesClaimed?.[milestoneId]) {
    return { ok: false, state: s, rewardCoins: 0, rewardGems: 0, reason: 'Already claimed' };
  }
  if ((trade.completedCount || 0) < def.count) {
    return { ok: false, state: s, rewardCoins: 0, rewardGems: 0, reason: `Complete ${def.count} contracts first` };
  }
  return {
    ok: true,
    rewardCoins: def.rewardCoins,
    rewardGems: def.rewardGems,
    state: {
      ...s,
      cash: Math.min(1e13, (s.cash || 0) + def.rewardCoins),
      gems: Math.min(1e9, Math.floor((s.gems || 0) + def.rewardGems)),
      intlTrade: {
        ...trade,
        milestonesClaimed: { ...(trade.milestonesClaimed || {}), [milestoneId]: 1 },
      },
    },
  };
}

// ---------- Local Mega Projects & Long-Term Challenges ----------

export const PROJECT_STAGES = 3;
const MEGA_PROJECT_STAGE_WEIGHTS = [0.3, 0.35, 0.35] as const;

function getMegaProjectTotalCostAndDur(
  s: GameState,
  type: ProjectType,
  nowMs = Date.now(),
): { totalCost: number; totalDurSec: number } {
  const def = GX_PROJECT_TYPES[type];
  if (!def) return { totalCost: 0, totalDurSec: 0 };
  const disc = getDevelopmentDiscount(s, nowMs);
  const totalCost = Math.max(100, Math.ceil(def.cost * (1 - disc)));
  const speed = 1 + (hasTech(s, 'civil_corps') ? 0.15 : 0);
  const totalDurSec = Math.max(20, Math.ceil(def.dur / 1000 / speed));
  return { totalCost, totalDurSec };
}

function getStageMilestones(type: ProjectType): {
  s1Coins: number;
  s1Gems: number;
  s2Coins: number;
  s2Gems: number;
} {
  const def = GX_PROJECT_TYPES[type];
  const rCoins = Math.max(0, def?.rewardCoins || 0);
  const rGems = Math.max(0, def?.rewardGems || 0);
  const s1Coins = Math.floor(rCoins * 0.25);
  const s1Gems = Math.floor(rGems * 0.25);
  const s2Coins = Math.floor(rCoins * 0.3);
  const s2Gems = Math.floor(rGems * 0.3);
  return { s1Coins, s1Gems, s2Coins, s2Gems };
}

export function canStartLocalMegaProject(
  s: GameState,
  type: ProjectType,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; cost: number; durSec: number; totalCost: number; totalDurSec: number } {
  const def = GX_PROJECT_TYPES[type];
  if (!def) return { ok: false, reason: 'Unknown mega project', cost: 0, durSec: 0, totalCost: 0, totalDurSec: 0 };
  const { totalCost, totalDurSec } = getMegaProjectTotalCostAndDur(s, type, nowMs);
  const stage1Cost = Math.max(50, Math.ceil(totalCost * MEGA_PROJECT_STAGE_WEIGHTS[0]));
  const stage1DurSec = Math.max(8, Math.ceil(totalDurSec * MEGA_PROJECT_STAGE_WEIGHTS[0]));
  const active = (s.megaProjects || []).filter((p) => !p.claimed);
  if (active.some((p) => p.type === type)) {
    return { ok: false, reason: 'Project already active or awaiting claim', cost: stage1Cost, durSec: stage1DurSec, totalCost, totalDurSec };
  }
  if (active.length >= MAX_CONCURRENT_LOCAL_PROJECTS) {
    return { ok: false, reason: `Max ${MAX_CONCURRENT_LOCAL_PROJECTS} active Mega Projects`, cost: stage1Cost, durSec: stage1DurSec, totalCost, totalDurSec };
  }
  if (def.reqRank && (s.rank || MIN_RANK) < def.reqRank) {
    return { ok: false, reason: `Requires Rank ${def.reqRank}`, cost: stage1Cost, durSec: stage1DurSec, totalCost, totalDurSec };
  }
  const snap = computeEconomySnapshot(s, { nowMs, ignoreTempBoosters: true });
  if (def.minJobs && snap.jobsCreated < def.minJobs) {
    return { ok: false, reason: `Requires ${def.minJobs} active jobs`, cost: stage1Cost, durSec: stage1DurSec, totalCost, totalDurSec };
  }
  if (def.minEnergySupply && snap.energySupply < def.minEnergySupply) {
    return { ok: false, reason: `Requires ${def.minEnergySupply} MW grid capacity`, cost: stage1Cost, durSec: stage1DurSec, totalCost, totalDurSec };
  }
  if (!Number.isFinite(s.cash) || s.cash < stage1Cost) {
    return { ok: false, reason: 'Not enough Coins', cost: stage1Cost, durSec: stage1DurSec, totalCost, totalDurSec };
  }
  return { ok: true, cost: stage1Cost, durSec: stage1DurSec, totalCost, totalDurSec };
}

export function applyStartLocalMegaProject(
  s: GameState,
  type: ProjectType,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; project?: LocalMegaProjectSlot; reason?: string } {
  const check = canStartLocalMegaProject(s, type, nowMs);
  if (!check.ok) return { ok: false, state: s, reason: check.reason };
  const slot: LocalMegaProjectSlot = {
    id: `mp_${type}_${nowMs}`,
    type,
    paid: check.cost,
    startedAt: nowMs,
    finishAt: Math.floor(nowMs + check.durSec * 1000),
    totalSec: check.durSec,
    status: 'active',
    claimed: false,
    stage: 1,
    totalStages: PROJECT_STAGES,
    stagePaid: 1,
    milestoneClaimedStage: 0,
  };
  return {
    ok: true,
    project: slot,
    state: {
      ...s,
      cash: Math.max(0, s.cash - check.cost),
      megaProjects: [...(s.megaProjects || []), slot],
    },
  };
}

export function getLocalMegaProjectStageQuote(
  s: GameState,
  slot: LocalMegaProjectSlot,
  nowMs = Date.now(),
): {
  currentStage: number;
  totalStages: number;
  nextStage: number | null;
  nextCost: number;
  nextDurSec: number;
  currentMilestoneCoins: number;
  currentMilestoneGems: number;
  stageFinished: boolean;
} {
  const totalStages = Math.max(1, slot.totalStages ?? 1);
  const currentStage = Math.max(1, Math.min(totalStages, slot.stage ?? 1));
  const stageFinished = slot.finishAt <= nowMs || slot.status === 'done';
  const nextStage = currentStage < totalStages ? currentStage + 1 : null;
  const { totalCost, totalDurSec } = getMegaProjectTotalCostAndDur(s, slot.type, nowMs);
  const nextWeight = nextStage ? (MEGA_PROJECT_STAGE_WEIGHTS[nextStage - 1] ?? 0.35) : 0;
  const nextCost = nextStage ? Math.max(50, Math.ceil(totalCost * nextWeight)) : 0;
  const nextDurSec = nextStage ? Math.max(8, Math.ceil(totalDurSec * nextWeight)) : 0;
  const ms = getStageMilestones(slot.type);
  const currentMilestoneCoins = currentStage === 1 ? ms.s1Coins : currentStage === 2 ? ms.s2Coins : 0;
  const currentMilestoneGems = currentStage === 1 ? ms.s1Gems : currentStage === 2 ? ms.s2Gems : 0;
  return {
    currentStage,
    totalStages,
    nextStage,
    nextCost,
    nextDurSec,
    currentMilestoneCoins,
    currentMilestoneGems,
    stageFinished,
  };
}

export function canClaimLocalMegaProjectStageMilestone(
  s: GameState,
  projectId: string,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; stage: number; coinsAdded: number; gemsAdded: number } {
  const slot = (s.megaProjects || []).find((p) => p.id === projectId);
  if (!slot) return { ok: false, reason: 'Project not found', stage: 0, coinsAdded: 0, gemsAdded: 0 };
  if (slot.claimed) return { ok: false, reason: 'Already claimed', stage: slot.stage ?? 1, coinsAdded: 0, gemsAdded: 0 };
  const quote = getLocalMegaProjectStageQuote(s, slot, nowMs);
  if (quote.currentStage >= quote.totalStages) {
    return { ok: false, reason: 'Use final project claim on final stage', stage: quote.currentStage, coinsAdded: 0, gemsAdded: 0 };
  }
  if (!quote.stageFinished) {
    return { ok: false, reason: `Stage ${quote.currentStage} still under construction`, stage: quote.currentStage, coinsAdded: 0, gemsAdded: 0 };
  }
  if ((slot.milestoneClaimedStage ?? 0) >= quote.currentStage) {
    return { ok: false, reason: `Stage ${quote.currentStage} milestone already claimed`, stage: quote.currentStage, coinsAdded: 0, gemsAdded: 0 };
  }
  return {
    ok: true,
    stage: quote.currentStage,
    coinsAdded: quote.currentMilestoneCoins,
    gemsAdded: quote.currentMilestoneGems,
  };
}

export function claimLocalMegaProjectStageMilestone(
  s: GameState,
  projectId: string,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; stage: number; coinsAdded: number; gemsAdded: number; reason?: string } {
  const check = canClaimLocalMegaProjectStageMilestone(s, projectId, nowMs);
  if (!check.ok) {
    return { ok: false, state: s, stage: check.stage, coinsAdded: 0, gemsAdded: 0, reason: check.reason };
  }
  const nextList = (s.megaProjects || []).map((p) =>
    p.id === projectId ? { ...p, milestoneClaimedStage: check.stage } : p,
  );
  return {
    ok: true,
    stage: check.stage,
    coinsAdded: check.coinsAdded,
    gemsAdded: check.gemsAdded,
    state: {
      ...s,
      cash: Math.min(1e13, (s.cash || 0) + check.coinsAdded),
      gems: Math.min(1e9, Math.floor((s.gems || 0) + check.gemsAdded)),
      megaProjects: nextList,
    },
  };
}

export function canAdvanceLocalMegaProjectStage(
  s: GameState,
  projectId: string,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; nextStage: number; cost: number; durSec: number } {
  const slot = (s.megaProjects || []).find((p) => p.id === projectId);
  if (!slot) return { ok: false, reason: 'Project not found', nextStage: 1, cost: 0, durSec: 0 };
  if (slot.claimed) return { ok: false, reason: 'Already claimed', nextStage: slot.stage ?? 1, cost: 0, durSec: 0 };
  const quote = getLocalMegaProjectStageQuote(s, slot, nowMs);
  if (quote.nextStage === null) {
    return { ok: false, reason: 'Final stage already reached', nextStage: quote.currentStage, cost: 0, durSec: 0 };
  }
  if (!quote.stageFinished) {
    return { ok: false, reason: `Stage ${quote.currentStage} still under construction`, nextStage: quote.nextStage, cost: quote.nextCost, durSec: quote.nextDurSec };
  }
  if (!Number.isFinite(s.cash) || s.cash < quote.nextCost) {
    return { ok: false, reason: 'Not enough Coins', nextStage: quote.nextStage, cost: quote.nextCost, durSec: quote.nextDurSec };
  }
  return { ok: true, nextStage: quote.nextStage, cost: quote.nextCost, durSec: quote.nextDurSec };
}

export function applyAdvanceLocalMegaProjectStage(
  s: GameState,
  projectId: string,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; nextStage: number; cost: number; durSec: number; reason?: string } {
  const check = canAdvanceLocalMegaProjectStage(s, projectId, nowMs);
  if (!check.ok) {
    return { ok: false, state: s, nextStage: check.nextStage, cost: check.cost, durSec: check.durSec, reason: check.reason };
  }
  const nextList = (s.megaProjects || []).map((p) =>
    p.id === projectId
      ? {
          ...p,
          paid: (p.paid || 0) + check.cost,
          finishAt: Math.floor(nowMs + check.durSec * 1000),
          totalSec: check.durSec,
          status: 'active' as const,
          stage: check.nextStage,
          stagePaid: check.nextStage,
        }
      : p,
  );
  return {
    ok: true,
    nextStage: check.nextStage,
    cost: check.cost,
    durSec: check.durSec,
    state: {
      ...s,
      cash: Math.max(0, s.cash - check.cost),
      megaProjects: nextList,
    },
  };
}

export function tickLocalMegaProjects(
  s: GameState,
  nowMs = Date.now(),
): { state: GameState; finishedTypes: ProjectType[] } {
  const list = s.megaProjects || [];
  if (list.length === 0) return { state: s, finishedTypes: [] };
  const finishedTypes: ProjectType[] = [];
  let changed = false;
  const nextList = list.map((p) => {
    const totalStages = p.totalStages ?? 1;
    const stagePaid = p.stagePaid ?? 1;
    if (p.status === 'active' && p.finishAt <= nowMs && stagePaid >= totalStages) {
      changed = true;
      finishedTypes.push(p.type);
      return { ...p, status: 'done' as const };
    }
    return p;
  });
  if (!changed) return { state: s, finishedTypes: [] };
  return { state: { ...s, megaProjects: nextList }, finishedTypes };
}

export function claimLocalMegaProject(
  s: GameState,
  projectId: string,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; coinsAdded: number; gemsAdded: number; reason?: string } {
  const ticked = tickLocalMegaProjects(s, nowMs).state;
  const list = ticked.megaProjects || [];
  const target = list.find((p) => p.id === projectId);
  if (!target) return { ok: false, state: ticked, coinsAdded: 0, gemsAdded: 0, reason: 'Project not found' };
  if (target.claimed) return { ok: false, state: ticked, coinsAdded: 0, gemsAdded: 0, reason: 'Already claimed' };
  const totalStages = target.totalStages ?? 1;
  const stagePaid = target.stagePaid ?? 1;
  if (stagePaid < totalStages) {
    return { ok: false, state: ticked, coinsAdded: 0, gemsAdded: 0, reason: `Complete Stage ${stagePaid}/${totalStages} first` };
  }
  if (target.status !== 'done') return { ok: false, state: ticked, coinsAdded: 0, gemsAdded: 0, reason: 'Project still under construction' };
  const def = GX_PROJECT_TYPES[target.type];
  const ms = getStageMilestones(target.type);
  const claimedStage = target.milestoneClaimedStage ?? 0;
  const alreadyCoins = (claimedStage >= 1 ? ms.s1Coins : 0) + (claimedStage >= 2 ? ms.s2Coins : 0);
  const alreadyGems = (claimedStage >= 1 ? ms.s1Gems : 0) + (claimedStage >= 2 ? ms.s2Gems : 0);
  const coinsAdded = Math.max(0, (def?.rewardCoins || 0) - alreadyCoins);
  const gemsAdded = Math.max(0, (def?.rewardGems || 0) - alreadyGems);
  const pbAdd = def?.pb || 0.01;
  const phAdd = def?.ph || 1;
  const nextList = list.map((p) => (p.id === projectId ? { ...p, claimed: true } : p));
  return {
    ok: true,
    coinsAdded,
    gemsAdded,
    state: {
      ...ticked,
      cash: Math.min(1e13, (ticked.cash || 0) + coinsAdded),
      gems: Math.min(1e9, Math.floor((ticked.gems || 0) + gemsAdded)),
      megaProjects: nextList,
      gx: {
        ...ticked.gx,
        pb: Math.min(0.4, (ticked.gx.pb || 0) + pbAdd),
        ph: Math.min(16, (ticked.gx.ph || 0) + phAdd),
        log: [`Completed Mega Project: ${def?.n || target.type}`, ...(ticked.gx.log || [])].slice(0, 8),
      },
    },
  };
}

export function claimChallenge(
  s: GameState,
  challengeId: string,
): { ok: boolean; state: GameState; coinsAdded: number; gemsAdded: number; reason?: string } {
  const def = CHALLENGES_2_0.find((c) => c.id === challengeId);
  if (!def) return { ok: false, state: s, coinsAdded: 0, gemsAdded: 0, reason: 'Unknown challenge' };
  if (s.challenges?.[challengeId]) {
    return { ok: false, state: s, coinsAdded: 0, gemsAdded: 0, reason: 'Challenge already claimed' };
  }
  if (def.f(s) < def.goal) {
    return { ok: false, state: s, coinsAdded: 0, gemsAdded: 0, reason: 'Challenge goal not reached' };
  }
  return {
    ok: true,
    coinsAdded: def.rewardCoins,
    gemsAdded: def.rewardGems,
    state: {
      ...s,
      cash: Math.min(1e13, (s.cash || 0) + def.rewardCoins),
      gems: Math.min(1e9, Math.floor((s.gems || 0) + def.rewardGems)),
      challenges: { ...(s.challenges || {}), [challengeId]: 1 },
    },
  };
}

// ---------- Centralized National Economy Engine (MEDIUM DIFFICULTY) ----------

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

  const pTax = getPolicyStance(s, 'p_tax');
  const pEmp = getPolicyStance(s, 'p_emp');
  const pSci = getPolicyStance(s, 'p_sci');
  const pMar = getPolicyStance(s, 'p_mar');
  const pDig = getPolicyStance(s, 'p_dig');

  const corpPatentMult = pSci === 2 ? 0.95 : 1;
  const customsDutyMult = pMar === 2 ? 0.95 : 1;

  const b = s.b || {};
  const raw =
    0.45 +
    t / 50 +
    c / 100 +
    l / 120 +
    (co / 150) * corpPatentMult * (1 + (b.business_districts || 0) * 0.05) +
    (g / 70) * (1 + (b.shopping_centers || 0) * 0.04) +
    (p / 60) * Math.max(0.6, Math.min(2, (s.pop || 48) / 50)) +
    (d / 90) * customsDutyMult * (1 + ((b.ports || 0) + (b.airports || 0) + (b.deep_sea_port || 0) + (b.intl_airport_terminal || 0)) * 0.06) +
    (tr / 85) * (1 + ((b.airports || 0) + (b.shopping_centers || 0) + (b.intl_hotel || 0)) * 0.05) +
    (dg / 90) * (1 + ((b.tech_parks || 0) + (b.data_centers || 0)) * 0.05) +
    (w / 105) * (1 + (b.business_districts || 0) * 0.04);

  const burden =
    t + co * 0.8 + g + p + d * 0.6 + c * 0.7 + l * 0.5 + f * 0.4 + tr * 0.4 + dg * 0.5 + w * 0.35;

  const evBase = Math.max(0, Math.min(0.75, (burden - 30) / 70 + Math.max(0, 50 - (s.appr ?? 50)) / 400));
  const ev = evBase * (pTax === 1 ? 0.75 : 1) * (pDig === 2 ? 0.85 : 1);

  let policyTaxMult = 1;
  if (pTax === 1) policyTaxMult *= 0.9;
  else if (pTax === 2) policyTaxMult *= 1.14;
  if (pEmp === 1) policyTaxMult *= 0.94;

  return { mult: raw * (1 - ev) * policyTaxMult, raw, burden, ev };
}

export function getTechIncomeMult(s: GameState): number {
  let bonusPct = 0;
  for (const t of TECH_TREE) {
    if (t.incomeBonusPct && hasTech(s, t.id)) {
      bonusPct += t.incomeBonusPct;
    }
  }
  // Controlled diminishing cap so unlocking all 50 techs never creates runaway infinite inflation
  return 1 + Math.min(1.15, bonusPct / 100);
}

export function getResearchCostMult(s: GameState, nowMs = Date.now()): number {
  let mult = 1;
  if (isBoosterActive(s, 'research_boost', nowMs)) mult *= 0.8;
  if (getPolicyStance(s, 'p_edu') === 2) mult *= 0.88;
  if (getPolicyStance(s, 'p_sci') === 1) mult *= 0.92;
  return Math.max(0.5, mult);
}

export function getResearchSpeedMult(s: GameState, nowMs = Date.now()): number {
  let mult = 1 + getTechResearchSpeedBonus(s);
  if (isBoosterActive(s, 'research_boost', nowMs)) mult += 0.25;
  if (getPolicyStance(s, 'p_sci') === 1) mult += 0.18;
  if (getPolicyStance(s, 'p_ai') === 1) mult += 0.1;
  return Math.max(0.6, mult);
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
  const pAi = getPolicyStance(s, 'p_ai');
  const pFin = getPolicyStance(s, 'p_fin');
  const pDef = getPolicyStance(s, 'p_def');
  const pEnv = getPolicyStance(s, 'p_env');
  const pUrb = getPolicyStance(s, 'p_urb');
  const pSci = getPolicyStance(s, 'p_sci');
  const pMar = getPolicyStance(s, 'p_mar');
  const pDig = getPolicyStance(s, 'p_dig');
  const pTou = getPolicyStance(s, 'p_tou');
  const pHou = getPolicyStance(s, 'p_hou');
  const pRes = getPolicyStance(s, 'p_res');

  const prodBoostActive = !ignoreTemp && isBoosterActive(s, 'prod_boost', nowMs);
  const empBoostActive = !ignoreTemp && isBoosterActive(s, 'emp_boost', nowMs);
  const researchBoostActive = !ignoreTemp && isBoosterActive(s, 'research_boost', nowMs);
  const shopBoostInfo = ignoreTemp ? { active: false, id: '', mult: 1, leftSec: 0 } : getActiveShopIncomeBooster(s, nowMs);
  const growthBoostActive = !ignoreTemp && shopBoostInfo.active && shopBoostInfo.id === 'growth_boost';

  const sectorRaw: Record<ExcludeAllBuildingCategory, number> = {
    residential: 0,
    commercial: 0,
    industry: 0,
    energy: 0,
    infrastructure: 0,
    agriculture: 0,
    technology: 0,
    healthcare_edu: 0,
    public_services: 0,
    special: 0,
  };

  let energySupply = 12;
  let energyDemand = 0;
  let jobsCreated = 0;
  let maintCostRaw = 0;
  let capitalEquity = 0;
  let housingCapacity = 80;
  let safetyPoints = 0;
  let pollutionRaw = 0;
  let cleanPoints = 0;

  const techMaintMult = 1 - getTechMaintReduction(s);
  const techEnergyMult = 1 + getTechEnergyBonus(s);
  const b = s.b || {};

  for (const d of BUILDINGS) {
    const count = Math.max(0, Math.floor(Number(b[d.id]) || 0));
    if (count <= 0) continue;
    const lvl = Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(s.gx?.lvl?.[d.id]) || 1)));
    const lvlMult = getBuildingLevelMultiplier(lvl);
    const bPol = getBuildingPolicyDef(getActiveBuildingPolicyId(s, d.id));

    capitalEquity += d.cost * count * (1 + Math.pow(lvl - 1, 0.72) * 0.42) * 1.15;

    const isCleanEnergy =
      d.id === 'solar_plants' ||
      d.id === 'wind_farms' ||
      d.id === 'offshore_wind' ||
      d.id === 'adv_solar_station' ||
      d.id === 'hydro_plant' ||
      d.id === 'geothermal_plant' ||
      d.id === 'battery_mega_facility';
    const isHeavyInd =
      d.id === 'steel_plants' ||
      d.id === 'steel_complex' ||
      d.id === 'heavy_industry' ||
      d.id === 'factories';
    const isRawExtract =
      d.id === 'farms' ||
      d.id === 'grain_mega_complex' ||
      d.id === 'steel_plants' ||
      d.id === 'steel_complex';

    let catIncomeMult = 1;
    if (d.cat === 'agriculture') {
      if (pAgr === 1) catIncomeMult *= 1.2;
      else if (pAgr === 2 && (d.id === 'food_plant' || d.id === 'dairy_plant' || d.id === 'grain_mega_complex')) {
        catIncomeMult *= 1.12;
      }
      if (pSci === 2) catIncomeMult *= 1.08;
      if (pRes === 2 && isRawExtract) catIncomeMult *= 0.95;
    } else if (d.cat === 'industry') {
      if (pInd === 1) catIncomeMult *= 1.18;
      else if (pInd === 2) catIncomeMult *= 1.1;
      if (pTrd === 2) catIncomeMult *= 1.15;
      else if (pTrd === 1) catIncomeMult *= 0.94;
      if (pDef === 2) catIncomeMult *= 1.04;
      if (pEnv === 2 && isHeavyInd) catIncomeMult *= 0.96;
      if (pRes === 2 && isRawExtract) catIncomeMult *= 0.95;
    } else if (d.cat === 'energy') {
      if (pNrg === 1 && isCleanEnergy) catIncomeMult *= 1.18;
      if (pEnv === 2 && isCleanEnergy) catIncomeMult *= 1.1;
    } else if (d.cat === 'infrastructure') {
      if (pInf === 1) catIncomeMult *= 1.1;
      if (pTrd === 1) catIncomeMult *= 1.16;
      else if (
        pTrd === 2 &&
        (d.id === 'ports' ||
          d.id === 'airports' ||
          d.id === 'logistics_center' ||
          d.id === 'deep_sea_port' ||
          d.id === 'intl_airport_terminal' ||
          d.id === 'trade_center')
      ) {
        catIncomeMult *= 0.92;
      }
      if (pMar === 1) catIncomeMult *= 1.1;
    } else if (d.cat === 'commercial') {
      if (pEmp === 2) catIncomeMult *= 1.08;
      if (pHlth === 2) catIncomeMult *= 0.97;
      if (pTrd === 1) catIncomeMult *= 1.16;
      if (pFin === 1) catIncomeMult *= 1.12;
      else if (pFin === 2) catIncomeMult *= 0.95;
      if (pMar === 2) catIncomeMult *= 1.08;
      if (pDig === 1) catIncomeMult *= 1.12;
      if (pTou === 1 && (d.id === 'intl_hotel' || d.id === 'luxury_boulevard')) catIncomeMult *= 1.14;
    } else if (d.cat === 'technology') {
      if (pEdu === 1) catIncomeMult *= 1.14;
      if (pAi === 1) catIncomeMult *= 1.14;
      if (pDig === 1) catIncomeMult *= 1.12;
      else if (pDig === 2) catIncomeMult *= 0.96;
      if (researchBoostActive) catIncomeMult *= 1.2;
    } else if (d.cat === 'healthcare_edu') {
      if (pEdu === 1) catIncomeMult *= 1.14;
      if (pSci === 2) catIncomeMult *= 1.08;
    } else if (d.cat === 'public_services') {
      if (pDef === 1) catIncomeMult *= 1.12;
    } else if (d.cat === 'residential') {
      if (pUrb === 1) catIncomeMult *= 1.12;
      else if (pUrb === 2) catIncomeMult *= 0.94;
      if (pHou === 2) catIncomeMult *= 1.1;
    } else if (d.cat === 'special') {
      if (pFin === 1) catIncomeMult *= 1.12;
      if (pTou === 1) catIncomeMult *= 1.14;
    }

    if (pAi === 2 && bPol.id === 'automated_floor') {
      catIncomeMult *= 0.94;
    }

    const baseOut = d.inc * count * lvlMult * catIncomeMult * bPol.incomeMult;
    sectorRaw[d.cat] += baseOut;

    if (d.cat === 'residential' && d.capacity) {
      const urbCapMult = pUrb === 1 ? 1.12 : 1;
      housingCapacity += d.capacity * count * (1 + Math.pow(lvl - 1, 0.7) * 0.1) * urbCapMult;
    }
    if (d.cat === 'public_services') {
      safetyPoints +=
        count *
        (d.id === 'police_hq' || d.id === 'public_safety_hq'
          ? 4.5
          : d.id === 'fire_dept' || d.id === 'emergency_response_center'
            ? 3.5
            : 2.5);
    }
    if (d.hapDelta < 0) {
      const envCut = pEnv === 1 ? 0.75 : 1;
      pollutionRaw +=
        Math.abs(d.hapDelta) *
        count *
        envCut *
        (bPol.id === 'eco_operation' ? 0.55 : bPol.id === 'overtime_shift' ? 1.2 : 1);
    } else if (
      isCleanEnergy ||
      d.id === 'water_plant' ||
      d.id === 'smart_housing' ||
      d.id === 'eco_homes'
    ) {
      cleanPoints += count * 1.4;
    }

    if (d.energy > 0) {
      let gen = d.energy * count * (1 + Math.pow(lvl - 1, 0.72) * 0.12) * techEnergyMult;
      if (pNrg === 1 && isCleanEnergy) gen *= 1.18;
      if (pNrg === 2) gen *= 1.14;
      energySupply += gen;
    } else if (d.energy < 0) {
      let dem = Math.abs(d.energy) * count * (1 + Math.pow(lvl - 1, 0.65) * 0.06) * bPol.energyMult;
      if (d.cat === 'industry' && pInd === 2) dem *= 1.1;
      if (pAi === 1) dem *= 1.1;
      if (pDig === 1) dem *= 1.1;
      if (pUrb === 2) dem *= 0.92;
      energyDemand += dem;
    }

    let j = d.jobs * count * (1 + (lvl - 1) * 0.04) * bPol.jobsMult;
    if (d.cat === 'industry' && pInd === 2) j *= 0.92;
    if (pEmp === 1) j *= 1.12;
    jobsCreated += j;

    let m = d.maint * count * (1 + Math.pow(lvl - 1, 0.85) * 0.14) * techMaintMult * bPol.maintMult;
    if (d.cat === 'industry') {
      if (pInd === 1) m *= 1.12;
      if (pEnv === 1) m *= 1.1;
      if (pRes === 2) m *= 0.88;
    }
    if (d.cat === 'agriculture' && pAgr === 1) m *= 1.15;
    if (d.cat === 'healthcare_edu') {
      if (pEdu === 1) m *= 1.12;
      else if (pEdu === 2) m *= 1.22;
      if (pHlth === 1) m *= 1.14;
      else if (pHlth === 2) m *= 1.26;
    }
    if (d.id === 'power_stations' && pNrg === 1) m *= 1.12;
    if (d.cat === 'energy' && pNrg === 2) m *= 0.92;
    if (d.cat === 'infrastructure') {
      if (pInf === 1) m *= 1.15;
      if (pMar === 1) m *= 1.14;
      if (pRes === 1) m *= 1.1;
    }
    if (d.cat === 'technology' && pSci === 1) m *= 1.15;
    if (d.cat === 'public_services' && pDef === 1) m *= 1.14;
    if (d.cat === 'special' && pTou === 1) m *= 1.12;
    if (d.cat === 'residential' && pHou === 1) m *= 1.12;
    if (pInf === 2) m *= 0.9;
    maintCostRaw += m;
  }

  const rawBuildingSum = Object.values(sectorRaw).reduce((a, x) => a + x, 0);
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
    (pHlth === 1 ? 1.04 : 1) *
    (pAi === 2 ? 1.06 : 1) *
    (pHou === 1 ? 1.1 : 1);
  empFactor = Math.max(0.75, Math.min(1.5, empFactor));

  const popNow = Math.max(1, Number(s.pop) || 48);
  const housingRatio = Number((housingCapacity / popNow).toFixed(2));
  const housingFactor = housingRatio >= 1 ? 1 + Math.min(0.04, (housingRatio - 1) * 0.04) : Math.max(0.9, 0.9 + housingRatio * 0.1);

  const pollutionLevel = Math.max(
    0,
    Math.min(100, Math.round(pollutionRaw * (hasTech(s, 'eco_catalysis') ? 0.7 : 1) - cleanPoints - (s.green || 0) * 0.4)),
  );
  const publicSafetyScore = Math.max(
    20,
    Math.min(100, Math.round(62 + safetyPoints - pollutionLevel * 0.18)),
  );

  const consumerDemandMult =
    1 +
    Math.min(
      0.38,
      (b.markets || 0) * 0.012 +
        (b.shopping_centers || 0) * 0.025 +
        (b.intl_mall || 0) * 0.028 +
        (b.luxury_boulevard || 0) * 0.032 +
        (b.business_districts || 0) * 0.035 +
        (b.corporate_tower || 0) * 0.04 +
        (b.trading_tower || 0) * 0.04 +
        (b.intl_hotel || 0) * 0.022 +
        (b.national_stadium || 0) * 0.03,
    ) *
      (pEmp === 1 ? 1.04 : 1);

  let baseTradeExportBonus =
    tradeTier * 0.05 +
    getTechTradeBonus(s) +
    ((s.intlTrade?.importBuffUntil || 0) > nowMs ? 0.06 : 0) +
    Math.min(
      0.44,
      (b.ports || 0) * 0.02 +
        (b.airports || 0) * 0.03 +
        (b.intl_airport_terminal || 0) * 0.035 +
        (b.deep_sea_port || 0) * 0.035 +
        (b.food_plant || 0) * 0.008 +
        (b.logistics_center || 0) * 0.025 +
        (b.trade_center || 0) * 0.035 +
        (b.convention_center || 0) * 0.03,
    );
  const assetBonuses = getDiamondAssetBonuses(s);
  if (pInd === 1) baseTradeExportBonus += 0.1;
  if (pAgr === 2) baseTradeExportBonus += 0.12;
  if (pTrd === 1) baseTradeExportBonus += 0.16;
  if (pTrd === 2) baseTradeExportBonus -= 0.08;
  if (pFin === 1) baseTradeExportBonus += 0.06;
  if (pEnv === 2) baseTradeExportBonus += 0.04;
  if (pMar === 1) baseTradeExportBonus += 0.18;
  baseTradeExportBonus += assetBonuses.tradeBonus;
  baseTradeExportBonus = Math.max(-0.08, Math.min(0.85, baseTradeExportBonus));
  const tradeExportBonus = Math.max(
    -0.08,
    Math.min(0.85, baseTradeExportBonus + (growthBoostActive ? 0.2 : 0)),
  );
  const growthTradeLift = (1 + tradeExportBonus) / Math.max(0.5, 1 + baseTradeExportBonus);
  const tradeImportDrag = pTrd === 1 ? 0.03 : 0;

  const ti = taxInfo(s);
  const taxInflation = Math.max(0, ti.burden - 24) * 0.08;
  const agrFoodSupplyOffset = Math.min(2.2, ((b.farms || 0) + (b.greenhouses || 0) + (b.automated_farm_complex || 0)) * 0.05 + (b.national_bank || 0) * 0.35);
  let inflationRate = 2.0 + taxInflation - agrFoodSupplyOffset;
  if (pTax === 2) inflationRate *= 0.85;
  if (pAgr === 1) inflationRate -= 0.8;
  else if (pAgr === 2) inflationRate += 0.5;
  if (pTrd === 1) inflationRate -= 1.0;
  else if (pTrd === 2) inflationRate += 1.2;
  if (pNrg === 1) inflationRate -= 0.4;
  if (pFin === 1) inflationRate += 0.6;
  else if (pFin === 2) inflationRate -= 1.2;
  if (pRes === 1) inflationRate -= 0.8;
  inflationRate = Math.max(0.5, Math.min(18, Number(inflationRate.toFixed(2))));
  const inflationDrag = Math.max(0.78, Math.min(1.02, 1 - Math.max(0, inflationRate - 2.8) * 0.014));

  let prodMult =
    energyFactor *
    empFactor *
    housingFactor *
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
  const tempMult = Math.min(2.5 / Math.max(1, growthTradeLift), shopBoostInfo.mult * gemBoost);

  const rankDef = RANKS[Math.max(MIN_RANK, Math.min(MAX_RANK, Math.floor(s.rank || MIN_RANK)))] || RANKS[MIN_RANK];
  const rankMult = 1 + (rankDef.incomeBonusPct || 0) / 100;

  const greenCount = (b.solar_plants || 0) + (b.wind_farms || 0) + (b.offshore_wind || 0) + (b.adv_solar_station || 0);
  const greenSynergy = 1 + Math.min(0.4, greenCount * (s.green || 0) * 0.0025);
  const transitSynergy = 1 + Math.min(0.38, ((b.roads || 0) + (b.railways || 0) + (b.highway_network || 0) + (b.transit_hub || 0) + (b.hs_railway_station || 0) + (b.smart_transit_hub || 0)) * (s.transitSub || 0) * 0.002);
  const rAndDSynergy = 1 + Math.min(0.45, ((b.research_centers || 0) + (b.universities || 0) + (b.central_lab || 0) + (b.space_center || 0) + (b.ai_research_campus || 0) + (b.quantum_lab || 0) + (b.national_space_center || 0)) * 0.014);

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
    getTechIncomeMult(s) *
    assetBonuses.incomeMult;

  const totalMult = macroMult * prodMult;
  const buildingGross = baseGross * totalMult;

  const sectorIncome = { ...sectorRaw };
  for (const k of Object.keys(sectorIncome) as ExcludeAllBuildingCategory[]) {
    sectorIncome[k] = sectorIncome[k] * totalMult;
  }

  const maintCost = Math.min(buildingGross * 0.3, maintCostRaw * Math.max(0.75, ti.mult * 0.5));
  const salaryScale = 0.016 * (pEmp === 2 ? 1.12 : 1);
  const salaryCost = Math.min(buildingGross * 0.16, jobsCreated * salaryScale);
  const policySpendShare = Math.min(
    0.55,
    (((s.wel + s.edu) * 0.65 + (s.rd || 0) * 0.5 + (s.green || 0) * 0.4 + (s.transitSub || 0) * 0.35) / 100) * gov.wel,
  );
  const welfareCost = buildingGross * policySpendShare;
  const net = buildingGross - maintCost - salaryCost - welfareCost;

  const baseFlow = Math.max(0, net);
  const humanCapital = (s.pop || 48) * 220 + jobsCreated * 45 + techCount(s) * 140_000;
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
    housingCapacity: Math.round(housingCapacity),
    housingRatio,
    publicSafetyScore,
    pollutionLevel,
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

// ---------- Player Ranks (1..25, multi-factor economic gates) ----------

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
    reason = `Need ${def.minTech} researched tech(s)`;
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

// ---------- Idempotent Legacy Migrations ----------

interface LegacyProvinceShape {
  slot?: unknown;
  paidPrice?: unknown;
  allocTotal?: unknown;
  gdp?: unknown;
  pop?: unknown;
}

export function migrateRanksV2OneTime(s: GameState): GameState {
  if (Number(s.mig?.[RANK_V2_MIGRATION_KEY]) > 0) {
    return {
      ...s,
      rank: Math.max(MIN_RANK, Math.min(MAX_RANK, Math.floor(Number(s.rank) || MIN_RANK))),
      mig: { ...(s.mig || {}), [RANK_V2_MIGRATION_KEY]: 1 },
    };
  }
  const curRank = Math.max(MIN_RANK, Math.min(MAX_RANK, Math.floor(Number(s.rank) || MIN_RANK)));
  const mappedRank = LEGACY_RANK_V2_MAP[curRank] ?? curRank;
  const finalRank = Math.max(curRank, Math.min(MAX_RANK, mappedRank));
  return {
    ...s,
    rank: finalRank,
    mig: { ...(s.mig || {}), [RANK_V2_MIGRATION_KEY]: 1 },
  };
}

export function migrateLegacySaveToNational(
  raw: Record<string, unknown>,
  s: GameState,
): GameState {
  const rawMilestones = (raw.milestones && typeof raw.milestones === 'object' ? raw.milestones : {}) as Record<string, unknown>;
  if (Number(rawMilestones[LEGACY_PROVINCE_MIGRATED_KEY]) > 0) {
    return migrateRanksV2OneTime({
      ...s,
      rank: Math.max(MIN_RANK, s.rank || MIN_RANK),
      milestones: { ...(s.milestones || {}), [LEGACY_PROVINCE_MIGRATED_KEY]: 1 },
    });
  }

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
      if (Number.isFinite(oldLvl) && oldLvl >= 1 && oldLvl <= MAX_BUILDING_LEVEL) {
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

  return migrateRanksV2OneTime({
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
  });
}
