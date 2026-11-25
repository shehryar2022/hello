import React from 'react';
import { RARITY_META, STICKERS } from '../../game/constants';
import { stickerBonus, stickerUniqueCount } from '../../game/rules';
import type { GameState } from '../../game/types';

interface StickersTabProps {
  state: GameState;
  onFuseSticker: (stickerId: string) => void;
}

export const StickersTab: React.FC<StickersTabProps> = ({ state, onFuseSticker }) => {
  const unique = stickerUniqueCount(state);
  const bonusPct = (stickerBonus(state) * 100).toFixed(1);
  const fusable = STICKERS.filter((s) => (state.stk[s.id] || 0) >= 3);

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

      {fusable.length > 0 && (
        <div className="gxc" style={{ marginBottom: 12 }}>
          <p style={{ marginBottom: 8 }}>
            <b>🔮 Fuse Duplicates</b>{' '}
            <span className="dim">· Trade 3 identical stickers for 1 higher-rarity sticker</span>
          </p>
          <div className="chiprow">
            {fusable.map((s) => (
              <button key={s.id} type="button" onClick={() => onFuseSticker(s.id)}>
                {s.e} {s.n} (3→1)
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="stkgrid">
        {STICKERS.map((s) => {
          const count = state.stk[s.id] || 0;
          const [rarityLabel, rarityColor] = RARITY_META[s.r];
          return (
            <div key={s.id} className={`stkcard ${count > 0 ? '' : 'miss'}`}>
              <span className="stk-e">{s.e}</span>
              <span className="stk-n">{s.n}</span>
              <span className="stk-r" style={{ color: rarityColor }} title={rarityLabel}>
                {'★'.repeat(s.r)}
              </span>
              <small className="dim">{count > 0 ? `×${count}` : rarityLabel}</small>
              {count >= 3 && (
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
