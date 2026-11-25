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
  assert.match(rules, /affectedOnly\(\['gdp', 'cash', 'gems', 'level', 'rank', 'lastSeen', 'stats', 'subTier', 'subExp'\]\)/);
  assert.match(rules, /affectedOnly\(\['progressMs', 'lastTickAt', 'status', 'resolvedAt'\]\)[\s\S]*incoming\(\)\.status in \['done', 'failed'\]/);
  assert.match(rules, /\(!\('rev' in existing\(\)\) \|\| !\(existing\(\)\.rev is number\) \|\| incoming\(\)\.rev >= existing\(\)\.rev\)/);

  // 9. Save balance/policy/building bounds, non-whitespace text guards, rank 0..10, and nullable trade resolvedAt
  assert.match(rules, /data\.save\.cash >= 0/);
  assert.match(rules, /data\.save\.gems >= 0/);
  assert.match(rules, /data\.save\.tax >= 5 && data\.save\.tax <= 45/);
  assert.match(rules, /data\.save\.wel >= 0 && data\.save\.wel <= 50/);
  assert.match(rules, /data\.save\.hap >= 0 && data\.save\.hap <= 100/);
  assert.match(rules, /data\.save\.pop >= 1 && data\.save\.pop <= 100000/);
  assert.match(rules, /data\.save\.gov in \['rep', 'tech', 'wlf', 'ind'\]/);
  assert.match(rules, /data\.save\.activeFx\.incomeBoostMult <= 1\.75/);
  assert.match(rules, /data\.save\.size\(\) <= 72/);
  assert.match(rules, /data\.save\.b\.size\(\) <= 35/);
  assert.match(rules, /data\.save\.stk\.size\(\) <= 48/);
  assert.match(rules, /data\.stk\.size\(\) <= 48/);
  assert.match(rules, /data\.offerStk\.size\(\) <= 48/);
  assert.match(rules, /data\.save\.wealth >= 0 && data\.save\.wealth <= 20/);
  assert.match(rules, /data\.save\.transitSub >= 0 && data\.save\.transitSub <= 25/);
  assert.match(rules, /data\.save\.milestones\.size\(\) <= 40/);
  assert.match(rules, /data\.save\.crateCd >= 0/);
  assert.match(rules, /data\.save\.rank <= 10/);
  assert.match(rules, /data\.rank <= 10/);
  assert.match(rules, /data\.save\.sub\.tier in \['daily', 'weekly', 'monthly'\]/);
  assert.match(rules, /data\.save\.subPromo\.tier in \['daily', 'weekly', 'monthly'\]/);
  assert.match(rules, /data\.save\.subPromo\.pct >= 5 && data\.save\.subPromo\.pct <= 40/);
  assert.match(rules, /data\.progressMs <= 2400000/);
  assert.match(rules, /data\.participants\[0\] == data\.from && data\.participants\[1\] == data\.to/);
  assert.match(rules, /uid != request\.auth\.uid[\s\S]*existsAfter\(\/databases\/\$\(database\)\/documents\/trades\/\$\(incoming\(\)\.tradeId\)\)/);
  assert.match(rules, /existing\(\)\.paid == 3/);
  assert.match(rules, /request\.time < existing\(\)\.expiresAt/);
  assert.match(rules, /request\.time >= existing\(\)\.expiresAt/);
  assert.match(rules, /pairId != request\.auth\.uid \+ '_' \+ request\.auth\.uid/);
  assert.match(rules, /data\.text\.matches\('\(\?s\)\.\*\\\\S\.\*'\)/);
  assert.match(rules, /'resolvedAt' in data\) \|\| data\.resolvedAt == null \|\| data\.resolvedAt is timestamp/);
  assert.match(rules, /data\.subTier in \['', 'daily', 'weekly', 'monthly'\]/);
  assert.match(rules, /data\.subExp >= 0 && data\.subExp <= 10000000000000/);
  assert.match(rules, /data\.save\.tech\.size\(\) <= 16/);
  assert.match(rules, /data\.save\.hist is list && data\.save\.hist\.size\(\) <= 60/);
  assert.match(rules, /data\.save\.questIds is list && data\.save\.questIds\.size\(\) <= 10/);
  assert.match(rules, /data\.save\.questDay is string && data\.save\.questDay\.size\(\) <= 32/);
  assert.match(rules, /data\.save\.set is map && data\.save\.set\.size\(\) <= 10/);
});

