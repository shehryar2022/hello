import test from 'node:test';
import assert from 'node:assert/strict';
import { getApps } from 'firebase/app';
import {
  auth,
  db,
  FIREBASE_CONFIG,
  firebaseApp,
  isFirebaseConfigured,
} from './config';

test('Firebase configures pakora-tab once and initializes Auth and Firestore cleanly', () => {
  assert.equal(isFirebaseConfigured, true);
  assert.equal(FIREBASE_CONFIG.projectId, 'pakora-tab');
  assert.equal(FIREBASE_CONFIG.authDomain, 'pakora-tab.firebaseapp.com');
  assert.ok(FIREBASE_CONFIG.apiKey.startsWith('AIza'));
  assert.ok(FIREBASE_CONFIG.appId.includes(':web:'));

  assert.ok(firebaseApp !== null);
  assert.equal(getApps().length, 1);
  assert.equal(firebaseApp?.name, '[DEFAULT]');

  assert.ok(auth !== null);
  assert.equal(auth.app, firebaseApp);

  assert.ok(db !== null);
  assert.equal(db.app, firebaseApp);
});
