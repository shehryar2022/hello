import React, { memo, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ALL_COSMETIC_ITEMS,
  COSMETIC_BUNDLES,
  DIAMOND_ASSETS,
  RARITY_COLORS,
  canBuyCosmeticBundle,
  canBuyCosmeticItem,
  filterAndSortCosmetics,
  formatCoinPrice,
  getActiveThemeId,
  getAvailableExclusiveCount,
  getBundlePurchaseQuote,
  getBundleValueSummary,
  getCosmeticCategoryCounts,
  getCosmeticDef,
  getEquippedCosmetics,
  getOwnedCosmeticsSet,
  getRarityStars,
  isCosmeticOwned,
  isItemActiveInPreviewLoadout,
  raritySlug,
  slotForCategory,
  type CosmeticPreviewLoadout,
  type DxCategoryFilter,
  type DxOwnershipFilter,
  type DxPriceFilter,
  type DxRarityFilter,
  type DxSortBy,
} from '../../game/cosmetics';
import type {
  CosmeticBundleDef,
  CosmeticItemDef,
  DiamondAssetDef,
  EquippedCosmetics,
  GameState,
  GameThemeId,
} from '../../game/types';
import {
  Award,
  CashCoinIcon,
  CheckCircle2,
  Eye,
  GemDiamondIcon,
  Landmark,
  Layers,
  Palette,
  Search,
  Sparkles,
  Zap,
} from '../GameIcons';
import { CollectionArtwork, CosmeticItemArtwork, RarityCrestGem } from './CosmeticArtwork';
import { LandmarkPreviewCanvas } from './LandmarkPreviewCanvas';
import { LivePreviewStudio } from './LivePreviewStudio';

const DX_CATEGORY_TABS: Array<{ id: DxCategoryFilter; label: string; icon: React.ReactNode }> = [
  { id: 'all', label: 'All Exclusives', icon: <Sparkles size={14} /> },
  { id: 'bundle', label: 'Collections', icon: <Layers size={14} /> },
  { id: 'name_effect', label: 'Typography FX', icon: <span style={{ fontSize: 13 }}>🖋️</span> },
  { id: 'leaderboard_anim', label: 'Leaderboard FX', icon: <span style={{ fontSize: 13 }}>🏆</span> },
  { id: 'animation', label: 'UI Effects', icon: <Zap size={14} /> },
  { id: 'theme', label: 'Themes', icon: <Palette size={14} /> },
  { id: 'badge', label: 'Badges', icon: <span style={{ fontSize: 13 }}>🏅</span> },
  { id: 'achievement_fx', label: 'Achievement FX', icon: <Award size={14} /> },
  { id: 'premium_vfx', label: 'Premium VFX', icon: <Sparkles size={14} /> },
  { id: 'profile_effect', label: 'Static Borders', icon: <span style={{ fontSize: 13 }}>🖼️</span> },
  { id: 'diamond_asset', label: '3D Landmarks', icon: <Landmark size={14} /> },
];

type PendingConfirm =
  | { kind: 'item'; item: CosmeticItemDef; diamondsCost: number; coinsCost: number }
  | {
      kind: 'bundle';
      bundle: CosmeticBundleDef;
      diamondsCost: number;
      coinsCost: number;
      unlockCount: number;
    };

interface DiamondExclusivesShopProps {
  state: GameState;
  username: string;
  countryCode: string;
  previewLoadout: CosmeticPreviewLoadout;
  onTogglePreviewItem: (item: CosmeticItemDef) => void;
  onCancelPreview: () => void;
  onResetToDefault: () => void;
  onPreviewLandmarkInCity: (asset: DiamondAssetDef) => void;
  onBuyItem: (itemId: string) => void;
  onBuyBundle: (bundleId: string) => void;
  onEquipCosmetic: (slot: keyof EquippedCosmetics, itemId: string | null) => void;
  onSelectTheme: (themeId: GameThemeId) => void;
}

