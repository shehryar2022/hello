import React from 'react';
import { BOOSTERS, RANKS, SUBSCRIPTIONS } from '../../game/constants';
import {
  canBuyBooster,
  canBuyRank,
  canBuySubscription,
  formatNumber,
  getActiveShopIncomeBooster,
  getActiveSubscription,
} from '../../game/rules';
import type { GameState, ShopSubTab, SubscriptionTierId } from '../../game/types';

function formatSubRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalMin = Math.floor(ms / 60_000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface ShopTabProps {
  state: GameState;
  subTab: ShopSubTab;
  dayKey: string;
  serverOffsetMs?: number;
  onChangeSubTab: (sub: ShopSubTab) => void;
  onBuyRank: (rankId: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onBuySubscription: (tierId: SubscriptionTierId, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimSubDaily: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onBuyBooster: (boosterId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ShopTab: React.FC<ShopTabProps> = ({
  state,
  subTab,
  dayKey,
  serverOffsetMs = 0,
  onChangeSubTab,
  onBuyRank,
  onBuySubscription,
  onClaimSubDaily,
  onBuyBooster,
}) => {
  const nowMs = Date.now() + serverOffsetMs;
  const currentRank = RANKS[state.rank || 0] || RANKS[0];
  const activeIncomeBoost = getActiveShopIncomeBooster(state, nowMs);
  const activeSub = getActiveSubscription(state, nowMs);
  const canClaimDaily = !!activeSub && activeSub.lastClaimDay !== dayKey;

  return (
    <div>
      <div className="subtabs">
        <button type="button" className={subTab === 'rank' ? 'on' : ''} onClick={() => onChangeSubTab('rank')}>
          🪪 Ranks
        </button>
        <button type="button" className={subTab === 'sub' ? 'on' : ''} onClick={() => onChangeSubTab('sub')}>
          💳 Subscriptions
        </button>
        <button type="button" className={subTab === 'boost' ? 'on' : ''} onClick={() => onChangeSubTab('boost')}>
          🪙 Boosters
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
      ) : subTab === 'sub' ? (
        <div>
          <div className="gxc" style={{ marginBottom: 10 }}>
            <p>
              <b>💳 National Subscriptions (5M – 500M)</b>
            </p>
            <p className="dim">
              Boost national income, get a development discount on buildings, upgrades &amp; repairs, speed up
              Government Projects, and claim a daily treasury stipend.
            </p>
            {activeSub ? (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="ok">
                  {activeSub.def.e} Active: <b>{activeSub.def.n}</b> · {formatSubRemaining(activeSub.leftMs)} left
                </span>
                <button
                  type="button"
                  className={`btn sm ${canClaimDaily ? 'gold' : 'no'}`}
                  disabled={!canClaimDaily}
                  onClick={onClaimSubDaily}
                >
                  {canClaimDaily
                    ? `💵 Claim Daily (₨ ${formatNumber(activeSub.def.dailyCash)}${activeSub.def.dailyGems > 0 ? ` + ${activeSub.def.dailyGems}💎` : ''})`
                    : 'Claimed today ✓'}
                </button>
              </div>
            ) : (
              <p className="dim" style={{ marginTop: 6 }}>
                No active subscription yet — choose Daily, Weekly, or Monthly below.
              </p>
            )}
          </div>

          <div className="list">
            {SUBSCRIPTIONS.map((sub) => {
              const isCurrent = activeSub?.def.id === sub.id;
              const check = canBuySubscription(state, sub, nowMs);
              const isHigherTier = activeSub
                ? SUBSCRIPTIONS.findIndex((x) => x.id === sub.id) >
                  SUBSCRIPTIONS.findIndex((x) => x.id === activeSub.def.id)
                : false;

              return (
                <div
                  key={sub.id}
                  className={`row ${isCurrent ? 'me' : ''}`}
                  style={{ '--c': sub.id === 'monthly' ? '#ffc23d' : sub.id === 'weekly' ? '#3fe0b0' : '#5ccbff' } as React.CSSProperties}
                >
                  <div className="em">{sub.e}</div>
                  <div>
                    <h2>
                      {sub.n}
                      <span className="lv">{sub.periodLabel}</span>
                    </h2>
                    <p>{sub.d}</p>
                  </div>
                  {isCurrent ? (
                    <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>
                      Active ✓
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`btn sm ${check.ok ? (sub.id === 'monthly' ? 'gold' : 'mint') : 'no'}`}
                      disabled={!check.ok}
                      title={check.reason}
                      onClick={(e) => onBuySubscription(sub.id, e)}
                    >
                      {activeSub && !isHigherTier
                        ? 'Lower tier'
                        : `${isHigherTier ? 'Upgrade' : 'Subscribe'} · ₨ ${formatNumber(sub.cost)}`}
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
              <b>🪙 Balanced Shop Boosters</b>
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
                💵 Tax Surge Ready: +35% bonus on your next Collect tax (capped at 2m base income)
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
