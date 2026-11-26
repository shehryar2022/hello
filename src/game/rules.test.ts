import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOSTERS,
  BUILDINGS,
  CRATE_COST_CASH,
  CRATE_COST_GEMS,
  DAILY_REWARDS,
  MAX_RANK,
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
  applyClaimQuest,
  applyCollectTax,
  applyFixInfra,
  applyOfflineEarnings,
  applyPolicyPreset,
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
  QUEST_POOL,
  resolveExecutiveDecision,
  rollTradePortExport,
  rollWeeklySubPromo,
  sanitizeStats,
  selectDailyQuestIds,
  shouldRunOfflineEntryCheck,
  targetHappiness,
  taxInfo,
  totalBuildings,
  weekKeyFor,
} from './rules';

test('bank section is completely removed from tabs and state migration strips loans', () => {
  assert.equal('bank' in TAB_META, false);
  const legacyWithLoan = {
    ...freshState(),
    cash: 50_000,
    loan: { amt: 25_000 },
    deals: [{ id: 'old' }],
  } as Record<string, unknown>;
  const migrated = migrateState(legacyWithLoan);
  assert.equal('loan' in migrated, false);
  assert.equal('deals' in migrated, false);
  assert.equal(calculateGdp(migrated), 50_000);
});

test('shop boosters are limited: cannot stack multiple income boosters and multipliers are bounded', () => {
  const now = 1_700_000_000_000;
  let state = freshState();
  state.cash = 10_000_000;

  const quick = BOOSTERS.find((b) => b.id === 'quick_profit')!;
  const boom = BOOSTERS.find((b) => b.id === 'boom_surge')!;
  const treasury = BOOSTERS.find((b) => b.id === 'golden_treasury')!;

  const r1 = applyBuyBooster(state, boom, now);
  assert.equal(r1.ok, true);
  state = r1.state;
  assert.equal(state.cash, 9_150_000);
  assert.equal(state.activeFx.incomeBoostMult, 1.75);

  const r2 = canBuyBooster(state, quick, now + 10_000);
  assert.equal(r2.ok, false);
  assert.match(r2.reason || '', /already active/i);

  const r3 = canBuyBooster(state, treasury, now + 10_000);
  assert.equal(r3.ok, false);

  const r4 = applyBuyBooster(state, quick, now + 125_000);
  assert.equal(r4.ok, true);
  assert.equal(r4.state.activeFx.incomeBoostMult, 1.25);
});

test('tax surge booster bonus is limited to +35% and capped at 2 minutes of unboosted base income', () => {
  const now = 1_700_000_000_000;
  let state = freshState();
  state.cash = 2_000_000;
  state.b.tech = 5;
  state.boost = 30;
  const boom = BOOSTERS.find((b) => b.id === 'boom_surge')!;
  state = applyBuyBooster(state, boom, now).state;

  const taxSurge = BOOSTERS.find((b) => b.id === 'tax_surge')!;
  state = applyBuyBooster(state, taxSurge, now + 1000).state;

  const baseNet = calculateIncome(state, { nowMs: now + 1000, ignoreTempBoosters: true }).net;

  state.taxPool = baseNet * 1000;
  const hugeCollect = calculateTaxCollect(state, 0, now + 1000);
  assert.equal(hugeCollect.bonusApplied, true);
  assert.equal(hugeCollect.bonusAmount, Math.floor(baseNet * 120));

  state.taxPool = 1000;
  const smallCollect = calculateTaxCollect(state, 0, now + 1000);
  assert.equal(smallCollect.bonusApplied, true);
  assert.equal(smallCollect.bonusAmount, 350);
});

test('building costs scale by 1.25x, bulkBuildingCost matches sum, and upkeep is capped at 35%', () => {
  const farm = BUILDINGS.find((b) => b.id === 'farm')!;
  assert.equal(buildingCost(farm, 0), 200);
  assert.equal(buildingCost(farm, 1), 250);
  const sum5 = [0, 1, 2, 3, 4].reduce((a, i) => a + buildingCost(farm, i), 0);
  assert.equal(bulkBuildingCost(farm, 0, 5), sum5);

  const state = freshState();
  state.b.farm = 300;
  const inc = calculateIncome(state);
  assert.ok(inc.net > 0, 'Large city net income must stay positive when upkeep is capped');
  assert.ok(inc.upkeep <= inc.gross * 0.35 + 0.001);
});

