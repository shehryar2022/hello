import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOSTERS,
  BUILDINGS,
  CRATE_COST_CASH,
  CRATE_COST_GEMS,
  DAILY_REWARDS,
  MAX_RANK,
  MIN_RANK,
  RANKS,
  STICKERS,
  SUBSCRIPTIONS,
  TAB_META,
  TECH_TREE,
} from './constants';
import {
  ALLOWED_SAVE_KEYS,
  applyActivateGemBoost,
  applyBuyBooster,
  applyBuyBuilding,
  applyBuyRank,
  applyBuySubscription,
  applyChangeGov,
  applyCollectTax,
  applyCommitFiscalReform,
  applyFixInfra,
  applyOfflineEarnings,
  applyUnlockTech,
  applyUpgradeBuilding,
  buildingCost,
  bulkBuildingCost,
  buyStickerCrate,
  calculateGdp,
  calculateIncome,
  calculateTaxCollect,
  canBuyBooster,
  canBuySubscription,
  claimMilestone,
  claimSubscriptionDaily,
  cleanSavePayload,
  computeDailyAndOfflineChecks,
  extractFiscalDraft,
  freshState,
  fuseSticker,
  getActiveSubscription,
  getDevelopmentDiscount,
  getInfraDecayMult,
  getProjectSpeedMult,
  getRecommendedBoosters,
  getRecommendedBuildings,
  getRecommendedPolicyHint,
  getRecommendedShopItems,
  getRecommendedTech,
  getSubscriptionPrice,
  getTaxPoolCapSeconds,
  getTechIncomeMult,
  gxRepairCost,
  gxUpgradeCost,
  hasTech,
  isProfileSubActive,
  migrateState,
  MILESTONES,
  presetToFiscalDraft,
  resolveExecutiveDecision,
  rollTradePortExport,
  rollWeeklySubPromo,
  sanitizeStats,
  shouldRunOfflineEntryCheck,
  targetHappiness,
  taxInfo,
  totalBuildings,
  weekKeyFor,
} from './rules';

test('bank and province tabs are removed and state migration strips loans & provinces', () => {
  assert.equal('bank' in TAB_META, false);
  assert.equal('provinces' in TAB_META, false);
  const legacyWithLoan = {
    ...freshState(),
    cash: 50_000,
    loan: { amt: 25_000 },
    deals: [{ id: 'old' }],
    provinces: [{ id: 'prov_1', slot: 1, name: 'Old', gdp: 1000, pop: 1, allocTotal: 0 }],
  } as Record<string, unknown>;
  const migrated = migrateState(legacyWithLoan);
  assert.equal('loan' in migrated, false);
  assert.equal('deals' in migrated, false);
  assert.equal('provinces' in migrated, false);
  assert.ok(calculateGdp(migrated) >= 1000);
});

test('shop boosters are limited: cannot stack income boosters and multipliers stay bounded <= 2.5x', () => {
  const now = 1_700_000_000_000;
  let state = freshState();
  state.cash = 10_000_000;

  const incBoost = BOOSTERS.find((b) => b.id === 'income_boost')!;
  const growthBoost = BOOSTERS.find((b) => b.id === 'growth_boost')!;

  const r1 = applyBuyBooster(state, growthBoost, now);
  assert.equal(r1.ok, true);
  state = r1.state;
  assert.equal(state.cash, 10_000_000 - growthBoost.cost);
  assert.equal(state.activeFx.incomeBoostMult, 1.6);

  const r2 = canBuyBooster(state, incBoost, now + 10_000);
  assert.equal(r2.ok, false);
  assert.match(r2.reason || '', /already active/i);

  const r3 = applyBuyBooster(state, incBoost, now + 125_000);
  assert.equal(r3.ok, true);
  assert.equal(r3.state.activeFx.incomeBoostMult, 1.35);
});

test('tax_boost bonus is limited to +30% and capped at 2 minutes of unboosted base income', () => {
  const now = 1_700_000_000_000;
  let state = freshState();
  state.cash = 2_000_000;
  state.b.tech_parks = 3;
  state.boost = 30;
  const growthBoost = BOOSTERS.find((b) => b.id === 'growth_boost')!;
  state = applyBuyBooster(state, growthBoost, now).state;

  const taxBoost = BOOSTERS.find((b) => b.id === 'tax_boost')!;
  state = applyBuyBooster(state, taxBoost, now + 1000).state;

  const baseNet = calculateIncome(state, { nowMs: now + 1000, ignoreTempBoosters: true }).net;

  state.taxPool = baseNet * 1000;
  const hugeCollect = calculateTaxCollect(state, 0, now + 1000);
  assert.equal(hugeCollect.bonusApplied, true);
  assert.equal(hugeCollect.bonusAmount, Math.floor(baseNet * 120));

  state.taxPool = 1000;
  const smallCollect = calculateTaxCollect(state, 0, now + 1000);
  assert.equal(smallCollect.bonusApplied, true);
  assert.equal(smallCollect.bonusAmount, 300);
});

test('building costs scale by costScale, bulkBuildingCost matches sum, and upkeep stays bounded', () => {
  const farms = BUILDINGS.find((b) => b.id === 'farms')!;
  assert.equal(buildingCost(farms, 0), 150);
  assert.equal(buildingCost(farms, 1), 180);
  const sum5 = [0, 1, 2, 3, 4].reduce((a, i) => a + buildingCost(farms, i), 0);
  assert.equal(bulkBuildingCost(farms, 0, 5), sum5);

  const state = freshState();
  state.b.farms = 300;
  state.b.power_stations = 10;
  const inc = calculateIncome(state);
  assert.ok(inc.net > 0, 'Large city net income must stay positive when upkeep is capped');
  assert.ok(inc.upkeep <= inc.gross * 0.46 + 0.001);
});

