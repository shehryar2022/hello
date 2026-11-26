import {
  BOOSTERS,
  BUILDINGS,
  COUNTRIES,
  CRATE_CD_MS,
  CRATE_COST_CASH,
  CRATE_COST_GEMS,
  EV_LEN_MS,
  EV_SLOT_MS,
  EXEC_DECISIONS,
  GOV_CHANGE_CD_MS,
  GOV_DAY_SEC,
  GOVS,
  GX_GOV_BUILDINGS,
  GX_LEVEL_MULTS,
  GX_ROADS,
  GX_UPGRADE_MULTS,
  MAX_RANK,
  OFFLINE_CAP_SEC,
  OFFLINE_RATE,
  POLICY_PRESETS,
  RANKS,
  REAL_GDP_SCALED,
  STICKERS,
  SUBSCRIPTIONS,
  TECH_TREE,
  TZ,
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
  SubPromoState,
  SubscriptionDef,
  SubscriptionTierId,
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
    milestones: {},
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
    sub: {},
    subPromo: {},
    tech: {},
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

export function cleanMilestonesMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, val] of Object.entries(raw as Record<string, unknown>)) {
    if (MILESTONES.some((m) => m.id === k) && Number(val) > 0) {
      out[k] = 1;
    }
  }
  return out;
}

export function cleanTechMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, val] of Object.entries(raw as Record<string, unknown>)) {
    if (TECH_TREE.some((t) => t.id === k) && Number(val) > 0) {
      out[k] = 1;
    }
  }
  return out;
}

