import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY } from '../game/constants';
import { freshState } from '../game/rules';
import {
  buildInitialCloudState,
  buildOnboardingSeedState,
  hasOfflineSave,
  isSessionStillValid,
  OFFLINE_SAVE_KEY,
  readAccountSave,
  saveStorageKeyForUid,
  writeAccountSave,
} from './accountSession';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem(k: string): string | null {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string): void {
      map.set(k, v);
    },
    removeItem(k: string): void {
      map.delete(k);
    },
    dump(): Record<string, string> {
      return Object.fromEntries(map.entries());
    },
  };
}

test('UID-specific localStorage keys strictly isolate accounts and offline saves', () => {
  assert.equal(saveStorageKeyForUid('google_user_A'), `${SAVE_KEY}_google_user_A`);
  assert.equal(saveStorageKeyForUid('google_user_B'), `${SAVE_KEY}_google_user_B`);
  assert.equal(saveStorageKeyForUid(null), OFFLINE_SAVE_KEY);
  assert.equal(saveStorageKeyForUid('   '), OFFLINE_SAVE_KEY);
  assert.notEqual(saveStorageKeyForUid('google_user_A'), saveStorageKeyForUid('google_user_B'));
  assert.notEqual(saveStorageKeyForUid('google_user_A'), saveStorageKeyForUid(null));
});

test('authenticated account NEVER reads legacy shared cet_save_v1, offline save, or another UID save', () => {
  const richAccountA = { ...freshState(), cash: 9_999_999, gems: 420, rank: 8 };
  richAccountA.b.quantum = 12;

  const legacyShared = { ...freshState(), cash: 555_555, gems: 77 };
  const offlineData = { ...freshState(), cash: 123_456, gems: 12 };

  const storage = createMemoryStorage({
    [SAVE_KEY]: JSON.stringify(legacyShared),
    [OFFLINE_SAVE_KEY]: JSON.stringify(offlineData),
    [saveStorageKeyForUid('uidA')]: JSON.stringify(richAccountA),
  });

  // Account A reads only Account A's save
  const loadedA = readAccountSave('uidA', storage);
  assert.ok(loadedA);
  assert.equal(loadedA.cash, 9_999_999);
  assert.equal(loadedA.gems, 420);
  assert.equal(loadedA.b.quantum, 12);

  // Account B (new Google user with no local save) MUST return null — never legacy/offline/Account A
  const loadedB = readAccountSave('uidB', storage);
  assert.equal(loadedB, null);

  // Offline guest can still read offline/legacy save without affecting cloud accounts
  const loadedOffline = readAccountSave(null, storage);
  assert.ok(loadedOffline);
  assert.equal(loadedOffline.cash, 123_456);
});

test('writeAccountSave stores under UID key without modifying other accounts or legacy key', () => {
  const storage = createMemoryStorage();
  const sA = { ...freshState(), cash: 10_000, gems: 5 };
  const sB = { ...freshState(), cash: 250, gems: 0 };

  assert.equal(writeAccountSave('uidA', sA, storage, 1_750_000_000_000), true);
  assert.equal(writeAccountSave('uidB', sB, storage, 1_750_000_000_500), true);

  assert.equal(storage.getItem(SAVE_KEY), null);
  assert.equal(hasOfflineSave(storage), false);
  assert.equal(readAccountSave('uidA', storage)?.cash, 10_000);
  assert.equal(readAccountSave('uidB', storage)?.cash, 250);
});

test('buildInitialCloudState initializes freshState() when saves/{uid} is absent and preserves existing cloud save', () => {
  const brandNew = buildInitialCloudState(null, 'JP', 'Japan');
  const expectedFresh = freshState();
  assert.equal(brandNew.cash, expectedFresh.cash);
  assert.equal(brandNew.gems, expectedFresh.gems);
  assert.equal(brandNew.rank, expectedFresh.rank);
  assert.deepEqual(brandNew.provinces, expectedFresh.provinces);
  assert.equal(brandNew.country[0], 'JP');
  assert.equal(brandNew.country[1], 'Japan');

  const existingCloud = buildInitialCloudState(
    { cash: 88_000, gems: 19, b: { ...expectedFresh.b, fact: 4 } },
    'US',
    'United States',
  );
  assert.equal(existingCloud.cash, 88_000);
  assert.equal(existingCloud.gems, 19);
  assert.equal(existingCloud.b.fact, 4);
  assert.equal(existingCloud.country[0], 'US');
});

test('buildOnboardingSeedState always starts cleanly from freshState() regardless of previous account', () => {
  const seed = buildOnboardingSeedState('DE');
  const clean = freshState();
  assert.equal(seed.cash, clean.cash);
  assert.equal(seed.gems, clean.gems);
  assert.equal(seed.rank, 0);
  assert.equal(seed.b.farm, 0);
  assert.equal(seed.country[0], 'DE');
});

test('isSessionStillValid invalidates stale async responses after account switch or sign-out', () => {
  assert.equal(isSessionStillValid('uidA', 'uidA', 1, 1), true);
  assert.equal(isSessionStillValid('uidB', 'uidA', 2, 1), false);
  assert.equal(isSessionStillValid(null, 'uidA', 2, 1), false);
  assert.equal(isSessionStillValid('uidA', 'uidA', 3, 2), false);
});
