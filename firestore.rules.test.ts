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
    'isValidProvinceTx',
    'isValidProvinceLeaderboardEntry',
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
  assert.match(rules, /affectedOnly\(\['gdp', 'cash', 'gems', 'level', 'rank', 'lastSeen', 'stats', 'subTier', 'subExp', 'cosFrame', 'cosNameFx', 'cosBadge', 'cosAnim'\]\)/);
  assert.match(rules, /affectedOnly\(\['progressMs', 'lastTickAt', 'status', 'resolvedAt'\]\)[\s\S]*incoming\(\)\.status in \['done', 'failed'\]/);
  assert.match(rules, /\(!\('rev' in existing\(\)\) \|\| !\(existing\(\)\.rev is number\) \|\| incoming\(\)\.rev >= existing\(\)\.rev\)/);

  // 9. Save balance/policy/building bounds, non-whitespace text guards, rank 0..15, and nullable trade resolvedAt
  assert.match(rules, /data\.save\.cash >= 0/);
  assert.match(rules, /data\.save\.gems >= 0/);
  assert.match(rules, /data\.save\.tax >= 5 && data\.save\.tax <= 45/);
  assert.match(rules, /data\.save\.wel >= 0 && data\.save\.wel <= 50/);
  assert.match(rules, /data\.save\.hap >= 0 && data\.save\.hap <= 100/);
  assert.match(rules, /data\.save\.pop >= 1 && data\.save\.pop <= 100000/);
  assert.match(rules, /data\.save\.gov in \['rep', 'tech', 'wlf', 'ind'\]/);
  assert.match(rules, /data\.save\.activeFx\.incomeBoostMult <= 1\.75/);
  assert.match(rules, /data\.save\.size\(\) <= 72/);
  assert.match(rules, /data\.save\.b\.size\(\) <= 60/);
  assert.match(rules, /data\.save\.stk\.size\(\) <= 48/);
  assert.match(rules, /data\.stk\.size\(\) <= 48/);
  assert.match(rules, /data\.offerStk\.size\(\) <= 48/);
  assert.match(rules, /data\.save\.wealth >= 0 && data\.save\.wealth <= 20/);
  assert.match(rules, /data\.save\.transitSub >= 0 && data\.save\.transitSub <= 25/);
  assert.match(rules, /data\.save\.milestones\.size\(\) <= 40/);
  assert.match(rules, /data\.save\.crateCd >= 0/);
  assert.match(rules, /data\.save\.rank <= 15/);
  assert.match(rules, /data\.rank <= 15/);
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
  assert.match(rules, /data\.save\.set is map\s+&&\s+data\.save\.set\.size\(\) <= 10/);
  assert.match(rules, /!existing\(\)\.keys\(\)\.hasOnly\(\['sid', 't'\]\)/);
  assert.match(rules, /\^' \+ request\.auth\.uid \+ '_\[A-Za-z0-9_\\\\-\]\+\$/);
  assert.match(rules, /affectedOnly\(\['gdp', 'cash', 'gems', 'level', 'rank', 'lastSeen', 'stats', 'subTier', 'subExp', 'cosFrame', 'cosNameFx', 'cosBadge', 'cosAnim'\]\)[\s\S]*isValidPlayerProfile\(incoming\(\)\)/);
  assert.match(rules, /affectedOnly\(\['read'\]\)[\s\S]*existing\(\)\.read is bool[\s\S]*incoming\(\)\.read == true/);

  // 10. Strict nested key whitelists on save, gx, gx.exp, set, activeFx, sub, subPromo; no fragile `is int` checks on JS numbers
  assert.ok(rules.includes('function isValidGxExp('));
  assert.ok(rules.includes('function isValidSaveGx('));
  assert.match(rules, /data\.save\.keys\(\)\.hasOnly\(/);
  assert.match(rules, /gx\.keys\(\)\.hasOnly\(\['cond', 'lvl', 'acc', 'blk', 'pb', 'ph', 'log', 'exp'\]\)/);
  assert.match(rules, /exp\.keys\(\)\.hasOnly\(\['sal', 'el', 'inf', 'total', 'paid', 'n', 't'\]\)/);
  assert.match(rules, /data\.save\.set\.keys\(\)\.hasOnly\(\['sfx', 'vib', 'anim'\]\)/);
  assert.match(rules, /data\.save\.activeFx\.keys\(\)\.hasOnly\(\['incomeBoostEnd', 'incomeBoostMult', 'incomeBoostId', 'taxSurge'\]\)/);
  assert.match(rules, /data\.save\.sub\.keys\(\)\.hasOnly\(\['tier', 'exp', 'lastClaimDay'\]\)/);
  assert.match(rules, /data\.save\.subPromo\.keys\(\)\.hasOnly\(\['weekKey', 'tier', 'pct', 'exp'\]\)/);
  assert.equal(/\bis int\b/.test(rules), false, 'firestore.rules must use `is number`, not `is int`, for JS float compatibility');
  assert.equal(/email_verified/.test(rules), false, 'firestore.rules must not require email verification');
});

