import {
  BOOSTERS,
  BUILDINGS,
  COUNTRIES,
  EV_LEN_MS,
  EV_SLOT_MS,
  GOV_DAY_SEC,
  GOVS,
  GX_GOV_BUILDINGS,
  GX_LEVEL_MULTS,
  GX_ROADS,
  GX_UPGRADE_MULTS,
  OFFLINE_CAP_SEC,
  OFFLINE_RATE,
  RANKS,
  REAL_GDP_SCALED,
  STICKERS,
  WORLD_EVENTS,
} from './constants';
import type {
  BoosterDef,
  BuildingDef,
  GameState,
  PlayerProfile,
  PlayerStats,
  QuestDef,
  StickerDef,
} from './types';

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
    cash: 80,
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
    questDay: '',
    questIds: [],
    rank: 0,
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
  };
}

export function cleanStickersMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, val] of Object.entries(raw as Record<string, unknown>)) {
    const n = Math.floor(Number(val));
    if (STICKERS.some((s) => s.id === k) && Number.isFinite(n) && n > 0) {
      out[k] = n;
    }
  }
  return out;
}

export function migrateState(raw: Partial<GameState> & Record<string, unknown>): GameState {
  const D = freshState();
  const s = Object.assign(D, raw || {}) as GameState & { loan?: unknown; deals?: unknown };

  // Remove deprecated Bank loan & deals fields
  delete s.loan;
  delete s.deals;

  if (!s.b || typeof s.b !== 'object') s.b = { ...D.b };
  for (const d of BUILDINGS) {
    const v = Math.floor(Number(s.b[d.id]));
    s.b[d.id] = Number.isFinite(v) && v >= 0 ? v : 0;
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

  const rawStk = s.stk as Record<string, unknown> | undefined;
  const legacyFused = rawStk && typeof rawStk.fused === 'number' ? rawStk.fused : 0;
  s.stk = cleanStickersMap(rawStk);
  s.fused = Number.isFinite(Number(s.fused)) ? Math.max(0, Math.floor(Number(s.fused))) : legacyFused;

  const numFields: Array<keyof GameState> = [
    'cash', 'gems', 'taxPool', 'day', 'tax', 'wel', 'hap', 'appr', 'pop',
    'boost', 'ev', 'edu', 'streak', 'lastDaily', 'fuel', 'carbon', 'luxury',
    'corp', 'gst', 'prop', 'duty', 'rank', 'govT',
  ];
  for (const k of numFields) {
    const v = Number(s[k]);
    (s as unknown as Record<string, number>)[k] = Number.isFinite(v) ? v : Number(D[k] || 0);
  }
  s.cash = Math.max(0, s.cash);
  s.gems = Math.max(0, Math.floor(s.gems));
  s.taxPool = Math.max(0, s.taxPool);
  s.rank = Math.max(0, Math.min(RANKS.length - 1, Math.floor(s.rank)));
  s.hap = Math.max(0, Math.min(100, s.hap));
  s.appr = Math.max(0, Math.min(100, s.appr));
  s.pop = Math.max(1, s.pop);

  const policyBounds: Record<string, [number, number]> = {
    tax: [5, 45], fuel: [0, 50], carbon: [0, 30], luxury: [0, 25],
    corp: [0, 30], gst: [0, 25], prop: [0, 15], duty: [0, 30],
    wel: [0, 50], edu: [0, 30],
  };
  for (const [k, [mn, mx]] of Object.entries(policyBounds)) {
    const val = Number((s as unknown as Record<string, number>)[k]) || 0;
    (s as unknown as Record<string, number>)[k] = Math.round(Math.max(mn, Math.min(mx, val)));
  }

  if (!s.claimed || typeof s.claimed !== 'object') s.claimed = {};
  if (!s.activeFx || typeof s.activeFx !== 'object') s.activeFx = {};
  // Migrate legacy activeFx (income15 / income3x / tax2x) safely to bounded fields
  const legacyFx = s.activeFx as Record<string, number>;
  if (legacyFx.income3x && legacyFx.income3x > Date.now()) {
    s.activeFx = {
      incomeBoostEnd: legacyFx.income3x,
      incomeBoostMult: 1.75,
      incomeBoostId: 'boom_surge',
      taxSurge: legacyFx.tax2x ? 1 : 0,
    };
  } else if (legacyFx.income15 && legacyFx.income15 > Date.now()) {
    s.activeFx = {
      incomeBoostEnd: legacyFx.income15,
      incomeBoostMult: 1.25,
      incomeBoostId: 'quick_profit',
      taxSurge: legacyFx.tax2x ? 1 : 0,
    };
  } else if (legacyFx.tax2x) {
    s.activeFx = { ...s.activeFx, taxSurge: 1 };
    delete legacyFx.tax2x;
  }

  if (!s.boosterCd || typeof s.boosterCd !== 'object') s.boosterCd = {};
  if (!Array.isArray(s.hist)) s.hist = [];
  s.hist = s.hist.filter((v) => typeof v === 'number' && Number.isFinite(v)).slice(-60);
  if (!Array.isArray(s.country) || !s.country[0]) s.country = D.country;
  if (!Array.isArray(s.questIds)) s.questIds = [];
  if (typeof s.questDay !== 'string') s.questDay = '';
  if (typeof s.gov !== 'string' || !GOVS.some((g) => g.id === s.gov)) s.gov = 'rep';
  if (typeof s.t !== 'number' || !Number.isFinite(s.t) || s.t < 0 || s.t > Date.now() + 60_000) {
    s.t = Date.now();
  }

  // Gov extension migration
  const gx = s.gx && typeof s.gx === 'object' ? s.gx : D.gx;
  const cond: Record<string, number> = {};
  for (const a of [...GX_GOV_BUILDINGS, ...GX_ROADS]) {
    const v = Number(gx.cond?.[a[0]]);
    cond[a[0]] = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 100;
  }
  const lvl: Record<string, number> = {};
  for (const d of BUILDINGS) {
    const v = Math.floor(Number(gx.lvl?.[d.id]));
    lvl[d.id] = v >= 1 && v <= 5 ? v : 1;
  }
  s.gx = {
    cond,
    lvl,
    acc: Math.min(GOV_DAY_SEC, Math.max(0, Number(gx.acc) || 0)),
    blk: Math.max(0, Math.floor(Number(gx.blk) || 0)),
    pb: Math.min(0.25, Math.max(0, Number(gx.pb) || 0)),
    ph: Math.min(10, Math.max(0, Number(gx.ph) || 0)),
    log: Array.isArray(gx.log) ? gx.log.slice(0, 8) : [],
    exp: gx.exp && typeof gx.exp === 'object' ? gx.exp : null,
  };

  return s;
}

export function cleanSavePayload(s: GameState): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
  delete clone.country;
  delete clone.deals;
  delete clone.loan;
  delete clone._lastBal;
  return clone;
}

