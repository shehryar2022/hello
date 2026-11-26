import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PROVINCES,
  PROVINCE_COLORS,
  PROVINCE_DISCOUNT_EPOCH_MS,
  PROVINCE_FLAGS,
  PROVINCE_UNLOCK_PRICES,
  PROVINCE_WEEK_MS,
} from './constants';
import {
  applyAllocateProvinceBudget,
  applyCustomizeProvince,
  applyRebalanceProvinceBudget,
  applyUnlockProvince,
  buildProvinceLeaderboardEntries,
  buildProvinceLeaderboardFingerprint,
  calculateProvinceMaintenance,
  calculateProvinceNationalContribution,
  calculateProvinceOverallScore,
  getProvinceUnlockQuote,
  getUpcomingWeeklyDiscount,
  getWeeklyProvinceDiscount,
  normalizeProvinces,
  sanitizeProvinceName,
  selectBestProvinceLeaderboardEntries,
  sortProvinceLeaderboard,
  stepProvincesTick,
  totalProvinceBudget,
} from './province';
import { calculateGdp, calculateIncome, freshState, migrateState } from './rules';

test('Every new and legacy save receives exactly 1 free Starter Province without altering cash or gems', () => {
  const fresh = freshState();
  assert.equal(fresh.cash, 260);
  assert.equal(fresh.gems, 3);
  const freshProvs = fresh.provinces || [];
  assert.equal(freshProvs.length, 1);
  assert.equal(freshProvs[0].slot, 1);
  assert.equal(freshProvs[0].id, 'prov_1');
  assert.equal(freshProvs[0].paidPrice, 0);

  // Untouched Starter Province causes zero drain and preserves baseline economy
  const inc = calculateIncome(fresh);
  assert.equal(inc.provinceGross, 0);
  assert.equal(inc.provinceMaint, 0);
  assert.equal(inc.provinceNet, 0);

  // Legacy save missing provinces still keeps exact cash & gems and gets 1 free Starter Province
  const legacy = migrateState({ cash: 987654, gems: 42, country: ['JP', 'Japan'] });
  assert.equal(legacy.cash, 987654);
  assert.equal(legacy.gems, 42);
  const legacyProvs = legacy.provinces || [];
  assert.equal(legacyProvs.length, 1);
  assert.equal(legacyProvs[0].slot, 1);
  assert.ok(legacyProvs[0].name.includes('Japan'));
});

test('Progressive unlock prices #1..#10 and global rotating 4-week discount cycle match exact spec', () => {
  assert.deepEqual([...PROVINCE_UNLOCK_PRICES], [
    0,
    250_000_000,
    400_000_000,
    650_000_000,
    1_000_000_000,
    1_500_000_000,
    2_200_000_000,
    3_200_000_000,
    4_500_000_000,
    6_000_000_000,
  ]);

  // Verify repeating 4-week cycle anchored to fixed UTC epoch
  const w1 = getWeeklyProvinceDiscount(PROVINCE_DISCOUNT_EPOCH_MS + 1000);
  assert.equal(w1.cycleWeek, 1);
  assert.equal(w1.targetSlot, 2);
  assert.equal(w1.discountPct, 20);
  assert.equal(w1.basePrice, 250_000_000);
  assert.equal(w1.discountedPrice, 200_000_000);

  const w2 = getWeeklyProvinceDiscount(PROVINCE_DISCOUNT_EPOCH_MS + PROVINCE_WEEK_MS + 1000);
  assert.equal(w2.cycleWeek, 2);
  assert.equal(w2.targetSlot, 3);
  assert.equal(w2.discountPct, 20);
  assert.equal(w2.discountedPrice, 320_000_000);

  const w3 = getWeeklyProvinceDiscount(PROVINCE_DISCOUNT_EPOCH_MS + 2 * PROVINCE_WEEK_MS + 1000);
  assert.equal(w3.cycleWeek, 3);
  assert.equal(w3.targetSlot, 4);
  assert.equal(w3.discountPct, 20);
  assert.equal(w3.discountedPrice, 520_000_000);

  const w4 = getWeeklyProvinceDiscount(PROVINCE_DISCOUNT_EPOCH_MS + 3 * PROVINCE_WEEK_MS + 1000);
  assert.equal(w4.cycleWeek, 4);
  assert.equal(w4.targetSlot, 5);
  assert.equal(w4.discountPct, 25);
  assert.equal(w4.discountedPrice, 750_000_000);

  // Week 5 loops back to Week 1
  const w5 = getWeeklyProvinceDiscount(PROVINCE_DISCOUNT_EPOCH_MS + 4 * PROVINCE_WEEK_MS + 1000);
  assert.equal(w5.cycleWeek, 1);
  assert.equal(w5.targetSlot, 2);
  assert.equal(w5.discountPct, 20);

  const upcoming = getUpcomingWeeklyDiscount(PROVINCE_DISCOUNT_EPOCH_MS + 1000);
  assert.equal(upcoming.cycleWeek, 2);
  assert.equal(upcoming.targetSlot, 3);
});

