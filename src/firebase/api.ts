import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Transaction,
} from 'firebase/firestore';
import {
  ACTIVE_WINDOW_MS,
  COUNTRIES,
  DAILY_GIFT_MAX,
  GX_PROJECT_TYPES,
  MAX_RANK,
  PROJECT_STAGES,
} from '../game/constants';
import { PRESENCE_QUERY_BUFFER_MS } from './presence';
import {
  calculateGdp,
  cleanSavePayload,
  cleanStickersMap,
  dayKeyFor,
  getActiveSubscription,
  migrateState,
  playerLevel,
  sanitizeCountryCode,
  sanitizeStats,
  totalBuildings,
} from '../game/rules';
import { selectBestProvinceLeaderboardEntries } from '../game/province';
import type {
  GameState,
  PlayerProfile,
  PlayerStats,
  ProjectType,
  ProvinceLeaderboardCategory,
  ProvinceLeaderboardEntry,
  TradeOffer,
} from '../game/types';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  recordFirestoreError,
} from './config';
import { recordAppError } from './errorLog';

export { dayKeyFor };

export function pairIdFor(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

export function timestampToMs(t: unknown): number {
  if (!t) return 0;
  const obj = t as { toMillis?: () => number; seconds?: number };
  if (typeof obj.toMillis === 'function') return obj.toMillis();
  if (typeof obj.seconds === 'number') return obj.seconds * 1000;
  return 0;
}

export function capValue(v: unknown, max: number): number {
  const raw = Number(v);
  const n = Number.isFinite(raw) ? Math.floor(raw) : 0;
  return Math.min(max, Math.max(0, n)) + 0;
}

function makeError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function requireUid(expectedUid?: string): string {
  const u = auth?.currentUser?.uid;
  if (!u) throw makeError('unauthenticated', 'Not signed in');
  if (expectedUid !== undefined && u !== expectedUid) {
    throw makeError('aborted', 'Active account changed');
  }
  return u;
}

function isPermissionDeniedError(err: unknown): boolean {
  const code = (err as { code?: string })?.code || '';
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    code === 'permission-denied' ||
    /permission-denied|Missing or insufficient permissions/i.test(`${code} ${msg}`)
  );
}

function reportAndRethrow(
  err: unknown,
  op: OperationType,
  path: string | null,
  skipPermLog = false,
): never {
  const code = (err as { code?: string })?.code || '';
  if (code !== 'aborted' && code !== 'already-exists' && code !== 'resource-exhausted') {
    if (!(skipPermLog && isPermissionDeniedError(err))) {
      const info = recordFirestoreError(err, op, path);
      console.error('Firestore Error: ', JSON.stringify(info));
    }
  }
  throw err;
}

async function runSessionTx<T>(
  sid: string,
  onKicked: () => void,
  fn: (tx: Transaction, uid: string) => Promise<T>,
  checkSession = true,
  opPath: string | null = null,
  suppressPermLog = false,
  expectedUid?: string,
): Promise<T> {
  const uid = requireUid(expectedUid);
  const exec = () =>
    runTransaction(db, async (tx) => {
      requireUid(uid);
      if (checkSession) {
        const sesSnap = await tx.get(doc(db, 'players', uid, 'private', 'session'));
        if (sesSnap.exists() && sesSnap.data()?.sid !== sid) {
          onKicked();
          throw makeError('aborted', 'Another session is active');
        }
      }
      return fn(tx, uid);
    });

  try {
    return await exec();
  } catch (err) {
    if (isPermissionDeniedError(err) && auth?.currentUser) {
      await auth.currentUser.getIdToken(true).catch(() => null);
      await new Promise((r) => setTimeout(r, 450));
      try {
        return await exec();
      } catch (retryErr) {
        reportAndRethrow(retryErr, OperationType.WRITE, opPath || `players/${uid}`, suppressPermLog);
      }
    }
    reportAndRethrow(err, OperationType.WRITE, opPath || `players/${uid}`, suppressPermLog);
  }
}

function writeNotifInTx(
  tx: Transaction,
  toUid: string,
  fromUid: string,
  type: 'new_offer' | 'accepted' | 'rejected' | 'cancelled' | 'expired',
  text: string,
  tradeId: string | null,
) {
  const ref = doc(collection(db, 'players', toUid, 'notifications'));
  tx.set(ref, {
    type,
    text: text.slice(0, 200),
    tradeId: tradeId || null,
    read: false,
    from: fromUid,
    createdAt: serverTimestamp(),
  });
}