export function totalBuildings(s: GameState): number {
  return Object.values(s.b || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

export function buildingCost(def: BuildingDef, level: number): number {
  return Math.ceil(def.cost * Math.pow(1.25, Math.max(0, level)));
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

export function taxInfo(s: GameState) {
  const t = s.tax || 20;
  const c = s.carbon || 0;
  const l = s.luxury || 0;
  const co = s.corp || 0;
  const g = s.gst || 0;
  const p = s.prop || 0;
  const d = s.duty || 0;
  const f = s.fuel || 0;

  const raw =
    0.4 +
    t / 50 +
    c / 100 +
    l / 120 +
    co / 150 +
    g / 70 +
    (p / 60) * Math.max(0.6, Math.min(2, (s.pop || 48) / 50)) +
    (d / 90) * (1 + (s.b.port || 0) * 0.08);
  const burden = t + co * 0.8 + g + p + d * 0.6 + c * 0.7 + l * 0.5 + f * 0.4;
  const ev = Math.max(0, Math.min(0.75, (burden - 30) / 70 + Math.max(0, 50 - (s.appr || 50)) / 400));
  return { mult: raw * (1 - ev), raw, burden, ev };
}

export function getActiveShopIncomeBooster(s: GameState, nowMs = Date.now()) {
  const fx = s.activeFx || {};
  if (fx.incomeBoostEnd && fx.incomeBoostEnd > nowMs && fx.incomeBoostMult && fx.incomeBoostMult > 1) {
    return {
      active: true,
      id: fx.incomeBoostId || '',
      mult: Math.min(1.75, fx.incomeBoostMult),
      leftSec: Math.ceil((fx.incomeBoostEnd - nowMs) / 1000),
    };
  }
  return { active: false, id: '', mult: 1, leftSec: 0 };
}

export function calculateIncome(
  s: GameState,
  options?: { tradeTier?: number; nowMs?: number; ignoreTempBoosters?: boolean },
) {
  const tradeTier = options?.tradeTier ?? 0;
  const nowMs = options?.nowMs ?? Date.now();
  const ignoreTemp = options?.ignoreTempBoosters ?? false;

  let gross = 2;
  for (const d of BUILDINGS) {
    gross += d.inc * (s.b[d.id] || 0) * gxLevelMult(s, d.id);
  }

  const worldEv = currentWorldEvent(nowMs);
  const evMult = worldEv ? worldEv.ev.m : 1;
  const gov = getGovDefinition(s);

  const shopBoost = ignoreTemp ? 1 : getActiveShopIncomeBooster(s, nowMs).mult;
  const gemBoost = ignoreTemp ? 1 : s.boost > 0 ? 2 : 1;
  // Cap combined temporary shop + gem boost multiplier to 2.5x so cash stays balanced
  const tempMult = Math.min(2.5, shopBoost * gemBoost);

  const permMult = gxMultiplier(s) * evMult * gov.inc;
  const taxMult = taxInfo(s).mult;

  const mult =
    taxMult *
    (1 + (s.hap - 50) / 200) *
    (1 + (s.b.pow || 0) * 0.015) *
    tempMult *
    (1 + s.edu / 200) *
    (1 + (s.fuel || 0) / 150) *
    (1 + tradeTier * 0.05) *
    (1 + stickerBonus(s)) *
    (1 + (s.rank || 0) * 0.02) *
    permMult;

  gross *= mult;
  // Cap upkeep rate at 35% so building large cities remains profitable
  const upkeepRate = Math.min(0.35, 0.03 + totalBuildings(s) * 0.0015);
  const upkeep = gross * upkeepRate;
  const welfareCost = gross * ((s.wel + s.edu) / 100) * 0.7 * gov.wel;
  const net = gross - welfareCost - upkeep;

  return { gross, net, welfareCost, upkeep };
}

export function calculateGdp(s: GameState): number {
  return Math.max(1, Math.floor(s.cash || 0));
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

export function targetHappiness(s: GameState): number {
  const carbonPen = Math.max(0, (s.carbon || 0) - (s.b.solar || 0) * 3) * 0.5;
  return Math.max(
    5,
    Math.min(
      100,
      40 +
        gxHappinessMod(s) +
        s.wel * 1.5 +
        s.edu * 0.6 -
        (s.tax - 20) * 1.8 -
        (s.fuel || 0) * 0.6 -
        (s.carbon || 0) * 0.4 -
        carbonPen -
        (s.luxury || 0) * 0.3 -
        (s.corp || 0) * 0.35 -
        (s.gst || 0) * 0.45 -
        (s.prop || 0) * 0.7 -
        (s.duty || 0) * 0.2 -
        (s.b.fact || 0) * 1.5 +
        (s.b.farm || 0) * 0.8 +
        (s.b.hosp || 0) * 1.2 +
        (s.b.stadium || 0) * 0.8 +
        (s.b.solar || 0) * 0.5 +
        (s.b.water || 0) * 0.7 +
        (s.b.univ || 0) * 0.4 +
        (s.b.space || 0) * 0.8 -
        (s.b.data || 0) * 0.3,
    ),
  );
}

export function calculateTaxCollect(
  s: GameState,
  tradeTier = 0,
  nowMs = Date.now(),
): { collected: number; bonusApplied: boolean; bonusAmount: number } {
  const pool = Math.floor(s.taxPool || 0);
  if (pool < 1) return { collected: 0, bonusApplied: false, bonusAmount: 0 };

  const hasSurge = !!(s.activeFx && s.activeFx.taxSurge);
  if (!hasSurge) {
    return { collected: pool, bonusApplied: false, bonusAmount: 0 };
  }

  // Strictly use unboosted base net income, capped at +35% of pool and max 2 min (120s) of base income
  const baseNet = Math.max(0, calculateIncome(s, { tradeTier, nowMs, ignoreTempBoosters: true }).net);
  const bonusAmount = Math.floor(Math.min(pool * 0.35, baseNet * 120));
  return {
    collected: pool + bonusAmount,
    bonusApplied: true,
    bonusAmount,
  };
}

export function canBuyBooster(
  s: GameState,
  booster: BoosterDef,
  nowMs = Date.now(),
): { ok: boolean; reason?: string; cooldownLeftSec: number } {
  const cdStart = s.boosterCd?.[booster.id] || 0;
  const cdEnd = cdStart + booster.cd * 1000;
  const cooldownLeftSec = Math.max(0, Math.ceil((cdEnd - nowMs) / 1000));
  if (cooldownLeftSec > 0) {
    return { ok: false, reason: `Cooldown: ${cooldownLeftSec}s`, cooldownLeftSec };
  }
  if (booster.isIncomeBoost && getActiveShopIncomeBooster(s, nowMs).active) {
    return { ok: false, reason: 'Another income booster is already active', cooldownLeftSec: 0 };
  }
  if (booster.fx === 'tax15x' && s.activeFx?.taxSurge) {
    return { ok: false, reason: 'Tax Surge is already active', cooldownLeftSec: 0 };
  }
  if (booster.fx === 'hap10' && s.hap >= 100) {
    return { ok: false, reason: 'Happiness is already at 100%', cooldownLeftSec: 0 };
  }
  if (s.cash < booster.cost) {
    return { ok: false, reason: 'Not enough cash', cooldownLeftSec: 0 };
  }
  return { ok: true, cooldownLeftSec: 0 };
}

export function applyBuyBooster(
  s: GameState,
  booster: BoosterDef,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; reason?: string } {
  const check = canBuyBooster(s, booster, nowMs);
  if (!check.ok) return { ok: false, state: s, reason: check.reason };

  const next: GameState = {
    ...s,
    cash: s.cash - booster.cost,
    boosterCd: { ...(s.boosterCd || {}), [booster.id]: nowMs },
    activeFx: { ...(s.activeFx || {}) },
  };

  if (booster.fx === 'income25') {
    next.activeFx.incomeBoostEnd = nowMs + booster.dur * 1000;
    next.activeFx.incomeBoostMult = 1.25;
    next.activeFx.incomeBoostId = booster.id;
  } else if (booster.fx === 'income50') {
    next.activeFx.incomeBoostEnd = nowMs + booster.dur * 1000;
    next.activeFx.incomeBoostMult = 1.5;
    next.activeFx.incomeBoostId = booster.id;
  } else if (booster.fx === 'income75') {
    next.activeFx.incomeBoostEnd = nowMs + booster.dur * 1000;
    next.activeFx.incomeBoostMult = 1.75;
    next.activeFx.incomeBoostId = booster.id;
  } else if (booster.fx === 'tax15x') {
    next.activeFx.taxSurge = 1;
  } else if (booster.fx === 'hap10') {
    next.hap = Math.min(100, next.hap + 10);
  }

  return { ok: true, state: next };
}

export function canBuyRank(s: GameState, rankId: number): { ok: boolean; reason?: string } {
  const r = RANKS[rankId];
  if (!r || !r.cost) return { ok: false, reason: 'Invalid rank' };
  if (rankId !== (s.rank || 0) + 1) return { ok: false, reason: 'Buy ranks in order' };
  if (s.cash < r.cost) return { ok: false, reason: 'Not enough cash' };
  return { ok: true };
}

export function applyBuyRank(s: GameState, rankId: number): { ok: boolean; state: GameState; reason?: string } {
  const check = canBuyRank(s, rankId);
  if (!check.ok) return { ok: false, state: s, reason: check.reason };
  const r = RANKS[rankId];
  return {
    ok: true,
    state: {
      ...s,
      cash: s.cash - r.cost,
      rank: rankId,
    },
  };
}

export function applyOfflineEarnings(
  s: GameState,
  nowMs = Date.now(),
  tradeTier = 0,
): { state: GameState; credited: number; awaySec: number; wasCapped: boolean } {
  const clampedT = !s.t || s.t > nowMs + 60_000 ? nowMs : s.t;
  const rawAway = Math.max(0, (nowMs - clampedT) / 1000);
  if (!Number.isFinite(rawAway) || rawAway <= 60 || totalBuildings(s) === 0) {
    return { state: { ...s, t: nowMs }, credited: 0, awaySec: 0, wasCapped: false };
  }

  const away = Math.min(OFFLINE_CAP_SEC, rawAway);
  const net = Math.max(0, calculateIncome(s, { tradeTier, nowMs }).net);
  const credited = net * away * OFFLINE_RATE;
  if (net <= 0 || credited < 1) {
    return { state: { ...s, t: nowMs }, credited: 0, awaySec: away, wasCapped: rawAway > OFFLINE_CAP_SEC };
  }

  const capPool = net * 1800;
  const prevPool = s.taxPool || 0;
  const newPool = prevPool >= capPool ? prevPool : Math.min(capPool, prevPool + credited);

  return {
    state: { ...s, taxPool: newPool, t: nowMs },
    credited,
    awaySec: away,
    wasCapped: rawAway > OFFLINE_CAP_SEC,
  };
}

export function gxRepairUnit(s: GameState): number {
  return Math.max(25, calculateIncome(s).gross * 5);
}

export function gxRepairCost(s: GameState, key: string, full: boolean): number {
  const item = [...GX_GOV_BUILDINGS, ...GX_ROADS].find((x) => x[0] === key);
  if (!item) return 0;
  const c = s.gx.cond[key] ?? 100;
  const add = full ? 100 - c : Math.min(20, 100 - c);
  return Math.ceil(add * gxRepairUnit(s) * item[3] * (full ? 1.25 : 1));
}

export function gxUpgradeCost(s: GameState, buildingId: string): number {
  const def = BUILDINGS.find((b) => b.id === buildingId);
  const count = s.b[buildingId] || 0;
  const lvl = s.gx.lvl[buildingId] || 1;
  if (!def || count < 1 || lvl >= 5) return 0;
  return Math.ceil(def.cost * count * GX_UPGRADE_MULTS[lvl - 1]);
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

  return {
    ok: true,
    granted,
    state: {
      ...s,
      stk: nextStk,
      fused: (s.fused || 0) + 1,
    },
  };
}

export const QUEST_POOL: QuestDef[] = [
  { id: 'b10', t: 'Own 10 buildings', f: (s) => totalBuildings(s), g: 10, r: 3 },
  { id: 'inc50', t: 'Reach 50 income/sec', f: (s) => calculateIncome(s).net, g: 50, r: 5 },
  { id: 'hap75', t: 'Happiness above 75', f: (s) => s.hap, g: 75, r: 4 },
  { id: 'tech3', t: 'Build 3 Tech Parks', f: (s) => s.b.tech || 0, g: 3, r: 8 },
  { id: 'inc500', t: 'Reach 500 income/sec', f: (s) => calculateIncome(s).net, g: 500, r: 15 },
  { id: 'rank1', t: 'Become #1 in GDP', f: (s, ctx) => ((ctx?.rank ?? calculateOfflineRank(s)) === 1 ? 1 : 0), g: 1, r: 25 },
  { id: 'stk10', t: 'Collect 10 unique stickers', f: (s) => stickerUniqueCount(s), g: 10, r: 8 },
  { id: 'fuse1', t: 'Fuse a sticker', f: (s) => s.fused || 0, g: 1, r: 6 },
  { id: 'streak7', t: 'Reach a 7-day login streak', f: (s) => s.streak || 0, g: 7, r: 12 },
  { id: 'cash10k', t: 'Hold ₨ 10,000 cash', f: (s) => s.cash, g: 10_000, r: 5 },
  { id: 'cash100k', t: 'Hold ₨ 100,000 cash', f: (s) => s.cash, g: 100_000, r: 12 },
  { id: 'mine3', t: 'Build 3 Mines', f: (s) => s.b.mine || 0, g: 3, r: 6 },
  { id: 'air1', t: 'Build an Airport', f: (s) => s.b.airport || 0, g: 1, r: 7 },
  { id: 'hosp2', t: 'Build 2 Hospitals', f: (s) => s.b.hosp || 0, g: 2, r: 6 },
  { id: 'stad2', t: 'Build 2 Stadiums', f: (s) => s.b.stadium || 0, g: 2, r: 6 },
  { id: 'appr80', t: 'Approval above 80', f: (s) => s.appr, g: 80, r: 6 },
  { id: 'b25', t: 'Own 25 buildings', f: (s) => totalBuildings(s), g: 25, r: 8 },
  { id: 'gems10', t: 'Hold 10 gems', f: (s) => s.gems, g: 10, r: 5 },
  { id: 'stk5', t: 'Collect 5 unique stickers', f: (s) => stickerUniqueCount(s), g: 5, r: 4 },
  { id: 'pop60', t: 'Population above 60M', f: (s) => s.pop, g: 60, r: 6 },
  { id: 'solar3', t: 'Build 3 Solar Farms', f: (s) => s.b.solar || 0, g: 3, r: 6 },
  { id: 'water2', t: 'Build 2 Water Works', f: (s) => s.b.water || 0, g: 2, r: 6 },
  { id: 'univ1', t: 'Build a University', f: (s) => s.b.univ || 0, g: 1, r: 8 },
  { id: 'rail2', t: 'Build 2 Railway Hubs', f: (s) => s.b.rail || 0, g: 2, r: 10 },
  { id: 'data1', t: 'Build a Data Center', f: (s) => s.b.data || 0, g: 1, r: 12 },
  { id: 'space1', t: 'Launch a Space Agency', f: (s) => s.b.space || 0, g: 1, r: 25 },
  { id: 'b40', t: 'Own 40 buildings', f: (s) => totalBuildings(s), g: 40, r: 14 },
  { id: 'b60', t: 'Own 60 buildings', f: (s) => totalBuildings(s), g: 60, r: 20 },
  { id: 'inc2000', t: 'Reach 2,000 income/sec', f: (s) => calculateIncome(s).net, g: 2000, r: 20 },
  { id: 'hap85', t: 'Happiness above 85', f: (s) => s.hap, g: 85, r: 8 },
  { id: 'appr90', t: 'Approval above 90', f: (s) => s.appr, g: 90, r: 10 },
  { id: 'cash1m', t: 'Hold ₨ 1,000,000 cash', f: (s) => s.cash, g: 1_000_000, r: 18 },
  { id: 'gems25', t: 'Hold 25 gems', f: (s) => s.gems, g: 25, r: 8 },
  { id: 'stk20', t: 'Collect 20 unique stickers', f: (s) => stickerUniqueCount(s), g: 20, r: 15 },
  { id: 'fuse3', t: 'Fuse 3 stickers', f: (s) => s.fused || 0, g: 3, r: 12 },
  { id: 'pop80', t: 'Population above 80M', f: (s) => s.pop, g: 80, r: 10 },
  { id: 'gdp10m', t: 'GDP above ₨ 10M', f: (s) => calculateGdp(s), g: 10_000_000, r: 20 },
  { id: 'bank2', t: 'Own 2 Central Banks', f: (s) => s.b.bank || 0, g: 2, r: 20 },
  { id: 'streak14', t: 'Reach a 14-day login streak', f: (s) => s.streak || 0, g: 14, r: 20 },
  { id: 'gdp25m', t: 'GDP above ₨ 25M', f: (s) => calculateGdp(s), g: 25_000_000, r: 30 },
  { id: 'rank1buy', t: 'Buy your first rank', f: (s) => s.rank || 0, g: 1, r: 10 },
  { id: 'rank3buy', t: 'Reach Gold Emperor', f: (s) => s.rank || 0, g: 3, r: 20 },
  { id: 'rank6buy', t: 'Reach Cosmic Overlord', f: (s) => s.rank || 0, g: 6, r: 50 },
  { id: 'boost1', t: 'Use a booster', f: (s) => Object.keys(s.boosterCd || {}).length, g: 1, r: 5 },
  { id: 'boost3', t: 'Use 3 different boosters', f: (s) => Object.keys(s.boosterCd || {}).length, g: 3, r: 10 },
];

export function selectDailyQuestIds(dateStr: string): number[] {
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = (seed * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const idx = [...Array(QUEST_POOL.length).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = idx[i];
    idx[i] = idx[j];
    idx[j] = tmp;
  }
  return idx.slice(0, 3);
}

export function sanitizeStats(
  raw: Partial<PlayerStats> | undefined,
  overrides?: Partial<PlayerStats>,
): PlayerStats {
  const base: PlayerStats = {
    buildings: Math.max(0, Math.floor(Number(raw?.buildings) || 0)),
    completedTrades: Math.max(0, Math.floor(Number(raw?.completedTrades) || 0)),
    tradesSent: Math.max(0, Math.floor(Number(raw?.tradesSent) || 0)),
    tradesReceived: Math.max(0, Math.floor(Number(raw?.tradesReceived) || 0)),
    cashTraded: Math.max(0, Math.floor(Number(raw?.cashTraded) || 0)),
    gemsTraded: Math.max(0, Math.floor(Number(raw?.gemsTraded) || 0)),
  };
  if (overrides) {
    Object.assign(base, overrides);
  }
  return base;
}

export function tierOfCompletedTrades(count: number | undefined): number {
  const c = count || 0;
  return [1, 3, 8].filter((t) => c >= t).length;
}
