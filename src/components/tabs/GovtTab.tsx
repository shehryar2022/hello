import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  BUILDING_CATEGORIES,
  BUILDINGS,
  GOV_DAY_SEC,
  GX_GOV_BUILDINGS,
  GX_LEVEL_MULTS,
  GX_PROJECT_TYPES,
  GX_ROADS,
  NATIONAL_DECISIONS,
  PROJECT_STAGES,
  TECH_TREE,
} from '../../game/constants';
import {
  canEnactNationalDecision,
  canUnlockTech,
  computeEconomySnapshot,
  formatNumber,
  getDevelopmentDiscount,
  getProjectSpeedMult,
  getRecommendedTech,
  getResearchCostMult,
  gxAverageCondition,
  gxRepairCost,
  gxUpgradeCost,
  hasTech,
  techCount,
  totalBuildings,
} from '../../game/rules';
import type { BuildingCategory, GameState, GovtSubTab, GovProject, ProjectType } from '../../game/types';
import { GdpChart } from '../GdpChart';
import {
  BarChart3,
  Bell,
  BuildingIcon,
  CheckCircle2,
  Clock,
  Coins,
  FlaskConical,
  Hammer,
  InfraIcon,
  Landmark,
  Lock,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from '../GameIcons';

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function conditionColor(c: number): string {
  return c >= 70 ? '#3fe0b0' : c >= 40 ? '#ffc23d' : '#ff6fa5';
}

interface GovtTabProps {
  state: GameState;
  subTab: GovtSubTab;
  uid: string | null;
  projects: GovProject[];
  liveProjectProgress: Record<string, number>;
  serverOffsetMs: number;
  isUserActive: boolean;
  onChangeSubTab: (sub: GovtSubTab) => void;
  onFixInfra: (key: string, full: boolean) => void;
  onUpgradeBuilding: (id: string) => void;
  onStartProject: (type: ProjectType) => void;
  onPayProjectStage: (projectId: string) => void;
  onUnlockTech: (techId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onEnactDecision?: (decisionId: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const GovtTab: React.FC<GovtTabProps> = memo(({
  state,
  subTab,
  uid,
  projects,
  liveProjectProgress,
  serverOffsetMs,
  isUserActive,
  onChangeSubTab,
  onFixInfra,
  onUpgradeBuilding,
  onStartProject,
  onPayProjectStage,
  onUnlockTech,
  onEnactDecision,
}) => {
  const gx = state.gx;
  const gbAvg = useMemo(() => gxAverageCondition(state, GX_GOV_BUILDINGS), [state]);
  const rdAvg = useMemo(() => gxAverageCondition(state, GX_ROADS), [state]);
  const exp = gx.exp;
  const builtBuildings = useMemo(() => BUILDINGS.filter((d) => (state.b[d.id] || 0) > 0), [state.b]);
  const nowSrv = (state.t || Date.now()) + serverOffsetMs;
  const activeCount = useMemo(() => projects.filter((p) => p.status === 'active').length, [projects]);
  const disc = useMemo(() => getDevelopmentDiscount(state, nowSrv), [state, nowSrv]);
  const projSpeed = useMemo(() => getProjectSpeedMult(state, nowSrv), [state, nowSrv]);
  const researchCostMult = useMemo(() => getResearchCostMult(state, nowSrv), [state, nowSrv]);
  const researchedCount = useMemo(() => techCount(state), [state]);
  const readyTechCount = useMemo(
    () => TECH_TREE.filter((t) => canUnlockTech(state, t.id, nowSrv).ok).length,
    [state, nowSrv],
  );
  const readyDecisionCount = useMemo(
    () => NATIONAL_DECISIONS.filter((d) => canEnactNationalDecision(state, d, nowSrv).ok).length,
    [state, nowSrv],
  );
  const techRec = useMemo(() => getRecommendedTech(state), [state]);
  const ownedBuildings = useMemo(() => totalBuildings(state), [state]);
  const econSnap = useMemo(
    () => (subTab === 'stats' ? computeEconomySnapshot(state, { nowMs: nowSrv }) : null),
    [state, subTab, nowSrv],
  );

  const dismissStorageKey = `cet_cleared_proj_${uid || 'offline'}`;
  const [hiddenPastIds, setHiddenPastIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(dismissStorageKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(dismissStorageKey);
      setHiddenPastIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setHiddenPastIds([]);
    }
  }, [dismissStorageKey]);

  const pastProjects = projects.filter(
    (p) => p.status !== 'active' && !hiddenPastIds.includes(p.id),
  );

  const handleClearPast = () => {
    const nextIds = Array.from(
      new Set([...hiddenPastIds, ...projects.filter((p) => p.status !== 'active').map((p) => p.id)]),
    );
    setHiddenPastIds(nextIds);
    try {
      localStorage.setItem(dismissStorageKey, JSON.stringify(nextIds.slice(-80)));
    } catch {
      // Ignore storage quota errors
    }
  };

  return (
    <div>
      <div className="subtabs">
        <button type="button" className={subTab === 'infra' ? 'on' : ''} onClick={() => onChangeSubTab('infra')}>
          <Landmark size={14} />
          <span>Infra &amp; Upgrades</span>
        </button>
        <button type="button" className={subTab === 'decisions' ? 'on' : ''} onClick={() => onChangeSubTab('decisions')}>
          <Zap size={14} />
          <span>Decisions</span>
          {readyDecisionCount > 0 && <em>{readyDecisionCount}</em>}
        </button>
        <button type="button" className={subTab === 'projects' ? 'on' : ''} onClick={() => onChangeSubTab('projects')}>
          <Hammer size={14} />
          <span>Projects</span>
          {activeCount > 0 && <em>{activeCount}</em>}
        </button>
        <button type="button" className={subTab === 'research' ? 'on' : ''} onClick={() => onChangeSubTab('research')}>
          <FlaskConical size={14} />
          <span>Research Lab</span>
          {readyTechCount > 0 && <em>{readyTechCount}</em>}
        </button>
        <button type="button" className={subTab === 'stats' ? 'on' : ''} onClick={() => onChangeSubTab('stats')}>
          <BarChart3 size={14} />
          <span>Economy Stats</span>
        </button>
      </div>

      {(disc > 0 || projSpeed > 1) && (
        <div className="tradelim">
          <span>
            <Sparkles size={14} color="#3fe0b0" />
            National Bonuses Active
          </span>
          <b className="ok">
            −{Math.round(disc * 100)}% build/repair · ×{projSpeed.toFixed(2)} project speed
          </b>
        </div>
      )}

      {subTab === 'infra' && (
        <>
          <div className="gxc">
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Coins size={15} color="#ffc23d" />
              <b>Daily Government Expenses</b>{' '}
              <span className="dim">
                · next in <b>{Math.max(0, GOV_DAY_SEC - Math.floor(gx.acc))}s</b> of active play
              </span>
            </p>
            {exp ? (
              <p className="dim">
                Day {exp.n}: Salaries ₨ {formatNumber(exp.sal)} · Electricity ₨ {formatNumber(exp.el)} · Infrastructure ₨{' '}
                {formatNumber(exp.inf)}
                <br />
                <b>Total ₨ {formatNumber(exp.total)}</b> (paid ₨ {formatNumber(exp.paid)})
              </p>
            ) : (
              <p className="dim">
                First report arrives after one government day (5 min active play). Salaries 3% + electricity 1.5% +
                infrastructure 1.5% of daily gross income.
              </p>
            )}
            <p className="dim">
              Buildings avg {Math.round(gbAvg)}% · Transport efficiency {Math.round(92 + (8 * rdAvg) / 100)}% ·{' '}
              {gx.blk > 0 ? 'Blackout −15% income' : 'Power OK'}
              {gx.pb > 0 ? ` · Projects bonus +${(gx.pb * 100).toFixed(0)}% income` : ''}
            </p>
          </div>

      <div className="gxh">
        <Landmark size={15} color="#ffc23d" />
        <span>Government Buildings</span>
      </div>
      <p className="dim" style={{ marginBottom: 8 }}>
        Renovation costs depend only on <b>20% of your building development</b> (temporary boosters never inflate repairs).
      </p>
      <div className="list g2">
        {GX_GOV_BUILDINGS.map(([key, name]) => {
          const cond = gx.cond[key] ?? 100;
          const col = conditionColor(cond);
          const c20 = gxRepairCost(state, key, false, nowSrv);
          const cFull = gxRepairCost(state, key, true, nowSrv);
          const needsFix = cond < 99.5;
          return (
            <div key={key} className="row" style={{ '--c': col } as React.CSSProperties}>
              <div className="em">
                <InfraIcon id={key} size={22} />
              </div>
              <div>
                <h2>
                  {name}
                  <span className="lv">{Math.round(cond)}%</span>
                </h2>
                <p>{cond < 40 ? 'Poor — hurts income & happiness' : 'Condition'}</p>
                <div className="gxm">
                  <b style={{ width: `${Math.round(cond)}%`, background: col }} />
                </div>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <button
                  type="button"
                  className={`btn sm ${needsFix && state.cash >= c20 ? 'mint' : 'no'}`}
                  disabled={!needsFix || state.cash < c20}
                  onClick={() => onFixInfra(key, false)}
                >
                  {needsFix ? `+20% ₨ ${formatNumber(c20)}` : '+20%'}
                </button>
                <button
                  type="button"
                  className={`btn sm ${needsFix && state.cash >= cFull ? 'gold' : 'no'}`}
                  disabled={!needsFix || state.cash < cFull}
                  onClick={() => onFixInfra(key, true)}
                >
                  {needsFix ? `Renovate ₨ ${formatNumber(cFull)}` : 'Full'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="gxh">
        <Wrench size={15} color="#5ccbff" />
        <span>Roads &amp; Highways</span>
      </div>
      <div className="list g2">
        {GX_ROADS.map(([key, name]) => {
          const cond = gx.cond[key] ?? 100;
          const col = conditionColor(cond);
          const c20 = gxRepairCost(state, key, false, nowSrv);
          const cFull = gxRepairCost(state, key, true, nowSrv);
          const needsFix = cond < 99.5;
          return (
            <div key={key} className="row" style={{ '--c': col } as React.CSSProperties}>
              <div className="em">
                <InfraIcon id={key} size={22} />
              </div>
              <div>
                <h2>
                  {name}
                  <span className="lv">{Math.round(cond)}%</span>
                </h2>
                <p>Low condition cuts transport efficiency &amp; business income</p>
                <div className="gxm">
                  <b style={{ width: `${Math.round(cond)}%`, background: col }} />
                </div>
              </div>
              <div style={{ display: 'grid', gap: 4 }}>
                <button
                  type="button"
                  className={`btn sm ${needsFix && state.cash >= c20 ? 'mint' : 'no'}`}
                  disabled={!needsFix || state.cash < c20}
                  onClick={() => onFixInfra(key, false)}
                >
                  {needsFix ? `+20% ₨ ${formatNumber(c20)}` : '+20%'}
                </button>
                <button
                  type="button"
                  className={`btn sm ${needsFix && state.cash >= cFull ? 'gold' : 'no'}`}
                  disabled={!needsFix || state.cash < cFull}
                  onClick={() => onFixInfra(key, true)}
                >
                  {needsFix ? `Repair all ₨ ${formatNumber(cFull)}` : 'Full'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="gxh">
        <TrendingUp size={15} color="#3fe0b0" />
        <span>Building Upgrades (Level 1–5)</span>
      </div>
      {builtBuildings.length ? (
        <div className="list g2">
          {builtBuildings.map((d) => {
            const lvl = gx.lvl[d.id] || 1;
            const upCost = gxUpgradeCost(state, d.id, nowSrv);
            return (
              <div key={d.id} className="row" style={{ '--c': d.c } as React.CSSProperties}>
                <div className="em">
                  <BuildingIcon id={d.id} size={22} />
                </div>
                <div>
                  <h2>
                    {d.n}
                    <span className="lv">Lv {lvl}/5</span>
                  </h2>
                  <p>
                    Output ×{GX_LEVEL_MULTS[lvl - 1]}
                    {lvl < 5 ? ` → ×${GX_LEVEL_MULTS[lvl]}` : ' (MAX)'}
                  </p>
                  <div className="gxm">
                    <b style={{ width: `${lvl * 20}%`, background: d.c }} />
                  </div>
                </div>
                {lvl < 5 ? (
                  <button
                    type="button"
                    className={`btn sm ${state.cash >= upCost ? 'mint' : 'no'}`}
                    disabled={state.cash < upCost}
                    onClick={() => onUpgradeBuilding(d.id)}
                  >
                    Upgrade ₨ {formatNumber(upCost)}
                  </button>
                ) : (
                  <span className="lv">MAX</span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="dim">Buy buildings in the Build tab first.</p>
      )}
        </>
      )}

      {subTab === 'projects' && (
        <>
          <div className="gxh" style={{ marginTop: 4 }}>
            <Hammer size={15} color="#a58cff" />
            <span>Government Projects</span>
          </div>
      <p className="dim" style={{ marginBottom: 10 }}>
        Pay in {PROJECT_STAGES} stages. Construction advances while you are online &amp; active (24h–96h deadlines; 75% refund if missed). Max 3 active.
      </p>

      {!uid ? (
        <p className="dim" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Lock size={14} /> Sign in to start government projects.
        </p>
      ) : (
        <>
          {projects
            .filter((p) => p.status === 'active')
            .slice()
            .sort((a, b) => b.st - a.st)
            .map((p) => {
              const capMs = Math.floor((p.t.dur * p.paid) / PROJECT_STAGES);
              const liveMs = Math.max(p.progressMs, liveProjectProgress[p.id] ?? p.progressMs);
              const effectiveMs = Math.min(p.t.dur, Math.min(capMs, liveMs));
              const pct = Math.round((effectiveMs / p.t.dur) * 100);
              const invested = Math.ceil(p.t.cost / PROJECT_STAGES) * p.paid;
              const stageCost = Math.ceil(p.t.cost / PROJECT_STAGES);
              const stageCapReached = effectiveMs >= capMs && p.paid < PROJECT_STAGES;
              const statusText = p.pending
                ? 'Starting…'
                : stageCapReached
                  ? `Stage ${p.paid}/${PROJECT_STAGES} complete — invest next stage`
                  : isUserActive
                    ? 'Building'
                    : 'Paused';

              return (
                <div key={p.id} className="gxc">
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <InfraIcon id={p.type} size={16} />
                    <b>{p.t.n}</b> · {statusText}
                  </p>
                  <div className="gxm">
                    <b style={{ width: `${pct}%`, background: '#7c5cff' }} />
                  </div>
                  <p className="dim">
                    Progress {pct}% · Invested ₨ {formatNumber(invested)} / ₨ {formatNumber(p.t.cost)} · Stage{' '}
                    {p.paid}/{PROJECT_STAGES}
                    <br />
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    <b>{formatDuration(p.dl - nowSrv)}</b> left
                  </p>
                  {p.paid < PROJECT_STAGES && (
                    <button
                      type="button"
                      className={`btn sm ${state.cash >= stageCost ? 'mint' : 'no'}`}
                      disabled={state.cash < stageCost}
                      onClick={() => onPayProjectStage(p.id)}
                    >
                      <Zap size={13} />
                      <span>Invest stage {p.paid + 1} · ₨ {formatNumber(stageCost)}</span>
                    </button>
                  )}
                </div>
              );
            })}

          <div className="list g2">
            {(Object.keys(GX_PROJECT_TYPES) as ProjectType[]).map((k) => {
              const def = GX_PROJECT_TYPES[k];
              const stageCost = Math.ceil(def.cost / PROJECT_STAGES);
              const canStart = activeCount < 3 && state.cash >= stageCost;
              return (
                <div key={k} className="row" style={{ '--c': '#7c5cff' } as React.CSSProperties}>
                  <div className="em">
                    <InfraIcon id={k} size={22} />
                  </div>
                  <div>
                    <h2>
                      {def.n}
                      <span className="lv">₨ {formatNumber(def.cost)}</span>
                    </h2>
                    <p>
                      Build {formatDuration(def.dur)} · Deadline {formatDuration(def.dl * 60_000)} · Reward +40% cash
                      &amp; permanent bonus
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`btn sm ${canStart ? 'mint' : 'no'}`}
                    disabled={!canStart}
                    onClick={() => onStartProject(k)}
                  >
                    {activeCount >= 3 ? 'Max 3 active' : `Start · ₨ ${formatNumber(stageCost)}`}
                  </button>
                </div>
              );
            })}
          </div>

          {pastProjects.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary className="dim" style={{ cursor: 'pointer', fontSize: 13 }}>
                Past projects ({pastProjects.length})
              </summary>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <button type="button" className="btn sm" onClick={handleClearPast}>
                    Clear past
                  </button>
                </div>
                {pastProjects
                  .slice()
                  .sort((a, b) => b.st - a.st)
                  .slice(0, 8)
                  .map((p) => {
                    const invested = Math.ceil(p.t.cost / PROJECT_STAGES) * p.paid;
                    const pct = Math.round((Math.min(p.t.dur, p.progressMs) / p.t.dur) * 100);
                    return (
                      <div key={p.id} className="gxc">
                        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <InfraIcon id={p.type} size={15} />
                          <b>{p.t.n}</b> · {p.status === 'done' ? <CheckCircle2 size={14} color="#3fe0b0" /> : 'Failed'}
                        </p>
                        <p className="dim">
                          Progress {pct}% · Invested ₨ {formatNumber(invested)} / ₨ {formatNumber(p.t.cost)} · Stage{' '}
                          {p.paid}/{PROJECT_STAGES}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </details>
          )}
        </>
      )}

      {gx.log.length > 0 && (
        <>
          <div className="gxh">
            <Bell size={15} color="#ffc23d" />
            <span>Recent notices</span>
          </div>
          <div className="gxc">
            {gx.log.map((m, idx) => (
              <p key={idx} className="dim">
                {m}
              </p>
            ))}
          </div>
        </>
      )}
        </>
      )}

      {subTab === 'research' && (
        <div>
          <div className="tradelim">
            <span>
              <FlaskConical size={14} color="#5ccbff" />
              National Research Doctrines
            </span>
            <b>
              {researchedCount} / {TECH_TREE.length} Unlocked · {ownedBuildings} Buildings
              {researchCostMult < 1 ? ` · −${Math.round((1 - researchCostMult) * 100)}% cost` : ''}
            </b>
          </div>

          <div className="gxc" style={{ marginBottom: 10 }}>
            <p className="dim">
              Permanent national breakthroughs that strengthen your grid, healthcare, customs, and treasury reserves without breaking economy balance.
            </p>
          </div>

          <div className="list g2">
            {TECH_TREE.map((t) => {
              const unlocked = hasTech(state, t.id);
              const check = canUnlockTech(state, t.id, nowSrv);
              const catColor = t.cat === 'economy' ? '#ffc23d' : t.cat === 'civic' ? '#3fe0b0' : '#5ccbff';
              const metReq = ownedBuildings >= t.reqBuildings;
              const recReason = !unlocked ? techRec[t.id] : undefined;
              return (
                <div
                  key={t.id}
                  className={`row${recReason ? ' rec-card' : ''}`}
                  style={{ '--c': unlocked ? '#3fe0b0' : catColor } as React.CSSProperties}
                >
                  <div className="em">
                    {unlocked ? <CheckCircle2 size={22} color="#3fe0b0" /> : <FlaskConical size={22} color={catColor} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2>
                      <span>{t.n}</span>
                      <span className="lv" style={{ borderColor: unlocked ? 'var(--mint)' : catColor, color: unlocked ? 'var(--mint)' : catColor, background: 'rgba(255,255,255,0.06)' }}>
                        {t.cat.toUpperCase()}
                      </span>
                      {recReason && (
                        <span className="rec-badge">
                          <Sparkles size={10} />
                          <span>{recReason}</span>
                        </span>
                      )}
                    </h2>
                    <p>
                      {t.d} <b style={{ color: '#e6dcff' }}>{t.effectLabel}</b>
                    </p>
                    {!unlocked && (
                      <p className={metReq ? 'ok' : 'bad'} style={{ fontSize: 11.5 }}>
                        Requires {t.reqBuildings} buildings ({ownedBuildings}/{t.reqBuildings})
                      </p>
                    )}
                  </div>
                  {unlocked ? (
                    <span className="lv" style={{ borderColor: 'var(--mint)', color: 'var(--mint)', background: 'rgba(63,224,176,0.14)' }}>
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      className={`btn sm ${check.ok ? 'gold' : 'no'}`}
                      disabled={!check.ok}
                      title={check.reason}
                      onClick={(e) => onUnlockTech(t.id, e)}
                    >
                      ₨ {formatNumber(check.cost)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'decisions' && (
        <div data-testid="cabinet-decisions-view">
          <div className="tradelim">
            <span>
              <Zap size={14} color="#ffc23d" />
              National Cabinet Decisions
            </span>
            <b>{NATIONAL_DECISIONS.length} Executive Mandates</b>
          </div>
          <div className="gxc" style={{ marginBottom: 10 }}>
            <p className="dim">
              Enact timed national directives with real treasury, grid, tax pool, and citizen morale tradeoffs.
            </p>
          </div>
          <div className="list g2">
            {NATIONAL_DECISIONS.map((dec) => {
              const check = canEnactNationalDecision(state, dec, nowSrv);
              return (
                <div
                  key={dec.id}
                  className="row"
                  style={{ '--c': check.ok ? '#3fe0b0' : '#a58cff' } as React.CSSProperties}
                >
                  <div className="em">
                    <Landmark size={22} color={check.ok ? '#3fe0b0' : '#a58cff'} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2>
                      <span>{dec.name}</span>
                      <span className="lv">Rank {dec.reqRank}+ · {dec.reqBuildings} Bldgs</span>
                    </h2>
                    <p>{dec.desc}</p>
                    <div className="bmeta">
                      <span>Cooldown {Math.round(dec.cdSec / 60)}m</span>
                      {dec.hapDelta !== 0 && (
                        <span style={{ color: dec.hapDelta > 0 ? 'var(--mint)' : 'var(--pink)' }}>
                          {dec.hapDelta > 0 ? `+${dec.hapDelta}` : dec.hapDelta}% Hap
                        </span>
                      )}
                      {dec.apprDelta !== 0 && (
                        <span style={{ color: dec.apprDelta > 0 ? 'var(--cy)' : 'var(--pink)' }}>
                          {dec.apprDelta > 0 ? `+${dec.apprDelta}` : dec.apprDelta}% Appr
                        </span>
                      )}
                      {dec.gemsDelta && <span style={{ color: 'var(--gold)' }}>+{dec.gemsDelta} Gems</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn sm ${check.ok ? 'gold' : 'no'}`}
                    disabled={!check.ok || !onEnactDecision}
                    title={check.reason || dec.tradeoff}
                    onClick={(e) => onEnactDecision?.(dec.id, e)}
                  >
                    {check.cdLeftSec > 0
                      ? `${check.cdLeftSec}s CD`
                      : dec.cost > 0
                        ? `₨ ${formatNumber(dec.cost)}`
                        : 'Enact Free'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'stats' && econSnap && (
        <div data-testid="economy-stats-view">
          <div className="econ-stats">
            <div className="econ-tile">
              <small>Real National GDP</small>
              <b style={{ color: 'var(--gold)' }}>₨ {formatNumber(econSnap.realGdp)}</b>
              <span>Backed by capital, flow &amp; human capital</span>
            </div>
            <div className="econ-tile">
              <small>Net Income / min</small>
              <b style={{ color: 'var(--mint)' }}>₨ {formatNumber(econSnap.net * 60)}</b>
              <span>Gross ₨ {formatNumber(econSnap.buildingGross * 60)}/m</span>
            </div>
            <div className="econ-tile">
              <small>Operating Costs / min</small>
              <b style={{ color: 'var(--pink)' }}>
                −₨ {formatNumber((econSnap.maintCost + econSnap.salaryCost + econSnap.welfareCost) * 60)}
              </b>
              <span>
                Maint {formatNumber(econSnap.maintCost * 60)} · Wages {formatNumber(econSnap.salaryCost * 60)}
              </span>
            </div>
            <div className="econ-tile">
              <small>Power Grid Balance</small>
              <b style={{ color: econSnap.energyRatio >= 1 ? 'var(--mint)' : 'var(--pink)' }}>
                {econSnap.energySupply} / {econSnap.energyDemand} MW
              </b>
              <span>Grid efficiency ×{econSnap.energyFactor.toFixed(2)}</span>
            </div>
            <div className="econ-tile">
              <small>National Employment</small>
              <b style={{ color: econSnap.employmentRate >= 0.65 ? 'var(--mint)' : 'var(--gold)' }}>
                {Math.round(econSnap.employmentRate * 100)}%
              </b>
              <span>
                {formatNumber(econSnap.jobsCreated)} / {formatNumber(econSnap.laborPool)} jobs filled
              </span>
            </div>
            <div className="econ-tile">
              <small>Housing &amp; Safety</small>
              <b style={{ color: econSnap.housingRatio >= 0.9 ? 'var(--mint)' : 'var(--gold)' }}>
                {Math.round(econSnap.housingRatio * 100)}% Housing
              </b>
              <span>
                Cap {formatNumber(econSnap.housingCapacity)}M · Safety {Math.round(econSnap.publicSafetyScore)}%
              </span>
            </div>
            <div className="econ-tile">
              <small>Inflation &amp; Trade</small>
              <b style={{ color: econSnap.inflationRate <= 3.5 ? 'var(--mint)' : 'var(--gold)' }}>
                {econSnap.inflationRate.toFixed(1)}% CPI
              </b>
              <span>
                Export +{Math.round(econSnap.tradeExportBonus * 100)}% · Pollution {Math.round(econSnap.pollutionLevel)}%
              </span>
            </div>
          </div>

          <GdpChart history={state.hist} currentGdp={econSnap.realGdp} />

          <div className="gxc" style={{ marginTop: 12 }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <BarChart3 size={15} color="#5ccbff" />
              <b>Sector Output Breakdown (per min)</b>
            </p>
            <div className="sector-bars">
              {(() => {
                const cats = BUILDING_CATEGORIES.filter((c) => c.id !== 'all') as Array<{
                  id: Exclude<BuildingCategory, 'all'>;
                  label: string;
                }>;
                const colors: Record<Exclude<BuildingCategory, 'all'>, string> = {
                  residential: '#60e6c8',
                  commercial: '#f472b6',
                  industry: '#ff9a1f',
                  energy: '#ffe066',
                  infrastructure: '#60a5fa',
                  agriculture: '#37e6a0',
                  technology: '#3fd2ff',
                  healthcare_edu: '#a78bfa',
                  public_services: '#93c5fd',
                  special: '#fbbf24',
                };
                const maxVal = Math.max(
                  1,
                  ...cats.map((c) => (econSnap.sectorIncome[c.id] || 0) * 60),
                );
                return cats.map((c) => {
                  const perMin = (econSnap.sectorIncome[c.id] || 0) * 60;
                  const pct = Math.max(0, Math.min(100, Math.round((perMin / maxVal) * 100)));
                  return (
                    <div key={c.id} className="sector-row">
                      <div className="sector-row-top">
                        <span>{c.label}</span>
                        <b style={{ color: colors[c.id] }}>₨ {formatNumber(perMin)}/m</b>
                      </div>
                      <div className="sector-track">
                        <b style={{ width: `${perMin > 0 ? Math.max(3, pct) : 0}%`, background: colors[c.id] }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  if (
    prev.serverOffsetMs !== next.serverOffsetMs ||
    prev.subTab !== next.subTab ||
    prev.uid !== next.uid ||
    prev.projects !== next.projects ||
    prev.isUserActive !== next.isUserActive ||
    prev.onChangeSubTab !== next.onChangeSubTab ||
    prev.onFixInfra !== next.onFixInfra ||
    prev.onUpgradeBuilding !== next.onUpgradeBuilding ||
    prev.onStartProject !== next.onStartProject ||
    prev.onPayProjectStage !== next.onPayProjectStage ||
    prev.onUnlockTech !== next.onUnlockTech ||
    prev.onEnactDecision !== next.onEnactDecision
  ) {
    return false;
  }
  const p = prev.state;
  const n = next.state;
  if (
    p.cash !== n.cash ||
    p.b !== n.b ||
    p.tech !== n.tech ||
    p.sub !== n.sub ||
    p.rank !== n.rank ||
    p.boosterCd !== n.boosterCd ||
    p.decisionsCd !== n.decisionsCd ||
    p.gx.lvl !== n.gx.lvl ||
    p.gx.cond !== n.gx.cond ||
    p.gx.blk !== n.gx.blk ||
    p.gx.pb !== n.gx.pb ||
    p.gx.exp !== n.gx.exp ||
    p.gx.log !== n.gx.log
  ) {
    return false;
  }
  const pNow = (p.t || 0) + prev.serverOffsetMs;
  const nNow = (n.t || 0) + next.serverOffsetMs;
  const pSubActive = !!(p.sub?.tier && (p.sub?.exp || 0) > pNow);
  const nSubActive = !!(n.sub?.tier && (n.sub?.exp || 0) > nNow);
  if (pSubActive !== nSubActive) return false;
  if (prev.subTab === 'infra') {
    return Math.floor(p.gx.acc || 0) === Math.floor(n.gx.acc || 0);
  }
  if (prev.subTab === 'decisions') {
    return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
  }
  if (prev.subTab === 'projects') {
    return prev.liveProjectProgress === next.liveProjectProgress;
  }
  if (prev.subTab === 'stats') {
    return (
      p.hist === n.hist &&
      Math.round(p.hap) === Math.round(n.hap) &&
      Math.round(p.pop) === Math.round(n.pop) &&
      p.gov === n.gov &&
      p.tax === n.tax &&
      p.activeFx === n.activeFx &&
      p.boost === n.boost
    );
  }
  return true;
});