export async function checkUsernameAvailability(
  username: string,
): Promise<{ available: boolean; reason?: string }> {
  const lower = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,16}$/.test(lower)) {
    return { available: false, reason: 'Invalid username' };
  }
  const path = `usernames/${lower}`;
  try {
    const snap = await getDoc(doc(db, 'usernames', lower));
    return {
      available: !snap.exists(),
      reason: snap.exists() ? 'Already taken' : undefined,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function createPlayerProfile(
  usernameRaw: string,
  countryCodeRaw: string,
  state: GameState,
  sid: string,
  onKicked: () => void,
  expectedUid?: string,
): Promise<{
  restoredSave?: Partial<GameState>;
  wallet?: { cash: number; gems: number; stk: Record<string, number> };
  walletRev: number;
}> {
  const username = usernameRaw.trim();
  const lower = username.toLowerCase();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    throw makeError('invalid', 'Invalid username');
  }
  const cn = COUNTRIES.find((c) => c[0] === countryCodeRaw) || COUNTRIES[0];
  let out: {
    restoredSave?: Partial<GameState>;
    wallet?: { cash: number; gems: number; stk: Record<string, number> };
    walletRev: number;
  } = { walletRev: 1 };

  await runSessionTx(
    sid,
    onKicked,
    async (tx, uid) => {
      const uRef = doc(db, 'usernames', lower);
      const sRef = doc(db, 'saves', uid);
      const pRef = doc(db, 'players', uid);
      const wRef = doc(db, 'players', uid, 'private', 'wallet');
      const [uSnap, sSnap, pSnap, wSnap] = await Promise.all([
        tx.get(uRef),
        tx.get(sRef),
        tx.get(pRef),
        tx.get(wRef),
      ]);
      if (uSnap.exists() && uSnap.data()?.uid !== uid) {
        throw makeError('already-exists', 'Username already taken');
      }

      const oldRaw = sSnap.exists() ? (sSnap.data()?.save as Partial<GameState> | undefined) : undefined;
      const baseState = oldRaw ? migrateState(oldRaw) : state;
      const cleanedSave = cleanSavePayload(baseState);
      const cash = capValue(cleanedSave.cash, 1e13);
      const gems = capValue(cleanedSave.gems, 1e9);
      const stk = cleanStickersMap(cleanedSave.stk);
      const gdpVal = Math.max(1, Math.min(cash, capValue(calculateGdp(baseState), 1e13)));
      const levelVal = Math.max(1, Math.min(10_000_000, Math.floor(playerLevel(baseState))));
      const rankVal = Math.max(0, Math.min(MAX_RANK, Math.floor(Number(baseState.rank) || 0)));

      if (pSnap.exists()) {
        const wData = wSnap.exists() ? wSnap.data() : null;
        const existingRev =
          wData && Number.isFinite(Number(wData.rev))
            ? Math.max(0, Math.floor(Number(wData.rev)))
            : 0;
        const walletRev = wSnap.exists() ? Math.max(1, existingRev) : 1;
        if (!wSnap.exists()) {
          tx.set(wRef, {
            cash,
            gems,
            stk,
            rev: 1,
            sid,
            t: serverTimestamp(),
          });
        }
        if (!sSnap.exists()) {
          tx.set(sRef, { save: cleanedSave });
        }
        out = {
          restoredSave: oldRaw,
          wallet: wData
            ? {
                cash: capValue(wData.cash, 1e13),
                gems: capValue(wData.gems, 1e9),
                stk: cleanStickersMap(wData.stk),
              }
            : undefined,
          walletRev,
        };
        return;
      }

      if (!uSnap.exists()) {
        tx.set(uRef, { uid });
      }
      const activeSub = getActiveSubscription(baseState, Date.now());
      const prevRev =
        wSnap.exists() && Number.isFinite(Number(wSnap.data()?.rev))
          ? Math.max(0, Math.floor(Number(wSnap.data()?.rev)))
          : 0;
      const nextRev = Math.min(1e9, prevRev + 1);

      tx.set(pRef, {
        username,
        usernameLower: lower,
        countryCode: cn[0],
        countryName: cn[1],
        gdp: gdpVal,
        cash,
        gems,
        level: levelVal,
        rank: rankVal,
        subTier: activeSub ? activeSub.def.id : '',
        subExp: activeSub ? Math.max(0, Math.min(1e13, Math.floor(activeSub.exp))) : 0,
        lastSeen: serverTimestamp(),
        stats: sanitizeStats(undefined, { buildings: totalBuildings(baseState) }),
        createdAt: serverTimestamp(),
      });
      tx.set(wRef, {
        cash,
        gems,
        stk,
        rev: nextRev,
        sid,
        t: serverTimestamp(),
      });
      if (!oldRaw) {
        tx.set(sRef, { save: cleanedSave });
      }
      out = { restoredSave: oldRaw, walletRev: nextRev };
    },
    false,
    'players',
    false,
    expectedUid,
  );

  return out;
}

export async function syncSaveToCloud(params: {
  expectedUid?: string;
  state: GameState;
  pubStats: PlayerStats | undefined;
  completedTradesCount: number;
  rev: number;
  sid: string;
  onKicked: () => void;
}): Promise<{
  accepted: boolean;
  wallet: { cash: number; gems: number; stk: Record<string, number>; rev: number };
}> {
  const { expectedUid, state, pubStats, completedTradesCount, rev, sid, onKicked } = params;
  const activeUid = requireUid(expectedUid);
  const cleanedSave = cleanSavePayload(state);
  const cash = capValue(cleanedSave.cash, 1e13);
  const gems = capValue(cleanedSave.gems, 1e9);
  const stk = cleanStickersMap(cleanedSave.stk);
  const gdpVal = Math.max(1, Math.min(cash, capValue(calculateGdp(state), 1e13)));

  let result!: {
    accepted: boolean;
    wallet: { cash: number; gems: number; stk: Record<string, number>; rev: number };
  };

  try {
    await runSessionTx(
      sid,
      onKicked,
      async (tx, uid) => {
        const wRef = doc(db, 'players', uid, 'private', 'wallet');
        const pRef = doc(db, 'players', uid);
        const [wSnap, pSnap] = await Promise.all([tx.get(wRef), tx.get(pRef)]);
        if (!pSnap.exists()) {
          throw makeError('failed-precondition', 'Player profile not initialized');
        }
        const wData = wSnap.exists() ? wSnap.data() : null;
        const curRev =
          wData && Number.isFinite(Number(wData.rev)) ? Math.max(0, Math.floor(Number(wData.rev))) : 0;
        const accepted = !wData || curRev === rev;

        if (accepted) {
          const nextRev = (curRev >= 1e9 ? 1e9 : curRev + 1) + 0;
          tx.set(wRef, {
            cash,
            gems,
            stk,
            rev: nextRev,
            sid,
            t: serverTimestamp(),
          });
          const existingStats = (pSnap.data()?.stats as Partial<PlayerStats> | undefined) ?? pubStats;
          const mergedStats = sanitizeStats(existingStats, {
            buildings: totalBuildings(state),
            completedTrades: Math.max(
              existingStats?.completedTrades || 0,
              pubStats?.completedTrades || 0,
              completedTradesCount,
            ),
          });
          const activeSub = getActiveSubscription(state, Date.now());
          tx.update(pRef, {
            gdp: gdpVal,
            cash,
            gems,
            level: capValue(playerLevel(state), 10_000_000) || 1,
            rank: capValue(state.rank, MAX_RANK),
            subTier: activeSub ? activeSub.def.id : '',
            subExp: activeSub ? capValue(activeSub.exp, 1e13) : 0,
            lastSeen: serverTimestamp(),
            stats: mergedStats,
          });
          tx.set(doc(db, 'saves', uid), { save: cleanedSave });
          result = {
            accepted: true,
            wallet: { cash, gems, stk, rev: nextRev },
          };
        } else {
          if (wData.sid && wData.sid !== sid) {
            onKicked();
            throw makeError('aborted', 'Another session is active');
          }
          result = {
            accepted: false,
            wallet: {
              cash: capValue(wData.cash, 1e13),
              gems: capValue(wData.gems, 1e9),
              stk: cleanStickersMap(wData.stk),
              rev: curRev,
            },
          };
        }
      },
      true,
      'saves (wallet + player + save)',
      true,
      activeUid,
    );
    return result;
  } catch (err) {
    if (!isPermissionDeniedError(err)) {
      throw err;
    }

    // Pinpoint & salvage fallback: verify player/session/wallet BEFORE writing saves/{uid}
    // so an outdated tab or lower rev can never overwrite newer cloud progress.
    const uid = requireUid(activeUid);
    let firstFatalErr: unknown = null;
    let savedDocOk = false;
    let walletDocOk = false;
    let nextRev = Math.max(1, rev + 1);

    const pRef = doc(db, 'players', uid);
    let existingStats: Partial<PlayerStats> | undefined = pubStats;
    try {
      const pSnap = await getDoc(pRef);
      if (!pSnap.exists()) {
        throw makeError('failed-precondition', 'Player profile not initialized');
      }
      existingStats = (pSnap.data()?.stats as Partial<PlayerStats> | undefined) ?? pubStats;
    } catch (preErr) {
      if ((preErr as { code?: string })?.code === 'failed-precondition') throw preErr;
      const info = recordFirestoreError(preErr, OperationType.GET, `players/${uid}`);
      console.error('Firestore Error: ', JSON.stringify(info));
      if (!firstFatalErr) firstFatalErr = preErr;
    }

    const sesRef = doc(db, 'players', uid, 'private', 'session');
    try {
      const sesSnap = await getDoc(sesRef);
      if (sesSnap.exists() && sesSnap.data()?.sid && sesSnap.data()?.sid !== sid) {
        onKicked();
        throw makeError('aborted', 'Another session is active');
      }
      if (!sesSnap.exists()) {
        await setDoc(sesRef, { sid, t: serverTimestamp() });
      }
    } catch (sesErr) {
      if ((sesErr as { code?: string })?.code === 'aborted') throw sesErr;
      const info = recordFirestoreError(sesErr, OperationType.WRITE, `players/${uid}/private/session`);
      console.error('Firestore Error: ', JSON.stringify(info));
      if (!firstFatalErr) firstFatalErr = sesErr;
    }

    const wRef = doc(db, 'players', uid, 'private', 'wallet');
    try {
      const wSnap = await getDoc(wRef);
      const wData = wSnap.exists() ? wSnap.data() : null;
      const curRev =
        wData && Number.isFinite(Number(wData.rev)) ? Math.max(0, Math.floor(Number(wData.rev))) : 0;
      if (wData && curRev !== rev) {
        if (wData.sid && wData.sid !== sid) {
          onKicked();
          throw makeError('aborted', 'Another session is active');
        }
        return {
          accepted: false,
          wallet: {
            cash: capValue(wData.cash, 1e13),
            gems: capValue(wData.gems, 1e9),
            stk: cleanStickersMap(wData.stk),
            rev: curRev,
          },
        };
      }
      nextRev = Math.min(1e9, curRev + 1);
      await setDoc(wRef, {
        cash,
        gems,
        stk,
        rev: nextRev,
        sid,
        t: serverTimestamp(),
      });
      walletDocOk = true;
    } catch (walletErr) {
      if ((walletErr as { code?: string })?.code === 'aborted') throw walletErr;
      const info = recordFirestoreError(walletErr, OperationType.WRITE, `players/${uid}/private/wallet`);
      console.error('Firestore Error: ', JSON.stringify(info));
      if (!firstFatalErr) firstFatalErr = walletErr;
    }

    const sRef = doc(db, 'saves', uid);
    try {
      await setDoc(sRef, { save: cleanedSave });
      savedDocOk = true;
    } catch (saveErr) {
      const info = recordFirestoreError(saveErr, OperationType.WRITE, `saves/${uid}`);
      console.error('Firestore Error: ', JSON.stringify(info));
      if (!firstFatalErr) firstFatalErr = saveErr;
    }

    try {
      const mergedStats = sanitizeStats(existingStats, {
        buildings: totalBuildings(state),
        completedTrades: Math.max(
          existingStats?.completedTrades || 0,
          pubStats?.completedTrades || 0,
          completedTradesCount,
        ),
      });
      const activeSub = getActiveSubscription(state, Date.now());
      await updateDoc(pRef, {
        gdp: gdpVal,
        cash,
        gems,
        level: capValue(playerLevel(state), 10_000_000) || 1,
        rank: capValue(state.rank, MAX_RANK),
        subTier: activeSub ? activeSub.def.id : '',
        subExp: activeSub ? capValue(activeSub.exp, 1e13) : 0,
        lastSeen: serverTimestamp(),
        stats: mergedStats,
      });
    } catch (playerErr) {
      const info = recordFirestoreError(playerErr, OperationType.UPDATE, `players/${uid}`);
      console.error('Firestore Error: ', JSON.stringify(info));
      if (!firstFatalErr) firstFatalErr = playerErr;
    }

    if (savedDocOk && walletDocOk) {
      if (firstFatalErr) {
        recordAppError({
          source: 'sync',
          message: 'Cloud save succeeded (leaderboard update hit a rules error — see details above).',
          path: `players/${uid}`,
        });
      }
      return {
        accepted: true,
        wallet: { cash, gems, stk, rev: nextRev },
      };
    }

    throw firstFatalErr || err;
  }
}

export async function createGiftOffer(params: {
  toUid: string;
  offerCash: number;
  offerGems: number;
  offerStk: Record<string, number>;
  message: string;
  sid: string;
  serverOffsetMs?: number;
  onKicked: () => void;
}): Promise<{ remainingToday: number }> {
  const uid = requireUid();
  const serverOffsetMs = params.serverOffsetMs || 0;
  const oc = capValue(params.offerCash, 1e12);
  const og = capValue(params.offerGems, 1e9);
  const offerStk = cleanStickersMap(params.offerStk);
  const stkTotal = Object.values(offerStk).reduce((a, b) => a + b, 0);

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(params.toUid)) {
    throw makeError('invalid', 'Invalid recipient');
  }
  if (params.toUid === uid) throw makeError('invalid', "You can't send to yourself");
  if (oc + og + stkTotal <= 0) throw makeError('invalid', 'Add something to send first');

  const key = `${uid}_${dayKeyFor(Date.now() + serverOffsetMs)}`;
  const trRef = doc(collection(db, 'trades'));
  let remainingToday = 0;

  await runSessionTx(params.sid, params.onKicked, async (tx, me) => {
    const wRef = doc(db, 'players', me, 'private', 'wallet');
    const dlRef = doc(db, 'dailyLimits', key);
    const toRef = doc(db, 'players', params.toUid);
    const meRef = doc(db, 'players', me);

    const [wSnap, dlSnap, toSnap, meSnap] = await Promise.all([
      tx.get(wRef),
      tx.get(dlRef),
      tx.get(toRef),
      tx.get(meRef),
    ]);

    const curCount = dlSnap.exists() ? Number(dlSnap.data()?.count || 0) : 0;
    const wd = wSnap.exists() ? wSnap.data() : null;
    if (!wd) throw makeError('failed-precondition', 'Wallet not found');
    if (curCount >= DAILY_GIFT_MAX) {
      throw makeError('resource-exhausted', 'Daily gift limit reached');
    }
    if (!toSnap.exists() || !meSnap.exists()) {
      throw makeError('not-found', 'Player not found');
    }

    const wCash = capValue(wd.cash, 1e13);
    const wGems = capValue(wd.gems, 1e9);
    const wStk = cleanStickersMap(wd.stk);

    if (wCash < oc || wGems < og) {
      throw makeError('failed-precondition', "You don't have enough balance");
    }
    for (const [k, v] of Object.entries(offerStk)) {
      if (v > (wStk[k] || 0)) {
        throw makeError('failed-precondition', "You don't own enough of that sticker");
      }
    }

    const nextStk = { ...wStk };
    for (const [k, v] of Object.entries(offerStk)) {
      nextStk[k] -= v;
      if (nextStk[k] <= 0) delete nextStk[k];
    }

    const meData = meSnap.data();
    const toData = toSnap.data();
    const fromName = String(meData.username || 'Player').trim().slice(0, 16) || 'Player';
    const toName = String(toData.username || 'Player').trim().slice(0, 16) || 'Player';
    const prevRev = Number.isFinite(Number(wd.rev)) ? Math.max(0, Math.floor(Number(wd.rev))) : 0;

    tx.set(wRef, {
      cash: wCash - oc,
      gems: wGems - og,
      stk: nextStk,
      rev: Math.min(1e9, prevRev + 1),
      sid: params.sid,
      t: serverTimestamp(),
      tradeId: trRef.id,
    });

    const newCash = wCash - oc;
    const newGems = wGems - og;
    const prevStats = sanitizeStats(meData.stats);
    tx.update(meRef, {
      gdp: Math.max(1, newCash),
      cash: newCash,
      gems: newGems,
      level: Math.max(1, Math.min(10_000_000, Math.floor(Number(meData.level) || 1))),
      rank: Math.max(0, Math.min(MAX_RANK, Math.floor(Number(meData.rank) || 0))),
      lastSeen: serverTimestamp(),
      stats: sanitizeStats(prevStats, {
        tradesSent: prevStats.tradesSent + 1,
        cashTraded: prevStats.cashTraded + oc,
        gemsTraded: prevStats.gemsTraded + og,
      }),
    });

    tx.set(trRef, {
      from: me,
      to: params.toUid,
      fromName,
      toName,
      fromCountry: sanitizeCountryCode(meData.countryCode),
      toCountry: sanitizeCountryCode(toData.countryCode),
      participants: [me, params.toUid],
      offerCash: oc,
      offerGems: og,
      offerStk,
      reqCash: 0,
      reqGems: 0,
      reqStk: {},
      message: params.message.trim().slice(0, 140),
      status: 'pending',
      refunded: false,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + serverOffsetMs + 120_000),
    });

    tx.set(dlRef, { count: curCount + 1, uid: me });
    writeNotifInTx(tx, params.toUid, me, 'new_offer', `${fromName} sent you a gift`, trRef.id);
    remainingToday = DAILY_GIFT_MAX - (curCount + 1);
  });

  return { remainingToday };
}

