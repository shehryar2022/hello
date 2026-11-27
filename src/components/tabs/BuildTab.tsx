import React, { memo, useMemo, useState } from 'react';
import { BUILDING_CATEGORIES, BUILDINGS, GX_LEVEL_MULTS, MAX_CONSTRUCTION_QUEUE } from '../../game/constants';
import {
  bulkBuildingCost,
  canStartBuildingConstruction,
  formatNumber,
  getBuildSpeedMultiplier,
  getConstructionQueue,
  getDevelopmentDiscount,
  getRecommendedBuildings,
  totalBuildings,
} from '../../game/rules';
import type { BuildingCategory, GameState } from '../../game/types';
import {
  Briefcase,
  BuildingIcon,
  CashCoinIcon,
  Clock,
  Lock,
  Smile,
  Sparkles,
  Zap,
} from '../GameIcons';

interface BuildTabProps {
  state: GameState;
  serverOffsetMs?: number;
  onBuyBuilding: (id: string, qty: 1 | 5, e: React.MouseEvent<HTMLButtonElement>) => void;
}

function formatBuildSec(sec: number): string {
  if (sec <= 0) return 'Instant';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export const BuildTab: React.FC<BuildTabProps> = memo(({ state, serverOffsetMs = 0, onBuyBuilding }) => {
  const [cat, setCat] = useState<'all' | BuildingCategory>('all');
  const [qty, setQty] = useState<1 | 5>(1);
  const nowSrv = (state.t || Date.now()) + serverOffsetMs;
  const disc = useMemo(() => getDevelopmentDiscount(state, nowSrv), [state, nowSrv]);
  const speedMult = useMemo(() => getBuildSpeedMultiplier(state, nowSrv), [state, nowSrv]);
  const queue = useMemo(() => getConstructionQueue(state, nowSrv), [state, nowSrv]);
  const recMap = useMemo(() => getRecommendedBuildings(state, qty, nowSrv), [state, qty, nowSrv]);
  const ownedTotal = useMemo(() => totalBuildings(state), [state]);

  const visibleBuildings = useMemo(
    () => (cat === 'all' ? BUILDINGS : BUILDINGS.filter((b) => b.cat === cat)),
    [cat],
  );

  return (
    <div>
      {(disc > 0 || speedMult !== 1) && (
        <div className="tradelim">
          <span>
            <Sparkles size={14} color="#3fe0b0" />
            National Construction Modifiers
          </span>
          <b className="ok">
            {disc > 0 ? `−${Math.round(disc * 100)}% build cost` : ''}
            {disc > 0 && speedMult !== 1 ? ' · ' : ''}
            {speedMult !== 1 ? `×${speedMult.toFixed(2)} build speed` : ''}
          </b>
        </div>
      )}

      {queue.length > 0 && (
        <div className="cqueue" data-testid="construction-queue">
          <div className="cqueue-hdr">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} color="#5ccbff" />
              Active Construction Queue
            </span>
            <span className="dim">
              {queue.length} / {MAX_CONSTRUCTION_QUEUE} slots
            </span>
          </div>
          <div className="cqueue-grid">
            {queue.map((slot) => {
              const def = BUILDINGS.find((b) => b.id === slot.buildingId);
              if (!def) return null;
              const leftSec = Math.max(0, Math.ceil((slot.finishAt - nowSrv) / 1000));
              const pct = Math.max(5, Math.min(100, Math.round(((slot.totalSec - leftSec) / slot.totalSec) * 100)));
              return (
                <div key={slot.buildingId} className="cqueue-item">
                  <div className="cqueue-top">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <BuildingIcon id={def.id} size={15} />
                      <span>
                        {def.n} {slot.qty > 1 ? `×${slot.qty}` : ''}
                      </span>
                    </span>
                    <b style={{ color: 'var(--cy)' }}>{leftSec > 0 ? `${leftSec}s left` : 'Finishing…'}</b>
                  </div>
                  <div className="cqueue-bar">
                    <b style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="filterbar">
        <div className="fchips" role="group" aria-label="Filter buildings by category">
          {BUILDING_CATEGORIES.map((c) => (
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
          const check = canStartBuildingConstruction(state, d.id, qty, nowSrv);
          const displayCost = check.cost > 0 ? check.cost : bulkBuildingCost(d, count, qty, disc);
          const upgLvl = state.gx?.lvl?.[d.id] || 1;
          const upgMult = GX_LEVEL_MULTS[upgLvl - 1] || 1;
          const recReason = recMap[d.id];
          const inQueue = queue.find((q) => q.buildingId === d.id);
          const rankLocked = (state.rank || 1) < d.reqRank;
          const bldgLocked = (d.reqBuildings || 0) > ownedTotal;
          const isLocked = rankLocked || bldgLocked;

          const rate = d.inc * upgMult;
          const rateLabel = rate >= 1000 ? formatNumber(rate) : rate >= 100 ? Math.round(rate) : rate.toFixed(2);
          const durLabel = check.durationSec > 0 ? formatBuildSec(check.durationSec) : formatBuildSec(Math.ceil(d.buildSec / speedMult));

          return (
            <div
              key={d.id}
              className={`row${recReason && !isLocked ? ' rec-card' : ''}`}
              style={{ '--c': d.c } as React.CSSProperties}
            >
              <div className="em">
                {isLocked ? <Lock size={20} color="#b4abd9" /> : <BuildingIcon id={d.id} size={23} />}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2>
                  <span>{d.n}</span>
                  <span className="lv">Lv {count}</span>
                  {recReason && !isLocked && (
                    <span className="rec-badge">
                      <Sparkles size={10} />
                      <span>{recReason}</span>
                    </span>
                  )}
                </h2>
                <p>
                  {d.d} · +{rateLabel}/s each{upgLvl > 1 ? ` (×${upgMult})` : ''}
                </p>
                <div className="bmeta">
                  <span>
                    <Clock size={11} />
                    {inQueue ? `Building (${Math.max(0, Math.ceil((inQueue.finishAt - nowSrv) / 1000))}s)` : durLabel}
                  </span>
                  <span>
                    <Briefcase size={11} />
                    +{d.jobs} jobs
                  </span>
                  <span style={{ color: d.energy >= 0 ? 'var(--mint)' : 'var(--mu)' }}>
                    <Zap size={11} />
                    {d.energy >= 0 ? `+${d.energy}` : d.energy} MW
                  </span>
                  <span>Maint ₨ {d.maint}/s</span>
                  {d.hapDelta !== 0 && (
                    <span style={{ color: d.hapDelta > 0 ? 'var(--mint)' : 'var(--pink)' }}>
                      <Smile size={11} />
                      {d.hapDelta > 0 ? `+${d.hapDelta}` : d.hapDelta} hap
                    </span>
                  )}
                  {isLocked && (
                    <span style={{ color: 'var(--pink)', fontWeight: 700 }}>
                      {rankLocked ? `Req Rank ${d.reqRank}` : `Req ${d.reqBuildings} bldgs (${ownedTotal}/${d.reqBuildings})`}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className={`btn sm ${check.ok ? 'mint' : 'no'}`}
                disabled={!check.ok}
                title={check.reason}
                onClick={(e) => onBuyBuilding(d.id, qty, e)}
              >
                {inQueue ? (
                  <span>Queued</span>
                ) : isLocked ? (
                  <span>Locked</span>
                ) : (
                  <>
                    <CashCoinIcon size={15} />
                    <span>{qty > 1 ? `×${qty} ` : ''}₨ {formatNumber(displayCost)}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prev, next) => {
  if (
    prev.serverOffsetMs !== next.serverOffsetMs ||
    prev.onBuyBuilding !== next.onBuyBuilding ||
    prev.state.cash !== next.state.cash ||
    prev.state.rank !== next.state.rank
  ) {
    return false;
  }
  const pNow = (prev.state.t || 0) + (prev.serverOffsetMs || 0);
  const nNow = (next.state.t || 0) + (next.serverOffsetMs || 0);
  const pSubActive = !!(prev.state.sub?.tier && (prev.state.sub?.exp || 0) > pNow);
  const nSubActive = !!(next.state.sub?.tier && (next.state.sub?.exp || 0) > nNow);
  if (pSubActive !== nSubActive || prev.state.sub?.tier !== next.state.sub?.tier) return false;
  if ((prev.state.hap < 55) !== (next.state.hap < 55)) return false;

  const pB = prev.state.b;
  const nB = next.state.b;
  if (pB !== nB) {
    for (const d of BUILDINGS) {
      if ((pB[d.id] || 0) !== (nB[d.id] || 0)) return false;
    }
  }
  const pL = prev.state.gx?.lvl;
  const nL = next.state.gx?.lvl;
  if (pL !== nL) {
    for (const d of BUILDINGS) {
      if ((pL?.[d.id] || 1) !== (nL?.[d.id] || 1)) return false;
    }
  }
  if (prev.state.tech !== next.state.tech) return false;
  if ((prev.state.boosterCd?.ba_build_speed_boost || 0) !== (next.state.boosterCd?.ba_build_speed_boost || 0)) {
    return false;
  }
  if (prev.state.milestones !== next.state.milestones) return false;
  const pQ = getConstructionQueue(prev.state, pNow);
  const nQ = getConstructionQueue(next.state, nNow);
  if (pQ.length !== nQ.length) return false;
  if (pQ.length > 0 && Math.floor(pNow / 1000) !== Math.floor(nNow / 1000)) return false;
  return true;
});
