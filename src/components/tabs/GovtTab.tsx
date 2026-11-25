import React from 'react';
import {
  BUILDINGS,
  GOV_DAY_SEC,
  GX_GOV_BUILDINGS,
  GX_LEVEL_MULTS,
  GX_PROJECT_TYPES,
  GX_ROADS,
  PROJECT_STAGES,
} from '../../game/constants';
import {
  formatNumber,
  gxAverageCondition,
  gxRepairCost,
  gxUpgradeCost,
} from '../../game/rules';
import type { GameState, GovProject, ProjectType } from '../../game/types';

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
  return c >= 70 ? '#37e6a0' : c >= 40 ? '#ffb020' : '#ff5c5c';
}

interface GovtTabProps {
  state: GameState;
  uid: string | null;
  projects: GovProject[];
  serverOffsetMs: number;
  isUserActive: boolean;
  onFixInfra: (key: string, full: boolean) => void;
  onUpgradeBuilding: (id: string) => void;
  onStartProject: (type: ProjectType) => void;
  onPayProjectStage: (projectId: string) => void;
}

export const GovtTab: React.FC<GovtTabProps> = ({
  state,
  uid,
  projects,
  serverOffsetMs,
  isUserActive,
  onFixInfra,
  onUpgradeBuilding,
  onStartProject,
  onPayProjectStage,
}) => {
  const gx = state.gx;
  const gbAvg = gxAverageCondition(state, GX_GOV_BUILDINGS);
  const rdAvg = gxAverageCondition(state, GX_ROADS);
  const exp = gx.exp;
  const builtBuildings = BUILDINGS.filter((d) => (state.b[d.id] || 0) > 0);
  const nowSrv = Date.now() + serverOffsetMs;

  return (
    <div>
      <div className="gxc">
        <p>
          <b>🧾 Daily Government Expenses</b>{' '}
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
          {gx.blk > 0 ? '⚡ Blackout −15% income' : 'Power OK'}
          {gx.pb > 0 ? ` · Projects bonus +${(gx.pb * 100).toFixed(0)}% income` : ''}
        </p>
      </div>

      <div className="gxh">🏛️ Government Buildings</div>
      <div className="list g2">
        {GX_GOV_BUILDINGS.map(([key, name, emoji]) => {
          const cond = gx.cond[key] ?? 100;
          const col = conditionColor(cond);
          const c20 = gxRepairCost(state, key, false);
          const cFull = gxRepairCost(state, key, true);
          const needsFix = cond < 99.5;
          return (
            <div key={key} className="row" style={{ '--c': col } as React.CSSProperties}>
              <div className="em">{emoji}</div>
              <div>
                <h2>
                  {name}
                  <span className="lv">{Math.round(cond)}%</span>
                </h2>
                <p>{cond < 40 ? '⚠️ Poor — hurts income & happiness' : 'Condition'}</p>
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
                  +20% ₨ {formatNumber(c20)}
                </button>
                <button
                  type="button"
                  className={`btn sm ${needsFix && state.cash >= cFull ? 'gold' : 'no'}`}
                  disabled={!needsFix || state.cash < cFull}
                  onClick={() => onFixInfra(key, true)}
                >
                  Renovate ₨ {formatNumber(cFull)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="gxh">🛣️ Roads &amp; Highways</div>
      <div className="list g2">
        {GX_ROADS.map(([key, name, emoji]) => {
          const cond = gx.cond[key] ?? 100;
          const col = conditionColor(cond);
          const c20 = gxRepairCost(state, key, false);
          const cFull = gxRepairCost(state, key, true);
          const needsFix = cond < 99.5;
          return (
            <div key={key} className="row" style={{ '--c': col } as React.CSSProperties}>
              <div className="em">{emoji}</div>
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
                  +20% ₨ {formatNumber(c20)}
                </button>
                <button
                  type="button"
                  className={`btn sm ${needsFix && state.cash >= cFull ? 'gold' : 'no'}`}
                  disabled={!needsFix || state.cash < cFull}
                  onClick={() => onFixInfra(key, true)}
                >
                  Repair all ₨ {formatNumber(cFull)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="gxh">⬆️ Building Upgrades (Level 1–5)</div>
      {builtBuildings.length ? (
        <div className="list g2">
          {builtBuildings.map((d) => {
            const lvl = gx.lvl[d.id] || 1;
            const upCost = gxUpgradeCost(state, d.id);
            return (
              <div key={d.id} className="row" style={{ '--c': d.c } as React.CSSProperties}>
                <div className="em">{d.e}</div>
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

      <div className="gxh">🏗️ Government Projects</div>
      <p className="dim" style={{ marginBottom: 10 }}>
        Pay in {PROJECT_STAGES} stages. Construction advances while you are online &amp; active; the real-world deadline
        keeps ticking. Max 3 active.
      </p>

      {!uid ? (
        <p className="dim">🔒 Sign in to start government projects.</p>
      ) : (
        <>
          {projects
            .slice()
            .sort((a, b) => b.st - a.st)
            .map((p) => {
              const capMs = Math.floor((p.t.dur * p.paid) / PROJECT_STAGES);
              const pct = Math.round((Math.min(p.progressMs, p.t.dur) / p.t.dur) * 100);
              const invested = Math.ceil(p.t.cost / PROJECT_STAGES) * p.paid;
              const stageCost = Math.ceil(p.t.cost / PROJECT_STAGES);
              const statusText =
                p.status === 'active'
                  ? isUserActive && p.progressMs < capMs
                    ? '🔨 Building'
                    : '⏸️ Paused'
                  : p.status === 'done'
                    ? '✅ Done'
                    : '❌ Failed';

              return (
                <div key={p.id} className="gxc">
                  <p>
                    <b>
                      {p.t.e} {p.t.n}
                    </b>{' '}
                    · {statusText}
                  </p>
                  <div className="gxm">
                    <b style={{ width: `${pct}%`, background: '#7c5cff' }} />
                  </div>
                  <p className="dim">
                    Progress {pct}% · Invested ₨ {formatNumber(invested)} / ₨ {formatNumber(p.t.cost)} · Stage{' '}
                    {p.paid}/{PROJECT_STAGES}
                    {p.status === 'active' && (
                      <>
                        <br />⏳ <b>{formatDuration(p.dl - nowSrv)}</b> left
                      </>
                    )}
                  </p>
                  {p.status === 'active' && p.paid < PROJECT_STAGES && (
                    <button
                      type="button"
                      className={`btn sm ${state.cash >= stageCost ? 'mint' : 'no'}`}
                      disabled={state.cash < stageCost}
                      onClick={() => onPayProjectStage(p.id)}
                    >
                      Invest stage {p.paid + 1} · ₨ {formatNumber(stageCost)}
                    </button>
                  )}
                </div>
              );
            })}

          <div className="list g2">
            {(Object.keys(GX_PROJECT_TYPES) as ProjectType[]).map((k) => {
              const def = GX_PROJECT_TYPES[k];
              const stageCost = Math.ceil(def.cost / PROJECT_STAGES);
              return (
                <div key={k} className="row" style={{ '--c': '#7c5cff' } as React.CSSProperties}>
                  <div className="em">{def.e}</div>
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
                    className={`btn sm ${state.cash >= stageCost ? 'mint' : 'no'}`}
                    disabled={state.cash < stageCost}
                    onClick={() => onStartProject(k)}
                  >
                    Start · ₨ {formatNumber(stageCost)}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {gx.log.length > 0 && (
        <>
          <div className="gxh">📣 Recent notices</div>
          <div className="gxc">
            {gx.log.map((m, idx) => (
              <p key={idx} className="dim">
                {m}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
