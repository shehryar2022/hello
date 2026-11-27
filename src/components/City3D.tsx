import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CloudRain,
  Compass,
  Expand,
  Hammer,
  Minimize2,
  Moon,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  Sun,
  Sunset,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CityEngine, type CameraPresetMode } from '../city3d/CityEngine';
import { BUILDING_CATEGORIES, BUILDING_POLICIES, BUILDINGS } from '../game/constants';
import {
  buildingCost,
  bulkBuildingCost,
  canDemolishBuilding,
  canSetBuildingPolicy,
  canStartBuildingConstruction,
  computeEconomySnapshot,
  formatNumber,
  getActiveBuildingPolicyId,
  getBuildingPolicyDef,
  getConstructionQueue,
  getDemolishRefund,
  getDevelopmentDiscount,
  gxLevelMult,
  gxUpgradeCost,
  isBuildingPolicyAllowedFor,
  totalBuildings,
} from '../game/rules';
import type {
  BuildingPolicyId,
  CityTimeMode,
  CityWeatherMode,
  GameState,
  GraphicsSettings,
  RuntimePerfStats,
} from '../game/types';
import { BuildingIcon, CashCoinIcon } from './GameIcons';

export interface City3DProps {
  state: GameState;
  graphics: GraphicsSettings;
  visible: boolean;
  tradeTier?: number;
  serverOffsetMs?: number;
  selectedBuildingId: string | null;
  focusRequest?: { id: string; seq: number } | null;
  previewLandmarkId?: string | null;
  landmarkFocusRequest?: { id: string; seq: number } | null;
  onSelectBuilding: (id: string | null) => void;
  onBuyBuilding: (id: string, qty: 1 | 5) => void;
  onUpgradeBuilding: (id: string) => void;
  onDemolishBuilding: (id: string, qty: 1 | 5) => void;
  onSetBuildingPolicy: (id: string, policyId: BuildingPolicyId) => void;
  onChangeTimeMode: (mode: CityTimeMode) => void;
  onChangeWeather: (mode: CityWeatherMode) => void;
  onPerfStats: (stats: RuntimePerfStats) => void;
}

const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));
const CAT_LABEL_BY_ID = Object.fromEntries(BUILDING_CATEGORIES.map((c) => [c.id, c.label]));
const formatRate = (n: number): string =>
  Math.abs(n) > 0 && Math.abs(n) < 10 ? n.toFixed(2) : formatNumber(n);