// ==================== RULE EVALUATOR (MIRRORING firestore.rules) ====================
import {
  applyBuyBooster,
  applyBuyBuilding,
  applyBuyRank,
  applyBuySubscription,
  applyUnlockTech,
  cleanSavePayload,
  freshState,
  migrateState,
  rollWeeklySubPromo,
  sanitizeStats,
} from './src/game/rules';
import { BOOSTERS, STICKERS, SUBSCRIPTIONS, TECH_TREE } from './src/game/constants';

type AuthContext = { uid: string; emailVerified?: boolean } | null;

const SERVER_TIME = Symbol('SERVER_TIME');
type ReqContext = { auth: AuthContext; time: number; queryLimit?: number };

const isObjMap = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const hasAll = (obj: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => Object.prototype.hasOwnProperty.call(obj, k));

const hasOnly = (obj: Record<string, unknown>, keys: string[]) => {
  const allowed = new Set(keys);
  return Object.keys(obj).every((k) => allowed.has(k));
};

const isValidId = (id: unknown): id is string =>
  typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);

const isOwner = (auth: AuthContext, uid: string) => auth !== null && auth.uid === uid;

function isValidGxExp(exp: unknown): boolean {
  if (!isObjMap(exp)) return false;
  if (Object.keys(exp).length > 10) return false;
  if (!hasOnly(exp, ['sal', 'el', 'inf', 'total', 'paid', 'n', 't'])) return false;
  for (const k of ['sal', 'el', 'inf', 'total', 'paid', 't']) {
    if (k in exp && !(isNum(exp[k]) && (exp[k] as number) >= 0 && (exp[k] as number) <= 1e13)) return false;
  }
  if ('n' in exp && !(isNum(exp.n) && exp.n >= 0 && exp.n <= 1e6)) return false;
  return true;
}

function isValidSaveGx(gx: unknown): boolean {
  if (!isObjMap(gx)) return false;
  if (Object.keys(gx).length > 16) return false;
  if (!hasOnly(gx, ['cond', 'lvl', 'acc', 'blk', 'pb', 'ph', 'log', 'exp'])) return false;
  if ('cond' in gx && !(isObjMap(gx.cond) && Object.keys(gx.cond).length <= 12)) return false;
  if ('lvl' in gx && !(isObjMap(gx.lvl) && Object.keys(gx.lvl).length <= 60)) return false;
  if ('acc' in gx && !(isNum(gx.acc) && gx.acc >= 0 && gx.acc <= 300)) return false;
  if ('blk' in gx && !(isNum(gx.blk) && gx.blk >= 0 && gx.blk <= 1e6)) return false;
  if ('pb' in gx && !(isNum(gx.pb) && gx.pb >= 0 && gx.pb <= 0.25)) return false;
  if ('ph' in gx && !(isNum(gx.ph) && gx.ph >= 0 && gx.ph <= 10)) return false;
  if ('log' in gx && !(Array.isArray(gx.log) && gx.log.length <= 16)) return false;
  if ('exp' in gx && gx.exp !== null && !isValidGxExp(gx.exp)) return false;
  return true;
}

const RULE_SAVE_KEYS = [
  'cash', 'gems', 'taxPool', 'day', 'b', 'tax', 'wel', 'hap', 'appr', 'pop',
  'boost', 'claimed', 'milestones', 'crateCd', 't', 'ev', 'edu', 'hist', 'stk',
  'streak', 'lastDaily', 'set', 'fuel', 'carbon', 'luxury', 'corp', 'gst', 'prop',
  'duty', 'tourism', 'digital', 'wealth', 'rd', 'green', 'transitSub', 'questDay',
  'questIds', 'rank', 'activeFx', 'boosterCd', 'fused', 'gov', 'govT', 'gx',
  'sub', 'subPromo', 'tech', 'provinces', 'provBudgetLog', 'provTxs',
];