export async function acceptGiftOffer(
  tradeId: string,
  sid: string,
  onKicked: () => void,
  serverOffsetMs = 0,
): Promise<{ status: string }> {
  let status = 'accepted';
  await runSessionTx(sid, onKicked, async (tx, me) => {
    const tRef = doc(db, 'trades', tradeId);
    const tSnap = await tx.get(tRef);
    const t = tSnap.data();
    if (!t) throw makeError('not-found', 'Offer not found');
    if (t.to !== me) throw makeError('permission-denied', 'Not your offer');
    if (t.status !== 'pending') {
      status = t.status;
      return;
    }
    if (timestampToMs(t.expiresAt) <= Date.now() + serverOffsetMs) {
      status = 'expired';
      return;
    }

    const wRef = doc(db, 'players', me, 'private', 'wallet');
    const meRef = doc(db, 'players', me);
    const [wSnap, meSnap] = await Promise.all([tx.get(wRef), tx.get(meRef)]);
    const w = wSnap.data();
    if (!w) throw makeError('failed-precondition', 'Wallet missing');

    const mStk = cleanStickersMap(w.stk);
    for (const [k, v] of Object.entries((t.offerStk || {}) as Record<string, number>)) {
      mStk[k] = (mStk[k] || 0) + Math.max(0, Math.floor(Number(v) || 0));
    }

    const newCash = Math.min(1e13, capValue(w.cash, 1e13) + capValue(t.offerCash, 1e12));
    const newGems = Math.min(1e9, capValue(w.gems, 1e9) + capValue(t.offerGems, 1e9));

    const prevRev = Number.isFinite(Number(w.rev)) ? Math.max(0, Math.floor(Number(w.rev))) : 0;
    tx.set(wRef, {
      cash: newCash,
      gems: newGems,
      stk: mStk,
      rev: Math.min(1e9, prevRev + 1),
      sid,
      t: serverTimestamp(),
      tradeId,
    });

    if (meSnap.exists()) {
      const md = meSnap.data();
      const prevStats = sanitizeStats(md.stats);
      tx.update(meRef, {
        gdp: Math.max(1, newCash),
        cash: newCash,
        gems: newGems,
        level: Math.max(1, Math.min(10_000_000, Math.floor(Number(md.level) || 1))),
        rank: Math.max(0, Math.min(MAX_RANK, Math.floor(Number(md.rank) || 0))),
        lastSeen: serverTimestamp(),
        stats: sanitizeStats(prevStats, {
          completedTrades: prevStats.completedTrades + 1,
          tradesReceived: prevStats.tradesReceived + 1,
          cashTraded: prevStats.cashTraded + capValue(t.offerCash, 1e12),
          gemsTraded: prevStats.gemsTraded + capValue(t.offerGems, 1e9),
        }),
      });
    }

    const receiverName = String(t.toName || 'Player').trim().slice(0, 16) || 'Player';
    tx.update(tRef, { status: 'accepted', resolvedAt: serverTimestamp() });
    writeNotifInTx(tx, t.from, me, 'accepted', `${receiverName} accepted your gift`, tradeId);
    status = 'accepted';
  });
  return { status };
}