test('ranks 1..15 progress strictly in sequential order after meeting multi-factor requirements', () => {
  assert.equal(MIN_RANK, 1);
  assert.equal(MAX_RANK, 15);
  assert.equal(RANKS.length, 16);
  assert.equal(RANKS[1].cost, 0);
  assert.equal(RANKS[2].cost, 25_000);
  assert.equal(RANKS[6].cost, 15_000_000);
  assert.equal(RANKS[10].cost, 3_500_000_000);
  assert.equal(RANKS[15].cost, 280_000_000_000);

  let state = freshState();
  state.cash = 1_500_000_000_000;
  state.hap = 85;
  for (const b of BUILDINGS) {
    state.b[b.id] = 45;
    state.gx.lvl[b.id] = 5;
  }
  for (const t of TECH_TREE) {
    state = applyUnlockTech(state, t.id).state;
  }
  const baseSnap = calculateIncome(state);

  const skip = applyBuyRank(state, 3);
  assert.equal(skip.ok, false);

  for (let r = 2; r <= MAX_RANK; r++) {
    const res = applyBuyRank(state, r);
    assert.equal(res.ok, true, `Failed promoting to rank ${r}: ${res.reason}`);
    state = res.state;
  }
  assert.equal(state.rank, 15);
  const rankedSnap = calculateIncome(state);
  assert.ok(Math.abs(rankedSnap.gross / baseSnap.gross - 1.55) < 0.001, 'Rank 15 gives +55% national income bonus');
  assert.ok(rankedSnap.net > baseSnap.net);
});

test('sticker fusion & crates (standard 5m CD cash crate and royal gem crate)', () => {
  const now = 1_750_000_000_000;
  const state = freshState();
  state.stk = { bee: 3 };
  const res = fuseSticker(state, 'bee', () => 0);
  assert.equal(res.ok, true);
  assert.equal(res.state.fused, 1);
  assert.equal(res.state.stk.bee, undefined);
  assert.equal(res.granted?.r, 2);
  assert.ok(STICKERS.some((s) => s.id === res.granted?.id));

  const crateState = freshState();
  crateState.cash = CRATE_COST_CASH * 2;
  crateState.gems = CRATE_COST_GEMS;

  const c1 = buyStickerCrate(crateState, 'cash', now, () => 0.1);
  assert.equal(c1.ok, true);
  assert.equal(c1.granted.length, 1);
  assert.equal(c1.state.cash, CRATE_COST_CASH);

  const c2 = buyStickerCrate(c1.state, 'cash', now + 60_000, () => 0.1);
  assert.equal(c2.ok, false);
  assert.match(c2.reason || '', /cooldown/i);

  const g1 = buyStickerCrate(c1.state, 'gems', now + 1000, () => 0.1);
  assert.equal(g1.ok, true);
  assert.equal(g1.granted.length, 2);
  assert.ok(g1.granted[0].r >= 2);
  assert.equal(g1.state.gems, 0);
});

test('trade port export drops gems or stickers on meaningful tax collection', () => {
  const s = freshState();
  s.b.ports = 2;
  const noPortDrop = rollTradePortExport(freshState(), 1000, 10, () => 0);
  assert.equal(noPortDrop.gems, 0);
  assert.equal(noPortDrop.sticker, null);

  const gemDrop = rollTradePortExport(s, 1000, 10, () => 0.01);
  assert.equal(gemDrop.gems, 1);

  let call = 0;
  const seq = [0.01, 0.9, 0.2, 0];
  const stkDrop = rollTradePortExport(s, 1000, 10, () => seq[call++] ?? 0);
  assert.equal(stkDrop.gems, 0);
  assert.ok(stkDrop.sticker !== null);
});

test('offline earnings credit 20% to taxPool capped at 30 minutes and ignore temp boosters', () => {
  const now = 1_700_000_000_000;
  const state = freshState();
  state.b.factories = 2;
  state.b.solar_plants = 2;
  state.boost = 30;
  state.t = now - 3_600_000;
  const baseNet = calculateIncome(state, { nowMs: now, ignoreTempBoosters: true }).net;
  const res = applyOfflineEarnings(state, now);
  assert.equal(res.wasCapped, true);
  assert.equal(res.awaySec, 1800);
  assert.ok(Math.abs(res.credited - baseNet * 1800 * 0.2) < 0.01);
  assert.equal(totalBuildings(res.state), 4);
});

test('fiscal reform drafts, milestones, target happiness, and daily quests', () => {
  const state = freshState();
  state.cash = 100_000;
  state.tax = 45;
  state.prop = 15;
  state.wel = 0;
  assert.equal(targetHappiness(state), 5);

  const baseDraft = extractFiscalDraft(state);
  const balanced = applyCommitFiscalReform(state, presetToFiscalDraft(baseDraft, 'balanced'), 1_750_000_000_000).state;
  assert.equal(taxInfo(balanced).ev, 0);

  const revenue = applyCommitFiscalReform(state, presetToFiscalDraft(baseDraft, 'revenue'), 1_750_000_100_000).state;
  const bliss = applyCommitFiscalReform(state, presetToFiscalDraft(baseDraft, 'welfare'), 1_750_000_200_000).state;
  assert.equal(bliss.tax, 12);
  assert.equal(bliss.wel, 32);
  assert.equal(taxInfo(bliss).ev, 0);
  assert.ok(targetHappiness(bliss) > 60);
  assert.ok(taxInfo(revenue).mult > taxInfo(balanced).mult);
  assert.ok(taxInfo(balanced).mult > taxInfo(bliss).mult);
  assert.ok(calculateIncome(revenue).net > calculateIncome(balanced).net);
  assert.ok(calculateIncome(balanced).net > calculateIncome(bliss).net);

  bliss.b.farms = 5;
  const msRes = claimMilestone(bliss, MILESTONES[0].id);
  assert.equal(msRes.ok, true);
  assert.equal(msRes.gemsAdded, MILESTONES[0].r);
  assert.equal(claimMilestone(msRes.state, MILESTONES[0].id).ok, false);

  const stats = sanitizeStats({ buildings: 4 });
  assert.deepEqual(Object.keys(stats).sort(), [
    'buildings',
    'cashTraded',
    'completedTrades',
    'gemsTraded',
    'tradesReceived',
    'tradesSent',
  ]);
});

test('normalizeProject never sets a 1970 deadline when startedAt is null/pending', async () => {
  const { normalizeProject } = await import('../firebase/api');
  const fallbackNow = 1_750_000_000_000;
  const proj = normalizeProject(
    'proj_1',
    {
      uid: 'u1',
      type: 'school',
      paid: 1,
      progressMs: 0,
      status: 'active',
      claimed: false,
      startedAt: null,
    },
    fallbackNow,
  );
  assert.equal(proj.st, fallbackNow);
  assert.ok(proj.dl > fallbackNow);

  const clientSkewedTs = { toMillis: () => fallbackNow - 10 * 3600_000 };
  const pendingProj = normalizeProject(
    'proj_2',
    {
      uid: 'u1',
      type: 'hospital',
      paid: 1,
      progressMs: 0,
      status: 'active',
      claimed: false,
      startedAt: clientSkewedTs,
    },
    fallbackNow,
    true,
  );
  assert.equal(pendingProj.pending, true);
  assert.equal(pendingProj.st, fallbackNow);
  assert.ok(pendingProj.dl > fallbackNow);
});

