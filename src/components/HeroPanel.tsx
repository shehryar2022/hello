import React from 'react';
import { GDP_TARGET } from '../game/constants';
import {
  calculateGdp,
  calculateIncome,
  formatNumber,
  getActiveShopIncomeBooster,
  getActiveSubscription,
} from '../game/rules';
import type { GameState } from '../game/types';
import { City3D } from './City3D';

interface HeroPanelProps {
  state: GameState;
  tradeTier: number;
  serverOffsetMs?: number;
  showCity: boolean;
  burstKey: number;
  onCollectTax: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onActivateGemBoost: () => void;
  onCityBuildingTap: () => void;
}

export const HeroPanel: React.FC<HeroPanelProps> = ({
  state,
  tradeTier,
  serverOffsetMs = 0,
  showCity,
  burstKey,
  onCollectTax,
  onActivateGemBoost,
  onCityBuildingTap,
}) => {
  const now = Date.now() + serverOffsetMs;
  const inc = calculateIncome(state, { tradeTier, nowMs: now });
  const perMin = inc.net * 60;
  const shopBoost = getActiveShopIncomeBooster(state, now);
  const activeSub = getActiveSubscription(state, now);
  const pGdp = calculateGdp(state);

  const statItems = [
    { icon: '🙂', label: 'Happiness', pct: state.hap, color: '#37e6a0', text: `${Math.round(state.hap)}%` },
    { icon: '🗳️', label: 'Approval', pct: state.appr, color: '#3fd2ff', text: `${Math.round(state.appr)}%` },
    { icon: '👥', label: 'Population', pct: Math.min(100, state.pop), color: '#a56bff', text: `${state.pop.toFixed(1)}M` },
    { icon: '💲', label: 'GDP', pct: Math.min(100, (pGdp / GDP_TARGET) * 100), color: '#ffc93c', text: `₨ ${formatNumber(pGdp)}` },
  ];

  return (
    <div className="list">
      <div className="card hero">
        <div className="inc">
          <span className="lab">💸 Income per minute</span>
          <div className="num">
            <span data-testid="income-per-min">{perMin < 100 ? perMin.toFixed(1) : formatNumber(perMin)}</span>
            <em>/min</em>
          </div>
          <small id="net">
            <span>🪙 Tax Pool: ₨ {formatNumber(state.taxPool || 0)}</span>
            {activeSub && (
              <span className="boost">
                {activeSub.def.e} {activeSub.def.periodLabel} (+{Math.round((activeSub.def.incomeMult - 1) * 100)}% inc · {Math.round(activeSub.def.discountRate * 100)}% off)
              </span>
            )}
            {state.boost > 0 && <span className="boost">⚡ ×2 {Math.ceil(state.boost)}s</span>}
            {shopBoost.active && (
              <span className="boost">
                🔥 ×{shopBoost.mult} {shopBoost.leftSec}s
              </span>
            )}
            {!!state.activeFx?.taxSurge && <span className="boost">💵 Tax Surge Ready</span>}
          </small>
        </div>

        <City3D state={state} visible={showCity} burstKey={burstKey} onBuildingTap={onCityBuildingTap} />

        <div className="hero-acts">
          <button type="button" className="btn gold collect" id="col" onClick={onCollectTax}>
            <span aria-hidden="true" style={{ fontSize: 19, lineHeight: 1 }}>🪙</span>
            Collect tax (₨ {formatNumber(Math.floor(state.taxPool || 0))})
          </button>
          <button
            type="button"
            className="btn sm"
            id="bst"
            disabled={state.gems < 5 || state.boost > 0}
            onClick={onActivateGemBoost}
          >
            {state.boost > 0
              ? `⚡ Boost active (${Math.ceil(state.boost)}s)`
              : '⚡ Boost ×2 for 30s · 5 💎'}
          </button>
        </div>
      </div>

      <div className="card stats" id="stats">
        {statItems.map((item) => (
          <div key={item.label} className="st">
            <span className="ic">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </span>
            <b>{item.text}</b>
            <div className="bar">
              <i style={{ width: `${Math.max(0, Math.min(100, item.pct))}%`, '--c': item.color } as React.CSSProperties} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
