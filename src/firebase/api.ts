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
  COUNTRIES,
  DAILY_GIFT_MAX,
  GX_PROJECT_TYPES,
  MAX_RANK,
  PROJECT_STAGES,
  TZ,
} from '../game/constants';
import {
  calculateGdp,
  cleanSavePayload,
  cleanStickersMap,
  getActiveSubscription,
  playerLevel,
  sanitizeCountryCode,
  sanitizeStats,
  totalBuildings,
} from '../game/rules';
import type {
  GameState,
  PlayerProfile,
  PlayerStats,
  ProjectType,
  TradeOffer,
} from '../game/types';
import {
  auth,
  buildFirestoreErrorInfo,
  db,
  handleFirestoreError,
  OperationType,
} from './config';

const KARACHI_DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function dayKeyFor(ms: number): string {
  return KARACHI_DAY_FORMATTER.format(new Date(ms));
}

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
  const n = Math.floor(Number(v) || 0);
  return Math.min(max, Math.max(0, n));
}

function makeError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function requireUid(): string {
  const u = auth.currentUser?.uid;
  if (!u) throw makeError('unauthenticated', 'Not signed in');
  return u;
}

function reportAndRethrow(
  err: unknown,
  op: OperationType,
  path: string | null,
): never {
  const code = (err as { code?: string })?.code || '';
  if (code !== 'aborted' && code !== 'already-exists' && code !== 'resource-exhausted') {
    console.error('Firestore Error: ', JSON.stringify(buildFirestoreErrorInfo(err, op, path)));
  }
  throw err;
}

async function runSessionTx<T>(
  sid: string,
  onKicked: () => void,
  fn: (tx: Transaction, uid: string) => Promise<T>,
  checkSession = true,
  opPath: string | null = null,
): Promise<T> {
  const uid = requireUid();
  try {
    return await runTransaction(db, async (tx) => {
      if (checkSession) {
        const sesSnap = await tx.get(doc(db, 'players', uid, 'private', 'session'));
        if (sesSnap.exists() && sesSnap.data()?.sid !== sid) {
          onKicked();
          throw makeError('aborted', 'Another session is active');
        }
      }
      return fn(tx, uid);
    });
  } catch (err) {
    reportAndRethrow(err, OperationType.WRITE, opPath || `players/${uid}`);
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
): Promise<void> {
  const username = usernameRaw.trim();
  const lower = username.toLowerCase();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    throw makeError('invalid', 'Invalid username');
  }
  const cn = COUNTRIES.find((c) => c[0] === countryCodeRaw) || COUNTRIES[0];

  await runSessionTx(
    sid,
    onKicked,
    async (tx, uid) => {
      const uRef = doc(db, 'usernames', lower);
      const sRef = doc(db, 'saves', uid);
      const [uSnap, sSnap] = await Promise.all([tx.get(uRef), tx.get(sRef)]);
      if (uSnap.exists() && uSnap.data()?.uid !== uid) {
        throw makeError('already-exists', 'Username already taken');
      }

      const oldRaw = sSnap.exists() ? (sSnap.data()?.save as Partial<GameState> | undefined) : undefined;
      const cash = oldRaw ? capValue(oldRaw.cash, 1e13) : 260;
      const gems = oldRaw ? capValue(oldRaw.gems, 1e9) : 3;
      const stk = oldRaw ? cleanStickersMap(oldRaw.stk) : {};

      if (!uSnap.exists()) {
        tx.set(uRef, { uid });
      }
      const activeSub = getActiveSubscription(state, Date.now());
      tx.set(doc(db, 'players', uid), {
        username,
        usernameLower: lower,
        countryCode: cn[0],
        countryName: cn[1],
        gdp: Math.max(1, cash),
        cash,
        gems,
        level: 1,
        rank: 0,
        subTier: activeSub ? activeSub.def.id : '',
        subExp: activeSub ? Math.max(0, Math.min(1e13, Math.floor(activeSub.exp))) : 0,
        lastSeen: serverTimestamp(),
        stats: sanitizeStats(undefined),
        createdAt: serverTimestamp(),
      });
      tx.set(doc(db, 'players', uid, 'private', 'wallet'), {
        cash,
        gems,
        stk,
        rev: 1,
        sid,
        t: serverTimestamp(),
      });
      if (!oldRaw) {
        tx.set(sRef, { save: cleanSavePayload(state) });
      }
    },
    false,
    'players',
  );
}