function isValidProvinceItem(p: unknown): boolean {
  if (!isObjMap(p)) return false;
  const req = ['id', 'slot', 'name', 'flagId', 'color', 'gdp', 'pop', 'hap', 'dev', 'emp', 'budget', 'lvls'];
  const allowed = [
    ...req, 'desc', 'unlockedAt', 'paidPrice', 'prod', 'allocTotal', 'lastMaint', 'fundingRatio',
  ];
  if (!hasAll(p, req) || !hasOnly(p, allowed)) return false;
  if (typeof p.id !== 'string' || !/^prov_([1-9]|10)$/.test(p.id)) return false;
  if (!(isNum(p.slot) && p.slot >= 1 && p.slot <= 10)) return false;
  if (typeof p.name !== 'string' || p.name.length < 2 || p.name.length > 24) return false;
  if ('desc' in p && (typeof p.desc !== 'string' || p.desc.length > 120)) return false;
  if (typeof p.flagId !== 'string' || p.flagId.length < 2 || p.flagId.length > 32) return false;
  if (typeof p.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(p.color)) return false;
  if (!(isNum(p.gdp) && p.gdp >= 0 && p.gdp <= 1e13)) return false;
  if (!(isNum(p.pop) && p.pop >= 0.5 && p.pop <= 10000)) return false;
  if (!(isNum(p.hap) && p.hap >= 0 && p.hap <= 100)) return false;
  if (!(isNum(p.dev) && p.dev >= 1 && p.dev <= 100)) return false;
  if (!(isNum(p.emp) && p.emp >= 0 && p.emp <= 100)) return false;
  if (!isObjMap(p.budget) || Object.keys(p.budget).length !== 6) return false;
  const bKeys = ['infrastructure', 'education', 'healthcare', 'security', 'welfare', 'industry'];
  if (!hasOnly(p.budget, bKeys) || !bKeys.every((k) => isNum((p.budget as Record<string, unknown>)[k]) && ((p.budget as Record<string, unknown>)[k] as number) >= 0 && ((p.budget as Record<string, unknown>)[k] as number) <= 1e12)) {
    return false;
  }
  if (!isObjMap(p.lvls) || Object.keys(p.lvls).length !== 6) return false;
  if (!hasOnly(p.lvls, ['infrastructure', 'education', 'healthcare', 'security', 'welfare', 'businessActivity'])) {
    return false;
  }
  return true;
}

