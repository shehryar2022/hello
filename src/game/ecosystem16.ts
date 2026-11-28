import {
  BUILDINGS,
  GX_PROJECT_TYPES,
  NATIONAL_POLICIES,
  getBuildingLevelMultiplier,
} from './constants';
import {
  BUILDING_META_OVERRIDES_16,
  DIPLOMACY_PARTNERS_16,
  DIPLOMACY_TREATIES_16,
  DYNAMIC_EVENTS_16,
  RESOURCE_CATALOG_16,
  type DynamicEventDef16,
} from './dataExpansion16';
import type { BuildingDef, GameState, ResourceId } from './types';

function resolveBuildingMeta(def: BuildingDef) {
  const ov = BUILDING_META_OVERRIDES_16[def.id];
  return {
    produces: def.produces || ov?.produces,
    consumes: def.consumes || ov?.consumes,
    skilledShare: def.skilledShare ?? ov?.skilledShare ?? 0.25,
    dependsOn: def.dependsOn || ov?.dependsOn,
  };
}

export interface ResourceEcosystemReport {
  production: Partial<Record<ResourceId, number>>;
  consumption: Partial<Record<ResourceId, number>>;
  net: Partial<Record<ResourceId, number>>;
  shortages: ResourceId[];
  surpluses: ResourceId[];
  storageCap: number;
  storageUsed: number;
  storageMaintCost: number;
  resourceMult: number; // 0.84 .. 1.10 efficiency modifier
  activeChains: number;
}

export function computeResourceStorageCap(s: GameState): number {
  const b = s.b || {};
  const warehouseBonus =
    (Number(b.grain_mega_complex) || 0) * 600 +
    (Number(b.smart_cold_warehouse) || 0) * 450 +
    (Number(b.logistics_center) || 0) * 350 +
    (Number(b.ports) || 0) * 280 +
    (Number(b.deep_sea_port) || 0) * 500 +
    (Number(b.inland_dry_port) || 0) * 420;
  const rankCap = Math.max(1, Number(s.rank) || 1) * 300;
  const reservePolicy = Number(s.pol?.p_res || 0) === 1 ? 1.35 : 1;
  return Math.round((1200 + rankCap + warehouseBonus) * reservePolicy);
}

