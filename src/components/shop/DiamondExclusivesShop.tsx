import React, { memo, useMemo, useState } from 'react';
import {
  ALL_COSMETIC_ITEMS,
  COSMETIC_BUNDLES,
  DIAMOND_ASSETS,
  EXCLUSIVE_BADGES,
  NAME_EFFECTS,
  PREMIUM_ANIMATIONS,
  PROFILE_FRAMES,
  RARITY_COLORS,
  THEME_ITEMS,
  canBuyCosmeticBundle,
  canBuyCosmeticItem,
  getActiveThemeId,
  getBundlePurchaseQuote,
  getCosmeticDef,
  getEquippedCosmetics,
  getOwnedCosmeticsSet,
  isCosmeticOwned,
  slotForCategory,
} from '../../game/cosmetics';
import { formatNumber } from '../../game/rules';
import type {
  CosmeticBundleDef,
  CosmeticCategory,
  CosmeticItemDef,
  EquippedCosmetics,
  GameState,
  GameThemeId,
} from '../../game/types';
import { CashCoinIcon, CheckCircle2, GemDiamondIcon, Sparkles } from '../GameIcons';
import { LivePreviewStudio } from './LivePreviewStudio';

type DxCategoryFilter = 'all' | 'bundle' | CosmeticCategory;

const DX_CATEGORY_TABS: Array<{ id: DxCategoryFilter; label: string; icon: string }> = [
  { id: 'all', label: 'All Exclusives', icon: '✨' },
  { id: 'bundle', label: 'Collections', icon: '🎁' },
  { id: 'profile_effect', label: 'Profile FX', icon: '🖼️' },
  { id: 'name_effect', label: 'Name FX', icon: '🖋️' },
  { id: 'theme', label: 'Themes', icon: '🎨' },
  { id: 'animation', label: 'Animations', icon: '⚡' },
  { id: 'badge', label: 'Badges', icon: '🏅' },
  { id: 'diamond_asset', label: '3D Landmarks', icon: '🏙️' },
];

type PendingConfirm =
  | { kind: 'item'; item: CosmeticItemDef; diamondsCost: number; coinsCost: number }
  | { kind: 'bundle'; bundle: CosmeticBundleDef; diamondsCost: number; coinsCost: number; unlockCount: number };

interface DiamondExclusivesShopProps {
  state: GameState;
  username: string;
  countryCode: string;
  previewItemId: string | null;
  previewThemeId: GameThemeId | null;
  onPreviewItem: (item: CosmeticItemDef | null) => void;
  onCancelPreview: () => void;
  onBuyItem: (itemId: string) => void;
  onBuyBundle: (bundleId: string) => void;
  onEquipCosmetic: (slot: keyof EquippedCosmetics, itemId: string | null) => void;
  onSelectTheme: (themeId: GameThemeId) => void;
}

