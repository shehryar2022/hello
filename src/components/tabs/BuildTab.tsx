import React from 'react';
import { BUILDINGS, GX_LEVEL_MULTS } from '../../game/constants';
import { buildingCost, formatNumber, getDevelopmentDiscount } from '../../game/rules';
import type { GameState } from '../../game/types';

interface BuildTabProps {
  state: GameState;
  serverOffsetMs?: number;
  onBuyBuilding: (id: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const BuildTab: React.FC<BuildTabProps> = ({ state, serverOffsetMs = 0, onBuyBuilding }) => {
  const nowSrv = Date.now() + serverOffsetMs;
  const disc = getDevelopmentDiscount(state, nowSrv);

  return (
    <div>
      {disc > 0 && (
        <div className="tradelim">
          <span>💳 Subscription Development Discount</span>
          <b className="ok">−{Math.round(disc * 100)}% build cost</b>
        </div>
      )}
      <div className="list g2">
        {BUILDINGS.map((d) => {
          const count = state.b[d.id] || 0;
          const c = buildingCost(d, count, disc);
          const upgLvl = state.gx?.lvl?.[d.id] || 1;
          const upgMult = GX_LEVEL_MULTS[upgLvl - 1] || 1;
          const canAfford = state.cash >= c;

          return (
            <div key={d.id} className="row" style={{ '--c': d.c } as React.CSSProperties}>
              <div className="em">{d.e}</div>
              <div>
                <h2>
                  {d.n}
                  <span className="lv">Lv {count}</span>
                </h2>
                <p>
                  {d.d} · +{(d.inc * upgMult).toFixed(2)}/s each{upgLvl > 1 ? ` (×${upgMult})` : ''}
                </p>
              </div>
              <button
                type="button"
                className={`btn sm ${canAfford ? 'mint' : 'no'}`}
                disabled={!canAfford}
                onClick={(e) => onBuyBuilding(d.id, e)}
              >
                💵 ₨ {formatNumber(c)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
