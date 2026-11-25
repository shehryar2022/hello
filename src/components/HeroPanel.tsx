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
import {
  CashCoinIcon,
  Coins,
  Flame,
  GemDiamondIcon,
  Smile,
  SubIcon,
  TrendingUp,
  Users,
  Vote,
  Zap,
} from './GameIcons';

interface HeroPanelProps {
  state: GameState;
  tradeTier: number;
  serverOffsetMs?: number;
  showCity: boolean;
  burstKey: number;
  onCollectTax: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onActivateGemBoost: () => void;
  onCityBuildingTap: (clientX?: number, clientY?: number) => void;
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
    { icon: <Smile size={15} color="#3fe0b0" />, label: 'Happiness', pct: state.hap, color: '#3fe0b0', text: `${Math.round(state.hap)}%` },
    { icon: <Vote size={15} color="#5ccbff" />, label: 'Approval', pct: state.appr, color: '#5ccbff', text: `${Math.round(state.appr)}%` },
    { icon: <Users size={15} color="#a58cff" />, label: 'Population', pct: Math.min(100, state.pop), color: '#a58cff', text: `${state.pop.toFixed(1)}M` },
    { icon: <TrendingUp size={15} color="#ffc23d" />, label: 'GDP', pct: Math.min(100, (pGdp / GDP_TARGET) * 100), color: '#ffc23d', text: `₨ ${formatNumber(pGdp)}` },
  ];

  return (
    <div className="list">
      <div className="card hero">
        <div className="inc">
          <span className="lab">
            <TrendingUp size={14} color="#3fe0b0" />
            Income per minute
          </span>
          <div className="num">
            <span data-testid="income-per-min">{perMin < 100 ? perMin.toFixed(1) : formatNumber(perMin)}</span>
            <em>/min</em>
          </div>
          <small id="net">
            <span>
              <CashCoinIcon size={14} /> Tax Pool: ₨ {formatNumber(state.taxPool || 0)}
            </span>
            {activeSub && (
              <span className={`sub-crest sub-crest--${activeSub.def.id}`}>
                <span className="sub-crest-ic">
                  <SubIcon tier={activeSub.def.id} size={12} />
                </span>
                <span>
                  {activeSub.def.periodLabel} (+{Math.round((activeSub.def.incomeMult - 1) * 100)}% inc · {Math.round(activeSub.def.discountRate * 100)}% off)
                </span>
              </span>
            )}
            {state.boost > 0 && (
              <span className="boost">
                <Zap size={13} /> ×2 {Math.ceil(state.boost)}s
              </span>
            )}
            {shopBoost.active && (
              <span className="boost">
                <Flame size={13} /> ×{shopBoost.mult} {shopBoost.leftSec}s
              </span>
            )}
            {!!state.activeFx?.taxSurge && (
              <span className="boost">
                <Coins size={13} /> Tax Surge Ready
              </span>
            )}
          </small>
        </div>

        <City3D state={state} visible={showCity} burstKey={burstKey} onBuildingTap={onCityBuildingTap} />

        <div className="hero-acts">
          <button type="button" className="btn gold collect" id="col" onClick={onCollectTax}>
            <CashCoinIcon size={20} />
            <span>Collect tax (₨ {formatNumber(Math.floor(state.taxPool || 0))})</span>
          </button>
          <button
            type="button"
            className="btn sm"
            id="bst"
            disabled={state.gems < 5 || state.boost > 0}
            onClick={onActivateGemBoost}
          >
            <Zap size={15} color="#ffc23d" />
            {state.boost > 0 ? (
              <span>Boost active ({Math.ceil(state.boost)}s)</span>
            ) : (
              <>
                <span>Boost ×2 for 30s · 5</span>
                <GemDiamondIcon size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="card stats" id="stats">
        {statItems.map((item) => (
          <div key={item.label} className="st">
            <span className="ic">
              {item.icon}
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
