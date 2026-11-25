import React from 'react';
import { CRATE_COST_CASH, CRATE_COST_GEMS, RARITY_META, STICKERS } from '../../game/constants';
import { formatNumber, stickerBonus, stickerUniqueCount } from '../../game/rules';
import type { GameState } from '../../game/types';
import {
  CashCoinIcon,
  GemDiamondIcon,
  Package,
  Sparkles,
  StickerArt,
} from '../GameIcons';

interface StickersTabProps {
  state: GameState;
  serverOffsetMs?: number;
  onFuseSticker: (stickerId: string) => void;
  onBuyCrate: (kind: 'cash' | 'gems', e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const StickersTab: React.FC<StickersTabProps> = ({
  state,
  serverOffsetMs = 0,
  onFuseSticker,
  onBuyCrate,
}) => {
  const unique = stickerUniqueCount(state);
  const bonusPct = (stickerBonus(state) * 100).toFixed(1);
  const fusable = STICKERS.filter((s) => (state.stk[s.id] || 0) >= 3);

  const nowSrv = Date.now() + serverOffsetMs;
  const cdLeftSec = Math.max(0, Math.ceil(((state.crateCd || 0) - nowSrv) / 1000));
  const canBuyCashCrate = cdLeftSec <= 0 && state.cash >= CRATE_COST_CASH;
  const canBuyGemCrate = state.gems >= CRATE_COST_GEMS;

  return (
    <div>
      <div className="tradelim">
        <span>
          Collected <b>{unique}/{STICKERS.length}</b> unique stickers
        </span>
        <span>
          Income bonus <b className="ok">+{bonusPct}%</b> (+0.5% each)
        </span>
      </div>

      <div className="crate-grid">
        <div className="crate-card">
          <div className="em" style={{ '--c': '#3fe0b0' } as React.CSSProperties}>
            <Package size={23} color="#3fe0b0" />
          </div>
          <div>
            <h2 style={{ fontSize: 14, margin: 0 }}>Standard Crate</h2>
            <p className="dim" style={{ fontSize: 11.5, margin: '2px 0 0' }}>
              1 random sticker · 5m cooldown
            </p>
          </div>
          <button
            type="button"
            className={`btn sm ${canBuyCashCrate ? 'mint' : 'no'}`}
            disabled={!canBuyCashCrate}
            onClick={(e) => onBuyCrate('cash', e)}
          >
            {cdLeftSec > 0 ? (
              <span>{cdLeftSec}s CD</span>
            ) : (
              <>
                <CashCoinIcon size={14} />
                <span>₨ {formatNumber(CRATE_COST_CASH)}</span>
              </>
            )}
          </button>
        </div>

        <div className="crate-card">
          <div className="em" style={{ '--c': '#ffc23d' } as React.CSSProperties}>
            <Sparkles size={23} color="#ffc23d" />
          </div>
          <div>
            <h2 style={{ fontSize: 14, margin: 0 }}>Royal Crate</h2>
            <p className="dim" style={{ fontSize: 11.5, margin: '2px 0 0' }}>
              2 stickers · 1 Rare+ guaranteed
            </p>
          </div>
          <button
            type="button"
            className={`btn sm ${canBuyGemCrate ? 'gold' : 'no'}`}
            disabled={!canBuyGemCrate}
            onClick={(e) => onBuyCrate('gems', e)}
          >
            <GemDiamondIcon size={14} />
            <span>{CRATE_COST_GEMS}</span>
          </button>
        </div>
      </div>

      {fusable.length > 0 && (
        <div className="gxc" style={{ marginBottom: 12 }}>
          <p style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Sparkles size={15} color="#a58cff" />
            <b>Fuse Duplicates</b>{' '}
            <span className="dim">· Trade 3 identical stickers for 1 higher-rarity sticker</span>
          </p>
          <div className="chiprow">
            {fusable.map((s) => (
              <button key={s.id} type="button" onClick={() => onFuseSticker(s.id)}>
                <span>{s.n} (3→1)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="stkgrid">
        {STICKERS.map((s) => {
          const count = state.stk[s.id] || 0;
          const [rarityLabel, rarityColor] = RARITY_META[s.r];
          const canFuse = count >= 3;
          return (
            <div key={s.id} className={`stkcard ${count > 0 ? '' : 'miss'}${canFuse ? ' rec-card' : ''}`}>
              <StickerArt id={s.id} size={32} />
              <span className="stk-n">{s.n}</span>
              <span className="stk-r" style={{ color: rarityColor }} title={rarityLabel}>
                {'★'.repeat(s.r)}
              </span>
              {canFuse && (
                <span className="rec-badge">
                  <Sparkles size={10} />
                  <span>Fuse Ready</span>
                </span>
              )}
              <small className="dim">{count > 0 ? `×${count}` : rarityLabel}</small>
              {canFuse && (
                <button
                  type="button"
                  className="btn sm mint"
                  style={{ minWidth: 0, padding: '5px 10px', fontSize: 11, marginTop: 2 }}
                  onClick={() => onFuseSticker(s.id)}
                >
                  Fuse 3×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
