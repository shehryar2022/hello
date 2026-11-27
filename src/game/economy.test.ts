import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOSTERS,
  BUILDING_POLICIES,
  BUILDINGS,
  CLOUD_MAX_RANK,
  FISCAL_COMMIT_CD_MS,
  MAX_CONSTRUCTION_QUEUE,
  MAX_RANK,
  MIN_RANK,
  NATIONAL_DECISIONS,
  NATIONAL_POLICIES,
  POLICY_CATEGORY_CD_MS,
  RANKS,
  SUBSCRIPTIONS,
  TECH_TREE,
} from './constants';
import {
  applyBuyBooster,
  applyBuyBuilding,
  applyBuyRank,
  applyBuySubscription,
  applyChangePolicyStance,
  applyCollectTax,
  applyCommitFiscalReform,
  applyDemolishBuilding,
  applyEnactNationalDecision,
  applySetBuildingPolicy,
  applyUnlockTech,
  calculateGdp,
  calculateIncome,
  cleanSavePayload,
  computeEconomySnapshot,
  extractFiscalDraft,
  freshState,
  getBoosterActivationInfo,
  getBuildSpeedMultiplier,
  getConstructionQueue,
  getDemolishRefund,
  getRankEligibility,
  karachiDateInt,
  migrateState,
  presetToFiscalDraft,
  tickConstructionQueue,
  totalBuildings,
} from './rules';

test('1. Idempotent legacy migration consolidates provinces & 24 old buildings without wiping cash/sub/gems', () => {
  const legacyRaw = {
    cash: 1_234_567,
    gems: 42,
    rank: 0, // legacy starting rank
    pop: 48,
    b: {
      farm: 4,
      fact: 2,
      solar: 3,
      tech: 1,
      quantum: 2,
      port: 1,
    },
    gx: {
      cond: { parl: 95 },
      lvl: { farm: 3, tech: 2 },
      acc: 10,
      blk: 0,
      pb: 0,
      ph: 0,
      log: [],
      exp: null,
    },
    sub: { tier: 'weekly' as const, exp: Date.now() + 86_400_000, lastClaimDay: '2026-11-26' },
    provinces: [
      { id: 'prov_1', slot: 1, name: 'Capital', flagId: 'crest_star', color: '#3fd2ff', gdp: 100_000, pop: 12, allocTotal: 50_000 },
      { id: 'prov_2', slot: 2, name: 'Harbor Zone', flagId: 'harbor_stripes', color: '#ffc23d', paidPrice: 200_000, gdp: 400_000, pop: 10, allocTotal: 100_000 },
    ],
  };

  const migrated1 = migrateState(legacyRaw);
  assert.equal(migrated1.gems, 42);
  assert.equal(migrated1.rank, MIN_RANK); // clamped safely from 0 to 1
  assert.equal(migrated1.b.farms, 4);
  assert.equal(migrated1.b.factories, 2);
  assert.equal(migrated1.b.solar_plants, 3);
  assert.equal(migrated1.b.tech_parks, 1);
  assert.equal(migrated1.b.data_centers, 2);
  assert.equal(migrated1.b.ports, 1);
  assert.equal(migrated1.gx.lvl.farms, 3);
  // Preserves original cash + adds proportional consolidation credit for slot > 1 & allocated budgets
  const expectedBonus = Math.round(50_000 * 0.8 + (200_000 * 0.5 + 100_000 * 0.8 + 400_000 * 0.25));
  assert.equal(migrated1.cash, 1_234_567 + expectedBonus);
  assert.ok(migrated1.pop > 48);
  assert.equal(migrated1.milestones?.__prov_migrated_v1, 1);
  assert.equal(migrated1.sub?.tier, 'weekly');
  assert.equal('provinces' in migrated1, false);

  // Idempotent replay: migrating already-migrated state does NOT double-credit or re-add buildings
  const migrated2 = migrateState(migrated1 as unknown as Record<string, unknown>);
  assert.equal(migrated2.cash, migrated1.cash);
  assert.equal(migrated2.pop, migrated1.pop);
  assert.equal(migrated2.b.farms, 4);
  assert.equal(migrated2.milestones?.__prov_migrated_v1, 1);

  // Clean save payload never exceeds Firestore caps (<=35 building keys) and omits provinces
  const cleaned = cleanSavePayload(migrated2);
  assert.equal('provinces' in cleaned, false);
  assert.ok(Object.keys(cleaned.b as Record<string, unknown>).length <= 35);
  assert.equal(Object.keys(cleaned.b as Record<string, unknown>).length, 35);
});