test('subscriptions use Coins (100K/1M/10M for 2h/3d/7d), never touch Diamonds, track start & expiry, prevent duplicates & expire cleanly', () => {
  const now = 1_750_000_000_000;
  const sub2h = SUBSCRIPTIONS.find((s) => s.id === 'daily')!;
  const sub3d = SUBSCRIPTIONS.find((s) => s.id === 'weekly')!;
  const sub7d = SUBSCRIPTIONS.find((s) => s.id === 'monthly')!;

  assert.equal(sub2h.currency, 'coins');
  assert.equal(sub2h.cost, 100_000);
  assert.equal(sub2h.durMs, 2 * 3_600_000);
  assert.equal(sub2h.incomeMult, 1.04);
  assert.equal(sub2h.discountRate, 0.03);
  assert.equal(sub2h.dailyCash, 25_000);

  assert.equal(sub3d.currency, 'coins');
  assert.equal(sub3d.cost, 1_000_000);
  assert.equal(sub3d.durMs, 3 * 86_400_000);
  assert.equal(sub3d.incomeMult, 1.08);
  assert.equal(sub3d.discountRate, 0.06);
  assert.equal(sub3d.dailyCash, 150_000);

  assert.equal(sub7d.currency, 'coins');
  assert.equal(sub7d.cost, 10_000_000);
  assert.equal(sub7d.durMs, 7 * 86_400_000);
  assert.equal(sub7d.incomeMult, 1.12);
  assert.equal(sub7d.discountRate, 0.1);
  assert.equal(sub7d.dailyCash, 750_000);

  const poorCashRichGems = freshState();
  poorCashRichGems.cash = 99_999;
  poorCashRichGems.gems = 9999;
  const denied2h = applyBuySubscription(poorCashRichGems, sub2h, now);
  assert.equal(denied2h.ok, false);
  assert.match(denied2h.reason || '', /Not enough Coins/i);
  assert.equal(denied2h.state.cash, 99_999);
  assert.equal(denied2h.state.gems, 9999);

  const nanCash = { ...freshState(), cash: Number.NaN, gems: 500 };
  assert.equal(applyBuySubscription(nanCash, sub2h, now).ok, false);
  assert.equal(applyBuySubscription({ ...freshState(), cash: -100, gems: 500 }, sub2h, now).ok, false);

  let state = freshState();
  state.cash = 15_000_000;
  state.gems = 7;
  state.b.farms = 10;
  state.b.solar_plants = 2;
  state.gx.cond.parl = 50;

  const baseSnap = calculateIncome(state, { nowMs: now });
  const baseInc = baseSnap.net;
  const baseGross = baseSnap.gross;
  const farmsDef = BUILDINGS.find((b) => b.id === 'farms')!;
  const baseFarmsCost = buildingCost(farmsDef, 10);
  const baseRepair = gxRepairCost(state, 'parl', false, now);
  const baseUpgrade = gxUpgradeCost(state, 'farms', now);

  const sub1 = applyBuySubscription(state, sub2h, now);
  assert.equal(sub1.ok, true);
  assert.equal(sub1.paidCost, 100_000);
  assert.equal(sub1.startAt, now);
  assert.equal(sub1.exp, now + 2 * 3_600_000);
  state = sub1.state;
  assert.equal(state.cash, 14_900_000);
  assert.equal(state.gems, 7, 'Diamonds must never be deducted when buying subscription');
  assert.equal(state.sub?.exp, now + 2 * 3_600_000);
  assert.equal(getActiveSubscription(state, now)?.startedAt, now);
  assert.ok(state.gx.log[0].includes('2 Hours Pass') && state.gx.log[0].includes('100.0K'));
  assert.equal(getDevelopmentDiscount(state, now), 0.03);
  assert.equal(getProjectSpeedMult(state, now), 1.05);
  const subSnap = calculateIncome(state, { nowMs: now });
  assert.ok(Math.abs(subSnap.gross / baseGross - 1.04) < 0.001);
  assert.ok(subSnap.net > baseInc);
  assert.ok(buildingCost(farmsDef, 10, getDevelopmentDiscount(state, now)) < baseFarmsCost);
  assert.ok(gxRepairCost(state, 'parl', false, now) < baseRepair);
  assert.ok(gxUpgradeCost(state, 'farms', now) < baseUpgrade);

  assert.equal(canBuySubscription(state, sub2h, now + 1000).ok, false);
  const dup2h = applyBuySubscription(state, sub2h, now + 1000);
  assert.equal(dup2h.ok, false);
  assert.equal(dup2h.state.cash, 14_900_000);

  const c1 = claimSubscriptionDaily(state, '2026-11-25', now + 2000);
  assert.equal(c1.ok, true);
  assert.equal(c1.cashAdded, 25_000);
  state = c1.state;

  assert.equal(claimSubscriptionDaily(state, '2026-11-25', now + 3000).ok, false);

  const gemsBeforeUpgrade = state.gems;
  const cashBeforeUpgrade = state.cash;
  const sub2 = applyBuySubscription(state, sub3d, now + 4000);
  assert.equal(sub2.ok, true);
  state = sub2.state;
  assert.equal(state.gems, gemsBeforeUpgrade);
  assert.equal(state.cash, cashBeforeUpgrade - 1_000_000);
  assert.equal(state.sub?.exp, now + 4000 + 3 * 86_400_000);
  assert.equal(getActiveSubscription(state, now + 5000)?.def.id, 'weekly');
  assert.equal(getActiveSubscription(state, now + 5000)?.startedAt, now + 4000);
  assert.equal(canBuySubscription(state, sub2h, now + 5000).ok, false);
  assert.equal(claimSubscriptionDaily(state, '2026-11-25', now + 5000).ok, false);

  const c2 = claimSubscriptionDaily(state, '2026-11-26', now + 86_400_000);
  assert.equal(c2.ok, true);
  assert.equal(c2.cashAdded, 150_000);
  assert.equal(c2.gemsAdded, 1);
  state = c2.state;

  const afterExpiry = now + 4000 + 3 * 86_400_000 + 1000;
  assert.equal(getActiveSubscription(state, afterExpiry), null);
  assert.equal(getDevelopmentDiscount(state, afterExpiry), 0);
  assert.equal(getProjectSpeedMult(state, afterExpiry), 1);
  assert.equal(calculateIncome(state, { nowMs: afterExpiry }).net, calculateIncome({ ...state, sub: {} }, { nowMs: afterExpiry }).net);
  const resub2h = applyBuySubscription(state, sub2h, afterExpiry);
  assert.equal(resub2h.ok, true);
  assert.equal(resub2h.state.cash, state.cash - 100_000);

  const weeklyBuy = applyBuySubscription({ ...freshState(), cash: 10_000_000, gems: 3 }, sub7d, now);
  assert.equal(weeklyBuy.ok, true);
  assert.equal(weeklyBuy.state.cash, 0);
  assert.equal(weeklyBuy.state.gems, 3);
  assert.equal(weeklyBuy.state.sub?.exp, now + 7 * 86_400_000);
  assert.equal(getActiveSubscription(weeklyBuy.state, now + 1000)?.startedAt, now);

  const payload = cleanSavePayload(weeklyBuy.state);
  const restored = migrateState(payload as never);
  assert.equal(restored.sub?.tier, 'monthly');
  assert.equal(restored.sub?.exp, now + 7 * 86_400_000);
  assert.equal(restored.cash, 0);
});

