import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOOSTERS,
  BUILDINGS,
  RANKS,
  STICKERS,
  TAB_META,
} from './constants';
import {
  applyBuyBooster,
  applyBuyRank,
  applyOfflineEarnings,
  buildingCost,
  calculateGdp,
  calculateIncome,
  calculateTaxCollect,
  canBuyBooster,
  freshState,
  fuseSticker,
  migrateState,
  sanitizeStats,
  selectDailyQuestIds,
  targetHappiness,
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
  // GDP equals cash without loan subtraction
  assert.equal(calculateGdp(migrated), 50_000);
});

test('shop boosters are limited: cannot stack multiple income boosters and multipliers are bounded', () => {
  const now = 1_700_000_000_000;
  let state = freshState();
  state.cash = 10_000_000;

  const quick = BOOSTERS.find((b) => b.id === 'quick_profit')!;
  const boom = BOOSTERS.find((b) => b.id === 'boom_surge')!;
  const treasury = BOOSTERS.find((b) => b.id === 'golden_treasury')!;

  // Buy Boom Surge (+75% = 1.75x for 2 min)
  const r1 = applyBuyBooster(state, boom, now);
  assert.equal(r1.ok, true);
  state = r1.state;
  assert.equal(state.cash, 9_000_000);
  assert.equal(state.activeFx.incomeBoostMult, 1.75);

  // Cannot stack Quick Profit or Treasury Rush while Boom Surge is active
  const r2 = canBuyBooster(state, quick, now + 10_000);
  assert.equal(r2.ok, false);
  assert.match(r2.reason || '', /already active/i);

  const r3 = canBuyBooster(state, treasury, now + 10_000);
  assert.equal(r3.ok, false);

  // After Boom Surge expires (120s), Quick Profit can be bought
  const r4 = applyBuyBooster(state, quick, now + 125_000);
  assert.equal(r4.ok, true);
  assert.equal(r4.state.activeFx.incomeBoostMult, 1.25);
});

test('tax surge booster bonus is limited to +35% and capped at 2 minutes of unboosted base income', () => {
  const now = 1_700_000_000_000;
  let state = freshState();
  state.cash = 2_000_000;
  state.b.tech = 5;
  // Turn on both gem boost AND shop boom surge to test that tax surge ignores temp boosters
  state.boost = 30;
  const boom = BOOSTERS.find((b) => b.id === 'boom_surge')!;
  state = applyBuyBooster(state, boom, now).state;

  const taxSurge = BOOSTERS.find((b) => b.id === 'tax_surge')!;
  state = applyBuyBooster(state, taxSurge, now + 1000).state;

  const baseNet = calculateIncome(state, { nowMs: now + 1000, ignoreTempBoosters: true }).net;

  // Case 1: huge taxPool -> bonus capped at baseNet * 120 (2 minutes)
  state.taxPool = baseNet * 1000;
  const hugeCollect = calculateTaxCollect(state, 0, now + 1000);
  assert.equal(hugeCollect.bonusApplied, true);
  assert.equal(hugeCollect.bonusAmount, Math.floor(baseNet * 120));

  // Case 2: small taxPool -> bonus capped at 35% of taxPool
  state.taxPool = 1000;
  const smallCollect = calculateTaxCollect(state, 0, now + 1000);
  assert.equal(smallCollect.bonusApplied, true);
  assert.equal(smallCollect.bonusAmount, 350);
});

test('building costs scale by 1.25x and upkeep is capped at 35%', () => {
  const farm = BUILDINGS.find((b) => b.id === 'farm')!;
  assert.equal(buildingCost(farm, 0), 250);
  assert.equal(buildingCost(farm, 1), 313);

  const state = freshState();
  state.b.farm = 300;
  const inc = calculateIncome(state);
  assert.ok(inc.net > 0, 'Large city net income must stay positive when upkeep is capped');
  assert.ok(inc.upkeep <= inc.gross * 0.35 + 0.001);
});

test('ranks must be bought in strict order', () => {
  let state = freshState();
  state.cash = 50_000_000;
  const skip = applyBuyRank(state, 2);
  assert.equal(skip.ok, false);

  const first = applyBuyRank(state, 1);
  assert.equal(first.ok, true);
  assert.equal(first.state.rank, 1);
  assert.equal(first.state.cash, 50_000_000 - RANKS[1].cost);
});

test('sticker fusion consumes 3 duplicates and increments fused counter', () => {
  const state = freshState();
  state.stk = { bee: 3 };
  const res = fuseSticker(state, 'bee', () => 0);
  assert.equal(res.ok, true);
  assert.equal(res.state.fused, 1);
  assert.equal(res.state.stk.bee, undefined);
  assert.equal(res.granted?.r, 2);
  assert.ok(STICKERS.some((s) => s.id === res.granted?.id));
});

test('offline earnings credit 20% to taxPool capped at 30 minutes', () => {
  const now = 1_700_000_000_000;
  const state = freshState();
  state.b.fact = 2;
  state.t = now - 3_600_000; // 60 min ago -> capped at 30 min (1800s)
  const net = calculateIncome(state, { nowMs: now }).net;
  const res = applyOfflineEarnings(state, now);
  assert.equal(res.wasCapped, true);
  assert.equal(res.awaySec, 1800);
  assert.ok(Math.abs(res.credited - net * 1800 * 0.2) < 0.01);
  assert.equal(totalBuildings(res.state), 2);
});

test('target happiness stays clamped between 5 and 100 and daily quests deterministic', () => {
  const state = freshState();
  state.tax = 45;
  state.prop = 15;
  state.wel = 0;
  assert.equal(targetHappiness(state), 5);

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
  assert.equal(proj.dl, fallbackNow + proj.t.dur * 0 + proj.t.dl * 60_000);
  assert.ok(proj.dl > fallbackNow);

  // Even when client clock estimate is hours behind server time, isPending forces server fallback
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