export function migrateState(raw: Partial<GameState> & Record<string, unknown>): GameState {
  const D = freshState();
  const s = Object.assign(D, raw || {}) as GameState & {
    loan?: unknown;
    deals?: unknown;
    avHist?: unknown;
    avs?: unknown;
  };

  // Remove deprecated Bank loan, deals & legacy avatar fields
  delete s.loan;
  delete s.deals;
  delete s.avHist;
  delete s.avs;

  const rawB = s.b && typeof s.b === 'object' ? (s.b as Record<string, unknown>) : {};
  const cleanB: Record<string, number> = {};
  for (const d of BUILDINGS) {
    const v = Math.floor(Number(rawB[d.id]));
    cleanB[d.id] = Number.isFinite(v) && v >= 0 ? Math.min(10_000, v) : 0;
  }
  s.b = cleanB;

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
  const legacyFused =
    rawStk && Number.isFinite(Number(rawStk.fused))
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
  const now = Date.now();
  s.cash = Math.min(1e13, Math.max(0, s.cash));
  s.gems = Math.min(1e9, Math.max(0, Math.floor(s.gems)));
  s.taxPool = Math.min(1e13, Math.max(0, s.taxPool));
  s.boost = Math.max(0, Math.min(30, s.boost));
  s.rank = Math.max(0, Math.min(MAX_RANK, Math.floor(s.rank)));
  s.streak = Math.max(0, Math.min(10_000, Math.floor(s.streak)));
  s.hap = Math.max(0, Math.min(100, s.hap));
  s.appr = Math.max(0, Math.min(100, s.appr));
  s.pop = Math.max(1, Math.min(100_000, s.pop));
  // Allow up to +24h tolerance so legitimate server clock offsets never get wiped
  if ((s.lastDaily || 0) > now + 86_400_000 || (s.lastDaily || 0) < 0) s.lastDaily = 0;
  if ((s.govT || 0) > now + 86_400_000 || (s.govT || 0) < 0) s.govT = 0;
  s.crateCd = Math.max(0, Math.min(now + CRATE_CD_MS + 86_400_000, Math.floor(s.crateCd || 0)));

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
  s.milestones = cleanMilestonesMap(s.milestones);
  s.tech = cleanTechMap(s.tech);
  if (!s.activeFx || typeof s.activeFx !== 'object') s.activeFx = {};
  // Migrate legacy activeFx (income15 / income3x / tax2x) safely to bounded fields
  const legacyFx = s.activeFx as Record<string, number>;
  if (legacyFx.income3x && legacyFx.income3x > now) {
    s.activeFx = {
      incomeBoostEnd: Math.min(legacyFx.income3x, now + 250_000),
      incomeBoostMult: 1.75,
      incomeBoostId: 'boom_surge',
      taxSurge: legacyFx.tax2x ? 1 : 0,
    };
  } else if (legacyFx.income15 && legacyFx.income15 > now) {
    s.activeFx = {
      incomeBoostEnd: Math.min(legacyFx.income15, now + 250_000),
      incomeBoostMult: 1.25,
      incomeBoostId: 'quick_profit',
      taxSurge: legacyFx.tax2x ? 1 : 0,
    };
  } else {
    const nextFx: GameState['activeFx'] = {};
    const endVal = Number(s.activeFx.incomeBoostEnd);
    const multVal = Number(s.activeFx.incomeBoostMult);
    if (Number.isFinite(endVal) && endVal > now && Number.isFinite(multVal) && multVal > 1) {
      nextFx.incomeBoostEnd = Math.min(endVal, now + 250_000);
      nextFx.incomeBoostMult = Math.max(1, Math.min(1.75, multVal));
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
    for (const b of BOOSTERS) {
      const v = Number(s.boosterCd[b.id]);
      if (Number.isFinite(v) && v >= 0) {
        cleanCd[b.id] = Math.min(now + 86_400_000, Math.floor(v));
      }
    }
    s.boosterCd = cleanCd;
  }
  if (!Array.isArray(s.hist)) s.hist = [];
  s.hist = s.hist.filter((v) => typeof v === 'number' && Number.isFinite(v)).slice(-60);
  if (!Array.isArray(s.country) || !s.country[0]) s.country = D.country;
  if (!Array.isArray(s.questIds)) s.questIds = [];
  if (typeof s.questDay !== 'string') s.questDay = '';
  if (typeof s.gov !== 'string' || !GOVS.some((g) => g.id === s.gov)) s.gov = 'rep';
  if (typeof s.t !== 'number' || !Number.isFinite(s.t) || s.t < 0 || s.t > now + 86_400_000) {
    s.t = now;
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
  const rawExp = gx.exp && typeof gx.exp === 'object' ? (gx.exp as unknown as Record<string, unknown>) : null;
  const cleanExp = rawExp
    ? {
        sal: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.sal) || 0))),
        el: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.el) || 0))),
        inf: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.inf) || 0))),
        total: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.total) || 0))),
        paid: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.paid) || 0))),
        n: Math.max(0, Math.min(1_000_000, Math.floor(Number(rawExp.n) || 0))),
        t: Math.max(0, Math.min(1e13, Math.floor(Number(rawExp.t) || 0))),
      }
    : null;
  s.gx = {
    cond,
    lvl,
    acc: Math.min(GOV_DAY_SEC, Math.max(0, Number(gx.acc) || 0)),
    blk: Math.max(0, Math.floor(Number(gx.blk) || 0)),
    pb: Math.min(0.25, Math.max(0, Number(gx.pb) || 0)),
    ph: Math.min(10, Math.max(0, Number(gx.ph) || 0)),
    log: Array.isArray(gx.log)
      ? gx.log.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 120)).slice(0, 8)
      : [],
    exp: cleanExp,
  };

  // Subscription migration & sanitization
  const rawSub = s.sub && typeof s.sub === 'object' ? s.sub : {};
  const subDef = SUBSCRIPTIONS.find((x) => x.id === rawSub.tier);
  const subExp = Number(rawSub.exp);
  if (subDef && Number.isFinite(subExp) && subExp > 0) {
    const clampedExp = Math.min(subExp, now + 31 * 86_400_000);
    s.sub = {
      tier: subDef.id,
      exp: clampedExp,
      lastClaimDay: typeof rawSub.lastClaimDay === 'string' ? rawSub.lastClaimDay.slice(0, 16) : '',
    };
  } else {
    s.sub = {};
  }

  // Weekly subscription promo sanitization
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
      pct: Math.round(promoPct),
      exp: Math.min(promoExp, now + 8 * 86_400_000),
    };
  } else {
    s.subPromo = {};
  }

  return s;
}

function stripUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) return 0;
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

const ALLOWED_SAVE_KEYS = new Set(Object.keys(freshState()).filter((k) => k !== 'country'));