test('government renovation depends strictly on 20% of building development (unaffected by temp boosters)', () => {
  const state = freshState();
  state.b.tech_parks = 5;
  state.gx.cond.parl = 60;
  state.gx.cond.road = 60;

  const baseParlFull = gxRepairCost(state, 'parl', true);
  assert.ok(baseParlFull > 0);

  state.boost = 30;
  state.tax = 45;
  assert.equal(gxRepairCost(state, 'parl', true), baseParlFull);

  state.gx.cond.parl = 100;
  assert.equal(gxRepairCost(state, 'parl', true), 0);
});

test('51 national buildings and 16 policies function cleanly', () => {
  assert.equal(BUILDINGS.length, 51);
  for (const id of ['farms', 'food_plant', 'steel_plants', 'wind_farms', 'railways', 'shopping_centers', 'tech_parks', 'data_centers', 'universities']) {
    assert.ok(BUILDINGS.some((b) => b.id === id), `Missing building ${id}`);
  }

  const base = freshState();
  base.b.wind_farms = 2;
  base.b.shopping_centers = 2;
  base.b.factories = 1;
  base.b.power_stations = 1;
  base.b.roads = 2;
  base.b.tech_parks = 1;
  base.b.ports = 1;
  base.b.data_centers = 1;
  base.b.airports = 2;
  const incBefore = calculateIncome(base).gross;
  const hapBefore = targetHappiness(base);

  const boosted = migrateState({
    ...base,
    tourism: 15,
    digital: 15,
    rd: 20,
    green: 20,
    wealth: 10,
    transitSub: 18,
    tax: 999,
    boost: 999,
  });
  assert.equal(boosted.tax, 45);
  assert.equal(boosted.boost, 30);
  assert.equal(boosted.tourism, 15);
  assert.equal(boosted.digital, 15);
  assert.equal(boosted.rd, 20);
  assert.equal(boosted.green, 20);
  assert.equal(boosted.wealth, 10);
  assert.equal(boosted.transitSub, 18);
  assert.ok(calculateIncome(boosted).gross > incBefore);

  const transitHapBoost = migrateState({ ...base, transitSub: 25 });
  assert.ok(targetHappiness(transitHapBoost) > hapBefore);
});

test('rebalanced economy invariants: starter cash 260, emp_boost morale lift, and 0% approval taxInfo', () => {
  const fresh = freshState();
  assert.equal(fresh.cash, 260);

  const farms = BUILDINGS.find((b) => b.id === 'farms')!;
  const hospitals = BUILDINGS.find((b) => b.id === 'hospitals')!;
  const business = BUILDINGS.find((b) => b.id === 'business_districts')!;
  const dataCenters = BUILDINGS.find((b) => b.id === 'data_centers')!;

  assert.ok(fresh.cash >= farms.cost, 'Starter cash must allow buying first Farm');
  assert.ok(business.cost / business.inc < hospitals.cost / hospitals.inc);
  assert.ok(dataCenters.cost / dataCenters.inc < business.cost / business.inc);

  const empBoost = BOOSTERS.find((b) => b.id === 'emp_boost')!;
  const hapBase = freshState();
  hapBase.cash = 200_000;
  hapBase.hap = 60;
  const hapRes = applyBuyBooster(hapBase, empBoost, 1_750_000_000_000);
  assert.equal(hapRes.ok, true);
  assert.equal(hapRes.state.hap, 68);

  const zeroAppr = freshState();
  zeroAppr.tax = 30;
  zeroAppr.appr = 0;
  const halfAppr = freshState();
  halfAppr.tax = 30;
  halfAppr.appr = 50;
  assert.ok(taxInfo(zeroAppr).ev > taxInfo(halfAppr).ev, '0% approval must trigger higher evasion than 50% approval');
});

test('National Research Lab doctrines unlock with building prerequisites and apply balanced buffs', () => {
  let state = freshState();
  state.cash = 100_000_000;
  state.b.farms = 5;
  assert.equal(TECH_TREE.length, 6);

  const blocked = applyUnlockTech(state, 'smart_grid');
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason || '', /buildings/i);

  state.b.farms = 15;
  state.b.factories = 5;
  state.b.hospitals = 5;
  state.b.ports = 25;
  const baseNet = calculateIncome(state).net;
  const baseHap = targetHappiness(state);
  assert.equal(getTaxPoolCapSeconds(state), 1800);
  assert.equal(getInfraDecayMult(state), 1);

  const u1 = applyUnlockTech(state, 'smart_grid');
  assert.equal(u1.ok, true);
  state = u1.state;
  assert.equal(hasTech(state, 'smart_grid'), true);
  assert.equal(getInfraDecayMult(state), 0.8);
  assert.ok(getTechIncomeMult(state) > 1.03);

  state = applyUnlockTech(state, 'eco_catalysis').state;
  state = applyUnlockTech(state, 'healthcare_act').state;
  assert.ok(targetHappiness(state) > baseHap + 5);

  state = applyUnlockTech(state, 'civil_corps').state;
  assert.equal(getDevelopmentDiscount(state), 0.05);
  assert.ok(Math.abs(getProjectSpeedMult(state) - 1.15) < 0.001);

  const sv = applyUnlockTech(state, 'sovereign_vault');
  assert.equal(sv.ok, true);
  state = sv.state;
  assert.equal(getTaxPoolCapSeconds(state), 2400);
  assert.ok(calculateIncome(state).net > baseNet * 1.07);

  assert.equal(applyUnlockTech(state, 'smart_grid').ok, false);
});