test('Unlocking deducts exact discounted/base price once, blocks negative cash, duplicates, concurrent tx, and max > 10', () => {
  const week1Now = PROVINCE_DISCOUNT_EPOCH_MS + 3_600_000;
  const state = freshState();
  state.cash = 199_999_999;

  // Week 1 discount makes 2nd Province 200M (not 250M). 199,999,999 fails safely without negative cash.
  const quoteShort = getProvinceUnlockQuote(state, week1Now);
  assert.equal(quoteShort.nextSlot, 2);
  assert.equal(quoteShort.basePrice, 250_000_000);
  assert.equal(quoteShort.discountPct, 20);
  assert.equal(quoteShort.finalPrice, 200_000_000);
  assert.equal(quoteShort.canAfford, false);

  const failUnlock = applyUnlockProvince(
    state,
    { name: 'Northern Harbor', flagId: PROVINCE_FLAGS[1].id, color: PROVINCE_COLORS[1].hex, desc: 'Port hub' },
    week1Now,
    'tx_2_once',
  );
  assert.equal(failUnlock.ok, false);
  assert.equal(state.cash, 199_999_999);
  assert.equal((state.provinces || []).length, 1);

  // Give enough cash (250M) and unlock 2nd Province -> pays 200M, leaves 50M
  state.cash = 250_000_000;
  const unlock2 = applyUnlockProvince(
    state,
    { name: 'Northern Harbor', flagId: PROVINCE_FLAGS[1].id, color: PROVINCE_COLORS[1].hex, desc: 'Port hub' },
    week1Now,
    'tx_2_once',
  );
  assert.equal(unlock2.ok, true);
  assert.equal(unlock2.paidPrice, 200_000_000);
  assert.equal(unlock2.state.cash, 50_000_000);
  assert.equal((unlock2.state.provinces || []).length, 2);

  // Replaying same txId is strictly blocked
  unlock2.state.cash = 1_000_000_000;
  const replay = applyUnlockProvince(
    unlock2.state,
    { name: 'Replay Province', flagId: PROVINCE_FLAGS[2].id, color: PROVINCE_COLORS[2].hex },
    week1Now,
    'tx_2_once',
  );
  assert.equal(replay.ok, false);
  assert.equal(replay.state.cash, 1_000_000_000);

  // Unlocking 3rd Province in Week 1 pays full 400M (no discount stacking or wrong-slot discount)
  const unlock3 = applyUnlockProvince(
    unlock2.state,
    { name: 'Solar Valley', flagId: PROVINCE_FLAGS[2].id, color: PROVINCE_COLORS[2].hex },
    week1Now,
  );
  assert.equal(unlock3.ok, true);
  assert.equal(unlock3.discountPct, 0);
  assert.equal(unlock3.paidPrice, 400_000_000);
  assert.equal(unlock3.state.cash, 600_000_000);

  // Unlock all the way to 10 and verify 11th is blocked
  let cur = unlock3.state;
  cur.cash = 50_000_000_000;
  for (let slot = 4; slot <= MAX_PROVINCES; slot++) {
    const r = applyUnlockProvince(
      cur,
      { name: `Region ${slot}`, flagId: PROVINCE_FLAGS[slot % PROVINCE_FLAGS.length].id, color: PROVINCE_COLORS[slot % PROVINCE_COLORS.length].hex },
      week1Now + slot * 1000,
    );
    assert.equal(r.ok, true);
    cur = r.state;
  }
  assert.equal((cur.provinces || []).length, MAX_PROVINCES);

  const attempt11 = applyUnlockProvince(
    cur,
    { name: 'Eleventh Realm', flagId: PROVINCE_FLAGS[0].id, color: PROVINCE_COLORS[0].hex },
    week1Now,
  );
  assert.equal(attempt11.ok, false);
  assert.equal((attempt11.state.provinces || []).length, MAX_PROVINCES);
});

