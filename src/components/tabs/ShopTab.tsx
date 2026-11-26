import React, { memo, useMemo } from 'react';
import { BOOSTERS, RANKS, SUBSCRIPTIONS } from '../../game/constants';
import {
  canBuyBooster,
  canBuyRank,
  canBuySubscription,
  formatNumber,
  getActiveShopIncomeBooster,
  getActiveSubscription,
  getRecommendedBoosters,
  getRecommendedShopItems,
  getSubscriptionPrice,
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
  Sparkles,
  SubIcon,
  Zap,
} from '../GameIcons';

function formatSubRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86_400);
  const h = Math.floor((totalSec % 86_400) / 3_600);
  const m = Math.floor((totalSec % 3_600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatSubTimestamp(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—';
  return new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

export const ShopTab: React.FC<ShopTabProps> = memo(({
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
  const nowMs = (state.t || Date.now()) + serverOffsetMs;
  const currentRank = RANKS[state.rank || 0] || RANKS[0];
  const activeIncomeBoost = useMemo(() => getActiveShopIncomeBooster(state, nowMs), [state, nowMs]);
  const activeSub = useMemo(() => getActiveSubscription(state, nowMs), [state, nowMs]);
  const canClaimDaily = !!activeSub && activeSub.lastClaimDay !== dayKey;

  const shopRec = useMemo(() => getRecommendedShopItems(state, nowMs), [state, nowMs]);
  const boosterRec = useMemo(() => getRecommendedBoosters(state, nowMs), [state, nowMs]);

  const activePromoSub = useMemo(
    () => SUBSCRIPTIONS.find((sub) => getSubscriptionPrice(state, sub, nowMs).promoActive),
    [state, nowMs],
  );
  const activePromoPrice = useMemo(
    () => (activePromoSub ? getSubscriptionPrice(state, activePromoSub, nowMs) : null),
    [activePromoSub, state, nowMs],
  );

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
          {activePromoPrice?.promoActive && <em>−{activePromoPrice.discountPct}%</em>}
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
              const isRec = shopRec.nextRankId === r.id;

              return (
                <div
                  key={r.id}
                  className={`row rank-row${isRec ? ' rec-card' : ''}`}
                  style={{ '--c': r.c } as React.CSSProperties}
                >
                  <div className="em">
                    <RankEmblem rank={r.id} size={28} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2>
                      <span>{r.n}</span>
                      <span className="lv">+{r.id}%</span>
                    </h2>
                    {isRec && (
                      <div style={{ marginTop: 3 }}>
                        <span className="rec-badge">
                          <Sparkles size={10} />
                          <span>Recommended · {shopRec.rankReason}</span>
                        </span>
                      </div>
                    )}
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
          {activePromoSub && activePromoPrice?.promoActive && (
            <div className="promo-banner" data-testid="weekly-sub-promo">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="rec-badge">
                  <Sparkles size={11} />
                  <span>Weekly Flash Deal · {activePromoPrice.discountPct}% OFF</span>
                </span>
                <span className="dim" style={{ fontSize: 12 }}>
                  Ends in <b style={{ color: 'var(--gold)' }}>{formatSubRemaining(activePromoPrice.msLeft)}</b>
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 13, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
                <span>Random weekly offer unlocked on <b>{activePromoSub.n}</b>:</span>
                <span className="price-strike" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <CashCoinIcon size={12} />
                  ₨ {formatNumber(activePromoPrice.baseCost)}
                </span>
                <b className="ok" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CashCoinIcon size={13} />
                  ₨ {formatNumber(activePromoPrice.finalCost)} Coins
                </b>
              </p>
            </div>
          )}

          <div className={`gxc ${activeSub ? `sub-card sub-card--${activeSub.def.id}` : ''}`} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                <Calendar size={15} color="#5ccbff" />
                <b>National Coin Subscriptions</b>
              </p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: '#ffe082' }}>
                <CashCoinIcon size={14} />
                <span>₨ {formatNumber(Math.max(0, Math.floor(Number.isFinite(state.cash) ? state.cash : 0)))} Coins</span>
              </span>
            </div>
            <p className="dim" style={{ marginTop: 4 }}>
              Premium national charters purchased with Coins (100K / 1M / 10M Coins) for +4% to +12% income, 3%–10% build discount, +5%–15% project speed, and daily stipends.
            </p>
            {activeSub ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
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
                <p className="dim" style={{ marginTop: 6, fontSize: 11.5 }}>
                  Started: {formatSubTimestamp(activeSub.startedAt)} · Expires: {formatSubTimestamp(activeSub.exp)}
                </p>
              </div>
            ) : (
              <p className="dim" style={{ marginTop: 6 }}>
                No active subscription yet — choose 2 Hours (100K), 3 Days (1M), or Weekly (10M) below.
              </p>
            )}
          </div>

          <div className="list">
            {SUBSCRIPTIONS.map((sub) => {
              const isCurrent = activeSub?.def.id === sub.id;
              const check = canBuySubscription(state, sub, nowMs);
              const price = getSubscriptionPrice(state, sub, nowMs);
              const isHigherTier = activeSub
                ? SUBSCRIPTIONS.findIndex((x) => x.id === sub.id) >
                  SUBSCRIPTIONS.findIndex((x) => x.id === activeSub.def.id)
                : false;
              const isLowerTierBlocked = Boolean(activeSub && !isHigherTier && !isCurrent);
              const isRec = !isCurrent && shopRec.subTier === sub.id;
              const shortfall = !isCurrent && !isLowerTierBlocked && check.shortfall ? check.shortfall : 0;

              return (
                <div
                  key={sub.id}
                  className={`row sub-card sub-card--${sub.id}${isCurrent ? ' me' : ''}${isRec ? ' rec-card' : ''}`}
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
                      <span className={`sub-crest sub-crest--${sub.id}`}>{sub.durationLabel}</span>
                      {price.promoActive && (
                        <span className="rec-badge">
                          <Sparkles size={10} />
                          <span>−{price.discountPct}% Weekly Deal</span>
                        </span>
                      )}
                      {isRec && !price.promoActive && (
                        <span className="rec-badge">
                          <Sparkles size={10} />
                          <span>Recommended · {shopRec.subReason}</span>
                        </span>
                      )}
                    </h2>
                    <p>
                      {sub.d} · Animated Leaderboard Crest
                      {price.promoActive && ` · Deal ends in ${formatSubRemaining(price.msLeft)}`}
                    </p>
                    {shortfall > 0 && (
                      <p style={{ marginTop: 3, fontSize: 11.5, color: '#ff8da8' }}>
                        Need ₨ {formatNumber(shortfall)} more Coins
                      </p>
                    )}
                  </div>
                  {isCurrent ? (
                    <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`btn sm ${check.ok ? (sub.id === 'monthly' || price.promoActive ? 'gold' : 'mint') : 'no'}`}
                      disabled={isLowerTierBlocked}
                      aria-disabled={!check.ok}
                      title={check.reason}
                      onClick={(e) => onBuySubscription(sub.id, e)}
                    >
                      {isLowerTierBlocked ? (
                        'Lower tier'
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span>{isHigherTier ? 'Upgrade' : 'Subscribe'} ·</span>
                          {price.promoActive && (
                            <span className="price-strike" style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              <CashCoinIcon size={11} />
                              ₨ {formatNumber(price.baseCost)}
                            </span>
                          )}
                          <CashCoinIcon size={13} />
                          <span>₨ {formatNumber(price.finalCost)}</span>
                        </span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {(() => {
            const subLogs = (state.gx?.log || []).filter((entry) => entry.startsWith('Subscription:'));
            if (!subLogs.length) return null;
            return (
              <div className="gxc" style={{ marginTop: 10 }}>
                <p style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 4 }}>
                  Recent Subscription Transactions
                </p>
                {subLogs.map((entry, idx) => (
                  <p key={`${idx}-${entry}`} className="dim" style={{ fontSize: 12 }}>
                    {entry}
                  </p>
                ))}
              </div>
            );
          })()}
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
              const recReason = boosterRec[b.id];
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
                  className={`row${recReason ? ' rec-card' : ''}`}
                  style={{ '--c': b.tier === 'rare' ? '#ffc23d' : '#5ccbff' } as React.CSSProperties}
                >
                  <div className="em">
                    <BoosterIcon id={b.id} size={23} />
                  </div>
                  <div>
                    <h2>
                      {b.n}
                      <span className="lv">{b.tier === 'rare' ? 'Rare' : 'Common'}</span>
                      {recReason && (
                        <span className="rec-badge">
                          <Sparkles size={10} />
                          <span>Recommended · {recReason}</span>
                        </span>
                      )}
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
}, (prev, next) => {
  if (
    prev.subTab !== next.subTab ||
    prev.dayKey !== next.dayKey ||
    prev.onChangeSubTab !== next.onChangeSubTab ||
    prev.onBuyRank !== next.onBuyRank ||
    prev.onBuySubscription !== next.onBuySubscription ||
    prev.onClaimSubDaily !== next.onClaimSubDaily ||
    prev.onBuyBooster !== next.onBuyBooster
  ) {
    return false;
  }
  const p = prev.state;
  const n = next.state;
  if (
    p.cash !== n.cash ||
    p.gems !== n.gems ||
    p.rank !== n.rank ||
    p.b !== n.b ||
    p.tech !== n.tech ||
    p.gx?.lvl !== n.gx?.lvl ||
    p.gx?.log !== n.gx?.log ||
    p.sub !== n.sub ||
    p.subPromo !== n.subPromo ||
    p.activeFx !== n.activeFx ||
    p.boosterCd !== n.boosterCd
  ) {
    return false;
  }
  const pNow = (p.t || 0) + (prev.serverOffsetMs || 0);
  const nNow = (n.t || 0) + (next.serverOffsetMs || 0);
  const pSubActive = !!getActiveSubscription(p, pNow);
  const nSubActive = !!getActiveSubscription(n, nNow);
  if (pSubActive !== nSubActive) return false;
  const pPromoActive = (p.subPromo?.exp || 0) > pNow;
  const nPromoActive = (n.subPromo?.exp || 0) > nNow;
  if (pPromoActive !== nPromoActive) return false;
  if (prev.subTab === 'rank') return true;
  if (prev.subTab === 'sub') {
    if (pSubActive || nSubActive || pPromoActive || nPromoActive) {
      return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
    }
    return true;
  }
  // subTab === 'boost': only re-render per second when a booster or cooldown is counting down
  const pBoostActive = getActiveShopIncomeBooster(p, pNow).active;
  const nBoostActive = getActiveShopIncomeBooster(n, nNow).active;
  if (pBoostActive || nBoostActive) return false;
  const cds = n.boosterCd || {};
  const minNow = Math.min(pNow, nNow);
  for (const exp of Object.values(cds)) {
    if ((exp || 0) > minNow) return false;
  }
  return true;
});