test('Executive Decisions and leaderboard sub visibility helper work cleanly', () => {
  const now = 1_750_000_000_000;
  const state = freshState();
  state.cash = 1_000_000;
  state.hap = 50;
  state.appr = 50;
  state.b.tech_parks = 3;

  const cashBefore = state.cash;
  const decGain = resolveExecutiveDecision(state, 'tech_expo', 1, 0, now);
  assert.equal(decGain.ok, true);
  assert.ok(decGain.state.cash > cashBefore);
  assert.equal(decGain.state.hap, 46);

  const decSpend = resolveExecutiveDecision(state, 'tech_expo', 0, 0, now);
  assert.equal(decSpend.ok, true);
  assert.equal(decSpend.state.gems, state.gems + 1);
  assert.equal(decSpend.state.hap, 58);

  assert.equal(isProfileSubActive({ subTier: 'weekly', subExp: now + 60_000 }, now), 'weekly');
  assert.equal(isProfileSubActive({ subTier: 'weekly', subExp: now - 1 }, now), null);
  assert.equal(isProfileSubActive({ subTier: '', subExp: now + 60_000 }, now), null);
});

test('weekly random subscription discount locks per weekKey, expires after 72h, and applies discounted price', () => {
  const week1Now = 1_750_000_000_000;
  let state = freshState();
  const monthly = SUBSCRIPTIONS.find((s) => s.id === 'monthly')!;

  const r1 = rollWeeklySubPromo(state, week1Now, () => 0.9);
  assert.equal(r1.rolled, true);
  assert.equal(r1.promo?.tier, 'monthly');
  assert.equal(r1.promo?.pct, 35);
  state = r1.state;

  const reroll = rollWeeklySubPromo(state, week1Now + 3600_000, () => 0.05);
  assert.equal(reroll.rolled, false);
  assert.equal(reroll.promo?.tier, 'monthly');
  assert.equal(reroll.promo?.pct, 35);

  const pActive = getSubscriptionPrice(state, monthly, week1Now + 1000);
  assert.equal(pActive.promoActive, true);
  assert.equal(pActive.discountPct, 35);
  assert.equal(pActive.finalCost, 6_500_000);

  state.cash = 7_000_000;
  state.gems = 42;
  assert.equal(canBuySubscription(state, monthly, week1Now + 1000).ok, true);
  const bought = applyBuySubscription(state, monthly, week1Now + 1000);
  assert.equal(bought.ok, true);
  assert.equal(bought.paidCost, 6_500_000);
  assert.equal(bought.state.cash, 500_000);
  assert.equal(bought.state.gems, 42);

  const pExpired = getSubscriptionPrice(state, monthly, week1Now + 73 * 3_600_000);
  assert.equal(pExpired.promoActive, false);
  assert.equal(pExpired.finalCost, 10_000_000);

  const nextWeekNow = week1Now + 7 * 86_400_000;
  assert.notEqual(weekKeyFor(week1Now), weekKeyFor(nextWeekNow));
  const r2 = rollWeeklySubPromo(state, nextWeekNow, () => 0.01);
  assert.equal(r2.rolled, true);
  assert.equal(r2.promo?.tier, 'daily');
  assert.equal(r2.promo?.pct, 15);
});

test('36 stickers and smart recommendation highlights work accurately', () => {
  assert.equal(STICKERS.length, 36);
  for (const id of ['turtle', 'dove', 'pegasus', 'sphinx', 'atlas', 'nebula']) {
    assert.ok(STICKERS.some((s) => s.id === id), `Missing sticker ${id}`);
  }

  const now = 1_750_000_000_000;
  const s = freshState();
  s.cash = 500_000;
  s.hap = 40;
  s.appr = 40;
  s.b.farms = 15;
  s.b.factories = 5;
  s.b.hospitals = 5;
  s.taxPool = 50_000;

  const bRecs = getRecommendedBuildings(s, 1, now);
  assert.ok(Object.values(bRecs).length >= 1);

  const boostRecs = getRecommendedBoosters(s, now);
  assert.equal(boostRecs.emp_boost, 'Morale & Jobs');
  assert.equal(boostRecs.tax_boost, 'Tax Cashout');
  assert.equal(boostRecs.growth_boost, 'Top Output');

  const techRecs1 = getRecommendedTech({ ...s, cash: 2_000_000 });
  assert.equal(techRecs1.eco_catalysis, 'Happiness Fix');
  const techRecs2 = getRecommendedTech({ ...s, cash: 2_000_000, tech: { eco_catalysis: 1 } });
  assert.equal(techRecs2.healthcare_act, 'Happiness Fix');

  const highEv = { ...s, tax: 45, prop: 15, corp: 30 };
  assert.equal(getRecommendedPolicyHint(highEv).id, 'balanced');

  const shopRec = getRecommendedShopItems(
    { ...s, cash: 500_000_000, gems: 500, hap: 75, subPromo: { weekKey: weekKeyFor(now), tier: 'weekly', pct: 25, exp: now + 3_600_000 } },
    now,
  );
  assert.equal(shopRec.nextRankId, 2);
  assert.equal(shopRec.rankReason, 'Ready Promote');
  assert.equal(shopRec.subTier, 'weekly');
  assert.equal(shopRec.subReason, 'Weekly Deal −25%');
});