export async function rejectGiftOffer(
  tradeId: string,
  sid: string,
  onKicked: () => void,
  serverOffsetMs = 0,
): Promise<{ status: string }> {
  let status = 'rejected';
  await runSessionTx(sid, onKicked, async (tx, me) => {
    const tRef = doc(db, 'trades', tradeId);
    const t = (await tx.get(tRef)).data();
    if (!t) throw makeError('not-found', 'Offer not found');
    if (t.to !== me) throw makeError('permission-denied', 'Not your offer');
    if (t.status !== 'pending') {
      status = t.status;
      return;
    }
    if (timestampToMs(t.expiresAt) <= Date.now() + serverOffsetMs) {
      status = 'expired';
      return;
    }
    tx.update(tRef, { status: 'rejected', resolvedAt: serverTimestamp() });
    writeNotifInTx(tx, t.from, me, 'rejected', `${t.toName} declined your gift`, tradeId);
    status = 'rejected';
  });
  return { status };
}

export async function endSenderOffer(
  tradeId: string,
  want: 'cancelled' | 'expired',
  sid: string,
  onKicked: () => void,
  serverOffsetMs = 0,
): Promise<string> {
  let status: string = want;
  await runSessionTx(sid, onKicked, async (tx, me) => {
    const tRef = doc(db, 'trades', tradeId);
    const t = (await tx.get(tRef)).data();
    if (!t || t.from !== me) {
      status = 'gone';
      return;
    }
    if (t.status !== 'pending') {
      status = t.status;
      return;
    }
    if (want === 'expired' && timestampToMs(t.expiresAt) > Date.now() + serverOffsetMs) {
      status = 'pending';
      return;
    }
    const wRef = doc(db, 'players', me, 'private', 'wallet');
    const w = (await tx.get(wRef)).data();
    if (!w) return;
    const refundStk = cleanStickersMap(w.stk);
    for (const [k, v] of Object.entries((t.offerStk || {}) as Record<string, number>)) {
      refundStk[k] = (refundStk[k] || 0) + Math.max(0, Math.floor(Number(v) || 0));
    }
    const prevRev = Number.isFinite(Number(w.rev)) ? Math.max(0, Math.floor(Number(w.rev))) : 0;
    const senderName = String(t.fromName || 'Player').trim().slice(0, 16) || 'Player';
    tx.update(tRef, { status: want, resolvedAt: serverTimestamp(), refunded: true });
    tx.set(wRef, {
      cash: Math.min(1e13, capValue(w.cash, 1e13) + capValue(t.offerCash, 1e12)),
      gems: Math.min(1e9, capValue(w.gems, 1e9) + capValue(t.offerGems, 1e9)),
      stk: refundStk,
      rev: Math.min(1e9, prevRev + 1),
      sid,
      t: serverTimestamp(),
      tradeId,
    });
    writeNotifInTx(
      tx,
      t.to,
      me,
      want,
      `${senderName}${want === 'expired' ? "'s gift expired" : ' cancelled the gift'}`,
      tradeId,
    );
    status = want;
  });
  return status;
}