export function computeResourceEcosystem(s: GameState): ResourceEcosystemReport {
  const production: Partial<Record<ResourceId, number>> = {};
  const consumption: Partial<Record<ResourceId, number>> = {};
  const b = s.b || {};
  const lvls = s.gx?.lvl || {};

  // Baseline subsistence grain/fuel/clean_energy cushion so early starter towns never suffer unfair penalties
  production.grain = 1.5;
  production.food = 1.2;
  production.fuel = 0.6;
  production.clean_energy = 1.0;

  let dependencyPenalty = 0;

  for (const def of BUILDINGS) {
    const qty = Math.max(0, Math.floor(Number(b[def.id]) || 0));
    if (qty <= 0) continue;
    const meta = resolveBuildingMeta(def);
    const lvl = Math.max(1, Math.min(50, Math.floor(Number(lvls[def.id]) || 1)));
    const scale = qty * (1 + (lvl - 1) * 0.05);

    if (meta.produces) {
      for (const [rawId, rawRate] of Object.entries(meta.produces)) {
        const id = rawId as ResourceId;
        const rate = Number(rawRate) || 0;
        if (rate > 0) production[id] = (production[id] || 0) + rate * scale;
      }
    }
    if (meta.consumes) {
      for (const [rawId, rawRate] of Object.entries(meta.consumes)) {
        const id = rawId as ResourceId;
        const rate = Number(rawRate) || 0;
        if (rate > 0) consumption[id] = (consumption[id] || 0) + rate * scale;
      }
    }
    if (meta.dependsOn?.length) {
      const missingDep = meta.dependsOn.some((depId) => (Number(b[depId]) || 0) <= 0);
      if (missingDep) dependencyPenalty += 0.012;
    }
  }

  // Population food consumption scales gently with population (millions, capped for outlier tests)
  const pop = Math.max(1, Math.min(20_000, Number(s.pop) || 48));
  consumption.food = (consumption.food || 0) + pop * 0.04;

  // Production chain conversions (Oil->Fuel bonus, Iron Ore->Steel, Grain->Food, Silicon->Semiconductors)
  const stock = s.resources?.stock || {};
  const net: Partial<Record<ResourceId, number>> = {};
  const shortages: ResourceId[] = [];
  const surpluses: ResourceId[] = [];
  let shortageSeverity = 0;
  let surplusBreadth = 0;

  for (const meta of RESOURCE_CATALOG_16) {
    const prod = production[meta.id] || 0;
    const cons = consumption[meta.id] || 0;
    const delta = Math.round((prod - cons) * 100) / 100;
    net[meta.id] = delta;

    const held = Math.max(0, Number(stock[meta.id]) || 0);
    if (cons > 0.2 && delta < -0.2 && held < cons * 6) {
      shortages.push(meta.id);
      const ratio = Math.min(1, Math.abs(delta) / Math.max(1, cons));
      shortageSeverity += meta.critical ? ratio * 0.025 : ratio * 0.012;
    } else if (prod > 0.5 && delta > 0.4) {
      surpluses.push(meta.id);
      surplusBreadth += 1;
    }
  }

  // Active production chains count
  let activeChains = 0;
  if ((production.oil || 0) > 0.5 && (production.fuel || 0) > 0.8) activeChains += 1;
  if ((production.iron_ore || 0) > 0.5 && (production.steel || 0) > 0.5) activeChains += 1;
  if ((production.grain || 0) > 1.5 && (production.food || 0) > 1.5) activeChains += 1;
  if ((production.silicon || 0) > 0.3 && (production.semiconductors || 0) > 0.3) activeChains += 1;
  if ((production.chemicals || 0) > 0.5 && ((production.fertilizers || 0) > 0.4 || (production.pharmaceuticals || 0) > 0.4)) {
    activeChains += 1;
  }

  const storageCap = computeResourceStorageCap(s);
  const storageUsed = Math.round(
    Object.values(stock).reduce((acc, v) => acc + Math.max(0, Number(v) || 0), 0),
  );
  const storageMaintCost = Math.round(storageUsed * 0.06 * 100) / 100;

  const chainBonus = activeChains * 0.014 + Math.min(0.03, surplusBreadth * 0.0025);
  const rawMult = 1 + chainBonus - Math.min(0.14, shortageSeverity) - Math.min(0.06, dependencyPenalty);
  const resourceMult = Math.round(Math.max(0.84, Math.min(1.1, rawMult)) * 1000) / 1000;

  return {
    production,
    consumption,
    net,
    shortages,
    surpluses,
    storageCap,
    storageUsed,
    storageMaintCost,
    resourceMult,
    activeChains,
  };
}

export function tickResourceStockpiles(s: GameState, elapsedSec: number): GameState {
  const dt = Math.max(0, Math.min(300, Number(elapsedSec) || 0));
  if (dt <= 0) return s;

  const eco = computeResourceEcosystem(s);
  const prevStock = s.resources?.stock || {};
  const nextStock: Record<string, number> = { ...prevStock };
  const perCommodityCap = Math.max(250, Math.round(eco.storageCap / 6));

  for (const meta of RESOURCE_CATALOG_16) {
    const cur = Math.max(0, Number(nextStock[meta.id]) || 0);
    const rate = eco.net[meta.id] || 0;
    const updated = Math.max(0, Math.min(perCommodityCap, cur + rate * dt * 0.15));
    if (updated > 0.01) {
      nextStock[meta.id] = Math.round(updated * 100) / 100;
    } else {
      delete nextStock[meta.id];
    }
  }

  return {
    ...s,
    resources: {
      stock: nextStock,
      cap: eco.storageCap,
    },
  };
}

// ==================== 16.6: POPULATION, SKILLED LABOR & HEALTHCARE PRODUCTIVITY ====================
export interface WorkforceMetrics16 {
  skilledJobs: number;
  skilledSupply: number;
  skilledRatio: number; // 0.78 .. 1.08
  healthcareProductivity: number; // 0.94 .. 1.08
  migrationRate: number; // net M people per fiscal cycle
}