test('cleanSavePayload strips undefined/country/provinces fields and clamps all values within Firestore rules limits', () => {
  const dirty = freshState() as unknown as Record<string, unknown>;
  dirty.cash = 9e15;
  dirty.gems = 9e12 + 0.75;
  dirty.taxPool = 9e15;
  dirty.rank = 99;
  dirty.fused = 5_000_000.9;
  dirty.streak = 99_999.4;
  dirty.activeFx = {
    incomeBoostEnd: undefined,
    incomeBoostMult: undefined,
    incomeBoostId: undefined,
    taxSurge: 1,
  };
  dirty.boosterCd = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`b_${i}`, 123]));
  dirty.avHist = [1.2, 2.3];
  dirty.avs = { n: 0, b: 0, w: 0, r: 0 };
  dirty.legacyFoo = 'stale_legacy';
  (dirty.b as Record<string, number>).legacyHotel = 42;
  const cleaned = cleanSavePayload(dirty as never);

  assert.equal('country' in cleaned, false);
  assert.equal('provinces' in cleaned, false);
  assert.equal('avHist' in cleaned, false);
  assert.equal('avs' in cleaned, false);
  assert.equal('legacyFoo' in cleaned, false);
  assert.equal('legacyHotel' in (cleaned.b as Record<string, unknown>), false);
  assert.ok(Object.keys(cleaned.b as Record<string, unknown>).length <= 60);
  assert.equal(cleaned.cash, 1e13);
  assert.equal(cleaned.gems, 1e9);
  assert.equal(cleaned.taxPool, 1e13);
  assert.equal(cleaned.rank, 15);
  assert.equal(migrateState(cleaned as never).rank, MAX_RANK);
  assert.equal(cleaned.fused, 1_000_000);
  assert.equal(cleaned.streak, 10_000);
  const fx = cleaned.activeFx as Record<string, unknown>;
  assert.equal('incomeBoostEnd' in fx, false);
  assert.equal('incomeBoostMult' in fx, false);
  assert.equal(fx.taxSurge, 1);
  assert.ok(Object.keys(cleaned.boosterCd as Record<string, unknown>).length <= 20);
  assert.ok(Object.keys(cleaned).length <= 72);

  const weird = freshState() as unknown as Record<string, unknown>;
  weird.cash = Number.NaN;
  weird.gems = -0;
  weird.rank = -0;
  weird.fused = 3.9;
  weird.streak = Number.POSITIVE_INFINITY;
  weird.day = Number.NaN;
  weird.ev = Number.NEGATIVE_INFINITY;
  const cleanedWeird = cleanSavePayload(weird as never);
  assert.equal(cleanedWeird.cash, 260);
  assert.equal(Object.is(cleanedWeird.gems, 0), true);
  assert.equal(cleanedWeird.rank, MIN_RANK);
  assert.equal(cleanedWeird.fused, 3);
  assert.equal(cleanedWeird.streak, 0);
  assert.equal(cleanedWeird.day, 0);
  assert.equal(cleanedWeird.ev, 40);
});

test('atomic gameplay updaters prevent double-click double-spend, double-collect, and double-claim', () => {
  const now = 1_750_000_000_000;
  let state = freshState();
  state.cash = 250;
  state.gems = 6;
  state.taxPool = 1000;
  state.activeFx = { taxSurge: 1 };

  const t1 = applyCollectTax(state, 0, now, () => 0.9);
  assert.equal(t1.ok, true);
  assert.equal(t1.bonusApplied, true);
  assert.equal(t1.state.taxPool, 0);
  assert.equal(t1.state.activeFx.taxSurge, 0);
  assert.equal(applyCollectTax(t1.state, 0, now, () => 0.9).ok, false);

  const buyState = freshState();
  buyState.cash = 180;
  const b1 = applyBuyBuilding(buyState, 'farms', 1, now);
  assert.equal(b1.ok, true);
  assert.equal(b1.newCount, 1);
  assert.equal(b1.state.cash, 30);
  assert.equal(applyBuyBuilding(b1.state, 'farms', 1, now).ok, false);

  const g1 = applyActivateGemBoost(state);
  assert.equal(g1.ok, true);
  assert.equal(g1.state.gems, 1);
  assert.equal(g1.state.boost, 30);
  assert.equal(applyActivateGemBoost(g1.state).ok, false);

  const gxState = b1.state;
  gxState.cash = 100_000_000;
  gxState.gx.cond.parl = 85;
  const f1 = applyFixInfra(gxState, 'parl', false, now);
  assert.equal(f1.ok, true);
  assert.equal(f1.state.gx.cond.parl, 100);
  assert.equal(applyFixInfra(f1.state, 'parl', false, now).ok, false);

  const upState = f1.state;
  upState.gx.lvl.farms = 4;
  const u1 = applyUpgradeBuilding(upState, 'farms', now);
  assert.equal(u1.ok, true);
  assert.equal(u1.newLevel, 5);
  assert.equal(applyUpgradeBuilding(u1.state, 'farms', now).ok, false);

  const gov1 = applyChangeGov(u1.state, 'tech', now);
  assert.equal(gov1.ok, true);
  assert.equal(gov1.state.gov, 'tech');
  assert.equal(applyChangeGov(gov1.state, 'wlf', now + 1000).ok, false);

  const sanitized = migrateState({
    fused: -5,
    gx: {
      cond: {},
      lvl: {},
      acc: 0,
      blk: 0,
      pb: 0,
      ph: 0,
      log: ['ok', 123 as unknown as string, 'x'.repeat(200)],
      exp: { sal: -10, el: 9e20, inf: 1, total: 2, paid: 3, n: 5, t: 99 },
    },
  });
  assert.equal(sanitized.fused, 0);
  assert.equal(sanitized.gx.log.length, 2);
  assert.equal(sanitized.gx.log[1].length, 120);
  assert.equal(sanitized.gx.exp?.sal, 0);
  assert.equal(sanitized.gx.exp?.el, 1e13);
});

test('cleanSavePayload clamps policy sliders and activeFx to Firestore rule bounds', () => {
  const dirty = freshState();
  dirty.tax = 99;
  dirty.wel = -10;
  dirty.prop = 40;
  dirty.transitSub = 99;
  dirty.boost = 100;
  dirty.activeFx = { incomeBoostMult: 5, incomeBoostEnd: Date.now() + 60_000 };
  const cleaned = cleanSavePayload(dirty);
  assert.equal(cleaned.tax, 45);
  assert.equal(cleaned.wel, 0);
  assert.equal(cleaned.prop, 15);
  assert.equal(cleaned.transitSub, 25);
  assert.equal(cleaned.boost, 30);
  assert.equal((cleaned.activeFx as { incomeBoostMult?: number } | undefined)?.incomeBoostMult, 1.6);
});

