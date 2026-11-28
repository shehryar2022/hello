import React, { memo, useMemo } from 'react';
import { GDP_TARGET } from '../game/constants';
import {
  computeEconomySnapshot,
  formatNumber,
  getActiveShopIncomeBooster,
  getActiveSubscription,
  getBoosterActivationInfo,
} from '../game/rules';
import { getEquippedCosmetics } from '../game/cosmetics';
import type {
  BuildingPolicyId,
  CityTimeMode,
  CityWeatherMode,
  GameState,
  GraphicsSettings,
  RuntimePerfStats,
} from '../game/types';
import { City3D } from './City3D';
import { CosmeticCardWrap } from './CosmeticIdentity';
import {
  Activity,
  Briefcase,
  CashCoinIcon,
  Coins,
  Flame,
  GemDiamondIcon,
  Home,
  Shield,
  Smile,
  SubIcon,
  TrendingUp,
  Users,
  Vote,
  Zap,
} from './GameIcons';

interface HeroPanelProps {
  state: GameState;
  graphics: GraphicsSettings;
  tradeTier: number;
  serverOffsetMs?: number;
  showCity: boolean;
  hidden?: boolean;
  hiddenMobile?: boolean;
  selectedBuildingId: string | null;
  focusRequest?: { id: string; seq: number } | null;
  previewAnimId?: string;
  previewLandmarkId?: string | null;
  landmarkFocusRequest?: { id: string; seq: number } | null;
  onCollectTax: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onActivateGemBoost: () => void;
  onSelectBuilding: (id: string | null) => void;
  onBuyBuilding: (id: string, qty: 1 | 5) => void;
  onUpgradeBuilding: (id: string) => void;
  onDemolishBuilding: (id: string, qty: 1 | 5) => void;
  onSetBuildingPolicy: (id: string, policyId: BuildingPolicyId) => void;
  onChangeTimeMode: (mode: CityTimeMode) => void;
  onChangeWeather: (mode: CityWeatherMode) => void;
  onPerfStats: (stats: RuntimePerfStats) => void;
}

