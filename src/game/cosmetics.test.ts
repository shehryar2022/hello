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
  assert.equal(NAME_EFFECTS.length, 8);
  assert.equal(THEME_ITEMS.length, 10);
  assert.equal(PREMIUM_ANIMATIONS.length, 10);
  assert.equal(EXCLUSIVE_BADGES.length, 6);
  assert.equal(DIAMOND_ASSETS.length, 4);
  assert.equal(COSMETIC_BUNDLES.length, 4);

  // Verify Part 1 Diamond Animation pricing & 7 rarity tiers (50-599 Diamonds, all unique prices)
  const animPrices = new Set<number>();
  const animRarities = new Set<string>();
  for (const anim of PREMIUM_ANIMATIONS) {
    assert.ok(anim.diamondsCost >= 50 && anim.diamondsCost <= 599, `${anim.id} out of 50..599 range`);
    assert.ok(!animPrices.has(anim.diamondsCost), `Duplicate animation price ${anim.diamondsCost}`);
    animPrices.add(anim.diamondsCost);
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

  // Purchase Neon Glow Frame (12 Diamonds)
  const res1 = applyBuyCosmeticItem(s, 'frame_neon');
  assert.equal(res1.ok, true);
  s = res1.state;
  assert.equal(s.gems, 288);
  assert.equal(isCosmeticOwned(s, 'frame_neon'), true);
  assert.equal(getEquippedCosmetics(s).frame, 'frame_neon');

  // Duplicate purchase strictly blocked without deducting Diamonds
  const dup = applyBuyCosmeticItem(s, 'frame_neon');
  assert.equal(dup.ok, false);
  assert.equal(dup.state.gems, 288);

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
  s.rank = 6;
  s.gems = 500;
  s.cash = 10_000_000;

  const baseInc = calculateIncome(s, { ignoreTempBoosters: true }).net;
  const baseHap = targetHappiness(s);

  for (const asset of DIAMOND_ASSETS) {
    const res = applyBuyCosmeticItem(s, asset.id);
    assert.equal(res.ok, true, `Expected ${asset.id} purchase to succeed`);
    s = res.state;
  }

  const bonuses = getDiamondAssetBonuses(s);
  assert.equal(bonuses.ownedAssetIds.length, 4);
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
  });
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
  assert.equal(counts.all, 48);
  assert.equal(counts.bundle, 4);
  assert.equal(counts.diamond_asset, 4);
  assert.equal(getAvailableExclusiveCount(s), 47); // midnight_galaxy default owned

  const asc = filterAndSortCosmetics(s, ALL_COSMETIC_ITEMS, { sortBy: 'price_asc', ownership: 'unowned' });
  assert.ok(asc.length > 0);
  for (let i = 1; i < asc.length; i += 1) {
    assert.ok(asc[i].diamondsCost >= asc[i - 1].diamondsCost);
  }

  const dualLandmarks = filterAndSortCosmetics(s, DIAMOND_ASSETS, { price: 'dual_currency', ownership: 'available' });
  assert.ok(dualLandmarks.every((x) => (x.coinsCost || 0) > 0 && (!x.reqRank || x.reqRank <= s.rank)));

  const cyberBundle = getBundleValueSummary(s, 'bundle_cyber_horizon');
  assert.equal(cyberBundle.individualDiamondsTotal, 12 + 18 + 16 + 175);
  assert.equal(cyberBundle.savedDiamonds, 221 - 155);
  assert.equal(cyberBundle.savingsPct, Math.round((66 / 221) * 100));

  assert.equal(formatDiamondPrice(26), '26 Diamonds');
  assert.equal(formatCoinPrice(250_000), '250K Coins');
  assert.equal(formatCombinedPrice(26, 120_000), '26 Diamonds + 120K Coins');
  assert.equal(formatCoinPrice(120_000).includes('₨'), false);
});

