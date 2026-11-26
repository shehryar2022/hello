import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GOV_CHANGE_CD_MS, GOVS, POLICY_PRESETS } from '../../game/constants';
import {
  calculateIncome,
  currentWorldEvent,
  formatNumber,
  getGovDefinition,
  getRecommendedPolicyHint,
  targetHappiness,
  taxInfo,
} from '../../game/rules';
import type { GameState } from '../../game/types';
import {
  Cloud,
  Coins,
  Globe,
  GovTypeIcon,
  Landmark,
  PolicyIcon,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from '../GameIcons';

interface PolicyTabProps {
  state: GameState;
  uid: string | null;
  serverOffsetMs: number;
  onPolicyChange: (key: keyof GameState, value: number) => void;
  onApplyPreset: (presetId: 'balanced' | 'revenue' | 'welfare') => void;
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
  { key: 'carbon', label: 'Carbon tax', min: 0, max: 30, desc: 'Big revenue — Solar, Hydro, Fusion & Green Subsidies offset penalty.', color: '#8bbd8b' },
  { key: 'luxury', label: 'Luxury tax', min: 0, max: 25, desc: 'Taxes the rich. Good revenue, small happiness hit.', color: '#e0b81a' },
  { key: 'corp', label: 'Corporate tax', min: 0, max: 30, desc: 'Taxes businesses; Stock Exchanges amplify revenue.', color: '#c97a3d' },
  { key: 'gst', label: 'Sales tax (GST)', min: 0, max: 25, desc: 'Taxes every purchase. Mild public anger.', color: '#4cc9ff' },
  { key: 'prop', label: 'Property tax', min: 0, max: 15, desc: 'Scales with population. Biggest happiness hit.', color: '#ff6fa3' },
  { key: 'duty', label: 'Import duty', min: 0, max: 30, desc: 'Customs on imports. Each Port boosts the revenue.', color: '#a07bff' },
  { key: 'tourism', label: 'Tourism levy', min: 0, max: 20, desc: 'Visitor tax boosted by Airports & Stadiums; tiny happiness cost.', color: '#38bdf8' },
  { key: 'digital', label: 'Digital economy tax', min: 0, max: 20, desc: 'Online commerce levy boosted by Tech Parks, Data Centers & Fabs.', color: '#a78bfa' },
  { key: 'wealth', label: 'Ultra-wealth levy', min: 0, max: 20, desc: 'Taxes top fortunes; boosted by Central Banks with minimal evasion.', color: '#f472b6' },
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
  { key: 'green', label: 'Green energy subsidy', min: 0, max: 25, desc: 'Boosts happiness, cuts carbon penalty & powers Solar/Hydro/Fusion.', color: '#4ade80' },
  { key: 'transitSub', label: 'Public transit subsidy', min: 0, max: 25, desc: 'Boosts happiness & multiplies Metro Transit + Railway Hub output.', color: '#22d3ee' },
];

export const PolicyTab: React.FC<PolicyTabProps> = memo(({
  state,
  uid,
  serverOffsetMs,
  onPolicyChange,
  onApplyPreset,
  onChangeGov,
  onResetGame,
  onSaveCloudNow,
}) => {
  const [draft, setDraft] = useState<Partial<Record<keyof GameState, number>>>({});
  const timersRef = useRef<Partial<Record<string, number>>>({});
  const draftRef = useRef<Partial<Record<keyof GameState, number>>>({});
  draftRef.current = draft;

  const clearAllDraftTimers = useCallback(() => {
    for (const key of Object.keys(timersRef.current)) {
      const tid = timersRef.current[key];
      if (tid) window.clearTimeout(tid);
      delete timersRef.current[key];
    }
  }, []);

  useEffect(() => clearAllDraftTimers, [clearAllDraftTimers]);

  // Clear local draft entries once committed props match or remote reset happens
  useEffect(() => {
    setDraft((prev) => {
      const keys = Object.keys(prev) as Array<keyof GameState>;
      if (!keys.length) return prev;
      let changed = false;
      const next = { ...prev };
      for (const k of keys) {
        if (Number(state[k] || 0) === next[k] && !timersRef.current[k as string]) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [state]);

  const effectiveState = useMemo(
    () => (Object.keys(draft).length ? ({ ...state, ...draft } as GameState) : state),
    [state, draft],
  );

  const nowSrv = (state.t || Date.now()) + serverOffsetMs;
  const ti = useMemo(() => taxInfo(effectiveState), [effectiveState]);
  const inc = useMemo(() => calculateIncome(effectiveState, { nowMs: nowSrv }), [effectiveState, nowSrv]);
  const gov = useMemo(() => getGovDefinition(effectiveState), [effectiveState]);
  const govCd = Math.max(0, (state.govT || 0) + GOV_CHANGE_CD_MS - nowSrv);
  const worldEv = currentWorldEvent(nowSrv);
  const targHap = useMemo(() => Math.round(targetHappiness(effectiveState)), [effectiveState]);
  const recPreset = useMemo(() => getRecommendedPolicyHint(effectiveState), [effectiveState]);

  const flushSlider = useCallback(
    (key: keyof GameState, value?: number) => {
      const kStr = key as string;
      const tid = timersRef.current[kStr];
      if (tid) {
        window.clearTimeout(tid);
        delete timersRef.current[kStr];
      }
      const nextVal = value ?? draftRef.current[key];
      if (typeof nextVal === 'number' && Number(state[key] || 0) !== nextVal) {
        onPolicyChange(key, nextVal);
      }
    },
    [onPolicyChange, state],
  );

  const handleSliderInput = useCallback(
    (key: keyof GameState, val: number) => {
      setDraft((prev) => ({ ...prev, [key]: val }));
      const kStr = key as string;
      const prevTimer = timersRef.current[kStr];
      if (prevTimer) window.clearTimeout(prevTimer);
      timersRef.current[kStr] = window.setTimeout(() => {
        delete timersRef.current[kStr];
        onPolicyChange(key, val);
      }, 75);
    },
    [onPolicyChange],
  );

  const renderSlider = (s: (typeof TAX_SLIDERS)[number]) => {
    const val = draft[s.key] ?? Number(state[s.key] || 0);
    const pct = Math.max(0, Math.min(100, ((val - s.min) / (s.max - s.min)) * 100));
    return (
      <div key={s.key} className="sl" style={{ '--ac': s.color } as React.CSSProperties}>
        <div>
          <span>
            <PolicyIcon k={s.key as string} size={15} />
            {s.label}
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
          onPointerUp={(e) => flushSlider(s.key, Number(e.currentTarget.value))}
          onBlur={(e) => flushSlider(s.key, Number(e.currentTarget.value))}
          onKeyUp={(e) => flushSlider(s.key, Number(e.currentTarget.value))}
        />
        <p className="dim">{s.desc}</p>
      </div>
    );
  };

  return (
    <div>
      <div className="gxh" style={{ marginTop: 0 }}>
        <Sparkles size={15} color="#ffc23d" />
        <span>Quick Policy Presets</span>
      </div>
      <div className="preset-grid">
        {POLICY_PRESETS.map((preset) => {
          const isRec = recPreset.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className={`preset-btn${isRec ? ' rec-card' : ''}`}
              onClick={() => {
                clearAllDraftTimers();
                setDraft({});
                onApplyPreset(preset.id);
              }}
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
          <b>Live Fiscal Breakdown</b>
        </p>
        <div className="fiscal-grid">
          <div className="fiscal-cell">
            <small>Gross / min</small>
            <b style={{ color: 'var(--gold)' }}>₨ {formatNumber(inc.gross * 60)}</b>
          </div>
          <div className="fiscal-cell">
            <small>City Upkeep</small>
            <b style={{ color: 'var(--pink)' }}>−{Math.round(inc.upkeepRate * 100)}%</b>
          </div>
          <div className="fiscal-cell">
            <small>Policy Spend</small>
            <b style={{ color: 'var(--cy)' }}>−{Math.round(inc.policySpendShare * 100)}%</b>
          </div>
          <div className="fiscal-cell">
            <small>Tax Evasion</small>
            <b style={{ color: ti.ev > 0.2 ? 'var(--pink)' : 'var(--mu)' }}>{Math.round(ti.ev * 100)}%</b>
          </div>
          <div className="fiscal-cell">
            <small>Net / min</small>
            <b style={{ color: 'var(--mint)' }}>₨ {formatNumber(inc.net * 60)}</b>
          </div>
          <div className="fiscal-cell">
            <small>Target Happiness</small>
            <b style={{ color: targHap >= 65 ? 'var(--mint)' : targHap >= 40 ? 'var(--gold)' : 'var(--pink)' }}>
              {targHap}%
            </b>
          </div>
        </div>
      </div>

      <div className="gxh">
        <Coins size={15} color="#ffc23d" />
        <span>Tax Policies</span>
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
    prev.uid !== next.uid ||
    prev.onPolicyChange !== next.onPolicyChange ||
    prev.onApplyPreset !== next.onApplyPreset ||
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
    p.stk !== n.stk ||
    p.tech !== n.tech ||
    p.gx !== n.gx ||
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
  const pCdHours = Math.max(0, Math.ceil(((p.govT || 0) + GOV_CHANGE_CD_MS - pNow) / 3_600_000));
  const nCdHours = Math.max(0, Math.ceil(((n.govT || 0) + GOV_CHANGE_CD_MS - nNow) / 3_600_000));
  return pCdHours === nCdHours;
});
