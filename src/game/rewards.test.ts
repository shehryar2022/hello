import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAILY_SLOT_REWARDS,
  WEEKLY_MILESTONE_DEFS,
  applyClaimDailySlot,
  applyClaimWeeklyMilestone,
  getDailyRewardsView,
  getQuestCoinReward,
  getWeeklyRewardsView,
  msUntilNextKarachiDay,
  msUntilNextKarachiMonday,
  rewardsDayKey,
  rewardsWeekKey,
} from './rewards';
import {
  applyClaimQuest,
  cleanSavePayload,
  dayKeyFor,
  freshState,
  getUnclaimedRewardsSummary,
  migrateState,
  selectDailyQuestIds,
  QUEST_POOL,
} from './rules';

test('Daily Rewards has strictly 5 progressive slots awarding Coins + Diamonds and cycles after Day 5', () => {
  assert.equal(DAILY_SLOT_REWARDS.length, 5);

  const day1 = Date.UTC(2026, 10, 20, 10, 0, 0);
  let s = freshState();

  for (let i = 0; i < 5; i += 1) {
    const now = day1 + i * 86_400_000;
    const viewBefore = getDailyRewardsView(s, now);
    assert.equal(viewBefore.slots.length, 5);
    assert.equal(viewBefore.canClaimToday, true);
    assert.equal(viewBefore.activeSlotDay, i + 1);

    const claim = applyClaimDailySlot(s, now, () => 0.25);
    assert.equal(claim.ok, true);
    assert.equal(claim.slot?.day, i + 1);
    assert.ok(claim.coinsAdded > 0 && claim.diamondsAdded > 0);
    if (i === 4) {
      assert.ok(claim.sticker !== null, 'Day 5 must award bonus Rare Sticker');
    }
    s = claim.state;

    // Same-day duplicate claim strictly rejected
    const dup = applyClaimDailySlot(s, now + 60_000, () => 0.25);
    assert.equal(dup.ok, false);
  }

  // On Day 6, cycle resets smoothly back to Day 1
  const day6 = day1 + 5 * 86_400_000;
  const viewDay6 = getDailyRewardsView(s, day6);
  assert.equal(viewDay6.canClaimToday, true);
  assert.equal(viewDay6.activeSlotDay, 1);
  assert.equal(viewDay6.completedInCycle, 0);
  assert.equal(viewDay6.history.length, 5);
});

test('Weekly Rewards has strictly 5 independent milestones and resets cleanly on new Asia/Karachi week', () => {
  assert.equal(WEEKLY_MILESTONE_DEFS.length, 5);

  const friday = Date.UTC(2026, 10, 27, 12, 0, 0); // Week 48
  const nextMonday = Date.UTC(2026, 10, 30, 12, 0, 0); // Week 49
  assert.notEqual(rewardsWeekKey(friday), rewardsWeekKey(nextMonday));

  let s = freshState();
  s.b.farms = 12;
  s.hap = 78;
  s.rank = 3;

  const wkView = getWeeklyRewardsView(s, friday, 5);
  assert.equal(wkView.items.length, 5);
  const buildItem = wkView.items.find((x) => x.id === 'wm_build_12');
  assert.equal(buildItem?.status, 'available');

  const claim = applyClaimWeeklyMilestone(s, 'wm_build_12', friday, 5);
  assert.equal(claim.ok, true);
  assert.equal(claim.coinsAdded, 25_000);
  assert.equal(claim.diamondsAdded, 6);
  s = claim.state;

  // Same week duplicate claim blocked
  const dup = applyClaimWeeklyMilestone(s, 'wm_build_12', friday + 3_600_000, 5);
  assert.equal(dup.ok, false);

  // Next week unlocks milestone claims cleanly without touching daily streak
  const nextView = getWeeklyRewardsView(s, nextMonday, 5);
  assert.equal(nextView.claimedCount, 0);
  assert.equal(nextView.items.find((x) => x.id === 'wm_build_12')?.status, 'available');
});

test('Daily Quests award both Coins and Diamonds, enforce single-claim, and populate unclaimed summary & history', () => {
  const now = Date.UTC(2026, 10, 27, 10, 0, 0);
  const today = dayKeyFor(now);
  let s = freshState();
  s.questDay = today;
  s.questIds = selectDailyQuestIds(today);

  // Pick first active quest and satisfy its threshold artificially for test
  const qIdx = s.questIds[0];
  const q = QUEST_POOL[qIdx];
  s.b.farms = 60;
  s.b.tech_parks = 4;
  s.b.airports = 2;
  s.b.hospitals = 3;
  s.b.shopping_centers = 3;
  s.b.textile_mills = 4;
  s.b.solar_plants = 4;
  s.b.greenhouses = 4;
  s.b.universities = 2;
  s.b.railways = 3;
  s.b.data_centers = 2;
  s.b.research_centers = 3;
  s.b.business_districts = 3;
  s.b.wind_farms = 3;
  s.b.ports = 2;
  s.b.food_plant = 3;
  s.b.roads = 4;
  s.b.steel_plants = 2;
  s.b.training_centers = 3;
  s.cash = 30_000_000;
  s.gems = 50;
  s.hap = 92;
  s.appr = 95;
  s.pop = 90;
  s.fused = 5;
  s.streak = 20;
  s.rank = 10;

  // Only test if quest can be satisfied (some booster quests need boosterCd)
  s.boosterCd = { ba_prod_boost: 1, ba_income_boost: 1, ba_tax_boost: 1 };

  const summaryBefore = getUnclaimedRewardsSummary(s, now, 1);
  assert.ok(summaryBefore.dailyReady === 1);
  assert.ok(summaryBefore.readyQuestIds.includes(q.id));
  assert.ok(summaryBefore.total >= 2);

  const coinsBefore = s.cash;
  const gemsBefore = s.gems;
  const expectedCoins = getQuestCoinReward(q);

  const res = applyClaimQuest(s, q.id, today, 1);
  assert.equal(res.ok, true);
  assert.equal(res.gemsAdded, q.r);
  assert.equal(res.cashAdded, expectedCoins);
  assert.equal(res.state.gems, gemsBefore + q.r);
  assert.equal(res.state.cash, coinsBefore + expectedCoins);
  assert.equal(res.state.qHist?.length, 1);

  const dup = applyClaimQuest(res.state, q.id, today, 1);
  assert.equal(dup.ok, false);

  // Round-trip via cloud save preserves daily, weekly, and quest histories
  const packed = cleanSavePayload(res.state);
  const migrated = migrateState(packed as never);
  assert.equal(migrated.qHist?.length, 1);
  assert.equal(migrated.qHist?.[0].coins, expectedCoins);
});

test('Karachi countdown helpers return strictly positive bounded intervals', () => {
  const now = Date.UTC(2026, 10, 27, 15, 30, 0);
  assert.match(rewardsDayKey(now), /^\d{4}-\d{2}-\d{2}$/);
  const dayMs = msUntilNextKarachiDay(now);
  const monMs = msUntilNextKarachiMonday(now);
  assert.ok(dayMs >= 1000 && dayMs <= 86_400_000);
  assert.ok(monMs >= 1000 && monMs <= 7 * 86_400_000);
});
