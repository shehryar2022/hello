import React from 'react';
import { GOV_CHANGE_CD_MS, GOVS } from '../../game/constants';
import {
  currentWorldEvent,
  formatNumber,
  getGovDefinition,
  targetHappiness,
  taxInfo,
} from '../../game/rules';
import type { GameState } from '../../game/types';

interface PolicyTabProps {
  state: GameState;
  uid: string | null;
  serverOffsetMs: number;
  onPolicyChange: (key: keyof GameState, value: number) => void;
  onChangeGov: (govId: string) => void;
  onResetGame: () => void;
  onSaveCloudNow: () => void;
}

const SLIDERS: Array<{
  key: keyof GameState;
  label: string;
  min: number;
  max: number;
  desc: string;
  color: string;
}> = [
  { key: 'tax', label: '💸 Income tax', min: 5, max: 45, desc: 'Higher tax = more cash, unhappy people.', color: 'var(--gold)' },
  { key: 'fuel', label: '⛽ Fuel tax', min: 0, max: 50, desc: 'Extra revenue from fuel — but the public hates it.', color: '#ff9a4d' },
  { key: 'carbon', label: '🌱 Carbon tax', min: 0, max: 30, desc: 'Big revenue, hurts happiness — each Solar Farm offsets 3% penalty.', color: '#8bbd8b' },
  { key: 'luxury', label: '💎 Luxury tax', min: 0, max: 25, desc: 'Taxes the rich. Good revenue, small happiness hit.', color: '#e0b81a' },
  { key: 'corp', label: '🏢 Corporate tax', min: 0, max: 30, desc: 'Taxes businesses. Steady income, hurts approval.', color: '#c97a3d' },
  { key: 'gst', label: '🛒 Sales tax (GST)', min: 0, max: 25, desc: 'Taxes every purchase. Mild public anger.', color: '#4cc9ff' },
  { key: 'prop', label: '🏠 Property tax', min: 0, max: 15, desc: 'Scales with population. Biggest happiness hit.', color: '#ff6fa3' },
  { key: 'duty', label: '🚢 Import duty', min: 0, max: 30, desc: 'Customs on imports. Each Port boosts the revenue.', color: '#a07bff' },
  { key: 'wel', label: '🏥 Welfare spending', min: 0, max: 50, desc: 'Costs a share of income, raises happiness & approval.', color: 'var(--mint)' },
  { key: 'edu', label: '🎓 Education', min: 0, max: 30, desc: 'Long-term: raises income and happiness.', color: 'var(--cy)' },
];

export const PolicyTab: React.FC<PolicyTabProps> = ({
  state,
  uid,
  serverOffsetMs,
  onPolicyChange,
  onChangeGov,
  onResetGame,
  onSaveCloudNow,
}) => {
  const nowSrv = Date.now() + serverOffsetMs;
  const ti = taxInfo(state);
  const gov = getGovDefinition(state);
  const govCd = Math.max(0, (state.govT || 0) + GOV_CHANGE_CD_MS - nowSrv);
  const worldEv = currentWorldEvent(nowSrv);

  return (
    <div>
      {SLIDERS.map((s) => {
        const val = Number(state[s.key] || 0);
        const pct = ((val - s.min) / (s.max - s.min)) * 100;
        return (
          <div key={s.key} className="sl" style={{ '--ac': s.color } as React.CSSProperties}>
            <div>
              <span>{s.label}</span>
              <b className="f">{val}%</b>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              value={val}
              aria-label={s.label}
              style={{ '--p': `${pct}%` } as React.CSSProperties}
              onChange={(e) => onPolicyChange(s.key, Number(e.target.value))}
            />
            <p className="dim">{s.desc}</p>
          </div>
        );
      })}

      <p className="dim" style={{ marginBottom: 12 }}>
        Target happiness: <b className="f" style={{ color: 'var(--mint)' }}>{Math.round(targetHappiness(state))}%</b> ·
        Effective tax mult: <b className="f" style={{ color: 'var(--gold)' }}>×{ti.mult.toFixed(2)}</b>
        {ti.ev > 0.05 && ` (Tax evasion: ${Math.round(ti.ev * 100)}%)`}
      </p>

      <div className="gxc" style={{ marginBottom: 12 }}>
        <h2 style={{ marginBottom: 4 }}>🏛️ Government</h2>
        <p className="dim" style={{ marginBottom: 10 }}>
          Current: <b>{gov.e} {gov.n}</b> — {gov.d}.
          {govCd > 0 ? ` Next change in ${Math.ceil(govCd / 3_600_000)}h.` : ''}
        </p>
        <div className="list g2">
          {GOVS.map((g) => {
            const active = g.id === gov.id;
            const disabled = active || govCd > 0 || state.cash < g.cost;
            return (
              <div key={g.id} className="gxc" style={{ marginBottom: 0 }}>
                <b>
                  {g.e} {g.n}
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
        <h2>🌍 World Events</h2>
        <p className="dim" style={{ marginTop: 4 }}>
          {worldEv ? (
            <>
              <b className="ok">
                {worldEv.ev.e} {worldEv.ev.n}: ×{worldEv.ev.m} income
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
          ♻️ New Game
        </button>
      )}
      {uid && (
        <button type="button" className="btn mint" style={{ width: '100%', marginTop: 8 }} onClick={onSaveCloudNow}>
          ☁️ Save to cloud now
        </button>
      )}
    </div>
  );
};