export function cleanSavePayload(s: GameState): Record<string, unknown> {
  const normalized = migrateState({ ...(s as GameState & Record<string, unknown>) });
  normalized.cash = Math.min(1e13, Math.max(0, Number(normalized.cash) || 0));
  normalized.gems = Math.min(1e9, Math.max(0, Math.floor(Number(normalized.gems) || 0)));
  normalized.taxPool = Math.min(1e13, Math.max(0, Number(normalized.taxPool) || 0));
  normalized.rank = Math.max(0, Math.min(MAX_RANK, Math.floor(Number(normalized.rank) || 0)));
  normalized.fused = Math.max(0, Math.min(1_000_000, Math.floor(Number(normalized.fused) || 0)));
  normalized.streak = Math.max(0, Math.min(10_000, Math.floor(Number(normalized.streak) || 0)));
  normalized.day = Math.max(0, Math.min(100_000_000, Number(normalized.day) || 0));
  normalized.ev = Math.max(0, Math.min(1000, Number(normalized.ev) || 0));
  normalized.crateCd = Math.max(0, Math.min(1e13, Number(normalized.crateCd) || 0));
  normalized.t = Math.max(0, Math.min(1e13, Number(normalized.t) || 0));
  normalized.lastDaily = Math.max(0, Math.min(1e13, Number(normalized.lastDaily) || 0));
  normalized.govT = Math.max(0, Math.min(1e13, Number(normalized.govT) || 0));
  normalized.questIds = Array.isArray(normalized.questIds)
    ? normalized.questIds.filter((x) => Number.isFinite(x)).slice(0, 10)
    : [];
  normalized.questDay = typeof normalized.questDay === 'string' ? normalized.questDay.slice(0, 32) : '';

  const raw = stripUndefinedDeep(normalized) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of ALLOWED_SAVE_KEYS) {
    if (key in raw) {
      out[key] = raw[key];
    }
  }
  return out;
}

export function totalBuildings(s: GameState): number {
  return Object.values(s.b || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
}

export function buildingCost(def: BuildingDef, level: number, discountRate = 0): number {
  const raw = def.cost * Math.pow(1.25, Math.max(0, level));
  const clampedDisc = Math.max(0, Math.min(0.5, discountRate));
  return Math.max(1, Math.ceil(raw * (1 - clampedDisc)));
}

export function bulkBuildingCost(def: BuildingDef, startCount: number, qty: number, discountRate = 0): number {
  const count = Math.max(1, Math.min(50, Math.floor(qty)));
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += buildingCost(def, startCount + i, discountRate);
  }
  return total;
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
  const tr = s.tourism || 0;
  const dg = s.digital || 0;
  const w = s.wealth || 0;

  const raw =
    0.4 +
    t / 50 +
    c / 100 +
    l / 120 +
    (co / 150) * (1 + (s.b.stock || 0) * 0.05) +
    g / 70 +
    (p / 60) * Math.max(0.6, Math.min(2, (s.pop || 48) / 50)) +
    (d / 90) * (1 + ((s.b.port || 0) + (s.b.logistics || 0)) * 0.08) +
    (tr / 85) * (1 + ((s.b.airport || 0) + (s.b.stadium || 0)) * 0.06) +
    (dg / 90) * (1 + ((s.b.tech || 0) + (s.b.data || 0) + (s.b.semicon || 0)) * 0.05) +
    (w / 105) * (1 + (s.b.bank || 0) * 0.04);
  const burden =
    t + co * 0.8 + g + p + d * 0.6 + c * 0.7 + l * 0.5 + f * 0.4 + tr * 0.4 + dg * 0.5 + w * 0.35;
  const ev = Math.max(0, Math.min(0.75, (burden - 30) / 70 + Math.max(0, 50 - (s.appr ?? 50)) / 400));
  return { mult: raw * (1 - ev), raw, burden, ev };
}

export function hasTech(s: GameState, techId: string): boolean {
  return Boolean(s.tech && s.tech[techId] > 0);
}

export function techCount(s: GameState): number {
  return Object.keys(s.tech || {}).filter((id) => TECH_TREE.some((t) => t.id === id) && (s.tech?.[id] || 0) > 0).length;
}

export function canUnlockTech(s: GameState, techId: string): { ok: boolean; reason?: string } {
  const def = TECH_TREE.find((t) => t.id === techId);
  if (!def) return { ok: false, reason: 'Unknown doctrine' };
  if (hasTech(s, techId)) return { ok: false, reason: 'Already researched' };
  const ownedBldgs = totalBuildings(s);
  if (ownedBldgs < def.reqBuildings) {
    return { ok: false, reason: `Requires ${def.reqBuildings} total buildings (${ownedBldgs}/${def.reqBuildings})` };
  }
  if (s.cash < def.cost) {
    return { ok: false, reason: 'Not enough cash' };
  }
  return { ok: true };
}

export function applyUnlockTech(
  s: GameState,
  techId: string,
): { ok: boolean; state: GameState; reason?: string } {
  const check = canUnlockTech(s, techId);
  if (!check.ok) return { ok: false, state: s, reason: check.reason };
  const def = TECH_TREE.find((t) => t.id === techId)!;
  return {
    ok: true,
    state: {
      ...s,
      cash: s.cash - def.cost,
      tech: { ...(s.tech || {}), [techId]: 1 },
    },
  };
}

