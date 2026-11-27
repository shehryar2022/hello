import React, { memo, useMemo } from 'react';
import { BOOSTERS, RANKS, SUBSCRIPTIONS } from '../../game/constants';
import {
  canBuyBooster,
  canBuySubscription,
  formatNumber,
  getActiveShopIncomeBooster,
  getActiveSubscription,
  getBoosterActivationInfo,
  getRankEligibility,
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
  CheckCircle2,
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
  const currentRankNum = Math.max(1, Math.min(10, Math.floor(state.rank || 1)));
  const currentRank = RANKS[currentRankNum] || RANKS[1];
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
          <div className="rk-hero">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <RankEmblem rank={currentRank.id} size={30} />
              <span>
                <small className="dim" style={{ display: 'block', fontSize: 11 }}>
                  Current Sovereign Rank ({currentRank.id}/10)
                </small>
                <b style={{ fontSize: 15 }}>{currentRank.n}</b>
              </span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <small className="dim" style={{ display: 'block', fontSize: 11 }}>
                Permanent Income Bonus
              </small>
              <b className="ok" style={{ fontSize: 15 }}>
                +{currentRank.incomeBonusPct}% income
              </b>
            </span>
          </div>

          <div className="list g2">
            {RANKS.slice(1).map((r) => {
              const elig = getRankEligibility(state, r.id);
              const owned = elig.alreadyOwned;
              const isNext = r.id === currentRankNum + 1;
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
                      <span>
                        {r.id}. {r.n}
                      </span>
                      <span className="lv">+{r.incomeBonusPct}% inc</span>
                    </h2>
                    {isRec && (
                      <div style={{ marginTop: 3 }}>
                        <span className="rec-badge">
                          <Sparkles size={10} />
                          <span>{shopRec.rankReason}</span>
                        </span>
                      </div>
                    )}
                    <p>{r.d}</p>
                    {!owned && r.id > 1 && (
                      <div className="rk-reqs">
                        <span className={`rk-req ${elig.missingGdp === 0 ? 'met' : 'miss'}`}>
                          {elig.missingGdp === 0 ? <CheckCircle2 size={11} /> : <span className="rk-dot" />}
                          <span>GDP ₨ {formatNumber(r.minGdp)}</span>
                        </span>
                        <span className={`rk-req ${elig.missingBuildings === 0 ? 'met' : 'miss'}`}>
                          {elig.missingBuildings === 0 ? <CheckCircle2 size={11} /> : <span className="rk-dot" />}
                          <span>{r.minBuildings} Bldgs</span>
                        </span>
                        {r.minHap > 0 && (
                          <span className={`rk-req ${elig.missingHap === 0 ? 'met' : 'miss'}`}>
                            {elig.missingHap === 0 ? <CheckCircle2 size={11} /> : <span className="rk-dot" />}
                            <span>{r.minHap}% Hap</span>
                          </span>
                        )}
                        {r.minTech > 0 && (
                          <span className={`rk-req ${elig.missingTech === 0 ? 'met' : 'miss'}`}>
                            {elig.missingTech === 0 ? <CheckCircle2 size={11} /> : <span className="rk-dot" />}
                            <span>{r.minTech} Tech</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {owned ? (
                    <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)', background: 'rgba(63,224,176,0.14)' }}>
                      Unlocked
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`btn sm ${elig.eligible ? 'gold' : 'no'}`}
                      disabled={!elig.eligible}
                      title={elig.reason}
                      onClick={(e) => onBuyRank(r.id, e)}
                    >
                      {isNext ? `Promote · ₨ ${formatNumber(r.cost)}` : `Rank ${r.id - 1} req`}
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
              Three Coin-funded national charters: 2 Hours (100K), 3 Days (1M), or 7 Days (10M Coins). No duplicate deductions or stacking exploits.
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
                        <span>
                          {activeSub.def.id === 'daily' ? 'Claim Stipend' : 'Claim Daily'} (₨ {formatNumber(activeSub.def.dailyCash)}
                        </span>
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
                No active subscription — choose 2 Hours (100K), 3 Days (1M), or 7 Days (10M) below.
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
                          <span>{shopRec.subReason}</span>
                        </span>
                      )}
                    </h2>
                    <p>
                      {sub.d} · Leaderboard Crest
                      {price.promoActive && ` · Deal ends in ${formatSubRemaining(price.msLeft)}`}
                    </p>
                    {shortfall > 0 && (
                      <p style={{ marginTop: 3, fontSize: 11.5, color: '#ff8da8' }}>
                        Need ₨ {formatNumber(shortfall)} more Coins
                      </p>
                    )}
                  </div>
                  {isCurrent ? (
                    <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)', background: 'rgba(63,224,176,0.14)' }}>
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
              <b>National Boosters (7 Categories)</b>
            </p>
            <p className="dim">
              Only <b>1 income multiplier booster</b> (Income Boost or Growth Boost) can run at a time, combined temporary multipliers are capped at <b>×2.5</b>, and each booster enforces daily activation limits &amp; cooldowns.
            </p>
            {activeIncomeBoost.active && (
              <p className="ok" style={{ marginTop: 4 }}>
                Income Multiplier Active: ×{activeIncomeBoost.mult} ({activeIncomeBoost.leftSec}s left)
              </p>
            )}
            {!!state.activeFx?.taxSurge && (
              <p className="ok" style={{ marginTop: 4 }}>
                Tax Collection Boost Primed: +30% bonus on your next Collect tax (capped at 2m base income)
              </p>
            )}
          </div>

          <div className="list g2">
            {BOOSTERS.map((b) => {
              const info = getBoosterActivationInfo(state, b.id, nowMs);
              const check = canBuyBooster(state, b, nowMs);
              const recReason = boosterRec[b.id];
              const label = info.active && b.dur > 0
                ? `Active ${info.activeLeftSec}s`
                : check.cooldownLeftSec > 0
                  ? `${check.cooldownLeftSec}s CD`
                  : b.isIncomeBoost && activeIncomeBoost.active
                    ? 'Income Active'
                    : b.id === 'tax_boost' && state.activeFx?.taxSurge
                      ? 'Primed'
                      : info.usedToday >= info.dailyLimit
                        ? `Limit ${info.usedToday}/${info.dailyLimit}`
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
                  <div style={{ minWidth: 0 }}>
                    <h2>
                      <span>{b.n}</span>
                      <span className="lv">{b.effectLabel}</span>
                      {recReason && (
                        <span className="rec-badge">
                          <Sparkles size={10} />
                          <span>{recReason}</span>
                        </span>
                      )}
                    </h2>
                    <p>{b.d}</p>
                    <div className="bst-meta">
                      <span>
                        Daily: <b style={{ color: info.usedToday >= info.dailyLimit ? 'var(--pink)' : 'var(--tx)' }}>{info.usedToday}/{info.dailyLimit}</b>
                      </span>
                      <span>Cooldown: {Math.round(b.cd / 60)}m</span>
                      {info.active && b.dur > 0 && <span className="ok">{info.activeLeftSec}s remaining</span>}
                    </div>
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
    prev.serverOffsetMs !== next.serverOffsetMs ||
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
  if (prev.subTab === 'rank') {
    return Math.round(p.hap) === Math.round(n.hap) && Math.round(p.pop) === Math.round(n.pop);
  }
  if (prev.subTab === 'sub') {
    if (pSubActive || nSubActive || pPromoActive || nPromoActive) {
      return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
    }
    return true;
  }
  // subTab === 'boost': re-render per second when any booster or cooldown is counting down
  if (getActiveShopIncomeBooster(p, pNow).active || getActiveShopIncomeBooster(n, nNow).active) {
    return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
  }
  for (const b of BOOSTERS) {
    const pInfo = getBoosterActivationInfo(p, b.id, pNow);
    const nInfo = getBoosterActivationInfo(n, b.id, nNow);
    if (pInfo.active || nInfo.active || pInfo.cooldownLeftSec > 0 || nInfo.cooldownLeftSec > 0) {
      return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
    }
  }
  return true;
});
