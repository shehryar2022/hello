import React, { memo, useEffect, useMemo, useState } from 'react';
import { ACHIEVEMENTS, WEEKLY_MISSIONS } from '../../game/constants';
import {
  formatCountdownShort,
  getDailyRewardsView,
  getQuestCoinReward,
  getWeeklyRewardsView,
  msUntilNextKarachiDay,
  msUntilNextKarachiMonday,
} from '../../game/rewards';
import {
  formatNumber,
  MILESTONES,
  QUEST_POOL,
  selectDailyQuestIds,
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
  Target,
  Trophy,
} from '../GameIcons';

const KarachiCountdown = memo(function KarachiCountdown({
  mode,
  serverOffsetMs = 0,
}: {
  mode: 'daily' | 'weekly';
  serverOffsetMs?: number;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % 1_000_000), 1000);
    return () => window.clearInterval(id);
  }, []);

  void tick;
  const nowMs = Date.now() + serverOffsetMs;
  const msLeft = mode === 'daily' ? msUntilNextKarachiDay(nowMs) : msUntilNextKarachiMonday(nowMs);
  return (
    <span className="rw-timer">
      <Calendar size={12} />
      <span>
        {mode === 'daily' ? 'Resets in ' : 'Monday Reset '}
        {formatCountdownShort(msLeft)}
      </span>
    </span>
  );
});

