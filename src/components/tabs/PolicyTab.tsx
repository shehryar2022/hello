import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BUILDING_POLICIES, BUILDINGS, GOV_CHANGE_CD_MS, GOVS, NATIONAL_POLICIES, POLICY_PRESETS } from '../../game/constants';
import {
  canChangePolicyStance,
  canCommitFiscalReform,
  canSetBuildingPolicy,
  computeEconomySnapshot,
  currentWorldEvent,
  extractFiscalDraft,
  formatNumber,
  getActiveBuildingPolicyId,
  getFiscalCommitCost,
  getFiscalCooldownLeftMs,
  getGovDefinition,
  getPolicyCooldownLeftMs,
  getPolicyStance,
  getRecommendedPolicyHint,
  hasFiscalDraftChanges,
  isBuildingPolicyAllowedFor,
  presetToFiscalDraft,
  targetHappiness,
  taxInfo,
} from '../../game/rules';
import type { BuildingPolicyId, GameState, PolicyCategoryId } from '../../game/types';
import {
  BuildingIcon,
  CheckCircle2,
  Clock,
  Cloud,
  Coins,
  Globe,
  GovTypeIcon,
  Landmark,
  PolicyCategoryIcon,
  PolicyIcon,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from '../GameIcons';

interface PolicyTabProps {
  state: GameState;
  uid: string | null;
  serverOffsetMs: number;
  onCommitFiscalReform: (draft: Partial<Record<keyof GameState, number>>) => boolean;
  onChangePolicyStance: (catId: PolicyCategoryId, stance: 0 | 1 | 2) => void;
  onSetBuildingPolicy?: (buildingId: string, policyId: BuildingPolicyId) => void;
  onChangeGov: (govId: string) => void;
  onResetGame: () => void;
  onSaveCloudNow: () => void;
}

const TAX_SLIDERS: Array<{
  key: keyof GameState;
  label: string;
  min: number;
  max: number;
  desc: string;
  color: string;
}> = [
  { key: 'tax', label: 'Income tax', min: 5, max: 45, desc: 'Higher tax = more cash, unhappy people.', color: 'var(--gold)' },
  { key: 'fuel', label: 'Fuel tax', min: 0, max: 50, desc: 'Extra revenue from fuel — but the public hates it.', color: '#ff9a4d' },
  { key: 'carbon', label: 'Carbon tax', min: 0, max: 30, desc: 'Big revenue — Solar, Wind & Green Subsidies offset penalty.', color: '#8bbd8b' },
  { key: 'luxury', label: 'Luxury tax', min: 0, max: 25, desc: 'Taxes the rich. Good revenue, small happiness hit.', color: '#e0b81a' },
  { key: 'corp', label: 'Corporate tax', min: 0, max: 30, desc: 'Taxes businesses; Business Districts amplify revenue.', color: '#c97a3d' },
  { key: 'gst', label: 'Sales tax (GST)', min: 0, max: 25, desc: 'Taxes retail sales; Shopping Centers amplify yield.', color: '#4cc9ff' },
  { key: 'prop', label: 'Property tax', min: 0, max: 15, desc: 'Scales with population. Biggest happiness hit.', color: '#ff6fa3' },
  { key: 'duty', label: 'Import duty', min: 0, max: 30, desc: 'Customs on imports; Ports & Airports boost yield.', color: '#a07bff' },
  { key: 'tourism', label: 'Tourism levy', min: 0, max: 20, desc: 'Visitor tax boosted by Airports & Shopping Centers.', color: '#38bdf8' },
  { key: 'digital', label: 'Digital economy tax', min: 0, max: 20, desc: 'Online commerce levy boosted by Tech Parks & Data Centers.', color: '#a78bfa' },
  { key: 'wealth', label: 'Ultra-wealth levy', min: 0, max: 20, desc: 'Taxes top fortunes; Business Districts amplify revenue.', color: '#f472b6' },
];

const SPENDING_SLIDERS: Array<{
  key: keyof GameState;
  label: string;
  min: number;
  max: number;
  desc: string;
  color: string;
}> = [
  { key: 'wel', label: 'Welfare spending', min: 0, max: 50, desc: 'Costs a share of income, raises happiness & approval.', color: 'var(--mint)' },
  { key: 'edu', label: 'Education', min: 0, max: 30, desc: 'Long-term: raises income and happiness.', color: 'var(--cy)' },
  { key: 'rd', label: 'R&D innovation grant', min: 0, max: 25, desc: 'Funds science to lift national income & slight happiness.', color: '#60a5fa' },
  { key: 'green', label: 'Green energy subsidy', min: 0, max: 25, desc: 'Boosts happiness, cuts carbon penalty & powers Solar/Wind.', color: '#4ade80' },
  { key: 'transitSub', label: 'Public transit subsidy', min: 0, max: 25, desc: 'Boosts happiness & multiplies Roads + Railways output.', color: '#22d3ee' },
];

export const PolicyTab: React.FC<PolicyTabProps> = memo(({
  state,
  uid,
  serverOffsetMs,
  onCommitFiscalReform,
  onChangePolicyStance,
  onSetBuildingPolicy,
  onChangeGov,
  onResetGame,
  onSaveCloudNow,
}) => {
  const [selectedBldgId, setSelectedBldgId] = useState<string>('');
  const [polQuery, setPolQuery] = useState<string>('');
  const [draft, setDraft] = useState<Record<string, number>>(() => extractFiscalDraft(state));
  const committedSig = useMemo(() => JSON.stringify(extractFiscalDraft(state)), [state]);
  const prevCommittedSigRef = useRef<string>(committedSig);

  useEffect(() => {
    if (prevCommittedSigRef.current !== committedSig) {
      prevCommittedSigRef.current = committedSig;
      setDraft(extractFiscalDraft(state));
    }
  }, [committedSig, state]);

  const effectiveState = useMemo(() => ({ ...state, ...draft } as GameState), [state, draft]);

  const nowSrv = (state.t || Date.now()) + serverOffsetMs;
  const ti = useMemo(() => taxInfo(effectiveState), [effectiveState]);
  const snap = useMemo(() => computeEconomySnapshot(effectiveState, { nowMs: nowSrv }), [effectiveState, nowSrv]);
  const gov = useMemo(() => getGovDefinition(effectiveState), [effectiveState]);
  const govCd = Math.max(0, (state.govT || 0) + GOV_CHANGE_CD_MS - nowSrv);
  const worldEv = currentWorldEvent(nowSrv);
  const targHap = useMemo(() => Math.round(targetHappiness(effectiveState, nowSrv)), [effectiveState, nowSrv]);
  const recPreset = useMemo(() => getRecommendedPolicyHint(effectiveState), [effectiveState]);

  const hasChanges = useMemo(() => hasFiscalDraftChanges(state, draft), [state, draft]);
  const fiscalCost = useMemo(() => getFiscalCommitCost(state), [state]);
  const fiscalCdMs = getFiscalCooldownLeftMs(state, nowSrv);
  const commitCheck = useMemo(() => canCommitFiscalReform(state, draft, nowSrv), [state, draft, nowSrv]);

  const handleSliderInput = useCallback((key: keyof GameState, val: number) => {
    setDraft((prev) => ({ ...prev, [key as string]: val }));
  }, []);

  const handleRevertDraft = useCallback(() => {
    setDraft(extractFiscalDraft(state));
  }, [state]);

  const handleCommit = useCallback(() => {
    const ok = onCommitFiscalReform(draft);
    if (ok) {
      setDraft(extractFiscalDraft({ ...state, ...draft } as GameState));
    }
  }, [draft, onCommitFiscalReform, state]);

  const renderSlider = (s: (typeof TAX_SLIDERS)[number]) => {
    const val = draft[s.key as string] ?? Number(state[s.key] || 0);
    const pct = Math.max(0, Math.min(100, ((val - s.min) / (s.max - s.min)) * 100));
    const dirty = val !== Math.round(Number(state[s.key] || 0));
    return (
      <div key={s.key} className="sl" style={{ '--ac': s.color } as React.CSSProperties}>
        <div>
          <span>
            <PolicyIcon k={s.key as string} size={15} />
            {s.label}
            {dirty && <em className="ok" style={{ fontStyle: 'normal', fontSize: 11, marginLeft: 4 }}>(draft)</em>}
          </span>
          <b className="f">{val}%</b>
        </div>
        <input
          type="range"
          min={s.min}
          max={s.max}
          value={val}
          aria-label={s.label}
          style={{ '--p': `${pct}%` } as React.CSSProperties}
          onChange={(e) => handleSliderInput(s.key, Number(e.target.value))}
        />
        <p className="dim">{s.desc}</p>
      </div>
    );
  };

  return (
    <div>
      <div className="gxh" style={{ marginTop: 0 }}>
        <Landmark size={15} color="#a58cff" />
        <span>National Policy Directives ({NATIONAL_POLICIES.length} Categories)</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <p className="dim" style={{ margin: 0, flex: '1 1 260px' }}>
          Each national policy sets permanent sector rules with clear trade-offs and a <b>5-minute cooldown</b> per category to prevent rapid bonus flipping.
        </p>
        <input
          type="search"
          className="inp"
          value={polQuery}
          onChange={(e) => setPolQuery(e.target.value)}
          placeholder="Filter 20 policy directives…"
          aria-label="Filter policy directives"
          style={{ width: 220, margin: 0, padding: '6px 10px', fontSize: 12.5 }}
        />
      </div>

      <div className="pol-grid">
        {NATIONAL_POLICIES.filter((cat) => {
          const q = polQuery.trim().toLowerCase();
          if (!q) return true;
          return (
            cat.name.toLowerCase().includes(q) ||
            cat.desc.toLowerCase().includes(q) ||
            cat.options.some((o) => o.label.toLowerCase().includes(q))
          );
        }).map((cat) => {
          const activeStance = getPolicyStance(state, cat.id);
          const cdMs = getPolicyCooldownLeftMs(state, cat.id, nowSrv);
          const cdSec = Math.ceil(cdMs / 1000);
          return (
            <div key={cat.id} className="pol-card" data-testid={`policy-card-${cat.id}`}>
              <div className="pol-head">
                <div className="pol-head-title">
                  <PolicyCategoryIcon id={cat.id} size={20} />
                  <div>
                    <b>{cat.name}</b>
                    <small>{cat.desc}</small>
                  </div>
                </div>
                {cdSec > 0 && (
                  <span className="lv" style={{ color: 'var(--cy)', borderColor: 'rgba(92, 203, 255, 0.4)', background: 'rgba(92, 203, 255, 0.12)' }}>
                    <Clock size={11} />
                    {cdSec}s
                  </span>
                )}
              </div>

              <div className="pol-opts">
                {cat.options.map((opt) => {
                  const isActive = activeStance === opt.stance;
                  const check = canChangePolicyStance(state, cat.id, opt.stance, nowSrv);
                  return (
                    <button
                      key={opt.stance}
                      type="button"
                      className={`pol-opt${isActive ? ' on' : ''}`}
                      disabled={!isActive && !check.ok}
                      title={isActive ? 'Active policy' : check.reason}
                      onClick={() => {
                        if (!isActive) onChangePolicyStance(cat.id, opt.stance);
                      }}
                    >
                      <div className="pol-opt-top">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          {isActive && <CheckCircle2 size={13} color="#3fe0b0" />}
                          <span>{opt.label}</span>
                        </span>
                        <span style={{ color: isActive ? 'var(--mint)' : opt.cost > 0 ? 'var(--gold)' : 'var(--mu)', fontSize: 11.5 }}>
                          {isActive ? 'Active' : opt.cost > 0 ? `₨ ${formatNumber(opt.cost)}` : 'Free'}
                        </span>
                      </div>
                      <div className="pol-tags">
                        {opt.pros.map((p) => (
                          <span key={p} className="pol-pro">
                            {p}
                          </span>
                        ))}
                        {opt.cons.map((c) => (
                          <span key={c} className="pol-con">
                            {c}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {onSetBuildingPolicy && (() => {
        const ownedBldgs = BUILDINGS.filter((b) => (state.b?.[b.id] || 0) > 0);
        const targetBldg = ownedBldgs.find((b) => b.id === selectedBldgId) || ownedBldgs[0];
        return (
          <div className="gxc" style={{ marginBottom: 14 }} data-testid="building-policies-card">
            <div className="gxh" style={{ marginTop: 0 }}>
              <SlidersHorizontal size={15} color="#5ccbff" />
              <span>Building Operational Policies ({Object.keys(state.bPolicies || {}).length} Active)</span>
            </div>
            <p className="dim" style={{ marginBottom: 8 }}>
              Tune shifts, cleanrooms, robotics, or civic subsidies on individual owned building types. Incompatible sector policies cannot run simultaneously.
            </p>
            {!targetBldg ? (
              <p className="dim">Construct your first building to configure per-building operating charters.</p>
            ) : (
              <>
                <div className="fchips" style={{ marginBottom: 10 }}>
                  {ownedBldgs.map((b) => {
                    const activeId = getActiveBuildingPolicyId(state, b.id);
                    const isSel = b.id === targetBldg.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        className={`fchip ${isSel ? 'on' : ''}`}
                        onClick={() => setSelectedBldgId(b.id)}
                      >
                        <BuildingIcon id={b.id} size={13} />
                        <span>{b.n}</span>
                        {activeId !== 'standard' && <em style={{ color: 'var(--mint)', fontStyle: 'normal', marginLeft: 4 }}>●</em>}
                      </button>
                    );
                  })}
                </div>
                <div className="pol-opts">
                  {BUILDING_POLICIES.filter((p) => isBuildingPolicyAllowedFor(targetBldg, p)).map((pol) => {
                    const activeId = getActiveBuildingPolicyId(state, targetBldg.id);
                    const isActive = activeId === pol.id;
                    const check = canSetBuildingPolicy(state, targetBldg.id, pol.id);
                    return (
                      <button
                        key={pol.id}
                        type="button"
                        className={`pol-opt${isActive ? ' on' : ''}`}
                        disabled={!isActive && !check.ok}
                        title={isActive ? 'Active building policy' : check.reason}
                        onClick={() => {
                          if (!isActive) onSetBuildingPolicy(targetBldg.id, pol.id);
                        }}
                      >
                        <div className="pol-opt-top">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            {isActive && <CheckCircle2 size={13} color="#3fe0b0" />}
                            <span>{pol.name}</span>
                          </span>
                          <span style={{ color: isActive ? 'var(--mint)' : pol.applyCost > 0 ? 'var(--gold)' : 'var(--mu)', fontSize: 11.5 }}>
                            {isActive ? 'Active' : pol.applyCost > 0 ? `₨ ${formatNumber(pol.applyCost)}` : 'Free'}
                          </span>
                        </div>
                        <div className="pol-tags">
                          {pol.pros.map((p) => (
                            <span key={p} className="pol-pro">{p}</span>
                          ))}
                          {pol.cons.map((c) => (
                            <span key={c} className="pol-con">{c}</span>
                          ))}
                          {!isActive && !check.ok && check.reason && (
                            <span style={{ color: 'var(--gold)' }}>{check.reason}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        );
      })()}

      <div className="gxh">
        <Sparkles size={15} color="#ffc23d" />
        <span>Draft &amp; Commit Fiscal Reform</span>
      </div>
      <div className="preset-grid">
        {POLICY_PRESETS.map((preset) => {
          const isRec = recPreset.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`preset-btn${isRec ? ' rec-card' : ''}`}
              onClick={() => setDraft((prev) => presetToFiscalDraft(prev, preset.id))}
            >
              <b>
                {preset.label}
                {isRec && (
                  <span className="rec-badge" style={{ marginLeft: 6 }}>
                    <Sparkles size={10} />
                    <span>{recPreset.reason}</span>
                  </span>
                )}
              </b>
              <small>{preset.desc}</small>
            </button>
          );
        })}
      </div>

      <div className="gxc" style={{ marginBottom: 12 }}>
        <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SlidersHorizontal size={15} color="#5ccbff" />
          <b>{hasChanges ? 'Preview Fiscal Impact (Draft)' : 'Live Fiscal Breakdown'}</b>
        </p>
        <div className="fiscal-grid">
          <div className="fiscal-cell">
            <small>Gross / min</small>
            <b style={{ color: 'var(--gold)' }}>₨ {formatNumber(snap.buildingGross * 60)}</b>
          </div>
          <div className="fiscal-cell">
            <small>Maint &amp; Wages / min</small>
            <b style={{ color: 'var(--pink)' }}>−₨ {formatNumber((snap.maintCost + snap.salaryCost) * 60)}</b>
          </div>
          <div className="fiscal-cell">
            <small>Policy Spend / min</small>
            <b style={{ color: 'var(--cy)' }}>−₨ {formatNumber(snap.welfareCost * 60)}</b>
          </div>
          <div className="fiscal-cell">
            <small>Tax Evasion</small>
            <b style={{ color: ti.ev > 0.2 ? 'var(--pink)' : 'var(--mu)' }}>{Math.round(ti.ev * 100)}%</b>
          </div>
          <div className="fiscal-cell">
            <small>Net / min</small>
            <b style={{ color: 'var(--mint)' }}>₨ {formatNumber(snap.net * 60)}</b>
          </div>
          <div className="fiscal-cell">
            <small>Target Happiness</small>
            <b style={{ color: targHap >= 65 ? 'var(--mint)' : targHap >= 40 ? 'var(--gold)' : 'var(--pink)' }}>
              {targHap}%
            </b>
          </div>
        </div>
      </div>

      {(hasChanges || fiscalCdMs > 0) && (
        <div className="fiscal-commit" data-testid="fiscal-commit-bar">
          <div>
            <b style={{ fontSize: 13.5, display: 'block' }}>
              {hasChanges ? 'Pending Fiscal Draft Ready' : 'Fiscal Reform Cooldown'}
            </b>
            <small className="dim">
              {fiscalCdMs > 0
                ? `Next reform allowed in ${Math.ceil(fiscalCdMs / 1000)}s`
                : `Fee: ₨ ${formatNumber(fiscalCost)} Coins · 45s cooldown after commit`}
            </small>
          </div>
          <div className="fiscal-commit-acts">
            {hasChanges && (
              <button type="button" className="btn sm" onClick={handleRevertDraft}>
                Revert
              </button>
            )}
            <button
              type="button"
              className={`btn sm ${commitCheck.ok ? 'mint' : 'no'}`}
              disabled={!commitCheck.ok}
              title={commitCheck.reason}
              onClick={handleCommit}
            >
              {fiscalCdMs > 0
                ? `Wait ${Math.ceil(fiscalCdMs / 1000)}s`
                : `Commit Reform · ₨ ${formatNumber(fiscalCost)}`}
            </button>
          </div>
        </div>
      )}

      <div className="gxh">
        <Coins size={15} color="#ffc23d" />
        <span>Tax Rates</span>
      </div>
      {TAX_SLIDERS.map(renderSlider)}

      <div className="gxh">
        <Landmark size={15} color="#3fe0b0" />
        <span>National Spending &amp; Subsidies</span>
      </div>
      {SPENDING_SLIDERS.map(renderSlider)}

      <p className="dim" style={{ marginBottom: 12 }}>
        Target happiness: <b className="f" style={{ color: 'var(--mint)' }}>{targHap}%</b> ·
        Effective tax mult: <b className="f" style={{ color: 'var(--gold)' }}>×{ti.mult.toFixed(2)}</b>
        {ti.ev > 0.05 && ` (Tax evasion: ${Math.round(ti.ev * 100)}%)`}
      </p>

      <div className="gxc" style={{ marginBottom: 12 }}>
        <h2 style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Landmark size={18} color="#ffc23d" />
          <span>Government</span>
        </h2>
        <p className="dim" style={{ marginBottom: 10 }}>
          Current: <b>{gov.n}</b> — {gov.d}.
          {govCd > 0 ? ` Next change in ${Math.ceil(govCd / 3_600_000)}h.` : ''}
        </p>
        <div className="list g2">
          {GOVS.map((g) => {
            const active = g.id === gov.id;
            const disabled = active || govCd > 0 || state.cash < g.cost;
            return (
              <div key={g.id} className="gxc" style={{ marginBottom: 0 }}>
                <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <GovTypeIcon id={g.id} size={16} />
                  <span>{g.n}</span>
                </b>
                <p className="dim">{g.d}</p>
                <button
                  type="button"
                  className={`btn sm ${disabled ? 'no' : 'gold'}`}
                  disabled={disabled}
                  onClick={() => onChangeGov(g.id)}
                >
                  {active ? 'Active' : g.cost ? `₨ ${formatNumber(g.cost)}` : 'Free'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="gxc" style={{ marginBottom: 12 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Globe size={18} color="#5ccbff" />
          <span>World Events</span>
        </h2>
        <p className="dim" style={{ marginTop: 4 }}>
          {worldEv ? (
            <>
              <b className="ok">
                {worldEv.ev.n}: ×{worldEv.ev.m} income
              </b>{' '}
              — {Math.ceil(worldEv.left / 1000)}s left
            </>
          ) : (
            'No world event right now. Check back soon.'
          )}
        </p>
        <p className="cnote">
          Global boosts appear on a fixed server-time schedule — same for every player.
        </p>
      </div>

      {!uid && (
        <button type="button" className="btn" style={{ width: '100%', marginTop: 4 }} onClick={onResetGame}>
          <RefreshCw size={15} />
          <span>New Game</span>
        </button>
      )}
      {uid && (
        <button type="button" className="btn mint" style={{ width: '100%', marginTop: 8 }} onClick={onSaveCloudNow}>
          <Cloud size={16} />
          <span>Save to cloud now</span>
        </button>
      )}
    </div>
  );
}, (prev, next) => {
  if (
    prev.serverOffsetMs !== next.serverOffsetMs ||
    prev.uid !== next.uid ||
    prev.onCommitFiscalReform !== next.onCommitFiscalReform ||
    prev.onChangePolicyStance !== next.onChangePolicyStance ||
    prev.onSetBuildingPolicy !== next.onSetBuildingPolicy ||
    prev.onChangeGov !== next.onChangeGov ||
    prev.onResetGame !== next.onResetGame ||
    prev.onSaveCloudNow !== next.onSaveCloudNow
  ) {
    return false;
  }
  const p = prev.state;
  const n = next.state;
  if (
    p.cash !== n.cash ||
    p.gov !== n.gov ||
    p.govT !== n.govT ||
    p.rank !== n.rank ||
    p.boost !== n.boost ||
    Math.round(p.pop) !== Math.round(n.pop) ||
    p.b !== n.b ||
    p.bPolicies !== n.bPolicies ||
    p.stk !== n.stk ||
    p.tech !== n.tech ||
    p.pol !== n.pol ||
    p.decisionsCd !== n.decisionsCd ||
    p.milestones !== n.milestones ||
    p.boosterCd !== n.boosterCd ||
    (p.gx.blk > 0) !== (n.gx.blk > 0) ||
    p.gx.pb !== n.gx.pb ||
    p.gx.ph !== n.gx.ph ||
    p.gx.cond !== n.gx.cond ||
    p.gx.lvl !== n.gx.lvl ||
    p.activeFx !== n.activeFx ||
    p.sub !== n.sub
  ) {
    return false;
  }
  for (const s of TAX_SLIDERS) {
    if (p[s.key] !== n[s.key]) return false;
  }
  for (const s of SPENDING_SLIDERS) {
    if (p[s.key] !== n[s.key]) return false;
  }
  const pNow = (p.t || 0) + prev.serverOffsetMs;
  const nNow = (n.t || 0) + next.serverOffsetMs;
  if (currentWorldEvent(pNow) !== null || currentWorldEvent(nNow) !== null) return false;
  if (getFiscalCooldownLeftMs(p, pNow) > 0 || getFiscalCooldownLeftMs(n, nNow) > 0) {
    return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
  }
  for (const cat of NATIONAL_POLICIES) {
    if (getPolicyCooldownLeftMs(p, cat.id, pNow) > 0 || getPolicyCooldownLeftMs(n, cat.id, nNow) > 0) {
      return Math.floor(pNow / 1000) === Math.floor(nNow / 1000);
    }
  }
  const pCdHours = Math.max(0, Math.ceil(((p.govT || 0) + GOV_CHANGE_CD_MS - pNow) / 3_600_000));
  const nCdHours = Math.max(0, Math.ceil(((n.govT || 0) + GOV_CHANGE_CD_MS - nNow) / 3_600_000));
  return pCdHours === nCdHours;
});