test('2. 51 buildings across 10 categories, unlock gates, timed construction queue (max 5), and completion', () => {
  assert.equal(BUILDINGS.length, 51);
  const cats = new Set(BUILDINGS.map((b) => b.cat));
  assert.deepEqual(
    [...cats].sort(),
    [
      'agriculture',
      'commercial',
      'energy',
      'healthcare_edu',
      'industry',
      'infrastructure',
      'public_services',
      'residential',
      'special',
      'technology',
    ],
  );

  const now = 1_750_000_000_000;
  let state = freshState();
  state.cash = 10_000_000;

  // Higher-rank building blocked at Rank 1
  const blockedRank = applyBuyBuilding(state, 'factories', 1, now);
  assert.equal(blockedRank.ok, false);
  assert.match(blockedRank.reason || '', /Rank 2/i);

  // Instant farm builds immediately (buildSec === 0)
  const bFarm = applyBuyBuilding(state, 'farms', 1, now);
  assert.equal(bFarm.ok, true);
  assert.equal(bFarm.instant, true);
  assert.equal(bFarm.newCount, 1);
  state = bFarm.state;

  // Give enough buildings to unlock greenhouses/roads/solar_plants/textile_mills/markets
  state.b.farms = 5;
  const q1 = applyBuyBuilding(state, 'markets', 1, now);
  assert.equal(q1.ok, true);
  assert.equal(q1.instant, false);
  assert.ok(q1.durationSec >= 2);
  state = q1.state;
  assert.equal(state.b.markets, 0); // Not added until timer finishes
  assert.equal(getConstructionQueue(state, now).length, 1);

  // Duplicate queue for same building blocked while active
  assert.equal(applyBuyBuilding(state, 'markets', 1, now + 1000).ok, false);

  // Queue up to MAX_CONSTRUCTION_QUEUE (5) slots, reject 6th
  state = applyBuyBuilding(state, 'textile_mills', 1, now).state;
  state = applyBuyBuilding(state, 'greenhouses', 1, now).state;
  state = applyBuyBuilding(state, 'roads', 1, now).state;
  state = applyBuyBuilding(state, 'solar_plants', 1, now).state;
  assert.equal(getConstructionQueue(state, now).length, MAX_CONSTRUCTION_QUEUE);

  // Wait before finishAt -> nothing completes early
  const before = tickConstructionQueue(state, now + 1000);
  assert.equal(before.completed.length, 0);

  // Advance past markets finishAt -> completes cleanly and grants building
  const finishMarketsAt = getConstructionQueue(state, now)[0].finishAt;
  const after = tickConstructionQueue(state, finishMarketsAt + 10);
  assert.ok(after.completed.some((c) => c.buildingId === 'markets' && c.qty === 1));
  assert.equal(after.state.b.markets, 1);
  assert.equal(getConstructionQueue(after.state, finishMarketsAt + 10).length, 4);
});

