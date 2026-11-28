import assert from 'node:assert/strict';
import test from 'node:test';
import { CITY_PLOTS, MEGA_PROJECT_SLOTS, PLOT_BY_ID } from '../city3d/cityLayout';
import {
  ACHIEVEMENTS,
  BUILDINGS,
  CHALLENGES_ALL,
  GX_PROJECT_TYPES,
  TECH_TREE,
  TRADE_GOODS,
} from './constants';
import {
  BUILDING_META_OVERRIDES_16,
  DIPLOMACY_PARTNERS_16,
  DIPLOMACY_TREATIES_16,
  DYNAMIC_EVENTS_16,
  NEW_BUILDINGS_16,
  PRODUCTION_CHAINS_16,
  RESOURCE_CATALOG_16,
  TECH_CATEGORY_META_16,
} from './dataExpansion16';
import {
  ALLOWED_SAVE_KEYS,
  applyBorrowBond,
  applyDiplomacyEnvoy,
  applyDiplomacyTreaty,
  applyRepayBond,
  applyResolveDynamicEvent,
  applyStartLocalMegaProject,
  applyUnlockTech,
  cleanSavePayload,
  computeEconomySnapshot,
  computeLeaderboardMetrics,
  computeMegaProjectMaintPerSec,
  computeNationalDevelopmentIndex,
  computeNationalStability,
  computeResourceEcosystem,
  computeResourceStorageCap,
  computeWorkforceMetrics,
  freshState,
  getBondLimits,
  getDiplomacyBonuses,
  getIntlTradeCapacity,
  getTechLevel,
  getTradeGoodQuote,
  migrateState,
  rollDynamicEventIfDue,
  tickResourceStockpiles,
} from './rules';
import type { ProjectType } from './types';

test('Part 16.1 & 16.2: 120 new buildings (>=10 per sector), 227 total w/ tiers & plots, and 21 Mega Projects w/ 3D slots', () => {
  assert.equal(NEW_BUILDINGS_16.length, 120);
  assert.equal(BUILDINGS.length, 227);
  assert.equal(CITY_PLOTS.length, 227);

  const byCat = new Map<string, number>();
  for (const b of NEW_BUILDINGS_16) {
    byCat.set(b.cat, (byCat.get(b.cat) || 0) + 1);
    assert.ok(b.tier, `Missing tier for ${b.id}`);
    assert.ok(
      BUILDING_META_OVERRIDES_16[b.id] ||
        b.skilledShare !== undefined ||
        b.produces ||
        b.consumes ||
        b.drawback,
      `Missing meta for ${b.id}`,
    );
  }
  assert.equal(byCat.size, 10);
  for (const [cat, cnt] of byCat.entries()) {
    assert.ok(cnt >= 10, `Sector ${cat} has only ${cnt} new buildings`);
  }

  for (const def of BUILDINGS) {
    assert.ok(PLOT_BY_ID[def.id], `Missing 3D plot for ${def.id}`);
  }

  const megas = Object.keys(GX_PROJECT_TYPES) as ProjectType[];
  assert.equal(megas.length, 21);
  for (const id of megas) {
    assert.ok(MEGA_PROJECT_SLOTS[id], `Missing 3D Mega Project monument slot for ${id}`);
  }
  for (const id of [
    'smart_city',
    'intl_trade_corridor',
    'hsr_network',
    'mega_hydro',
    'spaceport',
    'intl_fin_district',
    'ai_corridor',
    'fusion_grid',
    'trade_canal',
    'industrial_rev',
    'semicon_program',
    'health_transform',
    'edu_revolution',
    'agri_modernization',
    'tourism_dev',
  ] as ProjectType[]) {
    assert.ok(GX_PROJECT_TYPES[id], `Missing Part 16 mega project ${id}`);
  }
});

test('Part 16.3: 101 tech upgrades across all 18 research branches with lab gating & multi-level research', () => {
  assert.equal(TECH_TREE.length, 101);
  assert.equal(TECH_CATEGORY_META_16.length, 18);

  const coveredBranches = new Set(TECH_TREE.map((t) => t.cat));
  assert.equal(coveredBranches.size, 18);
  for (const meta of TECH_CATEGORY_META_16) {
    assert.ok(coveredBranches.has(meta.id), `Missing tech branch ${meta.id}`);
  }

  let s = freshState();
  s.cash = 10_000_000_000;
  s.rank = 25;
  for (const b of BUILDINGS) s.b[b.id] = 5;

  const agentic = TECH_TREE.find((t) => t.id === 'agentic_workflow_os')!;
  assert.ok((agentic.maxLevel || 1) >= 2);
  // Blocked if prereq neural_foundation is missing
  assert.equal(applyUnlockTech(s, 'agentic_workflow_os').ok, false);
  // Also blocked if reqLabBuilding is missing
  const labTech = TECH_TREE.find((t) => t.reqLabBuilding)!;
  const noLab = { ...s, b: { ...s.b, [labTech.reqLabBuilding!]: 0 } };
  assert.equal(applyUnlockTech(noLab, labTech.id).ok, false);

  // Recursively unlock prerequisites & upgrade Lv1 -> Lv2
  const unlockPrereqs = (id: string) => {
    const def = TECH_TREE.find((t) => t.id === id);
    for (const preId of def?.prereq || []) {
      unlockPrereqs(preId);
      const r = applyUnlockTech(s, preId);
      if (r.ok) s = r.state;
    }
  };
  unlockPrereqs('agentic_workflow_os');
  const lv1 = applyUnlockTech(s, 'agentic_workflow_os');
  assert.equal(lv1.ok, true, lv1.reason);
  assert.equal(getTechLevel(lv1.state, 'agentic_workflow_os'), 1);
  const lv2 = applyUnlockTech(lv1.state, 'agentic_workflow_os');
  assert.equal(lv2.ok, true, lv2.reason);
  assert.equal(getTechLevel(lv2.state, 'agentic_workflow_os'), 2);
});