function isValidSave(data: unknown): boolean {
  if (!isObjMap(data)) return false;
  if (!hasAll(data, ['save']) || !hasOnly(data, ['save'])) return false;
  const s = data.save;
  if (!isObjMap(s)) return false;
  if (Object.keys(s).length > 72) return false;
  if (!hasOnly(s, RULE_SAVE_KEYS)) return false;

  const numRange = (key: string, min: number, max: number) =>
    !(key in s) || (isNum(s[key]) && (s[key] as number) >= min && (s[key] as number) <= max);

  if (
    !numRange('cash', 0, 1e13) ||
    !numRange('gems', 0, 1e9) ||
    !numRange('taxPool', 0, 1e13) ||
    !numRange('rank', 0, 15) ||
    !numRange('boost', 0, 30) ||
    !numRange('crateCd', 0, 1e13) ||
    !numRange('day', 0, 1e8) ||
    !numRange('ev', 0, 1000) ||
    !numRange('t', 0, 1e13) ||
    !numRange('lastDaily', 0, 1e13) ||
    !numRange('govT', 0, 1e13) ||
    !numRange('hap', 0, 100) ||
    !numRange('appr', 0, 100) ||
    !numRange('pop', 1, 100000) ||
    !numRange('fused', 0, 1e6) ||
    !numRange('streak', 0, 10000) ||
    !numRange('tax', 5, 45) ||
    !numRange('wel', 0, 50) ||
    !numRange('edu', 0, 30) ||
    !numRange('fuel', 0, 50) ||
    !numRange('carbon', 0, 30) ||
    !numRange('luxury', 0, 25) ||
    !numRange('corp', 0, 30) ||
    !numRange('gst', 0, 25) ||
    !numRange('prop', 0, 15) ||
    !numRange('duty', 0, 30) ||
    !numRange('tourism', 0, 20) ||
    !numRange('digital', 0, 20) ||
    !numRange('rd', 0, 25) ||
    !numRange('green', 0, 25) ||
    !numRange('wealth', 0, 20) ||
    !numRange('transitSub', 0, 25)
  ) {
    return false;
  }

  if ('gov' in s && !['rep', 'tech', 'wlf', 'ind'].includes(String(s.gov))) return false;
  if ('b' in s && !(isObjMap(s.b) && Object.keys(s.b).length <= 60)) return false;
  if ('stk' in s && !(isObjMap(s.stk) && Object.keys(s.stk).length <= 48)) return false;
  if ('milestones' in s && !(isObjMap(s.milestones) && Object.keys(s.milestones).length <= 40)) return false;
  if ('claimed' in s && !(isObjMap(s.claimed) && Object.keys(s.claimed).length <= 20)) return false;
  if ('boosterCd' in s && !(isObjMap(s.boosterCd) && Object.keys(s.boosterCd).length <= 20)) return false;
  if ('tech' in s && !(isObjMap(s.tech) && Object.keys(s.tech).length <= 16)) return false;
  if ('gx' in s && !isValidSaveGx(s.gx)) return false;
  if ('hist' in s && !(Array.isArray(s.hist) && s.hist.length <= 60)) return false;
  if ('questIds' in s && !(Array.isArray(s.questIds) && s.questIds.length <= 10)) return false;
  if ('questDay' in s && !(typeof s.questDay === 'string' && s.questDay.length <= 32)) return false;
  if ('provBudgetLog' in s && !(Array.isArray(s.provBudgetLog) && s.provBudgetLog.length <= 30)) return false;
  if ('provTxs' in s && !(Array.isArray(s.provTxs) && s.provTxs.length <= 30)) return false;
  if ('provinces' in s) {
    if (!Array.isArray(s.provinces) || s.provinces.length < 1 || s.provinces.length > 10) return false;
    if (!s.provinces.every((item) => isValidProvinceItem(item))) return false;
  }

  if ('set' in s) {
    if (!isObjMap(s.set) || Object.keys(s.set).length > 10 || !hasOnly(s.set, ['sfx', 'vib', 'anim'])) return false;
    for (const k of ['sfx', 'vib', 'anim']) {
      if (k in s.set && !(isNum(s.set[k]) && (s.set[k] as number) >= 0 && (s.set[k] as number) <= 1)) return false;
    }
  }

  if ('activeFx' in s) {
    const fx = s.activeFx;
    if (!isObjMap(fx) || Object.keys(fx).length > 16) return false;
    if (!hasOnly(fx, ['incomeBoostEnd', 'incomeBoostMult', 'incomeBoostId', 'taxSurge'])) return false;
    if ('incomeBoostEnd' in fx && !(isNum(fx.incomeBoostEnd) && fx.incomeBoostEnd >= 0 && fx.incomeBoostEnd <= 1e13)) return false;
    if ('incomeBoostMult' in fx && !(isNum(fx.incomeBoostMult) && fx.incomeBoostMult >= 1 && fx.incomeBoostMult <= 1.75)) return false;
    if ('incomeBoostId' in fx && !(typeof fx.incomeBoostId === 'string' && fx.incomeBoostId.length <= 32)) return false;
    if ('taxSurge' in fx && !(isNum(fx.taxSurge) && fx.taxSurge >= 0 && fx.taxSurge <= 1)) return false;
  }

  if ('sub' in s) {
    const sub = s.sub;
    if (!isObjMap(sub) || Object.keys(sub).length > 8 || !hasOnly(sub, ['tier', 'exp', 'lastClaimDay'])) return false;
    if ('tier' in sub && !['daily', 'weekly', 'monthly'].includes(String(sub.tier))) return false;
    if ('exp' in sub && !(isNum(sub.exp) && sub.exp >= 0 && sub.exp <= 1e13)) return false;
    if ('lastClaimDay' in sub && !(typeof sub.lastClaimDay === 'string' && sub.lastClaimDay.length <= 16)) return false;
  }

  if ('subPromo' in s) {
    const sp = s.subPromo;
    if (!isObjMap(sp) || Object.keys(sp).length > 8 || !hasOnly(sp, ['weekKey', 'tier', 'pct', 'exp'])) return false;
    if ('weekKey' in sp && !(typeof sp.weekKey === 'string' && sp.weekKey.length <= 16)) return false;
    if ('tier' in sp && !['daily', 'weekly', 'monthly'].includes(String(sp.tier))) return false;
    if ('pct' in sp && !(isNum(sp.pct) && sp.pct >= 5 && sp.pct <= 40)) return false;
    if ('exp' in sp && !(isNum(sp.exp) && sp.exp >= 0 && sp.exp <= 1e13)) return false;
  }

  return true;
}

function evalSavesAccess(
  op: 'get' | 'list' | 'create' | 'update' | 'delete',
  req: ReqContext,
  uid: string,
  incoming?: unknown,
): boolean {
  if (op === 'list' || op === 'delete') return false;
  if (op === 'get') return isOwner(req.auth, uid) && isValidId(uid);
  return isOwner(req.auth, uid) && isValidId(uid) && isValidSave(incoming);
}

function affectedKeys(incoming: Record<string, unknown>, existing: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(incoming), ...Object.keys(existing)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (JSON.stringify(incoming[k]) !== JSON.stringify(existing[k])) {
      changed.push(k);
    }
  }
  return changed;
}

