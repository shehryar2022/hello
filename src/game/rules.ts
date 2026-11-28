import {
  ACHIEVEMENTS,
  BOOSTERS,
  BUILDING_META_OVERRIDES_16,
  BUILDING_POLICIES,
  BUILDINGS,
  CHALLENGES_16,
  CHALLENGES_2_0,
  CHALLENGES_ALL,
  CLOUD_MAX_RANK,
  COUNTRIES,
  CRATE_CD_MS,
  CRATE_COST_CASH,
  CRATE_COST_GEMS,
  DAILY_REWARDS,
  DIPLOMACY_PARTNERS_16,
  DIPLOMACY_TREATIES_16,
  DYNAMIC_EVENTS_16,
  EXEC_DECISIONS,
  GOV_CHANGE_CD_MS,
  GOV_DAY_SEC,
  GOVS,
  GX_GOV_BUILDINGS,
  GX_PROJECT_TYPES,
  GX_ROADS,
  LEGACY_22_BUILDING_IDS,
  MAX_BUILDING_LEVEL,
  MAX_CONSTRUCTION_QUEUE,
  MAX_RANK,
  MIN_RANK,
  NATIONAL_DECISIONS,
  NATIONAL_POLICIES,
  OFFLINE_CAP_SEC,
  OFFLINE_RATE,
  PRODUCTION_CHAINS_16,
  RANKS,
  REAL_GDP_SCALED,
  RESOURCE_CATALOG_16,
  STICKERS,
  SUBSCRIPTIONS,
  TECH_CATEGORY_META,
  TECH_TREE,
  TRADE_GOODS,
  TRADE_MILESTONES,
  TZ,
  WEEKLY_MISSIONS,
} from './constants';
import type {
  ActiveTradeContract,
  BoosterDef,
  BuildingPolicyId,
  CityTimeMode,
  CityWeatherMode,
  CosmeticPurchaseHistoryEntry,
  EquippedCosmetics,
  GameState,
  GameThemeId,
  IntlTradeState,
  LeaderboardMode,
  LocalMegaProjectSlot,
  PlayerProfile,
  PlayerStats,
  PolicyCategoryId,
  ProjectType,
  QuestDef,
  ResearchQueueSlot,
  RewardHistoryEntry,
  StickerDef,
  SubPromoState,
  SubscriptionDef,
  SubscriptionTierId,
  TradeGoodId,
  UpgradeHistoryEntry,
  UpgradeQueueSlot,
} from './types';
import {
  ALL_COSMETIC_ITEMS,
  COSMETIC_BY_ID,
  getDiamondAssetBonuses,
  slotForCategory,
  VALID_COSMETIC_ID_SET,
  VALID_THEME_ID_SET,
} from './cosmetics';
import {
  computeReadyAchievementCount,
  getDailyQuestsView,
  getDailyRewardsView,
} from './rewards';
import {
  applyAdvanceLocalMegaProjectStage,
  applyBuyBoosterV2,
  applyChangePolicyStance,
  applyCommitFiscalReform,
  applyDemolishBuilding,
  applyEnactNationalDecision,
  applySetBuildingPolicy,
  applyStartBuildingConstruction,
  applyStartBuildingUpgrade,
  applyStartLocalMegaProject,
  applyStartResearch,
  applyStartTradeContract,
  BOOSTER_ACTIVE_PREFIX,
  BOOSTER_DAILY_PREFIX,
  buildingCost,
  bulkBuildingCost,
  canAdvanceLocalMegaProjectStage,
  canBuyBoosterV2,
  canChangePolicyStance,
  canClaimLocalMegaProjectStageMilestone,
  canCommitFiscalReform,
  canDemolishBuilding,
  canEnactNationalDecision,
  canSetBuildingPolicy,
  canStartBuildingConstruction,
  canStartBuildingUpgrade,
  canStartLocalMegaProject,
  canStartResearch,
  canStartTradeContract,
  claimChallenge,
  claimLocalMegaProject,
  claimLocalMegaProjectStageMilestone,
  claimTradeMilestone,
  computeEconomySnapshot,
  currentWorldEvent,
  extractFiscalDraft,
  FISCAL_COOLDOWN_KEY,
  getActiveBuildingPolicyId,
  getActiveShopIncomeBooster,
  getActiveSubscription,
  getBoosterActivationInfo,
  getBuildingPolicyDef,
  getBuildingUpgradeCostAndDur,
  getBuildingUpgradeQuote,
  getBuildingUpgradeTier,
  getBuildSpeedMultiplier,
  getConstructionQueue,
  getDemolishRefund,
  getDevelopmentDiscount,
  getFiscalCommitCost,
  getFiscalCooldownLeftMs,
  getGovDefinition,
  getIntlTradeCapacity,
  getLocalMegaProjectStageQuote,
  getNationalDecisionCooldownLeftSec,
  getPolicyCooldownLeftMs,
  getPolicyStance,
  getRankEligibility,
  getResearchCostMult,
  getResearchSpeedMult,
  getTechBuildSpeedBonus,
  getTechEnergyBonus,
  getTechHapBonus,
  getTechIncomeMult,
  getTechLevel,
  getTechMaintReduction,
  getTechResearchSpeedBonus,
  getTechTradeBonus,
  getTradeGoodQuote,
  getUpgradeQueue,
  gxAverageCondition,
  gxHappinessMod,
  gxLevelMult,
  gxMultiplier,
  hasFiscalDraftChanges,
  hasTech,
  isBoosterActive,
  isBuildingPolicyAllowedFor,
  LEGACY_PROVINCE_MIGRATED_KEY,
  migrateLegacySaveToNational,
  migrateRanksV2OneTime,
  POLICY_BOUNDS,
  POLICY_COOLDOWN_PREFIX,
  policyCooldownKey,
  presetToFiscalDraft,
  PROJECT_STAGES,
  QUEUE_FINISH_PREFIX,
  QUEUE_QTY_PREFIX,
  RANK_V2_MIGRATION_KEY,
  stickerBonus,
  stickerUniqueCount,
  taxInfo,
  techCount,
  tickConstructionQueue,
  tickIntlTradeContracts,
  tickLocalMegaProjects,
  tickResearchQueue,
  tickUpgradeQueue,
  totalBuildings,
  unlockedAchievementCount,
} from './economy';

export * from './economy';
export * from './ecosystem16';

export function formatNumber(n: number): string {
  const v = Math.floor(Number.isFinite(n) ? n : 0);
  if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e4) return (v / 1e3).toFixed(1) + 'K';
  return v.toLocaleString('en-US');
}

export function formatFullNumber(n: number): string {
  const v = Math.floor(Number.isFinite(n) ? n : 0);
  return v.toLocaleString('en-US');
}

export function sanitizeCountryCode(c: unknown): string {
  return String(c == null ? '' : c).replace(/[^A-Za-z]/g, '').slice(0, 3);
}

export function flagUrl(c: unknown): string {
  const code = sanitizeCountryCode(c);
  return code ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : '';
}

export function flagLargeUrl(c: unknown): string {
  const code = sanitizeCountryCode(c);
  return code ? `https://flagcdn.com/w160/${code.toLowerCase()}.png` : '';
}

export function freshState(): GameState {
  const b: Record<string, number> = {};
  const lvl: Record<string, number> = {};
  for (const d of BUILDINGS) {
    b[d.id] = 0;
    lvl[d.id] = 1;
  }
  const cond: Record<string, number> = {};
  for (const a of [...GX_GOV_BUILDINGS, ...GX_ROADS]) {
    cond[a[0]] = 100;
  }

  return {
    cash: 260,
    gems: 3,
    taxPool: 0,
    day: 0,
    b,
    tax: 20,
    wel: 15,
    hap: 60,
    appr: 55,
    pop: 48,
    boost: 0,
    claimed: {},
    milestones: { [LEGACY_PROVINCE_MIGRATED_KEY]: 1 },
    crateCd: 0,
    t: Date.now(),
    ev: 40,
    edu: 8,
    hist: [],
    country: COUNTRIES[0],
    stk: {},
    streak: 0,
    lastDaily: 0,
    set: { sfx: 1, vib: 1, anim: 1 },
    fuel: 0,
    carbon: 0,
    luxury: 0,
    corp: 0,
    gst: 0,
    prop: 0,
    duty: 0,
    tourism: 0,
    digital: 0,
    wealth: 0,
    rd: 0,
    green: 0,
    transitSub: 0,
    questDay: '',
    questIds: [],
    rank: MIN_RANK,
    activeFx: {},
    boosterCd: {},
    fused: 0,
    gov: 'rep',
    govT: 0,
    gx: {
      cond,
      lvl,
      acc: 0,
      blk: 0,
      pb: 0,
      ph: 0,
      log: [],
      exp: null,
    },
    sub: {},
    subPromo: {},
    tech: {},
    bPolicies: {},
    achievements: {},
    weeklyDay: '',
    weeklyClaimed: {},
    decisionsCd: {},
    cityTimeMode: 'auto',
    cityWeather: 'clear',
    cos: [],
    cosEq: {},
    cosHist: [],
    theme: 'midnight_galaxy',
    dSlot: 0,
    dLastDay: '',
    dHist: [],
    wMilDay: '',
    wMilClaim: {},
    wHist: [],
    qHist: [],
    eqStk: '',
    pol: {},
    upgQueue: [],
    upgHist: [],
    resQueue: null,
    intlTrade: {
      contracts: [],
      completedCount: 0,
      exportRevenue: 0,
      importSpend: 0,
      milestonesClaimed: {},
    },
    challenges: {},
    megaProjects: [],
    mig: { [RANK_V2_MIGRATION_KEY]: 1 },
    resources: { stock: {}, cap: 1500 },
    finance: { debt: 0, interestPaid: 0, borrowedTotal: 0 },
    diplomacy: { relations: {}, treaties: [], rep: 52 },
    dynEvent: null,
    techLvls: {},
  };
}

const VALID_STICKER_ID_SET = new Set(STICKERS.map((s) => s.id));
const VALID_TECH_ID_SET = new Set(TECH_TREE.map((t) => t.id));
const VALID_POLICY_ID_SET = new Set<string>(NATIONAL_POLICIES.map((p) => p.id));
const VALID_RESOURCE_ID_SET = new Set<string>(RESOURCE_CATALOG_16.map((r) => r.id));
const VALID_PARTNER_CODE_SET = new Set<string>(DIPLOMACY_PARTNERS_16.map((p) => p.code));
const VALID_TREATY_ID_SET = new Set<string>(DIPLOMACY_TREATIES_16.map((t) => t.id));
const VALID_DYNAMIC_EVENT_ID_SET = new Set<string>(DYNAMIC_EVENTS_16.map((e) => e.id));

export function cleanStickersMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, val] of Object.entries(raw as Record<string, unknown>)) {
    const n = Math.floor(Number(val));
    if (VALID_STICKER_ID_SET.has(k) && Number.isFinite(n) && n > 0) {
      out[k] = Math.min(1_000_000_000, n) + 0;
    }
  }
  return out;
}

const VALID_POLICY_CD_KEYS = new Set<string>([
  FISCAL_COOLDOWN_KEY,
  ...NATIONAL_POLICIES.map((p) => policyCooldownKey(p.id)),
]);

export function cleanMilestonesMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return { [LEGACY_PROVINCE_MIGRATED_KEY]: 1 };
  const rawObj = raw as Record<string, unknown>;

  if (Number(rawObj[LEGACY_PROVINCE_MIGRATED_KEY]) > 0) {
    out[LEGACY_PROVINCE_MIGRATED_KEY] = 1;
  }

  for (const m of MILESTONES) {
    if (Number(rawObj[m.id]) > 0) {
      out[m.id] = 1;
    }
  }

  for (const k of VALID_POLICY_CD_KEYS) {
    const v = Math.floor(Number(rawObj[k]));
    if (Number.isFinite(v) && v > 0) {
      out[k] = Math.min(1e13, v) + 0;
    }
  }

  let queuePairs = 0;
  for (const [k, rawVal] of Object.entries(rawObj)) {
    if (!k.startsWith(QUEUE_FINISH_PREFIX)) continue;
    if (queuePairs >= MAX_CONSTRUCTION_QUEUE) break;
    const buildingId = k.slice(QUEUE_FINISH_PREFIX.length);
    if (!BUILDINGS.some((b) => b.id === buildingId)) continue;
    const finishAt = Math.floor(Number(rawVal));
    if (!Number.isFinite(finishAt) || finishAt <= 0) continue;
    const qtyRaw = Math.floor(Number(rawObj[`${QUEUE_QTY_PREFIX}${buildingId}`]) || 1);
    const qty = Math.max(1, Math.min(50, Number.isFinite(qtyRaw) ? qtyRaw : 1));
    out[k] = Math.min(1e13, finishAt) + 0;
    out[`${QUEUE_QTY_PREFIX}${buildingId}`] = qty + 0;
    queuePairs += 1;
  }

  const keys = Object.keys(out);
  if (keys.length > 40) {
    const trimmed: Record<string, number> = {};
    for (const k of keys.slice(0, 40)) {
      trimmed[k] = out[k];
    }
    return trimmed;
  }
  return out;
}

export function cleanTechMap(raw: unknown, maxKeys = 64): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, val] of Object.entries(raw as Record<string, unknown>)) {
    const n = Math.floor(Number(val));
    if (VALID_TECH_ID_SET.has(k) && n > 0) {
      out[k] = 1;
    } else if (VALID_POLICY_ID_SET.has(k) && (n === 1 || n === 2)) {
      out[k] = n;
    }
    if (Object.keys(out).length >= maxKeys) break;
  }
  return out;
}

const LEGACY_BOOSTER_MAP: Record<string, string> = {
  quick_profit: 'income_boost',
  golden_treasury: 'growth_boost',
  boom_surge: 'growth_boost',
  tax_surge: 'tax_boost',
};

interface PackedV2Extension {
  ob?: Record<string, number>;
  ol?: Record<string, number>;
  ot?: string[];
  os?: Record<string, number>;
  r?: number;
  bp?: Record<string, string>;
  ach?: Record<string, number>;
  wk?: string;
  wc?: Record<string, number>;
  dc?: Record<string, number>;
  ct?: CityTimeMode;
  cw?: CityWeatherMode;
  co?: string[];
  ce?: EquippedCosmetics;
  ch2?: CosmeticPurchaseHistoryEntry[];
  th?: GameThemeId;
  es?: string;
  ds?: number;
  dl?: string;
  dh?: RewardHistoryEntry[];
  wm?: string;
  wc2?: Record<string, number>;
  wh?: RewardHistoryEntry[];
  qh?: RewardHistoryEntry[];
  pol?: Record<string, 1 | 2>;
  uq?: UpgradeQueueSlot[];
  uh?: UpgradeHistoryEntry[];
  rq?: ResearchQueueSlot | null;
  it?: IntlTradeState;
  ch?: Record<string, number>;
  mp?: LocalMegaProjectSlot[];
  mg?: Record<string, number>;
  // Part 16 v2 packed state
  tl?: Record<string, number>;
  rs?: { s: Record<string, number>; c?: number };
  fn?: { d: number; i: number; b: number };
  dp?: { r: Record<string, number>; t: string[]; rep: number; j?: string[]; s?: string };
  ev16?: { id: string; exp: number; res?: boolean };
}

function unpackV2FromProvBudgetLog(rawLog: unknown): PackedV2Extension | null {
  if (!Array.isArray(rawLog)) return null;
  const v2Chunks = rawLog.filter((item): item is string => typeof item === 'string' && item.startsWith('v2:'));
  if (v2Chunks.length === 0) return null;
  try {
    const joined = v2Chunks.map((c) => c.slice(3)).join('');
    const parsed = JSON.parse(joined);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as PackedV2Extension;
  } catch {
    return null;
  }
}

