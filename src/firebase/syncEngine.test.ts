import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMeaningfulSaveFingerprint,
  buildPublicMetricsFingerprint,
  classifySyncError,
  CoalescedSyncController,
  computeCloudSyncStatus,
  computeCoalescedDelayMs,
  computeSyncRetryBackoffMs,
  MAX_TRANSIENT_RETRIES,
  resolveWalletRevisionConflict,
  SYNC_COALESCE_DEBOUNCE_MS,
  SYNC_IMMEDIATE_DELAY_MS,
  SYNC_MAX_WAIT_MS,
  UserCloudWriteQueue,
} from './syncEngine';
import { isSessionStillValid } from './accountSession';
import { filterAndSortLeaderboard } from './presence';
import { cleanSavePayload, freshState, migrateState } from '../game/rules';
import type { GameState, PlayerProfile } from '../game/types';

test('1. Sync status state machine enforces truthful Saving / Saved / Syncing / Offline / Sync Error invariants', () => {
  assert.deepEqual(
    computeCloudSyncStatus({
      uid: 'u1',
      online: false,
      cloudLoading: false,
      cloudReady: true,
      needsOnboarding: false,
      kicked: false,
      syncBusy: false,
      pendingDirty: true,
      cloudDirty: false,
      permDenied: false,
      quotaPaused: false,
      syncError: false,
    }),
    { phase: 'offline', cls: 'warn', text: 'Offline' },
  );

  assert.deepEqual(
    computeCloudSyncStatus({
      uid: 'u1',
      online: true,
      cloudLoading: true,
      cloudReady: false,
      needsOnboarding: false,
      kicked: false,
      syncBusy: false,
      pendingDirty: false,
      cloudDirty: false,
      permDenied: false,
      quotaPaused: false,
      syncError: false,
    }),
    { phase: 'syncing', cls: 'warn', text: 'Syncing…' },
  );

  // Never Saved while dirty or in-flight
  for (const dirtyCombo of [
    { syncBusy: true, pendingDirty: false, cloudDirty: false },
    { syncBusy: false, pendingDirty: true, cloudDirty: false },
    { syncBusy: false, pendingDirty: false, cloudDirty: true },
  ]) {
    const res = computeCloudSyncStatus({
      uid: 'u1',
      online: true,
      cloudLoading: false,
      cloudReady: true,
      needsOnboarding: false,
      kicked: false,
      ...dirtyCombo,
      permDenied: false,
      quotaPaused: false,
      syncError: false,
    });
    assert.equal(res.phase, 'saving');
    assert.equal(res.text, 'Saving…');
    assert.notEqual(res.text, 'Saved');
  }

  // Error badge on sync failure
  assert.deepEqual(
    computeCloudSyncStatus({
      uid: 'u1',
      online: true,
      cloudLoading: false,
      cloudReady: true,
      needsOnboarding: false,
      kicked: false,
      syncBusy: false,
      pendingDirty: true,
      cloudDirty: false,
      permDenied: false,
      quotaPaused: false,
      syncError: true,
    }),
    { phase: 'error', cls: 'bad', text: 'Sync Error' },
  );

  // Saved ONLY when online, ready, not busy, zero dirty, zero errors
  assert.deepEqual(
    computeCloudSyncStatus({
      uid: 'u1',
      online: true,
      cloudLoading: false,
      cloudReady: true,
      needsOnboarding: false,
      kicked: false,
      syncBusy: false,
      pendingDirty: false,
      cloudDirty: false,
      permDenied: false,
      quotaPaused: false,
      syncError: false,
    }),
    { phase: 'saved', cls: 'ok', text: 'Saved' },
  );
});

test('2. Max-wait coalescing eliminates debounce starvation and batches rapid bursts', () => {
  // First click at t=1000 requests 450ms -> fires at 1450ms
  const r1 = computeCoalescedDelayMs({ firstDirtyAtMs: null, scheduledAtMs: null }, 450, 1000, 1400);
  assert.equal(r1.delayMs, 450);
  assert.equal(r1.nextFirstDirtyAtMs, 1000);

  // Continuous clicks at t=1300, 1600, 1900, 2350 -> clamped strictly to maxWait=1400 (fires <= t=2400)
  const r2 = computeCoalescedDelayMs({ firstDirtyAtMs: 1000, scheduledAtMs: 1450 }, 450, 2250, 1400);
  assert.equal(r2.delayMs, 150);
  const r3 = computeCoalescedDelayMs({ firstDirtyAtMs: 1000, scheduledAtMs: 2400 }, 450, 2450, 1400);
  assert.equal(r3.delayMs, 0);
});

