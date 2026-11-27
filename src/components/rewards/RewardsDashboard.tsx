import React, { memo, useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS, WEEKLY_MISSIONS } from '../../game/constants';
import {
  formatCountdownShort,
  getDailyRewardsView,
  msUntilNextKarachiDay,
} from '../../game/rewards';
import {
  formatNumber,
  MILESTONES,
  selectWeeklyMissionIds,
} from '../../game/rules';
import type { GameState } from '../../game/types';
import {
  Award,
  Calendar,
  CashCoinIcon,
  CheckCircle2,
  GemDiamondIcon,
  Gift,
  Sparkles,
  Trophy,
} from '../GameIcons';

const DailyResetCountdown = memo(function DailyResetCountdown({
  serverOffsetMs = 0,
}: {
  serverOffsetMs?: number;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => window.clearInterval(id);
  }, []);

  void tick;
  const nowMs = Date.now() + serverOffsetMs;
  const msLeft = msUntilNextKarachiDay(nowMs);
  return (
    <span className="rw-timer">
      <Calendar size={12} />
      <span>Resets in {formatCountdownShort(msLeft)}</span>
    </span>
  );
});

export interface RewardsDashboardProps {
  state: GameState;
  weekKey: string;
  rankPosition: number;
  serverOffsetMs?: number;
  onClaimDailySlot?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimWeekly?: (missionId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimAchievement?: (achievementId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimMilestone: (milestoneId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const RewardsDashboard = memo(function RewardsDashboard({
  state,
  weekKey,
  rankPosition,
  serverOffsetMs = 0,
  onClaimDailySlot,
  onClaimWeekly,
  onClaimAchievement,
  onClaimMilestone,
}: RewardsDashboardProps) {
  const nowMs = (state.t || Date.now()) + serverOffsetMs;
  const dailyView = useMemo(() => getDailyRewardsView(state, nowMs), [state, nowMs]);

  const weeklyIndices = useMemo(() => selectWeeklyMissionIds(weekKey), [weekKey]);
  const weeklyClaimed = state.weeklyDay === weekKey ? state.weeklyClaimed || {} : {};
  const unlockedAchCount = useMemo(
    () => ACHIEVEMENTS.filter((a) => !!state.achievements?.[a.id]).length,
    [state.achievements],
  );

  return (
    <div className="rw-dash" data-testid="rewards-dashboard">
      {/* SECTION 1: DAILY REWARDS (5-DAY CYCLE) */}
      <section className="rw-section" aria-label="Daily Rewards" data-testid="daily-rewards-section">
        <div className="rw-sec-hdr">
          <h3>
            <Gift size={17} color="#3fe0b0" />
            <span>Daily Rewards (5-Day Cycle)</span>
          </h3>
          <DailyResetCountdown serverOffsetMs={serverOffsetMs} />
        </div>

        <div className="rw-daily-grid">
          {dailyView.slots.map((slot) => {
            const isAvail = slot.status === 'available';
            const isClaimed = slot.status === 'claimed';
            return (
              <div key={slot.day} className={`rw-slot ${slot.status}`} data-testid={`daily-slot-${slot.day}`}>
                <span className="rw-slot-day">Day {slot.day}</span>
                <span style={{ fontSize: 24 }} aria-hidden="true">
                  {slot.icon}
                </span>
                <b style={{ fontSize: 12.5, fontFamily: 'var(--d)' }}>{slot.title}</b>
                <div className="rw-slot-rewards">
                  <span style={{ color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <CashCoinIcon size={12} />
                    <span>+₨ {formatNumber(slot.coins)}</span>
                  </span>
                  <span style={{ color: 'var(--cy)', display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    <GemDiamondIcon size={12} />
                    <span>+{slot.diamonds} Diamonds</span>
                  </span>
                  {slot.bonusLabel && (
                    <span className="ok" style={{ fontSize: 10.5 }}>{slot.bonusLabel}</span>
                  )}
                </div>
                {isClaimed ? (
                  <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)' }}>
                    Claimed
                  </span>
                ) : isAvail ? (
                  <button
                    type="button"
                    className="btn sm mint"
                    disabled={!onClaimDailySlot}
                    onClick={(e) => onClaimDailySlot?.(e)}
                  >
                    Claim Day {slot.day}
                  </button>
                ) : (
                  <span className="dim" style={{ fontSize: 11, fontWeight: 700 }}>
                    Locked
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {dailyView.history.length > 0 && (
          <div className="rw-hist">
            <span className="rw-hist-title">Recent Daily Claims</span>
            {dailyView.history.slice(0, 4).map((h, i) => (
              <div key={`${h.day}-${h.label}-${i}`} className="rw-hist-row">
                <span>
                  <b>{h.label}</b> · {h.day}
                </span>
                <span style={{ color: 'var(--gold)' }}>
                  +₨ {formatNumber(h.coins)} · +{h.diamonds} Diamonds{h.bonus ? ` · ${h.bonus}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: WEEKLY STRATEGIC MISSIONS, ACHIEVEMENTS & MILESTONES */}
      <section className="rw-section" aria-label="Missions and Milestones">
        <div className="tradelim" style={{ marginTop: 4 }}>
          <span>
            <Sparkles size={14} color="#5ccbff" /> Weekly Strategic Missions
          </span>
          <b>{weekKey}</b>
        </div>

        <div className="list">
          {weeklyIndices.map((idx) => {
            const w = WEEKLY_MISSIONS[idx] || WEEKLY_MISSIONS[0];
            const cur = w.f(state, { rank: rankPosition });
            const pct = Math.max(0, Math.min(100, (cur / w.g) * 100));
            const isClaimed = !!weeklyClaimed[w.id];
            const isReady = !isClaimed && cur >= w.g;

            return (
              <div key={w.id} className="row" style={{ '--c': isClaimed ? '#3fe0b0' : '#5ccbff' } as React.CSSProperties}>
                <div className="em">
                  {isClaimed ? <CheckCircle2 size={22} color="#3fe0b0" /> : <Sparkles size={22} color="#5ccbff" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2>
                    <span>{w.t}</span>
                    <span className="lv">
                      +{w.r} <GemDiamondIcon size={12} />
                    </span>
                  </h2>
                  <p>
                    {Math.min(Math.floor(cur), w.g).toLocaleString('en-US')} / {w.g.toLocaleString('en-US')}
                  </p>
                  <div className="bar" style={{ marginTop: 6 }}>
                    <i style={{ width: `${pct}%`, '--c': isClaimed ? '#3fe0b0' : '#5ccbff' } as React.CSSProperties} />
                  </div>
                </div>
                {isClaimed ? (
                  <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>
                    Claimed
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`btn sm ${isReady ? 'gold' : 'no'}`}
                    disabled={!isReady || !onClaimWeekly}
                    onClick={(e) => onClaimWeekly?.(w.id, e)}
                  >
                    {isReady ? (
                      <>
                        <span>Claim +{w.r}</span>
                        <GemDiamondIcon size={13} />
                      </>
                    ) : (
                      `${Math.floor(pct)}%`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="gxh" style={{ marginTop: 4 }}>
          <Award size={15} color="#ffc23d" />
          <span>National Achievements ({unlockedAchCount}/{ACHIEVEMENTS.length})</span>
        </div>

        <div className="list g2" data-testid="achievements-grid">
          {ACHIEVEMENTS.map((a) => {
            const cur = a.f(state);
            const pct = Math.max(0, Math.min(100, (cur / a.goal) * 100));
            const isClaimed = !!state.achievements?.[a.id];
            const isReady = !isClaimed && cur >= a.goal;
            const tierClass = `ach-tier-${a.tier.toLowerCase()}`;

            return (
              <div
                key={a.id}
                className="row"
                style={{ '--c': isClaimed ? '#3fe0b0' : a.tier === 'Diamond' ? '#5ccbff' : a.tier === 'Gold' ? '#ffc23d' : '#a58cff' } as React.CSSProperties}
              >
                <div className="em">
                  {isClaimed ? <CheckCircle2 size={22} color="#3fe0b0" /> : <Award size={22} color="#ffc23d" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2>
                    <span>{a.n}</span>
                    <span className={`lv ${tierClass}`}>{a.tier}</span>
                  </h2>
                  <p>
                    {a.desc} ({formatNumber(Math.min(Math.floor(cur), a.goal))} / {formatNumber(a.goal)})
                  </p>
                  <div className="bmeta">
                    <span style={{ color: 'var(--cy)' }}>
                      +{a.rewardGems} <GemDiamondIcon size={11} />
                    </span>
                    <span style={{ color: 'var(--gold)' }}>
                      +₨ {formatNumber(a.rewardCash)} <CashCoinIcon size={11} />
                    </span>
                  </div>
                  <div className="bar" style={{ marginTop: 5 }}>
                    <i style={{ width: `${pct}%`, '--c': isClaimed ? '#3fe0b0' : '#ffc23d' } as React.CSSProperties} />
                  </div>
                </div>
                {isClaimed ? (
                  <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>
                    Unlocked
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`btn sm ${isReady ? 'gold' : 'no'}`}
                    disabled={!isReady || !onClaimAchievement}
                    onClick={(e) => onClaimAchievement?.(a.id, e)}
                  >
                    {isReady ? 'Claim' : `${Math.floor(pct)}%`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="gxh" style={{ marginTop: 4 }}>
          <Trophy size={15} color="#ffc23d" />
          <span>National Milestones</span>
        </div>

        <div className="list">
          {MILESTONES.map((m) => {
            const cur = m.f(state, { rank: rankPosition });
            const pct = Math.max(0, Math.min(100, (cur / m.g) * 100));
            const isClaimed = !!state.milestones?.[m.id];
            const isReady = !isClaimed && cur >= m.g;

            return (
              <div key={m.id} className="row" style={{ '--c': isClaimed ? '#3fe0b0' : '#a58cff' } as React.CSSProperties}>
                <div className="em">
                  {isClaimed ? <CheckCircle2 size={22} color="#3fe0b0" /> : <Trophy size={22} color="#a58cff" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2>
                    <span>{m.t}</span>
                    <span className="lv">
                      +{m.r} <GemDiamondIcon size={12} />
                    </span>
                  </h2>
                  <p>
                    {Math.min(Math.floor(cur), m.g).toLocaleString('en-US')} / {m.g.toLocaleString('en-US')}
                  </p>
                  <div className="bar" style={{ marginTop: 6 }}>
                    <i style={{ width: `${pct}%`, '--c': isClaimed ? '#3fe0b0' : '#a58cff' } as React.CSSProperties} />
                  </div>
                </div>
                {isClaimed ? (
                  <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>
                    Completed
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`btn sm ${isReady ? 'gold' : 'no'}`}
                    disabled={!isReady}
                    onClick={(e) => onClaimMilestone(m.id, e)}
                  >
                    {isReady ? (
                      <>
                        <span>Claim +{m.r}</span>
                        <GemDiamondIcon size={13} />
                      </>
                    ) : (
                      `${Math.floor(pct)}%`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
});