test('Customization sanitizes XSS, enforces unique names & valid flags/colors, and gives zero gameplay stats', () => {
  let state = freshState();
  state.cash = 500_000_000;
  const u2 = applyUnlockProvince(
    state,
    { name: '<script>alert(1)</script> Emerald Peak', flagId: PROVINCE_FLAGS[3].id, color: PROVINCE_COLORS[4].hex, desc: '<b>Clean</b> mountain' },
    PROVINCE_DISCOUNT_EPOCH_MS,
  );
  assert.equal(u2.ok, true);
  state = u2.state;
  const provs = state.provinces!;
  assert.equal(provs[1].name, 'alert1 Emerald Peak');
  assert.equal(provs[1].desc, 'Clean mountain');
  assert.equal(sanitizeProvinceName('  Bad<tag>Name! '), 'BadName');

  // Invalid color or flag rejected
  const badFlag = applyCustomizeProvince(state, 'prov_2', {
    name: 'Valid Name',
    flagId: 'hacked_flag',
    color: PROVINCE_COLORS[0].hex,
  });
  assert.equal(badFlag.ok, false);

  const badColor = applyCustomizeProvince(state, 'prov_2', {
    name: 'Valid Name',
    flagId: PROVINCE_FLAGS[0].id,
    color: '#123456',
  });
  assert.equal(badColor.ok, false);

  // Duplicate name against prov_1 rejected
  const dupName = applyCustomizeProvince(state, 'prov_2', {
    name: provs[0].name,
    flagId: PROVINCE_FLAGS[0].id,
    color: PROVINCE_COLORS[0].hex,
  });
  assert.equal(dupName.ok, false);

  // Valid customization changes cosmetics ONLY, not GDP/income/maint
  const beforeInc = calculateIncome(state);
  const beforeGdp = calculateGdp(state);
  const edited = applyCustomizeProvince(state, 'prov_2', {
    name: 'Cobalt Harbor',
    desc: 'Deepwater logistics port',
    flagId: PROVINCE_FLAGS[6].id,
    color: PROVINCE_COLORS[5].hex,
  });
  assert.equal(edited.ok, true);
  assert.equal(edited.state.provinces![1].name, 'Cobalt Harbor');
  assert.equal(calculateIncome(edited.state).net, beforeInc.net);
  assert.equal(calculateGdp(edited.state), beforeGdp);

  // Normalizing tampered provinces clamps count <= 10 and keeps starter
  const clamped = normalizeProvinces(Array.from({ length: 15 }, (_, i) => ({ slot: i + 1, name: `Bad ${i + 1}` })));
  assert.equal(clamped.length, MAX_PROVINCES);
});

test('Independent 6-category budget allocation, zero-sum rebalance, gradual dev, and 5-area maintenance', () => {
  const state = freshState();
  state.cash = 1_000_000;

  // Allocate into infrastructure & industry of prov_1
  const a1 = applyAllocateProvinceBudget(state, 'prov_1', 'infrastructure', 200_000, Date.now(), 'alloc_1');
  assert.equal(a1.ok, true);
  assert.equal(a1.state.cash, 800_000);
  assert.equal(a1.state.provinces![0].budget.infrastructure, 200_000);

  // Duplicate allocation tx blocked
  const aDup = applyAllocateProvinceBudget(a1.state, 'prov_1', 'infrastructure', 200_000, Date.now(), 'alloc_1');
  assert.equal(aDup.ok, false);

  // Exceeding cash blocked (no negative cash)
  const aOver = applyAllocateProvinceBudget(a1.state, 'prov_1', 'education', 900_000);
  assert.equal(aOver.ok, false);
  assert.equal(a1.state.cash, 800_000);

  // Zero-sum intra-province rebalance preserves total budget & cash
  const reb = applyRebalanceProvinceBudget(a1.state, 'prov_1', 'infrastructure', 'industry', 80_000);
  assert.equal(reb.ok, true);
  assert.equal(reb.state.cash, 800_000);
  assert.equal(reb.state.provinces![0].budget.infrastructure, 120_000);
  assert.equal(reb.state.provinces![0].budget.industry, 80_000);
  assert.equal(totalProvinceBudget(reb.state.provinces![0]), 200_000);

  // Fund all 6 categories & step gradually (should improve dev/GDP smoothly, not instant jump to Lv 100 in 1s)
  let sim = reb.state;
  for (const cat of ['education', 'healthcare', 'security', 'welfare'] as const) {
    sim = applyAllocateProvinceBudget(sim, 'prov_1', cat, 100_000).state;
  }
  const devBefore = sim.provinces![0].dev;
  const after1Sec = stepProvincesTick(sim, 1);
  assert.ok(after1Sec.provinces![0].dev > devBefore && after1Sec.provinces![0].dev < devBefore + 5);

  const after180Sec = stepProvincesTick(sim, 180);
  assert.ok(after180Sec.provinces![0].dev > after1Sec.provinces![0].dev);
  assert.ok(after180Sec.provinces![0].gdp > sim.provinces![0].gdp);

  // Verify 5-area maintenance breakdown sums properly
  const maint = calculateProvinceMaintenance(after180Sec.provinces![0]);
  const partsSum = maint.infrastructure + maint.healthcare + maint.education + maint.security + maint.publicServices;
  assert.ok(maint.total > 0);
  assert.ok(Math.abs(partsSum - maint.total) < 0.001);

  const contrib = calculateProvinceNationalContribution(after180Sec);
  assert.ok(contrib.grossIncomePerSec > 0);
  assert.ok(contrib.maintenancePerSec > 0);
});