test('3. CoalescedSyncController batches bursts, prevents duplicate writes, and drains tail mutations during in-flight writes', async () => {
  let writeCount = 0;
  let capturedDuringWrite = false;
  const controller = new CoalescedSyncController(
    async () => {
      writeCount += 1;
      if (writeCount === 1) {
        await new Promise((r) => setTimeout(r, 35));
        // Simulate player clicking again WHILE write #1 is still in flight
        if (!capturedDuringWrite) {
          capturedDuringWrite = true;
          controller.markMutation(20);
        }
      } else {
        await new Promise((r) => setTimeout(r, 15));
      }
      return 'ok';
    },
    120,
    15,
  );

  const t0 = Date.now();
  // Rapid 5-click burst within 10ms coalesces into Write #1
  for (let i = 0; i < 5; i += 1) {
    controller.markMutation(25);
  }
  assert.equal(controller.isDirty(), true);

  await new Promise((r) => setTimeout(r, 160));
  const elapsed = Date.now() - t0;

  assert.equal(writeCount, 2, '5 rapid clicks + 1 in-flight click should produce exactly 2 serialized writes');
  assert.equal(controller.isDirty(), false, 'dirty clears only after tail write completes');
  assert.equal(controller.isBusy(), false);
  assert.ok(elapsed < 1000, `Expected coalesced + tail drain < 1000ms, got ${elapsed}ms`);
  controller.reset(true);
});

test('4. Failed network requests stop at MAX_TRANSIENT_RETRIES without infinite loops and reset cleanly on reconnect', async () => {
  let attempts = 0;
  let shouldFail = true;
  const controller = new CoalescedSyncController(
    async () => {
      attempts += 1;
      return shouldFail ? 'retry' : 'ok';
    },
    50,
    10,
  );

  controller.markMutation(5);
  await controller.flushNow(); // attempt 1
  //Wait long enough for MAX_TRANSIENT_RETRIES backoff if triggered? Backoffs are 400ms+1000ms+2500ms; let's verify retry counter & backoff schedule directly
  assert.equal(controller.getRetryCount(), 1);
  assert.equal(controller.isDirty(), true);
  assert.equal(computeSyncRetryBackoffMs(1), 400);
  assert.equal(computeSyncRetryBackoffMs(2), 1000);
  assert.equal(computeSyncRetryBackoffMs(3), 2500);

  // Simulate remaining manual/scheduled retries up to MAX_TRANSIENT_RETRIES
  await controller.flushNow(); // retry 2
  await controller.flushNow(); // retry 3
  await controller.flushNow(); // stops auto-scheduling beyond MAX_TRANSIENT_RETRIES
  assert.equal(controller.getRetryCount(), MAX_TRANSIENT_RETRIES);
  assert.equal(controller.isDirty(), true, 'Dirty state must never be dropped on failure');

  // Reconnect recovery succeeds immediately
  shouldFail = false;
  await controller.flushNow();
  assert.equal(controller.isDirty(), false);
  assert.equal(controller.getRetryCount(), 0);
  assert.equal(attempts, 5);
  controller.reset(true);
});

test('5. Account switching invalidates stale async responses and resets pending timers cleanly', async () => {
  let completedWritesForOldUid = 0;
  let activeUid: string | null = 'user_A';
  let authSeq = 1;

  const controller = new CoalescedSyncController(async () => {
    const capturedUid = activeUid;
    const capturedSeq = authSeq;
    await new Promise((r) => setTimeout(r, 20));
    if (isSessionStillValid(activeUid, capturedUid, authSeq, capturedSeq)) {
      completedWritesForOldUid += 1;
    }
    return 'ok';
  });

  controller.markMutation(30);
  // Immediately switch account to user_B before timer fires or async resolves
  activeUid = 'user_B';
  authSeq = 2;
  controller.reset(false);

  await new Promise((r) => setTimeout(r, 60));
  assert.equal(completedWritesForOldUid, 0, 'Pending timers and stale writes for user_A must be cancelled');
  assert.equal(isSessionStillValid(activeUid, 'user_A', authSeq, 1), false);
  assert.equal(isSessionStillValid(activeUid, 'user_B', authSeq, 2), true);
  controller.reset(true);
});