export const DiamondExclusivesShop = memo(function DiamondExclusivesShop({
  state,
  username,
  countryCode,
  previewItemId,
  previewThemeId,
  onPreviewItem,
  onCancelPreview,
  onBuyItem,
  onBuyBundle,
  onEquipCosmetic,
  onSelectTheme,
}: DiamondExclusivesShopProps) {
  const [catFilter, setCatFilter] = useState<DxCategoryFilter>('all');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const ownedSet = useMemo(() => getOwnedCosmeticsSet(state), [state.cos]);
  const equipped = useMemo(() => getEquippedCosmetics(state), [state.cos, state.cosEq]);
  const activeThemeId = useMemo(() => getActiveThemeId(state), [state.cos, state.theme]);
  const previewItem = useMemo(
    () => (previewItemId ? getCosmeticDef(previewItemId) || null : null),
    [previewItemId],
  );

  const visibleItems = useMemo(() => {
    switch (catFilter) {
      case 'profile_effect':
        return PROFILE_FRAMES;
      case 'name_effect':
        return NAME_EFFECTS;
      case 'theme':
        return THEME_ITEMS;
      case 'animation':
        return PREMIUM_ANIMATIONS;
      case 'badge':
        return EXCLUSIVE_BADGES;
      case 'diamond_asset':
        return DIAMOND_ASSETS;
      case 'bundle':
        return [];
      default:
        return ALL_COSMETIC_ITEMS;
    }
  }, [catFilter]);

  const showBundles = catFilter === 'all' || catFilter === 'bundle';
  const safeGems = Math.max(0, Math.floor(Number.isFinite(state.gems) ? state.gems : 0));
  const safeCash = Math.max(0, Math.floor(Number.isFinite(state.cash) ? state.cash : 0));

  const requestBuyItem = (item: CosmeticItemDef) => {
    const check = canBuyCosmeticItem(state, item.id);
    if (!check.ok) return;
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
    if (!check.ok) return;
    setPendingConfirm({
      kind: 'bundle',
      bundle,
      diamondsCost: check.diamondsCost,
      coinsCost: check.coinsCost,
      unlockCount: quote.unownedItemIds.length,
    });
  };

  const handleConfirmPurchase = () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.kind === 'item') {
      onBuyItem(pendingConfirm.item.id);
    } else {
      onBuyBundle(pendingConfirm.bundle.id);
    }
    setPendingConfirm(null);
  };

  const equippedFrameDef = equipped.frame ? getCosmeticDef(equipped.frame) : undefined;
  const equippedNameDef = equipped.nameEffect ? getCosmeticDef(equipped.nameEffect) : undefined;
  const equippedBadgeDef = equipped.badge ? getCosmeticDef(equipped.badge) : undefined;
  const equippedAnimDef = equipped.anim ? getCosmeticDef(equipped.anim) : undefined;

  return (
    <div className="dx-wrap" data-testid="diamond-exclusives-shop">
      <div className="dx-hero">
        <div className="dx-hero-top">
          <div>
            <h3>💎 DIAMOND EXCLUSIVES</h3>
            <p>
              Curated animated frames, custom themes, prestige name effects &amp; 3D capital landmarks.
            </p>
          </div>
          <div className="dx-bal-pill">
            <span style={{ color: 'var(--cy)' }}>
              <GemDiamondIcon size={15} />
              <span>{safeGems.toLocaleString('en-US')} Diamonds</span>
            </span>
            <span className="dim">·</span>
            <span style={{ color: 'var(--gold)' }}>
              <CashCoinIcon size={14} />
              <span>₨ {formatNumber(safeCash)}</span>
            </span>
          </div>
        </div>

        <div className="dx-inv-bar">
          <span className="dim" style={{ fontSize: 11.5, fontWeight: 700 }}>
            Owned: {ownedSet.size}/{ALL_COSMETIC_ITEMS.length}
          </span>
          {equippedFrameDef && (
            <button
              type="button"
              className="dx-eq-pill"
              title="Click to unequip frame"
              onClick={() => onEquipCosmetic('frame', null)}
            >
              <span>{equippedFrameDef.icon}</span>
              <span>{equippedFrameDef.name}</span>
              <span className="dim">✕</span>
            </button>
          )}
          {equippedNameDef && (
            <button
              type="button"
              className="dx-eq-pill"
              title="Click to unequip name effect"
              onClick={() => onEquipCosmetic('nameEffect', null)}
            >
              <span>{equippedNameDef.icon}</span>
              <span>{equippedNameDef.name}</span>
              <span className="dim">✕</span>
            </button>
          )}
          {equippedBadgeDef && (
            <button
              type="button"
              className="dx-eq-pill"
              title="Click to unequip badge"
              onClick={() => onEquipCosmetic('badge', null)}
            >
              <span>{equippedBadgeDef.icon}</span>
              <span>{equippedBadgeDef.name}</span>
              <span className="dim">✕</span>
            </button>
          )}
          {equippedAnimDef && (
            <button
              type="button"
              className="dx-eq-pill"
              title="Click to unequip card animation"
              onClick={() => onEquipCosmetic('anim', null)}
            >
              <span>{equippedAnimDef.icon}</span>
              <span>{equippedAnimDef.name}</span>
              <span className="dim">✕</span>
            </button>
          )}
          {activeThemeId !== 'midnight_galaxy' && (
            <button
              type="button"
              className="dx-eq-pill"
              title="Reset to default Midnight Galaxy theme"
              onClick={() => onSelectTheme('midnight_galaxy')}
            >
              <span>🌌</span>
              <span>Theme: {getCosmeticDef(`theme_${activeThemeId}`)?.name || activeThemeId}</span>
              <span className="dim">↺</span>
            </button>
          )}
        </div>
      </div>

      <LivePreviewStudio
        state={state}
        username={username}
        countryCode={countryCode}
        previewItem={previewItem}
        previewThemeId={previewThemeId}
        onCancelPreview={onCancelPreview}
        onEquipCosmetic={onEquipCosmetic}
        onSelectTheme={onSelectTheme}
        onRequestPurchase={requestBuyItem}
      />

      <div className="dx-cat-pills" role="tablist" aria-label="Diamond Exclusives Categories">
        {DX_CATEGORY_TABS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={catFilter === cat.id}
            className={`dx-cat-btn ${catFilter === cat.id ? 'on' : ''}`}
            onClick={() => setCatFilter(cat.id)}
          >
            <span aria-hidden="true">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {showBundles && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="gxh" style={{ margin: '2px 0 0' }}>
            <Sparkles size={15} color="#c084fc" />
            <span>Curated Signature Collections</span>
          </div>
          <div className="dx-grid">
            {COSMETIC_BUNDLES.map((bundle) => {
              const quote = getBundlePurchaseQuote(state, bundle.id);
              const check = canBuyCosmeticBundle(state, bundle.id);
              const rarityStyle = RARITY_COLORS[bundle.rarity];
              return (
                <div key={bundle.id} className="dx-bundle-card">
                  <div className="dx-card-head">
                    <div>
                      <h4 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--d)' }}>{bundle.name}</h4>
                      <small className="dim">{bundle.badgeText}</small>
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
                      const isOwned = ownedSet.has(id);
                      if (!item) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`dx-bundle-chip ${isOwned ? 'owned' : ''}`}
                          style={{ border: 0, cursor: 'pointer' }}
                          title={`Preview ${item.name}`}
                          onClick={() => onPreviewItem(item)}
                        >
                          <span>{item.icon}</span>
                          <span>{item.name}</span>
                          {isOwned && <CheckCircle2 size={11} color="#3fe0b0" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="dx-card-foot">
                    {quote.allOwned ? (
                      <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)' }}>
                        Collection Complete
                      </span>
                    ) : (
                      <>
                        <div className="dx-price">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <GemDiamondIcon size={13} />
                            <span>{quote.diamondsCost}</span>
                          </span>
                          {quote.coinsCost > 0 && (
                            <span className="dx-price-coins">
                              <CashCoinIcon size={12} />
                              <span>₨ {formatNumber(quote.coinsCost)}</span>
                            </span>
                          )}
                          {quote.alreadyOwnedCount > 0 && (
                            <small className="dim">({quote.alreadyOwnedCount} owned)</small>
                          )}
                        </div>
                        <div className="dx-actions">
                          <button
                            type="button"
                            className={`btn sm ${check.ok ? 'gold' : 'no'}`}
                            disabled={!check.ok}
                            title={check.reason}
                            onClick={() => requestBuyBundle(bundle)}
                          >
                            {check.ok ? 'Unlock Set' : check.reason || 'Locked'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {visibleItems.length > 0 && (
        <div className="dx-grid">
          {visibleItems.map((item) => {
            const owned = isCosmeticOwned(state, item.id);
            const slot = slotForCategory(item.category);
            const isEquipped =
              item.category === 'theme'
                ? activeThemeId === item.themeId
                : slot
                  ? equipped[slot] === item.id
                  : item.category === 'diamond_asset' && owned;
            const buyCheck = canBuyCosmeticItem(state, item.id);
            const rarityStyle = RARITY_COLORS[item.rarity];
            const isPreviewing = previewItemId === item.id;

            return (
              <div
                key={item.id}
                className={`dx-card ${isEquipped ? 'equipped' : ''}`}
                style={isPreviewing ? { boxShadow: '0 0 0 2px var(--cy), var(--sm), var(--in)' } : undefined}
              >
                <div className="dx-card-head">
                  <div className="dx-card-id">
                    <div
                      className="dx-icon-box"
                      style={{ boxShadow: `inset 0 0 12px ${item.accentColor}33, var(--dent)` }}
                    >
                      <span aria-hidden="true">{item.icon}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4>{item.name}</h4>
                      <small>
                        {item.previewTag}
                        {item.reqRank ? ` · Rank ${item.reqRank}+` : ''}
                      </small>
                    </div>
                  </div>
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
                </div>

                <p className="dx-desc">{item.desc}</p>

                <div className="dx-card-foot">
                  <div className="dx-price">
                    {item.isDefaultFree ? (
                      <span className="ok">Default Included</span>
                    ) : owned ? (
                      <span className="ok" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} />
                        <span>{isEquipped ? (item.category === 'diamond_asset' ? 'Active in 3D City' : 'Equipped') : 'Owned'}</span>
                      </span>
                    ) : (
                      <>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <GemDiamondIcon size={13} />
                          <span>{item.diamondsCost}</span>
                        </span>
                        {item.coinsCost ? (
                          <span className="dx-price-coins">
                            <CashCoinIcon size={12} />
                            <span>₨ {formatNumber(item.coinsCost)}</span>
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className="dx-actions">
                    {item.category !== 'diamond_asset' && (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => onPreviewItem(isPreviewing ? null : item)}
                      >
                        {isPreviewing ? 'Stop Preview' : 'Preview'}
                      </button>
                    )}

                    {owned ? (
                      item.category === 'theme' && item.themeId ? (
                        <button
                          type="button"
                          className={`btn sm ${isEquipped ? 'no' : 'mint'}`}
                          disabled={isEquipped}
                          onClick={() => onSelectTheme(item.themeId!)}
                        >
                          {isEquipped ? 'Active' : 'Apply'}
                        </button>
                      ) : slot ? (
                        <button
                          type="button"
                          className={`btn sm ${isEquipped ? '' : 'mint'}`}
                          onClick={() => onEquipCosmetic(slot, isEquipped ? null : item.id)}
                        >
                          {isEquipped ? 'Unequip' : 'Equip'}
                        </button>
                      ) : (
                        <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)' }}>
                          Built
                        </span>
                      )
                    ) : (
                      <button
                        type="button"
                        className={`btn sm ${buyCheck.ok ? 'gold' : 'no'}`}
                        disabled={!buyCheck.ok}
                        title={buyCheck.reason}
                        onClick={() => requestBuyItem(item)}
                      >
                        {buyCheck.ok ? 'Unlock' : buyCheck.reason || 'Locked'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingConfirm && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Confirm Diamond Purchase">
          <div className="card">
            <h2>
              <GemDiamondIcon size={20} />
              <span>
                Confirm {pendingConfirm.kind === 'bundle' ? 'Collection' : 'Exclusive'} Unlock
              </span>
            </h2>
            <p style={{ marginTop: 10 }}>
              {pendingConfirm.kind === 'bundle'
                ? `Unlock ${pendingConfirm.bundle.name} (${pendingConfirm.unlockCount} new exclusives)?`
                : `Unlock ${pendingConfirm.item.name} (${pendingConfirm.item.rarity})?`}
            </p>
            <div
              style={{
                display: 'inline-flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 12,
                padding: '9px 14px',
                borderRadius: 14,
                background: 'var(--well)',
                marginBottom: 14,
                fontWeight: 700,
              }}
            >
              <span style={{ color: 'var(--cy)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <GemDiamondIcon size={15} />
                <span>{pendingConfirm.diamondsCost} Diamonds</span>
              </span>
              {pendingConfirm.coinsCost > 0 && (
                <span style={{ color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <CashCoinIcon size={14} />
                  <span>₨ {formatNumber(pendingConfirm.coinsCost)} Coins</span>
                </span>
              )}
            </div>
            <div className="acts">
              <button type="button" className="btn gold" onClick={handleConfirmPurchase}>
                Confirm Purchase
              </button>
              <button type="button" className="btn" onClick={() => setPendingConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