export async function reclaimUnrefundedOffer(
  tradeId: string,
  sid: string,
  onKicked: () => void,
): Promise<string> {
  let status = 'refunded';
  await runSessionTx(sid, onKicked, async (tx, me) => {
    const tRef = doc(db, 'trades', tradeId);
    const t = (await tx.get(tRef)).data();
    if (!t || t.from !== me) {
      status = 'gone';
      return;
    }
    if (t.refunded) {
      status = 'already';
      return;
    }
    if (t.status !== 'rejected' && t.status !== 'expired') {
      status = 'invalid';
      return;
    }
    const wRef = doc(db, 'players', me, 'private', 'wallet');
    const w = (await tx.get(wRef)).data();
    if (!w) return;
    const refundStk = cleanStickersMap(w.stk);
    for (const [k, v] of Object.entries((t.offerStk || {}) as Record<string, number>)) {
      refundStk[k] = (refundStk[k] || 0) + Math.max(0, Math.floor(Number(v) || 0));
    }
    const prevRev = Number.isFinite(Number(w.rev)) ? Math.max(0, Math.floor(Number(w.rev))) : 0;
    tx.update(tRef, { refunded: true });
    tx.set(wRef, {
      cash: Math.min(1e13, capValue(w.cash, 1e13) + capValue(t.offerCash, 1e12)),
      gems: Math.min(1e9, capValue(w.gems, 1e9) + capValue(t.offerGems, 1e9)),
      stk: refundStk,
      rev: Math.min(1e9, prevRev + 1),
      sid,
      t: serverTimestamp(),
      tradeId,
    });
  });
  return status;
}

