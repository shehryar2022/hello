import React, { memo, useMemo, useState } from 'react';
import { MAX_RANK, RANKS } from '../../game/constants';
import {
  ALL_COSMETIC_ITEMS,
  RARITY_COLORS,
  THEME_ITEMS,
  canBuyCosmeticItem,
  formatCoinPrice,
  formatDiamondPrice,
  getActiveThemeId,
  getCosmeticDef,
  getEquippedCosmetics,
  getRarityStars,
  hasActivePreview,
  isCosmeticOwned,
  isItemActiveInPreviewLoadout,
  resolveEffectiveCosmeticPreview,
  slotForCategory,
  type CosmeticPreviewLoadout,
} from '../../game/cosmetics';
import type { CosmeticItemDef, EquippedCosmetics, GameState, GameThemeId } from '../../game/types';
import {
  CosmeticAvatar,
  CosmeticBadgeChip,
  CosmeticCardWrap,
  CosmeticName,
} from '../CosmeticIdentity';
import {
  CashCoinIcon,
  CheckCircle2,
  Eye,
  GemDiamondIcon,
  Layers,
  Palette,
  RankEmblem,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from '../GameIcons';
import { CosmeticItemArtwork } from './CosmeticArtwork';

interface LivePreviewStudioProps {
  state: GameState;
  username: string;
  countryCode: string;
  previewLoadout: CosmeticPreviewLoadout;
  onTogglePreviewItem: (item: CosmeticItemDef) => void;
  onCancelPreview: () => void;
  onResetToDefault: () => void;
  onEquipCosmetic: (slot: keyof EquippedCosmetics, itemId: string | null) => void;
  onSelectTheme: (themeId: GameThemeId) => void;
  onRequestPurchase: (item: CosmeticItemDef) => void;
}

const CATEGORY_DISPLAY: Record<string, string> = {
  profile_effect: 'Profile Border',
  name_effect: 'Typography FX',
  leaderboard_anim: 'Leaderboard FX',
  theme: 'UI Theme',
  animation: 'UI Card FX',
  badge: 'Badge',
  achievement_fx: 'Achievement FX',
  premium_vfx: 'Premium VFX',
  diamond_asset: '3D Landmark',
};

export const LivePreviewStudio = memo(function LivePreviewStudio({
  state,
  username,
  countryCode,
  previewLoadout,
  onTogglePreviewItem,
  onCancelPreview,
  onResetToDefault,
  onEquipCosmetic,
  onSelectTheme,
  onRequestPurchase,
}: LivePreviewStudioProps) {
  const [studioMode, setStudioMode] = useState<'identity' | 'theme'>('identity');
  const [quickQuery, setQuickQuery] = useState('');

  const equipped = useMemo(() => getEquippedCosmetics(state), [state.cos, state.cosEq]);
  const activeThemeId = useMemo(() => getActiveThemeId(state), [state.cos, state.theme]);
  const resolved = useMemo(
    () => resolveEffectiveCosmeticPreview(state, previewLoadout),
    [state, previewLoadout],
  );

  const effectiveMode: 'identity' | 'theme' =
    resolved.focusItem?.category === 'theme' && studioMode === 'identity'
      ? 'theme'
      : studioMode;

  const isPreviewing = hasActivePreview(previewLoadout);
  const rankNum = Math.max(1, Math.min(MAX_RANK, Math.floor(state.rank || 1)));
  const rankDef = RANKS[rankNum] || RANKS[1];
  const effectiveThemeDef = getCosmeticDef(`theme_${resolved.themeId}`);
  const activeFocusItem = resolved.focusItem || effectiveThemeDef || ALL_COSMETIC_ITEMS[0];
  const focusSlot = activeFocusItem ? slotForCategory(activeFocusItem.category) : null;
  const focusOwned = activeFocusItem ? isCosmeticOwned(state, activeFocusItem.id) : true;
  const focusBuyCheck = activeFocusItem ? canBuyCosmeticItem(state, activeFocusItem.id) : null;
  const focusEquipped = activeFocusItem
    ? activeFocusItem.category === 'theme'
      ? activeThemeId === activeFocusItem.themeId
      : focusSlot
        ? equipped[focusSlot] === activeFocusItem.id
        : activeFocusItem.category === 'diamond_asset' && focusOwned
    : false;
  const focusStars = activeFocusItem ? getRarityStars(activeFocusItem.rarity) : 5;
  const focusRarityStyle = activeFocusItem ? RARITY_COLORS[activeFocusItem.rarity] : RARITY_COLORS.Rare;

  const activeFxCount = [
    resolved.frame,
    resolved.nameEffect,
    resolved.lbAnim,
    resolved.badge,
    resolved.anim,
    resolved.achFx,
    resolved.premiumVfx,
    resolved.landmarkId,
  ].filter(Boolean).length;

  const slotRows = [
    {
      label: 'Profile Border',
      slot: 'frame' as const,
      id: resolved.frame,
      previewing: Boolean(previewLoadout.frame),
    },
    {
      label: 'Typography FX',
      slot: 'nameEffect' as const,
      id: resolved.nameEffect,
      previewing: Boolean(previewLoadout.nameEffect),
    },
    {
      label: 'Leaderboard FX',
      slot: 'lbAnim' as const,
      id: resolved.lbAnim,
      previewing: Boolean(previewLoadout.lbAnim),
    },
    {
      label: 'Prestige Badge',
      slot: 'badge' as const,
      id: resolved.badge,
      previewing: Boolean(previewLoadout.badge),
    },
    {
      label: 'UI Card FX',
      slot: 'anim' as const,
      id: resolved.anim,
      previewing: Boolean(previewLoadout.anim),
    },
    {
      label: 'Achievement FX',
      slot: 'achFx' as const,
      id: resolved.achFx,
      previewing: Boolean(previewLoadout.achFx),
    },
    {
      label: 'Premium VFX',
      slot: 'premiumVfx' as const,
      id: resolved.premiumVfx,
      previewing: Boolean(previewLoadout.premiumVfx),
    },
    {
      label: 'UI Theme',
      slot: null,
      id: `theme_${resolved.themeId}`,
      previewing: Boolean(previewLoadout.themeId && previewLoadout.themeId !== activeThemeId),
    },
  ];

  const quickPickItems = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    const pool =
      effectiveMode === 'theme'
        ? THEME_ITEMS
        : ALL_COSMETIC_ITEMS.filter((it) => it.category !== 'diamond_asset');
    if (!q) return pool.slice(0, 6);
    return pool
      .filter((it) => `${it.name} ${it.previewTag} ${it.rarity}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [effectiveMode, quickQuery]);

  const handleResetToDefault = () => {
    onResetToDefault();
    setStudioMode('identity');
  };

  return (
    <section className="lps-studio" aria-label="Live Identity & Theme Studio" data-testid="live-preview-studio">
      <div className="lps-topbar">
        <div className="lps-title-grp">
          <span className="lps-title-badge">
            <Sparkles size={14} color="#7ee8ff" />
            <span>LIVE IDENTITY &amp; THEME STUDIO</span>
          </span>
          <small className="lps-subnote">
            {isPreviewing
              ? `Previewing ${resolved.previewCount} compatible ${resolved.previewCount === 1 ? 'item' : 'items'} — inventory unchanged`
              : 'Stack multiple frames, name FX, badges, animations & themes live'}
          </small>
        </div>

        <div className="lps-mode-tabs" role="tablist" aria-label="Studio Mode">
          <button
            type="button"
            role="tab"
            aria-selected={effectiveMode === 'identity'}
            className={`lps-mode-btn${effectiveMode === 'identity' ? ' on' : ''}`}
            onClick={() => setStudioMode('identity')}
          >
            <Layers size={13} />
            <span>Identity Preview</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={effectiveMode === 'theme'}
            className={`lps-mode-btn${effectiveMode === 'theme' ? ' on' : ''}`}
            data-testid="studio-theme-preview-tab"
            onClick={() => setStudioMode('theme')}
          >
            <Palette size={13} />
            <span>Theme Surfaces</span>
          </button>
          {isPreviewing && (
            <button
              type="button"
              className="lps-mode-btn"
              onClick={onCancelPreview}
              data-testid="studio-cancel-preview"
            >
              <X size={13} />
              <span>Cancel Preview</span>
            </button>
          )}
          <button
            type="button"
            className="lps-mode-btn"
            onClick={handleResetToDefault}
            data-testid="studio-reset-default"
            title="Reset preview and restore default equipped look"
          >
            <RefreshCw size={12} />
            <span>Reset to Default</span>
          </button>
        </div>
      </div>

      <div className="lps-shell">
        {/* LEFT COLUMN: Ref 2 "My Profile" Frosted Slate Panel */}
        <div className="lps-col-profile">
          <div className="lps-col-head">
            <span>My Profile</span>
            {isPreviewing && <span className="lps-live-dot">PREVIEW</span>}
          </div>

          <div className="lps-avatar-ring">
            <CosmeticAvatar countryCode={countryCode} frameId={resolved.frame} size="lg" />
          </div>

          <div className="lps-profile-name">
            <CosmeticName name={username || 'Governor'} nameEffectId={resolved.nameEffect} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              <CosmeticBadgeChip badgeId={resolved.badge} />
              <span className="lps-rank-sub">
                <RankEmblem rank={rankNum} size={13} />
                <span>{rankDef.n}</span>
              </span>
            </div>
          </div>

          <div className="lps-stat-trio">
            <div>
              <small>Rank</small>
              <b>#{rankNum}</b>
            </div>
            <div>
              <small>Theme</small>
              <b>{effectiveThemeDef?.name?.split(' ')[0] || 'Galaxy'}</b>
            </div>
            <div>
              <small>Active FX</small>
              <b>{activeFxCount}/8</b>
            </div>
          </div>

          <div className="lps-slot-list">
            {slotRows.map((row) => {
              const def = row.id ? getCosmeticDef(row.id) : undefined;
              return (
                <div key={row.label} className={`lps-slot-row${row.previewing ? ' is-preview' : ''}`}>
                  <span className="lps-slot-k">{row.label}</span>
                  <span className="lps-slot-v">
                    {def ? (
                      <>
                        <span aria-hidden="true">{def.icon}</span>
                        <span>{def.name}</span>
                      </>
                    ) : (
                      <span className="dim">Default</span>
                    )}
                  </span>
                  {row.previewing && def ? (
                    <button
                      type="button"
                      className="lps-slot-clear"
                      title={`Remove ${def.name} from preview`}
                      onClick={() => onTogglePreviewItem(def)}
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Ref 2 Elevated Centerpiece + Overlapping Frosted Info Plate */}
        <div className="lps-col-center">
          {effectiveMode === 'identity' ? (
            <CosmeticCardWrap
              animId={resolved.anim}
              premiumVfxId={resolved.premiumVfx}
              animationsEnabled={state.set?.anim !== 0}
              className="lps-stage-hero"
              data-theme={resolved.themeId}
            >
              <div className="lps-stage-ambient" />
              <div className="lps-stage-identity">
                <CosmeticAvatar countryCode={countryCode} frameId={resolved.frame} size="lg" />
                <div className="lps-stage-id-copy">
                  <div className="lps-stage-name">
                    <CosmeticName name={username || 'Governor'} nameEffectId={resolved.nameEffect} />
                    <CosmeticBadgeChip badgeId={resolved.badge} />
                  </div>
                  <div className="lps-stage-sub">
                    <RankEmblem rank={rankNum} size={15} />
                    <span>{rankDef.n} · Sovereign Capital</span>
                  </div>
                </div>
              </div>
              {resolved.lbAnim && (
                <div
                  className={`row pcard lb-fx lb-fx--${resolved.lbAnim}`}
                  style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'rgba(12, 16, 38, 0.85)',
                  }}
                >
                  <span style={{ fontWeight: 800, color: 'var(--gold)', fontSize: 12 }}>#1</span>
                  <CosmeticName name={username || 'Governor'} nameEffectId={resolved.nameEffect} />
                  <small className="dim" style={{ marginLeft: 'auto' }}>Leaderboard Preview</small>
                </div>
              )}
              {resolved.landmarkId && (
                <div className="lps-stage-landmark-pill">
                  <span>🏙️ 3D Landmark Preview:</span>
                  <b>{getCosmeticDef(resolved.landmarkId)?.name}</b>
                </div>
              )}
            </CosmeticCardWrap>
          ) : (
            /* REQUIREMENT 7: Full Multi-Surface Theme Preview using real [data-theme] tokens */
            <div
              className="lps-theme-canvas"
              data-theme={resolved.themeId}
              data-testid="theme-surface-preview"
            >
              <div className="lps-tm-top">
                <span className="lps-tm-brand">
                  <span className="lps-tm-dot" />
                  <span>Top Navigation · {effectiveThemeDef?.name}</span>
                </span>
                <span className="lps-tm-pills">
                  <span>🪙 {formatCoinPrice(state.cash)}</span>
                  <span>💎 {Math.floor(state.gems)}</span>
                </span>
              </div>
              <div className="lps-tm-grid">
                <aside className="lps-tm-side">
                  <div className="lps-tm-side-lbl">Sidebar</div>
                  <span className="on">Dashboard</span>
                  <span>Economy</span>
                  <span>Profile</span>
                  <span>Modals</span>
                </aside>
                <div className="lps-tm-main">
                  <div className="lps-tm-card-row">
                    <div className="lps-tm-panel">
                      <small>Dashboard Card</small>
                      <b>+124K/min</b>
                      <button type="button" className="lps-tm-btn">Action Button</button>
                    </div>
                    <div className="lps-tm-panel">
                      <small>Economy Panel</small>
                      <b>84% Approval</b>
                      <div className="lps-tm-bar"><i style={{ width: '78%' }} /></div>
                    </div>
                  </div>
                  <div className="lps-tm-bottom-row">
                    <div className="lps-tm-mini-prof">
                      <CosmeticAvatar countryCode={countryCode} frameId={resolved.frame} size="xs" />
                      <CosmeticName name={username || 'Governor'} nameEffectId={resolved.nameEffect} />
                    </div>
                    <div className="lps-tm-mini-modal">
                      <small>Modal Surface</small>
                      <span>Crisp legible contrast</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Frosted Dark Bottom Info Plate (Ref 2 Center Screen) */}
          {activeFocusItem && (
            <div className="lps-info-plate" data-testid="studio-info-plate">
              <div className="lps-plate-head">
                <div>
                  <h4>{activeFocusItem.name}</h4>
                  <div className="lps-stars" aria-label={`${focusStars} of 7 rarity stars`}>
                    {'★'.repeat(Math.max(1, focusStars))}
                    {'☆'.repeat(Math.max(0, 7 - focusStars))}
                  </div>
                </div>
                <span
                  className="dx-rarity"
                  style={{
                    color: focusRarityStyle.text,
                    borderColor: focusRarityStyle.border,
                    background: focusRarityStyle.bg,
                  }}
                >
                  {activeFocusItem.rarity}
                </span>
              </div>

              <div className="lps-specs-2x2">
                <div>
                  <small>Type</small>
                  <b>{CATEGORY_DISPLAY[activeFocusItem.category] || activeFocusItem.category}</b>
                </div>
                <div>
                  <small>Requirement</small>
                  <b>{activeFocusItem.reqRank ? `Rank ${activeFocusItem.reqRank}+` : 'All Ranks'}</b>
                </div>
                <div>
                  <small>Availability</small>
                  <b style={{ color: focusOwned ? 'var(--mint)' : '#7ee8ff' }}>
                    {focusEquipped ? 'Equipped' : focusOwned ? 'Owned' : 'Shop Exclusive'}
                  </b>
                </div>
                <div>
                  <small>Price</small>
                  <b>
                    {activeFocusItem.isDefaultFree
                      ? 'Default Free'
                      : activeFocusItem.coinsCost
                        ? `${formatDiamondPrice(activeFocusItem.diamondsCost)} + ${formatCoinPrice(activeFocusItem.coinsCost)}`
                        : formatDiamondPrice(activeFocusItem.diamondsCost)}
                  </b>
                </div>
              </div>

              <div className="lps-plate-ctas">
                {focusOwned ? (
                  activeFocusItem.category === 'theme' && activeFocusItem.themeId ? (
                    <button
                      type="button"
                      className={`lps-cyan-cta${focusEquipped ? ' is-muted' : ''}`}
                      disabled={focusEquipped}
                      data-testid="studio-apply-theme"
                      onClick={() => onSelectTheme(activeFocusItem.themeId!)}
                    >
                      {focusEquipped ? 'Active Theme' : 'Apply Theme'}
                    </button>
                  ) : focusSlot ? (
                    <button
                      type="button"
                      className="lps-cyan-cta"
                      data-testid="studio-equip-btn"
                      onClick={() => onEquipCosmetic(focusSlot, focusEquipped ? null : activeFocusItem.id)}
                    >
                      {focusEquipped ? 'Unequip Item' : 'Apply / Equip'}
                    </button>
                  ) : (
                    <span className="lps-owned-pill">
                      <CheckCircle2 size={14} color="#3fe0b0" />
                      <span>Active in 3D Capital</span>
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    className={`lps-cyan-cta${focusBuyCheck?.ok ? '' : ' is-muted'}`}
                    disabled={!focusBuyCheck?.ok}
                    title={focusBuyCheck?.reason}
                    onClick={() => onRequestPurchase(activeFocusItem)}
                  >
                    {focusBuyCheck?.ok ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span>Unlock · {activeFocusItem.diamondsCost}</span>
                        <GemDiamondIcon size={13} />
                        {activeFocusItem.coinsCost ? (
                          <>
                            <span>+ {formatCoinPrice(activeFocusItem.coinsCost)}</span>
                            <CashCoinIcon size={12} />
                          </>
                        ) : null}
                      </span>
                    ) : (
                      focusBuyCheck?.reason || 'Locked'
                    )}
                  </button>
                )}

                <button
                  type="button"
                  className="btn sm"
                  onClick={() => onTogglePreviewItem(activeFocusItem)}
                >
                  <Eye size={13} />
                  <span>
                    {isItemActiveInPreviewLoadout(previewLoadout, activeFocusItem)
                      ? 'Unstage'
                      : 'Preview'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Ref 2 Quick Selector & Search Grid */}
        <div className="lps-col-picker">
          <div className="lps-col-head">
            <span>{effectiveMode === 'theme' ? 'Themes List' : 'Quick Mix'}</span>
            <small className="dim">{quickPickItems.length} shown</small>
          </div>
          <label className="lps-search">
            <Search size={13} />
            <input
              type="search"
              value={quickQuery}
              onChange={(e) => setQuickQuery(e.target.value)}
              placeholder={effectiveMode === 'theme' ? 'Search themes...' : 'Search styles...'}
              aria-label="Search studio items"
            />
          </label>
          <div className="lps-quick-grid">
            {quickPickItems.map((item) => {
              const selected = isItemActiveInPreviewLoadout(previewLoadout, item);
              const stars = getRarityStars(item.rarity);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`lps-quick-tile${selected ? ' on' : ''}`}
                  onClick={() => onTogglePreviewItem(item)}
                  title={`Preview ${item.name}`}
                >
                  <div className="lps-quick-art">
                    <CosmeticItemArtwork
                      item={item}
                      username={username}
                      countryCode={countryCode}
                      compact
                    />
                  </div>
                  <div className="lps-quick-meta">
                    <b>{item.name}</b>
                    <span className="lps-stars">{'★'.repeat(stars)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
});