export function computeWorkforceMetrics(
  s: GameState,
  jobsCreated: number,
  happiness: number,
): WorkforceMetrics16 {
  const b = s.b || {};
  const lvls = s.gx?.lvl || {};
  const lvlScale = (id: string) => {
    const qty = Math.max(0, Number(b[id]) || 0);
    if (qty <= 0) return 0;
    const lvl = Math.max(1, Math.min(50, Math.floor(Number(lvls[id]) || 1)));
    return qty * (1 + (lvl - 1) * 0.04);
  };

  let weightedSkilledJobs = 0;
  let totalRawJobs = 0;

  for (const def of BUILDINGS) {
    const qty = Math.max(0, Math.floor(Number(b[def.id]) || 0));
    if (qty <= 0) continue;
    const lvl = Math.max(1, Math.min(50, Math.floor(Number(lvls[def.id]) || 1)));
    const jobs = (def.jobs || 0) * qty * (1 + (lvl - 1) * 0.04);
    const meta = resolveBuildingMeta(def);
    totalRawJobs += jobs;
    weightedSkilledJobs += jobs * meta.skilledShare;
  }

  const skilledJobs = Math.round(weightedSkilledJobs);
  const avgSkilledReq = totalRawJobs > 0 ? weightedSkilledJobs / totalRawJobs : 0.2;

  const eduPipeline =
    lvlScale('schools') * 90 +
    lvlScale('training_centers') * 180 +
    lvlScale('polytechnic_trade_academy') * 260 +
    lvlScale('stem_high_school') * 420 +
    lvlScale('universities') * 720 +
    lvlScale('intl_edu_campus') * 960 +
    lvlScale('national_medical_univ') * 880 +
    lvlScale('ai_aerospace_university') * 1450 +
    lvlScale('nobel_science_academy') * 2100;

  const eduPolicyBonus = 1 + (Number(s.edu) || 10) * 0.012 + (Number(s.pol?.p_edu) === 1 ? 0.14 : 0);
  const techCount = Object.values(s.tech || {}).filter((v) => Number(v) > 0).length;
  const skilledSupply = Math.round((140 + eduPipeline + techCount * 2200 + jobsCreated * 0.44) * eduPolicyBonus);

  const rawRatio = skilledJobs > 0 ? skilledSupply / skilledJobs : 1.05;
  const skilledRatio = Math.round(Math.max(0.78, Math.min(1.08, 0.74 + Math.min(1.36, rawRatio) * 0.25)) * 1000) / 1000;

  const medInfra =
    lvlScale('community_health_clinic') * 12 +
    lvlScale('hospitals') * 32 +
    lvlScale('specialist_healthcare') * 44 +
    lvlScale('trauma_emergency_hospital') * 68 +
    lvlScale('adv_medical') * 105 +
    lvlScale('cancer_research_hospital') * 135 +
    lvlScale('robotic_surgery_center') * 160 +
    lvlScale('longevity_wellness_citadel') * 300;

  const pop = Math.max(1, Math.min(20_000, Number(s.pop) || 48));
  const healthCov = Math.min(1.4, (medInfra + (Number(s.wel) || 15) * 1.4) / Math.max(12, pop * 1.5));
  const healthcareProductivity = Math.round((0.94 + healthCov * 0.085) * 1000) / 1000;

  const migBase = (happiness - 56) * 0.02 + (avgSkilledReq > 0.4 && skilledRatio >= 0.96 ? 0.35 : 0);
  const migrationRate = Math.round(Math.max(-1.5, Math.min(3.5, migBase)) * 100) / 100;

  return {
    skilledJobs,
    skilledSupply,
    skilledRatio,
    healthcareProductivity,
    migrationRate,
  };
}

// ==================== 16.7: SOVEREIGN BONDS & NATIONAL FINANCE ====================
export interface BondLimitsReport {
  maxDebt: number;
  currentDebt: number;
  availableHeadroom: number;
  annualInterestPct: number;
  interestPerSec: number;
}

export function getBondLimits(s: GameState, realGdp: number, stabilityScore: number): BondLimitsReport {
  const rank = Math.max(1, Number(s.rank) || 1);
  // Strict debt ceiling tied to real GDP & rank (prevents infinite debt loops)
  const rawMax = Math.max(25_000, Math.min(2_000_000_000_000, Math.round(realGdp * 0.35 + rank * 25_000)));
  const currentDebt = Math.max(0, Math.round(Number(s.finance?.debt) || 0));
  const availableHeadroom = Math.max(0, rawMax - currentDebt);

  const thamesTreaty = (s.diplomacy?.treaties || []).includes('tr_thames_bond') ? 1.5 : 0;
  const riskPremium = Math.max(0, (70 - stabilityScore) * 0.14);
  const annualInterestPct = Math.round(Math.max(3.5, Math.min(16, 6.2 + riskPremium - thamesTreaty)) * 100) / 100;
  // Scaled per-second debt service drain
  const interestPerSec = Math.round((currentDebt * (annualInterestPct / 100)) / 900 * 100) / 100;

  return {
    maxDebt: rawMax,
    currentDebt,
    availableHeadroom,
    annualInterestPct,
    interestPerSec,
  };
}

