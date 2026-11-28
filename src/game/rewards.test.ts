import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DAILY_SLOT_REWARDS,
  applyClaimDailySlot,
  getDailyRewardsView,
  msUntilNextKarachiDay,
  rewardsDayKey,
} from './rewards';
import {
  applyClaimWeeklyMission,
  cleanSavePayload,
  freshState,
  getUnclaimedRewardsSummary,
  migrateState,
  selectWeeklyMissionIds,
  weekKeyFor,
} from './rules';
import { WEEKLY_MISSIONS } from './constants';

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

test('Weekly Strategic Missions & Achievements still count toward unclaimed summary without Daily Quests or Weekly Rewards', () => {
  const now = Date.UTC(2026, 10, 27, 10, 0, 0);
  const wk = weekKeyFor(now);
  const s = freshState();
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
  s.rank = 10;

  const summary = getUnclaimedRewardsSummary(s, now, 1);
  assert.equal(summary.dailyReady, 1);
  assert.ok(summary.questReady > 0);
  assert.equal(summary.readyQuestIds.length, summary.questReady);
  assert.ok(summary.achReady > 0);
  assert.equal(
    summary.total,
    summary.dailyReady + summary.weeklyReady + summary.questReady + summary.achReady + summary.challengeReady,
  );

  const weeklyIndices = selectWeeklyMissionIds(wk);
  const readyWeekly = weeklyIndices
    .map((i) => WEEKLY_MISSIONS[i])
    .find((m) => m && m.f(s, { rank: 1 }) >= m.g);
  if (readyWeekly) {
    const res = applyClaimWeeklyMission(s, readyWeekly.id, wk, 1);
    assert.equal(res.ok, true);
    assert.equal(res.gemsAdded, readyWeekly.r);
  }

  // Round-trip via cloud save preserves daily reward history cleanly
  const dailyClaim = applyClaimDailySlot(s, now, () => 0.25);
  const packed = cleanSavePayload(dailyClaim.state);
  const migrated = migrateState(packed as never);
  assert.equal(migrated.dHist?.length, 1);
});

test('Karachi countdown helper returns strictly positive bounded interval', () => {
  const now = Date.UTC(2026, 10, 27, 15, 30, 0);
  assert.match(rewardsDayKey(now), /^\d{4}-\d{2}-\d{2}$/);
  const dayMs = msUntilNextKarachiDay(now);
  assert.ok(dayMs >= 1000 && dayMs <= 86_400_000);
});

test('Diamond rewards remain moderate across Daily Slots, Weekly Missions, and Milestones', () => {
  for (const slot of DAILY_SLOT_REWARDS) {
    assert.ok(slot.diamonds >= 1 && slot.diamonds <= 6, `Daily slot ${slot.day} out of range`);
  }
  for (const m of WEEKLY_MISSIONS) {
    assert.ok(m.r >= 2 && m.r <= 6, `Weekly mission ${m.id} out of 2..6 range`);
  }
});