export function migrateState(
  raw: Partial<GameState> & Record<string, unknown>,
  nowMs = Date.now(),
): GameState {
  const D = freshState();
  const s = Object.assign({}, D, raw || {}) as GameState & {
    loan?: unknown;
    deals?: unknown;
    avHist?: unknown;
    avs?: unknown;
    provinces?: unknown;
    provBudgetLog?: unknown;
    provTxs?: unknown;
  };

  const v2Pack = unpackV2FromProvBudgetLog(raw?.provBudgetLog);

  delete s.loan;
  delete s.deals;
  delete s.avHist;
  delete s.avs;

  const rawB = s.b && typeof s.b === 'object' ? { ...(s.b as Record<string, unknown>) } : {};
  if (v2Pack?.ob && typeof v2Pack.ob === 'object') {
    for (const [k, val] of Object.entries(v2Pack.ob)) {
      if (!(k in rawB) || Number(rawB[k] || 0) === 0) {
        rawB[k] = val;
      }
    }
  }
  const cleanB: Record<string, number> = {};
  for (const d of BUILDINGS) {
    const v = Math.floor(Number(rawB[d.id]));
    cleanB[d.id] = Number.isFinite(v) && v >= 0 ? Math.min(10_000, v) : 0;
  }
  s.b = cleanB;

  if (v2Pack?.r && Number.isFinite(v2Pack.r)) {
    s.rank = Math.max(Number(s.rank || MIN_RANK), Number(v2Pack.r));
  }

  if (!s.set || typeof s.set !== 'object') {
    s.set = { sfx: 1, vib: 1, anim: 1 };
  } else {
    s.set = {
      sfx: s.set.sfx ? 1 : 0,
      vib: s.set.vib ? 1 : 0,
      anim: s.set.anim ? 1 : 0,
    };
  }

  const rawStk = s.stk && typeof s.stk === 'object' ? { ...(s.stk as Record<string, unknown>) } : {};
  if (v2Pack?.os && typeof v2Pack.os === 'object') {
    for (const [k, val] of Object.entries(v2Pack.os)) {
      if (!(k in rawStk) || Number(rawStk[k] || 0) === 0) {
        rawStk[k] = val;
      }
    }
  }
  const legacyFused =
    Number.isFinite(Number(rawStk.fused))
      ? Math.min(1_000_000, Math.max(0, Math.floor(Number(rawStk.fused))))
      : 0;
  s.stk = cleanStickersMap(rawStk);
  s.fused = Number.isFinite(Number(s.fused))
    ? Math.min(1_000_000, Math.max(0, Math.floor(Number(s.fused))))
    : legacyFused;

  const numFields: Array<keyof GameState> = [
    'cash', 'gems', 'taxPool', 'day', 'tax', 'wel', 'hap', 'appr', 'pop',
    'boost', 'ev', 'edu', 'streak', 'lastDaily', 'crateCd', 'fuel', 'carbon', 'luxury',
    'corp', 'gst', 'prop', 'duty', 'tourism', 'digital', 'wealth', 'rd', 'green', 'transitSub', 'rank', 'govT',
  ];
  for (const k of numFields) {
    const v = Number(s[k]);
    (s as unknown as Record<string, number>)[k] = Number.isFinite(v) ? v : Number(D[k] || 0);
  }
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  s.cash = Math.min(1e13, Math.max(0, s.cash));
  s.gems = Math.min(1e9, Math.max(0, Math.floor(s.gems)));
  s.taxPool = Math.min(1e13, Math.max(0, s.taxPool));
  s.boost = Math.max(0, Math.min(30, s.boost));
  s.rank = Math.max(MIN_RANK, Math.min(MAX_RANK, Math.floor(s.rank || MIN_RANK)));
  s.streak = Math.max(0, Math.min(10_000, Math.floor(s.streak)));
  s.hap = Math.max(0, Math.min(100, s.hap)) + 0;
  s.appr = Math.max(0, Math.min(100, s.appr)) + 0;
  s.pop = Math.max(1, Math.min(100_000, s.pop)) + 0;
  if ((s.lastDaily || 0) > now + 86_400_000 || (s.lastDaily || 0) < 0) s.lastDaily = 0;
  if ((s.govT || 0) > now + 86_400_000 || (s.govT || 0) < 0) s.govT = 0;
  s.crateCd = Math.max(0, Math.min(now + CRATE_CD_MS + 86_400_000, Math.floor(s.crateCd || 0))) + 0;

  for (const [k, [mn, mx]] of Object.entries(POLICY_BOUNDS)) {
    const val = Number((s as unknown as Record<string, number>)[k]) || 0;
    (s as unknown as Record<string, number>)[k] = Math.round(Math.max(mn, Math.min(mx, val)));
  }

  if (!s.claimed || typeof s.claimed !== 'object') {
    s.claimed = {};
  } else {
    const cleanClaimed: Record<string, number> = {};
    for (const [k, v] of Object.entries(s.claimed).slice(0, 20)) {
      if (Number(v) > 0) cleanClaimed[k.slice(0, 32)] = 1;
    }
    s.claimed = cleanClaimed;
  }
  s.milestones = cleanMilestonesMap(raw?.milestones ?? s.milestones);

  // Merge top-level tech & v2Pack.ot overflow techs + v2Pack.tl multi-level techs
  const rawTechMerged: Record<string, unknown> =
    s.tech && typeof s.tech === 'object' ? { ...(s.tech as Record<string, unknown>) } : {};
  if (Array.isArray(v2Pack?.ot)) {
    for (const tid of v2Pack.ot) {
      if (typeof tid === 'string') rawTechMerged[tid] = 1;
    }
  }
  const rawTechLvls = (raw?.techLvls && typeof raw.techLvls === 'object' ? raw.techLvls : v2Pack?.tl) as
    | Record<string, unknown>
    | undefined;
  const cleanTechLvls: Record<string, number> = {};
  if (rawTechLvls && typeof rawTechLvls === 'object') {
    for (const tDef of TECH_TREE) {
      const lv = Math.floor(Number(rawTechLvls[tDef.id]));
      if (Number.isFinite(lv) && lv >= 1) {
        const clamped = Math.min(Math.max(1, tDef.maxLevel ?? 1), lv);
        cleanTechLvls[tDef.id] = clamped;
        rawTechMerged[tDef.id] = 1;
      }
    }
  }
  s.tech = cleanTechMap(rawTechMerged, 160);
  s.techLvls = cleanTechLvls;

  // Policies map (raw.pol or v2Pack.pol or legacy tech p_ entries)
  const rawPolSource = (raw?.pol && typeof raw.pol === 'object' ? raw.pol : v2Pack?.pol) as Record<string, unknown> | undefined;
  const cleanPol: Record<string, 0 | 1 | 2> = {};
  if (rawPolSource && typeof rawPolSource === 'object') {
    for (const [k, v] of Object.entries(rawPolSource)) {
      if (VALID_POLICY_ID_SET.has(k) && (Number(v) === 1 || Number(v) === 2)) {
        cleanPol[k] = Number(v) as 1 | 2;
      }
    }
  }
  for (const p of NATIONAL_POLICIES) {
    const legacyV = Number(s.tech?.[p.id]);
    if ((legacyV === 1 || legacyV === 2) && !(p.id in cleanPol)) {
      cleanPol[p.id] = legacyV as 1 | 2;
    }
  }
  s.pol = cleanPol;

  if (!s.activeFx || typeof s.activeFx !== 'object') s.activeFx = {};
  const legacyFx = s.activeFx as Record<string, number>;
  if (legacyFx.income3x && legacyFx.income3x > now) {
    s.activeFx = {
      incomeBoostEnd: Math.min(legacyFx.income3x, now + 250_000),
      incomeBoostMult: 1.6,
      incomeBoostId: 'growth_boost',
      taxSurge: legacyFx.tax2x ? 1 : 0,
    };
  } else if (legacyFx.income15 && legacyFx.income15 > now) {
    s.activeFx = {
      incomeBoostEnd: Math.min(legacyFx.income15, now + 250_000),
      incomeBoostMult: 1.35,
      incomeBoostId: 'income_boost',
      taxSurge: legacyFx.tax2x ? 1 : 0,
    };
  } else {
    const nextFx: GameState['activeFx'] = {};
    const endVal = Number(s.activeFx.incomeBoostEnd);
    const multVal = Number(s.activeFx.incomeBoostMult);
    if (Number.isFinite(endVal) && endVal > now && Number.isFinite(multVal) && multVal > 1) {
      nextFx.incomeBoostEnd = Math.max(0, Math.min(1e13, Math.floor(Math.min(endVal, now + 250_000)))) + 0;
      nextFx.incomeBoostMult = Math.max(1, Math.min(1.6, multVal)) + 0;
      if (typeof s.activeFx.incomeBoostId === 'string' && s.activeFx.incomeBoostId) {
        nextFx.incomeBoostId = s.activeFx.incomeBoostId.slice(0, 32);
      }
    }
    if (legacyFx.tax2x || s.activeFx.taxSurge) {
      nextFx.taxSurge = 1;
    }
    s.activeFx = nextFx;
  }

  if (!s.boosterCd || typeof s.boosterCd !== 'object') {
    s.boosterCd = {};
  } else {
    const cleanCd: Record<string, number> = {};
    const rawCd = s.boosterCd as Record<string, unknown>;
    for (const b of BOOSTERS) {
      const aKey = `${BOOSTER_ACTIVE_PREFIX}${b.id}`;
      const dKey = `${BOOSTER_DAILY_PREFIX}${b.id}`;
      const actVal = Number(rawCd[aKey] ?? rawCd[b.id]);
      if (Number.isFinite(actVal) && actVal > 0) {
        cleanCd[aKey] = Math.min(now + 86_400_000, Math.floor(actVal)) + 0;
      }
      const dailyVal = Number(rawCd[dKey]);
      if (Number.isFinite(dailyVal) && dailyVal > 0) {
        cleanCd[dKey] = Math.min(2099123199, Math.floor(dailyVal)) + 0;
      }
    }
    for (const [oldId, newId] of Object.entries(LEGACY_BOOSTER_MAP)) {
      const legacyVal = Number(rawCd[oldId]);
      const targetKey = `${BOOSTER_ACTIVE_PREFIX}${newId}`;
      if (Number.isFinite(legacyVal) && legacyVal > 0 && !(targetKey in cleanCd)) {
        cleanCd[targetKey] = Math.min(now + 86_400_000, Math.floor(legacyVal)) + 0;
      }
    }
    s.boosterCd = cleanCd;
  }

  if (!Array.isArray(s.hist)) s.hist = [];
  s.hist = s.hist
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .map((v) => Math.min(1e13, Math.max(0, v)) + 0)
    .slice(-60);
  if (!Array.isArray(s.country) || !s.country[0]) s.country = D.country;
  if (!Array.isArray(s.questIds)) s.questIds = [];
  if (typeof s.questDay !== 'string') s.questDay = '';
  if (typeof s.gov !== 'string' || !GOVS.some((g) => g.id === s.gov)) s.gov = 'rep';
  if (typeof s.t !== 'number' || !Number.isFinite(s.t) || s.t < 0 || s.t > now + 86_400_000) {
    s.t = now;
  }

  const gx = s.gx && typeof s.gx === 'object' ? s.gx : D.gx;
  const cond: Record<string, number> = {};
  for (const a of [...GX_GOV_BUILDINGS, ...GX_ROADS]) {
    const v = Number(gx.cond?.[a[0]]);
    cond[a[0]] = (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 100) + 0;
  }
  const rawLvlSource = gx.lvl && typeof gx.lvl === 'object' ? { ...(gx.lvl as Record<string, unknown>) } : {};
  if (v2Pack?.ol && typeof v2Pack.ol === 'object') {
    for (const [k, val] of Object.entries(v2Pack.ol)) {
      if (Number(val) > Number(rawLvlSource[k] || 1)) {
        rawLvlSource[k] = val;
      }
    }
  }
  const lvl: Record<string, number> = {};
  for (const d of BUILDINGS) {
    const v = Math.floor(Number(rawLvlSource[d.id]));
    lvl[d.id] = v >= 1 && v <= MAX_BUILDING_LEVEL ? v : 1;
  }
  const rawExp = gx.exp && typeof gx.exp === 'object' ? (gx.exp as unknown as Record<string, unknown>) : null;
  const cleanExp = rawExp
    ? {
        sal: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.sal) || 0))) + 0,
        el: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.el) || 0))) + 0,
        inf: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.inf) || 0))) + 0,
        total: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.total) || 0))) + 0,
        paid: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.paid) || 0))) + 0,
        n: Math.max(0, Math.min(1_000_000, Math.floor(Number(rawExp.n) || 0))) + 0,
        t: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.t) || 0))) + 0,
      }
    : null;
  const accVal = Number(gx.acc);
  const blkVal = Math.floor(Number(gx.blk));
  const pbVal = Number(gx.pb);
  const phVal = Number(gx.ph);
  s.gx = {
    cond,
    lvl,
    acc: Math.min(GOV_DAY_SEC, Math.max(0, Number.isFinite(accVal) ? accVal : 0)) + 0,
    blk: Math.min(1_000_000, Math.max(0, Number.isFinite(blkVal) ? blkVal : 0)) + 0,
    pb: Math.min(0.4, Math.max(0, Number.isFinite(pbVal) ? pbVal : 0)) + 0,
    ph: Math.min(16, Math.max(0, Number.isFinite(phVal) ? phVal : 0)) + 0,
    log: Array.isArray(gx.log)
      ? gx.log.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 120)).slice(0, 8)
      : [],
    exp: cleanExp,
  };

  const rawSub = s.sub && typeof s.sub === 'object' ? s.sub : {};
  const subDef = SUBSCRIPTIONS.find((x) => x.id === rawSub.tier);
  const subExp = Number(rawSub.exp);
  if (subDef && Number.isFinite(subExp) && subExp > 0) {
    const clampedExp = Math.max(0, Math.min(1e13, Math.floor(Math.min(subExp, now + 31 * 86_400_000)))) + 0;
    s.sub = {
      tier: subDef.id,
      exp: clampedExp,
      lastClaimDay: typeof rawSub.lastClaimDay === 'string' ? rawSub.lastClaimDay.slice(0, 16) : '',
    };
  } else {
    s.sub = {};
  }

  const rawPromo = s.subPromo && typeof s.subPromo === 'object' ? s.subPromo : {};
  const promoTier = SUBSCRIPTIONS.find((x) => x.id === rawPromo.tier);
  const promoPct = Number(rawPromo.pct);
  const promoExp = Number(rawPromo.exp);
  const promoWeek = typeof rawPromo.weekKey === 'string' ? rawPromo.weekKey.slice(0, 16) : '';
  if (
    promoWeek &&
    promoTier &&
    Number.isFinite(promoPct) &&
    promoPct >= 5 &&
    promoPct <= 40 &&
    Number.isFinite(promoExp) &&
    promoExp >= 0
  ) {
    s.subPromo = {
      weekKey: promoWeek,
      tier: promoTier.id,
      pct: Math.round(promoPct) + 0,
      exp: Math.max(0, Math.min(1e13, Math.floor(Math.min(promoExp, now + 8 * 86_400_000)))) + 0,
    };
  } else {
    s.subPromo = {};
  }

  const validBuildingSet = new Set(BUILDINGS.map((b) => b.id));
  const validPolicySet = new Set(BUILDING_POLICIES.map((p) => p.id));
  const rawBp = (raw?.bPolicies && typeof raw.bPolicies === 'object' ? raw.bPolicies : v2Pack?.bp) as Record<string, unknown> | undefined;
  const cleanBp: Record<string, BuildingPolicyId> = {};
  if (rawBp && typeof rawBp === 'object') {
    for (const [k, v] of Object.entries(rawBp)) {
      if (validBuildingSet.has(k) && typeof v === 'string' && validPolicySet.has(v as BuildingPolicyId) && v !== 'standard') {
        cleanBp[k] = v as BuildingPolicyId;
      }
    }
  }
  s.bPolicies = cleanBp;

  const rawAch = (raw?.achievements && typeof raw.achievements === 'object' ? raw.achievements : v2Pack?.ach) as Record<string, unknown> | undefined;
  const cleanAch: Record<string, number> = {};
  if (rawAch && typeof rawAch === 'object') {
    for (const a of ACHIEVEMENTS) {
      if (Number(rawAch[a.id]) > 0) cleanAch[a.id] = 1;
    }
  }
  s.achievements = cleanAch;

  const rawWk = typeof raw?.weeklyDay === 'string' ? raw.weeklyDay : (typeof v2Pack?.wk === 'string' ? v2Pack.wk : '');
  s.weeklyDay = rawWk.slice(0, 16);

  const rawWc = (raw?.weeklyClaimed && typeof raw.weeklyClaimed === 'object' ? raw.weeklyClaimed : v2Pack?.wc) as Record<string, unknown> | undefined;
  const cleanWc: Record<string, number> = {};
  if (rawWc && typeof rawWc === 'object') {
    for (const m of WEEKLY_MISSIONS) {
      if (Number(rawWc[m.id]) > 0) cleanWc[m.id] = 1;
    }
  }
  s.weeklyClaimed = cleanWc;

  const rawDc = (raw?.decisionsCd && typeof raw.decisionsCd === 'object' ? raw.decisionsCd : v2Pack?.dc) as Record<string, unknown> | undefined;
  const cleanDc: Record<string, number> = {};
  if (rawDc && typeof rawDc === 'object') {
    for (const [k, valRaw] of Object.entries(rawDc)) {
      if (NATIONAL_DECISIONS.some((d) => d.id === k) || VALID_POLICY_CD_KEYS.has(k)) {
        const val = Math.floor(Number(valRaw));
        if (Number.isFinite(val) && val > 0) cleanDc[k] = Math.min(1e13, val) + 0;
      }
    }
  }
  s.decisionsCd = cleanDc;

  const rawCt = raw?.cityTimeMode ?? v2Pack?.ct;
  s.cityTimeMode = rawCt === 'day' || rawCt === 'sunset' || rawCt === 'night' ? rawCt : 'auto';
  const rawCw = raw?.cityWeather ?? v2Pack?.cw;
  s.cityWeather = rawCw === 'overcast' || rawCw === 'rain' ? rawCw : 'clear';

  const rawCos = Array.isArray(raw?.cos) ? raw.cos : v2Pack?.co;
  const cosSet = new Set<string>();
  if (Array.isArray(rawCos)) {
    for (const id of rawCos) {
      if (typeof id === 'string' && VALID_COSMETIC_ID_SET.has(id) && id !== 'theme_midnight_galaxy') {
        cosSet.add(id);
      }
    }
  }
  s.cos = Array.from(cosSet);

  const rawEq = (raw?.cosEq && typeof raw.cosEq === 'object' ? raw.cosEq : v2Pack?.ce) as Record<string, unknown> | undefined;
  const cleanEq: EquippedCosmetics = {};
  if (rawEq && typeof rawEq === 'object') {
    for (const slot of ['frame', 'nameEffect', 'badge', 'anim', 'lbAnim', 'achFx', 'premiumVfx'] as const) {
      const id = rawEq[slot];
      if (typeof id === 'string' && cosSet.has(id)) {
        const def = COSMETIC_BY_ID.get(id);
        if (def && slotForCategory(def.category) === slot) {
          cleanEq[slot] = id;
        }
      }
    }
  }
  s.cosEq = cleanEq;

  const rawEqStk = typeof raw?.eqStk === 'string' ? raw.eqStk : (typeof v2Pack?.es === 'string' ? v2Pack.es : '');
  s.eqStk = VALID_STICKER_ID_SET.has(rawEqStk) && (s.stk?.[rawEqStk] || 0) > 0 ? rawEqStk : '';

  const rawCosHist = Array.isArray(raw?.cosHist) ? raw.cosHist : (Array.isArray(v2Pack?.ch2) ? v2Pack.ch2 : []);
  s.cosHist = rawCosHist
    .filter((entry): entry is CosmeticPurchaseHistoryEntry => Boolean(entry && typeof entry === 'object' && typeof entry.itemId === 'string'))
    .slice(0, 25)
    .map((entry, idx) => ({
      id: typeof entry.id === 'string' && entry.id ? entry.id.slice(0, 48) : `ch_${idx}_${now}`,
      itemId: String(entry.itemId).slice(0, 48),
      name: String(entry.name || entry.itemId).slice(0, 64),
      kind: entry.kind === 'bundle' ? 'bundle' : 'item',
      diamondsPaid: Math.max(0, Math.min(100_000, Math.floor(Number(entry.diamondsPaid) || 0))),
      coinsPaid: Math.max(0, Math.min(1e12, Math.floor(Number(entry.coinsPaid) || 0))),
      atMs: Math.max(0, Math.min(1e13, Math.floor(Number(entry.atMs) || now))),
    }));

  const rawTheme = (raw?.theme ?? v2Pack?.th) as GameThemeId | undefined;
  if (
    rawTheme &&
    VALID_THEME_ID_SET.has(rawTheme) &&
    (rawTheme === 'midnight_galaxy' ||
      ALL_COSMETIC_ITEMS.some((it) => it.category === 'theme' && it.themeId === rawTheme && cosSet.has(it.id)))
  ) {
    s.theme = rawTheme;
  } else {
    s.theme = 'midnight_galaxy';
  }

  const rawDSlot = Math.floor(Number(raw?.dSlot ?? v2Pack?.ds ?? 0));
  s.dSlot = Number.isFinite(rawDSlot) ? Math.max(0, Math.min(5, rawDSlot)) : 0;
  const rawDLast = raw?.dLastDay ?? v2Pack?.dl;
  s.dLastDay = typeof rawDLast === 'string' ? rawDLast.slice(0, 16) : '';

  const sanitizeHist = (input: unknown): RewardHistoryEntry[] => {
    if (!Array.isArray(input)) return [];
    const out: RewardHistoryEntry[] = [];
    for (const item of input.slice(0, 8)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const day = typeof obj.day === 'string' ? obj.day.slice(0, 16) : '';
      const label = typeof obj.label === 'string' ? obj.label.slice(0, 48) : '';
      const coins = Math.max(0, Math.min(1e12, Math.floor(Number(obj.coins) || 0)));
      const diamonds = Math.max(0, Math.min(1e6, Math.floor(Number(obj.diamonds) || 0)));
      const bonus = typeof obj.bonus === 'string' && obj.bonus ? obj.bonus.slice(0, 32) : undefined;
      if (day && label) out.push(bonus ? { day, label, coins, diamonds, bonus } : { day, label, coins, diamonds });
    }
    return out;
  };
  s.dHist = sanitizeHist(raw?.dHist ?? v2Pack?.dh);

  const rawWDay = raw?.wMilDay ?? v2Pack?.wm;
  s.wMilDay = typeof rawWDay === 'string' ? rawWDay.slice(0, 16) : '';
  const rawWClaim = (raw?.wMilClaim && typeof raw.wMilClaim === 'object' ? raw.wMilClaim : v2Pack?.wc2) as Record<string, unknown> | undefined;
  const cleanWClaim: Record<string, number> = {};
  if (rawWClaim && typeof rawWClaim === 'object') {
    for (const [k, v] of Object.entries(rawWClaim).slice(0, 10)) {
      if (Number(v) > 0 && /^wm_[a-z0-9_]{1,24}$/.test(k)) cleanWClaim[k] = 1;
    }
  }
  s.wMilClaim = cleanWClaim;
  s.wHist = sanitizeHist(raw?.wHist ?? v2Pack?.wh);
  s.qHist = sanitizeHist(raw?.qHist ?? v2Pack?.qh);

  // Sanitize Update 2.0 fields (Upgrade Queue & History, Research Queue, Intl Trade, Challenges, Local Mega Projects, Migration flags)
  const rawUpgQ = Array.isArray(raw?.upgQueue) ? raw.upgQueue : (Array.isArray(v2Pack?.uq) ? v2Pack.uq : []);
  s.upgQueue = rawUpgQ
    .filter((x): x is UpgradeQueueSlot => Boolean(x && typeof x === 'object' && validBuildingSet.has(x.buildingId)))
    .slice(0, 4)
    .map((x) => ({
      buildingId: x.buildingId,
      fromLevel: Math.max(1, Math.min(MAX_BUILDING_LEVEL - 1, Math.floor(Number(x.fromLevel) || 1))),
      toLevel: Math.max(2, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(x.toLevel) || 2))),
      finishAt: Math.max(0, Math.min(1e13, Math.floor(Number(x.finishAt) || 0))),
      totalSec: Math.max(1, Math.min(3600, Math.floor(Number(x.totalSec) || 10))),
      costPaid: Math.max(0, Math.min(1e13, Math.floor(Number(x.costPaid) || 0))),
    }));

  const rawUpgH = Array.isArray(raw?.upgHist) ? raw.upgHist : (Array.isArray(v2Pack?.uh) ? v2Pack.uh : []);
  s.upgHist = rawUpgH
    .filter((x): x is UpgradeHistoryEntry => Boolean(x && typeof x === 'object' && validBuildingSet.has(x.buildingId)))
    .slice(0, 40)
    .map((x) => ({
      buildingId: x.buildingId,
      name: String(x.name || x.buildingId).slice(0, 48),
      fromLevel: Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(x.fromLevel) || 1))),
      toLevel: Math.max(1, Math.min(MAX_BUILDING_LEVEL, Math.floor(Number(x.toLevel) || 2))),
      cost: Math.max(0, Math.min(1e13, Math.floor(Number(x.cost) || 0))),
      atMs: Math.max(0, Math.min(1e13, Math.floor(Number(x.atMs) || now))),
    }));

  const rawRq = (raw?.resQueue !== undefined ? raw.resQueue : v2Pack?.rq) as ResearchQueueSlot | null | undefined;
  if (rawRq && typeof rawRq === 'object' && VALID_TECH_ID_SET.has(rawRq.techId)) {
    s.resQueue = {
      techId: rawRq.techId,
      finishAt: Math.max(0, Math.min(1e13, Math.floor(Number(rawRq.finishAt) || 0))),
      totalSec: Math.max(1, Math.min(7200, Math.floor(Number(rawRq.totalSec) || 15))),
    };
  } else {
    s.resQueue = null;
  }

  const rawIt = (raw?.intlTrade && typeof raw.intlTrade === 'object' ? raw.intlTrade : v2Pack?.it) as IntlTradeState | undefined;
  const validGoodSet = new Set<string>(TRADE_GOODS.map((g) => g.id));
  const cleanContracts: ActiveTradeContract[] = Array.isArray(rawIt?.contracts)
    ? rawIt.contracts
        .filter((c): c is ActiveTradeContract => Boolean(c && typeof c === 'object' && validGoodSet.has(c.goodId)))
        .slice(0, 8)
        .map((c) => ({
          id: String(c.id || 'tr').slice(0, 32),
          partner: String(c.partner || 'EU Market').slice(0, 32),
          goodId: c.goodId as TradeGoodId,
          direction: c.direction === 'import' ? 'import' : 'export',
          units: Math.max(1, Math.min(200, Math.floor(Number(c.units) || 1))),
          unitPrice: Math.max(1, Math.min(1e9, Math.floor(Number(c.unitPrice) || 100))),
          totalValue: Math.max(1, Math.min(1e12, Math.floor(Number(c.totalValue) || 100))),
          finishAt: Math.max(0, Math.min(1e13, Math.floor(Number(c.finishAt) || now))),
          durSec: Math.max(5, Math.min(600, Math.floor(Number(c.durSec) || 20))),
          completed: Boolean(c.completed),
        }))
    : [];
  const cleanTradeMil: Record<string, number> = {};
  if (rawIt?.milestonesClaimed && typeof rawIt.milestonesClaimed === 'object') {
    for (const tm of TRADE_MILESTONES) {
      if (Number(rawIt.milestonesClaimed[tm.id]) > 0) cleanTradeMil[tm.id] = 1;
    }
  }
  s.intlTrade = {
    contracts: cleanContracts,
    completedCount: Math.max(0, Math.min(1_000_000, Math.floor(Number(rawIt?.completedCount) || 0))),
    exportRevenue: Math.max(0, Math.min(1e14, Math.floor(Number(rawIt?.exportRevenue) || 0))),
    importSpend: Math.max(0, Math.min(1e14, Math.floor(Number(rawIt?.importSpend) || 0))),
    importBuffUntil: rawIt?.importBuffUntil ? Math.max(0, Math.min(1e13, Math.floor(Number(rawIt.importBuffUntil)))) : undefined,
    milestonesClaimed: cleanTradeMil,
    lastDayKey: typeof rawIt?.lastDayKey === 'string' ? rawIt.lastDayKey.slice(0, 16) : undefined,
    dailyVolumeUsed: Math.max(0, Math.min(100_000, Math.floor(Number(rawIt?.dailyVolumeUsed) || 0))),
  };

  const rawCh = (raw?.challenges && typeof raw.challenges === 'object' ? raw.challenges : v2Pack?.ch) as Record<string, unknown> | undefined;
  const cleanCh: Record<string, number> = {};
  if (rawCh && typeof rawCh === 'object') {
    for (const c of CHALLENGES_ALL) {
      if (Number(rawCh[c.id]) > 0) cleanCh[c.id] = 1;
    }
  }
  s.challenges = cleanCh;

  const rawMp = Array.isArray(raw?.megaProjects) ? raw.megaProjects : (Array.isArray(v2Pack?.mp) ? v2Pack.mp : []);
  s.megaProjects = rawMp
    .filter((p): p is LocalMegaProjectSlot => Boolean(p && typeof p === 'object' && p.type in GX_PROJECT_TYPES))
    .slice(0, 21)
    .map((p) => {
      const totalStages = Number.isFinite(Number(p.totalStages)) && Number(p.totalStages) >= 1
        ? Math.max(1, Math.min(PROJECT_STAGES, Math.floor(Number(p.totalStages))))
        : undefined;
      const stage = totalStages && Number.isFinite(Number(p.stage))
        ? Math.max(1, Math.min(totalStages, Math.floor(Number(p.stage))))
        : undefined;
      const stagePaid = totalStages && Number.isFinite(Number(p.stagePaid))
        ? Math.max(1, Math.min(totalStages, Math.floor(Number(p.stagePaid))))
        : undefined;
      const milestoneClaimedStage = totalStages && Number.isFinite(Number(p.milestoneClaimedStage))
        ? Math.max(0, Math.min(totalStages - 1, Math.floor(Number(p.milestoneClaimedStage))))
        : undefined;
      const slot: LocalMegaProjectSlot = {
        id: String(p.id || `mp_${p.type}`).slice(0, 40),
        type: p.type as ProjectType,
        paid: Math.max(0, Math.min(1e13, Math.floor(Number(p.paid) || 0))),
        startedAt: Math.max(0, Math.min(1e13, Math.floor(Number(p.startedAt) || now))),
        finishAt: Math.max(0, Math.min(1e13, Math.floor(Number(p.finishAt) || now))),
        totalSec: Math.max(1, Math.min(86_400, Math.floor(Number(p.totalSec) || 60))),
        status: p.status === 'done' ? 'done' : 'active',
        claimed: Boolean(p.claimed),
      };
      if (totalStages !== undefined) slot.totalStages = totalStages;
      if (stage !== undefined) slot.stage = stage;
      if (stagePaid !== undefined) slot.stagePaid = stagePaid;
      if (milestoneClaimedStage !== undefined) slot.milestoneClaimedStage = milestoneClaimedStage;
      return slot;
    });

  const rawMig = (raw?.mig && typeof raw.mig === 'object' ? raw.mig : v2Pack?.mg) as Record<string, unknown> | undefined;
  const cleanMig: Record<string, number> = {};
  if (rawMig && typeof rawMig === 'object') {
    for (const [k, v] of Object.entries(rawMig).slice(0, 10)) {
      if (Number(v) > 0 && /^[a-zA-Z0-9_]{1,24}$/.test(k)) cleanMig[k] = 1;
    }
  }
  s.mig = cleanMig;

  // Part 16 resources, finance, diplomacy & dynamic events sanitization
  const rawRs = raw?.resources && typeof raw.resources === 'object'
    ? (raw.resources as { stock?: unknown; cap?: unknown })
    : (v2Pack?.rs ? { stock: v2Pack.rs.s, cap: v2Pack.rs.c } : undefined);
  const cleanStock: Record<string, number> = {};
  if (rawRs?.stock && typeof rawRs.stock === 'object') {
    for (const [rk, rv] of Object.entries(rawRs.stock as Record<string, unknown>)) {
      const n = Number(rv);
      if (VALID_RESOURCE_ID_SET.has(rk) && Number.isFinite(n) && n > 0.005) {
        cleanStock[rk] = Math.round(Math.min(1_000_000_000, n) * 100) / 100;
      }
    }
  }
  const rawCap = Math.floor(Number(rawRs?.cap));
  s.resources = {
    stock: cleanStock,
    cap: Number.isFinite(rawCap) && rawCap > 0 ? Math.min(10_000_000, rawCap) : 1500,
  };

  const rawFn = raw?.finance && typeof raw.finance === 'object'
    ? (raw.finance as { debt?: unknown; interestPaid?: unknown; borrowedTotal?: unknown })
    : (v2Pack?.fn ? { debt: v2Pack.fn.d, interestPaid: v2Pack.fn.i, borrowedTotal: v2Pack.fn.b } : undefined);
  s.finance = {
    debt: Math.max(0, Math.min(1e13, Math.round(Number(rawFn?.debt) || 0))),
    interestPaid: Math.max(0, Math.min(1e13, Math.round(Number(rawFn?.interestPaid) || 0))),
    borrowedTotal: Math.max(0, Math.min(1e13, Math.round(Number(rawFn?.borrowedTotal) || 0))),
  };

  const rawDp = raw?.diplomacy && typeof raw.diplomacy === 'object'
    ? (raw.diplomacy as { relations?: unknown; treaties?: unknown; rep?: unknown; jointVentures?: unknown; sanctionTarget?: unknown })
    : (v2Pack?.dp ? { relations: v2Pack.dp.r, treaties: v2Pack.dp.t, rep: v2Pack.dp.rep, jointVentures: v2Pack.dp.j, sanctionTarget: v2Pack.dp.s } : undefined);
  const cleanRel: Record<string, number> = {};
  if (rawDp?.relations && typeof rawDp.relations === 'object') {
    for (const [pk, pv] of Object.entries(rawDp.relations as Record<string, unknown>)) {
      const n = Math.round(Number(pv));
      if (VALID_PARTNER_CODE_SET.has(pk) && Number.isFinite(n)) {
        cleanRel[pk] = Math.max(0, Math.min(100, n));
      }
    }
  }
  const cleanTreaties: string[] = [];
  if (Array.isArray(rawDp?.treaties)) {
    for (const tid of rawDp.treaties) {
      if (typeof tid === 'string' && VALID_TREATY_ID_SET.has(tid) && !cleanTreaties.includes(tid)) {
        cleanTreaties.push(tid);
      }
    }
  }
  const rawRep = Number(rawDp?.rep);
  s.diplomacy = {
    relations: cleanRel,
    treaties: cleanTreaties.slice(0, 12),
    rep: Number.isFinite(rawRep) ? Math.max(0, Math.min(100, Math.round(rawRep))) : 52,
    ...(Array.isArray(rawDp?.jointVentures) && rawDp.jointVentures.length > 0
      ? { jointVentures: rawDp.jointVentures.filter((x): x is string => typeof x === 'string').slice(0, 12) }
      : {}),
    ...(typeof rawDp?.sanctionTarget === 'string' && VALID_PARTNER_CODE_SET.has(rawDp.sanctionTarget)
      ? { sanctionTarget: rawDp.sanctionTarget }
      : {}),
  };

  const rawEv16 = raw?.dynEvent !== undefined ? raw.dynEvent : (v2Pack?.ev16 ? { id: v2Pack.ev16.id, expiresAt: v2Pack.ev16.exp, resolved: Boolean(v2Pack.ev16.res) } : null);
  if (rawEv16 && typeof rawEv16 === 'object' && typeof rawEv16.id === 'string' && VALID_DYNAMIC_EVENT_ID_SET.has(rawEv16.id)) {
    const exp = Math.floor(Number(rawEv16.expiresAt) || 0);
    s.dynEvent = {
      id: rawEv16.id,
      expiresAt: Math.max(0, Math.min(1e13, exp)),
      resolved: Boolean(rawEv16.resolved),
    };
  } else {
    s.dynEvent = null;
  }

  const migrated = migrateLegacySaveToNational(raw || {}, s);
  delete (migrated as unknown as Record<string, unknown>).provinces;
  delete (migrated as unknown as Record<string, unknown>).provBudgetLog;
  delete (migrated as unknown as Record<string, unknown>).provTxs;
  return migrated;
}

function stripUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return 0;
    if (typeof value === 'number') return value + 0;
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    const cleaned = stripUndefinedDeep(v);
    if (cleaned !== undefined) {
      out[k] = cleaned;
    }
  }
  return out;
}

function toSafeInt(value: unknown, min: number, max: number): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n)) + 0;
}

const CLOUD_TOP_LEVEL_KEYS = [
  'cash', 'gems', 'taxPool', 'day', 'b', 'tax', 'wel', 'hap', 'appr', 'pop',
  'boost', 'claimed', 'milestones', 'crateCd', 't', 'ev', 'edu', 'hist', 'stk',
  'streak', 'lastDaily', 'set', 'fuel', 'carbon', 'luxury', 'corp', 'gst', 'prop',
  'duty', 'tourism', 'digital', 'wealth', 'rd', 'green', 'transitSub', 'questDay',
  'questIds', 'rank', 'activeFx', 'boosterCd', 'fused', 'gov', 'govT', 'gx',
  'sub', 'subPromo', 'tech', 'provBudgetLog',
] as const;

export const ALLOWED_SAVE_KEYS = new Set<string>(CLOUD_TOP_LEVEL_KEYS);

const LEGACY_22_SET = new Set<string>(LEGACY_22_BUILDING_IDS);

export function cleanSavePayload(s: GameState, nowMs = Date.now()): Record<string, unknown> {
  const normalized = migrateState({ ...(s as GameState & Record<string, unknown>) }, nowMs);
  normalized.cash = Math.min(1e13, Math.max(0, Number.isFinite(Number(normalized.cash)) ? Number(normalized.cash) : 0)) + 0;
  normalized.gems = toSafeInt(normalized.gems, 0, 1e9);
  normalized.taxPool = Math.min(1e13, Math.max(0, Number.isFinite(Number(normalized.taxPool)) ? Number(normalized.taxPool) : 0)) + 0;
  const fullRank = toSafeInt(normalized.rank, MIN_RANK, MAX_RANK);
  normalized.rank = Math.min(CLOUD_MAX_RANK, fullRank) + 0;
  normalized.fused = toSafeInt(normalized.fused, 0, 1_000_000);
  normalized.streak = toSafeInt(normalized.streak, 0, 10_000);
  normalized.day = Math.max(0, Math.min(100_000_000, Number.isFinite(Number(normalized.day)) ? Number(normalized.day) : 0)) + 0;
  normalized.ev = Math.max(0, Math.min(1000, Number.isFinite(Number(normalized.ev)) ? Number(normalized.ev) : 0)) + 0;
  normalized.crateCd = Math.max(0, Math.min(1e13, Number.isFinite(Number(normalized.crateCd)) ? Number(normalized.crateCd) : 0)) + 0;
  normalized.t = Math.max(0, Math.min(1e13, Number.isFinite(Number(normalized.t)) ? Number(normalized.t) : 0)) + 0;
  normalized.lastDaily = Math.max(0, Math.min(1e13, Number.isFinite(Number(normalized.lastDaily)) ? Number(normalized.lastDaily) : 0)) + 0;
  normalized.govT = Math.max(0, Math.min(1e13, Number.isFinite(Number(normalized.govT)) ? Number(normalized.govT) : 0)) + 0;
  normalized.questIds = Array.isArray(normalized.questIds)
    ? normalized.questIds
        .filter((x) => typeof x === 'number' && Number.isFinite(x) && x >= 0)
        .map((x) => Math.min(1000, Math.trunc(x)) + 0)
        .slice(0, 10)
    : [];
  normalized.questDay = typeof normalized.questDay === 'string' ? normalized.questDay.slice(0, 32) : '';

  const fullB = normalized.b || {};
  const fullLvl = normalized.gx?.lvl || {};
  const extraIds = BUILDINGS.map((d) => d.id)
    .filter((id) => !LEGACY_22_SET.has(id))
    .sort((a, b) => {
      const activeDiff = (fullB[b] || 0) - (fullB[a] || 0);
      if (activeDiff !== 0) return activeDiff;
      const lvlDiff = (fullLvl[b] || 1) - (fullLvl[a] || 1);
      if (lvlDiff !== 0) return lvlDiff;
      return a.localeCompare(b);
    });
  const primaryIds = [...LEGACY_22_BUILDING_IDS, ...extraIds].slice(0, 35);
  const primarySet = new Set(primaryIds);

  const primaryB: Record<string, number> = {};
  const primaryLvl: Record<string, number> = {};
  for (const id of primaryIds) {
    primaryB[id] = fullB[id] || 0;
    primaryLvl[id] = Math.min(5, fullLvl[id] || 1);
  }

  const overflowB: Record<string, number> = {};
  const overflowLvl: Record<string, number> = {};
  for (const d of BUILDINGS) {
    const cnt = fullB[d.id] || 0;
    const lv = fullLvl[d.id] || 1;
    if (!primarySet.has(d.id)) {
      if (cnt > 0) overflowB[d.id] = cnt;
      if (lv > 1) overflowLvl[d.id] = lv;
    } else if (lv > 5) {
      overflowLvl[d.id] = lv;
    }
  }

  // Cap top-level tech <= 16 and stk <= 48 while packing overflow into v2Pack
  const fullTechKeys = Object.keys(normalized.tech || {});
  const primaryTech: Record<string, number> = {};
  const overflowTech: string[] = [];
  fullTechKeys.forEach((k, idx) => {
    if (idx < 16) {
      primaryTech[k] = normalized.tech![k];
    } else if ((normalized.tech?.[k] || 0) > 0) {
      overflowTech.push(k);
    }
  });

  const sortedStk = Object.entries(normalized.stk || {}).sort((a, b) => b[1] - a[1]);
  const primaryStk: Record<string, number> = {};
  const overflowStk: Record<string, number> = {};
  sortedStk.forEach(([k, v], idx) => {
    if (idx < 48) {
      primaryStk[k] = v;
    } else {
      overflowStk[k] = v;
    }
  });

  const pack: PackedV2Extension = {};
  if (Object.keys(overflowB).length > 0) pack.ob = overflowB;
  if (Object.keys(overflowLvl).length > 0) pack.ol = overflowLvl;
  if (overflowTech.length > 0) pack.ot = overflowTech;
  if (Object.keys(overflowStk).length > 0) pack.os = overflowStk;
  if (fullRank > 15) pack.r = fullRank;
  if (normalized.bPolicies && Object.keys(normalized.bPolicies).length > 0) pack.bp = normalized.bPolicies;
  if (normalized.achievements && Object.keys(normalized.achievements).length > 0) pack.ach = normalized.achievements;
  if (normalized.weeklyDay) pack.wk = normalized.weeklyDay;
  if (normalized.weeklyClaimed && Object.keys(normalized.weeklyClaimed).length > 0) pack.wc = normalized.weeklyClaimed;
  if (normalized.decisionsCd && Object.keys(normalized.decisionsCd).length > 0) pack.dc = normalized.decisionsCd;
  if (normalized.cityTimeMode && normalized.cityTimeMode !== 'auto') pack.ct = normalized.cityTimeMode;
  if (normalized.cityWeather && normalized.cityWeather !== 'clear') pack.cw = normalized.cityWeather;
  if (normalized.cos && normalized.cos.length > 0) pack.co = normalized.cos;
  if (normalized.cosEq && Object.keys(normalized.cosEq).length > 0) pack.ce = normalized.cosEq;
  if (normalized.cosHist && normalized.cosHist.length > 0) pack.ch2 = normalized.cosHist.slice(0, 25);
  if (normalized.theme && normalized.theme !== 'midnight_galaxy') pack.th = normalized.theme;
  if (normalized.eqStk) pack.es = normalized.eqStk;
  if ((normalized.dSlot || 0) > 0) pack.ds = normalized.dSlot;
  if (normalized.dLastDay) pack.dl = normalized.dLastDay;
  if (normalized.dHist && normalized.dHist.length > 0) pack.dh = normalized.dHist.slice(0, 5);
  if (normalized.wMilDay) pack.wm = normalized.wMilDay;
  if (normalized.wMilClaim && Object.keys(normalized.wMilClaim).length > 0) pack.wc2 = normalized.wMilClaim;
  if (normalized.wHist && normalized.wHist.length > 0) pack.wh = normalized.wHist.slice(0, 5);
  if (normalized.qHist && normalized.qHist.length > 0) pack.qh = normalized.qHist.slice(0, 5);
  if (normalized.pol && Object.keys(normalized.pol).length > 0) {
    const compactPol: Record<string, 1 | 2> = {};
    for (const [k, v] of Object.entries(normalized.pol)) {
      if (v === 1 || v === 2) compactPol[k] = v;
    }
    if (Object.keys(compactPol).length > 0) pack.pol = compactPol;
  }
  if (normalized.upgQueue && normalized.upgQueue.length > 0) pack.uq = normalized.upgQueue;
  if (normalized.upgHist && normalized.upgHist.length > 0) pack.uh = normalized.upgHist.slice(0, 20);
  if (normalized.resQueue) pack.rq = normalized.resQueue;
  if (
    normalized.intlTrade &&
    ((normalized.intlTrade.contracts?.length || 0) > 0 ||
      (normalized.intlTrade.completedCount || 0) > 0 ||
      Object.keys(normalized.intlTrade.milestonesClaimed || {}).length > 0)
  ) {
    pack.it = normalized.intlTrade;
  }
  if (normalized.challenges && Object.keys(normalized.challenges).length > 0) pack.ch = normalized.challenges;
  if (normalized.megaProjects && normalized.megaProjects.length > 0) pack.mp = normalized.megaProjects;
  if (normalized.mig && Object.keys(normalized.mig).length > 0) pack.mg = normalized.mig;

  if (normalized.techLvls && Object.keys(normalized.techLvls).length > 0) {
    const compactTl: Record<string, number> = {};
    for (const [k, v] of Object.entries(normalized.techLvls)) {
      if (v > 1) compactTl[k] = v;
    }
    if (Object.keys(compactTl).length > 0) pack.tl = compactTl;
  }
  if (normalized.resources && Object.keys(normalized.resources.stock || {}).length > 0) {
    pack.rs = {
      s: normalized.resources.stock,
      c: normalized.resources.cap,
    };
  }
  if (
    normalized.finance &&
    (normalized.finance.debt > 0 || normalized.finance.interestPaid > 0 || normalized.finance.borrowedTotal > 0)
  ) {
    pack.fn = {
      d: normalized.finance.debt,
      i: normalized.finance.interestPaid,
      b: normalized.finance.borrowedTotal,
    };
  }
  if (
    normalized.diplomacy &&
    (Object.keys(normalized.diplomacy.relations || {}).length > 0 ||
      (normalized.diplomacy.treaties?.length || 0) > 0 ||
      normalized.diplomacy.rep !== 52 ||
      (normalized.diplomacy.jointVentures?.length || 0) > 0 ||
      Boolean(normalized.diplomacy.sanctionTarget))
  ) {
    pack.dp = {
      r: normalized.diplomacy.relations,
      t: normalized.diplomacy.treaties,
      rep: normalized.diplomacy.rep,
      ...(normalized.diplomacy.jointVentures?.length ? { j: normalized.diplomacy.jointVentures } : {}),
      ...(normalized.diplomacy.sanctionTarget ? { s: normalized.diplomacy.sanctionTarget } : {}),
    };
  }
  if (normalized.dynEvent) {
    pack.ev16 = {
      id: normalized.dynEvent.id,
      exp: normalized.dynEvent.expiresAt,
      ...(normalized.dynEvent.resolved ? { res: true } : {}),
    };
  }

  normalized.b = primaryB;
  normalized.tech = primaryTech;
  normalized.stk = primaryStk;
  normalized.gx = { ...normalized.gx, lvl: primaryLvl };

  const raw = stripUndefinedDeep(normalized) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of CLOUD_TOP_LEVEL_KEYS) {
    if (key in raw) {
      out[key] = raw[key];
    }
  }

  if (Object.keys(pack).length > 0) {
    const CHUNK_SIZE = 1500;
    const MAX_CHUNKS = 50;
    let json = JSON.stringify(pack);
    if (json.length > CHUNK_SIZE * MAX_CHUNKS) {
      delete pack.ch2;
      delete pack.uh;
      delete pack.dh;
      delete pack.wh;
      delete pack.qh;
      json = JSON.stringify(pack);
    }
    const chunks: string[] = [];
    for (let i = 0; i < json.length && chunks.length < MAX_CHUNKS; i += CHUNK_SIZE) {
      chunks.push(`v2:${json.slice(i, i + CHUNK_SIZE)}`);
    }
    out.provBudgetLog = chunks;
  }

  return out;
}

