import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Monitor, RotateCcw, Sliders } from 'lucide-react';
import {
  applyGraphicsPreset,
  DEFAULT_GRAPHICS_SETTINGS,
  detectGraphicsPreset,
  GRAPHICS_PRESETS,
  normalizeGraphicsSettings,
} from '../game/graphics';
import type {
  AntiAliasingMode,
  DensityLevel,
  FpsTargetOption,
  GraphicsPresetId,
  GraphicsSettings,
  RuntimePerfStats,
  ShadowQuality,
  TextureQuality,
} from '../game/types';

interface GraphicsSettingsPanelProps {
  settings: GraphicsSettings;
  perfStats: RuntimePerfStats;
  onApply: (next: GraphicsSettings) => void;
  onCancel?: () => void;
}

const FPS_OPTIONS: FpsTargetOption[] = [20, 30, 45, 60, 90, 120, 'auto'];

export const GraphicsSettingsPanel: React.FC<GraphicsSettingsPanelProps> = ({
  settings,
  perfStats,
  onApply,
  onCancel,
}) => {
  const [draft, setDraft] = useState<GraphicsSettings>(() => normalizeGraphicsSettings(settings));

  useEffect(() => {
    setDraft(normalizeGraphicsSettings(settings));
  }, [settings]);

  const updateField = <K extends keyof GraphicsSettings>(key: K, value: GraphicsSettings[K]) => {
    setDraft((cur) => {
      const next = { ...cur, [key]: value };
      next.preset = detectGraphicsPreset(next);
      return next;
    });
  };

  const selectPreset = (presetId: Exclude<GraphicsPresetId, 'custom'>) => {
    setDraft((cur) => applyGraphicsPreset(presetId, cur.fpsTarget));
  };

  const isDirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <div className="gfx-panel" data-testid="graphics-settings-panel">
      {/* Live Runtime Telemetry Strip */}
      <div className="gfx-telemetry">
        <div className="gfx-tel-item">
          <span>FPS / Avg</span>
          <b className="tabular-nums" style={{ color: perfStats.fps >= 28 ? '#3fe0b0' : '#ffc23d' }}>
            {perfStats.fps || '--'} / {perfStats.avgFps || '--'}
          </b>
        </div>
        <div className="gfx-tel-item">
          <span>Frame Time</span>
          <b className="tabular-nums">{perfStats.frameTimeMs ? `${perfStats.frameTimeMs} ms` : '--'}</b>
        </div>
        <div className="gfx-tel-item">
          <span>Scale · DPR</span>
          <b className="tabular-nums">
            {Math.round(perfStats.effectiveScale * 100)}% · {perfStats.pixelRatio}×
          </b>
        </div>
        <div className="gfx-tel-item">
          <span>Scene Load</span>
          <b className="tabular-nums">
            {perfStats.drawCalls} calls · {Math.round(perfStats.triangles / 100) / 10}k tris
          </b>
        </div>
        <div className="gfx-tel-gpu">
          <Cpu size={12} color={perfStats.isSoftwareGl ? '#ffc23d' : '#5ccbff'} />
          <span>
            {perfStats.isSoftwareGl ? 'Software WebGL Guard Active' : 'Hardware GPU'} · {perfStats.rendererName}
          </span>
        </div>
      </div>

      {/* Presets */}
      <div className="gfx-section">
        <div className="gfx-sec-head">
          <Monitor size={14} color="#a58cff" />
          <b>Quality Preset</b>
          <small>{draft.preset === 'custom' ? 'Custom tuning' : `${draft.preset.toUpperCase()} preset`}</small>
        </div>
        <div className="gfx-presets">
          {(['low', 'medium', 'high', 'ultra'] as const).map((pid) => {
            const active = draft.preset === pid;
            return (
              <button
                key={pid}
                type="button"
                className={`gfx-chip${active ? ' on' : ''}`}
                onClick={() => selectPreset(pid)}
              >
                {pid.charAt(0).toUpperCase() + pid.slice(1)}
              </button>
            );
          })}
          {draft.preset === 'custom' && (
            <span className="gfx-custom-tag">Custom</span>
          )}
        </div>
      </div>

      {/* FPS Target & Resolution */}
      <div className="gfx-grid2">
        <label className="gfx-field">
          <span>FPS Target</span>
          <select
            className="inp gfx-select"
            value={String(draft.fpsTarget)}
            onChange={(e) => {
              const raw = e.target.value;
              updateField('fpsTarget', raw === 'auto' ? 'auto' : (Number(raw) as FpsTargetOption));
            }}
          >
            {FPS_OPTIONS.map((opt) => (
              <option key={String(opt)} value={String(opt)}>
                {opt === 'auto' ? 'Auto (Adaptive Cap)' : `${opt} FPS`}
              </option>
            ))}
          </select>
        </label>

        <label className="gfx-field">
          <span>Render Resolution ({Math.round(draft.renderScale * 100)}%)</span>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.05}
            value={draft.renderScale}
            onChange={(e) => updateField('renderScale', Number(e.target.value))}
          />
        </label>

        <label className="gfx-field">
          <span>Shadow Quality</span>
          <select
            className="inp gfx-select"
            value={draft.shadowQuality}
            onChange={(e) => updateField('shadowQuality', e.target.value as ShadowQuality)}
          >
            <option value="off">Off</option>
            <option value="low">Low (512px)</option>
            <option value="medium">Medium (1024px)</option>
            <option value="high">High (2048px)</option>
          </select>
        </label>

        <label className="gfx-field">
          <span>Anti-Aliasing</span>
          <select
            className="inp gfx-select"
            value={draft.antiAliasing}
            onChange={(e) => updateField('antiAliasing', e.target.value as AntiAliasingMode)}
          >
            <option value="off">Off</option>
            <option value="fxaa">FXAA</option>
            <option value="msaa">MSAA</option>
          </select>
        </label>

        <label className="gfx-field">
          <span>Texture Quality</span>
          <select
            className="inp gfx-select"
            value={draft.textureQuality}
            onChange={(e) => updateField('textureQuality', e.target.value as TextureQuality)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High (Anisotropic)</option>
          </select>
        </label>

        <label className="gfx-field">
          <span>View Distance</span>
          <select
            className="inp gfx-select"
            value={draft.viewDistance}
            onChange={(e) => updateField('viewDistance', e.target.value as 'near' | 'medium' | 'far')}
          >
            <option value="near">Near</option>
            <option value="medium">Medium</option>
            <option value="far">Far</option>
          </select>
        </label>

        <label className="gfx-field">
          <span>Traffic Density</span>
          <select
            className="inp gfx-select"
            value={draft.trafficDensity}
            onChange={(e) => updateField('trafficDensity', e.target.value as DensityLevel)}
          >
            <option value="off">Off</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="gfx-field">
          <span>Pedestrian Density</span>
          <select
            className="inp gfx-select"
            value={draft.pedestrianDensity}
            onChange={(e) => updateField('pedestrianDensity', e.target.value as DensityLevel)}
          >
            <option value="off">Off</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>

      {/* Effect Toggles */}
      <div className="gfx-toggles">
        {(
          [
            ['ambientOcclusion', 'Ambient Occlusion Fill'],
            ['reflections', 'Water & Glass Reflections'],
            ['particles', 'Rain & Emission Particles'],
            ['weatherEffects', 'Weather System'],
            ['dayNightCycle', 'Dynamic Day / Night Cycle'],
            ['bloom', 'Night Emissive Glow'],
            ['motionBlur', 'Camera Motion Smooth'],
            ['adaptiveOptimization', 'Adaptive Performance Scaling'],
          ] as const
        ).map(([key, label]) => {
          const active = draft[key];
          return (
            <button
              key={key}
              type="button"
              className={`gfx-toggle${active ? ' on' : ''}`}
              aria-pressed={active}
              onClick={() => updateField(key, !active)}
            >
              <span>{label}</span>
              <b>{active ? 'ON' : 'OFF'}</b>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="acts" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn gold"
          onClick={() => onApply(normalizeGraphicsSettings(draft))}
        >
          <Sliders size={14} />
          <span>{isDirty ? 'Apply Graphics' : 'Applied'}</span>
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const def = { ...DEFAULT_GRAPHICS_SETTINGS };
            setDraft(def);
            onApply(def);
          }}
        >
          <RotateCcw size={14} />
          <span>Reset Default</span>
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              setDraft(normalizeGraphicsSettings(settings));
              onCancel();
            }}
          >
            <Activity size={13} />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
};

export { GRAPHICS_PRESETS };