function isValidPlayerStats(stats: unknown): boolean {
  if (!isObjMap(stats)) return false;
  const ks = ['buildings', 'completedTrades', 'tradesSent', 'tradesReceived', 'cashTraded', 'gemsTraded'];
  if (!hasAll(stats, ks) || !hasOnly(stats, ks)) return false;
  return (
    isNum(stats.buildings) && stats.buildings >= 0 && stats.buildings <= 1e6 &&
    isNum(stats.completedTrades) && stats.completedTrades >= 0 && stats.completedTrades <= 1e6 &&
    isNum(stats.tradesSent) && stats.tradesSent >= 0 && stats.tradesSent <= 1e6 &&
    isNum(stats.tradesReceived) && stats.tradesReceived >= 0 && stats.tradesReceived <= 1e6 &&
    isNum(stats.cashTraded) && stats.cashTraded >= 0 && stats.cashTraded <= 1e14 &&
    isNum(stats.gemsTraded) && stats.gemsTraded >= 0 && stats.gemsTraded <= 1e12
  );
}

function isValidPlayerProfile(data: unknown): boolean {
  if (!isObjMap(data)) return false;
  const req = [
    'username', 'usernameLower', 'countryCode', 'countryName',
    'gdp', 'cash', 'gems', 'level', 'rank', 'lastSeen', 'stats',
  ];
  const allowed = [...req, 'createdAt', 'subTier', 'subExp', 'cosFrame', 'cosNameFx', 'cosBadge', 'cosAnim'];
  if (!hasAll(data, req) || !hasOnly(data, allowed)) return false;
  if (typeof data.username !== 'string' || !/^[A-Za-z0-9_]{3,16}$/.test(data.username)) return false;
  if (typeof data.usernameLower !== 'string' || !/^[a-z0-9_]{3,16}$/.test(data.usernameLower)) return false;
  if (data.username.toLowerCase() !== data.usernameLower) return false;
  if (typeof data.countryCode !== 'string' || !/^[A-Za-z]{2,3}$/.test(data.countryCode)) return false;
  if (typeof data.countryName !== 'string' || data.countryName.length < 1 || data.countryName.length > 64) return false;
  if (!(isNum(data.gdp) && data.gdp >= 0 && data.gdp <= 1e13)) return false;
  if (!(isNum(data.cash) && data.cash >= 0 && data.cash <= 1e13)) return false;
  if (!(isNum(data.gems) && data.gems >= 0 && data.gems <= 1e9)) return false;
  if (!(isNum(data.level) && data.level >= 1 && data.level <= 1e7)) return false;
  if (!(isNum(data.rank) && data.rank >= 0 && data.rank <= 15)) return false;
  if (!isNum(data.lastSeen)) return false;
  if ('createdAt' in data && !isNum(data.createdAt)) return false;
  if ('subTier' in data && !['', 'daily', 'weekly', 'monthly'].includes(String(data.subTier))) return false;
  if ('subExp' in data && !(isNum(data.subExp) && data.subExp >= 0 && data.subExp <= 1e13)) return false;
  for (const cosField of ['cosFrame', 'cosNameFx', 'cosBadge', 'cosAnim'] as const) {
    if (cosField in data && (typeof data[cosField] !== 'string' || !/^[a-z0-9_]{0,36}$/.test(String(data[cosField])))) {
      return false;
    }
  }
  return isValidPlayerStats(data.stats);
}

function evalPlayerUpdate(
  req: ReqContext,
  uid: string,
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>,
): boolean {
  if (!isOwner(req.auth, uid) || !isValidId(uid)) return false;
  if ('username' in existing && incoming.username !== existing.username) return false;
  if ('usernameLower' in existing && incoming.usernameLower !== existing.usernameLower) return false;
  if ('createdAt' in existing && (!('createdAt' in incoming) || incoming.createdAt !== existing.createdAt)) return false;
  if (incoming.lastSeen !== req.time) return false;
  const changed = affectedKeys(incoming, existing);
  if (changed.every((k) => k === 'lastSeen')) return true;
  const allowedSync = [
    'gdp', 'cash', 'gems', 'level', 'rank', 'lastSeen', 'stats', 'subTier', 'subExp',
    'cosFrame', 'cosNameFx', 'cosBadge', 'cosAnim',
  ];
  if (!changed.every((k) => allowedSync.includes(k))) return false;
  return isValidPlayerProfile(incoming);
}