export function canUnlockTech(s: GameState, techId: string, nowMs = Date.now()): { ok: boolean; reason?: string; cost: number } {
  const def = TECH_TREE.find((t) => t.id === techId);
  if (!def) return { ok: false, reason: 'Unknown research', cost: 0 };
  const curLvl = getTechLevel(s, techId);
  const maxLvl = Math.max(1, def.maxLevel ?? 1);
  if (curLvl >= maxLvl) {
    return { ok: false, reason: maxLvl > 1 ? `Max Level ${maxLvl} mastered` : 'Already researched', cost: def.cost };
  }
  const curRank = Math.max(MIN_RANK, Math.floor(Number(s.rank) || MIN_RANK));
  if (def.reqRank && curRank < def.reqRank) {
    return { ok: false, reason: `Requires Rank ${def.reqRank}`, cost: def.cost };
  }
  if (def.reqLabBuilding && (s.b?.[def.reqLabBuilding] || 0) <= 0) {
    const labDef = BUILDINGS.find((b) => b.id === def.reqLabBuilding);
    return { ok: false, reason: `Requires ${labDef?.n || def.reqLabBuilding} facility`, cost: def.cost };
  }
  if (def.prereq?.length) {
    const missing = def.prereq.find((pid) => !hasTech(s, pid));
    if (missing) {
      const mDef = TECH_TREE.find((t) => t.id === missing);
      return { ok: false, reason: `Requires ${mDef?.n || missing}`, cost: def.cost };
    }
  }
  const ownedBldgs = totalBuildings(s);
  const lvlScale = Math.pow(1.65, curLvl);
  const cost = Math.max(1, Math.ceil(def.cost * lvlScale * getResearchCostMult(s, nowMs)));
  if (ownedBldgs < def.reqBuildings) {
    return { ok: false, reason: `Requires ${def.reqBuildings} total buildings (${ownedBldgs}/${def.reqBuildings})`, cost };
  }
  if (!Number.isFinite(s.cash) || s.cash < cost) {
    return { ok: false, reason: 'Not enough Coins', cost };
  }
  return { ok: true, cost };
}

