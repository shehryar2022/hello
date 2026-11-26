import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearErrorLog,
  extractErrorCode,
  extractErrorMessage,
  formatErrorLogReport,
  getErrorLog,
  recordAppError,
  subscribeErrorLog,
} from './errorLog';

test('errorLog records, dedupes, caps at 30, formats, notifies, and clears cleanly', () => {
  clearErrorLog();
  assert.equal(getErrorLog().length, 0);
  assert.equal(formatErrorLogReport(), 'No errors recorded.');

  let notifications = 0;
  const unsub = subscribeErrorLog(() => {
    notifications += 1;
  });

  const first = recordAppError({
    source: 'firestore',
    code: 'permission-denied',
    operationType: 'write',
    path: 'saves/user1',
    message: 'Missing or insufficient permissions.',
    details: '{"path":"saves/user1"}',
  });
  assert.equal(getErrorLog().length, 1);
  assert.equal(notifications, 1);
  assert.equal(first.path, 'saves/user1');

  // Exact duplicate within 3s window should be ignored
  recordAppError({
    source: 'firestore',
    code: 'permission-denied',
    operationType: 'write',
    path: 'saves/user1',
    message: 'Missing or insufficient permissions.',
  });
  assert.equal(getErrorLog().length, 1);
  assert.equal(notifications, 1);

  // Different path should be recorded
  recordAppError({
    source: 'sync',
    code: 'unavailable',
    path: 'players/user1',
    message: 'Temporary offline error',
  });
  assert.equal(getErrorLog().length, 2);
  assert.equal(getErrorLog()[0].path, 'players/user1');

  const report = formatErrorLogReport();
  assert.match(report, /SYNC \(unavailable\).*path=players\/user1/);
  assert.match(report, /FIRESTORE \(permission-denied\).*path=saves\/user1/);

  // Cap at 30 entries
  for (let i = 0; i < 35; i += 1) {
    recordAppError({
      source: 'runtime',
      path: `test/${i}`,
      message: `Error #${i}`,
    });
  }
  assert.equal(getErrorLog().length, 30);
  assert.equal(getErrorLog()[0].message, 'Error #34');

  clearErrorLog();
  assert.equal(getErrorLog().length, 0);
  unsub();

  assert.equal(extractErrorCode({ code: 'auth/invalid-credential' }), 'auth/invalid-credential');
  assert.equal(extractErrorCode(null), '');
  assert.equal(extractErrorMessage(new Error('Boom')), 'Boom');
});
