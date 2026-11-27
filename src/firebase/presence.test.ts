import assert from 'node:assert/strict';
import test from 'node:test';
import {
  areLeaderboardListsEqual,
  filterAndSortLeaderboard,
  mergeLeaderboardProfiles,
} from './presence';
import type { PlayerProfile } from '../game/types';

const BASE_STATS = {
  buildings: 4,
  completedTrades: 1,
  tradesSent: 1,
  tradesReceived: 0,
  cashTraded: 500,
  gemsTraded: 0,
};

function makePlayer(overrides: Partial<PlayerProfile> & { id: string }): PlayerProfile {
  return {
    username: `Leader_${overrides.id}`,
    usernameLower: `leader_${overrides.id}`,
    countryCode: 'PK',
    countryName: 'Pakistan',
    gdp: 1000,
    cash: 1000,
    gems: 5,
    level: 2,
    rank: 1,
    seen: 1_000_000,
    stats: { ...BASE_STATS },
    ...overrides,
  };
}

test('1. Equal-GDP leaderboard entries sort deterministically by id without random flipping', () => {
  const now = 1_000_000;
  const orderA = [
    makePlayer({ id: 'u_charlie', gdp: 5000, seen: now - 1000 }),
    makePlayer({ id: 'u_alpha', gdp: 5000, seen: now - 5000 }),
    makePlayer({ id: 'u_bravo', gdp: 5000, seen: now - 2000 }),
  ];
  const orderB = [
    makePlayer({ id: 'u_bravo', gdp: 5000, seen: now }),
    makePlayer({ id: 'u_charlie', gdp: 5000, seen: now - 3000 }),
    makePlayer({ id: 'u_alpha', gdp: 5000, seen: now }),
  ];

  const sortedA = filterAndSortLeaderboard(orderA, 'u_alpha', now);
  const sortedB = filterAndSortLeaderboard(orderB, 'u_alpha', now);
  assert.deepEqual(
    sortedA.map((p) => p.id),
    ['u_alpha', 'u_bravo', 'u_charlie'],
  );
  assert.deepEqual(
    sortedB.map((p) => p.id),
    ['u_alpha', 'u_bravo', 'u_charlie'],
  );
});

test('2. mergeLeaderboardProfiles preserves valid names/fields when partial snapshots arrive or cache empties during resubscribe', () => {
  const now = 1_000_000;
  const initial = [
    makePlayer({ id: 'u1', username: 'Shehryar', countryCode: 'PK', countryName: 'Pakistan', gdp: 9000, seen: now - 1000 }),
    makePlayer({ id: 'u2', username: 'Aria', countryCode: 'JP', countryName: 'Japan', gdp: 6000, seen: now - 2000 }),
  ];

  // Cached empty snapshot on presenceEpoch resubscribe must NOT wipe leaderboard
  const duringResubscribe = mergeLeaderboardProfiles(initial, [], 'u1', now, { fromCache: true });
  assert.deepEqual(duringResubscribe, initial);

  // Incomplete incoming profile (empty username/country) preserves prior valid identity
  const partialIncoming = [
    makePlayer({ id: 'u1', username: 'Shehryar', gdp: 9500, seen: now }),
    makePlayer({ id: 'u2', username: '', countryCode: '', countryName: '', rank: 0, gdp: 6200, seen: now }),
  ];
  const mergedPartial = mergeLeaderboardProfiles(initial, partialIncoming, 'u1', now);
  assert.equal(mergedPartial[1].username, 'Aria');
  assert.equal(mergedPartial[1].countryCode, 'JP');
  assert.equal(mergedPartial[1].countryName, 'Japan');
  assert.equal(mergedPartial[1].gdp, 6200);

  // Transient single snapshot dropping an online peer retains them smoothly, whereas prune pass removes expired peers
  const transientDrop = mergeLeaderboardProfiles(
    mergedPartial,
    [makePlayer({ id: 'u1', username: 'Shehryar', gdp: 9500, seen: now })],
    'u1',
    now + 5_000,
    { isPrunePass: false },
  );
  assert.equal(transientDrop.length, 2, 'Online peer retained smoothly across transient snapshot fluctuation');

  const afterWindowExpired = mergeLeaderboardProfiles(transientDrop, transientDrop, 'u1', now + 400_000, {
    isPrunePass: true,
  });
  assert.deepEqual(
    afterWindowExpired.map((p) => p.id),
    ['u1'],
  );
});

test('3. areLeaderboardListsEqual detects unchanged visual data across heartbeat/seen timestamp bumps', () => {
  const a = [
    makePlayer({ id: 'u1', gdp: 1200, seen: 1_000_000 }),
    makePlayer({ id: 'u2', gdp: 900, seen: 995_000 }),
  ];
  const b = [
    makePlayer({ id: 'u1', gdp: 1200, seen: 1_015_000 }),
    makePlayer({ id: 'u2', gdp: 900, seen: 995_000 }),
  ];
  const c = [
    makePlayer({ id: 'u1', gdp: 1350, seen: 1_020_000 }),
    makePlayer({ id: 'u2', gdp: 900, seen: 995_000 }),
  ];
  assert.equal(areLeaderboardListsEqual(a, b), true);
  assert.equal(areLeaderboardListsEqual(a, c), false);
});

test('4. mergeLeaderboardProfiles preserves cosmetic identity and detects cosmetic swaps cleanly', () => {
  const now = 1_000_000;
  const prev = [
    makePlayer({
      id: 'u1',
      gdp: 5000,
      cosFrame: 'frame_neon',
      cosNameFx: 'nfx_rainbow',
      cosBadge: 'badge_diamond_member',
      seen: now - 1000,
    }),
  ];
  // Partial snapshot omitting cosmetic keys preserves previous equipped visuals
  const partial = [makePlayer({ id: 'u1', gdp: 5000, seen: now })];
  const merged = mergeLeaderboardProfiles(prev, partial, 'u1', now);
  assert.equal(merged[0].cosFrame, 'frame_neon');
  assert.equal(merged[0].cosNameFx, 'nfx_rainbow');
  assert.equal(merged[0].cosBadge, 'badge_diamond_member');
  assert.equal(areLeaderboardListsEqual(prev, merged), true);

  // Changing cosmetic updates equality check so row refreshes cleanly
  const updated = [makePlayer({ id: 'u1', gdp: 5000, cosFrame: 'frame_royal_gold', seen: now })];
  assert.equal(areLeaderboardListsEqual(prev, updated), false);
});

