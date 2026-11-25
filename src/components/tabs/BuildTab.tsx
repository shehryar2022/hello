import React, { memo, useMemo, useState } from 'react';
import { BUILDINGS, GX_LEVEL_MULTS } from '../../game/constants';
import {
  bulkBuildingCost,
  formatNumber,
  getDevelopmentDiscount,
  getRecommendedBuildings,
} from '../../game/rules';
import type { BuildingCategory, GameState } from '../../game/types';
import { BuildingIcon, CashCoinIcon, Sparkles } from '../GameIcons';

interface BuildTabProps {
  state: GameState;
  serverOffsetMs?: number;
  onBuyBuilding: (id: string, qty: 1 | 5, e: React.MouseEvent<HTMLButtonElement>) => void;
}

const CATEGORIES: Array<{ id: 'all' | BuildingCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'industry', label: 'Industry' },
  { id: 'civic', label: 'Civic & Clean' },
  { id: 'tech', label: 'Tech & Finance' },
];

export const BuildTab: React.FC<BuildTabProps> = memo(({ state, serverOffsetMs = 0, onBuyBuilding }) => {
  const [cat, setCat] = useState<'all' | BuildingCategory>('all');
  const [qty, setQty] = useState<1 | 5>(1);
  const nowSrv = (state.t || Date.now()) + serverOffsetMs;
  const disc = useMemo(() => getDevelopmentDiscount(state, nowSrv), [state, nowSrv]);
  const recMap = useMemo(() => getRecommendedBuildings(state, qty, nowSrv), [state, qty, nowSrv]);

  const visibleBuildings = useMemo(
    () => (cat === 'all' ? BUILDINGS : BUILDINGS.filter((b) => b.cat === cat)),
    [cat],
  );

  return (
    <div>
      {disc > 0 && (
        <div className="tradelim">
          <span>
            <Sparkles size={14} color="#3fe0b0" />
            Subscription Development Discount
          </span>
          <b className="ok">−{Math.round(disc * 100)}% build cost</b>
        </div>
      )}

      <div className="filterbar">
        <div className="fchips" role="group" aria-label="Filter buildings by category">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`fchip ${cat === c.id ? 'on' : ''}`}
              onClick={() => setCat(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="qty-toggle" role="group" aria-label="Build quantity">
          <button
            type="button"
            className={qty === 1 ? 'on' : ''}
            onClick={() => setQty(1)}
          >
            ×1
          </button>
          <button
            type="button"
            className={qty === 5 ? 'on' : ''}
            onClick={() => setQty(5)}
          >
            ×5
          </button>
        </div>
      </div>

      <div className="list g2">
        {visibleBuildings.map((d) => {
          const count = state.b[d.id] || 0;
          const c = bulkBuildingCost(d, count, qty, disc);
          const upgLvl = state.gx?.lvl?.[d.id] || 1;
          const upgMult = GX_LEVEL_MULTS[upgLvl - 1] || 1;
          const canAfford = state.cash >= c;
          const recReason = recMap[d.id];

          return (
            <div
              key={d.id}
              className={`row${recReason ? ' rec-card' : ''}`}
              style={{ '--c': d.c } as React.CSSProperties}
            >
              <div className="em">
                <BuildingIcon id={d.id} size={23} />
              </div>
              <div>
                <h2>
                  {d.n}
                  <span className="lv">Lv {count}</span>
                  {recReason && (
                    <span className="rec-badge">
                      <Sparkles size={10} />
                      <span>Recommended · {recReason}</span>
                    </span>
                  )}
                </h2>
                <p>
                  {d.d} · +{(() => {
                    const rate = d.inc * upgMult;
                    return rate >= 1000 ? formatNumber(rate) : rate >= 100 ? Math.round(rate) : rate.toFixed(2);
                  })()}/s each{upgLvl > 1 ? ` (×${upgMult})` : ''}
                </p>
              </div>
              <button
                type="button"
                className={`btn sm ${canAfford ? 'mint' : 'no'}`}
                disabled={!canAfford}
                onClick={(e) => onBuyBuilding(d.id, qty, e)}
              >
                <CashCoinIcon size={15} />
                <span>{qty > 1 ? `×${qty} ` : ''}₨ {formatNumber(c)}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
});