test('3. 9 National Policies have pros/cons, enforce 5-minute cooldown per category, and cleanSavePayload preserves caps', () => {
  assert.equal(NATIONAL_POLICIES.length, 9);
  const now = 1_750_000_000_000;
  let state = freshState();
  state.cash = 1_000_000;
  state.b.factories = 4;

  // All 9 policy categories fit cleanly inside tech (6 doctrines + 9 policies = 15 <= 16 Firestore limit)
  for (const cat of NATIONAL_POLICIES) {
    assert.equal(cat.options.length, 3);
    assert.ok(cat.options[1].pros.length > 0 && cat.options[1].cons.length > 0);
    const res = applyChangePolicyStance(state, cat.id, 1, now);
    assert.equal(res.ok, true, `Failed activating stance 1 for ${cat.id}: ${res.reason}`);
    state = res.state;
  }

  // Cooldown blocks rapid toggling of p_tax
  const flip = applyChangePolicyStance(state, 'p_tax', 2, now + 10_000);
  assert.equal(flip.ok, false);
  assert.match(flip.reason || '', /Cooldown/i);

  // Allowed after 5-minute cooldown expires
  const afterCd = applyChangePolicyStance(state, 'p_tax', 2, now + POLICY_CATEGORY_CD_MS + 100);
  assert.equal(afterCd.ok, true);

  // Check all 6 doctrines + 9 policies stay <= 16 entries in cleanSavePayload
  let maxedTech = afterCd.state;
  maxedTech.cash = 500_000_000;
  maxedTech.b.farms = 60;
  for (const t of TECH_TREE) {
    maxedTech = applyUnlockTech(maxedTech, t.id, now).state;
  }
  const cleaned = cleanSavePayload(maxedTech);
  assert.ok(Object.keys(cleaned.tech as Record<string, unknown>).length <= 16);
  assert.ok(Object.keys(cleaned.milestones as Record<string, unknown>).length <= 40);
});

test('4. Draft & Commit Fiscal Reform costs Coins and enforces 45s cooldown against tax-flipping exploits', () => {
  const now = 1_750_000_000_000;
  let state = freshState();
  state.cash = 50_000;
  state.b.farms = 5;

  const baseDraft = extractFiscalDraft(state);
  assert.equal(applyCommitFiscalReform(state, baseDraft, now).ok, false); // No changes

  const revDraft = presetToFiscalDraft(baseDraft, 'revenue');
  const enacted = applyCommitFiscalReform(state, revDraft, now);
  assert.equal(enacted.ok, true);
  assert.ok(enacted.cost >= 500);
  assert.equal(enacted.state.cash, 50_000 - enacted.cost);
  assert.equal(enacted.state.tax, 22);
  state = enacted.state;

  // Immediate tax flip before Collect Tax is blocked by 45s cooldown
  const blissDraft = presetToFiscalDraft(extractFiscalDraft(state), 'welfare');
  const blocked = applyCommitFiscalReform(state, blissDraft, now + 5_000);
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason || '', /cooldown/i);

  const afterCd = applyCommitFiscalReform(state, blissDraft, now + FISCAL_COMMIT_CD_MS + 100);
  assert.equal(afterCd.ok, true);
  assert.equal(afterCd.state.tax, 12);
});