export function applyBorrowBond(
  s: GameState,
  amount: number,
  realGdp: number,
  stabilityScore: number,
): { ok: boolean; state: GameState; msg: string } {
  const req = Math.floor(Number(amount) || 0);
  if (req <= 0) return { ok: false, state: s, msg: 'Enter a positive sovereign bond amount.' };

  const limits = getBondLimits(s, realGdp, stabilityScore);
  if (req > limits.availableHeadroom) {
    return {
      ok: false,
      state: s,
      msg: `Exceeds sovereign debt headroom (max available: ₨ ${limits.availableHeadroom.toLocaleString()}).`,
    };
  }

  const prevFin = s.finance || { debt: 0, interestPaid: 0, borrowedTotal: 0 };
  return {
    ok: true,
    state: {
      ...s,
      cash: Math.round((Number(s.cash) || 0) + req),
      finance: {
        debt: Math.round(prevFin.debt + req),
        interestPaid: prevFin.interestPaid || 0,
        borrowedTotal: Math.round((prevFin.borrowedTotal || 0) + req),
      },
    },
    msg: `Issued ₨ ${req.toLocaleString()} sovereign bonds at ${limits.annualInterestPct}% coupon.`,
  };
}

export function applyRepayBond(
  s: GameState,
  amount: number,
): { ok: boolean; state: GameState; msg: string } {
  const prevFin = s.finance || { debt: 0, interestPaid: 0, borrowedTotal: 0 };
  const debt = Math.max(0, Math.round(prevFin.debt || 0));
  if (debt <= 0) return { ok: false, state: s, msg: 'No active sovereign bond debt to repay.' };

  const pay = Math.min(debt, Math.floor(Number(amount) || 0));
  if (pay <= 0) return { ok: false, state: s, msg: 'Enter a valid repayment amount.' };
  if ((Number(s.cash) || 0) < pay) {
    return { ok: false, state: s, msg: 'Insufficient treasury Coins for bond repayment.' };
  }

  return {
    ok: true,
    state: {
      ...s,
      cash: Math.round((Number(s.cash) || 0) - pay),
      finance: {
        ...prevFin,
        debt: Math.max(0, debt - pay),
      },
    },
    msg: `Retired ₨ ${pay.toLocaleString()} sovereign bond principal.`,
  };
}

// ==================== 16.8: DIPLOMACY, RELATIONS, TREATIES & FDI ====================
export function getDiplomacyState(s: GameState) {
  const defaultRel: Record<string, number> = Object.fromEntries(
    DIPLOMACY_PARTNERS_16.map((p) => [p.code, p.baseRelation]),
  );
  return {
    relations: { ...defaultRel, ...(s.diplomacy?.relations || {}) },
    treaties: Array.isArray(s.diplomacy?.treaties) ? s.diplomacy!.treaties : [],
    rep: Math.max(0, Math.min(100, Number(s.diplomacy?.rep ?? 52))),
    jointVentures: Array.isArray(s.diplomacy?.jointVentures) ? s.diplomacy!.jointVentures : [],
    sanctionTarget: s.diplomacy?.sanctionTarget || '',
  };
}

export function getDiplomacyBonuses(s: GameState) {
  const dip = getDiplomacyState(s);
  let fdiBonusPct = 0;
  let tradeBonusPct = 0;
  let hapBonus = 0;

  for (const tid of dip.treaties) {
    const def = DIPLOMACY_TREATIES_16.find((t) => t.id === tid);
    if (!def) continue;
    fdiBonusPct += def.fdiBonusPct;
    tradeBonusPct += def.tradeBonusPct;
    hapBonus += def.hapBonus;
  }

  // Reputation adds gentle FDI tailwind (capped)
  fdiBonusPct += Math.max(0, (dip.rep - 50) * 0.08);

  return {
    fdiBonusPct: Math.round(Math.min(28, fdiBonusPct) * 100) / 100,
    tradeBonusPct: Math.round(Math.min(35, tradeBonusPct) * 100) / 100,
    hapBonus: Math.round(Math.min(10, hapBonus) * 100) / 100,
    treatyCount: dip.treaties.length,
    rep: dip.rep,
  };
}