export async function syncSaveToCloud(params: {
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
  const { state, pubStats, completedTradesCount, rev, sid, onKicked } = params;
  const cash = capValue(state.cash, 1e13);
  const gems = capValue(state.gems, 1e9);
  const stk = cleanStickersMap(state.stk);
  const gdpVal = Math.max(1, Math.min(cash, capValue(calculateGdp(state), 1e13)));

  let result!: {
    accepted: boolean;
    wallet: { cash: number; gems: number; stk: Record<string, number>; rev: number };
  };

  await runSessionTx(sid, onKicked, async (tx, uid) => {
    const wRef = doc(db, 'players', uid, 'private', 'wallet');
    const pRef = doc(db, 'players', uid);
    const [wSnap, pSnap] = await Promise.all([tx.get(wRef), tx.get(pRef)]);
    if (!pSnap.exists()) {
      throw makeError('failed-precondition', 'Player profile not initialized');
    }
    const wData = wSnap.exists() ? wSnap.data() : null;
    const curRev = wData && Number.isFinite(Number(wData.rev)) ? Math.max(0, Math.floor(Number(wData.rev))) : 0;
    const accepted = !wData || curRev === rev;

    if (accepted) {
      const nextRev = Math.min(1e9, curRev + 1);
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
        level: Math.max(1, Math.min(10_000_000, playerLevel(state))),
        rank: Math.max(0, Math.min(MAX_RANK, Math.floor(state.rank || 0))),
        subTier: activeSub ? activeSub.def.id : '',
        subExp: activeSub ? Math.max(0, Math.min(1e13, Math.floor(activeSub.exp))) : 0,
        lastSeen: serverTimestamp(),
        stats: mergedStats,
      });
      tx.set(doc(db, 'saves', uid), { save: cleanSavePayload(state) });
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
  }, true, 'saves (wallet + player + save)');

  return result;
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
    const prevRev = Number(wd.rev) || 1;

    tx.set(wRef, {
      cash: wCash - oc,
      gems: wGems - og,
      stk: nextStk,
      rev: Math.min(1e9, prevRev + 1),
      sid: params.sid,
      t: serverTimestamp(),
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
      fromName: meData.username,
      toName: toData.username,
      fromCountry: sanitizeCountryCode(meData.countryCode),
      toCountry: sanitizeCountryCode(toData.countryCode),
      participants: [me, params.toUid],
      offerCash: oc,
      offerGems: og,
      offerStk,
      reqCash: 0,
      reqGems: 0,
      reqStk: {},
      message: params.message.slice(0, 140),
      status: 'pending',
      refunded: false,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + serverOffsetMs + 120_000),
    });

    tx.set(dlRef, { count: curCount + 1, uid: me });
    writeNotifInTx(tx, params.toUid, me, 'new_offer', `${meData.username} sent you a gift`, trRef.id);
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

    tx.set(wRef, {
      cash: newCash,
      gems: newGems,
      stk: mStk,
      rev: Math.min(1e9, (Number(w.rev) || 1) + 1),
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

    tx.update(tRef, { status: 'accepted', resolvedAt: serverTimestamp() });
    writeNotifInTx(tx, t.from, me, 'accepted', `${t.toName} accepted your gift`, tradeId);
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
    tx.update(tRef, { status: want, resolvedAt: serverTimestamp(), refunded: true });
    tx.set(wRef, {
      cash: Math.min(1e13, capValue(w.cash, 1e13) + capValue(t.offerCash, 1e12)),
      gems: Math.min(1e9, capValue(w.gems, 1e9) + capValue(t.offerGems, 1e9)),
      stk: refundStk,
      rev: Math.min(1e9, (Number(w.rev) || 1) + 1),
      sid,
      t: serverTimestamp(),
      tradeId,
    });
    writeNotifInTx(
      tx,
      t.to,
      me,
      want,
      `${t.fromName}${want === 'expired' ? "'s gift expired" : ' cancelled the gift'}`,
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
    tx.update(tRef, { refunded: true });
    tx.set(wRef, {
      cash: Math.min(1e13, capValue(w.cash, 1e13) + capValue(t.offerCash, 1e12)),
      gems: Math.min(1e9, capValue(w.gems, 1e9) + capValue(t.offerGems, 1e9)),
      stk: refundStk,
      rev: Math.min(1e9, (Number(w.rev) || 1) + 1),
      sid,
      t: serverTimestamp(),
      tradeId,
    });
  });
  return status;
}