export function applyUnlockTech(
  s: GameState,
  techId: string,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; cost: number; reason?: string } {
  const check = canUnlockTech(s, techId, nowMs);
  if (!check.ok) return { ok: false, state: s, cost: check.cost, reason: check.reason };
  const def = TECH_TREE.find((t) => t.id === techId);
  const nextLvl = Math.min(Math.max(1, def?.maxLevel ?? 1), getTechLevel(s, techId) + 1);
  return {
    ok: true,
    cost: check.cost,
    state: {
      ...s,
      cash: Math.max(0, s.cash - check.cost),
      tech: { ...(s.tech || {}), [techId]: 1 },
      techLvls: { ...(s.techLvls || {}), [techId]: nextLvl },
    },
  };
}

export function getInfraDecayMult(s: GameState): number {
  let mult = hasTech(s, 'smart_grid') ? 0.8 : 1;
  if (getPolicyStance(s, 'p_inf') === 2) mult *= 0.75;
  if (getPolicyStance(s, 'p_def') === 2) mult *= 0.85;
  return mult;
}

export function getTaxPoolCapSeconds(s: GameState): number {
  return hasTech(s, 'sovereign_vault') ? 2400 : 1800;
}

export function isProfileSubActive(
  profile: Pick<PlayerProfile, 'subTier' | 'subExp'> | null | undefined,
  nowMs = Date.now(),
): SubscriptionTierId | null {
  if (!profile?.subTier || !profile.subExp || profile.subExp <= nowMs) return null;
  return SUBSCRIPTIONS.some((x) => x.id === profile.subTier) ? (profile.subTier as SubscriptionTierId) : null;
}

export function getSubscriptionProjectSpeedMult(s: GameState, nowMs = Date.now()): number {
  const active = getActiveSubscription(s, nowMs);
  return active ? active.def.projectSpeedMult : 1;
}

export function getProjectSpeedMult(s: GameState, nowMs = Date.now()): number {
  const subMult = getSubscriptionProjectSpeedMult(s, nowMs);
  const techBonus = hasTech(s, 'civil_corps') ? 0.15 : 0;
  return subMult + techBonus;
}

export function calculateIncome(
  s: GameState,
  options?: { tradeTier?: number; nowMs?: number; ignoreTempBoosters?: boolean },
) {
  const snap = computeEconomySnapshot(s, options);
  const upkeep = snap.maintCost + snap.salaryCost;
  const upkeepRate = snap.buildingGross > 0 ? Math.min(0.45, upkeep / snap.buildingGross) : 0;
  const policySpendShare = snap.buildingGross > 0 ? Math.min(0.55, snap.welfareCost / snap.buildingGross) : 0;
  return {
    gross: snap.gross,
    net: snap.net,
    welfareCost: snap.welfareCost,
    upkeep,
    maintCost: snap.maintCost,
    salaryCost: snap.salaryCost,
    upkeepRate,
    policySpendShare,
    snapshot: snap,
  };
}

export function calculateGdp(s: GameState): number {
  return computeEconomySnapshot(s, { ignoreTempBoosters: true }).realGdp;
}

export function calculateOfflineRank(s: GameState): number {
  const g = calculateGdp(s);
  const me = s.country?.[0];
  return 1 + Object.keys(REAL_GDP_SCALED).filter((c) => c !== me && REAL_GDP_SCALED[c] > g).length;
}

export function calculateOnlineRank(
  s: GameState,
  uid: string,
  activeLeaderboard: PlayerProfile[],
): number {
  const g = calculateGdp(s);
  return 1 + activeLeaderboard.filter((p) => p.id !== uid && (p.gdp || 0) > g).length;
}

export function playerLevel(s: GameState): number {
  return 1 + Math.floor(Math.sqrt(calculateGdp(s) / 1000));
}

const POLLUTING_INDUSTRY_IDS = new Set([
  'textile_mills',
  'factories',
  'steel_plants',
  'small_factory',
  'mfg_plant',
  'auto_factory',
  'electronics_factory',
  'heavy_industry',
  'auto_mfg_plant',
  'steel_complex',
  'quarry_cement_works',
  'iron_ore_mine',
  'oil_extraction_rig',
  'petrochemical_refinery',
  'chemical_fertilizer_complex',
  'heavy_machinery_foundry',
  'automated_shipyard',
  'titanium_metallurgy_hub',
  'gas_peaker_turbine',
]);

export function targetHappiness(s: GameState, nowMs = Date.now()): number {
  const cleanEnergy =
    (s.b?.solar_plants || 0) +
    (s.b?.wind_farms || 0) +
    (s.b?.offshore_wind || 0) +
    (s.b?.adv_solar_station || 0) +
    (s.b?.hydro_plant || 0) +
    (s.b?.geothermal_plant || 0) +
    (s.b?.small_nuclear_smr || 0) +
    (s.b?.thorium_molten_reactor || 0) +
    (s.b?.fusion_tokamak_station || 0) +
    (s.b?.floating_solar_array || 0) +
    (s.b?.tidal_barrage_station || 0);
  const carbonOffset = cleanEnergy * 2.5 + (s.green || 0) * 0.5;
  const carbonPen = Math.max(0, (s.carbon || 0) - carbonOffset) * 0.5;
  const ecoTech = hasTech(s, 'eco_catalysis');
  const careTech = hasTech(s, 'healthcare_act');
  const techFlatHap = getTechHapBonus(s);

  let buildingHap = 0;
  let bPolicyHap = 0;
  for (const d of BUILDINGS) {
    const count = s.b?.[d.id] || 0;
    if (count <= 0) continue;
    let delta = d.hapDelta;
    if (ecoTech && POLLUTING_INDUSTRY_IDS.has(d.id) && delta < 0) {
      delta *= 0.7;
    }
    if (careTech && (d.id === 'hospitals' || d.id === 'adv_medical' || d.id === 'specialist_healthcare' || d.id === 'cancer_research_hospital')) {
      delta *= 1.25;
    }
    buildingHap += delta * count;
    const pol = getBuildingPolicyDef(getActiveBuildingPolicyId(s, d.id));
    bPolicyHap += pol.hapDelta * Math.min(3, count);
  }

  let policyHap = 0;
  const pTax = getPolicyStance(s, 'p_tax');
  if (pTax === 1) policyHap += 4;
  else if (pTax === 2) policyHap -= 5;
  const pInd = getPolicyStance(s, 'p_ind');
  if (pInd === 1) policyHap -= 3;
  else if (pInd === 2) policyHap += 3;
  if (getPolicyStance(s, 'p_agr') === 1) policyHap += 2;
  if (getPolicyStance(s, 'p_edu') === 2) policyHap += 5;
  const pHlth = getPolicyStance(s, 'p_hlth');
  if (pHlth === 1) policyHap += 5;
  else if (pHlth === 2) policyHap += 9;
  if (getPolicyStance(s, 'p_emp') === 2) policyHap += 6;
  const pNrg = getPolicyStance(s, 'p_nrg');
  if (pNrg === 1) policyHap += 5;
  else if (pNrg === 2) policyHap -= 5;
  if (getPolicyStance(s, 'p_ai') === 2) policyHap += 4;
  const pDef = getPolicyStance(s, 'p_def');
  if (pDef === 1) policyHap += 5;
  else if (pDef === 2) policyHap -= 3;
  if (getPolicyStance(s, 'p_env') === 1) policyHap += 6;
  const pUrb = getPolicyStance(s, 'p_urb');
  if (pUrb === 1) policyHap -= 3;
  else if (pUrb === 2) policyHap += 5;
  if (getPolicyStance(s, 'p_sci') === 2) policyHap += 3;
  const pTou = getPolicyStance(s, 'p_tou');
  if (pTou === 1) policyHap += 4;
  else if (pTou === 2) policyHap += 5;
  const pHou = getPolicyStance(s, 'p_hou');
  if (pHou === 1) policyHap += 5;
  else if (pHou === 2) policyHap -= 3;
  if (getPolicyStance(s, 'p_res') === 2) policyHap += 4;

  const empBoostBonus = isBoosterActive(s, 'emp_boost', nowMs) ? 4 : 0;
  const assetHapBonus = getDiamondAssetBonuses(s).hapBonus;

  return Math.max(
    5,
    Math.min(
      100,
      40 +
        techFlatHap +
        policyHap +
        empBoostBonus +
        assetHapBonus +
        gxHappinessMod(s) +
        s.wel * 1.45 +
        s.edu * 0.55 +
        (s.rd || 0) * 0.25 +
        (s.green || 0) * 0.65 +
        (s.transitSub || 0) * 0.5 -
        (s.tax - 20) * 1.75 -
        (s.fuel || 0) * 0.55 -
        (s.carbon || 0) * 0.35 -
        carbonPen -
        (s.luxury || 0) * 0.25 -
        (s.corp || 0) * 0.3 -
        (s.gst || 0) * 0.4 -
        (s.prop || 0) * 0.65 -
        (s.duty || 0) * 0.2 -
        (s.tourism || 0) * 0.15 -
        (s.digital || 0) * 0.2 -
        (s.wealth || 0) * 0.15 +
        buildingHap +
        bPolicyHap,
    ),
  );
}

export function targetApproval(s: GameState, nowMs = Date.now()): number {
  const baseHap = targetHappiness(s, nowMs);
  let policyAppr = 0;
  if (getPolicyStance(s, 'p_hlth') === 2) policyAppr += 4;
  if (getPolicyStance(s, 'p_fin') === 2) policyAppr += 3;
  const pDig = getPolicyStance(s, 'p_dig');
  if (pDig === 1 || pDig === 2) policyAppr += 4;
  if (getPolicyStance(s, 'p_tou') === 2) policyAppr += 3;
  return Math.max(5, Math.min(100, baseHap + policyAppr));
}

export function calculateTaxCollect(
  s: GameState,
  tradeTier = 0,
  nowMs = Date.now(),
): { collected: number; bonusApplied: boolean; bonusAmount: number; baseNet: number; poolAmount: number } {
  const pool = Math.floor(s.taxPool || 0);
  if (pool < 1) return { collected: 0, bonusApplied: false, bonusAmount: 0, baseNet: 0, poolAmount: 0 };

  const baseNet = Math.max(0, calculateIncome(s, { tradeTier, nowMs, ignoreTempBoosters: true }).net);
  const hasSurge = !!(s.activeFx && s.activeFx.taxSurge);
  if (!hasSurge) {
    return { collected: pool, bonusApplied: false, bonusAmount: 0, baseNet, poolAmount: pool };
  }

  const bonusAmount = Math.floor(Math.min(pool * 0.3, baseNet * 120));
  return {
    collected: pool + bonusAmount,
    bonusApplied: true,
    bonusAmount,
    baseNet,
    poolAmount: pool,
  };
}

export function rollTradePortExport(
  s: GameState,
  poolCollected: number,
  baseNet: number,
  rng: () => number = Math.random,
): { gems: number; sticker: StickerDef | null } {
  const ports = (s.b?.ports || 0) + (s.b?.airports || 0) + (s.b?.deep_sea_port || 0) + (s.b?.intl_airport_terminal || 0);
  if (ports <= 0 || poolCollected < Math.max(50, baseNet * 30)) {
    return { gems: 0, sticker: null };
  }
  const maxCap = hasTech(s, 'auto_customs') ? 0.33 : 0.25;
  const bonus = hasTech(s, 'auto_customs') ? 0.08 : 0;
  const chance = Math.min(maxCap, 0.05 + ports * 0.02 + bonus);
  if (rng() >= chance) {
    return { gems: 0, sticker: null };
  }
  if (rng() < 0.75) {
    return { gems: 1, sticker: null };
  }
  const rRoll = rng();
  const rarity: 1 | 2 | 3 = rRoll < 0.7 ? 1 : rRoll < 0.95 ? 2 : 3;
  const pool = STICKERS.filter((x) => x.r === rarity);
  const picked = pool[Math.floor(rng() * pool.length) % pool.length];
  return { gems: 0, sticker: picked };
}

export function canBuyBooster(
  s: GameState,
  booster: BoosterDef,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; cooldownLeftSec: number; usedToday?: number; dailyLimit?: number } {
  return canBuyBoosterV2(s, booster, nowMs);
}

export function applyBuyBooster(
  s: GameState,
  booster: BoosterDef,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; reason?: string } {
  return applyBuyBoosterV2(s, booster, nowMs);
}

export function canBuyRank(s: GameState, rankId: number): { ok: boolean; reason?: string } {
  const res = getRankEligibility(s, rankId);
  return res.eligible ? { ok: true } : { ok: false, reason: res.reason };
}

export function applyBuyRank(
  s: GameState,
  rankId: number,
): { ok: boolean; state: GameState; coinsAdded: number; gemsAdded: number; reason?: string } {
  const res = getRankEligibility(s, rankId);
  if (!res.eligible) return { ok: false, state: s, coinsAdded: 0, gemsAdded: 0, reason: res.reason };
  const coinsAdded = Math.max(0, Math.floor(Number(res.def.rewardCoins) || 0));
  const gemsAdded = Math.max(0, Math.floor(Number(res.def.rewardGems) || 0));
  const nextCash = Math.min(1e13, Math.max(0, s.cash - res.def.cost) + coinsAdded);
  const nextGems = Math.min(1e9, Math.max(0, Math.floor(s.gems || 0)) + gemsAdded);
  return {
    ok: true,
    coinsAdded,
    gemsAdded,
    state: {
      ...s,
      cash: nextCash,
      gems: nextGems,
      rank: rankId,
    },
  };
}

export function applyOfflineEarnings(
  s: GameState,
  nowMs = Date.now(),
  tradeTier = 0,
): { state: GameState; credited: number; awaySec: number; wasCapped: boolean } {
  let working = tickConstructionQueue(s, nowMs).state;
  working = tickUpgradeQueue(working, nowMs).state;
  working = tickResearchQueue(working, nowMs).state;
  working = tickIntlTradeContracts(working, nowMs).state;
  working = tickLocalMegaProjects(working, nowMs).state;

  const clampedT = !working.t || working.t > nowMs + 60_000 ? nowMs : working.t;
  const rawAway = Math.max(0, (nowMs - clampedT) / 1000);
  if (!Number.isFinite(rawAway) || rawAway <= 60 || totalBuildings(working) === 0) {
    return { state: { ...working, t: nowMs }, credited: 0, awaySec: 0, wasCapped: false };
  }

  const away = Math.min(OFFLINE_CAP_SEC, rawAway);
  const net = Math.max(0, calculateIncome(working, { tradeTier, nowMs, ignoreTempBoosters: true }).net);
  const credited = net * away * OFFLINE_RATE;
  if (net <= 0 || credited < 1) {
    return { state: { ...working, t: nowMs }, credited: 0, awaySec: away, wasCapped: rawAway > OFFLINE_CAP_SEC };
  }

  const capPool = net * getTaxPoolCapSeconds(working);
  const prevPool = working.taxPool || 0;
  const newPool = prevPool >= capPool ? prevPool : Math.min(capPool, prevPool + credited);

  return {
    state: { ...working, taxPool: newPool, t: nowMs },
    credited,
    awaySec: away,
    wasCapped: rawAway > OFFLINE_CAP_SEC,
  };
}