export const DiamondExclusivesShop = memo(function DiamondExclusivesShop({
  state,
  username,
  countryCode,
  previewLoadout,
  onTogglePreviewItem,
  onCancelPreview,
  onResetToDefault,
  onPreviewLandmarkInCity,
  onBuyItem,
  onBuyBundle,
  onEquipCosmetic,
  onSelectTheme,
}: DiamondExclusivesShopProps) {
  const [catFilter, setCatFilter] = useState<DxCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState<DxRarityFilter>('all');
  const [priceFilter, setPriceFilter] = useState<DxPriceFilter>('all');
  const [ownershipFilter, setOwnershipFilter] = useState<DxOwnershipFilter>('all');
  const [sortBy, setSortBy] = useState<DxSortBy>('recommended');
  const [inspectedLandmarkId, setInspectedLandmarkId] = useState<string>(DIAMOND_ASSETS[0].id);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const buyLockRef = useRef(false);

  const studioRef = useRef<HTMLDivElement | null>(null);
  const ownedSet = useMemo(() => getOwnedCosmeticsSet(state), [state.cos]);
  const equipped = useMemo(() => getEquippedCosmetics(state), [state.cos, state.cosEq]);
  const activeThemeId = useMemo(() => getActiveThemeId(state), [state.cos, state.theme]);
  const categoryCounts = useMemo(() => getCosmeticCategoryCounts(), []);
  const availableExclusiveCount = useMemo(() => getAvailableExclusiveCount(state), [state.cos]);

  const safeGems = Math.max(0, Math.floor(Number.isFinite(state.gems) ? state.gems : 0));
  const safeCash = Math.max(0, Math.floor(Number.isFinite(state.cash) ? state.cash : 0));

  const filteredItems = useMemo(() => {
    if (catFilter === 'bundle') return [];
    const basePool =
      catFilter === 'all'
        ? ALL_COSMETIC_ITEMS.filter((i) => i.category !== 'diamond_asset')
        : ALL_COSMETIC_ITEMS;
    return filterAndSortCosmetics(state, basePool, {
      category: catFilter,
      search: searchQuery,
      rarity: rarityFilter,
      price: priceFilter,
      ownership: ownershipFilter,
      sortBy,
    });
  }, [catFilter, ownershipFilter, priceFilter, rarityFilter, searchQuery, sortBy, state]);

  const filteredLandmarks = useMemo(() => {
    if (catFilter !== 'all' && catFilter !== 'diamond_asset') return [];
    return filterAndSortCosmetics(state, DIAMOND_ASSETS, {
      category: 'diamond_asset',
      search: searchQuery,
      rarity: rarityFilter,
      price: priceFilter,
      ownership: ownershipFilter,
      sortBy,
    }) as DiamondAssetDef[];
  }, [catFilter, ownershipFilter, priceFilter, rarityFilter, searchQuery, sortBy, state]);

  const showBundles =
    (catFilter === 'all' || catFilter === 'bundle') &&
    !searchQuery.trim() &&
    rarityFilter === 'all' &&
    priceFilter === 'all' &&
    ownershipFilter === 'all';

  const inspectedLandmark = useMemo(
    () => DIAMOND_ASSETS.find((a) => a.id === inspectedLandmarkId) || DIAMOND_ASSETS[0],
    [inspectedLandmarkId],
  );

  const requestBuyItem = (item: CosmeticItemDef) => {
    const check = canBuyCosmeticItem(state, item.id);
    if (!check.ok || isPurchasing) return;
    setPendingConfirm({
      kind: 'item',
      item,
      diamondsCost: check.diamondsCost,
      coinsCost: check.coinsCost,
    });
  };

  const requestBuyBundle = (bundle: CosmeticBundleDef) => {
    const check = canBuyCosmeticBundle(state, bundle.id);
    const quote = getBundlePurchaseQuote(state, bundle.id);
    if (!check.ok || isPurchasing) return;
    setPendingConfirm({
      kind: 'bundle',
      bundle,
      diamondsCost: check.diamondsCost,
      coinsCost: check.coinsCost,
      unlockCount: quote.unownedItemIds.length,
    });
  };

  const handleConfirmPurchase = () => {
    if (!pendingConfirm || isPurchasing || buyLockRef.current) return;
    buyLockRef.current = true;
    setIsPurchasing(true);
    try {
      if (pendingConfirm.kind === 'item') {
        onBuyItem(pendingConfirm.item.id);
      } else {
        onBuyBundle(pendingConfirm.bundle.id);
      }
      setPendingConfirm(null);
    } finally {
      setIsPurchasing(false);
      buyLockRef.current = false;
    }
  };

  const scrollToStudio = () => {
    studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const activeFiltersCount =
    (rarityFilter !== 'all' ? 1 : 0) +
    (priceFilter !== 'all' ? 1 : 0) +
    (ownershipFilter !== 'all' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  return (
    <div className="dx-wrap" data-testid="diamond-exclusives-shop">
      {/* 2. PREMIUM DIAMOND SHOP HEADER */}
      <header className="dx-hero">
        <div className="dx-hero-top">
          <div>
            <span className="dx-kicker">CURATED LUXURY VAULT</span>
            <h3>💎 DIAMOND EXCLUSIVES</h3>
            <p>
              Curated premium cosmetics, interactive themes, signature collections &amp; 3D capital monuments.
            </p>
          </div>

          <div className="dx-hero-metrics">
            <div className="dx-metric-box">
              <small>Diamond Balance</small>
              <b style={{ color: 'var(--cy)' }}>
                <GemDiamondIcon size={15} />
                <span>{safeGems.toLocaleString('en-US')}</span>
              </b>
            </div>
            <div className="dx-metric-box">
              <small>Total Owned</small>
              <b style={{ color: 'var(--mint)' }}>
                {ownedSet.size}/{ALL_COSMETIC_ITEMS.length}
              </b>
            </div>
            <div className="dx-metric-box">
              <small>Available Exclusives</small>
              <b style={{ color: '#e9d5ff' }}>{availableExclusiveCount}</b>
            </div>
            <button type="button" className="btn sm gold" onClick={scrollToStudio}>
              <Sparkles size={13} />
              <span>Live Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. LIVE IDENTITY & THEME STUDIO CENTERPIECE */}
      <div ref={studioRef}>
        <LivePreviewStudio
          state={state}
          username={username}
          countryCode={countryCode}
          previewLoadout={previewLoadout}
          onTogglePreviewItem={onTogglePreviewItem}
          onCancelPreview={onCancelPreview}
          onResetToDefault={onResetToDefault}
          onEquipCosmetic={onEquipCosmetic}
          onSelectTheme={onSelectTheme}
          onRequestPurchase={requestBuyItem}
        />
      </div>

      {/* 4. REF-1 STORE LAYOUT: LEFT VERTICAL CATEGORY RAIL + RIGHT CONTENT */}
      <div className="dx-store-layout">
        <aside className="dx-rail" role="tablist" aria-label="Diamond Exclusives Categories">
          {DX_CATEGORY_TABS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={catFilter === cat.id}
              className={`dx-rail-btn${catFilter === cat.id ? ' on' : ''}`}
              data-testid={`dx-cat-${cat.id}`}
              onClick={() => setCatFilter(cat.id)}
            >
              <span className="dx-rail-ic" aria-hidden="true">{cat.icon}</span>
              <span className="dx-rail-lbl">{cat.label}</span>
              <span className="dx-rail-cnt">{categoryCounts[cat.id]}</span>
            </button>
          ))}
        </aside>

        <div className="dx-main-col">
          {/* Search + Filters + Sorting Toolbar */}
          <div className="dx-toolbar" data-testid="dx-toolbar">
            <label className="dx-search-box">
              <Search size={14} />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search frames, themes, badges, landmarks..."
                aria-label="Search Diamond Exclusives"
                data-testid="dx-search-input"
              />
            </label>

            <div className="dx-filter-controls">
              <select
                aria-label="Filter by Rarity"
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value as DxRarityFilter)}
                className="dx-select"
                data-testid="dx-filter-rarity"
              >
                <option value="all">All Rarities</option>
                <option value="Common">Common</option>
                <option value="Basic">Basic</option>
                <option value="Uncommon">Uncommon</option>
                <option value="Rare">Rare</option>
                <option value="Epic">Epic</option>
                <option value="Legendary">Legendary</option>
                <option value="Mythic">Mythic</option>
                <option value="Exclusive">Exclusive</option>
                <option value="Ultra Exclusive">Ultra Exclusive</option>
              </select>

              <select
                aria-label="Filter by Price"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value as DxPriceFilter)}
                className="dx-select"
                data-testid="dx-filter-price"
              >
                <option value="all">All Prices</option>
                <option value="diamonds_only">Diamonds Only</option>
                <option value="dual_currency">Dual Currency</option>
                <option value="under_50">Under 50 Diamonds</option>
                <option value="under_200">Under 200 Diamonds</option>
              </select>

              <select
                aria-label="Filter by Ownership and Rank"
                value={ownershipFilter}
                onChange={(e) => setOwnershipFilter(e.target.value as DxOwnershipFilter)}
                className="dx-select"
                data-testid="dx-filter-ownership"
              >
                <option value="all">All Items</option>
                <option value="available">Available Now</option>
                <option value="owned">Owned</option>
                <option value="unowned">Unowned</option>
                <option value="rank_locked">Rank Restricted</option>
              </select>

              <select
                aria-label="Sort Exclusives"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as DxSortBy)}
                className="dx-select"
                data-testid="dx-sort-select"
              >
                <option value="recommended">Recommended</option>
                <option value="price_asc">Lowest Price</option>
                <option value="price_desc">Highest Price</option>
                <option value="rarity">Highest Rarity</option>
                <option value="newest">Recently Added</option>
              </select>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    setSearchQuery('');
                    setRarityFilter('all');
                    setPriceFilter('all');
                    setOwnershipFilter('all');
                  }}
                >
                  Clear ({activeFiltersCount})
                </button>
              )}
            </div>
          </div>

          {/* 5. SIGNATURE COLLECTIONS (Separate Showcase) */}
          {showBundles && (
            <section className="dx-sec-block" aria-label="Signature Collections" data-testid="signature-collections">
              <div className="dx-sec-hdr">
                <div>
                  <h4>
                    <Sparkles size={15} color="#c084fc" />
                    <span>Signature Collections</span>
                  </h4>
                  <small>Curated full-identity sets with real bundle savings &amp; owned-item credit</small>
                </div>
              </div>

              <div className="dx-bundles-grid">
                {COSMETIC_BUNDLES.map((bundle) => {
                  const val = getBundleValueSummary(state, bundle.id);
                  const quote = getBundlePurchaseQuote(state, bundle.id);
                  const check = canBuyCosmeticBundle(state, bundle.id);
                  const rarityStyle = RARITY_COLORS[bundle.rarity];

                  return (
                    <article
                      key={bundle.id}
                      className={`dx-bundle-card dx-tier--${raritySlug(bundle.rarity)}`}
                      data-testid={`collection-${bundle.id}`}
                    >
                      <div className="dx-crest-anchor">
                        <RarityCrestGem rarity={bundle.rarity} size={22} />
                      </div>

                      <CollectionArtwork
                        bundle={bundle}
                        username={username}
                        countryCode={countryCode}
                      />

                      <div className="dx-bundle-body">
                        <div className="dx-bundle-title-row">
                          <div>
                            <h5>{bundle.name}</h5>
                            <small className="dim">{bundle.itemIds.length} Included Exclusives</small>
                          </div>
                          <span
                            className="dx-rarity"
                            style={{
                              color: rarityStyle.text,
                              borderColor: rarityStyle.border,
                              background: rarityStyle.bg,
                            }}
                          >
                            {bundle.rarity}
                          </span>
                        </div>

                        <p className="dx-desc">{bundle.desc}</p>

                        <div className="dx-bundle-items">
                          {bundle.itemIds.map((id) => {
                            const item = getCosmeticDef(id);
                            if (!item) return null;
                            const isOwned = ownedSet.has(id);
                            const isPreviewed = isItemActiveInPreviewLoadout(previewLoadout, item);
                            return (
                              <button
                                key={id}
                                type="button"
                                className={`dx-bundle-chip${isOwned ? ' owned' : ''}${isPreviewed ? ' previewing' : ''}`}
                                onClick={() => onTogglePreviewItem(item)}
                                title={`Click to preview ${item.name}`}
                              >
                                <span aria-hidden="true">{item.icon}</span>
                                <span>{item.name}</span>
                                {isOwned && <CheckCircle2 size={11} color="#3fe0b0" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="dx-bundle-math">
                          <div className="dx-bundle-val">
                            <span className="dim">Individual Value:</span>
                            <span className="dx-strike">
                              {val.individualDiamondsTotal} Diamonds
                              {val.individualCoinsTotal > 0 ? ` + ${formatCoinPrice(val.individualCoinsTotal)}` : ''}
                            </span>
                            {val.savedDiamonds > 0 && (
                              <span className="dx-save-pill">
                                Save {val.savedDiamonds} 💎 ({val.savingsPct}% Off)
                              </span>
                            )}
                          </div>

                          <div className="dx-bundle-cta-row">
                            {quote.allOwned ? (
                              <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)' }}>
                                Collection Complete
                              </span>
                            ) : (
                              <>
                                <div className="dx-price">
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <GemDiamondIcon size={14} />
                                    <span>{quote.diamondsCost} Diamonds</span>
                                  </span>
                                  {quote.coinsCost > 0 && (
                                    <span className="dx-price-coins">
                                      <CashCoinIcon size={13} />
                                      <span>{formatCoinPrice(quote.coinsCost)}</span>
                                    </span>
                                  )}
                                  {quote.alreadyOwnedCount > 0 && (
                                    <small className="ok">
                                      Pro-rated ({quote.alreadyOwnedCount}/{bundle.itemIds.length} owned)
                                    </small>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className={`btn sm ${check.ok ? 'gold' : 'no'}`}
                                  disabled={!check.ok}
                                  title={check.reason}
                                  onClick={() => requestBuyBundle(bundle)}
                                >
                                  {check.ok ? 'Unlock Collection' : check.reason || 'Locked'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* 8. DEDICATED 3D LANDMARK MARKETPLACE */}
          {(catFilter === 'all' || catFilter === 'diamond_asset') && (
            <section className="dx-sec-block" aria-label="3D Landmarks Marketplace" data-testid="landmarks-marketplace">
              <div className="dx-sec-hdr">
                <div>
                  <h4>
                    <Landmark size={16} color="#7ee8ff" />
                    <span>3D Capital Landmarks</span>
                  </h4>
                  <small>Architectural waterfront monuments rendered live in your 3D Capital</small>
                </div>
              </div>

              {filteredLandmarks.length === 0 ? (
                <div className="dx-empty">No 3D Landmarks match your active filters.</div>
              ) : (
                <div className="dx-landmark-stage-wrap">
                  {/* Single active WebGL 3D showroom */}
                  <div className="dx-landmark-inspector">
                    <LandmarkPreviewCanvas asset={inspectedLandmark} height={235} />
                    <div className="dx-landmark-insp-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div>
                          <h5>{inspectedLandmark.name}</h5>
                          <small className="dim">
                            {isCosmeticOwned(state, inspectedLandmark.id)
                              ? 'Placed in 3D Capital'
                              : 'Available for Waterfront Placement'}
                            {inspectedLandmark.reqRank ? ` · Requires Rank ${inspectedLandmark.reqRank}+` : ''}
                          </small>
                        </div>
                        <RarityCrestGem rarity={inspectedLandmark.rarity} size={22} />
                      </div>
                      <p className="dx-desc">{inspectedLandmark.desc}</p>
                      <div className="dx-landmark-bonuses">
                        <span>+{inspectedLandmark.incomePctBonus}% National Income</span>
                        <span>+{inspectedLandmark.hapBonus} Happiness</span>
                        {inspectedLandmark.tradeBonusPct > 0 && (
                          <span>+{inspectedLandmark.tradeBonusPct}% Trade Bonus</span>
                        )}
                      </div>
                      <div className="dx-landmark-insp-acts">
                        <button
                          type="button"
                          className="btn sm"
                          data-testid="preview-in-3d-capital-btn"
                          onClick={() => onPreviewLandmarkInCity(inspectedLandmark)}
                        >
                          <Eye size={13} />
                          <span>Preview in 3D Capital</span>
                        </button>
                        {isCosmeticOwned(state, inspectedLandmark.id) ? (
                          <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)' }}>
                            Placed in 3D Capital
                          </span>
                        ) : (
                          (() => {
                            const ck = canBuyCosmeticItem(state, inspectedLandmark.id);
                            return (
                              <button
                                type="button"
                                className={`btn sm ${ck.ok ? 'gold' : 'no'}`}
                                disabled={!ck.ok}
                                title={ck.reason}
                                onClick={() => requestBuyItem(inspectedLandmark)}
                              >
                                {ck.ok
                                  ? `Unlock · ${inspectedLandmark.diamondsCost} 💎${inspectedLandmark.coinsCost ? ` + ${formatCoinPrice(inspectedLandmark.coinsCost)}` : ''}`
                                  : ck.reason || 'Locked'}
                              </button>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 4 Landmark Selector Cards */}
                  <div className="dx-showcase-grid dx-landmarks-grid">
                    {filteredLandmarks.map((asset) => {
                      const owned = isCosmeticOwned(state, asset.id);
                      const check = canBuyCosmeticItem(state, asset.id);
                      const rarityStyle = RARITY_COLORS[asset.rarity];
                      const isInspected = inspectedLandmark.id === asset.id;
                      const isPreviewingCity = isItemActiveInPreviewLoadout(previewLoadout, asset);

                      return (
                        <article
                          key={asset.id}
                          className={`dx-portrait-card dx-tier--${raritySlug(asset.rarity)}${owned ? ' is-owned' : ''}${isInspected ? ' is-previewing' : ''}`}
                        >
                          <div className="dx-crest-anchor">
                            <RarityCrestGem rarity={asset.rarity} size={20} />
                          </div>

                          <div
                            className="dx-portrait-media"
                            role="button"
                            tabIndex={0}
                            onClick={() => setInspectedLandmarkId(asset.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') setInspectedLandmarkId(asset.id);
                            }}
                          >
                            <CosmeticItemArtwork
                              item={asset}
                              username={username}
                              countryCode={countryCode}
                            />
                            <div className="dx-portrait-scrim" />
                            <div className="dx-portrait-top-badges">
                              <span
                                className="dx-rarity"
                                style={{
                                  color: rarityStyle.text,
                                  borderColor: rarityStyle.border,
                                  background: rarityStyle.bg,
                                }}
                              >
                                {asset.rarity}
                              </span>
                              <span className="dx-status-chip">
                                {owned ? 'Placed' : asset.reqRank ? `Rank ${asset.reqRank}+` : 'All Ranks'}
                              </span>
                            </div>
                          </div>

                          <div className="dx-portrait-body">
                            <div className="dx-portrait-title">
                              <span aria-hidden="true">{asset.icon}</span>
                              <h5>{asset.name}</h5>
                            </div>
                            <small className="dx-portrait-sub">
                              +{asset.incomePctBonus}% Inc · +{asset.hapBonus} Hap
                              {asset.tradeBonusPct > 0 ? ` · +${asset.tradeBonusPct}% Trade` : ''}
                            </small>
                            <p className="dx-portrait-desc">{asset.desc}</p>

                            <div className="dx-portrait-price">
                              {owned ? (
                                <span className="ok" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <CheckCircle2 size={13} />
                                  <span>Placed in 3D Capital</span>
                                </span>
                              ) : (
                                <>
                                  <span className="dx-p-dia">
                                    <GemDiamondIcon size={13} />
                                    <span>{asset.diamondsCost} Diamonds</span>
                                  </span>
                                  {asset.coinsCost ? (
                                    <span className="dx-p-coin">
                                      <CashCoinIcon size={12} />
                                      <span>{formatCoinPrice(asset.coinsCost)}</span>
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </div>

                            <div className="dx-portrait-acts">
                              <button
                                type="button"
                                className="btn sm"
                                onClick={() => {
                                  setInspectedLandmarkId(asset.id);
                                  onPreviewLandmarkInCity(asset);
                                }}
                              >
                                {isPreviewingCity ? 'Viewing 3D' : 'Preview 3D'}
                              </button>
                              {!owned && (
                                <button
                                  type="button"
                                  className={`btn sm ${check.ok ? 'gold' : 'no'}`}
                                  disabled={!check.ok}
                                  title={check.reason}
                                  onClick={() => requestBuyItem(asset)}
                                >
                                  {check.ok
                                    ? 'Unlock'
                                    : asset.reqRank && (state.rank || 1) < asset.reqRank
                                      ? `Rank ${asset.reqRank}+`
                                      : 'Locked'}
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 6. PREMIUM PORTRAIT PRODUCT CARDS GRID */}
          {catFilter !== 'bundle' && catFilter !== 'diamond_asset' && (
            <section className="dx-sec-block" aria-label="Exclusive Catalog">
              <div className="dx-sec-hdr">
                <div>
                  <h4>
                    <span>
                      {DX_CATEGORY_TABS.find((t) => t.id === catFilter)?.label || 'Exclusives Catalog'}
                    </span>
                  </h4>
                  <small>
                    Showing {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                  </small>
                </div>
              </div>

              {filteredItems.length === 0 ? (
                <div className="dx-empty">
                  No cosmetics match your current search or filter settings.
                </div>
              ) : (
                <div className="dx-showcase-grid" data-testid="dx-products-grid">
                  {filteredItems.map((item) => {
                    const owned = isCosmeticOwned(state, item.id);
                    const slot = slotForCategory(item.category);
                    const isEquipped =
                      item.category === 'theme'
                        ? activeThemeId === item.themeId
                        : slot
                          ? equipped[slot] === item.id
                          : false;
                    const buyCheck = canBuyCosmeticItem(state, item.id);
                    const rarityStyle = RARITY_COLORS[item.rarity];
                    const isPreviewing = isItemActiveInPreviewLoadout(previewLoadout, item);
                    const stars = getRarityStars(item.rarity);

                    return (
                      <article
                        key={item.id}
                        className={`dx-portrait-card dx-tier--${raritySlug(item.rarity)}${isEquipped ? ' is-equipped' : ''}${isPreviewing ? ' is-previewing' : ''}`}
                        data-testid={`cosmetic-card-${item.id}`}
                      >
                        <div className="dx-crest-anchor">
                          <RarityCrestGem rarity={item.rarity} size={20} />
                        </div>

                        <div
                          className="dx-portrait-media"
                          role="button"
                          tabIndex={0}
                          onClick={() => onTogglePreviewItem(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') onTogglePreviewItem(item);
                          }}
                        >
                          <CosmeticItemArtwork
                            item={item}
                            username={username}
                            countryCode={countryCode}
                          />
                          <div className="dx-portrait-scrim" />
                          <div className="dx-portrait-top-badges">
                            <span
                              className="dx-rarity"
                              style={{
                                color: rarityStyle.text,
                                borderColor: rarityStyle.border,
                                background: rarityStyle.bg,
                              }}
                            >
                              {item.rarity}
                            </span>
                            <span className="dx-status-chip">
                              {isEquipped
                                ? 'Equipped'
                                : owned
                                  ? 'Owned'
                                  : item.reqRank
                                    ? `Rank ${item.reqRank}+`
                                    : 'All Ranks'}
                            </span>
                          </div>
                        </div>

                        <div className="dx-portrait-body">
                          <div className="dx-portrait-title">
                            <span aria-hidden="true">{item.icon}</span>
                            <h5>{item.name}</h5>
                          </div>
                          <small className="dx-portrait-sub">
                            {item.previewTag} · {'★'.repeat(stars)}
                          </small>
                          <p className="dx-portrait-desc">{item.desc}</p>

                          <div className="dx-portrait-price">
                            {item.isDefaultFree ? (
                              <span className="ok">Default Included</span>
                            ) : owned ? (
                              <span className="ok" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle2 size={13} />
                                <span>{isEquipped ? 'Equipped' : 'Owned'}</span>
                              </span>
                            ) : (
                              <>
                                <span className="dx-p-dia">
                                  <GemDiamondIcon size={13} />
                                  <span>{item.diamondsCost} Diamonds</span>
                                </span>
                                {item.coinsCost ? (
                                  <span className="dx-p-coin">
                                    <CashCoinIcon size={12} />
                                    <span>{formatCoinPrice(item.coinsCost)}</span>
                                  </span>
                                ) : null}
                              </>
                            )}
                          </div>

                          <div className="dx-portrait-acts">
                            <button
                              type="button"
                              className={`btn sm${isPreviewing ? ' mint' : ''}`}
                              onClick={() => onTogglePreviewItem(item)}
                            >
                              {isPreviewing ? 'Previewing' : 'Preview'}
                            </button>

                            {owned ? (
                              item.category === 'theme' && item.themeId ? (
                                <button
                                  type="button"
                                  className={`btn sm ${isEquipped ? 'no' : 'mint'}`}
                                  disabled={isEquipped}
                                  onClick={() => onSelectTheme(item.themeId!)}
                                >
                                  {isEquipped ? 'Equipped' : 'Equip'}
                                </button>
                              ) : slot ? (
                                <button
                                  type="button"
                                  className={`btn sm ${isEquipped ? '' : 'mint'}`}
                                  onClick={() => onEquipCosmetic(slot, isEquipped ? null : item.id)}
                                >
                                  {isEquipped ? 'Equipped' : 'Equip'}
                                </button>
                              ) : null
                            ) : (
                              <button
                                type="button"
                                className={`btn sm ${buyCheck.ok ? 'gold' : 'no'}`}
                                disabled={!buyCheck.ok}
                                title={buyCheck.reason}
                                onClick={() => requestBuyItem(item)}
                              >
                                {buyCheck.ok
                                  ? 'Unlock'
                                  : item.reqRank && (state.rank || 1) < item.reqRank
                                    ? `Rank ${item.reqRank}+`
                                    : 'Locked'}
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* 10. ATOMIC PURCHASE CONFIRMATION MODAL */}
      {pendingConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm Diamond Purchase"
            data-testid="dx-purchase-modal"
          >
            <div className="card dx-confirm-card">
              <h2>
                <GemDiamondIcon size={20} />
                <span>
                  Confirm {pendingConfirm.kind === 'bundle' ? 'Collection' : 'Exclusive'} Unlock
                </span>
              </h2>

              <div className="dx-confirm-preview">
                {pendingConfirm.kind === 'bundle' ? (
                  <CollectionArtwork
                    bundle={pendingConfirm.bundle}
                    username={username}
                    countryCode={countryCode}
                  />
                ) : (
                  <CosmeticItemArtwork
                    item={pendingConfirm.item}
                    username={username}
                    countryCode={countryCode}
                  />
                )}
              </div>

              <p style={{ margin: '10px 0 6px', fontWeight: 700, fontSize: 15 }}>
                {pendingConfirm.kind === 'bundle'
                  ? `${pendingConfirm.bundle.name} (${pendingConfirm.unlockCount} new items)`
                  : `${pendingConfirm.item.name} · ${pendingConfirm.item.rarity}`}
              </p>

              <div className="dx-confirm-ledger">
                <div className="dx-confirm-row">
                  <span>Diamonds Cost</span>
                  <b style={{ color: 'var(--cy)' }}>
                    <GemDiamondIcon size={14} /> {pendingConfirm.diamondsCost.toLocaleString('en-US')} Diamonds
                  </b>
                </div>
                <div className="dx-confirm-row dim">
                  <span>Diamonds Balance</span>
                  <span>
                    {safeGems.toLocaleString('en-US')} →{' '}
                    <b>{Math.max(0, safeGems - pendingConfirm.diamondsCost).toLocaleString('en-US')} Diamonds</b>
                  </span>
                </div>
                {pendingConfirm.coinsCost > 0 && (
                  <>
                    <div className="dx-confirm-row">
                      <span>Coins Cost</span>
                      <b style={{ color: 'var(--gold)' }}>
                        <CashCoinIcon size={13} /> {formatCoinPrice(pendingConfirm.coinsCost)}
                      </b>
                    </div>
                    <div className="dx-confirm-row dim">
                      <span>Coins Balance</span>
                      <span>
                        {formatCoinPrice(safeCash)} →{' '}
                        <b>{formatCoinPrice(Math.max(0, safeCash - pendingConfirm.coinsCost))}</b>
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="acts">
                <button
                  type="button"
                  className="btn gold"
                  disabled={isPurchasing}
                  data-testid="dx-confirm-buy-btn"
                  onClick={handleConfirmPurchase}
                >
                  {isPurchasing ? 'Processing...' : 'Confirm Purchase'}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={isPurchasing}
                  onClick={() => setPendingConfirm(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});
