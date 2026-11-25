import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOSTERS,
  BUILDINGS,
  CRATE_COST_CASH,
  CRATE_COST_GEMS,
  MAX_RANK,
  RANKS,
  STICKERS,
  SUBSCRIPTIONS,
  TAB_META,
} from './constants';
import {
  applyBuyBooster,
  applyBuyRank,
  applyBuySubscription,
  applyOfflineEarnings,
  applyPolicyPreset,
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
  freshState,
  fuseSticker,
  getActiveSubscription,
  getDevelopmentDiscount,
  getSubscriptionProjectSpeedMult,
  gxRepairCost,
  gxUpgradeCost,
  migrateState,
  MILESTONES,
  rollTradePortExport,
  sanitizeStats,
  selectDailyQuestIds,
  targetHappiness,
  taxInfo,
  totalBuildings,
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
  assert.equal(state.cash, 9_650_000);
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

test('ranks reduced costs, +1% per rank income bonus, and 10 total ranks bought in strict order', () => {
  assert.equal(MAX_RANK, 10);
  assert.equal(RANKS.length, 11);
  assert.equal(RANKS[1].cost, 250_000);
  assert.equal(RANKS[6].cost, 18_000_000);
  assert.equal(RANKS[10].cost, 600_000_000);

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

test('balanced subscriptions grant modest perks & prevent same-day double-claim on upgrade', () => {
  const now = 1_750_000_000_000;
  const daily = SUBSCRIPTIONS.find((s) => s.id === 'daily')!;
  const weekly = SUBSCRIPTIONS.find((s) => s.id === 'weekly')!;
  const monthly = SUBSCRIPTIONS.find((s) => s.id === 'monthly')!;

  assert.equal(daily.incomeMult, 1.04);
  assert.equal(daily.discountRate, 0.03);
  assert.equal(daily.dailyCash, 150_000);
  assert.equal(weekly.incomeMult, 1.08);
  assert.equal(weekly.discountRate, 0.06);
  assert.equal(weekly.dailyCash, 600_000);
  assert.equal(monthly.incomeMult, 1.12);
  assert.equal(monthly.discountRate, 0.1);
  assert.equal(monthly.dailyCash, 2_500_000);

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
  assert.equal(state.cash, 596_000_000);
  assert.equal(getDevelopmentDiscount(state, now), 0.03);
  assert.equal(getSubscriptionProjectSpeedMult(state, now), 1.05);
  assert.ok(Math.abs(calculateIncome(state, { nowMs: now }).net / baseInc - 1.04) < 0.001);
  assert.ok(buildingCost(farmDef, 10, getDevelopmentDiscount(state, now)) < baseFarmCost);
  assert.ok(gxRepairCost(state, 'parl', false, now) < baseRepair);
  assert.ok(gxUpgradeCost(state, 'farm', now) < baseUpgrade);

  assert.equal(canBuySubscription(state, daily, now + 1000).ok, false);

  const c1 = claimSubscriptionDaily(state, '2026-11-25', now + 2000);
  assert.equal(c1.ok, true);
  assert.equal(c1.cashAdded, 150_000);
  state = c1.state;

  assert.equal(claimSubscriptionDaily(state, '2026-11-25', now + 3000).ok, false);

  const sub2 = applyBuySubscription(state, weekly, now + 4000);
  assert.equal(sub2.ok, true);
  state = sub2.state;
  assert.equal(getActiveSubscription(state, now + 5000)?.def.id, 'weekly');
  assert.equal(claimSubscriptionDaily(state, '2026-11-25', now + 5000).ok, false);

  const c2 = claimSubscriptionDaily(state, '2026-11-26', now + 86_400_000);
  assert.equal(c2.ok, true);
  assert.equal(c2.cashAdded, 600_000);
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

test('new buildings (hydro, stock, evplant, fusion) and new policies (tourism, digital, rd, green) function cleanly', () => {
  assert.equal(BUILDINGS.length, 20);
  for (const id of ['hydro', 'stock', 'evplant', 'fusion']) {
    assert.ok(BUILDINGS.some((b) => b.id === id), `Missing building ${id}`);
  }

  const base = freshState();
  base.b.hydro = 2;
  base.b.stock = 2;
  base.b.evplant = 1;
  base.b.fusion = 1;
  base.b.airport = 2;
  base.b.tech = 2;
  const incBefore = calculateIncome(base).gross;

  const boosted = migrateState({
    ...base,
    tourism: 15,
    digital: 15,
    rd: 20,
    green: 20,
    tax: 999,
    boost: 999,
  });
  assert.equal(boosted.tax, 45);
  assert.equal(boosted.boost, 30);
  assert.equal(boosted.tourism, 15);
  assert.equal(boosted.digital, 15);
  assert.equal(boosted.rd, 20);
  assert.equal(boosted.green, 20);
  assert.ok(calculateIncome(boosted).gross > incBefore);
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