const KARACHI_YMD_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function dayKeyFor(ms: number): string {
  const safeMs = Number.isFinite(ms) ? ms : Date.now();
  return KARACHI_YMD_FORMATTER.format(new Date(safeMs));
}

export function weekKeyFor(nowMs: number): string {
  const ymd = KARACHI_YMD_FORMATTER.format(new Date(nowMs));
  const [y, m, d] = ymd.split('-').map((n) => Number(n));
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

const WEEKLY_PROMO_PCTS = [15, 20, 25, 30, 35] as const;

export function rollWeeklySubPromo(
  s: GameState,
  nowMs = Date.now(),
  rng: () => number = Math.random,
): { state: GameState; rolled: boolean; promo?: SubPromoState } {
  const wk = weekKeyFor(nowMs);
  if (s.subPromo?.weekKey === wk) {
    return { state: s, rolled: false, promo: s.subPromo };
  }
  const tierDef = SUBSCRIPTIONS[Math.floor(rng() * SUBSCRIPTIONS.length) % SUBSCRIPTIONS.length];
  const pct = WEEKLY_PROMO_PCTS[Math.floor(rng() * WEEKLY_PROMO_PCTS.length) % WEEKLY_PROMO_PCTS.length];
  const promo: SubPromoState = {
    weekKey: wk,
    tier: tierDef.id,
    pct,
    exp: nowMs + 72 * 3_600_000,
  };
  return {
    state: { ...s, subPromo: promo },
    rolled: true,
    promo,
  };
}

export function getSubscriptionPrice(
  s: GameState,
  subDef: SubscriptionDef,
  nowMs = Date.now(),
): {
  baseCost: number;
  finalCost: number;
  discountPct: number;
  promoActive: boolean;
  msLeft: number;
} {
  const p = s.subPromo;
  const promoActive = Boolean(
    p &&
      p.tier === subDef.id &&
      typeof p.pct === 'number' &&
      Number.isFinite(p.pct) &&
      p.pct >= 5 &&
      p.pct <= 40 &&
      typeof p.exp === 'number' &&
      p.exp > nowMs,
  );
  const discountPct = promoActive ? Math.round(p!.pct!) : 0;
  const finalCost = promoActive ? Math.max(1, Math.ceil(subDef.cost * (1 - discountPct / 100))) : subDef.cost;
  const msLeft = promoActive ? Math.max(0, (p!.exp || 0) - nowMs) : 0;
  return {
    baseCost: subDef.cost,
    finalCost,
    discountPct,
    promoActive,
    msLeft,
  };
}

function fmtSubStamp(ms: number): string {
  const safe = Number.isFinite(ms) ? ms : Date.now();
  return new Date(safe).toISOString().slice(5, 16).replace('T', ' ');
}

export function canBuySubscription(
  s: GameState,
  subDef: SubscriptionDef,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; shortfall?: number; required?: number; available?: number } {
  const active = getActiveSubscription(s, nowMs);
  if (active) {
    const curIdx = SUBSCRIPTIONS.findIndex((x) => x.id === active.def.id);
    const nextIdx = SUBSCRIPTIONS.findIndex((x) => x.id === subDef.id);
    if (nextIdx <= curIdx) {
      return {
        ok: false,
        reason: `${active.def.n} is already active`,
      };
    }
  }
  const { finalCost } = getSubscriptionPrice(s, subDef, nowMs);
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, Math.floor(s.cash)) : 0;
  if (!Number.isFinite(s.cash) || finalCost <= 0 || safeCash < finalCost) {
    const shortfall = Math.max(0, finalCost - safeCash);
    return {
      ok: false,
      reason: `Not enough Coins (need ${formatNumber(finalCost)} Coins, have ${formatNumber(safeCash)} Coins)`,
      shortfall,
      required: finalCost,
      available: safeCash,
    };
  }
  return { ok: true, required: finalCost, available: safeCash };
}

export function applyBuySubscription(
  s: GameState,
  subDef: SubscriptionDef,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; paidCost?: number; startAt?: number; exp?: number; reason?: string } {
  const check = canBuySubscription(s, subDef, nowMs);
  if (!check.ok) return { ok: false, state: s, reason: check.reason };
  const { finalCost } = getSubscriptionPrice(s, subDef, nowMs);
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  if (finalCost <= 0 || Math.floor(safeCash) < finalCost) {
    return {
      ok: false,
      state: s,
      reason: `Not enough Coins (need ${formatNumber(finalCost)} Coins, have ${formatNumber(Math.floor(safeCash))} Coins)`,
    };
  }
  const remainingCash = Math.max(0, safeCash - finalCost);
  const startAt = Math.max(0, Math.floor(nowMs));
  const exp = startAt + subDef.durMs;
  const existingLog = Array.isArray(s.gx?.log) ? s.gx.log : [];
  const txEntry = `Subscription: ${subDef.n} (${subDef.durationLabel}) · −${formatNumber(finalCost)} Coins · ${fmtSubStamp(startAt)}→${fmtSubStamp(exp)}`.slice(0, 120);

  return {
    ok: true,
    paidCost: finalCost,
    startAt,
    exp,
    state: {
      ...s,
      cash: remainingCash,
      gx: {
        ...s.gx,
        log: [txEntry, ...existingLog].slice(0, 8),
      },
      sub: {
        tier: subDef.id,
        exp,
        lastClaimDay: s.sub?.lastClaimDay || '',
      },
    },
  };
}

export function claimSubscriptionDaily(
  s: GameState,
  dayKey: string,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; cashAdded: number; gemsAdded: number; reason?: string } {
  const active = getActiveSubscription(s, nowMs);
  if (!active) {
    return { ok: false, state: s, cashAdded: 0, gemsAdded: 0, reason: 'No active subscription' };
  }
  if (active.lastClaimDay === dayKey) {
    return { ok: false, state: s, cashAdded: 0, gemsAdded: 0, reason: 'Already claimed today' };
  }
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  const safeGems = Number.isFinite(s.gems) ? Math.max(0, Math.floor(s.gems)) : 0;
  return {
    ok: true,
    cashAdded: active.def.dailyCash,
    gemsAdded: active.def.dailyGems,
    state: {
      ...s,
      cash: Math.min(1e13, safeCash + active.def.dailyCash),
      gems: Math.min(1e9, safeGems + active.def.dailyGems),
      sub: {
        ...s.sub,
        tier: active.def.id,
        exp: active.exp,
        lastClaimDay: dayKey,
      },
    },
  };
}

export function gxBuildDevelopment(s: GameState): number {
  let dev = 0;
  for (const d of BUILDINGS) {
    dev += d.inc * (s.b?.[d.id] || 0) * gxLevelMult(s, d.id);
  }
  return dev;
}

export function gxRepairUnit(s: GameState): number {
  return Math.max(2, gxBuildDevelopment(s) * 0.2);
}

export function gxRepairCost(s: GameState, key: string, full: boolean, nowMs = Date.now()): number {
  const item = [...GX_GOV_BUILDINGS, ...GX_ROADS].find((x) => x[0] === key);
  if (!item) return 0;
  const c = s.gx.cond[key] ?? 100;
  const add = full ? 100 - c : Math.min(20, 100 - c);
  if (add <= 0.01) return 0;
  const disc = getDevelopmentDiscount(s, nowMs);
  return Math.max(1, Math.ceil(add * gxRepairUnit(s) * item[3] * (1 - disc)));
}

export function gxUpgradeCost(s: GameState, buildingId: string, nowMs = Date.now()): number {
  const def = BUILDINGS.find((b) => b.id === buildingId);
  const count = s.b[buildingId] || 0;
  const lvl = s.gx.lvl[buildingId] || 1;
  if (!def || count < 1 || lvl >= MAX_BUILDING_LEVEL) return 0;
  return getBuildingUpgradeCostAndDur(s, def, lvl, count, nowMs).cost;
}

export function fuseSticker(
  s: GameState,
  stickerId: string,
  rng: () => number = Math.random,
): { ok: boolean; state: GameState; granted?: StickerDef; reason?: string } {
  const own = s.stk || {};
  if ((own[stickerId] || 0) < 3) {
    return { ok: false, state: s, reason: 'Need 3 duplicates to fuse' };
  }
  const src = STICKERS.find((x) => x.id === stickerId);
  if (!src) return { ok: false, state: s, reason: 'Invalid sticker' };

  const nextStk = { ...own, [stickerId]: own[stickerId] - 3 };
  if (nextStk[stickerId] <= 0) delete nextStk[stickerId];

  const targetRarity = Math.min(3, src.r + 1) as 1 | 2 | 3;
  const pool = STICKERS.filter((x) => x.r === targetRarity);
  const granted = pool[Math.floor(rng() * pool.length) % pool.length];
  nextStk[granted.id] = (nextStk[granted.id] || 0) + 1;
  const nextEqStk = s.eqStk === stickerId && !nextStk[stickerId] ? '' : s.eqStk;

  return {
    ok: true,
    granted,
    state: {
      ...s,
      stk: nextStk,
      eqStk: nextEqStk,
      fused: Math.min(1_000_000, Math.floor(s.fused || 0) + 1),
    },
  };
}

export function applyEquipSticker(
  s: GameState,
  stickerId: string,
): { ok: boolean; state: GameState; equippedId: string; reason?: string } {
  const trimmed = String(stickerId || '').trim();
  if (!trimmed || s.eqStk === trimmed) {
    return {
      ok: true,
      equippedId: '',
      state: { ...s, eqStk: '' },
    };
  }
  if (!VALID_STICKER_ID_SET.has(trimmed)) {
    return { ok: false, state: s, equippedId: s.eqStk || '', reason: 'Unknown sticker' };
  }
  if ((s.stk?.[trimmed] || 0) <= 0) {
    return { ok: false, state: s, equippedId: s.eqStk || '', reason: 'Sticker not owned yet' };
  }
  return {
    ok: true,
    equippedId: trimmed,
    state: { ...s, eqStk: trimmed },
  };
}

function pickStickerByRarity(rarity: 1 | 2 | 3, rng: () => number): StickerDef {
  const pool = STICKERS.filter((x) => x.r === rarity);
  return pool[Math.floor(rng() * pool.length) % pool.length];
}

export function buyStickerCrate(
  s: GameState,
  kind: 'cash' | 'gems',
  nowMs = Date.now(),
  rng: () => number = Math.random,
): { ok: boolean; state: GameState; granted: StickerDef[]; reason?: string } {
  const nextStk = { ...(s.stk || {}) };
  if (kind === 'cash') {
    const cdLeft = Math.max(0, Math.ceil(((s.crateCd || 0) - nowMs) / 1000));
    if (cdLeft > 0) {
      return { ok: false, state: s, granted: [], reason: `Crate cooldown: ${cdLeft}s` };
    }
    if (!Number.isFinite(s.cash) || s.cash < CRATE_COST_CASH) {
      return { ok: false, state: s, granted: [], reason: 'Not enough Coins' };
    }
    const r = rng();
    const rarity: 1 | 2 | 3 = r < 0.72 ? 1 : r < 0.96 ? 2 : 3;
    const picked = pickStickerByRarity(rarity, rng);
    nextStk[picked.id] = (nextStk[picked.id] || 0) + 1;
    return {
      ok: true,
      granted: [picked],
      state: {
        ...s,
        cash: Math.max(0, s.cash - CRATE_COST_CASH),
        crateCd: nowMs + CRATE_CD_MS,
        stk: nextStk,
      },
    };
  }

  if (!Number.isFinite(s.gems) || s.gems < CRATE_COST_GEMS) {
    return { ok: false, state: s, granted: [], reason: 'Not enough Diamonds' };
  }
  const firstRarity: 2 | 3 = rng() < 0.8 ? 2 : 3;
  const secondRoll = rng();
  const secondRarity: 1 | 2 | 3 = secondRoll < 0.55 ? 1 : secondRoll < 0.9 ? 2 : 3;
  const first = pickStickerByRarity(firstRarity, rng);
  const second = pickStickerByRarity(secondRarity, rng);
  nextStk[first.id] = (nextStk[first.id] || 0) + 1;
  nextStk[second.id] = (nextStk[second.id] || 0) + 1;

  return {
    ok: true,
    granted: [first, second],
    state: {
      ...s,
      gems: s.gems - CRATE_COST_GEMS,
      stk: nextStk,
    },
  };
}

export function applyBuyStickerWithDiamonds(
  s: GameState,
  stickerId: string,
): { ok: boolean; state: GameState; sticker?: StickerDef; cost: number; reason?: string } {
  const def = STICKERS.find((x) => x.id === stickerId);
  if (!def) return { ok: false, state: s, cost: 0, reason: 'Unknown sticker' };
  const ownedQty = Math.floor(Number(s.stk?.[stickerId]) || 0);
  if (ownedQty > 0) {
    return { ok: false, state: s, cost: 0, reason: 'Sticker already unlocked in collection' };
  }
  const cost = def.diamondPrice || (def.r === 1 ? 65 : def.r === 2 ? 145 : 295);
  if (!Number.isFinite(s.gems) || s.gems < cost) {
    return { ok: false, state: s, cost, reason: `Need ${cost} Diamonds` };
  }
  return {
    ok: true,
    sticker: def,
    cost,
    state: {
      ...s,
      gems: Math.max(0, Math.floor(s.gems) - cost),
      stk: { ...(s.stk || {}), [stickerId]: 1 },
    },
  };
}

export const MILESTONES: QuestDef[] = [
  { id: 'm_first_bldg', t: 'First Infrastructure (Own 5 buildings)', f: (s) => totalBuildings(s), g: 5, r: 1 },
  { id: 'm_cash_1m', t: 'Millionaire Economy (Reach ₨ 1M Real GDP)', f: (s) => calculateGdp(s), g: 1_000_000, r: 2 },
  { id: 'm_builders_25', t: 'Urban Planner (Own 25 buildings)', f: (s) => totalBuildings(s), g: 25, r: 3 },
  { id: 'm_infra_5', t: 'Master Architect (Upgrade any building to Lv 5)', f: (s) => Math.max(1, ...Object.values(s.gx?.lvl || { farms: 1 })), g: 5, r: 3 },
  { id: 'm_infra_25', t: 'Tier III Engineer (Upgrade any building to Lv 25)', f: (s) => Math.max(1, ...Object.values(s.gx?.lvl || { farms: 1 })), g: 25, r: 6 },
  { id: 'm_stk_10', t: 'Curator (Collect 10 unique stickers)', f: (s) => stickerUniqueCount(s), g: 10, r: 4 },
  { id: 'm_rank_4', t: 'Business Owner Charter (Reach Rank 4)', f: (s) => s.rank || MIN_RANK, g: 4, r: 5 },
  { id: 'm_tech_3', t: 'Chief Scientist (Unlock 3 Research techs)', f: (s) => techCount(s), g: 3, r: 4 },
  { id: 'm_gdp_100m', t: 'Economic Powerhouse (Real GDP ₨ 100M)', f: (s) => calculateGdp(s), g: 100_000_000, r: 6 },
  { id: 'm_rank_10', t: 'National Legend (Reach Rank 10)', f: (s) => s.rank || MIN_RANK, g: 10, r: 8 },
  { id: 'm_rank_15', t: 'Continental Hegemon (Reach Rank 15)', f: (s) => s.rank || MIN_RANK, g: 15, r: 10 },
  { id: 'm_rank_25', t: 'World Architect (Reach Rank 25)', f: (s) => s.rank || MIN_RANK, g: MAX_RANK, r: 25 },
];

export function claimMilestone(
  s: GameState,
  milestoneId: string,
): { ok: boolean; state: GameState; gemsAdded: number; reason?: string } {
  const m = MILESTONES.find((x) => x.id === milestoneId);
  if (!m) return { ok: false, state: s, gemsAdded: 0, reason: 'Unknown milestone' };
  if (s.milestones?.[milestoneId]) {
    return { ok: false, state: s, gemsAdded: 0, reason: 'Already claimed' };
  }
  if (m.f(s) < m.g) {
    return { ok: false, state: s, gemsAdded: 0, reason: 'Milestone not yet completed' };
  }
  const safeGems = Number.isFinite(s.gems) ? Math.max(0, Math.floor(s.gems)) : 0;
  return {
    ok: true,
    gemsAdded: m.r,
    state: {
      ...s,
      gems: Math.min(1e9, safeGems + m.r),
      milestones: { ...(s.milestones || {}), [milestoneId]: 1 },
    },
  };
}