test('ranks high-average costs, +1% per rank income bonus, and 10 total ranks bought in strict order', () => {
  assert.equal(MAX_RANK, 10);
  assert.equal(RANKS.length, 11);
  assert.equal(RANKS[1].cost, 400_000);
  assert.equal(RANKS[6].cost, 32_000_000);
  assert.equal(RANKS[10].cost, 650_000_000);

  let state = freshState();
  state.cash = 2_000_000_000;
  state.b.tech = 2;
  const baseNet = calculateIncome(state).net;

  const skip = applyBuyRank(state, 2);
  assert.equal(skip.ok, false);

  for (let r = 1; r <= MAX_RANK; r++) {
    const res = applyBuyRank(state, r);
    assert.equal(res.ok, true);
    state = res.state;
  }
  assert.equal(state.rank, 10);
  const rankedNet = calculateIncome(state).net;
  assert.ok(Math.abs(rankedNet / baseNet - 1.1) < 0.001, 'Rank 10 gives +10% (+1% per rank)');
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

  // Cooldown prevents immediate second cash crate
  const c2 = buyStickerCrate(c1.state, 'cash', now + 60_000, () => 0.1);
  assert.equal(c2.ok, false);
  assert.match(c2.reason || '', /cooldown/i);

  // Gem crate grants 2 stickers with first guaranteed Rare+
  const g1 = buyStickerCrate(c1.state, 'gems', now + 1000, () => 0.1);
  assert.equal(g1.ok, true);
  assert.equal(g1.granted.length, 2);
  assert.ok(g1.granted[0].r >= 2);
  assert.equal(g1.state.gems, 0);
});

test('trade port export drops gems or stickers on meaningful tax collection', () => {
  const s = freshState();
  s.b.port = 2;
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
  state.b.fact = 2;
  state.boost = 30;
  state.t = now - 3_600_000;
  const baseNet = calculateIncome(state, { nowMs: now, ignoreTempBoosters: true }).net;
  const res = applyOfflineEarnings(state, now);
  assert.equal(res.wasCapped, true);
  assert.equal(res.awaySec, 1800);
  assert.ok(Math.abs(res.credited - baseNet * 1800 * 0.2) < 0.01);
  assert.equal(totalBuildings(res.state), 2);
});