export function getTechIncomeMult(s: GameState): number {
  let bonus = 0;
  if (hasTech(s, 'smart_grid')) bonus += 0.04;
  if (hasTech(s, 'auto_customs')) bonus += 0.03;
  if (hasTech(s, 'sovereign_vault')) bonus += 0.04;
  return 1 + bonus;
}

export function getInfraDecayMult(s: GameState): number {
  return hasTech(s, 'smart_grid') ? 0.8 : 1;
}

export function getTaxPoolCapSeconds(s: GameState): number {
  return hasTech(s, 'sovereign_vault') ? 2400 : 1800;
}

export function getActiveSubscription(s: GameState, nowMs = Date.now()) {
  const sub = s.sub;
  if (!sub?.tier || !sub.exp || sub.exp <= nowMs) return null;
  const def = SUBSCRIPTIONS.find((x) => x.id === sub.tier);
  if (!def) return null;
  return {
    def,
    exp: sub.exp,
    leftMs: Math.max(0, sub.exp - nowMs),
    lastClaimDay: sub.lastClaimDay || '',
  };
}

export function isProfileSubActive(
  profile: Pick<PlayerProfile, 'subTier' | 'subExp'> | null | undefined,
  nowMs = Date.now(),
): SubscriptionTierId | null {
  if (!profile?.subTier || !profile.subExp || profile.subExp <= nowMs) return null;
  return SUBSCRIPTIONS.some((x) => x.id === profile.subTier) ? (profile.subTier as SubscriptionTierId) : null;
}

