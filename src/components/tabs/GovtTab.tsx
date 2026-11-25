import React, { useEffect, useState } from 'react';
import {
  BUILDINGS,
  GOV_DAY_SEC,
  GX_GOV_BUILDINGS,
  GX_LEVEL_MULTS,
  GX_PROJECT_TYPES,
  GX_ROADS,
  PROJECT_STAGES,
  TECH_TREE,
} from '../../game/constants';
import {
  canUnlockTech,
  formatNumber,
  getDevelopmentDiscount,
  getProjectSpeedMult,
  gxAverageCondition,
  gxRepairCost,
  gxUpgradeCost,
  hasTech,
  techCount,
  totalBuildings,
} from '../../game/rules';
import type { GameState, GovtSubTab, GovProject, ProjectType } from '../../game/types';
import {
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
}

export const GovtTab: React.FC<GovtTabProps> = ({
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
}) => {
  const gx = state.gx;
  const gbAvg = gxAverageCondition(state, GX_GOV_BUILDINGS);
  const rdAvg = gxAverageCondition(state, GX_ROADS);
  const exp = gx.exp;
  const builtBuildings = BUILDINGS.filter((d) => (state.b[d.id] || 0) > 0);
  const nowSrv = Date.now() + serverOffsetMs;
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const disc = getDevelopmentDiscount(state, nowSrv);
  const projSpeed = getProjectSpeedMult(state, nowSrv);
  const researchedCount = techCount(state);
  const readyTechCount = TECH_TREE.filter((t) => canUnlockTech(state, t.id).ok).length;
  const ownedBuildings = totalBuildings(state);

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
              const check = canUnlockTech(state, t.id);
              const catColor = t.cat === 'economy' ? '#ffc23d' : t.cat === 'civic' ? '#3fe0b0' : '#5ccbff';
              const metReq = ownedBuildings >= t.reqBuildings;
              return (
                <div key={t.id} className="row" style={{ '--c': unlocked ? '#3fe0b0' : catColor } as React.CSSProperties}>
                  <div className="em">
                    {unlocked ? <CheckCircle2 size={22} color="#3fe0b0" /> : <FlaskConical size={22} color={catColor} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2>
                      <span>{t.n}</span>
                      <span className="lv" style={{ background: unlocked ? 'var(--mint)' : catColor, color: '#05161f' }}>
                        {t.cat.toUpperCase()}
                      </span>
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
                    <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>
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
                      ₨ {formatNumber(t.cost)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
