import React, { memo, useMemo, useState } from 'react';
import {
  BUILDING_CATEGORIES,
  BUILDINGS,
  MAX_BUILDING_LEVEL,
  MAX_CONSTRUCTION_QUEUE,
  MAX_UPGRADE_QUEUE,
  TECH_TREE,
  getBuildingLevelMultiplier,
} from '../../game/constants';
import {
  bulkBuildingCost,
  canDemolishBuilding,
  canStartBuildingConstruction,
  canStartBuildingUpgrade,
  formatNumber,
  getActiveBuildingPolicyId,
  getBuildingPolicyDef,
  getBuildingUpgradeQuote,
  getBuildingUpgradeTier,
  getBuildSpeedMultiplier,
  getConstructionQueue,
  getDemolishRefund,
  getDevelopmentDiscount,
  getRecommendedBuildings,
  getUpgradeQueue,
  hasTech,
  totalBuildings,
} from '../../game/rules';
import type { BuildingCategory, GameState } from '../../game/types';
import {
  Briefcase,
  BuildingIcon,
  CashCoinIcon,
  Clock,
  Compass,
  Eye,
  Lock,
  Search,
  Smile,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from '../GameIcons';

interface BuildTabProps {
  state: GameState;
  serverOffsetMs?: number;
  onBuyBuilding: (id: string, qty: 1 | 5, e: React.MouseEvent<HTMLButtonElement>) => void;
  onUpgradeBuilding?: (id: string) => void;
  onDemolishBuilding?: (id: string, qty: 1 | 5) => void;
  onFocusBuilding?: (id: string) => void;
}

function formatBuildSec(sec: number): string {
  if (sec <= 0) return 'Instant';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

function formatRate(val: number): string {
  if (Math.abs(val) >= 1000) return formatNumber(val);
  if (Math.abs(val) >= 100) return String(Math.round(val));
  return val.toFixed(2);
}

export const BuildTab: React.FC<BuildTabProps> = memo(({
  state,
  serverOffsetMs = 0,
  onBuyBuilding,
  onUpgradeBuilding,
  onDemolishBuilding,
  onFocusBuilding,
}) => {
  const [cat, setCat] = useState<'all' | BuildingCategory>('all');
  const [qty, setQty] = useState<1 | 5>(1);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'cost' | 'roi'>('default');
  const [confirmDemoId, setConfirmDemoId] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  const nowSrv = (state.t || Date.now()) + serverOffsetMs;
  const disc = useMemo(() => getDevelopmentDiscount(state, nowSrv), [state, nowSrv]);
  const speedMult = useMemo(() => getBuildSpeedMultiplier(state, nowSrv), [state, nowSrv]);
  const queue = useMemo(() => getConstructionQueue(state, nowSrv), [state, nowSrv]);
  const upgQueue = useMemo(() => getUpgradeQueue(state), [state]);
  const recMap = useMemo(() => getRecommendedBuildings(state, qty, nowSrv), [state, qty, nowSrv]);
  const ownedTotal = useMemo(() => totalBuildings(state), [state]);

  const visibleBuildings = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = BUILDINGS.filter((b) => {
      if (cat !== 'all' && b.cat !== cat) return false;
      if (q && !b.n.toLowerCase().includes(q) && !b.d.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sortBy === 'cost') {
      return [...list].sort(
        (a, b) =>
          bulkBuildingCost(a, state.b[a.id] || 0, qty, disc) -
          bulkBuildingCost(b, state.b[b.id] || 0, qty, disc),
      );
    }
    if (sortBy === 'roi') {
      return [...list].sort((a, b) => {
        const roiA = (a.inc * getBuildingLevelMultiplier(state.gx?.lvl?.[a.id] || 1)) /
          Math.max(1, bulkBuildingCost(a, state.b[a.id] || 0, qty, disc));
        const roiB = (b.inc * getBuildingLevelMultiplier(state.gx?.lvl?.[b.id] || 1)) /
          Math.max(1, bulkBuildingCost(b, state.b[b.id] || 0, qty, disc));
        return roiB - roiA;
      });
    }
    return list;
  }, [cat, searchText, sortBy, state.b, state.gx?.lvl, qty, disc]);

  const inspectedQuote = useMemo(
    () => (inspectId ? getBuildingUpgradeQuote(state, inspectId, nowSrv) : null),
    [inspectId, state, nowSrv],
  );
  const inspectedCheck = useMemo(
    () => (inspectId ? canStartBuildingUpgrade(state, inspectId, nowSrv) : null),
    [inspectId, state, nowSrv],
  );
  const inspectedHistory = useMemo(() => {
    if (!inspectId) return [];
    return (state.upgHist || []).filter((h) => h.buildingId === inspectId).slice(0, 12);
  }, [inspectId, state.upgHist]);

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
            {speedMult !== 1 ? `×${speedMult.toFixed(2)} build & upgrade speed` : ''}
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

      {upgQueue.length > 0 && (
        <div className="cqueue" data-testid="upgrade-queue" style={{ borderColor: 'rgba(63, 224, 176, 0.38)' }}>
          <div className="cqueue-hdr">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={14} color="#3fe0b0" />
              Active Building Upgrades (Lv 1–{MAX_BUILDING_LEVEL})
            </span>
            <span className="dim">
              {upgQueue.length} / {MAX_UPGRADE_QUEUE} slots
            </span>
          </div>
          <div className="cqueue-grid">
            {upgQueue.map((slot) => {
              const def = BUILDINGS.find((b) => b.id === slot.buildingId);
              if (!def) return null;
              const leftSec = Math.max(0, Math.ceil((slot.finishAt - nowSrv) / 1000));
              const pct = Math.max(
                5,
                Math.min(100, Math.round(((slot.totalSec - leftSec) / Math.max(1, slot.totalSec)) * 100)),
              );
              return (
                <div key={slot.buildingId} className="cqueue-item">
                  <div className="cqueue-top">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                      <BuildingIcon id={def.id} size={15} />
                      <span>
                        {def.n} · Lv {slot.fromLevel} → Lv {slot.toLevel}
                      </span>
                    </span>
                    <b style={{ color: 'var(--mint)' }}>{leftSec > 0 ? `${leftSec}s left` : 'Completing…'}</b>
                  </div>
                  <div className="cqueue-bar">
                    <b style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3fe0b0, #5ccbff)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {inspectedQuote && (
        <div
          className="gxc"
          data-testid="building-upgrade-panel"
          style={{
            marginBottom: 14,
            border: `1.5px solid ${inspectedQuote.def.c}88`,
            background: 'linear-gradient(155deg, rgba(28, 22, 62, 0.96), rgba(17, 13, 40, 0.98))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: 'grid',
                  placeItems: 'center',
                  background: `${inspectedQuote.def.c}24`,
                  border: `1px solid ${inspectedQuote.def.c}66`,
                  color: inspectedQuote.def.c,
                  flexShrink: 0,
                }}
              >
                <BuildingIcon id={inspectedQuote.def.id} size={22} color={inspectedQuote.def.c} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 15 }}>{inspectedQuote.def.n}</b>
                  <span className="lv">
                    Owned {inspectedQuote.count} · Lv {inspectedQuote.curLevel} / {MAX_BUILDING_LEVEL}
                  </span>
                  <span
                    className="rec-badge"
                    style={{ borderColor: 'rgba(92,203,255,0.45)', background: 'rgba(92,203,255,0.12)', color: '#9ee7ff' }}
                  >
                    Tier {getBuildingUpgradeTier(inspectedQuote.curLevel).tier} · {getBuildingUpgradeTier(inspectedQuote.curLevel).label}
                  </span>
                </div>
                <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>
                  {inspectedQuote.def.d}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="city3d-icon-btn"
              onClick={() => setInspectId(null)}
              aria-label="Close building details panel"
            >
              <X size={14} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div className="cqueue-item">
              <div className="dim" style={{ fontSize: 11 }}>Production / sec</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 2 }}>
                <span style={{ color: '#3fe0b0' }}>+{formatRate(inspectedQuote.curStats.incPerSec)}/s</span>
                {!inspectedQuote.isMax && (
                  <span style={{ color: '#8ee8ff', marginLeft: 6, fontSize: 12 }}>
                    → +{formatRate(inspectedQuote.nextStats.incPerSec)}/s
                  </span>
                )}
              </div>
            </div>
            <div className="cqueue-item">
              <div className="dim" style={{ fontSize: 11 }}>Maintenance / sec</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 2 }}>
                <span style={{ color: '#ff8ea8' }}>−₨ {formatRate(inspectedQuote.curStats.maintPerSec)}/s</span>
                {!inspectedQuote.isMax && (
                  <span style={{ color: '#ffb5c6', marginLeft: 6, fontSize: 12 }}>
                    → −₨ {formatRate(inspectedQuote.nextStats.maintPerSec)}/s
                  </span>
                )}
              </div>
            </div>
            <div className="cqueue-item">
              <div className="dim" style={{ fontSize: 11 }}>Employment</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 2 }}>
                <span>{formatNumber(inspectedQuote.curStats.jobs)} jobs</span>
                {!inspectedQuote.isMax && inspectedQuote.deltas.jobsDelta !== 0 && (
                  <span style={{ color: '#3fe0b0', marginLeft: 6, fontSize: 12 }}>
                    (+{formatNumber(inspectedQuote.deltas.jobsDelta)})
                  </span>
                )}
              </div>
            </div>
            <div className="cqueue-item">
              <div className="dim" style={{ fontSize: 11 }}>Grid Balance</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 2 }}>
                <span>{inspectedQuote.curStats.energy >= 0 ? `+${inspectedQuote.curStats.energy}` : inspectedQuote.curStats.energy} MW</span>
                {!inspectedQuote.isMax && inspectedQuote.deltas.energyDelta !== 0 && (
                  <span style={{ color: '#9ee7ff', marginLeft: 6, fontSize: 12 }}>
                    → {inspectedQuote.nextStats.energy >= 0 ? `+${inspectedQuote.nextStats.energy}` : inspectedQuote.nextStats.energy} MW
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div className="dim" style={{ fontSize: 12 }}>
              {inspectedQuote.isMax
                ? `Maximum Level ${MAX_BUILDING_LEVEL} reached!`
                : `Next: Lv ${inspectedQuote.nextLevel} (${inspectedQuote.tier.label}) · Duration ${formatBuildSec(inspectedQuote.durSec)}`}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {onFocusBuilding && (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => onFocusBuilding(inspectedQuote.def.id)}
                >
                  <Compass size={13} />
                  <span>View in 3D</span>
                </button>
              )}
              {onUpgradeBuilding && !inspectedQuote.isMax && (
                <button
                  type="button"
                  className={`btn sm ${inspectedCheck?.ok ? 'mint' : 'no'}`}
                  disabled={!inspectedCheck?.ok}
                  title={inspectedCheck?.reason || `Upgrade ${inspectedQuote.def.n} to Lv ${inspectedQuote.nextLevel}`}
                  onClick={() => onUpgradeBuilding(inspectedQuote.def.id)}
                >
                  <TrendingUp size={13} />
                  <span>
                    {inspectedCheck?.ok
                      ? `Upgrade to Lv ${inspectedQuote.nextLevel} · ₨ ${formatNumber(inspectedQuote.cost)}`
                      : inspectedCheck?.reason || `₨ ${formatNumber(inspectedQuote.cost)}`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {inspectedHistory.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="dim" style={{ fontSize: 11.5, marginBottom: 4 }}>Recent Upgrade History</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {inspectedHistory.map((h, idx) => (
                  <span
                    key={`${h.atMs}-${idx}`}
                    className="lv"
                    style={{ fontSize: 11 }}
                  >
                    Lv {h.fromLevel}→{h.toLevel} (₨ {formatNumber(h.cost)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="build-tools">
        <div className="build-search-wrap">
          <Search size={14} color="#a79fd0" />
          <input
            type="search"
            className="inp build-search-inp"
            placeholder={`Search all ${BUILDINGS.length} national buildings…`}
            aria-label="Search buildings"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <select
          className="inp build-sort-sel"
          aria-label="Sort buildings"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'default' | 'cost' | 'roi')}
        >
          <option value="default">Sort: Sector Order</option>
          <option value="cost">Sort: Lowest Cost</option>
          <option value="roi">Sort: Best ROI</option>
        </select>
        <div className="qty-toggle" role="group" aria-label="Build quantity">
          <button type="button" className={qty === 1 ? 'on' : ''} onClick={() => setQty(1)}>
            ×1
          </button>
          <button type="button" className={qty === 5 ? 'on' : ''} onClick={() => setQty(5)}>
            ×5
          </button>
        </div>
      </div>

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
      </div>

      {visibleBuildings.length === 0 ? (
        <div className="gxc" style={{ textAlign: 'center', padding: 18 }}>
          <p className="dim">No buildings match &ldquo;{searchText}&rdquo; in this sector.</p>
        </div>
      ) : (
        <div className="list g2">
          {visibleBuildings.map((d) => {
            const count = state.b[d.id] || 0;
            const check = canStartBuildingConstruction(state, d.id, qty, nowSrv);
            const displayCost = check.cost > 0 ? check.cost : bulkBuildingCost(d, count, qty, disc);
            const upgLvl = Math.max(1, Math.min(MAX_BUILDING_LEVEL, state.gx?.lvl?.[d.id] || 1));
            const upgMult = getBuildingLevelMultiplier(upgLvl);
            const polId = getActiveBuildingPolicyId(state, d.id);
            const polDef = getBuildingPolicyDef(polId);
            const recReason = recMap[d.id];
            const inQueue = queue.find((q) => q.buildingId === d.id);
            const upgSlot = upgQueue.find((u) => u.buildingId === d.id);
            const upgCheck = count > 0 ? canStartBuildingUpgrade(state, d.id, nowSrv) : null;
            const rankLocked = (state.rank || 1) < d.reqRank;
            const bldgLocked = (d.reqBuildings || 0) > ownedTotal;
            const techLocked = Boolean(d.reqTech && !hasTech(state, d.reqTech));
            const isLocked = rankLocked || bldgLocked || techLocked;
            const reqTechName = d.reqTech ? TECH_TREE.find((t) => t.id === d.reqTech)?.n || d.reqTech : '';
            const demoCheck = canDemolishBuilding(state, d.id, 1);
            const refund1 = getDemolishRefund(d, 1);

            const rate = d.inc * upgMult * polDef.incomeMult;
            const rateLabel = rate >= 1000 ? formatNumber(rate) : rate >= 100 ? Math.round(rate) : rate.toFixed(2);
            const durLabel = check.durationSec > 0 ? formatBuildSec(check.durationSec) : formatBuildSec(Math.ceil(d.buildSec / speedMult));

            return (
              <div
                key={d.id}
                className={`row build-card${recReason && !isLocked ? ' rec-card' : ''}`}
                style={{ '--c': d.c } as React.CSSProperties}
              >
                <div className="em">
                  {isLocked ? <Lock size={20} color="#b4abd9" /> : <BuildingIcon id={d.id} size={23} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2>
                    <span>{d.n}</span>
                    <span className="lv">
                      Owned {count} · Lv {upgLvl}/{MAX_BUILDING_LEVEL}
                    </span>
                    {polId !== 'standard' && (
                      <span className="rec-badge" style={{ borderColor: 'rgba(165, 140, 255, 0.45)', background: 'rgba(165, 140, 255, 0.16)', color: '#d7cbff' }}>
                        {polDef.name}
                      </span>
                    )}
                    {recReason && !isLocked && (
                      <span className="rec-badge">
                        <Sparkles size={10} />
                        <span>{recReason}</span>
                      </span>
                    )}
                  </h2>
                  <p>
                    {d.d} · +{rateLabel}/s each{upgLvl > 1 ? ` (×${upgMult.toFixed(2)})` : ''}
                  </p>
                  <div className="bmeta">
                    <span>
                      <Clock size={11} />
                      {inQueue
                        ? `Building (${Math.max(0, Math.ceil((inQueue.finishAt - nowSrv) / 1000))}s)`
                        : upgSlot
                          ? `Upgrading Lv${upgSlot.toLevel} (${Math.max(0, Math.ceil((upgSlot.finishAt - nowSrv) / 1000))}s)`
                          : durLabel}
                    </span>
                    <span>
                      <Briefcase size={11} />
                      +{Math.round(d.jobs * (1 + (upgLvl - 1) * 0.04) * polDef.jobsMult)} jobs
                    </span>
                    <span style={{ color: d.energy >= 0 ? 'var(--mint)' : 'var(--mu)' }}>
                      <Zap size={11} />
                      {d.energy >= 0 ? `+${d.energy}` : d.energy} MW
                    </span>
                    <span>Maint ₨ {(d.maint * (1 + Math.pow(upgLvl - 1, 0.85) * 0.14) * polDef.maintMult).toFixed(d.maint >= 10 ? 0 : 2)}/s</span>
                    {d.capacity && d.capacity > 0 && (
                      <span style={{ color: 'var(--cy)' }}>Cap +{d.capacity}</span>
                    )}
                    {d.hapDelta !== 0 && (
                      <span style={{ color: d.hapDelta > 0 ? 'var(--mint)' : 'var(--pink)' }}>
                        <Smile size={11} />
                        {d.hapDelta > 0 ? `+${d.hapDelta}` : d.hapDelta} hap
                      </span>
                    )}
                    {isLocked && (
                      <span style={{ color: 'var(--pink)', fontWeight: 700 }}>
                        {rankLocked
                          ? `Req Rank ${d.reqRank}`
                          : bldgLocked
                            ? `Req ${d.reqBuildings} bldgs (${ownedTotal}/${d.reqBuildings})`
                            : `Req ${reqTechName}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="build-card-acts">
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
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      className="city3d-icon-btn"
                      style={{
                        width: 28,
                        height: 26,
                        color: inspectId === d.id ? '#3fe0b0' : upgCheck?.ok ? '#7de8ff' : undefined,
                      }}
                      title={`Details & Lv 1–${MAX_BUILDING_LEVEL} Upgrade (${d.n})`}
                      aria-label={`Inspect and upgrade ${d.n}`}
                      onClick={() => setInspectId((cur) => (cur === d.id ? null : d.id))}
                    >
                      {count > 0 ? <TrendingUp size={12} /> : <Eye size={12} />}
                    </button>
                    {onFocusBuilding && (
                      <button
                        type="button"
                        className="city3d-icon-btn"
                        style={{ width: 28, height: 26 }}
                        title={`Focus ${d.n} in 3D City`}
                        aria-label={`Focus ${d.n} in 3D city`}
                        onClick={() => onFocusBuilding(d.id)}
                      >
                        <Compass size={12} />
                      </button>
                    )}
                    {onDemolishBuilding && demoCheck.ok && (
                      confirmDemoId === d.id ? (
                        <button
                          type="button"
                          className="btn sm red"
                          style={{ padding: '4px 8px', fontSize: 10.5 }}
                          onClick={() => {
                            onDemolishBuilding(d.id, 1);
                            setConfirmDemoId(null);
                          }}
                        >
                          Confirm +₨{formatNumber(refund1)}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="city3d-icon-btn"
                          style={{ width: 28, height: 26, color: '#ff8ea8' }}
                          title={`Demolish 1 unit (+₨ ${formatNumber(refund1)} refund)`}
                          aria-label={`Demolish ${d.n}`}
                          onClick={() => setConfirmDemoId(d.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  if (
    prev.serverOffsetMs !== next.serverOffsetMs ||
    prev.onBuyBuilding !== next.onBuyBuilding ||
    prev.onUpgradeBuilding !== next.onUpgradeBuilding ||
    prev.onDemolishBuilding !== next.onDemolishBuilding ||
    prev.onFocusBuilding !== next.onFocusBuilding ||
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
  if (prev.state.bPolicies !== next.state.bPolicies) return false;
  if (prev.state.tech !== next.state.tech) return false;
  if ((prev.state.boosterCd?.ba_build_speed_boost || 0) !== (next.state.boosterCd?.ba_build_speed_boost || 0)) {
    return false;
  }
  if (prev.state.milestones !== next.state.milestones) return false;
  if (prev.state.upgQueue !== next.state.upgQueue) return false;
  if (prev.state.upgHist !== next.state.upgHist) return false;
  const pQ = getConstructionQueue(prev.state, pNow);
  const nQ = getConstructionQueue(next.state, nNow);
  if (pQ.length !== nQ.length) return false;
  const pUQ = getUpgradeQueue(prev.state);
  const nUQ = getUpgradeQueue(next.state);
  if (pUQ.length !== nUQ.length) return false;
  if ((pQ.length > 0 || pUQ.length > 0) && Math.floor(pNow / 1000) !== Math.floor(nNow / 1000)) return false;
  return true;
});
