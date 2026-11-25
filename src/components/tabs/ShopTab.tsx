import React from 'react';
import { BOOSTERS, RANKS } from '../../game/constants';
import {
  canBuyBooster,
  canBuyRank,
  formatNumber,
  getActiveShopIncomeBooster,
} from '../../game/rules';
import type { GameState, ShopSubTab } from '../../game/types';

interface ShopTabProps {
  state: GameState;
  subTab: ShopSubTab;
  onChangeSubTab: (sub: ShopSubTab) => void;
  onBuyRank: (rankId: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onBuyBooster: (boosterId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ShopTab: React.FC<ShopTabProps> = ({
  state,
  subTab,
  onChangeSubTab,
  onBuyRank,
  onBuyBooster,
}) => {
  const nowMs = Date.now();
  const currentRank = RANKS[state.rank || 0] || RANKS[0];
  const activeIncomeBoost = getActiveShopIncomeBooster(state, nowMs);

  return (
    <div>
      <div className="subtabs">
        <button type="button" className={subTab === 'rank' ? 'on' : ''} onClick={() => onChangeSubTab('rank')}>
          🏅 Ranks
        </button>
        <button type="button" className={subTab === 'boost' ? 'on' : ''} onClick={() => onChangeSubTab('boost')}>
          ⚡ Boosters
        </button>
      </div>

      {subTab === 'rank' ? (
        <div>
          <div className="tradelim">
            <span>
              Current Rank: <b>{currentRank.e ? `${currentRank.e} ` : ''}{currentRank.n}</b>
            </span>
            <span>
              Bonus <b className="ok">+{(state.rank || 0) * 2}%</b> income
            </span>
          </div>

          <div className="list g2">
            {RANKS.slice(1).map((r) => {
              const owned = (state.rank || 0) >= r.id;
              const check = canBuyRank(state, r.id);
              const isNext = r.id === (state.rank || 0) + 1;

              return (
                <div key={r.id} className="row" style={{ '--c': r.c } as React.CSSProperties}>
                  <div className="em">{r.e}</div>
                  <div>
                    <h2>
                      {r.n}
                      <span className="lv">+{r.id * 2}% inc</span>
                    </h2>
                    <p>Prestige title &amp; permanent +2% boost per tier</p>
                  </div>
                  {owned ? (
                    <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>
                      Owned ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`btn sm ${check.ok ? 'gold' : 'no'}`}
                      disabled={!check.ok}
                      onClick={(e) => onBuyRank(r.id, e)}
                    >
                      {isNext ? `₨ ${formatNumber(r.cost)}` : 'Locked'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="gxc" style={{ marginBottom: 10 }}>
            <p>
              <b>⚡ Balanced Shop Boosters</b>
            </p>
            <p className="dim">
              Only <b>1 income multiplier booster</b> can be active at a time (no stacking). Combined temporary
              multipliers are capped at <b>×2.5</b>, and Tax Surge bonus is capped at <b>2 min of base income</b>.
            </p>
            {activeIncomeBoost.active && (
              <p className="ok" style={{ marginTop: 4 }}>
                Active: ×{activeIncomeBoost.mult} ({activeIncomeBoost.leftSec}s left)
              </p>
            )}
            {!!state.activeFx?.taxSurge && (
              <p className="ok" style={{ marginTop: 4 }}>
                Tax Surge Ready: +35% bonus on your next Collect tax (capped at 2m base income)
              </p>
            )}
          </div>

          <div className="list g2">
            {BOOSTERS.map((b) => {
              const check = canBuyBooster(state, b, nowMs);
              const label = check.cooldownLeftSec > 0
                ? `${check.cooldownLeftSec}s CD`
                : b.isIncomeBoost && activeIncomeBoost.active
                  ? 'Active limit'
                  : b.fx === 'tax15x' && state.activeFx?.taxSurge
                    ? 'Ready'
                    : `₨ ${formatNumber(b.cost)}`;

              return (
                <div
                  key={b.id}
                  className="row"
                  style={{ '--c': b.tier === 'rare' ? '#ffc23d' : '#5ccbff' } as React.CSSProperties}
                >
                  <div className="em">{b.e}</div>
                  <div>
                    <h2>
                      {b.n}
                      <span className="lv">{b.tier === 'rare' ? 'Rare' : 'Common'}</span>
                    </h2>
                    <p>{b.d}</p>
                  </div>
                  <button
                    type="button"
                    className={`btn sm ${check.ok ? 'mint' : 'no'}`}
                    disabled={!check.ok}
                    title={check.reason}
                    onClick={(e) => onBuyBooster(b.id, e)}
                  >
                    {label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