export function sanitizeStats(
  raw: Partial<PlayerStats> | undefined,
  overrides?: Partial<PlayerStats>,
): PlayerStats {
  const capStat = (val: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(val) || 0)));
  const merged = {
    buildings: overrides?.buildings ?? raw?.buildings,
    completedTrades: overrides?.completedTrades ?? raw?.completedTrades,
    tradesSent: overrides?.tradesSent ?? raw?.tradesSent,
    tradesReceived: overrides?.tradesReceived ?? raw?.tradesReceived,
    cashTraded: overrides?.cashTraded ?? raw?.cashTraded,
    gemsTraded: overrides?.gemsTraded ?? raw?.gemsTraded,
  };
  return {
    buildings: capStat(merged.buildings, 1_000_000),
    completedTrades: capStat(merged.completedTrades, 1_000_000),
    tradesSent: capStat(merged.tradesSent, 1_000_000),
    tradesReceived: capStat(merged.tradesReceived, 1_000_000),
    cashTraded: capStat(merged.cashTraded, 1e14),
    gemsTraded: capStat(merged.gemsTraded, 1e12),
  };
}

export function tierOfCompletedTrades(count: number | undefined): number {
  const c = count || 0;
  return [1, 3, 8].filter((t) => c >= t).length;
}

export function getExecDecisionQuote(
  s: GameState,
  decisionId: string,
  tradeTier = 0,
  nowMs = Date.now(),
): { spendCost: number; gainCash: number; poolBonus: number } {
  const baseNet = Math.max(10, calculateIncome(s, { tradeTier, nowMs, ignoreTempBoosters: true }).net);
  const spendCost = Math.min(Math.floor(s.cash * 0.12), Math.max(250, Math.floor(baseNet * 35)));
  const gainCash = Math.max(200, Math.floor(baseNet * 48));
  const poolBonus = Math.max(150, Math.floor(baseNet * 30));
  void decisionId;
  return { spendCost, gainCash, poolBonus };
}

export function resolveExecutiveDecision(
  s: GameState,
  decisionId: string,
  choiceIdx: 0 | 1,
  tradeTier = 0,
  nowMs = Date.now(),
  rng: () => number = Math.random,
): { ok: boolean; state: GameState; summary: string } {
  const def = EXEC_DECISIONS.find((d) => d.id === decisionId);
  if (!def) return { ok: false, state: s, summary: '' };
  const quote = getExecDecisionQuote(s, decisionId, tradeTier, nowMs);

  if (choiceIdx === 1) {
    const hapPen = decisionId === 'grid_crunch' ? 5 : decisionId === 'green_bonds' ? 0 : 4;
    const apprPen = decisionId === 'grid_crunch' ? 4 : decisionId === 'green_bonds' ? 3 : 0;
    const next: GameState = {
      ...s,
      cash: Math.min(1e13, s.cash + quote.gainCash),
      hap: Math.max(0, s.hap - hapPen),
      appr: Math.max(0, s.appr - apprPen),
    };
    return {
      ok: true,
      state: next,
      summary: `${def.title}: +₨ ${formatNumber(quote.gainCash)}${hapPen ? `, −${hapPen}% Hap` : ''}${apprPen ? `, −${apprPen}% Appr` : ''}`,
    };
  }

  if (!Number.isFinite(s.cash) || s.cash < quote.spendCost) {
    return { ok: false, state: s, summary: 'Not enough Coins for this option' };
  }

  const next: GameState = { ...s, cash: Math.max(0, s.cash - quote.spendCost) };
  if (decisionId === 'tech_expo') {
    const safeGems = Number.isFinite(next.gems) ? Math.max(0, Math.floor(next.gems)) : 0;
    next.hap = Math.min(100, next.hap + 8);
    next.appr = Math.min(100, next.appr + 6);
    next.gems = Math.min(1e9, safeGems + 1);
    return { ok: true, state: next, summary: `Sponsored Tech Expo (−₨ ${formatNumber(quote.spendCost)}): +8% Hap, +6% Appr, +1 Diamond!` };
  }
  if (decisionId === 'grid_crunch') {
    next.hap = Math.min(100, next.hap + 6);
    const cond = { ...next.gx.cond };
    for (const k of Object.keys(cond)) cond[k] = Math.min(100, (cond[k] ?? 100) + 12);
    next.gx = { ...next.gx, cond };
    return { ok: true, state: next, summary: `Grid Subsidized (−₨ ${formatNumber(quote.spendCost)}): +6% Hap & +12% Infra condition!` };
  }
  if (decisionId === 'port_backlog') {
    next.appr = Math.min(100, next.appr + 5);
    const pool = STICKERS.filter((x) => x.r <= 2);
    const picked = pool[Math.floor(rng() * pool.length) % pool.length];
    next.stk = { ...(next.stk || {}), [picked.id]: (next.stk?.[picked.id] || 0) + 1 };
    return { ok: true, state: next, summary: `Customs Cleared (−₨ ${formatNumber(quote.spendCost)}): +5% Appr & ${picked.n} sticker!` };
  }
  if (decisionId === 'green_bonds') {
    next.hap = Math.min(100, next.hap + 10);
    const capPool = Math.max(0, calculateIncome(next, { tradeTier, nowMs, ignoreTempBoosters: true }).net * getTaxPoolCapSeconds(next));
    next.taxPool = next.taxPool >= capPool ? next.taxPool : Math.min(capPool, next.taxPool + quote.poolBonus);
    return { ok: true, state: next, summary: `Green Bonds (−₨ ${formatNumber(quote.spendCost)}): +10% Hap & +₨ ${formatNumber(quote.poolBonus)} Tax Pool!` };
  }
  next.hap = Math.min(100, next.hap + 7);
  next.appr = Math.min(100, next.appr + 7);
  return { ok: true, state: next, summary: `Heritage Week (−₨ ${formatNumber(quote.spendCost)}): +7% Hap & +7% Appr!` };
}

const HAPPY_BUILDINGS = new Set([
  'farms',
  'greenhouses',
  'solar_plants',
  'wind_farms',
  'training_centers',
  'hospitals',
  'universities',
  'shopping_centers',
  'eco_homes',
  'affordable_housing',
  'offshore_wind',
]);

export function getRecommendedBuildings(
  s: GameState,
  qty: 1 | 5 = 1,
  nowMs = Date.now(),
): Record<string, string> {
  const rec: Record<string, string> = {};
  const disc = getDevelopmentDiscount(s, nowMs);
  const snap = computeEconomySnapshot(s, { nowMs, ignoreTempBoosters: true });
  const scored = BUILDINGS.map((d) => {
    const count = s.b?.[d.id] || 0;
    const check = canStartBuildingConstruction(s, d.id, qty, nowMs);
    const cost = check.cost || bulkBuildingCost(d, count, qty, disc);
    const upgMult = gxLevelMult(s, d.id);
    const roi = (d.inc * upgMult * qty) / Math.max(1, cost);
    return { def: d, cost, roi, count, buildable: check.ok };
  });

  const buildable = scored.filter((x) => x.buildable).sort((a, b) => b.roi - a.roi);
  if (snap.energyRatio < 1.0) {
    const energyPick = buildable.find((x) => x.def.energy > 0);
    if (energyPick) rec[energyPick.def.id] = 'Power Grid Fix';
  }
  if (buildable.length > 0 && !rec[buildable[0].def.id]) {
    rec[buildable[0].def.id] = 'Best ROI';
  }

  if ((s.hap ?? 60) < 55) {
    const hapPick = buildable.find((x) => HAPPY_BUILDINGS.has(x.def.id) && !rec[x.def.id]);
    if (hapPick) rec[hapPick.def.id] = 'Happiness Fix';
  } else if ((s.b?.ports || 0) === 0) {
    const portPick = buildable.find((x) => x.def.id === 'ports' && !rec[x.def.id]);
    if (portPick) rec[portPick.def.id] = 'Trade & Diamonds';
  }

  if (Object.keys(rec).length === 0) {
    const nextGoal = scored.slice().sort((a, b) => a.cost - b.cost)[0];
    if (nextGoal) rec[nextGoal.def.id] = 'Next Target';
  }
  return rec;
}

export function getRecommendedBoosters(
  s: GameState,
  nowMs = Date.now(),
): Record<string, string> {
  const rec: Record<string, string> = {};
  const ready = BOOSTERS.filter((b) => canBuyBooster(s, b, nowMs).ok);
  if (ready.length === 0) return rec;

  if ((s.hap ?? 60) < 55) {
    const emp = ready.find((b) => b.id === 'emp_boost');
    if (emp) rec[emp.id] = 'Morale & Jobs';
  }

  if (getConstructionQueue(s, nowMs).length > 0) {
    const speed = ready.find((b) => b.id === 'build_speed_boost');
    if (speed) rec[speed.id] = 'Speed Queue';
  }

  const baseNet = Math.max(0, calculateIncome(s, { nowMs, ignoreTempBoosters: true }).net);
  if ((s.taxPool || 0) >= Math.max(500, baseNet * 45)) {
    const surge = ready.find((b) => b.id === 'tax_boost');
    if (surge) rec[surge.id] = 'Tax Cashout';
  }

  const incomeOrder = ['growth_boost', 'income_boost', 'prod_boost'];
  for (const id of incomeOrder) {
    const pick = ready.find((b) => b.id === id);
    if (pick && !rec[pick.id]) {
      rec[pick.id] = 'Top Output';
      break;
    }
  }
  return rec;
}

export function getRecommendedTech(s: GameState): Record<string, string> {
  const rec: Record<string, string> = {};
  const unlockable = TECH_TREE.filter((t) => canUnlockTech(s, t.id).ok);
  if (unlockable.length > 0) {
    if ((s.hap ?? 60) < 60) {
      const care = unlockable.find((t) => (t.hapBonus || 0) > 0);
      if (care) {
        rec[care.id] = 'Happiness Fix';
        return rec;
      }
    }
    rec[unlockable[0].id] = 'Unlock Now';
    return rec;
  }
  const nextLocked = TECH_TREE.find((t) => !hasTech(s, t.id));
  if (nextLocked) {
    rec[nextLocked.id] = 'Next Research';
  }
  return rec;
}

export function getRecommendedShopItems(
  s: GameState,
  nowMs = Date.now(),
): {
  nextRankId: number | null;
  rankReason: string;
  subTier: SubscriptionTierId | null;
  subReason: string;
} {
  let nextRankId: number | null = null;
  let rankReason = '';
  const candidateRank = Math.max(MIN_RANK, s.rank || MIN_RANK) + 1;
  if (candidateRank <= MAX_RANK && canBuyRank(s, candidateRank).ok) {
    nextRankId = candidateRank;
    rankReason = 'Ready Promote';
  }

  let subTier: SubscriptionTierId | null = null;
  let subReason = '';
  for (const sub of [...SUBSCRIPTIONS].reverse()) {
    const price = getSubscriptionPrice(s, sub, nowMs);
    const check = canBuySubscription(s, sub, nowMs);
    if (price.promoActive && check.ok) {
      subTier = sub.id;
      subReason = `Weekly Deal −${price.discountPct}%`;
      break;
    }
  }
  if (!subTier) {
    for (const sub of [...SUBSCRIPTIONS].reverse()) {
      if (canBuySubscription(s, sub, nowMs).ok) {
        subTier = sub.id;
        subReason = 'Best Value';
        break;
      }
    }
  }
  if (!subTier) {
    for (const sub of SUBSCRIPTIONS) {
      const price = getSubscriptionPrice(s, sub, nowMs);
      if (price.promoActive) {
        subTier = sub.id;
        subReason = `Weekly Deal −${price.discountPct}%`;
        break;
      }
    }
  }

  return { nextRankId, rankReason, subTier, subReason };
}

export function getRecommendedPolicyHint(
  s: GameState,
): { id: 'balanced' | 'revenue' | 'welfare' | null; reason: string } {
  const ti = taxInfo(s);
  const hap = targetHappiness(s);
  if (ti.ev > 0.12) {
    return { id: 'balanced', reason: 'Cuts High Evasion' };
  }
  if (hap < 50) {
    return { id: 'welfare', reason: 'Boosts Happiness' };
  }
  if (s.hap >= 75 && ti.ev === 0 && calculateGdp(s) >= 20_000 && s.tax < 20) {
    return { id: 'revenue', reason: 'Max Net Yield' };
  }
  return { id: null, reason: '' };
}

export function applyCollectTax(
  s: GameState,
  tradeTier = 0,
  nowMs = Date.now(),
  rng: () => number = Math.random,
): {
  ok: boolean;
  state: GameState;
  collected: number;
  bonusApplied: boolean;
  bonusAmount: number;
  portDrop: { gems: number; sticker: StickerDef | null };
} {
  const res = calculateTaxCollect(s, tradeTier, nowMs);
  if (res.collected < 1) {
    return {
      ok: false,
      state: s,
      collected: 0,
      bonusApplied: false,
      bonusAmount: 0,
      portDrop: { gems: 0, sticker: null },
    };
  }
  const portDrop = rollTradePortExport(s, res.poolAmount, res.baseNet, rng);
  const nextStk = portDrop.sticker
    ? { ...(s.stk || {}), [portDrop.sticker.id]: ((s.stk || {})[portDrop.sticker.id] || 0) + 1 }
    : s.stk;
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  const safeGems = Number.isFinite(s.gems) ? Math.max(0, Math.floor(s.gems)) : 0;
  return {
    ok: true,
    collected: res.collected,
    bonusApplied: res.bonusApplied,
    bonusAmount: res.bonusAmount,
    portDrop,
    state: {
      ...s,
      cash: Math.min(1e13, safeCash + res.collected),
      gems: Math.min(1e9, safeGems + portDrop.gems),
      stk: nextStk,
      taxPool: 0,
      activeFx: res.bonusApplied ? { ...(s.activeFx || {}), taxSurge: 0 } : s.activeFx,
    },
  };
}

export function applyActivateGemBoost(s: GameState): { ok: boolean; state: GameState; reason?: string } {
  if (s.boost > 0) return { ok: false, state: s, reason: 'Boost is already active' };
  if (!Number.isFinite(s.gems) || s.gems < 5) return { ok: false, state: s, reason: 'Need 5 diamonds' };
  return {
    ok: true,
    state: {
      ...s,
      gems: Math.max(0, Math.floor(s.gems) - 5),
      boost: 30,
    },
  };
}

export function applyBuyBuilding(
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
  return applyStartBuildingConstruction(s, id, qty, nowMs);
}

export function applyFixInfra(
  s: GameState,
  key: string,
  full: boolean,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; cost: number; reason?: string } {
  const cost = gxRepairCost(s, key, full, nowMs);
  if (cost <= 0) return { ok: false, state: s, cost: 0, reason: 'Already at full condition' };
  if (!Number.isFinite(s.cash) || s.cash < cost) return { ok: false, state: s, cost, reason: 'Not enough Coins' };
  return {
    ok: true,
    cost,
    state: {
      ...s,
      cash: Math.max(0, s.cash - cost),
      gx: {
        ...s.gx,
        cond: {
          ...s.gx.cond,
          [key]: full ? 100 : Math.min(100, (s.gx.cond[key] ?? 100) + 20),
        },
      },
    },
  };
}

export function applyUpgradeBuilding(
  s: GameState,
  id: string,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; newLevel: number; cost: number; reason?: string } {
  const def = BUILDINGS.find((b) => b.id === id);
  const lvl = s.gx?.lvl?.[id] || 1;
  const cost = gxUpgradeCost(s, id, nowMs);
  if (!def || lvl >= MAX_BUILDING_LEVEL || cost <= 0) {
    return { ok: false, state: s, newLevel: lvl, cost: 0, reason: 'Already at max level' };
  }
  if (!Number.isFinite(s.cash) || s.cash < cost) {
    return { ok: false, state: s, newLevel: lvl, cost, reason: 'Not enough Coins' };
  }
  const newLevel = lvl + 1;
  const histEntry: UpgradeHistoryEntry = {
    buildingId: id,
    name: def.n,
    fromLevel: lvl,
    toLevel: newLevel,
    cost,
    atMs: Math.floor(nowMs),
  };
  return {
    ok: true,
    newLevel,
    cost,
    state: {
      ...s,
      cash: Math.max(0, s.cash - cost),
      gx: {
        ...s.gx,
        lvl: { ...s.gx.lvl, [id]: newLevel },
      },
      upgHist: [histEntry, ...(Array.isArray(s.upgHist) ? s.upgHist : [])].slice(0, 40),
    },
  };
}

