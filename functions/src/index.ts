import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';

const app = getApps().length > 0 ? getApp() : initializeApp();
const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

const MAX_PROVINCES = 10;
const PROVINCE_UNLOCK_PRICES = [
  0,
  250_000_000,
  400_000_000,
  650_000_000,
  1_000_000_000,
  1_500_000_000,
  2_200_000_000,
  3_200_000_000,
  4_500_000_000,
  6_000_000_000,
] as const;

const PROVINCE_DISCOUNT_EPOCH_MS = Date.UTC(2026, 0, 5, 0, 0, 0);
const PROVINCE_WEEK_MS = 7 * 86_400_000;
const PROVINCE_WEEKLY_SCHEDULE = [
  { cycleWeek: 1, targetSlot: 2, discountPct: 20 },
  { cycleWeek: 2, targetSlot: 3, discountPct: 20 },
  { cycleWeek: 3, targetSlot: 4, discountPct: 20 },
  { cycleWeek: 4, targetSlot: 5, discountPct: 25 },
] as const;

const VALID_FLAGS = new Set([
  'crest_star', 'nordic_cross', 'rising_sun', 'twin_peaks',
  'royal_chevron', 'emerald_tri', 'harbor_stripes', 'imperial_diamond',
  'civic_wheel', 'aurora_arc', 'shield_quarter', 'citadel_gate',
]);

const VALID_COLORS = new Set([
  '#3fd2ff', '#37e6a0', '#ffc93c', '#ff6ba8', '#a56bff',
  '#3b82f6', '#fb923c', '#2dd4bf', '#f43f5e', '#e879f9',
]);

const BUDGET_CATEGORIES = new Set([
  'infrastructure', 'education', 'healthcare', 'security', 'welfare', 'industry',
]);