test('policy presets, milestones, target happiness, and daily quests', () => {
  const state = freshState();
  state.tax = 45;
  state.prop = 15;
  state.wel = 0;
  assert.equal(targetHappiness(state), 5);

  const balanced = applyPolicyPreset(state, 'balanced');
  assert.equal(taxInfo(balanced).ev, 0);
  const revenue = applyPolicyPreset(state, 'revenue');
  const bliss = applyPolicyPreset(state, 'welfare');
  assert.equal(bliss.tax, 12);
  assert.equal(bliss.wel, 32);
  assert.equal(taxInfo(bliss).ev, 0);
  assert.ok(targetHappiness(bliss) > 60);
  assert.ok(taxInfo(revenue).mult > taxInfo(balanced).mult);
  assert.ok(taxInfo(balanced).mult > taxInfo(bliss).mult);
  assert.ok(calculateIncome(revenue).net > calculateIncome(balanced).net);
  assert.ok(calculateIncome(balanced).net > calculateIncome(bliss).net);

  bliss.b.farm = 5;
  const msRes = claimMilestone(bliss, MILESTONES[0].id);
  assert.equal(msRes.ok, true);
  assert.equal(msRes.gemsAdded, MILESTONES[0].r);
  assert.equal(claimMilestone(msRes.state, MILESTONES[0].id).ok, false);

  const q1 = selectDailyQuestIds('Wed Nov 25 2026');
  const q2 = selectDailyQuestIds('Wed Nov 25 2026');
  assert.deepEqual(q1, q2);
  assert.equal(q1.length, 3);
  assert.equal(new Set(q1).size, 3);

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

test('subscriptions cost 5M-500M, grant modest perks, and prevent same-day double-claim on upgrade', () => {
  const now = 1_750_000_000_000;
  const daily = SUBSCRIPTIONS.find((s) => s.id === 'daily')!;
  const weekly = SUBSCRIPTIONS.find((s) => s.id === 'weekly')!;
  const monthly = SUBSCRIPTIONS.find((s) => s.id === 'monthly')!;

  assert.equal(daily.cost, 5_000_000);
  assert.equal(daily.incomeMult, 1.04);
  assert.equal(daily.discountRate, 0.03);
  assert.equal(daily.dailyCash, 200_000);
  assert.equal(weekly.cost, 65_000_000);
  assert.equal(weekly.incomeMult, 1.08);
  assert.equal(weekly.discountRate, 0.06);
  assert.equal(weekly.dailyCash, 900_000);
  assert.equal(monthly.cost, 500_000_000);
  assert.equal(monthly.incomeMult, 1.12);
  assert.equal(monthly.discountRate, 0.1);
  assert.equal(monthly.dailyCash, 3_500_000);

  let state = freshState();
  state.cash = 600_000_000;
  state.b.farm = 10;
  state.gx.cond.parl = 50;

  const baseInc = calculateIncome(state, { nowMs: now }).net;
  const farmDef = BUILDINGS.find((b) => b.id === 'farm')!;
  const baseFarmCost = buildingCost(farmDef, 10);
  const baseRepair = gxRepairCost(state, 'parl', false, now);
  const baseUpgrade = gxUpgradeCost(state, 'farm', now);

  const sub1 = applyBuySubscription(state, daily, now);
  assert.equal(sub1.ok, true);
  state = sub1.state;
  assert.equal(state.cash, 595_000_000);
  assert.equal(getDevelopmentDiscount(state, now), 0.03);
  assert.equal(getProjectSpeedMult(state, now), 1.05);
  assert.ok(Math.abs(calculateIncome(state, { nowMs: now }).net / baseInc - 1.04) < 0.001);
  assert.ok(buildingCost(farmDef, 10, getDevelopmentDiscount(state, now)) < baseFarmCost);
  assert.ok(gxRepairCost(state, 'parl', false, now) < baseRepair);
  assert.ok(gxUpgradeCost(state, 'farm', now) < baseUpgrade);

  assert.equal(canBuySubscription(state, daily, now + 1000).ok, false);

  const c1 = claimSubscriptionDaily(state, '2026-11-25', now + 2000);
  assert.equal(c1.ok, true);
  assert.equal(c1.cashAdded, 200_000);
  state = c1.state;

  assert.equal(claimSubscriptionDaily(state, '2026-11-25', now + 3000).ok, false);

  const sub2 = applyBuySubscription(state, weekly, now + 4000);
  assert.equal(sub2.ok, true);
  state = sub2.state;
  assert.equal(getActiveSubscription(state, now + 5000)?.def.id, 'weekly');
  assert.equal(claimSubscriptionDaily(state, '2026-11-25', now + 5000).ok, false);

  const c2 = claimSubscriptionDaily(state, '2026-11-26', now + 86_400_000);
  assert.equal(c2.ok, true);
  assert.equal(c2.cashAdded, 900_000);
  assert.equal(c2.gemsAdded, 1);

  const migrated = migrateState({
    ...c2.state,
    sub: { tier: 'monthly', exp: Date.now() + 999 * 86_400_000, lastClaimDay: '2026-11-26' },
  });
  assert.ok((migrated.sub?.exp || 0) <= Date.now() + 31 * 86_400_000 + 1000);
});

test('government renovation depends strictly on 20% of building development (unaffected by temp boosters)', () => {
  const state = freshState();
  state.b.tech = 5;
  state.gx.cond.parl = 60;
  state.gx.cond.road = 60;

  const baseParlFull = gxRepairCost(state, 'parl', true);
  assert.equal(baseParlFull, 1800);

  state.boost = 30;
  state.tax = 45;
  assert.equal(gxRepairCost(state, 'parl', true), baseParlFull);

  state.gx.cond.parl = 100;
  assert.equal(gxRepairCost(state, 'parl', true), 0);
});

test('24 buildings (including transit, semicon, logistics, quantum) and 16 policies (including wealth, transitSub) function cleanly', () => {
  assert.equal(BUILDINGS.length, 24);
  for (const id of ['hydro', 'stock', 'evplant', 'fusion', 'transit', 'semicon', 'logistics', 'quantum']) {
    assert.ok(BUILDINGS.some((b) => b.id === id), `Missing building ${id}`);
  }

  const base = freshState();
  base.b.hydro = 2;
  base.b.stock = 2;
  base.b.evplant = 1;
  base.b.fusion = 1;
  base.b.transit = 2;
  base.b.semicon = 1;
  base.b.logistics = 1;
  base.b.quantum = 1;
  base.b.airport = 2;
  base.b.tech = 2;
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

test('rebalanced economy invariants: starter cash 260, monotonic endgame ROI, +15 Happy Days, and 0% approval taxInfo', () => {
  const fresh = freshState();
  assert.equal(fresh.cash, 260);

  const farm = BUILDINGS.find((b) => b.id === 'farm')!;
  const water = BUILDINGS.find((b) => b.id === 'water')!;
  const hosp = BUILDINGS.find((b) => b.id === 'hosp')!;
  const bank = BUILDINGS.find((b) => b.id === 'bank')!;
  const space = BUILDINGS.find((b) => b.id === 'space')!;
  const fusion = BUILDINGS.find((b) => b.id === 'fusion')!;

  assert.ok(fresh.cash >= farm.cost, 'Starter cash must allow buying first Farm');
  assert.ok(bank.cost / bank.inc < water.cost / water.inc);
  assert.ok(space.cost / space.inc < hosp.cost / hosp.inc);
  assert.ok(fusion.cost / fusion.inc < bank.cost / bank.inc);

  const happyDays = BOOSTERS.find((b) => b.id === 'happy_days')!;
  const hapBase = freshState();
  hapBase.cash = 100_000;
  hapBase.hap = 60;
  const hapRes = applyBuyBooster(hapBase, happyDays, 1_750_000_000_000);
  assert.equal(hapRes.ok, true);
  assert.equal(hapRes.state.hap, 75);

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
  state.b.farm = 5;
  assert.equal(TECH_TREE.length, 6);

  // Building prerequisite blocks early unlock
  const blocked = applyUnlockTech(state, 'smart_grid');
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason || '', /buildings/i);

  state.b.farm = 15;
  state.b.fact = 5;
  state.b.hosp = 5;
  state.b.port = 25;
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

  // Duplicate unlock prevented
  assert.equal(applyUnlockTech(state, 'smart_grid').ok, false);
});

test('Civic Rally booster, Executive Decisions, and leaderboard sub visibility helper work cleanly', () => {
  const now = 1_750_000_000_000;
  let state = freshState();
  state.cash = 1_000_000;
  state.hap = 50;
  state.appr = 50;
  state.b.tech = 3;

  const rally = BOOSTERS.find((b) => b.id === 'civic_rally')!;
  const rRes = applyBuyBooster(state, rally, now);
  assert.equal(rRes.ok, true);
  state = rRes.state;
  assert.equal(state.hap, 60);
  assert.equal(state.appr, 62);
  assert.equal(state.cash, 840_000);

  const cashBefore = state.cash;
  const decGain = resolveExecutiveDecision(state, 'tech_expo', 1, 0, now);
  assert.equal(decGain.ok, true);
  assert.ok(decGain.state.cash > cashBefore);
  assert.equal(decGain.state.hap, 56);

  const decSpend = resolveExecutiveDecision(state, 'tech_expo', 0, 0, now);
  assert.equal(decSpend.ok, true);
  assert.equal(decSpend.state.gems, state.gems + 1);
  assert.equal(decSpend.state.hap, 68);

  assert.equal(isProfileSubActive({ subTier: 'weekly', subExp: now + 60_000 }, now), 'weekly');
  assert.equal(isProfileSubActive({ subTier: 'weekly', subExp: now - 1 }, now), null);
  assert.equal(isProfileSubActive({ subTier: '', subExp: now + 60_000 }, now), null);
});

test('weekly random subscription discount locks per weekKey, expires after 72h, and applies discounted price', () => {
  const week1Now = 1_750_000_000_000;
  let state = freshState();
  const monthly = SUBSCRIPTIONS.find((s) => s.id === 'monthly')!;

  // Pick monthly (idx 2 -> rng ~ 0.9) and 35% off (idx 4 -> rng ~ 0.9)
  const r1 = rollWeeklySubPromo(state, week1Now, () => 0.9);
  assert.equal(r1.rolled, true);
  assert.equal(r1.promo?.tier, 'monthly');
  assert.equal(r1.promo?.pct, 35);
  state = r1.state;

  // Same weekKey cannot re-roll even with different rng
  const reroll = rollWeeklySubPromo(state, week1Now + 3600_000, () => 0.05);
  assert.equal(reroll.rolled, false);
  assert.equal(reroll.promo?.tier, 'monthly');
  assert.equal(reroll.promo?.pct, 35);

  const pActive = getSubscriptionPrice(state, monthly, week1Now + 1000);
  assert.equal(pActive.promoActive, true);
  assert.equal(pActive.discountPct, 35);
  assert.equal(pActive.finalCost, 325_000_000);

  state.cash = 350_000_000;
  assert.equal(canBuySubscription(state, monthly, week1Now + 1000).ok, true);
  const bought = applyBuySubscription(state, monthly, week1Now + 1000);
  assert.equal(bought.ok, true);
  assert.equal(bought.paidCost, 325_000_000);
  assert.equal(bought.state.cash, 25_000_000);

  // After 72h, promo expires and price reverts to 500M
  const pExpired = getSubscriptionPrice(state, monthly, week1Now + 73 * 3_600_000);
  assert.equal(pExpired.promoActive, false);
  assert.equal(pExpired.finalCost, 500_000_000);

  // Next ISO week allows rolling a fresh discount
  const nextWeekNow = week1Now + 7 * 86_400_000;
  assert.notEqual(weekKeyFor(week1Now), weekKeyFor(nextWeekNow));
  const r2 = rollWeeklySubPromo(state, nextWeekNow, () => 0.01);
  assert.equal(r2.rolled, true);
  assert.equal(r2.promo?.tier, 'daily');
  assert.equal(r2.promo?.pct, 15);
});

test('36 stickers, monotonic endgame building ROI, and smart recommendation highlights work accurately', () => {
  assert.equal(STICKERS.length, 36);
  for (const id of ['turtle', 'dove', 'pegasus', 'sphinx', 'atlas', 'nebula']) {
    assert.ok(STICKERS.some((s) => s.id === id), `Missing sticker ${id}`);
  }

  const semicon = BUILDINGS.find((b) => b.id === 'semicon')!;
  const space = BUILDINGS.find((b) => b.id === 'space')!;
  const logistics = BUILDINGS.find((b) => b.id === 'logistics')!;
  const fusion = BUILDINGS.find((b) => b.id === 'fusion')!;
  const quantum = BUILDINGS.find((b) => b.id === 'quantum')!;
  const bank = BUILDINGS.find((b) => b.id === 'bank')!;

  assert.ok(quantum.cost / quantum.inc < fusion.cost / fusion.inc);
  assert.ok(fusion.cost / fusion.inc < logistics.cost / logistics.inc);
  assert.ok(logistics.cost / logistics.inc < space.cost / space.inc);
  assert.ok(space.cost / space.inc < semicon.cost / semicon.inc);
  assert.ok(semicon.cost / semicon.inc < bank.cost / bank.inc);

  const now = 1_750_000_000_000;
  const s = freshState();
  s.cash = 200_000;
  s.hap = 40;
  s.appr = 40;
  s.b.farm = 15;
  s.b.fact = 5;
  s.b.hosp = 5;
  s.taxPool = 50_000;

  const bRecs = getRecommendedBuildings(s, 1, now);
  assert.ok(Object.values(bRecs).includes('Best ROI'));
  assert.ok(Object.values(bRecs).includes('Happiness Fix'));

  const boostRecs = getRecommendedBoosters(s, now);
  assert.equal(boostRecs.happy_days, 'Happiness Fix');
  assert.equal(boostRecs.civic_rally, 'Approval Boost');
  assert.equal(boostRecs.tax_surge, 'Tax Cashout');
  assert.equal(boostRecs.quick_profit, 'Top Income');

  const techRecs1 = getRecommendedTech({ ...s, cash: 2_000_000 });
  assert.equal(techRecs1.eco_catalysis, 'Happiness Fix');
  const techRecs2 = getRecommendedTech({ ...s, cash: 2_000_000, tech: { eco_catalysis: 1 } });
  assert.equal(techRecs2.healthcare_act, 'Happiness Fix');

  const highEv = { ...s, tax: 45, prop: 15, corp: 30 };
  assert.equal(getRecommendedPolicyHint(highEv).id, 'balanced');

  const shopRec = getRecommendedShopItems(
    { ...s, cash: 500_000_000, subPromo: { weekKey: weekKeyFor(now), tier: 'weekly', pct: 25, exp: now + 3_600_000 } },
    now,
  );
  assert.equal(shopRec.nextRankId, 1);
  assert.equal(shopRec.rankReason, 'Ready Upgrade');
  assert.equal(shopRec.subTier, 'weekly');
  assert.equal(shopRec.subReason, 'Weekly Deal −25%');
});

test('cleanSavePayload strips undefined/country fields and clamps all values within Firestore rules limits', () => {
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
  assert.equal('avHist' in cleaned, false);
  assert.equal('avs' in cleaned, false);
  assert.equal('legacyFoo' in cleaned, false);
  assert.equal('legacyHotel' in (cleaned.b as Record<string, unknown>), false);
  assert.equal(Object.keys(cleaned.b as Record<string, unknown>).length, BUILDINGS.length);
  assert.equal(cleaned.cash, 1e13);
  assert.equal(cleaned.gems, 1e9);
  assert.equal(cleaned.taxPool, 1e13);
  assert.equal(cleaned.rank, MAX_RANK);
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
  assert.equal(Object.is(cleanedWeird.rank, 0), true);
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

  // 1. Atomic tax collect consumes pool & taxSurge on first call, blocks second call
  const t1 = applyCollectTax(state, 0, now, () => 0.9);
  assert.equal(t1.ok, true);
  assert.equal(t1.bonusApplied, true);
  assert.equal(t1.state.taxPool, 0);
  assert.equal(t1.state.activeFx.taxSurge, 0);
  assert.equal(applyCollectTax(t1.state, 0, now, () => 0.9).ok, false);

  // 2. Atomic buy building rejects insufficient cash on second rapid click
  let buyState = freshState();
  buyState.cash = 220;
  const b1 = applyBuyBuilding(buyState, 'farm', 1, now);
  assert.equal(b1.ok, true);
  assert.equal(b1.newCount, 1);
  assert.equal(b1.state.cash, 20);
  assert.equal(applyBuyBuilding(b1.state, 'farm', 1, now).ok, false);

  // 3. Atomic gem boost & gov change & infra fix & upgrade
  const g1 = applyActivateGemBoost(state);
  assert.equal(g1.ok, true);
  assert.equal(g1.state.gems, 1);
  assert.equal(g1.state.boost, 30);
  assert.equal(applyActivateGemBoost(g1.state).ok, false);

  let gxState = b1.state;
  gxState.cash = 100_000_000;
  gxState.gx.cond.parl = 85;
  const f1 = applyFixInfra(gxState, 'parl', false, now);
  assert.equal(f1.ok, true);
  assert.equal(f1.state.gx.cond.parl, 100);
  assert.equal(applyFixInfra(f1.state, 'parl', false, now).ok, false);

  let upState = f1.state;
  upState.gx.lvl.farm = 4;
  const u1 = applyUpgradeBuilding(upState, 'farm', now);
  assert.equal(u1.ok, true);
  assert.equal(u1.newLevel, 5);
  assert.equal(applyUpgradeBuilding(u1.state, 'farm', now).ok, false);

  const gov1 = applyChangeGov(u1.state, 'tech', now);
  assert.equal(gov1.ok, true);
  assert.equal(gov1.state.gov, 'tech');
  assert.equal(applyChangeGov(gov1.state, 'wlf', now + 1000).ok, false);

  // 4. Atomic quest claim prevents duplicate gem grants on same day
  const todayKey = '2026-11-26';
  const qIds = selectDailyQuestIds(todayKey);
  const firstQuest = QUEST_POOL[qIds[0]];
  let qState = freshState();
  qState.questDay = todayKey;
  qState.questIds = qIds;
  qState.cash = 1_000_000_000;
  qState.gems = 50;
  for (const k of Object.keys(qState.b)) {
    qState.b[k] = 5;
  }
  qState.hap = 100;
  qState.appr = 95;
  qState.pop = 500;
  qState.fused = 20;
  qState.streak = 20;
  qState.rank = 10;
  qState.boosterCd = { quick_profit: 1, boom_surge: 1, happy_days: 1 };
  qState.stk = Object.fromEntries(STICKERS.slice(0, 22).map((st) => [st.id, 1]));
  const qc1 = applyClaimQuest(qState, firstQuest.id, todayKey, 1);
  assert.equal(qc1.ok, true);
  assert.equal(qc1.gemsAdded, firstQuest.r);
  assert.equal(applyClaimQuest(qc1.state, firstQuest.id, todayKey, 1).ok, false);

  // 5. migrateState bounds gx.exp, gx.log, and fused
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
  assert.equal((cleaned.activeFx as { incomeBoostMult?: number } | undefined)?.incomeBoostMult, 1.75);
});

test('cleanSavePayload matches 47 ALLOWED_SAVE_KEYS and sanitizes nested edge cases (NaN, Infinity, -0, expired FX, oversized maps)', () => {
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
    questIds: [-1, Number.NaN, 5.9, 53, 30, 8, 9999, 1, 2, 3, 4, 5, 6],
    questDay: '2026-11-26-' + 'x'.repeat(50),
    stk: {
      ...Object.fromEntries(STICKERS.map((s) => [s.id, 9e12])),
      unknown_sticker: 99,
    },
    set: { sfx: 9 as unknown as number, vib: 0, anim: -0, extraSet: 1 } as never,
    activeFx: {
      incomeBoostEnd: now + 60_000,
      incomeBoostMult: 1.75,
      incomeBoostId: 'boom_surge_extra_long_identifier_string_that_gets_sliced',
      taxSurge: 1,
      shadowFx: 99,
    } as never,
    gx: {
      cond: { parl: 99.85, gov: Number.NaN, hosp: -4, sch: 120, road: -0, hway: 50, extraCond: 10 },
      lvl: { farm: 99, fact: -2, extraBld: 3 },
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
  // Firebase configured but auth still pending -> must NOT run offline entry check
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

  // Firebase NOT configured (offline-only environment) -> allowed once gate closes
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
  s0.b.farm = 5;
  s0.t = day1Ms - 600_000;

  const first = computeDailyAndOfflineChecks(s0, 0, day1Ms, () => 0);
  assert.equal(first.changed, true);
  assert.ok(first.dailyGrant !== null);
  assert.equal(first.dailyGrant?.streak, 1);
  assert.equal(first.dailyGrant?.cashAdded, 300);
  assert.ok(first.offlineCredited > 0);
  assert.equal(first.state.cash, 260 + 300);

  // Immediate re-invocation (e.g. React strict effect replay or reconnect) must grant nothing
  const replay = computeDailyAndOfflineChecks(first.state, 0, day1Ms + 2_000, () => 0);
  assert.equal(replay.changed, false);
  assert.equal(replay.dailyGrant, null);
  assert.equal(replay.offlineCredited, 0);
  assert.equal(replay.state.cash, first.state.cash);
  assert.equal(replay.state.streak, 1);

  // Minor negative clock skew on same logical day must NOT double-grant
  const skew = computeDailyAndOfflineChecks(first.state, 0, day1Ms - 5_000, () => 0);
  assert.equal(skew.changed, false);
  assert.equal(skew.dailyGrant, null);
  assert.equal(skew.state.cash, first.state.cash);

  // Consecutive next day advances to Day 2 streak
  const day2Ms = day1Ms + 86_400_000;
  const day2 = computeDailyAndOfflineChecks(first.state, 0, day2Ms, () => 0);
  assert.equal(day2.dailyGrant?.streak, 2);
  assert.equal(day2.dailyGrant?.cashAdded, DAILY_REWARDS[1].c);
  assert.equal(day2.state.cash, first.state.cash + DAILY_REWARDS[1].c);

  // Skipping a day resets streak back to 1
  const skippedMs = day2Ms + 3 * 86_400_000;
  const skipped = computeDailyAndOfflineChecks(day2.state, 0, skippedMs, () => 0);
  assert.equal(skipped.dailyGrant?.streak, 1);
  assert.equal(skipped.dailyGrant?.cashAdded, DAILY_REWARDS[0].c);
});

test('NaN or non-finite cash and gems cannot bypass purchase guards', () => {
  const now = 1_750_000_000_000;
  const nanCashState = { ...freshState(), cash: Number.NaN, gems: Number.NaN, taxPool: 100 };
  assert.equal(applyBuyBuilding(nanCashState, 'farm', 1, now).ok, false);
  assert.equal(applyBuyRank(nanCashState, 1).ok, false);
  assert.equal(applyActivateGemBoost(nanCashState).ok, false);
  assert.equal(applyUnlockTech({ ...nanCashState, b: { ...nanCashState.b, farm: 20 } }, 'smart_grid').ok, false);
  assert.equal(resolveExecutiveDecision(nanCashState, 'tech_expo', 0, 0, now).ok, false);
  assert.equal(buyStickerCrate(nanCashState, 'cash', now).ok, false);
  assert.equal(buyStickerCrate(nanCashState, 'gems', now).ok, false);
});