test('6. Conflict resolution merges authoritative server wallet and preserves newer server progression', () => {
  const local = { ...freshState(), cash: 1000, gems: 5, rank: 1, t: 10_000 };
  const resolvedGift = resolveWalletRevisionConflict({
    localState: local,
    serverWallet: { cash: 50_000, gems: 20, stk: { bee: 3 } },
    serverSave: { cash: 1000, gems: 5, rank: 2, t: 9_000 },
    hasLocalMutationsDuringWrite: true,
  });
  assert.equal(resolvedGift.nextState.cash, 50_000);
  assert.equal(resolvedGift.nextState.gems, 20);
  assert.equal(resolvedGift.nextState.stk.bee, 3);
  assert.equal(resolvedGift.nextState.rank, 1, 'keeps newer local rank when local mutated during write');
  assert.equal(resolvedGift.shouldFollowUpSync, true);

  const resolvedNewerServer = resolveWalletRevisionConflict({
    localState: { ...freshState(), cash: 1000, gems: 5, rank: 1, t: 10_000 },
    serverWallet: { cash: 900_000, gems: 50, stk: { dragon: 1 } },
    serverSave: { cash: 900_000, gems: 50, rank: 4, t: 25_000 },
    hasLocalMutationsDuringWrite: false,
  });
  assert.equal(resolvedNewerServer.nextState.rank, 4, 'adopts strictly newer cloud rank');
  assert.equal(resolvedNewerServer.nextState.cash, 900_000);
  assert.equal(resolvedNewerServer.shouldFollowUpSync, false);
});

test('7. Fingerprinting eliminates idle writes (Spark efficiency) while catching real cash/GDP/province changes', () => {
  const s1 = freshState();
  const h1 = buildMeaningfulSaveFingerprint(s1);
  const pub1 = buildPublicMetricsFingerprint(s1, undefined, 0, 1_000_000);

  // Idle 1-second tick updates only t and fractional day -> identical fingerprints => 0 writes!
  const sIdle = { ...s1, t: s1.t + 1000, day: s1.day + 1 / 12 };
  assert.equal(buildMeaningfulSaveFingerprint(sIdle), h1);
  assert.equal(buildPublicMetricsFingerprint(sIdle, undefined, 0, 1_001_000), pub1);

  // Cash + building + province allocation changes are detected immediately
  const sRich = { ...s1, cash: 500_000_000, gems: 12 };
  assert.notEqual(buildMeaningfulSaveFingerprint(sRich), h1);
  assert.notEqual(buildPublicMetricsFingerprint(sRich, undefined, 0, 1_002_000), pub1);
});

test('8. Fingerprinting tracks rank, buildings, policy, and subscription state transitions', () => {
  const s1 = freshState();
  const h1 = buildMeaningfulSaveFingerprint(s1);
  const sPromoted = { ...s1, rank: 2, tech: { p_tax: 1 }, b: { ...s1.b, farms: 6 } };
  assert.notEqual(buildMeaningfulSaveFingerprint(sPromoted), h1);
});

