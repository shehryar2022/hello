import React, { memo, useMemo } from 'react';
import { ACHIEVEMENTS, WEEKLY_MISSIONS } from '../../game/constants';
import {
  formatNumber,
  MILESTONES,
  QUEST_POOL,
  selectDailyQuestIds,
  selectWeeklyMissionIds,
} from '../../game/rules';
import type { GameState } from '../../game/types';
import { Award, CashCoinIcon, CheckCircle2, GemDiamondIcon, Sparkles, Target, Trophy } from '../GameIcons';

interface QuestsTabProps {
  state: GameState;
  dayKey: string;
  weekKey: string;
  rankPosition: number;
  onClaimQuest: (questId: string, rewardGems: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimWeekly?: (missionId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimAchievement?: (achievementId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimMilestone: (milestoneId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const QuestsTab: React.FC<QuestsTabProps> = memo(({
  state,
  dayKey,
  weekKey,
  rankPosition,
  onClaimQuest,
  onClaimWeekly,
  onClaimAchievement,
  onClaimMilestone,
}) => {
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

  return (
    <div className="list">
      <div className="tradelim">
        <span>Daily rotating objectives</span>
        <b>{dayKey}</b>
      </div>

      {ids.map((idx) => {
        const q = QUEST_POOL[idx] || QUEST_POOL[0];
        const cur = q.f(state, { rank: rankPosition });
        const pct = Math.max(0, Math.min(100, (cur / q.g) * 100));
        const isClaimed = !!state.claimed?.[q.id];
        const isReady = !isClaimed && cur >= q.g;

        return (
          <div key={q.id} className="row" style={{ '--c': isClaimed ? '#3fe0b0' : '#ffc23d' } as React.CSSProperties}>
            <div className="em">
              {isClaimed ? <CheckCircle2 size={22} color="#3fe0b0" /> : <Target size={22} color="#ffc23d" />}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2>
                {q.t}
                <span className="lv">
                  +{q.r} <GemDiamondIcon size={12} />
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
                {isReady ? (
                  <>
                    <span>Claim +{q.r}</span>
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

      <div className="tradelim" style={{ marginTop: 8 }}>
        <span>
          <Sparkles size={14} color="#5ccbff" /> Weekly Strategic Missions
        </span>
        <b>{weekKey}</b>
      </div>

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
                {w.t}
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

      <div className="gxh" style={{ marginTop: 8 }}>
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

      <div className="gxh" style={{ marginTop: 8 }}>
        <Trophy size={15} color="#ffc23d" />
        <span>National Milestones</span>
      </div>

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
                {m.t}
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
  );
}, (prev, next) => {
  if (
    prev.dayKey !== next.dayKey ||
    prev.weekKey !== next.weekKey ||
    prev.rankPosition !== next.rankPosition ||
    prev.onClaimQuest !== next.onClaimQuest ||
    prev.onClaimWeekly !== next.onClaimWeekly ||
    prev.onClaimAchievement !== next.onClaimAchievement ||
    prev.onClaimMilestone !== next.onClaimMilestone
  ) {
    return false;
  }
  const p = prev.state;
  const n = next.state;
  return (
    p.questDay === n.questDay &&
    p.questIds === n.questIds &&
    p.claimed === n.claimed &&
    p.weeklyDay === n.weeklyDay &&
    p.weeklyClaimed === n.weeklyClaimed &&
    p.achievements === n.achievements &&
    p.milestones === n.milestones &&
    p.cash === n.cash &&
    p.gems === n.gems &&
    p.streak === n.streak &&
    p.fused === n.fused &&
    p.rank === n.rank &&
    p.gov === n.gov &&
    Math.floor(p.hap) === Math.floor(n.hap) &&
    Math.floor(p.appr) === Math.floor(n.appr) &&
    Math.floor(p.pop) === Math.floor(n.pop) &&
    (p.boost > 0) === (n.boost > 0) &&
    p.tax === n.tax &&
    p.wel === n.wel &&
    p.edu === n.edu &&
    p.fuel === n.fuel &&
    p.carbon === n.carbon &&
    p.luxury === n.luxury &&
    p.corp === n.corp &&
    p.gst === n.gst &&
    p.prop === n.prop &&
    p.duty === n.duty &&
    p.tourism === n.tourism &&
    p.digital === n.digital &&
    p.wealth === n.wealth &&
    p.rd === n.rd &&
    p.green === n.green &&
    p.transitSub === n.transitSub &&
    p.b === n.b &&
    p.bPolicies === n.bPolicies &&
    p.stk === n.stk &&
    p.tech === n.tech &&
    p.gx?.lvl === n.gx?.lvl &&
    p.gx?.blk === n.gx?.blk &&
    p.gx?.pb === n.gx?.pb &&
    p.activeFx === n.activeFx &&
    p.sub === n.sub
  );
});
