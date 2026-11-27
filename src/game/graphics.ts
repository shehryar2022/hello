import type {
  AntiAliasingMode,
  DensityLevel,
  FpsTargetOption,
  GraphicsPresetId,
  GraphicsSettings,
  RuntimePerfStats,
  ShadowQuality,
  TextureQuality,
} from './types';

export const GRAPHICS_STORAGE_PREFIX = 'cet_gfx_v2';

export const GRAPHICS_PRESETS: Record<Exclude<GraphicsPresetId, 'custom'>, GraphicsSettings> = {
  low: {
    preset: 'low',
    fpsTarget: 30,
    shadowQuality: 'off',
    antiAliasing: 'off',
    textureQuality: 'low',
    renderScale: 0.75,
    viewDistance: 'near',
    ambientOcclusion: false,
    reflections: false,
    particles: false,
    trafficDensity: 'low',
    pedestrianDensity: 'off',
    weatherEffects: false,
    dayNightCycle: false,
    bloom: false,
    motionBlur: false,
    adaptiveOptimization: true,
  },
  medium: {
    preset: 'medium',
    fpsTarget: 45,
    shadowQuality: 'low',
    antiAliasing: 'fxaa',
    textureQuality: 'medium',
    renderScale: 0.9,
    viewDistance: 'medium',
    ambientOcclusion: false,
    reflections: false,
    particles: true,
    trafficDensity: 'medium',
    pedestrianDensity: 'low',
    weatherEffects: true,
    dayNightCycle: true,
    bloom: false,
    motionBlur: false,
    adaptiveOptimization: true,
  },
  high: {
    preset: 'high',
    fpsTarget: 60,
    shadowQuality: 'medium',
    antiAliasing: 'fxaa',
    textureQuality: 'high',
    renderScale: 1.0,
    viewDistance: 'far',
    ambientOcclusion: true,
    reflections: true,
    particles: true,
    trafficDensity: 'medium',
    pedestrianDensity: 'medium',
    weatherEffects: true,
    dayNightCycle: true,
    bloom: true,
    motionBlur: false,
    adaptiveOptimization: true,
  },
  ultra: {
    preset: 'ultra',
    fpsTarget: 'auto',
    shadowQuality: 'high',
    antiAliasing: 'msaa',
    textureQuality: 'high',
    renderScale: 1.25,
    viewDistance: 'far',
    ambientOcclusion: true,
    reflections: true,
    particles: true,
    trafficDensity: 'high',
    pedestrianDensity: 'high',
    weatherEffects: true,
    dayNightCycle: true,
    bloom: true,
    motionBlur: true,
    adaptiveOptimization: false,
  },
};

export const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  ...GRAPHICS_PRESETS.high,
  fpsTarget: 'auto',
};

export const DEFAULT_PERF_STATS: RuntimePerfStats = {
  fps: 0,
  avgFps: 0,
  frameTimeMs: 0,
  webglActive: true,
  isSoftwareGl: false,
  rendererName: 'Initializing…',
  effectiveScale: 1,
  pixelRatio: 1,
  activePreset: 'high',
  adaptiveActive: true,
  adaptiveStepDown: 0,
  drawCalls: 0,
  triangles: 0,
};

const VALID_FPS: ReadonlyArray<FpsTargetOption> = [20, 30, 45, 60, 90, 120, 'auto'];
const VALID_SHADOWS: ReadonlyArray<ShadowQuality> = ['off', 'low', 'medium', 'high'];
const VALID_AA: ReadonlyArray<AntiAliasingMode> = ['off', 'fxaa', 'msaa'];
const VALID_TEX: ReadonlyArray<TextureQuality> = ['low', 'medium', 'high'];
const VALID_DENSITY: ReadonlyArray<DensityLevel> = ['off', 'low', 'medium', 'high'];
const VALID_VIEW: ReadonlyArray<'near' | 'medium' | 'far'> = ['near', 'medium', 'far'];

export function detectGraphicsPreset(settings: GraphicsSettings): GraphicsPresetId {
  for (const key of ['low', 'medium', 'high', 'ultra'] as const) {
    const p = GRAPHICS_PRESETS[key];
    if (
      p.shadowQuality === settings.shadowQuality &&
      p.antiAliasing === settings.antiAliasing &&
      p.textureQuality === settings.textureQuality &&
      Math.abs(p.renderScale - settings.renderScale) < 0.02 &&
      p.viewDistance === settings.viewDistance &&
      p.ambientOcclusion === settings.ambientOcclusion &&
      p.reflections === settings.reflections &&
      p.particles === settings.particles &&
      p.trafficDensity === settings.trafficDensity &&
      p.pedestrianDensity === settings.pedestrianDensity &&
      p.weatherEffects === settings.weatherEffects &&
      p.dayNightCycle === settings.dayNightCycle &&
      p.bloom === settings.bloom &&
      p.motionBlur === settings.motionBlur
    ) {
      return key;
    }
  }
  return 'custom';
}