export function applyDiplomacyEnvoy(
  s: GameState,
  partnerCode: string,
): { ok: boolean; state: GameState; msg: string } {
  const partner = DIPLOMACY_PARTNERS_16.find((p) => p.code === partnerCode);
  if (!partner) return { ok: false, state: s, msg: 'Unknown diplomatic partner.' };

  const dip = getDiplomacyState(s);
  const envoyCost = Math.max(15_000, Math.round(15_000 * Math.pow(1.35, Math.max(0, (s.rank || 1) - 1))));
  if ((Number(s.cash) || 0) < envoyCost) {
    return { ok: false, state: s, msg: `Requires ₨ ${envoyCost.toLocaleString()} for diplomatic mission.` };
  }

  const prevRel = Number(dip.relations[partnerCode] ?? partner.baseRelation);
  const nextRel = Math.min(100, prevRel + 7);
  const nextRep = Math.min(100, dip.rep + 2);

  return {
    ok: true,
    state: {
      ...s,
      cash: Math.round((Number(s.cash) || 0) - envoyCost),
      diplomacy: {
        ...dip,
        relations: { ...dip.relations, [partnerCode]: nextRel },
        rep: nextRep,
      },
    },
    msg: `Dispatched summit envoy to ${partner.name} (Relations ${prevRel} → ${nextRel}).`,
  };
}

export function applyDiplomacyTreaty(
  s: GameState,
  treatyId: string,
): { ok: boolean; state: GameState; msg: string } {
  const def = DIPLOMACY_TREATIES_16.find((t) => t.id === treatyId);
  if (!def) return { ok: false, state: s, msg: 'Treaty not found.' };

  const dip = getDiplomacyState(s);
  if (dip.treaties.includes(treatyId)) {
    return { ok: false, state: s, msg: `${def.name} is already ratified.` };
  }
  if ((Number(s.rank) || 1) < def.minRank) {
    return { ok: false, state: s, msg: `Requires National Rank ${def.minRank}.` };
  }
  const rel = Number(dip.relations[def.partnerCode] ?? 50);
  if (rel < def.minRelation) {
    return {
      ok: false,
      state: s,
      msg: `Needs ${def.minRelation} relation score with ${def.partnerCode} (currently ${rel}).`,
    };
  }
  if ((Number(s.cash) || 0) < def.signCost) {
    return { ok: false, state: s, msg: `Requires ₨ ${def.signCost.toLocaleString()} ratification budget.` };
  }

  return {
    ok: true,
    state: {
      ...s,
      cash: Math.round((Number(s.cash) || 0) - def.signCost),
      hap: Math.min(100, Math.round(((Number(s.hap) || 60) + def.hapBonus) * 10) / 10),
      diplomacy: {
        ...dip,
        treaties: [...dip.treaties, treatyId],
        rep: Math.min(100, dip.rep + 4),
      },
    },
    msg: `Ratified ${def.name} (+${def.fdiBonusPct}% FDI, +${def.tradeBonusPct}% Trade).`,
  };
}

// ==================== 16.9: DYNAMIC NATIONAL EVENTS & STABILITY ====================
export function getActiveDynamicEvent(
  s: GameState,
  nowMs = Date.now(),
): { active: NonNullable<GameState['dynEvent']>; def: DynamicEventDef16 } | null {
  const raw = s.dynEvent;
  if (!raw || !raw.id || (raw.expiresAt || 0) <= nowMs) return null;
  const def = DYNAMIC_EVENTS_16.find((e) => e.id === raw.id);
  if (!def) return null;
  return { active: raw, def };
}