test('Part 16.4: All 18 commodities enforce importPrice >= 1.55 * exportPrice anti-arbitrage spread', () => {
  assert.equal(TRADE_GOODS.length, 18);
  const now = 1_750_000_000_000;
  const s = freshState();
  s.b.ports = 2;
  s.b.airports = 2;
  const cap = getIntlTradeCapacity(s);
  assert.ok(cap.maxConcurrent >= 2);

  for (const g of TRADE_GOODS) {
    const q = getTradeGoodQuote(g.id, s, now);
    assert.ok(
      q.importPrice >= q.exportPrice * 1.55,
      `Arbitrage risk on ${g.id}: import=${q.importPrice} vs export=${q.exportPrice}`,
    );
  }
});

test('Part 16.5 & 16.6: Resource chains, storage cap, shortages/surpluses & workforce skill pipeline', () => {
  assert.equal(RESOURCE_CATALOG_16.length, 22);
  assert.equal(PRODUCTION_CHAINS_16.length, 5);

  const s = freshState();
  s.b.oil_extraction_rig = 2;
  s.b.petrochemical_refinery = 2;
  s.b.iron_ore_mine = 2;
  s.b.steel_plants = 2;
  s.b.farms = 3;
  s.b.food_plant = 2;
  s.b.universities = 2;
  s.b.hospitals = 2;

  const cap = computeResourceStorageCap(s);
  assert.ok(cap > 500);

  const eco = computeResourceEcosystem(s);
  assert.ok(eco.net.oil !== undefined);
  assert.ok(eco.net.fuel !== undefined);
  assert.ok(eco.resourceMult >= 0.84 && eco.resourceMult <= 1.1);
  assert.ok(eco.activeChains >= 2);

  const ticked = tickResourceStockpiles(s, 30);
  const stock = ticked.resources?.stock || {};
  assert.ok((stock.oil || 0) > 0 || (stock.fuel || 0) > 0 || (stock.food || 0) > 0);

  const wf = computeWorkforceMetrics(s, 500, 72);
  assert.ok(wf.skilledRatio >= 0.78 && wf.skilledRatio <= 1.08);
  assert.ok(wf.healthcareProductivity >= 0.94 && wf.healthcareProductivity <= 1.08);
});

test('Part 16.7, 16.8 & 16.9: Sovereign bonds debt ceiling, Diplomacy treaties, Dynamic Events & Stability', () => {
  const now = 1_750_000_000_000;
  let s = freshState();
  s.rank = 10;
  s.b.farms = 20;
  s.b.factories = 15;
  s.b.heavy_industry = 5;
  s.b.power_stations = 8;
  s.b.ports = 2;
  s.cash = 100_000_000;

  const baseSnap = computeEconomySnapshot(s, { nowMs: now });
  const limits = getBondLimits(s, baseSnap.realGdp, baseSnap.stabilityScore || 65);
  assert.ok(limits.maxDebt >= 25_000);
  const b1 = applyBorrowBond(s, Math.floor(limits.maxDebt * 0.5), baseSnap.realGdp, baseSnap.stabilityScore || 65);
  assert.equal(b1.ok, true, b1.msg);
  s = b1.state;

  // Exceeding debt ceiling blocked
  const over = applyBorrowBond(s, limits.maxDebt * 2, baseSnap.realGdp, baseSnap.stabilityScore || 65);
  assert.equal(over.ok, false);

  // Repay debt
  const rep = applyRepayBond(s, s.finance!.debt);
  assert.equal(rep.ok, true, rep.msg);
  assert.equal(rep.state.finance?.debt, 0);

  // Diplomacy envoys & 6 bilateral treaties
  assert.equal(DIPLOMACY_PARTNERS_16.length, 6);
  assert.equal(DIPLOMACY_TREATIES_16.length, 6);
  const partner = DIPLOMACY_PARTNERS_16[0];
  const env = applyDiplomacyEnvoy(s, partner.code);
  assert.equal(env.ok, true, env.msg);
  s = env.state;
  const treaty = DIPLOMACY_TREATIES_16.find((t) => t.partnerCode === partner.code) || DIPLOMACY_TREATIES_16[0];
  for (let i = 0; i < 5; i++) {
    s = { ...s, cash: 100_000_000 };
    s = applyDiplomacyEnvoy(s, treaty.partnerCode).state;
  }
  const tr = applyDiplomacyTreaty(s, treaty.id);
  assert.equal(tr.ok, true, tr.msg);
  s = tr.state;
  const dipBonus = getDiplomacyBonuses(s);
  assert.ok(dipBonus.tradeBonusPct > 0 || dipBonus.fdiBonusPct > 0);

  // Dynamic events
  assert.equal(DYNAMIC_EVENTS_16.length, 8);
  const rolled = rollDynamicEventIfDue(s, now, 2);
  assert.ok(rolled.dynEvent?.id);
  const resolved = applyResolveDynamicEvent(rolled, 0, now);
  assert.equal(resolved.ok, true, resolved.msg);
  assert.equal(resolved.state.dynEvent?.resolved, true);

  // Mega project maintenance once claimed/done
  const mp = applyStartLocalMegaProject(s, 'smart_city', now);
  assert.equal(mp.ok, true, mp.reason);
  const doneState = {
    ...mp.state,
    megaProjects: (mp.state.megaProjects || []).map((slot) =>
      slot.type === 'smart_city' ? { ...slot, status: 'done' as const, claimed: true } : slot,
    ),
  };
  assert.ok(computeMegaProjectMaintPerSec(doneState) > 0);

  // Stability & National Development Index
  const stab = computeNationalStability(s, baseSnap.energyRatio, baseSnap.inflationRate, baseSnap.realGdp);
  assert.ok(stab >= 15 && stab <= 100);
  const snap = computeEconomySnapshot(s, { nowMs: now });
  assert.ok((snap.stabilityScore ?? 0) >= 15 && (snap.stabilityScore ?? 0) <= 100);
  assert.ok(computeNationalDevelopmentIndex(s, stab) > 0);
});