export interface RewardsDashboardProps {
  state: GameState;
  dayKey: string;
  weekKey: string;
  rankPosition: number;
  serverOffsetMs?: number;
  onClaimDailySlot?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimWeeklyMilestone?: (milestoneId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimQuest: (questId: string, rewardGems: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimWeekly?: (missionId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimAchievement?: (achievementId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimMilestone: (milestoneId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const RewardsDashboard = memo(function RewardsDashboard({
  state,
  dayKey,
  weekKey,
  rankPosition,
  serverOffsetMs = 0,
  onClaimDailySlot,
  onClaimWeeklyMilestone,
  onClaimQuest,
  onClaimWeekly,
  onClaimAchievement,
  onClaimMilestone,
}: RewardsDashboardProps) {
  const nowMs = (state.t || Date.now()) + serverOffsetMs;
  const dailyView = useMemo(() => getDailyRewardsView(state, nowMs), [state, nowMs]);
  const weeklyView = useMemo(
    () => getWeeklyRewardsView(state, nowMs, rankPosition),
    [state, nowMs, rankPosition],
  );

  const ids = useMemo(
    () => (state.questIds?.length === 3 && state.questDay === dayKey ? state.questIds : selectDailyQuestIds(dayKey)),
    [state.questIds, state.questDay, dayKey],
  );
  const weeklyIndices = useMemo(() => selectWeeklyMissionIds(weekKey), [weekKey]);
  const weeklyClaimed = state.weeklyDay === weekKey ? state.weeklyClaimed || {} : {};
  const unlockedAchCount = useMemo(
    () => ACHIEVEMENTS.filter((a) => !!state.achievements?.[a.id]).length,
    [state.achievements],
  );

  const questHistory = Array.isArray(state.qHist) ? state.qHist : [];

  return (
    <div className="rw-dash" data-testid="rewards-dashboard">
      {/* SECTION 1: DAILY REWARDS (STRICTLY 5 SLOTS) */}
      <section className="rw-section" aria-label="Daily Rewards" data-testid="daily-rewards-section">
        <div className="rw-sec-hdr">
          <h3>
            <Gift size={17} color="#3fe0b0" />
            <span>Daily Rewards (5-Day Cycle)</span>
          </h3>
          <KarachiCountdown mode="daily" serverOffsetMs={serverOffsetMs} />
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

      {/* SECTION 2: WEEKLY REWARDS (STRICTLY 5 MILESTONES, INDEPENDENT OF DAILY) */}
      <section className="rw-section" aria-label="Weekly Rewards" data-testid="weekly-rewards-section">
        <div className="rw-sec-hdr">
          <h3>
            <Sparkles size={17} color="#5ccbff" />
            <span>Weekly Rewards ({weeklyView.claimedCount}/5 Claimed)</span>
          </h3>
          <KarachiCountdown mode="weekly" serverOffsetMs={serverOffsetMs} />
        </div>

        <div className="rw-weekly-grid">
          {weeklyView.items.map((item) => {
            const isClaimed = item.status === 'claimed';
            const isAvail = item.status === 'available';
            return (
              <div
                key={item.id}
                className="row"
                style={{ '--c': isClaimed ? '#3fe0b0' : isAvail ? '#5ccbff' : '#a58cff' } as React.CSSProperties}
                data-testid={`weekly-milestone-${item.id}`}
              >
                <div className="em" style={{ fontSize: 20 }}>
                  {isClaimed ? <CheckCircle2 size={22} color="#3fe0b0" /> : <span aria-hidden="true">{item.icon}</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2>
                    <span>{item.title}</span>
                    <span className="lv" style={{ color: 'var(--cy)', borderColor: 'rgba(92,203,255,0.4)' }}>
                      +{item.diamonds} <GemDiamondIcon size={11} />
                    </span>
                    <span className="lv">
                      +₨ {formatNumber(item.coins)} <CashCoinIcon size={11} />
                    </span>
                  </h2>
                  <p>
                    {item.desc} ({formatNumber(Math.floor(item.progress))} / {formatNumber(item.goal)})
                  </p>
                  <div className="bar" style={{ marginTop: 6 }}>
                    <i style={{ width: `${item.pct}%`, '--c': isClaimed ? '#3fe0b0' : '#5ccbff' } as React.CSSProperties} />
                  </div>
                </div>
                {isClaimed ? (
                  <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>
                    Claimed
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`btn sm ${isAvail ? 'gold' : 'no'}`}
                    disabled={!isAvail || !onClaimWeeklyMilestone}
                    onClick={(e) => onClaimWeeklyMilestone?.(item.id, e)}
                  >
                    {isAvail ? 'Claim' : `${item.pct}%`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {weeklyView.history.length > 0 && (
          <div className="rw-hist">
            <span className="rw-hist-title">Recent Weekly Milestone Claims</span>
            {weeklyView.history.slice(0, 4).map((h, i) => (
              <div key={`${h.day}-${h.label}-${i}`} className="rw-hist-row">
                <span>
                  <b>{h.label}</b> · {h.day}
                </span>
                <span style={{ color: 'var(--cy)' }}>
                  +₨ {formatNumber(h.coins)} · +{h.diamonds} Diamonds
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: DAILY QUESTS, WEEKLY STRATEGIC MISSIONS, ACHIEVEMENTS & MILESTONES */}
      <section className="rw-section" aria-label="Quests and Milestones">
        <div className="rw-sec-hdr">
          <h3>
            <Target size={17} color="#ffc23d" />
            <span>Daily Quests ({dayKey})</span>
          </h3>
          <span className="dim" style={{ fontSize: 11.5 }}>
            Earn both Coins &amp; Diamonds
          </span>
        </div>

        <div className="list">
          {ids.map((idx) => {
            const q = QUEST_POOL[idx] || QUEST_POOL[0];
            const cur = q.f(state, { rank: rankPosition });
            const pct = Math.max(0, Math.min(100, (cur / q.g) * 100));
            const isClaimed = !!state.claimed?.[q.id];
            const isReady = !isClaimed && cur >= q.g;
            const coinReward = getQuestCoinReward(q);

            return (
              <div key={q.id} className="row" style={{ '--c': isClaimed ? '#3fe0b0' : '#ffc23d' } as React.CSSProperties}>
                <div className="em">
                  {isClaimed ? <CheckCircle2 size={22} color="#3fe0b0" /> : <Target size={22} color="#ffc23d" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2>
                    <span>{q.t}</span>
                    <span className="lv" style={{ color: 'var(--cy)', borderColor: 'rgba(92,203,255,0.4)' }}>
                      +{q.r} <GemDiamondIcon size={11} />
                    </span>
                    <span className="lv">
                      +₨ {formatNumber(coinReward)} <CashCoinIcon size={11} />
                    </span>
                  </h2>
                  <p>
                    {Math.min(Math.floor(cur), q.g).toLocaleString('en-US')} / {q.g.toLocaleString('en-US')}
                  </p>
                  <div className="bar" style={{ marginTop: 6 }}>
                    <i style={{ width: `${pct}%`, '--c': isClaimed ? '#3fe0b0' : '#ffc23d' } as React.CSSProperties} />
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
                    disabled={!isReady}
                    onClick={(e) => onClaimQuest(q.id, q.r, e)}
                  >
                    {isReady ? 'Claim Reward' : `${Math.floor(pct)}%`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {questHistory.length > 0 && (
          <div className="rw-hist">
            <span className="rw-hist-title">Quest Claim History</span>
            {questHistory.slice(0, 4).map((h, i) => (
              <div key={`${h.day}-${h.label}-${i}`} className="rw-hist-row">
                <span>
                  <b>{h.label}</b> · {h.day}
                </span>
                <span style={{ color: 'var(--gold)' }}>
                  +₨ {formatNumber(h.coins)} · +{h.diamonds} Diamonds
                </span>
              </div>
            ))}
          </div>
        )}

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