test('Global Province Leaderboard scores and sorts across all 6 categories accurately with 1 entry per player', () => {
  const s = freshState();
  s.cash = 1_000_000_000;
  const u2 = applyUnlockProvince(
    s,
    { name: 'Boom Metro', flagId: PROVINCE_FLAGS[0].id, color: PROVINCE_COLORS[0].hex },
    PROVINCE_DISCOUNT_EPOCH_MS,
  ).state;

  const provs = u2.provinces!;
  provs[0] = { ...provs[0], gdp: 50_000_000, hap: 95, dev: 20, pop: 12, emp: 72 };
  provs[1] = { ...provs[1], gdp: 900_000_000, hap: 55, dev: 75, pop: 45, emp: 92 };

  const entries = buildProvinceLeaderboardEntries(u2, 'uid_test', 'Leader', 'PK');
  assert.equal(entries.length, 2);

  // Single player with 2 provinces yields strictly 1 best entry per category
  const gdpRanked = sortProvinceLeaderboard(entries, 'gdp');
  assert.equal(gdpRanked.length, 1);
  assert.equal(gdpRanked[0].provId, 'prov_2');

  const hapRanked = sortProvinceLeaderboard(entries, 'hap');
  assert.equal(hapRanked.length, 1);
  assert.equal(hapRanked[0].provId, 'prov_1');

  assert.equal(sortProvinceLeaderboard(entries, 'dev').length, 1);
  assert.equal(sortProvinceLeaderboard(entries, 'dev')[0].provId, 'prov_2');
  assert.equal(sortProvinceLeaderboard(entries, 'pop')[0].provId, 'prov_2');
  assert.equal(sortProvinceLeaderboard(entries, 'emp')[0].provId, 'prov_2');
  assert.equal(sortProvinceLeaderboard(entries, 'overall')[0].provId, 'prov_2');

  const score0 = calculateProvinceOverallScore(provs[0]);
  const score1 = calculateProvinceOverallScore(provs[1]);
  assert.ok(score0 >= 0 && score0 <= 1000);
  assert.ok(score1 > score0);
});

