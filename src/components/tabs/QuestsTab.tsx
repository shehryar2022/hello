import React, { memo, useMemo } from 'react';
import { MILESTONES, QUEST_POOL, selectDailyQuestIds } from '../../game/rules';
import type { GameState } from '../../game/types';
import { CheckCircle2, GemDiamondIcon, Target, Trophy } from '../GameIcons';

interface QuestsTabProps {
  state: GameState;
  dayKey: string;
  rankPosition: number;
  onClaimQuest: (questId: string, rewardGems: number, e: React.MouseEvent<HTMLButtonElement>) => void;
  onClaimMilestone: (milestoneId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const QuestsTab: React.FC<QuestsTabProps> = memo(({
  state,
  dayKey,
  rankPosition,
  onClaimQuest,
  onClaimMilestone,
}) => {
  const ids = useMemo(
    () => (state.questIds?.length === 3 && state.questDay === dayKey ? state.questIds : selectDailyQuestIds(dayKey)),
    [state.questIds, state.questDay, dayKey],
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
});