export function applyChangeGov(
  s: GameState,
  govId: string,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; govName?: string; reason?: string } {
  const g = GOVS.find((x) => x.id === govId);
  if (!g) return { ok: false, state: s, reason: 'Unknown government type' };
  if (s.gov === govId) return { ok: false, state: s, reason: 'Already active' };
  if ((s.govT || 0) + GOV_CHANGE_CD_MS > nowMs) return { ok: false, state: s, reason: 'Government change on cooldown' };
  if (!Number.isFinite(s.cash) || s.cash < g.cost) return { ok: false, state: s, reason: 'Not enough Coins' };
  return {
    ok: true,
    govName: g.n,
    state: {
      ...s,
      cash: Math.max(0, s.cash - g.cost),
      gov: govId,
      govT: nowMs,
    },
  };
}

export function getUnclaimedRewardsSummary(
  s: GameState,
  nowMs = Date.now(),
  rankPos = 999,
): {
  dailyReady: number;
  weeklyReady: number;
  questReady: number;
  achReady: number;
  challengeReady: number;
  total: number;
  readyQuestIds: string[];
} {
  const dailyView = getDailyRewardsView(s, nowMs);
  const dailyReady = dailyView.canClaimToday ? 1 : 0;

  const currentWeek = weekKeyFor(nowMs);
  const weeklyIndices = selectWeeklyMissionIds(currentWeek);
  const weeklyClaimed = s.weeklyDay === currentWeek ? s.weeklyClaimed || {} : {};
  let weeklyMissionReady = 0;
  for (const idx of weeklyIndices) {
    const m = WEEKLY_MISSIONS[idx];
    if (m && !weeklyClaimed[m.id] && m.f(s, { rank: rankPos }) >= m.g) {
      weeklyMissionReady += 1;
    }
  }
  const weeklyReady = weeklyMissionReady;
  const dqView = getDailyQuestsView(s, dayKeyFor(nowMs), rankPos);
  const questReady = dqView.readyCount;
  const readyQuestIds = dqView.quests.filter((q) => q.ready).map((q) => q.def.id);
  const achReady = computeReadyAchievementCount(s);
  const challengeReady = CHALLENGES_ALL.filter((c) => !s.challenges?.[c.id] && c.f(s) >= c.goal).length;

  return {
    dailyReady,
    weeklyReady,
    questReady,
    achReady,
    challengeReady,
    total: dailyReady + weeklyReady + questReady + achReady + challengeReady,
    readyQuestIds,
  };
}

export function selectWeeklyMissionIds(weekStr: string): number[] {
  let seed = 0;
  for (let i = 0; i < weekStr.length; i++) {
    seed = (seed * 37 + weekStr.charCodeAt(i)) >>> 0;
  }
  const idx = [...Array(WEEKLY_MISSIONS.length).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const j = Math.floor((seed / 4294967296) * (i + 1));
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }
  return idx.slice(0, 3);
}

export function rotateWeeklyMissionsIfNeeded(s: GameState, nowMs = Date.now()): GameState {
  const wk = weekKeyFor(nowMs);
  if (s.weeklyDay === wk) return s;
  return {
    ...s,
    weeklyDay: wk,
    weeklyClaimed: {},
  };
}

export function applyClaimWeeklyMission(
  s: GameState,
  missionId: string,
  weekKey: string,
  rankPos: number,
): { ok: boolean; state: GameState; gemsAdded: number; reason?: string } {
  const rotated = s.weeklyDay === weekKey ? s : { ...s, weeklyDay: weekKey, weeklyClaimed: {} };
  if (rotated.weeklyClaimed?.[missionId]) {
    return { ok: false, state: s, gemsAdded: 0, reason: 'Already claimed this week' };
  }
  const activeIndices = selectWeeklyMissionIds(weekKey);
  const mIdx = WEEKLY_MISSIONS.findIndex((m) => m.id === missionId);
  if (mIdx < 0 || !activeIndices.includes(mIdx)) {
    return { ok: false, state: s, gemsAdded: 0, reason: 'Weekly mission not active' };
  }
  const m = WEEKLY_MISSIONS[mIdx];
  if (m.f(rotated, { rank: rankPos }) < m.g) {
    return { ok: false, state: s, gemsAdded: 0, reason: 'Weekly goal not yet completed' };
  }
  const safeGems = Number.isFinite(rotated.gems) ? Math.max(0, Math.floor(rotated.gems)) : 0;
  return {
    ok: true,
    gemsAdded: m.r,
    state: {
      ...rotated,
      gems: Math.min(1e9, safeGems + m.r),
      weeklyDay: weekKey,
      weeklyClaimed: { ...(rotated.weeklyClaimed || {}), [missionId]: 1 },
    },
  };
}

export function applyClaimAchievement(
  s: GameState,
  achievementId: string,
): { ok: boolean; state: GameState; gemsAdded: number; cashAdded: number; reason?: string } {
  const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!def) return { ok: false, state: s, gemsAdded: 0, cashAdded: 0, reason: 'Unknown achievement' };
  if (s.achievements?.[achievementId]) {
    return { ok: false, state: s, gemsAdded: 0, cashAdded: 0, reason: 'Already unlocked & claimed' };
  }
  if (def.f(s) < def.goal) {
    return { ok: false, state: s, gemsAdded: 0, cashAdded: 0, reason: 'Achievement criteria not met' };
  }
  const safeCash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  const safeGems = Number.isFinite(s.gems) ? Math.max(0, Math.floor(s.gems)) : 0;
  return {
    ok: true,
    gemsAdded: def.rewardGems,
    cashAdded: def.rewardCash,
    state: {
      ...s,
      cash: Math.min(1e13, safeCash + def.rewardCash),
      gems: Math.min(1e9, safeGems + def.rewardGems),
      achievements: { ...(s.achievements || {}), [achievementId]: 1 },
    },
  };
}

export function computeLeaderboardMetrics(p: PlayerProfile) {
  const gdp = Math.max(0, Number(p.gdp) || 0);
  const cash = Math.max(0, Number(p.cash) || 0);
  const gems = Math.max(0, Number(p.gems) || 0);
  const bldgs = Math.max(0, Number(p.stats?.buildings) || 0);
  const trades = Math.max(0, Number(p.stats?.completedTrades) || 0);
  const cashTraded = Math.max(0, Number(p.stats?.cashTraded) || 0);
  const rankNum = Math.max(1, Number(p.rank) || 1);
  const levelNum = Math.max(1, Number(p.level) || 1);

  const overall = gdp;
  const netWorth = Math.floor(gdp * 0.72 + cash + gems * 12_500);
  const buildingDev = Math.floor(bldgs * 1_000 + levelNum * 120 + rankNum * 500);
  const production = Math.floor(gdp / 180 + bldgs * 15);
  const contribution = Math.floor(trades * 25_000 + cashTraded * 0.05 + bldgs * 800 + rankNum * 10_000);
  const weekly = Math.floor(gdp * 0.35 + bldgs * 18_000 + trades * 30_000);
  const monthly = Math.floor(gdp * 0.55 + cash * 0.25 + trades * 45_000);
  const natDev = Math.max(0, Math.round(Number(p.natDev) || (rankNum * 28 + Math.min(200, bldgs * 0.5) + levelNum * 2)));
  const population = Math.max(1, Math.round(Number(p.pop) || (48 + Math.round(bldgs * 1.4))));
  const researchProg = Math.max(0, Math.round(Number(p.techCount) || Math.floor(rankNum * 1.6)));
  const megaProjects = Math.max(0, Math.round(Number(p.megaCount) || Math.floor(rankNum / 4)));
  const tradePerf = Math.max(0, Math.round(Number(p.tradeScore) || (cashTraded + trades * 50_000)));
  const stability = Math.max(0, Math.min(100, Math.round((Number(p.stability) || Math.min(96, 55 + rankNum * 1.5)) * 10) / 10));

  return {
    overall,
    netWorth,
    buildingDev,
    production,
    contribution,
    weekly,
    monthly,
    natDev,
    population,
    researchProg,
    megaProjects,
    tradePerf,
    stability,
  };
}

export function sortLeaderboardProfiles(players: PlayerProfile[], mode: LeaderboardMode): PlayerProfile[] {
  const seen = new Set<string>();
  const deduped: PlayerProfile[] = [];
  for (const p of players) {
    if (!p?.id || seen.has(p.id)) continue;
    seen.add(p.id);
    deduped.push(p);
  }
  return deduped.sort((a, b) => {
    const scoreA = computeLeaderboardMetrics(a)[mode];
    const scoreB = computeLeaderboardMetrics(b)[mode];
    if (scoreB !== scoreA) return scoreB - scoreA;
    if ((b.gdp || 0) !== (a.gdp || 0)) return (b.gdp || 0) - (a.gdp || 0);
    return a.id.localeCompare(b.id);
  });
}

export interface EntryCheckGateInput {
  isFirebaseConfigured: boolean;
  authResolved: boolean;
  uid: string | null;
  gateOpen: boolean;
  completedEntryKey: string | null;
}

export function shouldRunOfflineEntryCheck(input: EntryCheckGateInput): boolean {
  if (input.gateOpen) return false;
  if (input.isFirebaseConfigured && !input.authResolved) return false;
  if (input.uid !== null) return false;
  if (input.completedEntryKey !== null) return false;
  return true;
}

export interface DailyOfflineCheckResult {
  state: GameState;
  changed: boolean;
  offlineCredited: number;
  offlineWasCapped: boolean;
  dailyGrant: {
    streak: number;
    cashAdded: number;
    gemsAdded: number;
    sticker: StickerDef | null;
  } | null;
  promoBannerText: string | null;
}

export function computeDailyAndOfflineChecks(
  baseState: GameState,
  tradeTier = 0,
  nowMs = Date.now(),
  rng: () => number = Math.random,
): DailyOfflineCheckResult {
  let working = { ...baseState };
  const todayKey = dayKeyFor(nowMs);
  const currentWeek = weekKeyFor(nowMs);
  let changed = false;

  if (working.weeklyDay !== currentWeek) {
    working = {
      ...working,
      weeklyDay: currentWeek,
      weeklyClaimed: {},
    };
    changed = true;
  }

  let promoBannerText: string | null = null;
  const promoRes = rollWeeklySubPromo(working, nowMs, rng);
  working = promoRes.state;
  if (promoRes.rolled && promoRes.promo) {
    changed = true;
    const promoTier = SUBSCRIPTIONS.find((x) => x.id === promoRes.promo!.tier);
    if (promoTier) {
      promoBannerText = `Weekly Flash Deal: −${promoRes.promo.pct}% off ${promoTier.n}!`;
    }
  }

  const off = applyOfflineEarnings(working, nowMs, tradeTier);
  working = off.state;
  if (off.credited >= 1) {
    changed = true;
  }

  let dailyGrant: DailyOfflineCheckResult['dailyGrant'] = null;
  const lastTs = working.lastDaily || 0;
  const lastKey = lastTs > 0 ? dayKeyFor(lastTs) : '';
  const alreadyClaimedToday =
    lastKey === todayKey || (lastTs > nowMs && lastTs - nowMs < 86_400_000);

  if (!alreadyClaimedToday) {
    const ydayKey = dayKeyFor(nowMs - 86_400_000);
    const nextStreak = lastKey === ydayKey ? Math.min(10_000, Math.floor(working.streak || 0) + 1) : 1;
    const rw = DAILY_REWARDS[Math.min(DAILY_REWARDS.length - 1, nextStreak - 1)];
    const nextStk = { ...(working.stk || {}) };
    let grantedSticker: StickerDef | null = null;
    if (rw.e) {
      const picked = STICKERS[Math.floor(rng() * STICKERS.length) % STICKERS.length];
      nextStk[picked.id] = (nextStk[picked.id] || 0) + 1;
      grantedSticker = picked;
    }
    const safeCash = Number.isFinite(working.cash) ? working.cash : 0;
    const safeGems = Number.isFinite(working.gems) ? Math.floor(working.gems) : 0;
    working = {
      ...working,
      cash: Math.min(1e13, Math.max(0, safeCash + rw.c)),
      gems: Math.min(1e9, Math.max(0, safeGems + rw.g)),
      stk: nextStk,
      streak: nextStreak,
      lastDaily: nowMs,
    };
    dailyGrant = {
      streak: nextStreak,
      cashAdded: rw.c,
      gemsAdded: rw.g,
      sticker: grantedSticker,
    };
    changed = true;
  }

  return {
    state: working,
    changed,
    offlineCredited: off.credited,
    offlineWasCapped: off.wasCapped,
    dailyGrant,
    promoBannerText,
  };
}

export {
  applyAdvanceLocalMegaProjectStage,
  applyChangePolicyStance,
  applyCommitFiscalReform,
  applyDemolishBuilding,
  applyEnactNationalDecision,
  applySetBuildingPolicy,
  applyStartBuildingConstruction,
  applyStartBuildingUpgrade,
  applyStartLocalMegaProject,
  applyStartResearch,
  applyStartTradeContract,
  buildingCost,
  bulkBuildingCost,
  canAdvanceLocalMegaProjectStage,
  canChangePolicyStance,
  canClaimLocalMegaProjectStageMilestone,
  canCommitFiscalReform,
  canDemolishBuilding,
  canEnactNationalDecision,
  canSetBuildingPolicy,
  canStartBuildingConstruction,
  canStartBuildingUpgrade,
  canStartLocalMegaProject,
  canStartResearch,
  canStartTradeContract,
  claimChallenge,
  claimLocalMegaProject,
  claimLocalMegaProjectStageMilestone,
  claimTradeMilestone,
  computeEconomySnapshot,
  currentWorldEvent,
  extractFiscalDraft,
  getActiveBuildingPolicyId,
  getActiveShopIncomeBooster,
  getActiveSubscription,
  getBoosterActivationInfo,
  getBuildingPolicyDef,
  getBuildingUpgradeCostAndDur,
  getBuildingUpgradeQuote,
  getBuildingUpgradeTier,
  getBuildSpeedMultiplier,
  getConstructionQueue,
  getDemolishRefund,
  getDevelopmentDiscount,
  getFiscalCommitCost,
  getFiscalCooldownLeftMs,
  getGovDefinition,
  getIntlTradeCapacity,
  getLocalMegaProjectStageQuote,
  getNationalDecisionCooldownLeftSec,
  getPolicyCooldownLeftMs,
  getPolicyStance,
  getRankEligibility,
  getResearchCostMult,
  getResearchSpeedMult,
  getTechBuildSpeedBonus,
  getTechEnergyBonus,
  getTechHapBonus,
  getTechIncomeMult,
  getTechLevel,
  getTechMaintReduction,
  getTechResearchSpeedBonus,
  getTechTradeBonus,
  getTradeGoodQuote,
  getUpgradeQueue,
  gxAverageCondition,
  gxHappinessMod,
  gxLevelMult,
  gxMultiplier,
  hasFiscalDraftChanges,
  hasTech,
  isBoosterActive,
  isBuildingPolicyAllowedFor,
  migrateRanksV2OneTime,
  presetToFiscalDraft,
  PROJECT_STAGES,
  stickerBonus,
  stickerUniqueCount,
  taxInfo,
  techCount,
  tickConstructionQueue,
  tickIntlTradeContracts,
  tickLocalMegaProjects,
  tickResearchQueue,
  tickUpgradeQueue,
  totalBuildings,
  unlockedAchievementCount,
  POLICY_BOUNDS,
  BUILDING_META_OVERRIDES_16,
  CHALLENGES_16,
  CHALLENGES_2_0,
  CHALLENGES_ALL,
  DIPLOMACY_PARTNERS_16,
  DIPLOMACY_TREATIES_16,
  DYNAMIC_EVENTS_16,
  PRODUCTION_CHAINS_16,
  RESOURCE_CATALOG_16,
  TECH_CATEGORY_META,
};

export * from './cosmetics';
export * from './rewards';
export { TZ };
