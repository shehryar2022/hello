import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getApps } from 'firebase/app';
import {
  auth,
  db,
  FIREBASE_CONFIG,
  firebaseApp,
  FIRESTORE_DATABASE_ID,
  isFirebaseConfigured,
} from './config';
import {
  filterAndSortLeaderboard,
  isHeartbeatDue,
  isPlayerOnline,
  shouldRefreshPresenceQuery,
} from './presence';
import type { PlayerProfile } from '../game/types';

function collectRuntimeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectRuntimeFiles(full));
    } else if (/\.(ts|tsx|json|mjs)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

test('Firebase configures pakora-tab once and initializes Firestore strictly with (default) database', () => {
  assert.equal(isFirebaseConfigured, true);
  assert.equal(FIREBASE_CONFIG.projectId, 'pakora-tab');
  assert.equal(FIREBASE_CONFIG.authDomain, 'pakora-tab.firebaseapp.com');
  assert.ok(FIREBASE_CONFIG.apiKey.startsWith('AIza'));
  assert.ok(FIREBASE_CONFIG.appId.includes(':web:'));
  assert.equal('firestoreDatabaseId' in FIREBASE_CONFIG, false);
  assert.equal(FIRESTORE_DATABASE_ID, '(default)');

  assert.ok(firebaseApp !== null);
  assert.equal(getApps().length, 1);
  assert.equal(firebaseApp?.name, '[DEFAULT]');

  assert.ok(auth !== null);
  assert.equal(auth.app, firebaseApp);

  assert.ok(db !== null);
  assert.equal(db.app, firebaseApp);
  assert.equal(
    (db as unknown as { _databaseId?: { database?: string } })._databaseId?.database,
    '(default)',
  );
});

test('Environment variables cannot override default Firestore database selection and runtime code has no named DB references', () => {
  const prevDbEnv = process.env.VITE_FIREBASE_DATABASE_ID;
  process.env.VITE_FIREBASE_DATABASE_ID = 'custom-named-db';
  try {
    assert.equal(
      (db as unknown as { _databaseId?: { database?: string } })._databaseId?.database,
      '(default)',
    );
  } finally {
    if (prevDbEnv === undefined) delete process.env.VITE_FIREBASE_DATABASE_ID;
    else process.env.VITE_FIREBASE_DATABASE_ID = prevDbEnv;
  }

  const appletConfigRaw = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'firebase-applet-config.json'), 'utf8'),
  ) as Record<string, unknown>;
  assert.equal('firestoreDatabaseId' in appletConfigRaw, false);

  const envExample = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
  assert.equal(envExample.includes('VITE_FIREBASE_DATABASE_ID'), false);

  const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('firestoreDatabaseId'), false);
  assert.equal(indexHtml.includes('VITE_FIREBASE_DATABASE_ID'), false);
  assert.equal(indexHtml.includes('ai-studio-hello-92e5e653-773c-4693-a811-557cb0f20367'), false);
  assert.match(indexHtml, /src="\/src\/main\.tsx"/);

  const srcFiles = collectRuntimeFiles(path.resolve(process.cwd(), 'src'));
  let getFirestoreCallCount = 0;
  for (const filePath of srcFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.equal(
      content.includes('firestoreDatabaseId'),
      false,
      `Found leftover firestoreDatabaseId in ${filePath}`,
    );
    assert.equal(
      content.includes('VITE_FIREBASE_DATABASE_ID'),
      false,
      `Found leftover VITE_FIREBASE_DATABASE_ID in ${filePath}`,
    );
    assert.equal(
      content.includes('ai-studio-hello-92e5e653-773c-4693-a811-557cb0f20367'),
      false,
      `Found hardcoded named database ID in ${filePath}`,
    );
    const matches = content.match(/getFirestore\s*\(/g);
    if (matches) {
      getFirestoreCallCount += matches.length;
      assert.ok(
        filePath.endsWith(path.join('firebase', 'config.ts')),
        `getFirestore must only be called in src/firebase/config.ts, found in ${filePath}`,
      );
      assert.match(content, /getFirestore\(initializedApp\)/);
      assert.doesNotMatch(content, /getFirestore\([^)]*,[^)]*\)/);
    }
  }
  assert.equal(getFirestoreCallCount, 1);
});

test('Online/offline player detection, leaderboard filtering, and heartbeat scheduling work accurately', () => {
  const nowSrv = 1_750_000_000_000;
  assert.equal(isPlayerOnline(undefined, nowSrv), false);
  assert.equal(isPlayerOnline(0, nowSrv), false);
  assert.equal(isPlayerOnline(nowSrv - 300_000, nowSrv), true);
  assert.equal(isPlayerOnline(nowSrv - 300_001, nowSrv), false);
  // Slight forward server-time jitter remains online
  assert.equal(isPlayerOnline(nowSrv + 3000, nowSrv), true);

  const makePlayer = (id: string, gdp: number, seen: number): PlayerProfile => ({
    id,
    username: `User_${id}`,
    usernameLower: `user_${id}`,
    countryCode: 'PK',
    countryName: 'Pakistan',
    gdp,
    cash: gdp,
    gems: 0,
    level: 1,
    rank: 0,
    seen,
    stats: {
      buildings: 0,
      completedTrades: 0,
      tradesSent: 0,
      tradesReceived: 0,
      cashTraded: 0,
      gemsTraded: 0,
    },
  });

  const list = filterAndSortLeaderboard(
    [
      makePlayer('me', 1000, nowSrv - 999_999),
      makePlayer('online_rich', 5000, nowSrv - 60_000),
      makePlayer('offline_rich', 999_999, nowSrv - 305_000),
      makePlayer('online_mid', 2000, nowSrv - 299_000),
    ],
    'me',
    nowSrv,
  );
  assert.deepEqual(
    list.map((p) => p.id),
    ['online_rich', 'online_mid', 'me'],
  );

  // Heartbeat scheduling & failure retry recovery
  assert.equal(isHeartbeatDue(0, 0, nowSrv), true);
  assert.equal(isHeartbeatDue(0, nowSrv - 10_000, nowSrv), false);
  assert.equal(isHeartbeatDue(0, nowSrv - 30_000, nowSrv), true);
  assert.equal(isHeartbeatDue(nowSrv - 60_000, nowSrv - 60_000, nowSrv), false);
  assert.equal(isHeartbeatDue(nowSrv - 180_000, nowSrv - 180_000, nowSrv), true);

  // Presence query refreshes when skewed clock calibrates
  assert.equal(shouldRefreshPresenceQuery(0, -400_000, false), true);
  assert.equal(shouldRefreshPresenceQuery(0, 500, false), false);
  assert.equal(shouldRefreshPresenceQuery(500, 60_000, true), true);
});