export const HeroPanel: React.FC<HeroPanelProps> = memo(({
  state,
  graphics,
  tradeTier,
  serverOffsetMs = 0,
  showCity,
  hidden = false,
  hiddenMobile = false,
  selectedBuildingId,
  focusRequest,
  previewAnimId,
  previewLandmarkId = null,
  landmarkFocusRequest,
  onCollectTax,
  onActivateGemBoost,
  onSelectBuilding,
  onBuyBuilding,
  onUpgradeBuilding,
  onDemolishBuilding,
  onSetBuildingPolicy,
  onChangeTimeMode,
  onChangeWeather,
  onPerfStats,
}) => {
  const now = (state.t || Date.now()) + serverOffsetMs;
  const equipped = getEquippedCosmetics(state);
  const heroAnimId = previewAnimId || equipped.anim;
  const snap = useMemo(
    () => computeEconomySnapshot(state, { tradeTier, nowMs: now }),
    [state, tradeTier, now],
  );
  const perMin = snap.net * 60;
  const shopBoost = useMemo(() => getActiveShopIncomeBooster(state, now), [state, now]);
  const activeSub = useMemo(() => getActiveSubscription(state, now), [state, now]);
  const prodInfo = useMemo(() => getBoosterActivationInfo(state, 'prod_boost', now), [state, now]);
  const speedInfo = useMemo(() => getBoosterActivationInfo(state, 'build_speed_boost', now), [state, now]);

  const statItems = [
    { icon: <Smile size={15} color="#3fe0b0" />, label: 'Happiness', pct: state.hap, color: '#3fe0b0', text: `${Math.round(state.hap)}%` },
    { icon: <Vote size={15} color="#5ccbff" />, label: 'Approval', pct: state.appr, color: '#5ccbff', text: `${Math.round(state.appr)}%` },
    { icon: <Users size={15} color="#a58cff" />, label: 'Population', pct: Math.min(100, state.pop), color: '#a58cff', text: `${state.pop.toFixed(1)}M` },
    { icon: <TrendingUp size={15} color="#ffc23d" />, label: 'Real GDP', pct: Math.min(100, (snap.realGdp / GDP_TARGET) * 100), color: '#ffc23d', text: `₨ ${formatNumber(snap.realGdp)}` },
  ];

  return (
    <div
      className={`list hero-col${hidden || hiddenMobile ? ' is-hidden-dashboard' : ''}`}
      data-testid="city-dashboard"
    >
      <CosmeticCardWrap
        animId={heroAnimId}
        premiumVfxId={equipped.premiumVfx}
        animationsEnabled={state.set?.anim !== 0 && !graphics.reducedMotion && graphics.uiEffectsEnabled !== false}
        className="card hero"
      >
        <div className="inc">
          <span className="lab">
            <TrendingUp size={14} color="#3fe0b0" />
            National Income per minute
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
            {prodInfo.active && (
              <span className="boost">
                <Activity size={13} /> +30% Prod {prodInfo.activeLeftSec}s
              </span>
            )}
            {speedInfo.active && (
              <span className="boost">
                <Zap size={13} /> 2× Build {speedInfo.activeLeftSec}s
              </span>
            )}
            {!!state.activeFx?.taxSurge && (
              <span className="boost">
                <Coins size={13} /> Tax Surge Ready
              </span>
            )}
          </small>
        </div>

        <City3D
          state={state}
          graphics={graphics}
          visible={showCity}
          tradeTier={tradeTier}
          serverOffsetMs={serverOffsetMs}
          selectedBuildingId={selectedBuildingId}
          focusRequest={focusRequest}
          previewLandmarkId={previewLandmarkId}
          landmarkFocusRequest={landmarkFocusRequest}
          onSelectBuilding={onSelectBuilding}
          onBuyBuilding={onBuyBuilding}
          onUpgradeBuilding={onUpgradeBuilding}
          onDemolishBuilding={onDemolishBuilding}
          onSetBuildingPolicy={onSetBuildingPolicy}
          onChangeTimeMode={onChangeTimeMode}
          onChangeWeather={onChangeWeather}
          onPerfStats={onPerfStats}
        />

        <div className="hero-macro">
          <div className="hero-macro-cell">
            <small>
              <Zap size={11} color={snap.energyRatio >= 1 ? '#3fe0b0' : '#ff6fa5'} />
              Grid MW
            </small>
            <b style={{ color: snap.energyRatio >= 1 ? 'var(--mint)' : 'var(--pink)' }}>
              {snap.energySupply}/{snap.energyDemand}
            </b>
          </div>
          <div className="hero-macro-cell">
            <small>
              <Home size={11} color={snap.housingRatio >= 1 ? '#3fe0b0' : '#ffc23d'} />
              Housing
            </small>
            <b style={{ color: snap.housingRatio >= 0.9 ? 'var(--mint)' : 'var(--gold)' }}>
              {Math.round(snap.housingRatio * 100)}%
            </b>
          </div>
          <div className="hero-macro-cell">
            <small>
              <Shield size={11} color="#5ccbff" />
              Safety
            </small>
            <b style={{ color: snap.publicSafetyScore >= 60 ? 'var(--mint)' : 'var(--gold)' }}>
              {Math.round(snap.publicSafetyScore)}%
            </b>
          </div>
          <div className="hero-macro-cell">
            <small>
              <Briefcase size={11} color="#a58cff" />
              Jobs
            </small>
            <b style={{ color: snap.employmentRate >= 0.65 ? 'var(--mint)' : 'var(--gold)' }}>
              {Math.round(snap.employmentRate * 100)}%
            </b>
          </div>
          <div className="hero-macro-cell">
            <small>
              <Activity size={11} color={snap.pollutionLevel <= 35 ? '#3fe0b0' : '#ff6fa5'} />
              Pollution
            </small>
            <b style={{ color: snap.pollutionLevel <= 30 ? 'var(--mint)' : snap.pollutionLevel <= 55 ? 'var(--gold)' : 'var(--pink)' }}>
              {Math.round(snap.pollutionLevel)}%
            </b>
          </div>
          <div className="hero-macro-cell">
            <small>
              <TrendingUp size={11} color={snap.inflationRate <= 3.5 ? '#3fe0b0' : '#ffc23d'} />
              Inflation
            </small>
            <b style={{ color: snap.inflationRate <= 3.2 ? 'var(--mint)' : snap.inflationRate <= 6 ? 'var(--gold)' : 'var(--pink)' }}>
              {snap.inflationRate.toFixed(1)}%
            </b>
          </div>
        </div>

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
      </CosmeticCardWrap>

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
});
