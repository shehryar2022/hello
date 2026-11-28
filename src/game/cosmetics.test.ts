import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALL_COSMETIC_ITEMS,
  COSMETIC_BUNDLES,
  DIAMOND_ASSETS,
  EXCLUSIVE_BADGES,
  NAME_EFFECTS,
  PREMIUM_ANIMATIONS,
  PROFILE_FRAMES,
  THEME_ITEMS,
  applyBuyCosmeticBundle,
  applyBuyCosmeticItem,
  applyEquipCosmetic,
  applySelectTheme,
  canBuyCosmeticItem,
  filterAndSortCosmetics,
  formatCoinPrice,
  formatCombinedPrice,
  formatDiamondPrice,
  getActiveThemeId,
  getAvailableExclusiveCount,
  getBundlePurchaseQuote,
  getBundleValueSummary,
  getCosmeticCategoryCounts,
  getCosmeticDef,
  getDiamondAssetBonuses,
  getEquippedCosmetics,
  getRarityStars,
  hasActivePreview,
  isCosmeticOwned,
  isThemeOwned,
  resolveEffectiveCosmeticPreview,
  sanitizeCosmeticIdField,
  toggleItemInPreviewLoadout,
} from './cosmetics';
import {
  ALLOWED_SAVE_KEYS,
  calculateIncome,
  cleanSavePayload,
  freshState,
  migrateState,
  targetHappiness,
} from './rules';