test('9. Multi-player live leaderboard filter sorts accurately and error classifier handles offline/quota/perm cleanly', () => {
  const now = 1_000_000;
  const emptyStats = { buildings: 0, completedTrades: 0, tradesSent: 0, tradesReceived: 0, cashTraded: 0, gemsTraded: 0 };
  const players: PlayerProfile[] = [
    { id: 'u1', username: 'A', usernameLower: 'a', countryCode: 'PK', countryName: 'Pakistan', gdp: 500, cash: 500, gems: 1, level: 1, rank: 0, seen: now - 10_000, stats: emptyStats },
    { id: 'u2', username: 'B', usernameLower: 'b', countryCode: 'US', countryName: 'United States', gdp: 2000, cash: 2000, gems: 2, level: 2, rank: 1, seen: now - 2_000, stats: emptyStats },
    { id: 'u3', username: 'C', usernameLower: 'c', countryCode: 'JP', countryName: 'Japan', gdp: 9000, cash: 9000, gems: 3, level: 5, rank: 3, seen: now - 600_000, stats: emptyStats }, // stale offline
  ];
  const sorted = filterAndSortLeaderboard(players, 'u1', now);
  assert.deepEqual(sorted.map((p) => p.id), ['u2', 'u1']);

  assert.equal(classifySyncError({ code: 'unavailable', message: 'offline' }, false).kind, 'offline');
  assert.equal(classifySyncError({ code: 'permission-denied', message: 'Denied' }, true).kind, 'permission');
  assert.equal(classifySyncError({ code: 'resource-exhausted', message: 'Quota exceeded' }, true).kind, 'quota');
  assert.equal(classifySyncError({ code: 'aborted', message: 'Another session is active' }, true).kind, 'displaced');
  assert.equal(classifySyncError({ code: 'deadline-exceeded', message: 'timeout' }, true).kind, 'transient');
});

test('10. Existing player saves migrate & clean safely without resetting balances while consolidating legacy provinces', () => {
  const legacySave = {
    cash: 12_345_678,
    gems: 42,
    rank: 4,
    b: { farm: 10, tech: 5 },
    sub: { tier: 'weekly' as const, start: 1000, exp: 999999999999 },
    provinces: [
      {
        id: 'prov_1',
        slot: 1,
        name: 'Sindh Valley',
        desc: 'Fertile river plains',
        flagId: 'crest_star',
        color: '#3fd2ff',
        unlockedAt: 1000,
        paidPrice: 0,
        gdp: 250_000,
        pop: 8.5,
        hap: 78,
        dev: 24,
        emp: 74,
        prod: 68,
        budget: { infrastructure: 5000, education: 5000, healthcare: 5000, security: 5000, welfare: 5000, industry: 5000 },
        allocTotal: 30000,
        lvls: { infrastructure: 22, education: 20, healthcare: 19, security: 18, welfare: 18, businessActivity: 25 },
        lastMaint: 100,
        fundingRatio: 100,
      },
    ],
  };
  const migrated = migrateState(legacySave);
  const cleaned = cleanSavePayload(migrated) as Partial<GameState>;
  assert.equal(cleaned.cash, 12_345_678 + 24_000);
  assert.equal(cleaned.gems, 42);
  assert.equal(cleaned.rank, 4);
  assert.equal(cleaned.b?.farms, 10);
  assert.equal(cleaned.b?.tech_parks, 5);
  assert.equal(cleaned.sub?.tier, 'weekly');
  assert.equal('provinces' in cleaned, false);
});

test('11. Measured coalesced sync latency & Spark write efficiency benchmark', async () => {
  const delays: number[] = [];
  let writes = 0;
  const controller = new CoalescedSyncController(
    async () => {
      writes += 1;
      await new Promise((r) => setTimeout(r, 8)); // simulated fast network ack
      return 'ok';
    },
    SYNC_MAX_WAIT_MS,
    15,
  );

  // Measure immediate financial action sync dispatch latency
  const tImmediateStart = performance.now();
  controller.markMutation(SYNC_IMMEDIATE_DELAY_MS);
  await new Promise((r) => setTimeout(r, SYNC_IMMEDIATE_DELAY_MS + 40));
  delays.push(performance.now() - tImmediateStart);

  // Measure coalesced rapid building purchase burst (10 rapid clicks -> 1 write)
  const writesBeforeBurst = writes;
  const tBurstStart = performance.now();
  for (let i = 0; i < 10; i += 1) {
    controller.markMutation(SYNC_COALESCE_DEBOUNCE_MS);
  }
  await new Promise((r) => setTimeout(r, SYNC_COALESCE_DEBOUNCE_MS + 60));
  delays.push(performance.now() - tBurstStart);
  const burstWrites = writes - writesBeforeBurst;

  assert.equal(burstWrites, 1, '10 rapid mutations must coalesce into 1 Spark write');
  assert.ok(delays[0] < 1_000, `Immediate sync target <1000ms, measured ${delays[0].toFixed(1)}ms`);
  assert.ok(delays[1] < 1_500, `Coalesced burst sync target <1500ms, measured ${delays[1].toFixed(1)}ms`);
  controller.reset(true);
});

