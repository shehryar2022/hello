import React from 'react';
import { QUEST_POOL, selectDailyQuestIds } from '../../game/rules';
import type { GameState } from '../../game/types';

interface QuestsTabProps {
  state: GameState;
  dayKey: string;
  rankPosition: number;
  onClaimQuest: (questId: string, rewardGems: number, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const QuestsTab: React.FC<QuestsTabProps> = ({
  state,
  dayKey,
  rankPosition,
  onClaimQuest,
}) => {
  const ids = state.questIds?.length === 3 && state.questDay === dayKey
    ? state.questIds
    : selectDailyQuestIds(dayKey);

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
          <div key={q.id} className="row" style={{ '--c': '#ffc93c' } as React.CSSProperties}>
            <div className="em">{isClaimed ? '✅' : '📌'}</div>
            <div style={{ minWidth: 0 }}>
              <h2>
                {q.t}
                <span className="lv">+{q.r} 💎</span>
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
                {isReady ? `Claim +${q.r} 💎` : `${Math.floor(pct)}%`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