test('Diamond Exclusives catalog contains complete categories and balanced items', () => {
  assert.equal(PROFILE_FRAMES.length, 10);
  assert.ok(NAME_EFFECTS.length >= 20 && NAME_EFFECTS.length === 22);
  assert.equal(THEME_ITEMS.length, 15);
  assert.ok(PREMIUM_ANIMATIONS.length >= 15 && PREMIUM_ANIMATIONS.length === 16);
  assert.equal(EXCLUSIVE_BADGES.length, 12);
  assert.equal(DIAMOND_ASSETS.length, 9);
  assert.equal(COSMETIC_BUNDLES.length, 6);

  const counts = getCosmeticCategoryCounts();
  assert.ok(counts.leaderboard_anim >= 15 && counts.leaderboard_anim === 16);
  assert.equal(counts.achievement_fx, 6);
  assert.equal(counts.premium_vfx, 6);
  assert.equal(counts.all, 112);

  // Verify every paid cosmetic item & bundle strictly obeys 50..599 Diamond pricing
  for (const item of ALL_COSMETIC_ITEMS) {
    if (item.isDefaultFree) {
      assert.equal(item.diamondsCost, 0, `${item.id} free default must cost 0`);
    } else {
      assert.ok(item.diamondsCost >= 50 && item.diamondsCost <= 599, `${item.id} (${item.diamondsCost}) out of 50..599 range`);
    }
  }
  for (const bundle of COSMETIC_BUNDLES) {
    assert.ok(bundle.diamondsCost >= 50 && bundle.diamondsCost <= 599, `${bundle.id} (${bundle.diamondsCost}) out of 50..599 range`);
    const summary = getBundleValueSummary(freshState(), bundle.id);
    assert.ok(bundle.diamondsCost < summary.individualDiamondsTotal, `${bundle.id} must discount individual total (${bundle.diamondsCost} vs ${summary.individualDiamondsTotal})`);
  }

  // Verify Diamond Animation 7 rarity tiers
  const animRarities = new Set<string>();
  for (const anim of PREMIUM_ANIMATIONS) {
    animRarities.add(anim.rarity);
    const stars = getRarityStars(anim.rarity);
    assert.ok(stars >= 1 && stars <= 7);
  }
  for (const expectedRarity of ['Basic', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Ultra Exclusive']) {
    assert.ok(animRarities.has(expectedRarity), `Missing animation rarity tier: ${expectedRarity}`);
  }

  const ids = new Set(ALL_COSMETIC_ITEMS.map((i) => i.id));
  assert.equal(ids.size, ALL_COSMETIC_ITEMS.length, 'Every cosmetic item ID must be unique');
  for (const item of ALL_COSMETIC_ITEMS) {
    assert.match(item.id, /^[a-z0-9_]{1,36}$/, `Item ID ${item.id} must satisfy Firestore rules pattern`);
  }
  for (const bundle of COSMETIC_BUNDLES) {
    for (const memberId of bundle.itemIds) {
      assert.ok(ids.has(memberId), `Bundle ${bundle.id} references unknown item ${memberId}`);
    }
  }
});

test('Midnight Galaxy theme is unlocked by default while premium themes require purchase', () => {
  const s = freshState();
  assert.equal(isThemeOwned(s, 'midnight_galaxy'), true);
  assert.equal(isThemeOwned(s, 'cyber_neon'), false);
  assert.equal(getActiveThemeId(s), 'midnight_galaxy');

  const blocked = applySelectTheme(s, 'cyber_neon');
  assert.equal(blocked.ok, false);
});

test('Purchasing cosmetic item deducts currency, prevents duplicates, checks rank, and auto-equips', () => {
  let s = freshState();
  s.gems = 300;
  s.cash = 50_000;
  s.rank = 1;

  // Rank-gated frame blocked at Rank 1
  const rankBlocked = canBuyCosmeticItem(s, 'frame_royal_gold');
  assert.equal(rankBlocked.ok, false);
  assert.match(rankBlocked.reason || '', /Rank 4/);

  // Purchase Neon Glow Frame (50 Diamonds)
  const res1 = applyBuyCosmeticItem(s, 'frame_neon', true, 1_750_000_000_000);
  assert.equal(res1.ok, true);
  s = res1.state;
  assert.equal(s.gems, 250);
  assert.equal(isCosmeticOwned(s, 'frame_neon'), true);
  assert.equal(getEquippedCosmetics(s).frame, 'frame_neon');
  assert.equal(s.cosHist?.length, 1);
  assert.equal(s.cosHist?.[0].itemId, 'frame_neon');
  assert.equal(s.cosHist?.[0].diamondsPaid, 50);

  // Duplicate purchase strictly blocked without deducting Diamonds
  const dup = applyBuyCosmeticItem(s, 'frame_neon');
  assert.equal(dup.ok, false);
  assert.equal(dup.state.gems, 250);
  assert.equal(dup.state.cosHist?.length, 1);

  // Unequip and re-equip works cleanly
  const unequip = applyEquipCosmetic(s, 'frame', null);
  assert.equal(unequip.ok, true);
  assert.equal(getEquippedCosmetics(unequip.state).frame, undefined);

  const reequip = applyEquipCosmetic(unequip.state, 'frame', 'frame_neon');
  assert.equal(reequip.ok, true);
  assert.equal(getEquippedCosmetics(reequip.state).frame, 'frame_neon');
});

test('Bundles support pro-rated discount for partially owned items and block rebuy when fully owned', () => {
  let s = freshState();
  s.gems = 300;
  s.rank = 2;

  // Buy one item from Cyber Neon Suite first
  const pre = applyBuyCosmeticItem(s, 'frame_neon');
  assert.equal(pre.ok, true);
  s = pre.state;

  const fullQuote = getBundlePurchaseQuote(freshState(), 'bundle_cyber_horizon');
  const partialQuote = getBundlePurchaseQuote(s, 'bundle_cyber_horizon');
  assert.equal(partialQuote.alreadyOwnedCount, 1);
  assert.equal(partialQuote.unownedItemIds.length, 3);
  assert.ok(partialQuote.diamondsCost < fullQuote.diamondsCost, 'Partially owned bundle should be discounted');

  const buyBundle = applyBuyCosmeticBundle(s, 'bundle_cyber_horizon');
  assert.equal(buyBundle.ok, true);
  s = buyBundle.state;
  assert.equal(isThemeOwned(s, 'cyber_neon'), true);
  assert.equal(getActiveThemeId(s), 'cyber_neon');
  assert.equal(getEquippedCosmetics(s).nameEffect, 'nfx_neon');
  assert.equal(getEquippedCosmetics(s).anim, 'anim_borders');

  const rebuy = applyBuyCosmeticBundle(s, 'bundle_cyber_horizon');
  assert.equal(rebuy.ok, false);
});

test('Dual-currency Diamond Landmarks stay bounded (anti-P2W caps) and boost economy/happiness', () => {
  let s = freshState();
  s.b.tech_parks = 4;
  s.rank = 12;
  s.gems = 5000;
  s.cash = 50_000_000;

  const baseInc = calculateIncome(s, { ignoreTempBoosters: true }).net;
  const baseHap = targetHappiness(s);

  for (const asset of DIAMOND_ASSETS) {
    const res = applyBuyCosmeticItem(s, asset.id);
    assert.equal(res.ok, true, `Expected ${asset.id} purchase to succeed: ${res.reason}`);
    s = res.state;
  }

  const bonuses = getDiamondAssetBonuses(s);
  assert.equal(bonuses.ownedAssetIds.length, 9);
  assert.ok(bonuses.incomeMult <= 1.08 + 1e-9, 'Income multiplier capped at +8%');
  assert.ok(bonuses.hapBonus <= 6, 'Happiness bonus capped at +6');
  assert.ok(bonuses.tradeBonus <= 0.1 + 1e-9, 'Trade bonus capped at +10%');

  const boostedInc = calculateIncome(s, { ignoreTempBoosters: true }).net;
  const boostedHap = targetHappiness(s);
  assert.ok(boostedInc > baseInc);
  assert.ok(boostedHap >= baseHap);
});

test('Cosmetic inventory, equipped slots, theme, and reward history round-trip via cloud save pack while preserving 47 top-level keys', () => {
  let s = freshState();
  s.gems = 500;
  s.rank = 2;
  s = applyBuyCosmeticItem(s, 'frame_aurora').state;
  s = applyBuyCosmeticItem(s, 'nfx_rainbow').state;
  s = applyBuyCosmeticItem(s, 'badge_diamond_member').state;
  s = applyBuyCosmeticItem(s, 'theme_aurora_nights').state;
  s = applyBuyCosmeticItem(s, 'anim_sparkles').state;

  const packed = cleanSavePayload(s);
  for (const key of Object.keys(packed)) {
    if (key !== 'provBudgetLog') {
      assert.ok(ALLOWED_SAVE_KEYS.has(key), `Unexpected cloud save key ${key}`);
    }
  }
  assert.ok(Array.isArray(packed.provBudgetLog), 'Extended v2 pack should carry cosmetics cleanly');

  const restored = migrateState(packed as never);
  assert.equal(isCosmeticOwned(restored, 'frame_aurora'), true);
  assert.equal(isCosmeticOwned(restored, 'nfx_rainbow'), true);
  assert.equal(isCosmeticOwned(restored, 'badge_diamond_member'), true);
  assert.equal(getActiveThemeId(restored), 'aurora_nights');
  assert.deepEqual(getEquippedCosmetics(restored), {
    frame: 'frame_aurora',
    nameEffect: 'nfx_rainbow',
    badge: 'badge_diamond_member',
    anim: 'anim_sparkles',
    lbAnim: undefined,
    achFx: undefined,
    premiumVfx: undefined,
  });
  assert.equal(restored.cosHist?.length, 5);
});

test('sanitizeCosmeticIdField rejects tampered or oversized cosmetic IDs', () => {
  assert.equal(sanitizeCosmeticIdField('frame_neon'), 'frame_neon');
  assert.equal(sanitizeCosmeticIdField(''), '');
  assert.equal(sanitizeCosmeticIdField('../hack'), '');
  assert.equal(sanitizeCosmeticIdField('A'.repeat(40)), '');
  assert.equal(sanitizeCosmeticIdField(12345), '');
});

test('Multi-cosmetic preview stacking composes compatible slots without mutating inventory', () => {
  const s = freshState();
  s.gems = 40;
  const frameItem = getCosmeticDef('frame_neon')!;
  const nameItem = getCosmeticDef('nfx_rainbow')!;
  const themeItem = getCosmeticDef('theme_cyber_neon')!;
  const landmarkItem = getCosmeticDef('asset_aurora_obelisk')!;

  let loadout = toggleItemInPreviewLoadout({}, frameItem);
  loadout = toggleItemInPreviewLoadout(loadout, nameItem);
  loadout = toggleItemInPreviewLoadout(loadout, themeItem);
  loadout = toggleItemInPreviewLoadout(loadout, landmarkItem);

  assert.equal(hasActivePreview(loadout), true);
  const resolved = resolveEffectiveCosmeticPreview(s, loadout);
  assert.equal(resolved.frame, 'frame_neon');
  assert.equal(resolved.nameEffect, 'nfx_rainbow');
  assert.equal(resolved.themeId, 'cyber_neon');
  assert.equal(resolved.landmarkId, 'asset_aurora_obelisk');
  assert.equal(resolved.previewCount, 4);

  // Toggling an already previewed item removes only that slot cleanly
  loadout = toggleItemInPreviewLoadout(loadout, nameItem);
  const afterToggle = resolveEffectiveCosmeticPreview(s, loadout);
  assert.equal(afterToggle.nameEffect, undefined);
  assert.equal(afterToggle.frame, 'frame_neon');

  // Reset leaves player inventory untouched
  assert.equal((s.cos || []).length, 0);
  assert.equal(getEquippedCosmetics(s).frame, undefined);
});

test('Marketplace filters, sorting, category counts, bundle math, and coin formatting match exact specs', () => {
  const s = freshState();
  s.rank = 2;
  s.gems = 50;

  const counts = getCosmeticCategoryCounts();
  assert.equal(counts.all, 112);
  assert.equal(counts.bundle, 6);
  assert.equal(counts.diamond_asset, 9);
  assert.equal(getAvailableExclusiveCount(s), 111); // midnight_galaxy default owned

  const asc = filterAndSortCosmetics(s, ALL_COSMETIC_ITEMS, { sortBy: 'price_asc', ownership: 'unowned' });
  assert.ok(asc.length > 0);
  for (let i = 1; i < asc.length; i += 1) {
    assert.ok(asc[i].diamondsCost >= asc[i - 1].diamondsCost);
  }

  const under100 = filterAndSortCosmetics(s, ALL_COSMETIC_ITEMS, { price: 'under_100' });
  assert.ok(under100.length > 0);
  assert.ok(under100.every((x) => x.diamondsCost > 0 && x.diamondsCost < 100));

  const dualLandmarks = filterAndSortCosmetics(s, DIAMOND_ASSETS, { price: 'dual_currency', ownership: 'available' });
  assert.ok(dualLandmarks.every((x) => (x.coinsCost || 0) > 0 && (!x.reqRank || x.reqRank <= s.rank)));

  const cyberBundle = getBundleValueSummary(s, 'bundle_cyber_horizon');
  assert.equal(cyberBundle.individualDiamondsTotal, 50 + 54 + 58 + 175);
  assert.equal(cyberBundle.bundleDiamondsPrice, 235);
  assert.equal(cyberBundle.savedDiamonds, 337 - 235);
  assert.equal(cyberBundle.savingsPct, Math.round((102 / 337) * 100));

  // Verify cosHist caps cleanly at 25 entries newest-first
  let histState = freshState();
  histState.gems = 10_000;
  histState.cash = 100_000_000;
  histState.rank = 15;
  for (let i = 0; i < 30; i += 1) {
    const item = ALL_COSMETIC_ITEMS.find((x) => !x.isDefaultFree && !histState.cos?.includes(x.id));
    if (!item) break;
    histState = applyBuyCosmeticItem(histState, item.id, false, 1_750_000_000_000 + i).state;
  }
  assert.equal(histState.cosHist?.length, 25);

  assert.equal(formatDiamondPrice(26), '26 Diamonds');
  assert.equal(formatCoinPrice(250_000), '250K Coins');
  assert.equal(formatCombinedPrice(26, 120_000), '26 Diamonds + 120K Coins');
  assert.equal(formatCoinPrice(120_000).includes('₨'), false);
});