test('5. 7 Boosters enforce daily Karachi limits, cooldowns, mutual exclusion, construction speed boost, and <=2.5x cap', () => {
  assert.equal(BOOSTERS.length, 7);
  const now = Date.UTC(2026, 10, 26, 10, 0, 0);
  let state = freshState();
  state.cash = 50_000_000;
  state.b.farms = 10;
  state.b.solar_plants = 2;

  // Queuing markets, then triggering build_speed_boost halves remaining time and sets 2.0x build speed
  state = applyBuyBuilding(state, 'markets', 1, now).state;
  const beforeFinish = getConstructionQueue(state, now)[0].finishAt;
  const speedDef = BOOSTERS.find((b) => b.id === 'build_speed_boost')!;
  const spdRes = applyBuyBooster(state, speedDef, now + 1000);
  assert.equal(spdRes.ok, true);
  state = spdRes.state;
  assert.equal(getBuildSpeedMultiplier(state, now + 2000), 2);
  const afterFinish = getConstructionQueue(state, now + 1000)[0].finishAt;
  assert.ok(afterFinish < beforeFinish);

  // Mutual exclusion between income_boost and growth_boost
  const incDef = BOOSTERS.find((b) => b.id === 'income_boost')!;
  const groDef = BOOSTERS.find((b) => b.id === 'growth_boost')!;
  state = applyBuyBooster(state, groDef, now + 2000).state;
  const blockedInc = applyBuyBooster(state, incDef, now + 5000);
  assert.equal(blockedInc.ok, false);

  // Combining growth_boost (1.6x + 20% trade) + gem 2x boost (2.0x) MUST stay capped <= 2.5x on gross output!
  const normalGross = calculateIncome(state, { nowMs: now + 5000, ignoreTempBoosters: true }).gross;
  state.boost = 30;
  const cappedGross = calculateIncome(state, { nowMs: now + 5000 }).gross;
  assert.ok(cappedGross / normalGross <= 2.501, `Expected capped temp mult <= 2.5x, got ${cappedGross / normalGross}`);

  // Daily cap rolls over on next Asia/Karachi calendar day
  let capState = freshState();
  capState.cash = 100_000_000;
  const taxDef = BOOSTERS.find((b) => b.id === 'tax_boost')!;
  let t = now;
  for (let i = 0; i < taxDef.dailyLimit; i++) {
    const r = applyBuyBooster(capState, taxDef, t);
    assert.equal(r.ok, true);
    capState = r.state;
    capState = applyCollectTax({ ...capState, taxPool: 1000 }, 0, t + 1000, () => 0.9).state;
    t += (taxDef.cd + 5) * 1000;
  }
  assert.equal(getBoosterActivationInfo(capState, 'tax_boost', t).usedToday, taxDef.dailyLimit);
  assert.equal(applyBuyBooster(capState, taxDef, t).ok, false);

  const nextDayMs = now + 86_400_000 * 2;
  assert.notEqual(karachiDateInt(now), karachiDateInt(nextDayMs));
  assert.equal(getBoosterActivationInfo(capState, 'tax_boost', nextDayMs).usedToday, 0);
  assert.equal(applyBuyBooster(capState, taxDef, nextDayMs).ok, true);
});

test('6. Multi-factor Rank 1..15 progression gates & Real GDP stability on cash spend', () => {
  assert.equal(MIN_RANK, 1);
  assert.equal(CLOUD_MAX_RANK, 15);
  assert.equal(MAX_RANK, 15);
  assert.equal(RANKS.length, 16);

  let state = freshState();
  state.cash = 100_000;
  // Cannot jump to Rank 2 without 6 buildings & 40K Real GDP
  const early = getRankEligibility(state, 2);
  assert.equal(early.eligible, false);
  assert.ok(early.missingBuildings > 0);
  assert.equal(applyBuyRank(state, 2).ok, false);

  // Meet Rank 2 gates cleanly
  state.b.farms = 6;
  state.hap = 60;
  state.cash = 150_000;
  const ready2 = getRankEligibility(state, 2);
  assert.equal(ready2.eligible, true);

  const promoted2 = applyBuyRank(state, 2);
  assert.equal(promoted2.ok, true);
  assert.equal(promoted2.state.rank, 2);
  assert.equal(promoted2.state.cash, 150_000 - RANKS[2].cost);

  // Buying a building invests cash into capital equity -> Real GDP stays resilient rather than crashing to 0
  const rich = { ...freshState(), cash: 50_000, b: { ...freshState().b, farms: 10, solar_plants: 2 } };
  const gdpBefore = calculateGdp(rich);
  const bought = applyBuyBuilding(rich, 'markets', 1, Date.now());
  assert.equal(bought.ok, true);
  assert.ok(calculateGdp(bought.state) > 0 && gdpBefore > 0);

  // Energy shortage creates drag penalty, Grid surplus lifts prodMult
  const starved = { ...freshState(), b: { ...freshState().b, steel_plants: 2 } };
  const powered = { ...freshState(), b: { ...freshState().b, steel_plants: 2, power_stations: 1 } };
  const sStarved = computeEconomySnapshot(starved);
  const sPowered = computeEconomySnapshot(powered);
  assert.ok(sStarved.energyFactor < 1);
  assert.ok(sPowered.energyFactor > 1);
  assert.ok(sPowered.net > sStarved.net);
});