export async function settleExpiredTrades(
  trades: TradeOffer[],
  uid: string,
  sid: string,
  onKicked: () => void,
  serverOffsetMs = 0,
): Promise<void> {
  const now = Date.now() + serverOffsetMs;
  for (const t of trades) {
    if (t.from === uid && t.status === 'pending' && t.expMs <= now) {
      await endSenderOffer(t.id, 'expired', sid, onKicked, serverOffsetMs).catch(() => {});
    } else if (
      t.from === uid &&
      (t.status === 'rejected' || t.status === 'expired') &&
      !t.refunded
    ) {
      await reclaimUnrefundedOffer(t.id, sid, onKicked).catch(() => {});
    }
  }
}

export async function searchPlayersByUsername(
  queryStr: string,
  myUid: string,
): Promise<PlayerProfile[]> {
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
    .filter((p) => p.id !== myUid);
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
  await addDoc(collection(db, 'globalChat'), {
    uid: params.uid,
    name: params.username.slice(0, 16),
    cc: sanitizeCountryCode(params.countryCode),
    rank: Math.max(0, Math.min(MAX_RANK, Math.floor(params.rank || 0))),
    text: params.text.trim().slice(0, 200),
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
  const cleanText = params.text.trim().slice(0, 300);
  await addDoc(collection(db, 'dms', pairIdFor(params.fromUid, params.toUid), 'messages'), {
    from: params.fromUid,
    text: cleanText,
    createdAt: serverTimestamp(),
  });
  if (params.notify) {
    await addDoc(collection(db, 'players', params.toUid, 'notifications'), {
      type: 'dm',
      text: `${params.fromName}: ${cleanText.slice(0, 60)}`,
      tradeId: null,
      read: false,
      from: params.fromUid,
      fromName: params.fromName.slice(0, 16),
      fromCc: sanitizeCountryCode(params.fromCc),
      createdAt: serverTimestamp(),
    }).catch(() => {});
  }
}

export async function markNotificationsRead(uid: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, 'players', uid, 'notifications', id), { read: true });
  }
  await batch.commit();
}

export async function sendHeartbeat(uid: string): Promise<void> {
  await updateDoc(doc(db, 'players', uid), { lastSeen: serverTimestamp() });
}

export async function createGovProject(
  uid: string,
  type: ProjectType,
  onId?: (id: string) => void,
): Promise<string> {
  const ref = doc(collection(db, 'players', uid, 'projects'));
  onId?.(ref.id);
  await setDoc(ref, {
    uid,
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
  const ref = doc(db, 'players', uid, 'projects', projectId);
  await runTransaction(db, async (tx) => {
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
  const ref = doc(db, 'players', uid, 'projects', projectId);
  const clamped = Math.max(0, Math.min(2_400_000, Math.floor(nextProgressMs)));
  await runTransaction(db, async (tx) => {
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
  const ref = doc(db, 'players', uid, 'projects', projectId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || data.status !== 'active') return;
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
  const ref = doc(db, 'players', uid, 'projects', projectId);
  return runTransaction(db, async (tx) => {
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
    playersActiveQuery: () =>
      query(
        collection(db, 'players'),
        where('lastSeen', '>=', Timestamp.fromMillis(Date.now() - 480_000)),
        orderBy('lastSeen', 'desc'),
        limit(100),
      ),
    tradesQuery: (uid: string) =>
      query(collection(db, 'trades'), where('participants', 'array-contains', uid), limit(40)),
    notifsQuery: (uid: string) =>
      query(collection(db, 'players', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(40)),
    projectsQuery: (uid: string) =>
      query(collection(db, 'players', uid, 'projects'), orderBy('startedAt', 'desc'), limit(20)),
    globalChatQuery: () =>
      query(collection(db, 'globalChat'), orderBy('createdAt', 'desc'), limit(60)),
    dmQuery: (uidA: string, uidB: string) =>
      query(collection(db, 'dms', pairIdFor(uidA, uidB), 'messages'), orderBy('createdAt', 'desc'), limit(60)),
  };
}