test('cleanSavePayload matches 47 ALLOWED_SAVE_KEYS and sanitizes nested edge cases', () => {
  const freshCleaned = cleanSavePayload(freshState());
  assert.equal(ALLOWED_SAVE_KEYS.size, 47);
  assert.deepEqual(Object.keys(freshCleaned).sort(), [...ALLOWED_SAVE_KEYS].sort());

  const now = Date.now();
  const nasty = {
    ...freshState(),
    taxPool: -0,
    day: 202.33333333333337,
    hap: Number.POSITIVE_INFINITY,
    appr: -12,
    pop: 0.4,
    crateCd: Number.NaN,
    ev: -5,
    hist: [-50, Number.NaN, 120.5, 9e15, ...Array.from({ length: 70 }, (_, i) => i + 1)],
    questIds: [-1, Number.NaN, 5.9, 51, 30, 8, 9999, 1, 2, 3, 4, 5, 6],
    questDay: '2026-11-26-' + 'x'.repeat(50),
    stk: {
      ...Object.fromEntries(STICKERS.map((s) => [s.id, 9e12])),
      unknown_sticker: 99,
    },
    set: { sfx: 9 as unknown as number, vib: 0, anim: -0, extraSet: 1 } as never,
    activeFx: {
      incomeBoostEnd: now + 60_000,
      incomeBoostMult: 1.6,
      incomeBoostId: 'growth_boost_extra_long_identifier_string_that_gets_sliced',
      taxSurge: 1,
      shadowFx: 99,
    } as never,
    gx: {
      cond: { parl: 99.85, gov: Number.NaN, hosp: -4, sch: 120, road: -0, hway: 50, extraCond: 10 },
      lvl: { farms: 99, factories: -2, extraBld: 3 },
      acc: 9999,
      blk: 9e9,
      pb: 5,
      ph: -3,
      log: ['Entry 1', 'y'.repeat(160)],
      exp: {
        sal: Number.NaN,
        el: -0,
        inf: 9e15,
        total: 1234.9,
        paid: 500,
        n: 2_000_000,
        t: now,
        shadowExp: 42,
      },
      shadowGx: true,
    } as never,
    sub: { tier: 'monthly', exp: now + 7 * 86_400_000, lastClaimDay: '2026-11-26', shadowSub: 1 } as never,
    subPromo: { weekKey: '2026-W48', tier: 'daily', pct: 25, exp: now + 86_400_000, shadowPromo: 1 } as never,
    avHist: [1.27, 2.65],
    avs: { n: 0, b: 0, w: 0, r: 0 },
  };

  const out = cleanSavePayload(nasty as never);
  assert.deepEqual(Object.keys(out).sort(), [...ALLOWED_SAVE_KEYS].sort());
  assert.equal(Object.is(out.taxPool, 0), true);
  assert.equal(out.day, 202.33333333333337);
  assert.equal(out.hap, 60);
  assert.equal(out.appr, 0);
  assert.equal(out.pop, 1);
  assert.equal(Object.is(out.crateCd, 0), true);
  assert.equal(out.ev, 0);

  const hist = out.hist as number[];
  assert.equal(hist.length, 60);
  assert.ok(hist.every((v) => Number.isFinite(v) && v >= 0 && v <= 1e13));

  const qIds = out.questIds as number[];
  assert.equal(qIds.length, 10);
  assert.ok(qIds.every((v) => Number.isInteger(v) && v >= 0 && v <= 1000));
  assert.equal((out.questDay as string).length, 32);

  const stk = out.stk as Record<string, number>;
  assert.equal('unknown_sticker' in stk, false);
  assert.equal(stk[STICKERS[0].id], 1e9);

  const setObj = out.set as Record<string, unknown>;
  assert.deepEqual(Object.keys(setObj).sort(), ['anim', 'sfx', 'vib']);
  assert.equal(Object.is(setObj.anim, 0), true);

  const fxObj = out.activeFx as Record<string, unknown>;
  assert.equal('shadowFx' in fxObj, false);
  assert.equal((fxObj.incomeBoostId as string).length, 32);

  const gxObj = out.gx as Record<string, unknown>;
  assert.equal('shadowGx' in gxObj, false);
  assert.equal(gxObj.acc, 300);
  assert.equal(gxObj.blk, 1_000_000);
  assert.equal(gxObj.pb, 0.25);
  assert.equal(Object.is(gxObj.ph, 0), true);
  const expObj = gxObj.exp as Record<string, unknown>;
  assert.equal('shadowExp' in expObj, false);
  assert.equal(Object.is(expObj.sal, 0), true);
  assert.equal(Object.is(expObj.el, 0), true);
  assert.equal(expObj.inf, 1e13);
  assert.equal(expObj.n, 1_000_000);

  const subObj = out.sub as Record<string, unknown>;
  assert.equal('shadowSub' in subObj, false);
  const promoObj = out.subPromo as Record<string, unknown>;
  assert.equal('shadowPromo' in promoObj, false);
});

test('shouldRunOfflineEntryCheck waits for Firebase auth resolution and prevents post-sync duplicates', () => {
  assert.equal(
    shouldRunOfflineEntryCheck({
      isFirebaseConfigured: true,
      authResolved: false,
      uid: null,
      gateOpen: false,
      completedEntryKey: null,
    }),
    false,
  );
  assert.equal(
    shouldRunOfflineEntryCheck({
      isFirebaseConfigured: true,
      authResolved: true,
      uid: 'user-123',
      gateOpen: false,
      completedEntryKey: null,
    }),
    false,
  );
  assert.equal(
    shouldRunOfflineEntryCheck({
      isFirebaseConfigured: false,
      authResolved: false,
      uid: null,
      gateOpen: true,
      completedEntryKey: null,
    }),
    false,
  );
  assert.equal(
    shouldRunOfflineEntryCheck({
      isFirebaseConfigured: false,
      authResolved: false,
      uid: null,
      gateOpen: false,
      completedEntryKey: 'offline',
    }),
    false,
  );
  assert.equal(
    shouldRunOfflineEntryCheck({
      isFirebaseConfigured: false,
      authResolved: false,
      uid: null,
      gateOpen: false,
      completedEntryKey: null,
    }),
    true,
  );
  assert.equal(
    shouldRunOfflineEntryCheck({
      isFirebaseConfigured: true,
      authResolved: true,
      uid: null,
      gateOpen: false,
      completedEntryKey: null,
    }),
    true,
  );
});