const City3DInner: React.FC<City3DProps> = ({
  state,
  graphics,
  visible,
  tradeTier = 0,
  serverOffsetMs = 0,
  selectedBuildingId,
  focusRequest,
  previewLandmarkId = null,
  landmarkFocusRequest,
  onSelectBuilding,
  onBuyBuilding,
  onUpgradeBuilding,
  onDemolishBuilding,
  onSetBuildingPolicy,
  onChangeTimeMode,
  onChangeWeather,
  onPerfStats,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CityEngine | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [camPreset, setCamPreset] = useState<CameraPresetMode>('overview');
  const [demolishConfirm, setDemolishConfirm] = useState(false);
  const [hoverTip, setHoverTip] = useState<{ id: string; x: number; y: number } | null>(null);

  // Latest callbacks in refs so Three.js instance never tears down on state updates
  const callbacksRef = useRef({
    onSelectBuilding,
    onPerfStats,
  });
  callbacksRef.current = { onSelectBuilding, onPerfStats };

  const initialGraphicsRef = useRef(graphics);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    let engine: CityEngine | null = null;
    try {
      engine = new CityEngine(host, initialGraphicsRef.current, {
        onSelectBuilding: (id) => {
          setDemolishConfirm(false);
          callbacksRef.current.onSelectBuilding(id);
        },
        onHoverBuilding: (id, clientX, clientY) => {
          if (!id || !host) {
            setHoverTip((prev) => (prev === null ? prev : null));
            return;
          }
          const rect = host.getBoundingClientRect();
          const nextX = Math.max(80, Math.min(rect.width - 80, clientX - rect.left));
          const nextY = Math.max(48, clientY - rect.top - 12);
          setHoverTip((prev) =>
            prev &&
            prev.id === id &&
            Math.abs(prev.x - nextX) < 4 &&
            Math.abs(prev.y - nextY) < 4
              ? prev
              : { id, x: nextX, y: nextY },
          );
        },
        onPerfStats: (stats) => callbacksRef.current.onPerfStats(stats),
        onWebglLostChange: (lost) => setWebglLost(lost),
      });
      engineRef.current = engine;
      setWebglError(false);
    } catch {
      setWebglError(true);
    }

    return () => {
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Compact key so 1Hz simulation clock ticks do not trigger unnecessary 3D scene rebuilds
  const citySyncSignature = useMemo(() => {
    const bEntries = Object.entries(state.b || {})
      .filter(([, count]) => (count || 0) > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, count]) => `${id}:${count}`)
      .join(',');
    const lvlEntries = Object.entries(state.gx?.lvl || {})
      .filter(([, lv]) => (lv || 1) > 1)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, lv]) => `${id}:${lv}`)
      .join(',');
    const queueIds = getConstructionQueue(state, 0)
      .map((q) => `${q.buildingId}@${q.finishAt}`)
      .join(',');
    const ownedAssets = (state.cos || [])
      .filter((id) => id.startsWith('asset_'))
      .sort()
      .join(',');
    return `${bEntries}|${lvlEntries}|${queueIds}|${ownedAssets}|${previewLandmarkId || ''}|${state.cityTimeMode || 'auto'}|${state.cityWeather || 'clear'}`;
  }, [state.b, state.gx?.lvl, state.milestones, state.cos, previewLandmarkId, state.cityTimeMode, state.cityWeather]);

  const latestStateRef = useRef(state);
  latestStateRef.current = state;

  // Push game state changes imperatively into 3D scene only when visual 3D state changes
  useEffect(() => {
    engineRef.current?.syncState(latestStateRef.current, serverOffsetMs, previewLandmarkId);
  }, [citySyncSignature, serverOffsetMs, previewLandmarkId]);

  useEffect(() => {
    engineRef.current?.applyGraphicsSettings(graphics);
  }, [graphics]);

  useEffect(() => {
    engineRef.current?.setVisible(visible);
    if (!visible) setHoverTip(null);
  }, [visible]);

  useEffect(() => {
    engineRef.current?.setSelectedBuilding(selectedBuildingId);
    setDemolishConfirm(false);
  }, [selectedBuildingId]);

  useEffect(() => {
    if (focusRequest?.id) {
      engineRef.current?.focusBuilding(focusRequest.id);
    }
  }, [focusRequest]);

  useEffect(() => {
    if (landmarkFocusRequest?.id) {
      engineRef.current?.focusDiamondLandmark(landmarkFocusRequest.id);
    }
  }, [landmarkFocusRequest]);

  const nowMs = (state.t || Date.now()) + serverOffsetMs;
  const builtTotal = totalBuildings(state);

  const selectedData = useMemo(() => {
    if (!selectedBuildingId) return null;
    const def = BUILDING_BY_ID[selectedBuildingId];
    if (!def) return null;
    const count = state.b?.[def.id] || 0;
    const lv = Math.max(1, Math.min(5, state.gx?.lvl?.[def.id] || 1));
    const activePolicyId = getActiveBuildingPolicyId(state, def.id);
    const activePolicy = getBuildingPolicyDef(activePolicyId);
    const lvMult = gxLevelMult(state, def.id);
    const disc = getDevelopmentDiscount(state, nowMs);
    const snap = computeEconomySnapshot(state, { tradeTier, nowMs });

    const incPerUnit = def.inc * lvMult * activePolicy.incomeMult;
    const maintPerUnit = def.maint * activePolicy.maintMult;
    const jobsPerUnit = Math.round(def.jobs * activePolicy.jobsMult);
    const sharePct =
      snap.buildingGross > 0 && count > 0 ? ((incPerUnit * count) / snap.buildingGross) * 100 : 0;

    const buy1Check = canStartBuildingConstruction(state, def.id, 1, nowMs);
    const buy5Check = canStartBuildingConstruction(state, def.id, 5, nowMs);
    const nextCost1 = buy1Check.cost || buildingCost(def, count, disc);
    const nextCost5 = buy5Check.cost || bulkBuildingCost(def, count, 5, disc);
    const upCost = gxUpgradeCost(state, def.id, nowMs);
    const refund1 = getDemolishRefund(def, 1);
    const queueSlot = getConstructionQueue(state, nowMs).find((q) => q.buildingId === def.id);
    const queueLeftSec = queueSlot ? Math.max(0, Math.ceil((queueSlot.finishAt - nowMs) / 1000)) : 0;

    const canUpgrade = count > 0 && lv < 5 && upCost > 0 && state.cash >= upCost;
    const rankBlocked = (state.rank || 1) < (def.reqRank || 1);
    const buildingsBlocked = builtTotal < (def.reqBuildings || 0);
    const techBlocked = def.reqTech ? !state.tech?.[def.reqTech] : false;
    const demoCheck = canDemolishBuilding(state, def.id, 1);

    return {
      def,
      count,
      lv,
      incPerUnit,
      maintPerUnit,
      jobsPerUnit,
      sharePct,
      buy1Ok: buy1Check.ok,
      buy5Ok: buy5Check.ok,
      nextCost1,
      nextCost5,
      upCost,
      refund1,
      activePolicyId,
      activePolicy,
      isQueued: Boolean(queueSlot),
      queueLeftSec,
      canUpgrade,
      rankBlocked,
      buildingsBlocked,
      techBlocked,
      canDemolish: demoCheck.ok,
      demolishReason: demoCheck.reason,
      mult: lvMult,
    };
  }, [selectedBuildingId, state, tradeTier, nowMs, builtTotal]);

  const timeMode: CityTimeMode = state.cityTimeMode || 'auto';
  const weatherMode: CityWeatherMode = state.cityWeather || 'clear';
  const hoverDef = hoverTip ? BUILDING_BY_ID[hoverTip.id] : null;
  const hoverCount = hoverDef ? state.b?.[hoverDef.id] || 0 : 0;

  const handlePreset = (preset: CameraPresetMode) => {
    setCamPreset(preset);
    engineRef.current?.setCameraPreset(preset);
  };

  return (
    <div
      className={`city3d-shell${expanded ? ' is-expanded' : ''}${visible ? '' : ' is-hidden'}`}
      data-testid="city-3d"
      aria-hidden={!visible}
    >
      <div className="sky city3d-viewport">
        {webglError || webglLost ? (
          <div className="city3d-fallback" data-testid="city3d-fallback">
            <BuildingIcon id="business_districts" size={32} color="#ffc23d" />
            <div>
              <b>{webglLost ? '3D Viewport Paused (WebGL Context Restoring)' : '3D National City Overview'}</b>
              <p>
                {builtTotal} active buildings across {BUILDINGS.length} national urban sectors. Use the Build tab or
                click Retry to restore WebGL rendering.
              </p>
            </div>
          </div>
        ) : (
          <div ref={mountRef} className="city3d-canvas-host" />
        )}

        {/* Top camera + atmosphere toolbar (solid/rgba surface — zero backdrop-filter!) */}
        <div className="city3d-hud-top" role="toolbar" aria-label="3D City Camera Controls">
          <div className="city3d-hud-group">
            {(['overview', 'aerial', 'closeup', 'harbor'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                className={`city3d-pill-btn${camPreset === preset ? ' on' : ''}`}
                onClick={() => handlePreset(preset)}
                title={`Switch camera to ${preset} view`}
              >
                {preset === 'overview' && <Compass size={11} />}
                {preset === 'aerial' && <Camera size={11} />}
                <span>{preset.charAt(0).toUpperCase() + preset.slice(1)}</span>
              </button>
            ))}
            <button
              type="button"
              className="city3d-icon-btn"
              onClick={() => engineRef.current?.zoomBy(0.82)}
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              <ZoomIn size={12} />
            </button>
            <button
              type="button"
              className="city3d-icon-btn"
              onClick={() => engineRef.current?.zoomBy(1.2)}
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut size={12} />
            </button>
            <button
              type="button"
              className="city3d-icon-btn"
              onClick={() => handlePreset('overview')}
              title="Reset camera (R)"
              aria-label="Reset camera"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          <div className="city3d-hud-group">
            <button
              type="button"
              className="city3d-pill-btn"
              onClick={() => {
                const order: CityTimeMode[] = ['auto', 'day', 'sunset', 'night'];
                const next = order[(order.indexOf(timeMode) + 1) % order.length];
                onChangeTimeMode(next);
              }}
              title="Cycle time of day"
            >
              {timeMode === 'night' ? (
                <Moon size={11} color="#a58cff" />
              ) : timeMode === 'sunset' ? (
                <Sunset size={11} color="#fb923c" />
              ) : (
                <Sun size={11} color="#ffc23d" />
              )}
              <span>{timeMode === 'auto' ? 'Cycle' : timeMode}</span>
            </button>

            <button
              type="button"
              className="city3d-pill-btn"
              onClick={() => {
                const order: CityWeatherMode[] = ['clear', 'overcast', 'rain'];
                const next = order[(order.indexOf(weatherMode) + 1) % order.length];
                onChangeWeather(next);
              }}
              title="Toggle weather"
            >
              <CloudRain size={11} color={weatherMode === 'rain' ? '#5ccbff' : '#a79fd0'} />
              <span>{weatherMode}</span>
            </button>

            <button
              type="button"
              className="city3d-icon-btn"
              onClick={() => setExpanded((e) => !e)}
              title={expanded ? 'Compact 3D viewport' : 'Expand 3D viewport'}
              aria-label={expanded ? 'Compact 3D viewport' : 'Expand 3D viewport'}
            >
              {expanded ? <Minimize2 size={12} /> : <Expand size={12} />}
            </button>
          </div>
        </div>

        {/* Hover label over plot */}
        {hoverTip && hoverDef && (
          <div className="ctip on" style={{ left: hoverTip.x, top: hoverTip.y }}>
            <BuildingIcon id={hoverDef.id} size={13} color="#ffc23d" />
            <span>
              {hoverDef.n} · {hoverCount > 0 ? `${hoverCount} built (Lv ${state.gx?.lvl?.[hoverDef.id] || 1})` : 'Vacant plot'}
            </span>
          </div>
        )}

        {builtTotal === 0 && !selectedData && (
          <span className="dim-hint">
            <Hammer size={13} color="#ffc23d" />
            <span>Tap a 3D plot or build below · Drag to orbit · Scroll to zoom</span>
          </span>
        )}
      </div>

      {/* Real Building Inspector Drawer (opens when a 3D plot is selected) */}
      {selectedData && (
        <div className="city3d-inspector" data-testid="city3d-inspector">
          <div className="city3d-insp-head">
            <div className="city3d-insp-title">
              <span className="city3d-insp-ic" style={{ background: `${selectedData.def.c}26`, color: selectedData.def.c }}>
                <BuildingIcon id={selectedData.def.id} size={18} color={selectedData.def.c} />
              </span>
              <div>
                <b>{selectedData.def.n}</b>
                <small>
                  {CAT_LABEL_BY_ID[selectedData.def.cat] || selectedData.def.cat} · {selectedData.count} owned · Level {selectedData.lv}/5
                  {selectedData.isQueued ? ` · Building (${selectedData.queueLeftSec}s)` : ''}
                </small>
              </div>
            </div>
            <button
              type="button"
              className="city3d-icon-btn"
              onClick={() => onSelectBuilding(null)}
              aria-label="Close building inspector"
            >
              <X size={14} />
            </button>
          </div>

          <div className="city3d-insp-metrics">
            <div>
              <span>Production</span>
              <b style={{ color: '#3fe0b0' }}>
                +{formatRate(selectedData.incPerUnit * Math.max(1, selectedData.count))}/s
              </b>
            </div>
            <div>
              <span>Upkeep</span>
              <b style={{ color: '#ff6fa5' }}>
                -{formatRate(selectedData.maintPerUnit * Math.max(1, selectedData.count))}/s
              </b>
            </div>
            <div>
              <span>Jobs / Grid</span>
              <b>
                {formatNumber(selectedData.jobsPerUnit * Math.max(1, selectedData.count))} ·{' '}
                {selectedData.def.energy >= 0 ? `+${selectedData.def.energy}` : selectedData.def.energy} MW
              </b>
            </div>
            <div>
              <span>GDP Share</span>
              <b style={{ color: '#ffc23d' }}>{selectedData.sharePct.toFixed(1)}%</b>
            </div>
          </div>

          {/* Building Policy Selector */}
          <div className="city3d-insp-policies">
            <span className="city3d-insp-pol-lbl">
              <SlidersHorizontal size={12} color="#a58cff" /> Policy:
            </span>
            {BUILDING_POLICIES.map((pol) => {
              const allowed = isBuildingPolicyAllowedFor(selectedData.def, pol);
              if (!allowed) return null;
              const isActive = selectedData.activePolicyId === pol.id;
              const check = canSetBuildingPolicy(state, selectedData.def.id, pol.id);
              const disabled = !isActive && !check.ok;
              return (
                <button
                  key={pol.id}
                  type="button"
                  disabled={disabled}
                  className={`city3d-pol-chip${isActive ? ' on' : ''}`}
                  title={isActive ? `${pol.desc} (Active)` : `${pol.desc}${check.reason ? ` — ${check.reason}` : ` · ₨ ${formatNumber(pol.applyCost)}`}`}
                  onClick={() => {
                    if (!isActive) onSetBuildingPolicy(selectedData.def.id, pol.id);
                  }}
                >
                  {pol.name}
                  {!isActive && pol.applyCost > 0 ? ` · ₨ ${formatNumber(pol.applyCost)}` : ''}
                </button>
              );
            })}
          </div>

          {(selectedData.rankBlocked || selectedData.buildingsBlocked || selectedData.techBlocked) && (
            <div className="city3d-insp-warn">
              <Shield size={12} />
              <span>
                Requires Rank {selectedData.def.reqRank || 1}, {selectedData.def.reqBuildings || 0} city buildings
                {selectedData.def.reqTech ? `, and ${selectedData.def.reqTech} research` : ''}.
              </span>
            </div>
          )}

          <div className="city3d-insp-actions">
            <button
              type="button"
              className="btn sm gold"
              disabled={!selectedData.buy1Ok}
              onClick={() => onBuyBuilding(selectedData.def.id, 1)}
            >
              <CashCoinIcon size={13} />
              <span>Build +1 (₨ {formatNumber(selectedData.nextCost1)})</span>
            </button>
            <button
              type="button"
              className="btn sm"
              disabled={!selectedData.buy5Ok}
              onClick={() => onBuyBuilding(selectedData.def.id, 5)}
            >
              <span>+5 (₨ {formatNumber(selectedData.nextCost5)})</span>
            </button>
            {selectedData.count > 0 && selectedData.lv < 5 && (
              <button
                type="button"
                className="btn sm mint"
                disabled={!selectedData.canUpgrade}
                onClick={() => onUpgradeBuilding(selectedData.def.id)}
              >
                <span>
                  {`Upgrade Lv${selectedData.lv + 1} (₨ ${formatNumber(selectedData.upCost)})`}
                </span>
              </button>
            )}
            {selectedData.count > 0 &&
              (!demolishConfirm ? (
                <button
                  type="button"
                  className="btn sm red"
                  disabled={!selectedData.canDemolish}
                  title={selectedData.canDemolish ? `Demolish 1 (+₨ ${formatNumber(selectedData.refund1)} refund)` : selectedData.demolishReason}
                  onClick={() => setDemolishConfirm(true)}
                >
                  <Trash2 size={12} />
                  <span>Demolish (+₨ {formatNumber(selectedData.refund1)})</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn sm red"
                  onClick={() => {
                    onDemolishBuilding(selectedData.def.id, 1);
                    setDemolishConfirm(false);
                  }}
                >
                  <span>Confirm Demolish</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const City3D = memo(City3DInner);