test('7. Coin subscriptions (2h=100K, 3d=1M, 7d=10M) preserve exact expiry and block duplicates', () => {
  const now = 1_750_000_000_000;
  assert.equal(SUBSCRIPTIONS[0].cost, 100_000);
  assert.equal(SUBSCRIPTIONS[0].durMs, 2 * 3_600_000);
  assert.equal(SUBSCRIPTIONS[1].cost, 1_000_000);
  assert.equal(SUBSCRIPTIONS[1].durMs, 3 * 86_400_000);
  assert.equal(SUBSCRIPTIONS[2].cost, 10_000_000);
  assert.equal(SUBSCRIPTIONS[2].durMs, 7 * 86_400_000);

  let s = freshState();
  s.cash = 1_500_000;
  const r1 = applyBuySubscription(s, SUBSCRIPTIONS[0], now);
  assert.equal(r1.ok, true);
  assert.equal(r1.exp, now + 2 * 3_600_000);
  assert.equal(applyBuySubscription(r1.state, SUBSCRIPTIONS[0], now + 1000).ok, false);
});

import {
  applyClaimAchievement,
  applyClaimWeeklyMission,
  rotateWeeklyMissionsIfNeeded,
  selectWeeklyMissionIds,
  sortLeaderboardProfiles,
  weekKeyFor,
} from './rules';
import { ACHIEVEMENTS, WEEKLY_MISSIONS } from './constants';

test('8. Building demolition refunds 45%, per-building policies enforce exclusions, and Cabinet Decisions enforce cooldowns', () => {
  const now = 1_750_000_000_000;
  let state = freshState();
  state.cash = 5_000_000;
  state.b.factories = 4;
  state.b.textile_mills = 2;
  state.b.solar_plants = 2;

  assert.ok(BUILDING_POLICIES.length >= 6);
  const baseSnap = computeEconomySnapshot(state, { nowMs: now });
  const pol1 = applySetBuildingPolicy(state, 'factories', 'overtime_shift');
  assert.equal(pol1.ok, true);
  state = pol1.state;
  assert.equal(state.bPolicies?.factories, 'overtime_shift');
  const overtimeSnap = computeEconomySnapshot(state, { nowMs: now });
  assert.ok(overtimeSnap.sectorIncome.industry > baseSnap.sectorIncome.industry);

  const conflict = applySetBuildingPolicy(state, 'textile_mills', 'eco_operation');
  assert.equal(conflict.ok, false);
  assert.match(conflict.reason || '', /Conflicts/i);

  const cashBeforeDemolish = state.cash;
  const factoryDef = BUILDINGS.find((b) => b.id === 'factories')!;
  const dem = applyDemolishBuilding(state, 'factories', 1);
  assert.equal(dem.ok, true);
  assert.equal(dem.newCount, 3);
  assert.equal(dem.refund, getDemolishRefund(factoryDef, 1));
  assert.equal(dem.state.cash, cashBeforeDemolish + dem.refund);
  state = dem.state;

  const demAll = applyDemolishBuilding(state, 'factories', 3);
  assert.equal(demAll.ok, true);
  assert.equal(demAll.newCount, 0);
  assert.equal(demAll.state.bPolicies?.factories, undefined);
  assert.equal(applyDemolishBuilding(demAll.state, 'factories', 1).ok, false);

  state.rank = 5;
  state.b.farms = 25;
  state.gx.cond.parl = 70;
  const dec = NATIONAL_DECISIONS.find((d) => d.id === 'grid_modernization')!;
  const decRes = applyEnactNationalDecision(state, dec.id, now);
  assert.equal(decRes.ok, true);
  assert.equal(decRes.state.gx.cond.parl, 85);
  assert.equal(applyEnactNationalDecision(decRes.state, dec.id, now + 5000).ok, false);
});