test('computeDailyAndOfflineChecks is strictly idempotent, handles clock skew, and advances/resets streaks', () => {
  const day1Ms = Date.UTC(2026, 10, 26, 12, 0, 0);
  const s0 = freshState();
  s0.b.farms = 5;
  s0.t = day1Ms - 600_000;

  const first = computeDailyAndOfflineChecks(s0, 0, day1Ms, () => 0);
  assert.equal(first.changed, true);
  assert.ok(first.dailyGrant !== null);
  assert.equal(first.dailyGrant?.streak, 1);
  assert.equal(first.dailyGrant?.cashAdded, 300);
  assert.ok(first.offlineCredited > 0);
  assert.equal(first.state.cash, 260 + 300);

  const replay = computeDailyAndOfflineChecks(first.state, 0, day1Ms + 2_000, () => 0);
  assert.equal(replay.changed, false);
  assert.equal(replay.dailyGrant, null);
  assert.equal(replay.offlineCredited, 0);
  assert.equal(replay.state.cash, first.state.cash);
  assert.equal(replay.state.streak, 1);

  const skew = computeDailyAndOfflineChecks(first.state, 0, day1Ms - 5_000, () => 0);
  assert.equal(skew.changed, false);
  assert.equal(skew.dailyGrant, null);
  assert.equal(skew.state.cash, first.state.cash);

  const day2Ms = day1Ms + 86_400_000;
  const day2 = computeDailyAndOfflineChecks(first.state, 0, day2Ms, () => 0);
  assert.equal(day2.dailyGrant?.streak, 2);
  assert.equal(day2.dailyGrant?.cashAdded, DAILY_REWARDS[1].c);
  assert.equal(day2.state.cash, first.state.cash + DAILY_REWARDS[1].c);

  const skippedMs = day2Ms + 3 * 86_400_000;
  const skipped = computeDailyAndOfflineChecks(day2.state, 0, skippedMs, () => 0);
  assert.equal(skipped.dailyGrant?.streak, 1);
  assert.equal(skipped.dailyGrant?.cashAdded, DAILY_REWARDS[0].c);
});

test('NaN or non-finite cash and gems cannot bypass purchase guards', () => {
  const now = 1_750_000_000_000;
  const nanCashState = { ...freshState(), cash: Number.NaN, gems: Number.NaN, taxPool: 100 };
  assert.equal(applyBuyBuilding(nanCashState, 'farms', 1, now).ok, false);
  assert.equal(applyBuyRank(nanCashState, 2).ok, false);
  assert.equal(applyActivateGemBoost(nanCashState).ok, false);
  assert.equal(applyUnlockTech({ ...nanCashState, b: { ...nanCashState.b, farms: 20 } }, 'smart_grid').ok, false);
  assert.equal(resolveExecutiveDecision(nanCashState, 'tech_expo', 0, 0, now).ok, false);
  assert.equal(buyStickerCrate(nanCashState, 'cash', now).ok, false);
  assert.equal(buyStickerCrate(nanCashState, 'gems', now).ok, false);
});

test('reward claim functions preserve finite cash & gems even if pre-existing wallet field was NaN', () => {
  const now = 1_750_000_000_000;
  const nanState = { ...freshState(), cash: Number.NaN, gems: Number.NaN, taxPool: 500 };
  const taxRes = applyCollectTax(nanState, 0, now, () => 0.9);
  assert.equal(taxRes.ok, true);
  assert.equal(taxRes.state.cash, 500);

  const msState = { ...freshState(), cash: Number.NaN, gems: Number.NaN };
  msState.b.farms = 5;
  const msRes = claimMilestone(msState, MILESTONES[0].id);
  assert.equal(msRes.ok, true);
  assert.equal(msRes.state.gems, MILESTONES[0].r);
});

test('subscriptions cannot generate positive coin ROI even with max 35% flash deal across midnight', async () => {
  const { weekKeyFor } = await import('./rules');
  const startNow = Date.UTC(2026, 10, 26, 18, 55, 0); // 23:55 Asia/Karachi
  const wk = weekKeyFor(startNow);
  for (const sub of SUBSCRIPTIONS) {
    let s = freshState();
    s.cash = 20_000_000;
    s.subPromo = { weekKey: wk, tier: sub.id, pct: 35, exp: startNow + 60_000 };
    const buy = applyBuySubscription(s, sub, startNow);
    assert.equal(buy.ok, true);
    assert.equal(buy.paidCost, Math.floor(sub.cost * 0.65));
    s = buy.state;

    // Claim day 1 before midnight, and every possible UTC+5 calendar day within subscription window
    let totalClaimed = 0;
    const steps = Math.ceil(sub.durMs / 86_400_000) + 1;
    for (let i = 0; i <= steps; i += 1) {
      const checkMs = i === 0 ? startNow + 1000 : Math.min(buy.exp! - 1000, startNow + i * 3_600_000 * 24);
      if (checkMs >= buy.exp!) continue;
      const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(checkMs);
      const claim = claimSubscriptionDaily(s, dayKey, checkMs);
      if (claim.ok) {
        totalClaimed += claim.cashAdded;
        s = claim.state;
      }
    }
    const maxMinPrice = Math.floor(sub.cost * 0.65);
    assert.ok(
      totalClaimed < maxMinPrice,
      `Subscription ${sub.id} stipend ${totalClaimed} must remain strictly below discounted cost ${maxMinPrice}`,
    );
  }
});

test('policy reforms and stances strictly enforce cooldown and treasury cost without bypass', async () => {
  const { applyCommitFiscalReform, applyChangePolicyStance } = await import('./rules');
  const now = 1_750_000_000_000;
  const s0 = { ...freshState(), cash: 250_000, b: { ...freshState().b, farms: 5 } };

  const r1 = applyCommitFiscalReform(s0, { tax: 25, corp: 22 }, now);
  assert.equal(r1.ok, true);
  assert.ok(r1.cost > 0);
  assert.equal(r1.state.cash, s0.cash - r1.cost);

  const rImmediateRepeat = applyCommitFiscalReform(r1.state, { tax: 18 }, now + 5_000);
  assert.equal(rImmediateRepeat.ok, false);
  assert.match(rImmediateRepeat.reason || '', /cooldown/i);

  const p1 = applyChangePolicyStance(r1.state, 'p_ind', 2, now);
  assert.equal(p1.ok, true);
  assert.ok(p1.state.cash < r1.state.cash);

  const pRapidToggle = applyChangePolicyStance(p1.state, 'p_ind', 0, now + 2_000);
  assert.equal(pRapidToggle.ok, false);
  assert.match(pRapidToggle.reason || '', /cooldown/i);
});
