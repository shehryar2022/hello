import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rules = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8')) as {
  firestore: Record<string, unknown>;
};

test('firestore.rules begins with rules_version 2 and global default-deny catch-all', () => {
  assert.match(rules, /^rules_version\s*=\s*'2';/);
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules covers every collection declared in firebase-blueprint.json', () => {
  const expectedMatchers = [
    'match /usernames/{usernameLower}',
    'match /players/{uid}',
    'match /private/wallet',
    'match /private/session',
    'match /notifications/{notificationId}',
    'match /projects/{projectId}',
    'match /saves/{uid}',
    'match /trades/{tradeId}',
    'match /dailyLimits/{limitId}',
    'match /globalChat/{messageId}',
    'match /dms/{pairId}/messages/{messageId}',
  ];
  assert.equal(Object.keys(blueprint.firestore).length, expectedMatchers.length);
  for (const m of expectedMatchers) {
    assert.ok(rules.includes(m), `Missing match block: ${m}`);
  }
});

test('Dirty Dozen security invariants are enforced in firestore.rules', () => {
  // 1. Shadow field & schema validation helpers exist on all writeable entities
  for (const helper of [
    'isValidUsernameDoc',
    'isValidPlayerProfile',
    'isValidWallet',
    'isValidSession',
    'isValidSave',
    'isValidNotification',
    'isValidProject',
    'isValidTrade',
    'isValidDailyLimit',
    'isValidGlobalChat',
    'isValidDmMessage',
  ]) {
    assert.ok(rules.includes(`function ${helper}(`), `Missing helper ${helper}`);
    assert.ok(rules.includes(`${helper}(incoming())`), `Helper ${helper} must validate incoming()`);
  }

  // 2. Trade isolation, self-accept block, double-refund block
  assert.match(rules, /request\.auth\.uid in resource\.data\.participants/);
  assert.match(rules, /incoming\(\)\.from == request\.auth\.uid/);
  assert.match(rules, /incoming\(\)\.to != request\.auth\.uid/);
  assert.match(rules, /existing\(\)\.status == 'pending' && request\.auth\.uid == existing\(\)\.to/);
  assert.match(rules, /existing\(\)\.refunded == false && request\.auth\.uid == existing\(\)\.from/);

  // 3. Daily limit strictly bounded 1..15 and incremented by 1
  assert.match(rules, /incoming\(\)\.count == existing\(\)\.count \+ 1/);
  assert.match(rules, /incoming\(\)\.count <= 15/);

  // 4. DMs strictly restricted to pairId participants
  assert.match(rules, /function isDmMember\(pairId\)/);

  // 5. Private wallet, session, saves strictly owner-only
  assert.match(rules, /match \/private\/wallet[\s\S]*allow get: if isOwner\(uid\)/);
  assert.match(rules, /match \/saves\/\{uid\}[\s\S]*allow get: if isOwner\(uid\)/);

  // 6. Immutable fields preserved on profile updates
  assert.match(rules, /incoming\(\)\.username == existing\(\)\.username/);
  assert.match(rules, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);

  // 7. No client-timestamp spoofing on serverTimestamp fields
  assert.match(rules, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rules, /incoming\(\)\.lastSeen == request\.time/);

  // 8. Legacy player updates, heartbeat-only updates, and atomic project completion/failure
  assert.match(rules, /'createdAt' in incoming\(\)/);
  assert.match(rules, /affectedOnly\(\['lastSeen'\]\)/);
  assert.match(rules, /affectedOnly\(\['progressMs', 'lastTickAt', 'status', 'resolvedAt'\]\)[\s\S]*incoming\(\)\.status in \['done', 'failed'\]/);
  assert.match(rules, /\(!\('rev' in existing\(\)\) \|\| incoming\(\)\.rev >= existing\(\)\.rev\)/);

  // 9. Save balance bounds, non-whitespace text guards, and nullable trade resolvedAt
  assert.match(rules, /data\.save\.cash >= 0/);
  assert.match(rules, /data\.save\.gems >= 0/);
  assert.match(rules, /data\.text\.matches\('\(\?s\)\.\*\\\\S\.\*'\)/);
  assert.match(rules, /'resolvedAt' in data\) \|\| data\.resolvedAt == null \|\| data\.resolvedAt is timestamp/);
});