function sanitizeName(raw: unknown): string {
  return String(raw ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[^A-Za-z0-9 '&\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24)
    .trim();
}

function sanitizeDesc(raw: unknown): string {
  return String(raw ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function getServerWeeklyDiscount(nowMs: number) {
  const weekIndex = Math.max(0, Math.floor((nowMs - PROVINCE_DISCOUNT_EPOCH_MS) / PROVINCE_WEEK_MS));
  const sched = PROVINCE_WEEKLY_SCHEDULE[weekIndex % PROVINCE_WEEKLY_SCHEDULE.length];
  return {
    weekIndex,
    ...sched,
  };
}

async function verifyBearerUid(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

function setCors(res: { setHeader: (k: string, v: string) => void }) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Server-authoritative Province unlock endpoint:
 * - Verifies Firebase ID token.
 * - Computes progressive price + UTC server-time weekly discount independently of client values.
 * - Enforces <= 10 limit, unique Province names, idempotent txId ledger, and atomic wallet + save cash deduction.
 */
export const unlockProvince = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const uid = await verifyBearerUid(req.headers.authorization);
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = (req.body || {}) as {
    txId?: unknown;
    name?: unknown;
    desc?: unknown;
    flagId?: unknown;
    color?: unknown;
    sid?: unknown;
  };

  const txId = String(body.txId ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const name = sanitizeName(body.name);
  const desc = sanitizeDesc(body.desc);
  const flagId = String(body.flagId ?? '');
  const color = String(body.color ?? '').toLowerCase();
  const sid = String(body.sid ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);

  if (!txId || name.length < 2 || !VALID_FLAGS.has(flagId) || !VALID_COLORS.has(color)) {
    res.status(400).json({ error: 'Invalid customization or transaction ID' });
    return;
  }

  try {
    const nowMs = Date.now();
    const offer = getServerWeeklyDiscount(nowMs);

    const out = await adminDb.runTransaction(async (tx) => {
      const txRef = adminDb.doc(`players/${uid}/provinceTxs/${txId}`);
      const saveRef = adminDb.doc(`saves/${uid}`);
      const walletRef = adminDb.doc(`players/${uid}/private/wallet`);
      const playerRef = adminDb.doc(`players/${uid}`);

      const [txSnap, saveSnap, walletSnap, playerSnap] = await Promise.all([
        tx.get(txRef),
        tx.get(saveRef),
        tx.get(walletRef),
        tx.get(playerRef),
      ]);

      if (txSnap.exists) {
        throw new Error('ALREADY_PROCESSED');
      }
      if (!saveSnap.exists || !walletSnap.exists || !playerSnap.exists) {
        throw new Error('PLAYER_NOT_READY');
      }

      const saveData = (saveSnap.data()?.save || {}) as Record<string, unknown>;
      const provinces = Array.isArray(saveData.provinces)
        ? (saveData.provinces as Array<Record<string, unknown>>)
        : [];
      if (provinces.length >= MAX_PROVINCES) {
        throw new Error('MAX_PROVINCES_REACHED');
      }

      const duplicateName = provinces.some(
        (p) => String(p.name || '').trim().toLowerCase() === name.toLowerCase(),
      );
      if (duplicateName) {
        throw new Error('DUPLICATE_NAME');
      }

      const nextSlot = provinces.length + 1;
      if (provinces.some((p) => Number(p.slot) === nextSlot)) {
        throw new Error('SLOT_TAKEN');
      }

      const basePrice = PROVINCE_UNLOCK_PRICES[nextSlot - 1] ?? 0;
      const discountApplied = offer.targetSlot === nextSlot;
      const discountPct = discountApplied ? offer.discountPct : 0;
      const finalPrice = discountApplied
        ? Math.max(0, Math.floor((basePrice * (100 - discountPct)) / 100))
        : basePrice;

      const walletCash = Math.max(0, Math.floor(Number(walletSnap.data()?.cash || 0)));
      if (walletCash < finalPrice) {
        throw new Error('INSUFFICIENT_CASH');
      }

      const nextCash = walletCash - finalPrice;
      const prevRev = Math.max(1, Math.floor(Number(walletSnap.data()?.rev || 1)));
      const newProv = {
        id: `prov_${nextSlot}`,
        slot: nextSlot,
        name,
        desc,
        flagId,
        color,
        unlockedAt: nowMs,
        paidPrice: finalPrice,
        gdp: 50_000 * nextSlot,
        pop: Number((6 + (nextSlot - 1) * 2.5).toFixed(2)),
        hap: 62,
        dev: 1,
        emp: 68,
        prod: 50,
        budget: {
          infrastructure: 0,
          education: 0,
          healthcare: 0,
          security: 0,
          welfare: 0,
          industry: 0,
        },
        allocTotal: 0,
        lvls: {
          infrastructure: 15,
          education: 15,
          healthcare: 15,
          security: 15,
          welfare: 15,
          businessActivity: 15,
        },
        lastMaint: 0,
        fundingRatio: 100,
      };

      const nextTxs = [
        ...(Array.isArray(saveData.provTxs) ? (saveData.provTxs as string[]) : []),
        txId,
      ].slice(-30);

      const nextLog = [
        ...(Array.isArray(saveData.provBudgetLog) ? (saveData.provBudgetLog as unknown[]) : []),
        {
          t: nowMs,
          provId: newProv.id,
          provName: newProv.name,
          cat: 'charter',
          amt: finalPrice,
          kind: 'unlock',
        },
      ].slice(-20);

      tx.set(txRef, {
        uid,
        txId,
        kind: 'unlock',
        provId: newProv.id,
        slot: nextSlot,
        finalPrice,
        discountPct,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.update(walletRef, {
        cash: nextCash,
        rev: prevRev + 1,
        sid: sid || walletSnap.data()?.sid || 'fn',
        t: FieldValue.serverTimestamp(),
      });

      tx.update(playerRef, {
        cash: nextCash,
        gdp: Math.max(1, nextCash),
        lastSeen: FieldValue.serverTimestamp(),
      });

      tx.update(saveRef, {
        'save.cash': nextCash,
        'save.provinces': [...provinces, newProv],
        'save.provTxs': nextTxs,
        'save.provBudgetLog': nextLog,
      });

      return {
        province: newProv,
        paidPrice: finalPrice,
        basePrice,
        discountPct,
        nextCash,
      };
    });

    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNLOCK_FAILED';
    const status =
      msg === 'ALREADY_PROCESSED' || msg === 'SLOT_TAKEN'
        ? 409
        : msg === 'INSUFFICIENT_CASH' || msg === 'MAX_PROVINCES_REACHED' || msg === 'DUPLICATE_NAME'
          ? 400
          : 500;
    res.status(status).json({ ok: false, error: msg });
  }
});

/**
 * Server-authoritative budget allocation endpoint:
 * Deducts exact allocation from player wallet & save cash atomically into a specific Province category reserve.
 */
export const allocateProvinceBudget = onRequest(async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const uid = await verifyBearerUid(req.headers.authorization);
  if (!uid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = (req.body || {}) as {
    txId?: unknown;
    provId?: unknown;
    category?: unknown;
    amount?: unknown;
    sid?: unknown;
  };
  const txId = String(body.txId ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  const provId = String(body.provId ?? '');
  const category = String(body.category ?? '');
  const amount = Math.floor(Number(body.amount));
  const sid = String(body.sid ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);

  if (
    !txId ||
    !/^prov_([1-9]|10)$/.test(provId) ||
    !BUDGET_CATEGORIES.has(category) ||
    !Number.isFinite(amount) ||
    amount < 1 ||
    amount > 1e12
  ) {
    res.status(400).json({ error: 'Invalid allocation parameters' });
    return;
  }

  try {
    const nowMs = Date.now();
    const out = await adminDb.runTransaction(async (tx) => {
      const txRef = adminDb.doc(`players/${uid}/provinceTxs/${txId}`);
      const saveRef = adminDb.doc(`saves/${uid}`);
      const walletRef = adminDb.doc(`players/${uid}/private/wallet`);
      const playerRef = adminDb.doc(`players/${uid}`);

      const [txSnap, saveSnap, walletSnap, playerSnap] = await Promise.all([
        tx.get(txRef),
        tx.get(saveRef),
        tx.get(walletRef),
        tx.get(playerRef),
      ]);

      if (txSnap.exists) throw new Error('ALREADY_PROCESSED');
      if (!saveSnap.exists || !walletSnap.exists || !playerSnap.exists) throw new Error('PLAYER_NOT_READY');

      const walletCash = Math.max(0, Math.floor(Number(walletSnap.data()?.cash || 0)));
      if (walletCash < amount) throw new Error('INSUFFICIENT_CASH');

      const saveData = (saveSnap.data()?.save || {}) as Record<string, unknown>;
      const provinces = Array.isArray(saveData.provinces)
        ? (saveData.provinces as Array<Record<string, unknown>>)
        : [];
      const idx = provinces.findIndex((p) => String(p.id) === provId);
      if (idx < 0) throw new Error('PROVINCE_NOT_FOUND');

      const target = provinces[idx];
      const budget = { ...(target.budget as Record<string, number>) };
      const nextCatVal = (budget[category] || 0) + amount;
      if (nextCatVal > 1e12) throw new Error('RESERVE_CAP_REACHED');

      budget[category] = nextCatVal;
      const updated = {
        ...target,
        budget,
        allocTotal: Math.min(1e13, Number(target.allocTotal || 0) + amount),
      };
      const nextProvinces = provinces.map((p, i) => (i === idx ? updated : p));
      const nextCash = walletCash - amount;
      const prevRev = Math.max(1, Math.floor(Number(walletSnap.data()?.rev || 1)));

      tx.set(txRef, {
        uid,
        txId,
        kind: 'alloc',
        provId,
        slot: Number(target.slot || 1),
        finalPrice: amount,
        discountPct: 0,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(walletRef, {
        cash: nextCash,
        rev: prevRev + 1,
        sid: sid || walletSnap.data()?.sid || 'fn',
        t: FieldValue.serverTimestamp(),
      });
      tx.update(playerRef, {
        cash: nextCash,
        gdp: Math.max(1, nextCash),
        lastSeen: FieldValue.serverTimestamp(),
      });
      tx.update(saveRef, {
        'save.cash': nextCash,
        'save.provinces': nextProvinces,
        'save.provTxs': [...(Array.isArray(saveData.provTxs) ? (saveData.provTxs as string[]) : []), txId].slice(-30),
        'save.provBudgetLog': [
          ...(Array.isArray(saveData.provBudgetLog) ? (saveData.provBudgetLog as unknown[]) : []),
          {
            t: nowMs,
            provId,
            provName: String(target.name || 'Province'),
            cat: category,
            amt: amount,
            kind: 'alloc',
          },
        ].slice(-20),
      });

      return { nextCash, province: updated };
    });

    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'ALLOC_FAILED';
    res.status(msg === 'ALREADY_PROCESSED' ? 409 : 400).json({ ok: false, error: msg });
  }
});