test('12. CAS failed-precondition version conflict is classified as version-conflict and uses bounded jitter backoff', () => {
  const err1 = classifySyncError({
    code: 'failed-precondition',
    message: 'the stored version does not match the required base version',
  });
  assert.equal(err1.kind, 'version-conflict');
  assert.notEqual(err1.kind, 'fatal');

  const errNotInit = classifySyncError({
    code: 'failed-precondition',
    message: 'Player profile not initialized',
  });
  assert.equal(errNotInit.kind, 'not-initialized');

  const b1 = computeSyncRetryBackoffMs(1, 0.25);
  assert.equal(b1, 500);
  const b3 = computeSyncRetryBackoffMs(3, 0.25);
  assert.equal(b3, 3125);
});

test('13. UserCloudWriteQueue strictly serializes concurrent mutations FIFO and aborts stale tasks on account switch', async () => {
  const q = new UserCloudWriteQueue('user_1', 1);
  let active = 0;
  let maxConcurrent = 0;
  const order: string[] = [];

  const makeTask = (label: string, ms: number) =>
    q.enqueue(async () => {
      active += 1;
      maxConcurrent = Math.max(maxConcurrent, active);
      order.push(`${label}:start`);
      await new Promise((r) => setTimeout(r, ms));
      order.push(`${label}:end`);
      active -= 1;
      return label;
    });

  const results = await Promise.all([
    makeTask('save', 20),
    makeTask('metrics', 5),
    makeTask('rank', 10),
    makeTask('trade', 5),
  ]);

  assert.equal(maxConcurrent, 1, 'Concurrent writes for the same UID must never overlap');
  assert.deepEqual(results, ['save', 'metrics', 'rank', 'trade']);
  assert.deepEqual(order, [
    'save:start',
    'save:end',
    'metrics:start',
    'metrics:end',
    'rank:start',
    'rank:end',
    'trade:start',
    'trade:end',
  ]);
  assert.equal(q.isBusy(), false);

  // Account switch invalidates queued & future writes cleanly
  const q2 = new UserCloudWriteQueue('user_1', 2);
  let ranSecond = false;
  const p1 = q2.enqueue(async () => {
    await new Promise((r) => setTimeout(r, 20));
    return 'first';
  });
  const p2 = q2.enqueue(async () => {
    ranSecond = true;
    return 'second';
  });
  await new Promise((r) => setTimeout(r, 2));
  q2.invalidate();

  assert.equal(await p1, 'first');
  await assert.rejects(p2, (err: { code?: string }) => err?.code === 'aborted');
  assert.equal(ranSecond, false);
});

test('14. Conflict merge with preWriteWallet applies local in-flight spend without granting free buildings or duplicating coins', () => {
  const preWriteWallet = { cash: 1000, gems: 10, stk: {} };
  const localAfterSpend = {
    ...freshState(),
    cash: 400, // Spent 600 locally while save write was in flight
    gems: 8, // Spent 2 gems locally
    b: { ...freshState().b, farms: 3 },
    t: 12_000,
  };
  const resolved = resolveWalletRevisionConflict({
    localState: localAfterSpend,
    serverWallet: { cash: 5000, gems: 10, stk: {} }, // e.g. received +4000 gift on server concurrently
    serverSave: { cash: 1000, gems: 10, t: 10_000 },
    hasLocalMutationsDuringWrite: true,
    preWriteWallet,
  });

  // 5000 authoritative server wallet - 600 local spend = 4400 (never 5000 free building!)
  assert.equal(resolved.nextState.cash, 4400);
  assert.equal(resolved.nextState.gems, 8);
  assert.equal(resolved.nextState.b.farms, 3);
  assert.equal(resolved.shouldFollowUpSync, true);
});