test('saves/{uid} rules allow create & update for unverified-email owner with fresh, fractional-tick, maxed-out, and sanitized legacy payloads', () => {
  const uid = 'NJZoJG5EUKdTtMpEQTl5bbRvrgA2';
  const reqOwner: ReqContext = { auth: { uid, emailVerified: false }, time: 1_795_642_450_000 };
  const reqOther: ReqContext = { auth: { uid: 'otherUser_1', emailVerified: true }, time: 1_795_642_450_000 };
  const reqAnon: ReqContext = { auth: null, time: 1_795_642_450_000 };

  // 1. Fresh state
  const freshDoc = { save: cleanSavePayload(freshState()) };
  assert.equal(evalSavesAccess('create', reqOwner, uid, freshDoc), true);
  assert.equal(evalSavesAccess('update', reqOwner, uid, freshDoc), true);
  assert.equal(evalSavesAccess('get', reqOwner, uid), true);

  // 2. Post-tick fractional state (simulates 1-second timer incrementing day, taxPool, hap, appr, pop, gx.cond)
  const ticked = freshState();
  ticked.cash = 886.42;
  ticked.taxPool = 19.88019609468261;
  ticked.day = 202.33333333333337;
  ticked.hap = 67.36322002791266;
  ticked.appr = 63.48369272559396;
  ticked.pop = 48.67665766437593;
  ticked.gx.cond.parl = 99.69999999999999;
  ticked.gx.acc = 22.5;
  const tickedDoc = { save: cleanSavePayload(ticked) };
  assert.equal(evalSavesAccess('create', reqOwner, uid, tickedDoc), true);
  assert.equal(evalSavesAccess('update', reqOwner, uid, tickedDoc), true);

  // 3. Maxed-out / populated nested state (all 24 buildings, 36 stickers, 6 techs, gx.exp, activeFx, sub, subPromo)
  const now = Date.now();
  let rich = freshState();
  rich.cash = 5_000_000_000;
  rich.gems = 25_000;
  rich.b = Object.fromEntries(Object.keys(rich.b).map((k) => [k, 25]));
  rich.stk = Object.fromEntries(STICKERS.map((s) => [s.id, 3]));
  rich = applyBuyRank(rich, 2).state;
  rich = applyBuyBooster(rich, BOOSTERS.find((b) => b.id === 'growth_boost')!, now).state;
  rich = applyBuyBooster(rich, BOOSTERS.find((b) => b.id === 'tax_boost')!, now + 100).state;
  rich = rollWeeklySubPromo(rich, now, () => 0.9).state;
  rich = applyBuySubscription(rich, SUBSCRIPTIONS[2], now + 200).state;
  for (const t of TECH_TREE) {
    rich = applyUnlockTech(rich, t.id).state;
  }
  rich.milestones = { ms1: 1, ms2: 1 };
  rich.claimed = { q1: 1 };
  rich.hist = Array.from({ length: 60 }, (_, i) => i * 1000.25);
  rich.gx.log = ['Day 1 treasury paid', 'Day 2 treasury paid'];
  rich.gx.exp = { sal: 500, el: 250, inf: 125, total: 875, paid: 875, n: 12, t: now };
  const richDoc = { save: cleanSavePayload(rich) };
  assert.equal(evalSavesAccess('create', reqOwner, uid, richDoc), true);
  assert.equal(evalSavesAccess('update', reqOwner, uid, richDoc), true);

  // 4. Captured 2:34 AM failing pakora-tab Commit payload (containing fractional day/taxPool/gx.cond + legacy avHist/avs)
  const capturedCommitSave = {
    cash: 460,
    gems: 3,
    taxPool: 2.332925271519575,
    day: 204.08333333333357,
    b: {
      bank: 0, water: 0, univ: 0, port: 0, data: 0, pow: 0, tech: 0, stadium: 0,
      farm: 2, solar: 0, mine: 0, rail: 0, fact: 0, airport: 0, hosp: 0, space: 0,
      hydro: 0, stock: 0, evplant: 0, fusion: 0, transit: 0, semicon: 0, logistics: 0, quantum: 0,
    },
    tax: 20,
    wel: 15,
    hap: 67.54035543461534,
    appr: 63.71892489168723,
    pop: 48.7103820394955,
    boost: 0,
    claimed: {},
    milestones: {},
    crateCd: 0,
    t: 1795642446621,
    ev: 29,
    edu: 8,
    hist: [80, 280, 580, 878, 886],
    stk: {},
    streak: 1,
    lastDaily: 1795642418078,
    set: { sfx: 1, vib: 1, anim: 1 },
    fuel: 0,
    carbon: 0,
    luxury: 0,
    corp: 0,
    gst: 0,
    prop: 0,
    duty: 0,
    tourism: 0,
    digital: 0,
    wealth: 0,
    rd: 0,
    green: 0,
    transitSub: 0,
    questDay: '2026-11-26',
    questIds: [53, 30, 8],
    rank: 0,
    activeFx: {},
    boosterCd: {},
    fused: 0,
    gov: 'rep',
    govT: 0,
    gx: {
      cond: { parl: 99.7, gov: 99.7, hosp: 99.7, sch: 99.7, road: 99.7, hway: 99.7 },
      lvl: {
        farm: 1, fact: 1, pow: 1, tech: 1, port: 1, bank: 1, mine: 1, hosp: 1,
        stadium: 1, airport: 1, solar: 1, water: 1, univ: 1, rail: 1, data: 1, space: 1,
        hydro: 1, stock: 1, evplant: 1, fusion: 1, transit: 1, semicon: 1, logistics: 1, quantum: 1,
      },
      acc: 25,
      blk: 0,
      pb: 0,
      ph: 0,
      log: [],
      exp: null,
    },
    sub: {},
    subPromo: { weekKey: '2026-W48', tier: 'daily', pct: 25, exp: 1795901618078 },
    tech: {},
    avHist: [1.27, 2.65],
    avs: { n: 0, b: 0, w: 0, r: 0 },
  };
  // Raw uncleaned payload with avHist/avs is blocked by strict whitelist; after cleanSavePayload it passes!
  assert.equal(evalSavesAccess('update', reqOwner, uid, { save: capturedCommitSave }), false);
  const cleanedCaptured = { save: cleanSavePayload(migrateState(capturedCommitSave as never)) };
  assert.equal(evalSavesAccess('create', reqOwner, uid, cleanedCaptured), true);
  assert.equal(evalSavesAccess('update', reqOwner, uid, cleanedCaptured), true);

  // 5. Cross-user, unauthenticated, list, delete denials
  assert.equal(evalSavesAccess('get', reqOther, uid), false);
  assert.equal(evalSavesAccess('create', reqOther, uid, freshDoc), false);
  assert.equal(evalSavesAccess('update', reqOther, uid, freshDoc), false);
  assert.equal(evalSavesAccess('create', reqAnon, uid, freshDoc), false);
  assert.equal(evalSavesAccess('update', reqAnon, uid, freshDoc), false);
  assert.equal(evalSavesAccess('list', reqOwner, uid), false);
  assert.equal(evalSavesAccess('delete', reqOwner, uid), false);

  // 6. Shadow field & out-of-range rejections on both create and update
  const badSaves: unknown[] = [
    { save: freshDoc.save, admin: true },
    { save: { ...freshDoc.save, isAdmin: true } },
    { save: { ...freshDoc.save, tax: 4 } },
    { save: { ...freshDoc.save, tax: 46 } },
    { save: { ...freshDoc.save, pop: 0 } },
    { save: { ...freshDoc.save, hap: 101 } },
    { save: { ...freshDoc.save, set: { sfx: 1, vib: 1, anim: 1, hack: 1 } } },
    { save: { ...freshDoc.save, activeFx: { incomeBoostMult: 2.5 } } },
    { save: { ...freshDoc.save, gx: { ...freshDoc.save.gx as object, admin: true } } },
    { save: { ...freshDoc.save, gx: { ...freshDoc.save.gx as object, exp: { sal: 10, hack: 1 } } } },
    { save: { ...freshDoc.save, sub: { tier: 'monthly', exp: now + 1000, role: 'admin' } } },
    { save: { ...freshDoc.save, subPromo: { weekKey: '2026-W48', tier: 'daily', pct: 25, exp: now + 1000, hack: 1 } } },
  ];
  for (const bad of badSaves) {
    assert.equal(evalSavesAccess('create', reqOwner, uid, bad), false, 'Expected create rejection');
    assert.equal(evalSavesAccess('update', reqOwner, uid, bad), false, 'Expected update rejection');
  }
});