export function rollDynamicEventIfDue(
  s: GameState,
  nowMs = Date.now(),
  seedValue?: number,
): GameState {
  if (s.dynEvent && (s.dynEvent.expiresAt || 0) > nowMs) return s;
  const totalBuildings = Object.values(s.b || {}).reduce((a, v) => a + (Number(v) || 0), 0);
  if (totalBuildings < 5) return s;

  const idx = Math.abs(Math.floor(seedValue ?? Math.floor(nowMs / 300_000))) % DYNAMIC_EVENTS_16.length;
  const chosen = DYNAMIC_EVENTS_16[idx];
  return {
    ...s,
    dynEvent: {
      id: chosen.id,
      expiresAt: nowMs + chosen.durSec * 1000,
      resolved: false,
    },
  };
}

export function applyResolveDynamicEvent(
  s: GameState,
  choiceIdx: 0 | 1,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; msg: string } {
  const current = getActiveDynamicEvent(s, nowMs);
  if (!current) return { ok: false, state: s, msg: 'No active national event right now.' };
  if (current.active.resolved) return { ok: false, state: s, msg: 'Current national event has already been addressed.' };

  const choice = current.def.choices[choiceIdx];
  const spend = Math.min(
    Math.floor((Number(s.cash) || 0) * 0.5),
    Math.max(1_000, Math.round((Number(s.cash) || 0) * choice.costPctCash)),
  );
  if ((Number(s.cash) || 0) < spend) {
    return { ok: false, state: s, msg: `Insufficient treasury Coins (needs ₨ ${spend.toLocaleString()}).` };
  }

  const dip = getDiplomacyState(s);
  return {
    ok: true,
    state: {
      ...s,
      cash: Math.round((Number(s.cash) || 0) - spend),
      hap: Math.max(10, Math.min(100, Math.round(((Number(s.hap) || 60) + choice.hapDelta) * 10) / 10)),
      appr: Math.max(10, Math.min(100, Math.round(((Number(s.appr) || 60) + choice.stabilityDelta * 0.6) * 10) / 10)),
      diplomacy: {
        ...dip,
        rep: Math.max(10, Math.min(100, dip.rep + Math.round(choice.stabilityDelta * 0.5))),
      },
      dynEvent: {
        ...current.active,
        resolved: true,
      },
    },
    msg: `${current.def.title}: "${choice.label}" executed (${choice.summary}).`,
  };
}

export function computeMegaProjectMaintPerSec(s: GameState): number {
  const list = s.megaProjects || [];
  let sum = 0;
  for (const slot of list) {
    if (slot.status !== 'done' && !slot.claimed) continue;
    const def = GX_PROJECT_TYPES[slot.type];
    sum += def?.maintPerSec ?? Math.round((def?.cost || 50_000) * 0.00004);
  }
  return Math.round(sum * 100) / 100;
}

export function computeNationalStability(
  s: GameState,
  energyRatio: number,
  inflationRate: number,
  realGdp: number,
): number {
  const hap = Number(s.hap ?? 65);
  const appr = Number(s.appr ?? 65);
  const debtRatio = realGdp > 0 ? Math.min(1, (s.finance?.debt || 0) / Math.max(1, realGdp * 0.35)) : 0;
  const energyScore = Math.min(1, Math.max(0.4, energyRatio)) * 20;
  const inflationPenalty = Math.max(0, inflationRate - 4) * 1.4;
  const score =
    hap * 0.38 +
    appr * 0.32 +
    energyScore +
    10 -
    debtRatio * 14 -
    inflationPenalty;
  return Math.round(Math.max(15, Math.min(100, score)) * 10) / 10;
}

export function computeNationalDevelopmentIndex(s: GameState, stability: number): number {
  const distinctTypes = Object.values(s.b || {}).filter((v) => Number(v) > 0).length;
  const totalTechs = Object.values(s.tech || {}).filter((v) => Number(v) > 0).length;
  const completedMegas = (s.megaProjects || []).filter((p) => p.claimed).length;
  const treaties = (s.diplomacy?.treaties || []).length;
  const policiesActive = Object.values(s.pol || {}).filter((v) => Number(v) > 0).length;

  const score =
    (Number(s.rank) || 1) * 28 +
    distinctTypes * 2.5 +
    totalTechs * 8 +
    completedMegas * 35 +
    treaties * 22 +
    policiesActive * 4 +
    stability * 1.2 +
    Math.round(getBuildingLevelMultiplier(1) * 0);

  void NATIONAL_POLICIES; // keep reference clarity for policy count alignment
  return Math.max(0, Math.round(score));
}