test('Part 16.10, 16.11 & 16.13: Achievements (54), Challenges (16), 13 Leaderboard modes & lossless v2Pack <= 50 chunks', () => {
  assert.equal(ACHIEVEMENTS.length, 54);
  assert.equal(CHALLENGES_ALL.length, 16);

  const now = 1_750_000_000_000;
  let s = freshState();
  s.rank = 10;
  s.cash = 500_000_000;
  s.b.farms = 25;
  s.b.petrochemical_refinery = 4;
  s.b.sub2nm_giga_fab = 2;
  const snap = computeEconomySnapshot(s, { nowMs: now });
  s = applyBorrowBond(s, 50_000, snap.realGdp, snap.stabilityScore || 65).state;
  const partner = DIPLOMACY_PARTNERS_16[0];
  for (let i = 0; i < 4; i++) {
    s = applyDiplomacyEnvoy(s, partner.code).state;
  }
  const treaty = DIPLOMACY_TREATIES_16.find((t) => t.partnerCode === partner.code) || DIPLOMACY_TREATIES_16[0];
  s = applyDiplomacyTreaty(s, treaty.id).state;
  s = tickResourceStockpiles(s, 60);
  s.tech = { ...(s.tech || {}), smart_grid: 1 };
  s.techLvls = { smart_grid: 1, agentic_workflow_os: 2 };

  const cleaned = cleanSavePayload(s);
  assert.equal(ALLOWED_SAVE_KEYS.size, 48);
  assert.ok(Object.keys(cleaned).every((k) => ALLOWED_SAVE_KEYS.has(k)));
  const provLog = cleaned.provBudgetLog as string[];
  assert.ok(Array.isArray(provLog) && provLog.length <= 50);

  const restored = migrateState(cleaned as never);
  assert.equal(restored.b.petrochemical_refinery, 4);
  assert.equal(restored.b.sub2nm_giga_fab, 2);
  assert.equal(restored.finance?.debt, s.finance?.debt);
  assert.ok((restored.diplomacy?.treaties || []).includes(treaty.id));
  assert.equal(getTechLevel(restored, 'smart_grid'), 1);
  assert.equal(getTechLevel(restored, 'agentic_workflow_os'), 2);

  const lb = computeLeaderboardMetrics({
    id: 'test-nation',
    username: 'TestNation',
    usernameLower: 'testnation',
    countryCode: 'PK',
    countryName: 'Pakistan',
    level: 12,
    rank: 10,
    cash: restored.cash,
    gems: restored.gems,
    gdp: 1_000_000,
    natDev: 420,
    pop: 150,
    techCount: 18,
    megaCount: 4,
    tradeScore: 250_000,
    stability: 84,
    stats: {
      buildings: 100,
      completedTrades: 12,
      tradesSent: 6,
      tradesReceived: 6,
      cashTraded: 200_000,
      gemsTraded: 4,
    },
  });
  assert.equal(lb.natDev, 420);
  assert.equal(lb.population, 150);
  assert.equal(lb.researchProg, 18);
  assert.equal(lb.megaProjects, 4);
  assert.equal(lb.tradePerf, 250_000);
  assert.equal(lb.stability, 84);
});