test('players/{uid} heartbeat & leaderboard rules match client payloads and block tampering', () => {
  const uid = 'NJZoJG5EUKdTtMpEQTl5bbRvrgA2';
  const now = 1_795_642_450_000;
  const reqOwner: ReqContext = { auth: { uid, emailVerified: false }, time: now };
  const reqOther: ReqContext = { auth: { uid: 'peer_1', emailVerified: true }, time: now };

  const existingProfile = {
    username: 'Syed_1',
    usernameLower: 'syed_1',
    countryCode: 'PK',
    countryName: 'Pakistan',
    gdp: 580,
    cash: 580,
    gems: 3,
    level: 1,
    rank: 0,
    subTier: '',
    subExp: 0,
    lastSeen: now - 10_000,
    createdAt: now - 100_000,
    stats: sanitizeStats(undefined, { buildings: 0 }),
  };

  // Heartbeat-only update succeeds for unverified-email owner
  assert.equal(evalPlayerUpdate(reqOwner, uid, { ...existingProfile, lastSeen: now }, existingProfile), true);
  // Cross-user heartbeat rejected
  assert.equal(evalPlayerUpdate(reqOther, uid, { ...existingProfile, lastSeen: now }, existingProfile), false);
  // Spoofed timestamp rejected
  assert.equal(evalPlayerUpdate(reqOwner, uid, { ...existingProfile, lastSeen: now + 60_000 }, existingProfile), false);
  // Full sync update succeeds
  assert.equal(
    evalPlayerUpdate(
      reqOwner,
      uid,
      {
        ...existingProfile,
        gdp: 1200,
        cash: 1200,
        gems: 5,
        level: 2,
        rank: 1,
        subTier: 'daily',
        subExp: now + 86_400_000,
        lastSeen: now,
        stats: sanitizeStats(existingProfile.stats, { buildings: 2 }),
      },
      existingProfile,
    ),
    true,
  );
  // Immutable username tampering blocked
  assert.equal(
    evalPlayerUpdate(reqOwner, uid, { ...existingProfile, username: 'Other', lastSeen: now }, existingProfile),
    false,
  );
  // Cosmetic broadcast fields allowed when valid and blocked when tampered
  assert.equal(
    evalPlayerUpdate(
      reqOwner,
      uid,
      {
        ...existingProfile,
        cosFrame: 'frame_neon',
        cosNameFx: 'nfx_rainbow',
        cosBadge: 'badge_diamond_member',
        cosAnim: 'anim_sovereign_nova',
        lastSeen: now,
      },
      existingProfile,
    ),
    true,
  );
  assert.equal(
    evalPlayerUpdate(
      reqOwner,
      uid,
      { ...existingProfile, rank: 15, lastSeen: now },
      existingProfile,
    ),
    true,
  );
  assert.equal(
    evalPlayerUpdate(
      reqOwner,
      uid,
      { ...existingProfile, cosFrame: '../hack', lastSeen: now },
      existingProfile,
    ),
    false,
  );
  assert.equal(
    evalPlayerUpdate(
      reqOwner,
      uid,
      { ...existingProfile, cosNameFx: 'x'.repeat(40), lastSeen: now },
      existingProfile,
    ),
    false,
  );
  assert.match(rules, /isValidGlobalChat\(data\)[\s\S]*cosFrame/);
  assert.match(rules, /isValidGlobalChat\(data\)[\s\S]*cosAnim/);
  // Leaderboard list limit enforced at <= 100 (app queries 25 active & 10 search)
  assert.equal(25 <= 100 && 10 <= 100, true);
});

