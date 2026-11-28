import React, { memo, useMemo, useState } from 'react';
import {
  CRATE_COST_CASH,
  CRATE_COST_GEMS,
  RARITY_META,
  STICKER_COLLECTIONS,
  STICKERS,
} from '../../game/constants';
import { formatNumber, stickerBonus, stickerUniqueCount } from '../../game/rules';
import type { GameState, StickerCollectionId } from '../../game/types';
import {
  CashCoinIcon,
  GemDiamondIcon,
  Package,
  Search,
  Sparkles,
  StickerArt,
} from '../GameIcons';

interface StickersTabProps {
  state: GameState;
  serverOffsetMs?: number;
  onFuseSticker: (stickerId: string) => void;
  onBuyCrate: (kind: 'cash' | 'gems', e: React.MouseEvent<HTMLButtonElement>) => void;
  onBuyStickerWithDiamonds?: (stickerId: string) => void;
}

export const StickersTab: React.FC<StickersTabProps> = memo(({
  state,
  serverOffsetMs = 0,
  onFuseSticker,
  onBuyCrate,
  onBuyStickerWithDiamonds,
}) => {
  const [collectionFilter, setCollectionFilter] = useState<'all' | StickerCollectionId>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unique = useMemo(() => stickerUniqueCount(state), [state]);
  const bonusPct = useMemo(() => (stickerBonus(state) * 100).toFixed(1), [state]);
  const fusable = useMemo(() => STICKERS.filter((s) => (state.stk[s.id] || 0) >= 3), [state.stk]);

  const collectionStats = useMemo(() => {
    return STICKER_COLLECTIONS.map((col) => {
      const members = STICKERS.filter((s) => s.collection === col.id);
      const owned = members.filter((s) => (state.stk[s.id] || 0) > 0).length;
      return {
        ...col,
        total: members.length,
        owned,
        pct: members.length > 0 ? Math.round((owned / members.length) * 100) : 0,
      };
    });
  }, [state.stk]);

  const filteredStickers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return STICKERS.filter((s) => {
      if (collectionFilter !== 'all' && s.collection !== collectionFilter) return false;
      if (rarityFilter !== 'all' && s.r !== rarityFilter) return false;
      if (q && !`${s.n} ${s.collection || ''} ${s.desc || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [collectionFilter, rarityFilter, searchQuery]);

  const nowSrv = (state.t || Date.now()) + serverOffsetMs;
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
          Income bonus <b className="ok">+{bonusPct}%</b> (capped +25% · 10 Collections)
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

      {/* 10 Sticker Collections Progress Overview */}
      <div className="stk-collections" data-testid="sticker-collections-grid">
        <button
          type="button"
          className={`stk-col-card${collectionFilter === 'all' ? ' on' : ''}`}
          onClick={() => setCollectionFilter('all')}
        >
          <div className="stk-col-top">
            <span>🌟 All Collections</span>
            <b>{unique}/{STICKERS.length}</b>
          </div>
          <div className="stk-col-bar">
            <i style={{ width: `${Math.round((unique / Math.max(1, STICKERS.length)) * 100)}%` }} />
          </div>
        </button>
        {collectionStats.map((col) => (
          <button
            key={col.id}
            type="button"
            className={`stk-col-card${collectionFilter === col.id ? ' on' : ''}`}
            data-testid={`stk-col-${col.id}`}
            onClick={() => setCollectionFilter(collectionFilter === col.id ? 'all' : col.id)}
            title={col.desc}
          >
            <div className="stk-col-top">
              <span>{col.icon} {col.id}</span>
              <b>{col.owned}/{col.total}</b>
            </div>
            <div className="stk-col-bar">
              <i style={{ width: `${col.pct}%` }} />
            </div>
          </button>
        ))}
      </div>

      {/* Search & Rarity Controls */}
      <div className="build-tools" style={{ marginBottom: 12 }}>
        <div className="build-search-wrap">
          <Search size={14} color="#a79fd0" />
          <input
            type="search"
            className="inp build-search-inp"
            placeholder="Search 70 stickers & collections…"
            aria-label="Search stickers"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="inp build-sort-sel"
          aria-label="Filter sticker rarity"
          value={String(rarityFilter)}
          onChange={(e) => {
            const v = e.target.value;
            setRarityFilter(v === 'all' ? 'all' : (Number(v) as 1 | 2 | 3));
          }}
        >
          <option value="all">All Rarities</option>
          <option value="1">Common ★</option>
          <option value="2">Rare ★★</option>
          <option value="3">Mythic ★★★</option>
        </select>
        {(collectionFilter !== 'all' || rarityFilter !== 'all' || searchQuery) && (
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setCollectionFilter('all');
              setRarityFilter('all');
              setSearchQuery('');
            }}
          >
            Reset
          </button>
        )}
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

      <div className="stkgrid" data-testid="stickers-grid">
        {filteredStickers.map((s) => {
          const count = state.stk[s.id] || 0;
          const [rarityLabel, rarityColor] = RARITY_META[s.r];
          const canFuse = count >= 3;
          const directCost = s.diamondPrice || (s.r === 1 ? 65 : s.r === 2 ? 145 : 295);
          const canDirectBuy = Boolean(onBuyStickerWithDiamonds && count <= 0 && state.gems >= directCost);
          return (
            <div
              key={s.id}
              className={`stkcard ${count > 0 ? '' : 'miss'}${canFuse ? ' rec-card' : ''}${s.animated ? ' stkcard--animated' : ''}`}
              data-testid={`sticker-card-${s.id}`}
            >
              <StickerArt id={s.id} size={32} />
              <span className="stk-n">{s.n}</span>
              <span className="stk-r" style={{ color: rarityColor }} title={rarityLabel}>
                {'★'.repeat(s.r)}
              </span>
              {s.animated && <span className="stk-rx-pill">Animated FX</span>}
              {s.collection && (
                <small className="dim" style={{ fontSize: 10 }}>{s.collection}</small>
              )}
              {canFuse && (
                <span className="rec-badge">
                  <Sparkles size={10} />
                  <span>Fuse Ready</span>
                </span>
              )}
              <small className="dim">{count > 0 ? `Owned ×${count}` : rarityLabel}</small>
              {canFuse ? (
                <button
                  type="button"
                  className="btn sm mint"
                  style={{ minWidth: 0, padding: '5px 10px', fontSize: 11, marginTop: 2 }}
                  onClick={() => onFuseSticker(s.id)}
                >
                  Fuse 3×
                </button>
              ) : count <= 0 && onBuyStickerWithDiamonds ? (
                <button
                  type="button"
                  className={`btn sm ${canDirectBuy ? 'gold' : 'no'}`}
                  disabled={!canDirectBuy}
                  style={{ minWidth: 0, padding: '5px 8px', fontSize: 11, marginTop: 2 }}
                  title={canDirectBuy ? `Unlock directly for ${directCost} Diamonds` : `Need ${directCost} Diamonds`}
                  onClick={() => onBuyStickerWithDiamonds(s.id)}
                >
                  <GemDiamondIcon size={11} />
                  <span>{directCost}</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prev, next) => {
  if (
    prev.serverOffsetMs !== next.serverOffsetMs ||
    prev.onFuseSticker !== next.onFuseSticker ||
    prev.onBuyCrate !== next.onBuyCrate ||
    prev.onBuyStickerWithDiamonds !== next.onBuyStickerWithDiamonds ||
    prev.state.cash !== next.state.cash ||
    prev.state.gems !== next.state.gems ||
    prev.state.crateCd !== next.state.crateCd ||
    prev.state.stk !== next.state.stk
  ) {
    return false;
  }
  const pNow = (prev.state.t || 0) + (prev.serverOffsetMs || 0);
  const nNow = (next.state.t || 0) + (next.serverOffsetMs || 0);
  const pCdSec = Math.max(0, Math.ceil(((prev.state.crateCd || 0) - pNow) / 1000));
  const nCdSec = Math.max(0, Math.ceil(((next.state.crateCd || 0) - nNow) / 1000));
  return pCdSec === nCdSec;
});