const settleBackoffUntil = new Map<string, number>();

export async function settleExpiredTrades(
  trades: TradeOffer[],
  uid: string,
  sid: string,
  onKicked: () => void,
  serverOffsetMs = 0,
): Promise<void> {
  const now = Date.now() + serverOffsetMs;
  const localNow = Date.now();
  for (const t of trades) {
    if ((settleBackoffUntil.get(t.id) || 0) > localNow) continue;
    if (t.from === uid && t.status === 'pending' && t.expMs > 0 && t.expMs + 4500 <= now) {
      await endSenderOffer(t.id, 'expired', sid, onKicked, serverOffsetMs)
        .then(() => {
          settleBackoffUntil.delete(t.id);
        })
        .catch((err) => {
          settleBackoffUntil.set(t.id, Date.now() + 20_000);
          if ((err as { code?: string })?.code !== 'aborted') {
            recordFirestoreError(err, OperationType.UPDATE, `trades/${t.id}`);
          }
        });
    } else if (
      t.from === uid &&
      (t.status === 'rejected' || t.status === 'expired') &&
      !t.refunded
    ) {
      await reclaimUnrefundedOffer(t.id, sid, onKicked)
        .then(() => {
          settleBackoffUntil.delete(t.id);
        })
        .catch((err) => {
          settleBackoffUntil.set(t.id, Date.now() + 20_000);
          if ((err as { code?: string })?.code !== 'aborted') {
            recordFirestoreError(err, OperationType.UPDATE, `trades/${t.id}`);
          }
        });
    }
  }
}

export async function searchPlayersByUsername(
  queryStr: string,
  myUid: string,
): Promise<PlayerProfile[]> {
  const activeUid = requireUid(myUid);
  const q = queryStr.trim().toLowerCase();
  if (q.length < 2) return [];
  const snap = await getDocs(
    query(
      collection(db, 'players'),
      where('usernameLower', '>=', q),
      where('usernameLower', '<=', q + '\uf8ff'),
      limit(10),
    ),
  );
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<PlayerProfile, 'id'>), id: d.id }))
    .filter((p) => p.id !== activeUid);
}

export async function fetchPlayerProfile(uid: string): Promise<PlayerProfile | null> {
  const snap = await getDoc(doc(db, 'players', uid));
  if (!snap.exists()) return null;
  const d = snap.data() as Omit<PlayerProfile, 'id'>;
  return { ...d, id: snap.id, seen: timestampToMs(d.lastSeen) };
}

export async function sendGlobalChatMessage(params: {
  uid: string;
  username: string;
  countryCode: string;
  rank: number;
  text: string;
}): Promise<void> {
  const activeUid = requireUid(params.uid);
  const cleanText = params.text.trim().slice(0, 200);
  if (!cleanText || !/\S/.test(cleanText)) {
    throw makeError('invalid', 'Enter a message first');
  }
  const cleanName = params.username.trim().slice(0, 16) || 'Player';
  await addDoc(collection(db, 'globalChat'), {
    uid: activeUid,
    name: cleanName,
    cc: sanitizeCountryCode(params.countryCode),
    rank: Math.max(0, Math.min(MAX_RANK, Math.floor(params.rank || 0))),
    text: cleanText,
    createdAt: serverTimestamp(),
  });
}

export async function sendDirectMessage(params: {
  fromUid: string;
  fromName: string;
  fromCc: string;
  toUid: string;
  text: string;
  notify: boolean;
}): Promise<void> {
  const activeFromUid = requireUid(params.fromUid);
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(params.toUid)) {
    throw makeError('invalid', 'Invalid recipient');
  }
  if (activeFromUid === params.toUid) {
    throw makeError('invalid', "You can't message yourself");
  }
  const cleanText = params.text.trim().slice(0, 300);
  if (!cleanText || !/\S/.test(cleanText)) {
    throw makeError('invalid', 'Enter a message first');
  }
  const cleanName = params.fromName.trim().slice(0, 16) || 'Player';
  await addDoc(collection(db, 'dms', pairIdFor(params.fromUid, params.toUid), 'messages'), {
    from: params.fromUid,
    text: cleanText,
    createdAt: serverTimestamp(),
  });
  if (params.notify) {
    await addDoc(collection(db, 'players', params.toUid, 'notifications'), {
      type: 'dm',
      text: `${cleanName}: ${cleanText.slice(0, 60)}`,
      tradeId: null,
      read: false,
      from: params.fromUid,
      fromName: cleanName,
      fromCc: sanitizeCountryCode(params.fromCc),
      createdAt: serverTimestamp(),
    }).catch((err) => {
      recordFirestoreError(err, OperationType.CREATE, `players/${params.toUid}/notifications`);
    });
  }
}

export async function markNotificationsRead(uid: string, ids: string[]): Promise<void> {
  const activeUid = requireUid(uid);
  if (!ids.length) return;
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, 'players', activeUid, 'notifications', id), { read: true });
  }
  await batch.commit();
}

export async function sendHeartbeat(uid: string): Promise<void> {
  const activeUid = requireUid(uid);
  const ref = doc(db, 'players', activeUid);
  try {
    await updateDoc(ref, { lastSeen: serverTimestamp() });
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    const msg = err instanceof Error ? err.message : String(err || '');
    const needsTokenRetry =
      code === 'unauthenticated' ||
      isPermissionDeniedError(err) ||
      /unauthenticated|permission-denied/i.test(`${code} ${msg}`);
    if (needsTokenRetry && auth?.currentUser?.uid === activeUid) {
      await auth.currentUser.getIdToken(true).catch(() => null);
      await new Promise((r) => setTimeout(r, 350));
      requireUid(activeUid);
      await updateDoc(ref, { lastSeen: serverTimestamp() });
      return;
    }
    throw err;
  }
}