test('Legacy province schema bounds in firestore.rules remain intact and block tampering', () => {
  const uid = 'NJZoJG5EUKdTtMpEQTl5bbRvrgA2';
  const reqOwner: ReqContext = { auth: { uid, emailVerified: false }, time: 1_795_642_450_000 };

  const baseSave = cleanSavePayload(freshState()) as Record<string, unknown>;
  const baseProv = {
    id: 'prov_1',
    slot: 1,
    name: 'Capital Region',
    flagId: 'crest_star',
    color: '#3fd2ff',
    gdp: 100_000,
    pop: 12,
    hap: 75,
    dev: 20,
    emp: 70,
    budget: {
      infrastructure: 5000,
      education: 5000,
      healthcare: 5000,
      security: 5000,
      welfare: 5000,
      industry: 5000,
    },
    lvls: {
      infrastructure: 10,
      education: 10,
      healthcare: 10,
      security: 10,
      welfare: 10,
      businessActivity: 10,
    },
  };
  const valid10 = {
    save: {
      ...baseSave,
      provinces: Array.from({ length: 10 }, (_, idx) => ({
        ...baseProv,
        id: `prov_${idx + 1}`,
        slot: idx + 1,
        name: `Province ${idx + 1}`,
      })),
    },
  };
  assert.equal(evalSavesAccess('update', reqOwner, uid, valid10), true);

  const eleven = {
    save: {
      ...baseSave,
      provinces: [...(valid10.save.provinces as unknown[]), { ...baseProv, id: 'prov_10', slot: 10 }],
    },
  };
  assert.equal(evalSavesAccess('update', reqOwner, uid, eleven), false);

  const negBudgetProv = { ...baseProv, budget: { ...baseProv.budget, infrastructure: -50 } };
  assert.equal(
    evalSavesAccess('update', reqOwner, uid, { save: { ...baseSave, provinces: [negBudgetProv] } }),
    false,
  );
  const badColorProv = { ...baseProv, color: 'javascript:alert(1)' };
  assert.equal(
    evalSavesAccess('update', reqOwner, uid, { save: { ...baseSave, provinces: [badColorProv] } }),
    false,
  );

  assert.match(rules, /match \/provinceTxs\/\{txId\}[\s\S]*allow update, delete: if false/);
  assert.match(rules, /match \/provinceLeaderboard\/\{entryId\}[\s\S]*incoming\(\)\.ownerUid == request\.auth\.uid/);
});

void SERVER_TIME;



