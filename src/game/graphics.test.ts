import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyGraphicsPreset,
  DEFAULT_GRAPHICS_SETTINGS,
  detectGraphicsPreset,
  GRAPHICS_PRESETS,
  graphicsStorageKeyForUid,
  normalizeGraphicsSettings,
  resolveNumericFpsCap,
} from './graphics';

test('graphics presets apply cleanly and normalize clamps out-of-range settings', () => {
  const low = applyGraphicsPreset('low');
  assert.equal(low.preset, 'low');
  assert.equal(low.shadowQuality, 'off');
  assert.equal(low.fpsTarget, 30);
  assert.equal(detectGraphicsPreset(low), 'low');

  const custom = { ...DEFAULT_GRAPHICS_SETTINGS, renderScale: 1.15 };
  assert.equal(detectGraphicsPreset(custom), 'custom');

  const normalized = normalizeGraphicsSettings({
    renderScale: 9,
    fpsTarget: 999 as never,
    shadowQuality: 'invalid' as never,
    adaptiveOptimization: false,
  });
  assert.equal(normalized.renderScale, 1.5);
  assert.equal(normalized.fpsTarget, 'auto');
  assert.equal(normalized.shadowQuality, DEFAULT_GRAPHICS_SETTINGS.shadowQuality);
  assert.equal(normalized.adaptiveOptimization, false);
  assert.equal(Object.keys(GRAPHICS_PRESETS).length, 4);
});

test('software WebGL and Auto FPS cap resolution stay safe and UID storage keys are isolated', () => {
  assert.equal(resolveNumericFpsCap('auto', true), 30);
  assert.equal(resolveNumericFpsCap('auto', false), 60);
  assert.equal(resolveNumericFpsCap(120, true), 45);
  assert.equal(resolveNumericFpsCap(90, false), 90);

  assert.notEqual(graphicsStorageKeyForUid('uid_A'), graphicsStorageKeyForUid('uid_B'));
  assert.equal(graphicsStorageKeyForUid(null), 'cet_gfx_v2_offline');
});