export async function createGovProject(
  uid: string,
  type: ProjectType,
  onId?: (id: string) => void,
): Promise<string> {
  const activeUid = requireUid(uid);
  const ref = doc(collection(db, 'players', activeUid, 'projects'));
  onId?.(ref.id);
  await setDoc(ref, {
    uid: activeUid,
    type,
    paid: 1,
    progressMs: 0,
    status: 'active',
    claimed: false,
    startedAt: serverTimestamp(),
    lastTickAt: serverTimestamp(),
  });
  return ref.id;
}

export async function payGovProjectStage(
  uid: string,
  projectId: string,
  expectedPaid: number,
): Promise<void> {
  const activeUid = requireUid(uid);
  const ref = doc(db, 'players', activeUid, 'projects', projectId);
  await runTransaction(db, async (tx) => {
    requireUid(activeUid);
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || data.status !== 'active' || data.paid !== expectedPaid || expectedPaid >= PROJECT_STAGES) {
      throw new Error('Project state changed — please try again');
    }
    tx.update(ref, { paid: expectedPaid + 1 });
  });
}

export async function tickGovProject(
  uid: string,
  projectId: string,
  nextProgressMs: number,
): Promise<void> {
  const activeUid = requireUid(uid);
  const ref = doc(db, 'players', activeUid, 'projects', projectId);
  const clamped = Math.max(0, Math.min(2_400_000, Math.floor(nextProgressMs)));
  await runTransaction(db, async (tx) => {
    requireUid(activeUid);
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || data.status !== 'active') return;
    const prev = Math.floor(Number(data.progressMs) || 0);
    if (clamped < prev) return;
    tx.update(ref, {
      progressMs: clamped,
      lastTickAt: serverTimestamp(),
    });
  });
}

export async function finishGovProject(
  uid: string,
  projectId: string,
  status: 'done' | 'failed',
  finalProgressMs?: number,
): Promise<void> {
  const activeUid = requireUid(uid);
  const ref = doc(db, 'players', activeUid, 'projects', projectId);
  await runTransaction(db, async (tx) => {
    requireUid(activeUid);
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || data.status !== 'active') return;
    if (status === 'done' && Number(data.paid || 0) < PROJECT_STAGES) return;
    if (status === 'done' && typeof finalProgressMs === 'number') {
      const prev = Math.floor(Number(data.progressMs) || 0);
      const clamped = Math.max(prev, Math.min(2_400_000, Math.floor(finalProgressMs)));
      tx.update(ref, {
        progressMs: clamped,
        lastTickAt: serverTimestamp(),
        status: 'done',
        resolvedAt: serverTimestamp(),
      });
    } else {
      tx.update(ref, {
        status,
        resolvedAt: serverTimestamp(),
      });
    }
  });
}

export async function claimGovProject(
  uid: string,
  projectId: string,
): Promise<'done' | 'failed' | null> {
  const activeUid = requireUid(uid);
  const ref = doc(db, 'players', activeUid, 'projects', projectId);
  return runTransaction(db, async (tx) => {
    requireUid(activeUid);
    const snap = await tx.get(ref);
    const d = snap.data();
    if (!d || d.claimed || (d.status !== 'done' && d.status !== 'failed')) return null;
    tx.update(ref, { claimed: true });
    return d.status as 'done' | 'failed';
  });
}

export function normalizeProject(
  id: string,
  raw: Record<string, unknown>,
  fallbackNowMs = Date.now(),
  isPending = false,
) {
  const type = (raw.type as ProjectType) || 'school';
  const def = GX_PROJECT_TYPES[type] || GX_PROJECT_TYPES.school;
  const parsedSt = timestampToMs(raw.startedAt);
  const st = !isPending && parsedSt > 0 ? parsedSt : fallbackNowMs;
  return {
    id,
    uid: String(raw.uid || ''),
    type,
    t: def,
    paid: Math.max(1, Math.min(PROJECT_STAGES, Math.floor(Number(raw.paid) || 1))),
    progressMs: Math.max(0, Number(raw.progressMs) || 0),
    status: (raw.status as 'active' | 'done' | 'failed') || 'active',
    claimed: Boolean(raw.claimed),
    st,
    dl: st + def.dl * 60_000,
    rs: timestampToMs(raw.resolvedAt),
    pending: isPending,
  };
}

