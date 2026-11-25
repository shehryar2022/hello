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
import {
  Award,
  BoosterIcon,
  Calendar,
  CashCoinIcon,
  Coins,
  GemDiamondIcon,
  RankEmblem,
  SubIcon,
  Zap,
} from '../GameIcons';

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
          <Award size={14} />
          <span>Ranks</span>
        </button>
        <button type="button" className={subTab === 'sub' ? 'on' : ''} onClick={() => onChangeSubTab('sub')}>
          <Calendar size={14} />
          <span>Subscriptions</span>
        </button>
        <button type="button" className={subTab === 'boost' ? 'on' : ''} onClick={() => onChangeSubTab('boost')}>
          <Zap size={14} />
          <span>Boosters</span>
        </button>
      </div>

      {subTab === 'rank' ? (
        <div>
          <div className="tradelim">
            <span>
              Current Rank:
              {currentRank.id > 0 && <RankEmblem rank={currentRank.id} size={18} />}
              <b>{currentRank.n}</b>
            </span>
            <span>
              Bonus <b className="ok">+{state.rank || 0}%</b> income (+1% per tier)
            </span>
          </div>

          <div className="list g2">
            {RANKS.slice(1).map((r) => {
              const owned = (state.rank || 0) >= r.id;
              const check = canBuyRank(state, r.id);
              const isNext = r.id === (state.rank || 0) + 1;

              return (
                <div key={r.id} className="row rank-row" style={{ '--c': r.c } as React.CSSProperties}>
                  <div className="em">
                    <RankEmblem rank={r.id} size={28} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2>
                      <span>{r.n}</span>
                      <span className="lv">+{r.id}%</span>
                    </h2>
                    <p>Prestige tier {r.id} · Permanent +1% income boost</p>
                  </div>
                  {owned ? (
                    <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>
                      Owned
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
          <div className={`gxc ${activeSub ? `sub-card sub-card--${activeSub.def.id}` : ''}`} style={{ marginBottom: 10 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} color="#5ccbff" />
              <b>Balanced National Subscriptions</b>
            </p>
            <p className="dim">
              Modest convenience perks (+4% to +12% income, 3%–10% build discount, +5%–15% project speed, and a daily treasury stipend) that keep core economy &amp; policy choices primary.
            </p>
            {activeSub ? (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <span className={`sub-crest sub-crest--${activeSub.def.id}`}>
                  <span className="sub-crest-ic">
                    <SubIcon tier={activeSub.def.id} size={13} />
                  </span>
                  <span>
                    {activeSub.def.n} · {formatSubRemaining(activeSub.leftMs)} left
                  </span>
                </span>
                <button
                  type="button"
                  className={`btn sm ${canClaimDaily ? 'gold' : 'no'}`}
                  disabled={!canClaimDaily}
                  onClick={onClaimSubDaily}
                >
                  {canClaimDaily ? (
                    <>
                      <CashCoinIcon size={14} />
                      <span>Claim Daily (₨ {formatNumber(activeSub.def.dailyCash)}</span>
                      {activeSub.def.dailyGems > 0 && (
                        <>
                          <span>+ {activeSub.def.dailyGems}</span>
                          <GemDiamondIcon size={13} />
                        </>
                      )}
                      <span>)</span>
                    </>
                  ) : (
                    'Claimed today'
                  )}
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
                  className={`row sub-card sub-card--${sub.id} ${isCurrent ? 'me' : ''}`}
                  style={{ '--c': sub.id === 'monthly' ? '#ffc23d' : sub.id === 'weekly' ? '#3fe0b0' : '#5ccbff' } as React.CSSProperties}
                >
                  <div className="em">
                    <span className="sub-crest-ic">
                      <SubIcon tier={sub.id} size={23} />
                    </span>
                  </div>
                  <div>
                    <h2>
                      <span>{sub.n}</span>
                      <span className={`sub-crest sub-crest--${sub.id}`}>{sub.periodLabel}</span>
                    </h2>
                    <p>{sub.d} · Visible animated frame on Leaderboard</p>
                  </div>
                  {isCurrent ? (
                    <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>
                      Active
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
            <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Coins size={15} color="#ffc23d" />
              <b>Balanced Shop Boosters</b>
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
                  <div className="em">
                    <BoosterIcon id={b.id} size={23} />
                  </div>
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