test('Global Province Leaderboard shows only each unique player best province across multiple multi-province players and updates dynamically', () => {
  const mkPlayerEntries = (
    uid: string,
    ownerName: string,
    countryCode: string,
    specs: Array<{ gdp: number; hap: number; dev: number; pop: number; emp: number; name: string }>,
  ) => {
    let st = freshState();
    st.cash = 50_000_000_000;
    for (let i = 1; i < specs.length; i++) {
      st = applyUnlockProvince(
        st,
        {
          name: specs[i].name,
          flagId: PROVINCE_FLAGS[i % PROVINCE_FLAGS.length].id,
          color: PROVINCE_COLORS[i % PROVINCE_COLORS.length].hex,
        },
        PROVINCE_DISCOUNT_EPOCH_MS + i * 1000,
      ).state;
    }
    st.provinces = st.provinces!.map((p, idx) => ({
      ...p,
      name: specs[idx].name,
      gdp: specs[idx].gdp,
      hap: specs[idx].hap,
      dev: specs[idx].dev,
      pop: specs[idx].pop,
      emp: specs[idx].emp,
    }));
    return {
      state: st,
      entries: buildProvinceLeaderboardEntries(st, uid, ownerName, countryCode),
    };
  };

  // Player A: prov_1 leads Happiness (98%), prov_2 leads Overall/GDP/Dev/Pop/Emp
  const playerA = mkPlayerEntries('uid_A', 'Alice', 'PK', [
    { name: 'Alice Garden', gdp: 120_000_000, hap: 98, dev: 40, pop: 18, emp: 74 },
    { name: 'Alice Mega', gdp: 2_500_000_000, hap: 62, dev: 88, pop: 80, emp: 95 },
  ]);

  // Player B: 3 provinces, prov_3 leads Pop/Dev/Overall, prov_1 leads Emp, prov_2 leads Hap
  const playerB = mkPlayerEntries('uid_B', 'Bilal', 'JP', [
    { name: 'Bilal Works', gdp: 400_000_000, hap: 60, dev: 50, pop: 25, emp: 97 },
    { name: 'Bilal Resort', gdp: 200_000_000, hap: 94, dev: 45, pop: 10, emp: 70 },
    { name: 'Bilal Capital', gdp: 1_800_000_000, hap: 82, dev: 92, pop: 110, emp: 88 },
  ]);

  // Player C: single province player must never be hidden
  const playerC = mkPlayerEntries('uid_C', 'Clara', 'DE', [
    { name: 'Clara Solo', gdp: 950_000_000, hap: 85, dev: 66, pop: 42, emp: 84 },
  ]);

  const allRaw = [...playerA.entries, ...playerB.entries, ...playerC.entries];
  assert.equal(allRaw.length, 6);

  const cats = ['overall', 'gdp', 'hap', 'dev', 'pop', 'emp'] as const;
  for (const cat of cats) {
    const ranked = selectBestProvinceLeaderboardEntries(allRaw, cat);
    // Exactly 1 entry per unique player, no legitimate player dropped
    assert.equal(ranked.length, 3);
    assert.deepEqual(new Set(ranked.map((r) => r.ownerUid)).size, 3);
  }

  // Verify category-specific winners per player & overall ordering
  const overall = selectBestProvinceLeaderboardEntries(allRaw, 'overall');
  assert.equal(overall.find((e) => e.ownerUid === 'uid_A')?.provId, 'prov_2');
  assert.equal(overall.find((e) => e.ownerUid === 'uid_B')?.provId, 'prov_3');
  assert.equal(overall.find((e) => e.ownerUid === 'uid_C')?.provId, 'prov_1');
  assert.ok(overall[0].overallScore >= overall[1].overallScore);
  assert.ok(overall[1].overallScore >= overall[2].overallScore);

  const byHap = selectBestProvinceLeaderboardEntries(allRaw, 'hap');
  assert.deepEqual(
    byHap.map((e) => `${e.ownerUid}:${e.provId}`),
    ['uid_A:prov_1', 'uid_B:prov_2', 'uid_C:prov_1'],
  );

  const byDev = selectBestProvinceLeaderboardEntries(allRaw, 'dev');
  assert.deepEqual(
    byDev.map((e) => `${e.ownerUid}:${e.provId}`),
    ['uid_B:prov_3', 'uid_A:prov_2', 'uid_C:prov_1'],
  );

  const byPop = selectBestProvinceLeaderboardEntries(allRaw, 'pop');
  assert.deepEqual(
    byPop.map((e) => `${e.ownerUid}:${e.provId}`),
    ['uid_B:prov_3', 'uid_A:prov_2', 'uid_C:prov_1'],
  );

  const byEmp = selectBestProvinceLeaderboardEntries(allRaw, 'emp');
  assert.deepEqual(
    byEmp.map((e) => `${e.ownerUid}:${e.provId}`),
    ['uid_B:prov_1', 'uid_A:prov_2', 'uid_C:prov_1'],
  );

  const byGdp = selectBestProvinceLeaderboardEntries(allRaw, 'gdp');
  assert.deepEqual(
    byGdp.map((e) => `${e.ownerUid}:${e.provId}`),
    ['uid_A:prov_2', 'uid_B:prov_3', 'uid_C:prov_1'],
  );

  // Dynamic update: Alice's prov_1 overtakes prov_2 in overallScore and GDP
  const fpBefore = buildProvinceLeaderboardFingerprint(playerA.entries);
  playerA.state.provinces![0] = {
    ...playerA.state.provinces![0],
    gdp: 9_000_000_000,
    dev: 96,
    pop: 140,
    emp: 98,
    hap: 99,
  };
  const updatedAEntries = buildProvinceLeaderboardEntries(playerA.state, 'uid_A', 'Alice', 'PK');
  assert.notEqual(buildProvinceLeaderboardFingerprint(updatedAEntries), fpBefore);

  const updatedOverall = selectBestProvinceLeaderboardEntries(
    [...updatedAEntries, ...playerB.entries, ...playerC.entries],
    'overall',
  );
  assert.equal(updatedOverall.length, 3);
  assert.equal(updatedOverall[0].ownerUid, 'uid_A');
  assert.equal(updatedOverall[0].provId, 'prov_1');
  assert.equal(updatedOverall[0].name, 'Alice Garden');
});