test('9. Lossless v2 packing preserves Rank 15, all 51 active buildings, policies & achievements through Firestore rule cap', () => {
  const rich = freshState();
  rich.rank = 15;
  for (const d of BUILDINGS) {
    rich.b[d.id] = 5;
    rich.gx.lvl[d.id] = 3;
  }
  rich.bPolicies = { farms: 'eco_operation', space_center: 'premium_service' };
  rich.achievements = { ach_city_15: 1, ach_rank_15: 1 };
  rich.weeklyDay = '2026-W48';
  rich.weeklyClaimed = { wk_build_60: 1 };
  rich.cityTimeMode = 'night';
  rich.cityWeather = 'rain';

  const packed = cleanSavePayload(rich);
  assert.ok(Object.keys(packed.b as Record<string, unknown>).length <= 60);
  assert.ok(Object.keys((packed.gx as Record<string, unknown>).lvl as Record<string, unknown>).length <= 60);
  assert.equal(packed.rank, 15);
  assert.ok(Array.isArray(packed.provBudgetLog));
  assert.ok((packed.provBudgetLog as string[]).length <= 30);

  const restored = migrateState(packed as never);
  assert.equal(restored.rank, 15);
  assert.equal(totalBuildings(restored), BUILDINGS.length * 5);
  assert.equal(restored.b.space_center, 5);
  assert.equal(restored.gx.lvl.space_center, 3);
  assert.equal(restored.bPolicies?.space_center, 'premium_service');
  assert.equal(restored.achievements?.ach_rank_15, 1);
  assert.equal(restored.weeklyDay, '2026-W48');
  assert.equal(restored.weeklyClaimed?.wk_build_60, 1);
  assert.equal(restored.cityTimeMode, 'night');
  assert.equal(restored.cityWeather, 'rain');
});

test('10. Weekly missions rotate per ISO week, achievements grant idempotent rewards, and leaderboard sorting is deterministic', () => {
  const now = 1_750_000_000_000;
  const wk = weekKeyFor(now);
  let state = rotateWeeklyMissionsIfNeeded(freshState(), now);
  state.b.farms = 65;
  state.pop = 90;
  state.hap = 90;
  state.fused = 5;
  state.tech = { smart_grid: 1, eco_catalysis: 1, healthcare_act: 1, auto_customs: 1 };

  const activeIdx = selectWeeklyMissionIds(wk);
  assert.equal(activeIdx.length, 3);
  const firstWeekly = WEEKLY_MISSIONS[activeIdx[0]];
  const wClaim = applyClaimWeeklyMission(state, firstWeekly.id, wk, 1);
  if (firstWeekly.f(state) >= firstWeekly.g) {
    assert.equal(wClaim.ok, true);
    assert.equal(applyClaimWeeklyMission(wClaim.state, firstWeekly.id, wk, 1).ok, false);
  }

  const ach = ACHIEVEMENTS.find((a) => a.id === 'ach_city_15')!;
  const aClaim = applyClaimAchievement(state, ach.id);
  assert.equal(aClaim.ok, true);
  assert.equal(aClaim.gemsAdded, ach.rewardGems);
  assert.equal(aClaim.cashAdded, ach.rewardCash);
  assert.equal(applyClaimAchievement(aClaim.state, ach.id).ok, false);

  const pA = { id: 'a', username: 'Alpha', usernameLower: 'alpha', countryCode: 'PK', countryName: 'Pakistan', gdp: 1_000_000, cash: 50_000, gems: 5, level: 2, rank: 2, stats: { buildings: 100, completedTrades: 1, tradesSent: 0, tradesReceived: 0, cashTraded: 0, gemsTraded: 0 } };
  const pB = { id: 'b', username: 'Beta', usernameLower: 'beta', countryCode: 'US', countryName: 'United States', gdp: 2_000_000, cash: 100_000, gems: 10, level: 3, rank: 3, stats: { buildings: 10, completedTrades: 0, tradesSent: 0, tradesReceived: 0, cashTraded: 0, gemsTraded: 0 } };
  assert.equal(sortLeaderboardProfiles([pA, pB], 'overall')[0].id, 'b');
  assert.equal(sortLeaderboardProfiles([pA, pB], 'buildingDev')[0].id, 'a');
});