export function normalizeGraphicsSettings(raw: unknown): GraphicsSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<GraphicsSettings>;
  const scaleRaw = Number(src.renderScale);
  const renderScale = Number.isFinite(scaleRaw)
    ? Math.round(Math.max(0.5, Math.min(1.5, scaleRaw)) * 20) / 20
    : DEFAULT_GRAPHICS_SETTINGS.renderScale;

  const normalized: GraphicsSettings = {
    preset: 'custom',
    fpsTarget: VALID_FPS.includes(src.fpsTarget as FpsTargetOption)
      ? (src.fpsTarget as FpsTargetOption)
      : DEFAULT_GRAPHICS_SETTINGS.fpsTarget,
    shadowQuality: VALID_SHADOWS.includes(src.shadowQuality as ShadowQuality)
      ? (src.shadowQuality as ShadowQuality)
      : DEFAULT_GRAPHICS_SETTINGS.shadowQuality,
    antiAliasing: VALID_AA.includes(src.antiAliasing as AntiAliasingMode)
      ? (src.antiAliasing as AntiAliasingMode)
      : DEFAULT_GRAPHICS_SETTINGS.antiAliasing,
    textureQuality: VALID_TEX.includes(src.textureQuality as TextureQuality)
      ? (src.textureQuality as TextureQuality)
      : DEFAULT_GRAPHICS_SETTINGS.textureQuality,
    renderScale,
    viewDistance: VALID_VIEW.includes(src.viewDistance as 'near' | 'medium' | 'far')
      ? (src.viewDistance as 'near' | 'medium' | 'far')
      : DEFAULT_GRAPHICS_SETTINGS.viewDistance,
    ambientOcclusion:
      typeof src.ambientOcclusion === 'boolean'
        ? src.ambientOcclusion
        : DEFAULT_GRAPHICS_SETTINGS.ambientOcclusion,
    reflections:
      typeof src.reflections === 'boolean' ? src.reflections : DEFAULT_GRAPHICS_SETTINGS.reflections,
    particles:
      typeof src.particles === 'boolean' ? src.particles : DEFAULT_GRAPHICS_SETTINGS.particles,
    trafficDensity: VALID_DENSITY.includes(src.trafficDensity as DensityLevel)
      ? (src.trafficDensity as DensityLevel)
      : DEFAULT_GRAPHICS_SETTINGS.trafficDensity,
    pedestrianDensity: VALID_DENSITY.includes(src.pedestrianDensity as DensityLevel)
      ? (src.pedestrianDensity as DensityLevel)
      : DEFAULT_GRAPHICS_SETTINGS.pedestrianDensity,
    weatherEffects:
      typeof src.weatherEffects === 'boolean'
        ? src.weatherEffects
        : DEFAULT_GRAPHICS_SETTINGS.weatherEffects,
    dayNightCycle:
      typeof src.dayNightCycle === 'boolean'
        ? src.dayNightCycle
        : DEFAULT_GRAPHICS_SETTINGS.dayNightCycle,
    bloom: typeof src.bloom === 'boolean' ? src.bloom : DEFAULT_GRAPHICS_SETTINGS.bloom,
    motionBlur:
      typeof src.motionBlur === 'boolean' ? src.motionBlur : DEFAULT_GRAPHICS_SETTINGS.motionBlur,
    adaptiveOptimization:
      typeof src.adaptiveOptimization === 'boolean'
        ? src.adaptiveOptimization
        : DEFAULT_GRAPHICS_SETTINGS.adaptiveOptimization,
  };
  normalized.preset = detectGraphicsPreset(normalized);
  return normalized;
}

export function applyGraphicsPreset(
  presetId: Exclude<GraphicsPresetId, 'custom'>,
  keepFpsTarget?: FpsTargetOption,
): GraphicsSettings {
  const base = GRAPHICS_PRESETS[presetId];
  return {
    ...base,
    fpsTarget: keepFpsTarget ?? base.fpsTarget,
  };
}

export function graphicsStorageKeyForUid(uid: string | null | undefined): string {
  const clean = typeof uid === 'string' ? uid.trim() : '';
  return clean ? `${GRAPHICS_STORAGE_PREFIX}_${clean}` : `${GRAPHICS_STORAGE_PREFIX}_offline`;
}

export function readGraphicsSettings(uid: string | null): GraphicsSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_GRAPHICS_SETTINGS };
    }
    const raw = window.localStorage.getItem(graphicsStorageKeyForUid(uid));
    if (!raw) return { ...DEFAULT_GRAPHICS_SETTINGS };
    return normalizeGraphicsSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_GRAPHICS_SETTINGS };
  }
}

export function writeGraphicsSettings(uid: string | null, settings: GraphicsSettings): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    window.localStorage.setItem(
      graphicsStorageKeyForUid(uid),
      JSON.stringify(normalizeGraphicsSettings(settings)),
    );
    return true;
  } catch {
    return false;
  }
}

export function resolveNumericFpsCap(target: FpsTargetOption, isSoftwareGl: boolean): number {
  if (target === 'auto') {
    return isSoftwareGl ? 30 : 60;
  }
  const maxAllowed = isSoftwareGl ? 45 : 120;
  return Math.max(15, Math.min(maxAllowed, target));
}