export function getDevelopmentDiscount(s: GameState, nowMs = Date.now()): number {
  const active = getActiveSubscription(s, nowMs);
  const subDisc = active ? active.def.discountRate : 0;
  const techDisc = hasTech(s, 'civil_corps') ? 0.05 : 0;
  return Math.min(0.35, subDisc + techDisc);
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
  const subMult = getActiveSubscription(s, nowMs)?.def.incomeMult ?? 1;

  const shopBoost = ignoreTemp ? 1 : getActiveShopIncomeBooster(s, nowMs).mult;
  const gemBoost = ignoreTemp ? 1 : s.boost > 0 ? 2 : 1;
  // Cap combined temporary shop + gem boost multiplier to 2.5x so cash stays balanced
  const tempMult = Math.min(2.5, shopBoost * gemBoost);

  const permMult = gxMultiplier(s) * evMult * gov.inc * subMult * getTechIncomeMult(s);
  const taxMult = taxInfo(s).mult;

  const cleanGreenCount = (s.b.solar || 0) + (s.b.hydro || 0) + (s.b.fusion || 0);
  const greenSynergy = 1 + Math.min(0.5, cleanGreenCount * (s.green || 0) * 0.002);
  const transitSynergy = 1 + Math.min(0.45, ((s.b.transit || 0) + (s.b.rail || 0)) * (s.transitSub || 0) * 0.002);
  const quantumSynergy = 1 + Math.min(0.4, (s.b.quantum || 0) * 0.02);

  const mult =
    taxMult *
    (1 + (s.hap - 50) / 200) *
    (1 + (s.b.pow || 0) * 0.015 + (s.b.fusion || 0) * 0.025) *
    quantumSynergy *
    tempMult *
    (1 + s.edu / 200) *
    (1 + (s.rd || 0) / 140) *
    greenSynergy *
    transitSynergy *
    (1 + (s.fuel || 0) / 150) *
    (1 + tradeTier * 0.05) *
    (1 + stickerBonus(s)) *
    (1 + (s.rank || 0) * 0.01) *
    permMult;

  gross *= mult;
  // Cap upkeep rate at 35% and policy spending rate at 60% so large cities remain profitable
  const upkeepRate = Math.min(0.35, 0.03 + totalBuildings(s) * 0.0015);
  const upkeep = gross * upkeepRate;
  const policySpendShare = Math.min(
    0.6,
    (((s.wel + s.edu) * 0.7 + (s.rd || 0) * 0.55 + (s.green || 0) * 0.45 + (s.transitSub || 0) * 0.4) / 100) * gov.wel,
  );
  const welfareCost = gross * policySpendShare;
  const net = gross - welfareCost - upkeep;

  return {
    gross,
    net,
    welfareCost,
    upkeep,
    upkeepRate,
    policySpendShare,
  };
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
  const carbonOffset = (s.b.solar || 0) * 3 + (s.b.hydro || 0) * 2 + (s.b.fusion || 0) * 5 + (s.green || 0) * 0.5;
  const carbonPen = Math.max(0, (s.carbon || 0) - carbonOffset) * 0.5;
  const ecoTech = hasTech(s, 'eco_catalysis');
  const careTech = hasTech(s, 'healthcare_act');
  const factPenaltyPer = ecoTech ? 1.05 : 1.5;
  const hospBonusPer = careTech ? 1.5 : 1.2;
  const techFlatHap = (ecoTech ? 2 : 0) + (careTech ? 5 : 0);
  return Math.max(
    5,
    Math.min(
      100,
      40 +
        techFlatHap +
        gxHappinessMod(s) +
        s.wel * 1.5 +
        s.edu * 0.6 +
        (s.rd || 0) * 0.25 +
        (s.green || 0) * 0.7 +
        (s.transitSub || 0) * 0.55 -
        (s.tax - 20) * 1.8 -
        (s.fuel || 0) * 0.6 -
        (s.carbon || 0) * 0.4 -
        carbonPen -
        (s.luxury || 0) * 0.3 -
        (s.corp || 0) * 0.35 -
        (s.gst || 0) * 0.45 -
        (s.prop || 0) * 0.7 -
        (s.duty || 0) * 0.2 -
        (s.tourism || 0) * 0.15 -
        (s.digital || 0) * 0.25 -
        (s.wealth || 0) * 0.15 -
        (s.b.fact || 0) * factPenaltyPer +
        (s.b.farm || 0) * 0.8 +
        (s.b.hosp || 0) * hospBonusPer +
        (s.b.stadium || 0) * 0.8 +
        (s.b.solar || 0) * 0.5 +
        (s.b.water || 0) * 0.7 +
        (s.b.univ || 0) * 0.4 +
        (s.b.space || 0) * 0.8 +
        (s.b.hydro || 0) * 0.6 +
        (s.b.evplant || 0) * 0.2 +
        (s.b.transit || 0) * 0.6 +
        (s.b.quantum || 0) * 0.5 -
        (s.b.data || 0) * 0.3 -
        (s.b.logistics || 0) * 0.2,
    ),
  );
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

  // Strictly use unboosted base net income, capped at +35% of pool and max 2 min (120s) of base income
  const bonusAmount = Math.floor(Math.min(pool * 0.35, baseNet * 120));
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
  const ports = s.b?.port || 0;
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
  if (booster.fx === 'rally' && s.hap >= 100 && s.appr >= 100) {
    return { ok: false, reason: 'Happiness & Approval are already at 100%', cooldownLeftSec: 0 };
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
    next.hap = Math.min(100, next.hap + 15);
  } else if (booster.fx === 'rally') {
    next.hap = Math.min(100, next.hap + 10);
    next.appr = Math.min(100, next.appr + 12);
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
  // Offline calculation strictly excludes short-lived temporary boosters
  const net = Math.max(0, calculateIncome(s, { tradeTier, nowMs, ignoreTempBoosters: true }).net);
  const credited = net * away * OFFLINE_RATE;
  if (net <= 0 || credited < 1) {
    return { state: { ...s, t: nowMs }, credited: 0, awaySec: away, wasCapped: rawAway > OFFLINE_CAP_SEC };
  }

  const capPool = net * getTaxPoolCapSeconds(s);
  const prevPool = s.taxPool || 0;
  const newPool = prevPool >= capPool ? prevPool : Math.min(capPool, prevPool + credited);

  return {
    state: { ...s, taxPool: newPool, t: nowMs },
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

export function canBuySubscription(
  s: GameState,
  subDef: SubscriptionDef,
  nowMs = Date.now(),
): { ok: boolean; reason?: string } {
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
  if (s.cash < finalCost) {
    return { ok: false, reason: 'Not enough cash' };
  }
  return { ok: true };
}

export function applyBuySubscription(
  s: GameState,
  subDef: SubscriptionDef,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; paidCost?: number; reason?: string } {
  const check = canBuySubscription(s, subDef, nowMs);
  if (!check.ok) return { ok: false, state: s, reason: check.reason };
  const { finalCost } = getSubscriptionPrice(s, subDef, nowMs);
  return {
    ok: true,
    paidCost: finalCost,
    state: {
      ...s,
      cash: s.cash - finalCost,
      sub: {
        tier: subDef.id,
        exp: nowMs + subDef.durMs,
        // Preserve lastClaimDay so upgrading tiers cannot double-claim on the same day
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
  return {
    ok: true,
    cashAdded: active.def.dailyCash,
    gemsAdded: active.def.dailyGems,
    state: {
      ...s,
      cash: Math.min(1e13, s.cash + active.def.dailyCash),
      gems: Math.min(1e9, Math.floor(s.gems) + active.def.dailyGems),
      sub: {
        ...s.sub,
        tier: active.def.id,
        exp: active.exp,
        lastClaimDay: dayKey,
      },
    },
  };
}

/**
 * Unboosted building development scale (ignores tax sliders, world events, and temp boosters).
 */
export function gxBuildDevelopment(s: GameState): number {
  let dev = 0;
  for (const d of BUILDINGS) {
    dev += d.inc * (s.b?.[d.id] || 0) * gxLevelMult(s, d.id);
  }
  return dev;
}

/**
 * Government building & road renovation unit depends strictly on 20% of building development.
 */
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
  if (!def || count < 1 || lvl >= 5) return 0;
  const disc = getDevelopmentDiscount(s, nowMs);
  return Math.max(1, Math.ceil(def.cost * count * GX_UPGRADE_MULTS[lvl - 1] * (1 - disc)));
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
      fused: Math.min(1_000_000, Math.floor(s.fused || 0) + 1),
    },
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
    if (s.cash < CRATE_COST_CASH) {
      return { ok: false, state: s, granted: [], reason: 'Not enough cash' };
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
        cash: s.cash - CRATE_COST_CASH,
        crateCd: nowMs + CRATE_CD_MS,
        stk: nextStk,
      },
    };
  }

  if (s.gems < CRATE_COST_GEMS) {
    return { ok: false, state: s, granted: [], reason: 'Not enough diamonds' };
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

export function applyPolicyPreset(s: GameState, presetId: 'balanced' | 'revenue' | 'welfare'): GameState {
  const preset = POLICY_PRESETS.find((p) => p.id === presetId);
  if (!preset) return s;
  const next: GameState = { ...s };
  for (const [k, rawVal] of Object.entries(preset.values)) {
    const bounds = POLICY_BOUNDS[k];
    if (bounds && typeof rawVal === 'number') {
      (next as unknown as Record<string, number>)[k] = Math.round(
        Math.max(bounds[0], Math.min(bounds[1], rawVal)),
      );
    }
  }
  return next;
}

export const MILESTONES: QuestDef[] = [
  { id: 'm_first_bldg', t: 'First Infrastructure (Own 5 buildings)', f: (s) => totalBuildings(s), g: 5, r: 3 },
  { id: 'm_cash_1m', t: 'Millionaire Treasury (Hold ₨ 1M cash)', f: (s) => calculateGdp(s), g: 1_000_000, r: 8 },
  { id: 'm_builders_25', t: 'Urban Planner (Own 25 buildings)', f: (s) => totalBuildings(s), g: 25, r: 10 },
  { id: 'm_infra_5', t: 'Master Architect (Upgrade any building to Lv 5)', f: (s) => Math.max(1, ...Object.values(s.gx?.lvl || { farm: 1 })), g: 5, r: 12 },
  { id: 'm_stk_10', t: 'Curator (Collect 10 unique stickers)', f: (s) => stickerUniqueCount(s), g: 10, r: 10 },
  { id: 'm_rank_4', t: 'Royal Charter (Reach Platinum King rank)', f: (s) => s.rank || 0, g: 4, r: 15 },
  { id: 'm_tech_3', t: 'Chief Scientist (Unlock 3 Research doctrines)', f: (s) => techCount(s), g: 3, r: 12 },
  { id: 'm_gdp_100m', t: 'Economic Powerhouse (GDP ₨ 100M)', f: (s) => calculateGdp(s), g: 100_000_000, r: 25 },
  { id: 'm_rank_10', t: 'World Dominance (Reach Global Hegemon)', f: (s) => s.rank || 0, g: MAX_RANK, r: 45 },
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
  return {
    ok: true,
    gemsAdded: m.r,
    state: {
      ...s,
      gems: Math.min(1e9, Math.floor(s.gems) + m.r),
      milestones: { ...(s.milestones || {}), [milestoneId]: 1 },
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
  { id: 'rank6buy', t: 'Reach Cosmic Overlord', f: (s) => s.rank || 0, g: 6, r: 40 },
  { id: 'rank10buy', t: 'Reach Global Hegemon', f: (s) => s.rank || 0, g: 10, r: 60 },
  { id: 'boost1', t: 'Use a booster', f: (s) => Object.keys(s.boosterCd || {}).length, g: 1, r: 5 },
  { id: 'boost3', t: 'Use 3 different boosters', f: (s) => Object.keys(s.boosterCd || {}).length, g: 3, r: 10 },
  { id: 'hydro1', t: 'Build a Hydro Dam', f: (s) => s.b.hydro || 0, g: 1, r: 6 },
  { id: 'stock1', t: 'Build a Stock Exchange', f: (s) => s.b.stock || 0, g: 1, r: 10 },
  { id: 'evplant1', t: 'Build an EV Gigafactory', f: (s) => s.b.evplant || 0, g: 1, r: 14 },
  { id: 'fusion1', t: 'Build a Fusion Reactor', f: (s) => s.b.fusion || 0, g: 1, r: 28 },
  { id: 'transit1', t: 'Build a Metro Transit', f: (s) => s.b.transit || 0, g: 1, r: 7 },
  { id: 'semicon1', t: 'Build a Semiconductor Fab', f: (s) => s.b.semicon || 0, g: 1, r: 16 },
  { id: 'logistics1', t: 'Build a Logistics Mega-Hub', f: (s) => s.b.logistics || 0, g: 1, r: 20 },
  { id: 'quantum1', t: 'Build a Quantum Lab', f: (s) => s.b.quantum || 0, g: 1, r: 30 },
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

  if (s.cash < quote.spendCost) {
    return { ok: false, state: s, summary: 'Not enough cash for this option' };
  }

  const next: GameState = { ...s, cash: Math.max(0, s.cash - quote.spendCost) };
  if (decisionId === 'tech_expo') {
    next.hap = Math.min(100, next.hap + 8);
    next.appr = Math.min(100, next.appr + 6);
    next.gems = Math.min(1e9, next.gems + 1);
    return { ok: true, state: next, summary: `Sponsored Tech Expo (−₨ ${formatNumber(quote.spendCost)}): +8% Hap, +6% Appr, +1 Gem!` };
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

const HAPPY_BUILDINGS = new Set(['farm', 'hosp', 'water', 'solar', 'hydro', 'transit', 'stadium', 'space', 'quantum']);

export function getRecommendedBuildings(
  s: GameState,
  qty: 1 | 5 = 1,
  nowMs = Date.now(),
): Record<string, string> {
  const rec: Record<string, string> = {};
  const disc = getDevelopmentDiscount(s, nowMs);
  const scored = BUILDINGS.map((d) => {
    const count = s.b?.[d.id] || 0;
    const cost = bulkBuildingCost(d, count, qty, disc);
    const upgMult = gxLevelMult(s, d.id);
    const roi = (d.inc * upgMult * qty) / Math.max(1, cost);
    return { def: d, cost, roi, count, affordable: s.cash >= cost };
  });

  const affordable = scored.filter((x) => x.affordable).sort((a, b) => b.roi - a.roi);
  if (affordable.length > 0) {
    rec[affordable[0].def.id] = 'Best ROI';
  }

  if ((s.hap ?? 60) < 55) {
    const hapPick = affordable.find((x) => HAPPY_BUILDINGS.has(x.def.id) && !rec[x.def.id]);
    if (hapPick) rec[hapPick.def.id] = 'Happiness Fix';
  } else if ((s.b?.port || 0) === 0) {
    const portPick = affordable.find((x) => x.def.id === 'port' && !rec[x.def.id]);
    if (portPick) rec[portPick.def.id] = 'Gems & Stickers';
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
    const hap = ready.find((b) => b.fx === 'hap10');
    if (hap) rec[hap.id] = 'Happiness Fix';
  }
  if ((s.appr ?? 55) < 55) {
    const rally = ready.find((b) => b.fx === 'rally');
    if (rally) rec[rally.id] = 'Approval Boost';
  }

  const baseNet = Math.max(0, calculateIncome(s, { nowMs, ignoreTempBoosters: true }).net);
  if ((s.taxPool || 0) >= Math.max(500, baseNet * 45)) {
    const surge = ready.find((b) => b.fx === 'tax15x');
    if (surge) rec[surge.id] = 'Tax Cashout';
  }

  const incomeOrder = ['boom_surge', 'golden_treasury', 'quick_profit'];
  for (const id of incomeOrder) {
    const pick = ready.find((b) => b.id === id);
    if (pick) {
      rec[pick.id] = 'Top Income';
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
      const civic = unlockable.find((t) => t.cat === 'civic');
      if (civic) {
        rec[civic.id] = 'Happiness Fix';
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
  const candidateRank = (s.rank || 0) + 1;
  if (candidateRank <= MAX_RANK && canBuyRank(s, candidateRank).ok) {
    nextRankId = candidateRank;
    rankReason = 'Ready Upgrade';
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
  return {
    ok: true,
    collected: res.collected,
    bonusApplied: res.bonusApplied,
    bonusAmount: res.bonusAmount,
    portDrop,
    state: {
      ...s,
      cash: Math.min(1e13, s.cash + res.collected),
      gems: Math.min(1e9, Math.floor(s.gems) + portDrop.gems),
      stk: nextStk,
      taxPool: 0,
      activeFx: res.bonusApplied ? { ...(s.activeFx || {}), taxSurge: 0 } : s.activeFx,
    },
  };
}

export function applyActivateGemBoost(s: GameState): { ok: boolean; state: GameState; reason?: string } {
  if (s.boost > 0) return { ok: false, state: s, reason: 'Boost is already active' };
  if (s.gems < 5) return { ok: false, state: s, reason: 'Need 5 diamonds' };
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
): { ok: boolean; state: GameState; newCount: number; cost: number; reason?: string } {
  const def = BUILDINGS.find((b) => b.id === id);
  if (!def) return { ok: false, state: s, newCount: 0, cost: 0, reason: 'Unknown building' };
  const count = s.b[id] || 0;
  if (count >= 10_000) return { ok: false, state: s, newCount: count, cost: 0, reason: 'Max building count reached' };
  const clampedQty = Math.min(qty, 10_000 - count);
  const cost = bulkBuildingCost(def, count, clampedQty, getDevelopmentDiscount(s, nowMs));
  if (s.cash < cost) return { ok: false, state: s, newCount: count, cost, reason: 'Not enough cash' };
  const newCount = count + clampedQty;
  return {
    ok: true,
    newCount,
    cost,
    state: {
      ...s,
      cash: Math.max(0, s.cash - cost),
      b: { ...s.b, [id]: newCount },
    },
  };
}

export function applyFixInfra(
  s: GameState,
  key: string,
  full: boolean,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; cost: number; reason?: string } {
  const cost = gxRepairCost(s, key, full, nowMs);
  if (cost <= 0) return { ok: false, state: s, cost: 0, reason: 'Already at full condition' };
  if (s.cash < cost) return { ok: false, state: s, cost, reason: 'Not enough cash' };
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
  const lvl = s.gx?.lvl?.[id] || 1;
  const cost = gxUpgradeCost(s, id, nowMs);
  if (lvl >= 5 || cost <= 0) return { ok: false, state: s, newLevel: lvl, cost: 0, reason: 'Already at max level' };
  if (s.cash < cost) return { ok: false, state: s, newLevel: lvl, cost, reason: 'Not enough cash' };
  return {
    ok: true,
    newLevel: lvl + 1,
    cost,
    state: {
      ...s,
      cash: Math.max(0, s.cash - cost),
      gx: {
        ...s.gx,
        lvl: { ...s.gx.lvl, [id]: lvl + 1 },
      },
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
  if (s.cash < g.cost) return { ok: false, state: s, reason: 'Not enough cash' };
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

export function applyClaimQuest(
  s: GameState,
  questId: string,
  todayKey: string,
  rankPos: number,
): { ok: boolean; state: GameState; gemsAdded: number; reason?: string } {
  if (s.claimed?.[questId]) return { ok: false, state: s, gemsAdded: 0, reason: 'Already claimed' };
  const activeIds =
    s.questIds?.length === 3 && s.questDay === todayKey ? s.questIds : selectDailyQuestIds(todayKey);
  const qIndex = QUEST_POOL.findIndex((q) => q.id === questId);
  if (qIndex < 0 || !activeIds.includes(qIndex)) {
    return { ok: false, state: s, gemsAdded: 0, reason: 'Quest not active today' };
  }
  const q = QUEST_POOL[qIndex];
  if (q.f(s, { rank: rankPos }) < q.g) {
    return { ok: false, state: s, gemsAdded: 0, reason: 'Objective not yet completed' };
  }
  const cleanClaimed: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.claimed || {}).slice(0, 19)) {
    if (Number(v) > 0) cleanClaimed[k] = 1;
  }
  cleanClaimed[questId] = 1;
  return {
    ok: true,
    gemsAdded: q.r,
    state: {
      ...s,
      gems: Math.min(1e9, Math.floor(s.gems) + q.r),
      claimed: cleanClaimed,
    },
  };
}

