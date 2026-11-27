import React, { memo } from 'react';
import { MAX_RANK, RANKS } from '../../game/constants';
import {
  canBuyCosmeticItem,
  getActiveThemeId,
  getCosmeticDef,
  getEquippedCosmetics,
  isCosmeticOwned,
  slotForCategory,
} from '../../game/cosmetics';
import { formatNumber } from '../../game/rules';
import type { CosmeticItemDef, EquippedCosmetics, GameState, GameThemeId } from '../../game/types';
import {
  CosmeticAvatar,
  CosmeticBadgeChip,
  CosmeticCardWrap,
  CosmeticName,
} from '../CosmeticIdentity';
import { CashCoinIcon, GemDiamondIcon, RankEmblem, Sparkles } from '../GameIcons';

interface LivePreviewStudioProps {
  state: GameState;
  username: string;
  countryCode: string;
  previewItem: CosmeticItemDef | null;
  previewThemeId: GameThemeId | null;
  onCancelPreview: () => void;
  onEquipCosmetic: (slot: keyof EquippedCosmetics, itemId: string | null) => void;
  onSelectTheme: (themeId: GameThemeId) => void;
  onRequestPurchase: (item: CosmeticItemDef) => void;
}

export const LivePreviewStudio = memo(function LivePreviewStudio({
  state,
  username,
  countryCode,
  previewItem,
  previewThemeId,
  onCancelPreview,
  onEquipCosmetic,
  onSelectTheme,
  onRequestPurchase,
}: LivePreviewStudioProps) {
  const equipped = getEquippedCosmetics(state);
  const activeThemeId = getActiveThemeId(state);

  const previewSlot = previewItem ? slotForCategory(previewItem.category) : null;
  const effectiveFrame = previewSlot === 'frame' ? previewItem?.id : equipped.frame;
  const effectiveNameFx = previewSlot === 'nameEffect' ? previewItem?.id : equipped.nameEffect;
  const effectiveBadge = previewSlot === 'badge' ? previewItem?.id : equipped.badge;
  const effectiveAnim = previewSlot === 'anim' ? previewItem?.id : equipped.anim;
  const effectiveThemeId = previewThemeId || activeThemeId;

  const effectiveThemeDef = getCosmeticDef(`theme_${effectiveThemeId}`);
  const rankNum = Math.max(1, Math.min(MAX_RANK, Math.floor(state.rank || 1)));
  const rankDef = RANKS[rankNum] || RANKS[1];

  const isPreviewing = Boolean(previewItem || previewThemeId);
  const owned = previewItem ? isCosmeticOwned(state, previewItem.id) : true;
  const buyCheck = previewItem ? canBuyCosmeticItem(state, previewItem.id) : null;
  const alreadyEquipped = previewItem
    ? previewItem.category === 'theme'
      ? activeThemeId === previewItem.themeId
      : previewSlot
        ? equipped[previewSlot] === previewItem.id
        : false
    : false;

  return (
    <section className="lps-wrap" aria-label="Live Preview Studio" data-testid="live-preview-studio">
      <div className="lps-head">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} color="#7ee8ff" />
          <span>Live Identity &amp; Theme Studio</span>
        </span>
        <span className="dim" style={{ fontSize: 11.5 }}>
          Theme: <b style={{ color: 'var(--cy)' }}>{effectiveThemeDef?.name || effectiveThemeId}</b>
          {previewThemeId && previewThemeId !== activeThemeId ? ' (Preview)' : ''}
        </span>
      </div>

      <CosmeticCardWrap
        animId={effectiveAnim}
        animationsEnabled={state.set?.anim !== 0}
        className="lps-card"
      >
        <div className="lps-profile">
          <CosmeticAvatar countryCode={countryCode} frameId={effectiveFrame} size="md" />
          <div className="lps-meta">
            <div className="lps-name-row">
              <CosmeticName name={username || 'Governor'} nameEffectId={effectiveNameFx} />
              <CosmeticBadgeChip badgeId={effectiveBadge} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', fontSize: 11.5, color: 'var(--mu)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <RankEmblem rank={rankNum} size={14} />
                <span>{rankDef.n}</span>
              </span>
              {previewItem ? (
                <span className="rec-badge" style={{ borderColor: 'rgba(126,232,255,0.55)', color: '#7ee8ff' }}>
                  Previewing: {previewItem.name}
                </span>
              ) : (
                <span>Select any item below to preview live</span>
              )}
            </div>
          </div>
        </div>

        <div className="lps-acts">
          {previewItem ? (
            <>
              {owned ? (
                previewItem.category === 'theme' && previewItem.themeId ? (
                  <button
                    type="button"
                    className={`btn sm ${alreadyEquipped ? 'no' : 'mint'}`}
                    disabled={alreadyEquipped}
                    onClick={() => onSelectTheme(previewItem.themeId!)}
                  >
                    {alreadyEquipped ? 'Active Theme' : 'Apply Theme'}
                  </button>
                ) : previewSlot ? (
                  <button
                    type="button"
                    className={`btn sm ${alreadyEquipped ? 'no' : 'mint'}`}
                    onClick={() => onEquipCosmetic(previewSlot, alreadyEquipped ? null : previewItem.id)}
                  >
                    {alreadyEquipped ? 'Unequip' : 'Equip Now'}
                  </button>
                ) : null
              ) : (
                <button
                  type="button"
                  className={`btn sm ${buyCheck?.ok ? 'gold' : 'no'}`}
                  disabled={!buyCheck?.ok}
                  title={buyCheck?.reason}
                  onClick={() => onRequestPurchase(previewItem)}
                >
                  {buyCheck?.ok ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span>Buy · {previewItem.diamondsCost}</span>
                      <GemDiamondIcon size={12} />
                      {previewItem.coinsCost ? (
                        <>
                          <span>+ ₨ {formatNumber(previewItem.coinsCost)}</span>
                          <CashCoinIcon size={11} />
                        </>
                      ) : null}
                    </span>
                  ) : (
                    buyCheck?.reason || 'Locked'
                  )}
                </button>
              )}
              {isPreviewing && (
                <button type="button" className="btn sm" onClick={onCancelPreview}>
                  Cancel Preview
                </button>
              )}
            </>
          ) : isPreviewing ? (
            <button type="button" className="btn sm" onClick={onCancelPreview}>
              Cancel Preview
            </button>
          ) : null}
        </div>
      </CosmeticCardWrap>
    </section>
  );
});