export function buildQueryHelpers() {
  return {
    playersActiveQuery: (serverOffsetMs = 0) =>
      query(
        collection(db, 'players'),
        where(
          'lastSeen',
          '>=',
          Timestamp.fromMillis(Date.now() + serverOffsetMs - (ACTIVE_WINDOW_MS + PRESENCE_QUERY_BUFFER_MS)),
        ),
        orderBy('lastSeen', 'desc'),
        limit(25),
      ),
    tradesQuery: (uid: string) =>
      query(collection(db, 'trades'), where('participants', 'array-contains', uid), limit(20)),
    notifsQuery: (uid: string) =>
      query(collection(db, 'players', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(20)),
    projectsQuery: (uid: string) =>
      query(collection(db, 'players', uid, 'projects'), orderBy('startedAt', 'desc'), limit(15)),
    globalChatQuery: () =>
      query(collection(db, 'globalChat'), orderBy('createdAt', 'desc'), limit(25)),
    dmQuery: (uidA: string, uidB: string) =>
      query(collection(db, 'dms', pairIdFor(uidA, uidB), 'messages'), orderBy('createdAt', 'desc'), limit(25)),
  };
}

export async function recordProvinceTxAndSyncOnline(params: {
  expectedUid?: string;
  txId: string;
  kind: 'unlock' | 'alloc';
  provId: string;
  slot: number;
  finalPrice: number;
  discountPct: number;
  nextState: GameState;
  pubStats: PlayerStats | undefined;
  completedTradesCount: number;
  rev: number;
  sid: string;
  onKicked: () => void;
}): Promise<{ walletRev: number }> {
  const { expectedUid, txId, kind, provId, slot, finalPrice, discountPct, nextState, pubStats, completedTradesCount, rev, sid, onKicked } = params;
  const activeUid = requireUid(expectedUid);
  const cleanedSave = cleanSavePayload(nextState);
  const cash = capValue(cleanedSave.cash, 1e13);
  const gems = capValue(cleanedSave.gems, 1e9);
  const stk = cleanStickersMap(cleanedSave.stk);
  const gdpVal = Math.max(1, Math.min(cash, capValue(calculateGdp(nextState), 1e13)));
  let nextRevOut = Math.max(1, rev + 1);

  await runSessionTx(
    sid,
    onKicked,
    async (tx, uid) => {
      const txRef = doc(db, 'players', uid, 'provinceTxs', txId);
      const wRef = doc(db, 'players', uid, 'private', 'wallet');
      const pRef = doc(db, 'players', uid);
      const [txSnap, wSnap, pSnap] = await Promise.all([tx.get(txRef), tx.get(wRef), tx.get(pRef)]);

      if (txSnap.exists()) {
        throw makeError('already-exists', 'Transaction already processed');
      }
      if (!pSnap.exists()) {
        throw makeError('failed-precondition', 'Player profile not initialized');
      }

      const wData = wSnap.exists() ? wSnap.data() : null;
      const curRev = wData && Number.isFinite(Number(wData.rev)) ? Math.max(0, Math.floor(Number(wData.rev))) : 0;
      const nextRev = Math.min(1e9, curRev + 1);
      nextRevOut = nextRev;

      tx.set(txRef, {
        uid,
        txId,
        kind,
        provId,
        slot: Math.max(1, Math.min(10, Math.floor(slot))),
        finalPrice: Math.max(0, Math.floor(finalPrice)),
        discountPct: Math.max(0, Math.min(40, Math.floor(discountPct))),
        createdAt: serverTimestamp(),
      });

      tx.set(wRef, {
        cash,
        gems,
        stk,
        rev: nextRev,
        sid,
        t: serverTimestamp(),
      });

      const existingStats = (pSnap.data()?.stats as Partial<PlayerStats> | undefined) ?? pubStats;
      const mergedStats = sanitizeStats(existingStats, {
        buildings: totalBuildings(nextState),
        completedTrades: Math.max(
          existingStats?.completedTrades || 0,
          pubStats?.completedTrades || 0,
          completedTradesCount,
        ),
      });
      const activeSub = getActiveSubscription(nextState, Date.now());
      tx.update(pRef, {
        gdp: gdpVal,
        cash,
        gems,
        level: capValue(playerLevel(nextState), 10_000_000) || 1,
        rank: capValue(nextState.rank, MAX_RANK),
        subTier: activeSub ? activeSub.def.id : '',
        subExp: activeSub ? capValue(activeSub.exp, 1e13) : 0,
        lastSeen: serverTimestamp(),
        stats: mergedStats,
      });

      tx.set(doc(db, 'saves', uid), { save: cleanedSave });
    },
    true,
    `players/provinceTxs/${txId}`,
    false,
    activeUid,
  );

  return { walletRev: nextRevOut };
}

export async function syncProvinceLeaderboardEntries(
  entries: ProvinceLeaderboardEntry[],
  expectedUid?: string,
): Promise<void> {
  if (!entries.length || !auth?.currentUser?.uid) return;
  const uid = requireUid(expectedUid);
  const batch = writeBatch(db);
  for (const e of entries.slice(0, 10)) {
    const entryId = `${uid}_${e.provId}`;
    batch.set(doc(db, 'provinceLeaderboard', entryId), {
      ownerUid: uid,
      ownerName: e.ownerName.slice(0, 16) || 'Player',
      countryCode: sanitizeCountryCode(e.countryCode),
      provId: e.provId,
      slot: Math.max(1, Math.min(10, Math.floor(e.slot))),
      name: e.name.slice(0, 24),
      flagId: e.flagId.slice(0, 32),
      color: e.color,
      gdp: Math.max(0, Math.min(1e13, Math.round(e.gdp))),
      pop: Number(Math.max(0.5, Math.min(10_000, e.pop)).toFixed(2)),
      hap: Number(Math.max(0, Math.min(100, e.hap)).toFixed(1)),
      dev: Number(Math.max(1, Math.min(100, e.dev)).toFixed(1)),
      emp: Number(Math.max(0, Math.min(100, e.emp)).toFixed(1)),
      overallScore: Math.max(0, Math.min(1000, Math.round(e.overallScore))),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

const LEADERBOARD_ORDER_FIELD: Record<ProvinceLeaderboardCategory, string> = {
  overall: 'overallScore',
  gdp: 'gdp',
  hap: 'hap',
  dev: 'dev',
  pop: 'pop',
  emp: 'emp',
};

export async function fetchProvinceLeaderboard(
  category: ProvinceLeaderboardCategory,
  limitCount = 100,
): Promise<ProvinceLeaderboardEntry[]> {
  if (!auth?.currentUser?.uid) return [];
  const field = LEADERBOARD_ORDER_FIELD[category] || 'overallScore';
  const snap = await getDocs(
    query(
      collection(db, 'provinceLeaderboard'),
      orderBy(field, 'desc'),
      limit(Math.max(1, Math.min(100, limitCount))),
    ),
  );
  const mapped: ProvinceLeaderboardEntry[] = snap.docs.map((d) => {
    const raw = d.data() as Record<string, unknown>;
    return {
      entryId: d.id,
      ownerUid: String(raw.ownerUid || ''),
      ownerName: String(raw.ownerName || 'Player'),
      countryCode: String(raw.countryCode || 'PK'),
      provId: String(raw.provId || 'prov_1'),
      slot: Number(raw.slot || 1),
      name: String(raw.name || 'Province'),
      flagId: String(raw.flagId || 'crest_star'),
      color: String(raw.color || '#3fd2ff'),
      gdp: Number(raw.gdp || 0),
      pop: Number(raw.pop || 1),
      hap: Number(raw.hap || 60),
      dev: Number(raw.dev || 1),
      emp: Number(raw.emp || 68),
      overallScore: Number(raw.overallScore || 0),
      updatedMs: timestampToMs(raw.updatedAt),
    };
  });
  return selectBestProvinceLeaderboardEntries(mapped, category);
}

