import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';

const app = getApps().length > 0 ? getApp() : initializeApp();
const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

interface ServerRankRule {
  id: number;
  name: string;
  cost: number;
  minGdp: number;
  minBuildings: number;
  minHap: number;
  minTech: number;
}

const RANK_RULES: Record<number, ServerRankRule> = {
  2: { id: 2, name: 'Citizen', cost: 25_000, minGdp: 40_000, minBuildings: 6, minHap: 50, minTech: 0 },
  3: { id: 3, name: 'Entrepreneur', cost: 150_000, minGdp: 220_000, minBuildings: 14, minHap: 52, minTech: 0 },
  4: { id: 4, name: 'Business Owner', cost: 750_000, minGdp: 1_200_000, minBuildings: 24, minHap: 55, minTech: 1 },
  5: { id: 5, name: 'Industrialist', cost: 3_500_000, minGdp: 6_000_000, minBuildings: 36, minHap: 56, minTech: 2 },
  6: { id: 6, name: 'Millionaire', cost: 15_000_000, minGdp: 25_000_000, minBuildings: 50, minHap: 58, minTech: 3 },
  7: { id: 7, name: 'Tycoon', cost: 60_000_000, minGdp: 110_000_000, minBuildings: 68, minHap: 60, minTech: 4 },
  8: { id: 8, name: 'Billionaire', cost: 240_000_000, minGdp: 450_000_000, minBuildings: 88, minHap: 62, minTech: 5 },
  9: { id: 9, name: 'Economic Leader', cost: 900_000_000, minGdp: 1_800_000_000, minBuildings: 115, minHap: 65, minTech: 6 },
  10: { id: 10, name: 'National Legend', cost: 3_500_000_000, minGdp: 7_500_000_000, minBuildings: 150, minHap: 68, minTech: 6 },
};

const BUILDING_COSTS: Record<string, { cost: number; inc: number; jobs: number }> = {
  farms: { cost: 150, inc: 0.9, jobs: 12 },
  greenhouses: { cost: 950, inc: 3.8, jobs: 18 },
  food_plant: { cost: 3_800, inc: 13.5, jobs: 34 },
  textile_mills: { cost: 1_100, inc: 4.5, jobs: 42 },
  factories: { cost: 5_500, inc: 21, jobs: 68 },
  steel_plants: { cost: 28_000, inc: 94, jobs: 115 },
  solar_plants: { cost: 2_800, inc: 8.2, jobs: 16 },
  wind_farms: { cost: 12_000, inc: 33, jobs: 26 },
  power_stations: { cost: 52_000, inc: 136, jobs: 58 },
  roads: { cost: 2_200, inc: 6.8, jobs: 28 },
  railways: { cost: 22_000, inc: 68, jobs: 72 },
  ports: { cost: 68_000, inc: 205, jobs: 120 },
  airports: { cost: 210_000, inc: 585, jobs: 185 },
  markets: { cost: 650, inc: 2.5, jobs: 24 },
  shopping_centers: { cost: 16_000, inc: 52, jobs: 82 },
  business_districts: { cost: 145_000, inc: 430, jobs: 210 },
  research_centers: { cost: 38_000, inc: 102, jobs: 64 },
  tech_parks: { cost: 115_000, inc: 335, jobs: 145 },
  data_centers: { cost: 340_000, inc: 1_060, jobs: 95 },
  training_centers: { cost: 4_200, inc: 12, jobs: 38 },
  hospitals: { cost: 19_500, inc: 48, jobs: 96 },
  universities: { cost: 88_000, inc: 225, jobs: 135 },
};

const DOCTRINE_IDS = new Set([
  'smart_grid',
  'eco_catalysis',
  'healthcare_act',
  'auto_customs',
  'civil_corps',
  'sovereign_vault',
]);

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

function computeServerNationalMetrics(saveData: Record<string, unknown>, walletCash: number) {
  const b = (saveData.b && typeof saveData.b === 'object' ? saveData.b : {}) as Record<string, unknown>;
  const gx = (saveData.gx && typeof saveData.gx === 'object' ? saveData.gx : {}) as Record<string, unknown>;
  const lvlMap = (gx.lvl && typeof gx.lvl === 'object' ? gx.lvl : {}) as Record<string, unknown>;
  const techMap = (saveData.tech && typeof saveData.tech === 'object' ? saveData.tech : {}) as Record<string, unknown>;

  let buildingsTotal = 0;
  let capitalEquity = 0;
  let jobsCreated = 0;
  let baseFlow = 2;

  for (const [id, spec] of Object.entries(BUILDING_COSTS)) {
    const count = Math.max(0, Math.min(10_000, Math.floor(Number(b[id]) || 0)));
    if (count <= 0) continue;
    buildingsTotal += count;
    const lvl = Math.max(1, Math.min(5, Math.floor(Number(lvlMap[id]) || 1)));
    capitalEquity += spec.cost * count * (1 + (lvl - 1) * 0.45) * 1.15;
    jobsCreated += spec.jobs * count;
    baseFlow += spec.inc * count * (1 + (lvl - 1) * 0.35);
  }

  let doctrines = 0;
  for (const k of DOCTRINE_IDS) {
    if (Number(techMap[k] || 0) > 0) doctrines += 1;
  }

  const pop = Math.max(1, Math.min(100_000, Number(saveData.pop) || 48));
  const hap = Math.max(0, Math.min(100, Number(saveData.hap) || 0));
  const humanCapital = pop * 220 + jobsCreated * 45 + doctrines * 150_000;
  const treasuryComponent = Math.min(1e12, Math.max(0, walletCash) * 0.35);
  const realGdp = Math.max(
    1000,
    Math.min(1e13, Math.floor(capitalEquity + baseFlow * 180 + humanCapital + treasuryComponent)),
  );

  return { buildingsTotal, doctrines, hap, realGdp };
}

/**
 * Server-authoritative National Rank Promotion endpoint:
 * - Verifies Firebase ID token.
 * - Checks sequential progression (`currentRank + 1 === targetRank`).
 * - Recomputes Real National GDP, total buildings, happiness, and doctrines server-side.
 * - Atomically deducts Coins from private wallet + save and updates public player profile.
 */
export const verifyNationalRankPromotion = onRequest(async (req, res) => {
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

  const body = (req.body || {}) as { targetRank?: unknown; sid?: unknown };
  const targetRank = Math.floor(Number(body.targetRank));
  const sid = String(body.sid ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const rule = RANK_RULES[targetRank];
  if (!rule) {
    res.status(400).json({ ok: false, error: 'INVALID_RANK' });
    return;
  }

  try {
    const out = await adminDb.runTransaction(async (tx) => {
      const saveRef = adminDb.doc(`saves/${uid}`);
      const walletRef = adminDb.doc(`players/${uid}/private/wallet`);
      const playerRef = adminDb.doc(`players/${uid}`);

      const [saveSnap, walletSnap, playerSnap] = await Promise.all([
        tx.get(saveRef),
        tx.get(walletRef),
        tx.get(playerRef),
      ]);

      if (!saveSnap.exists || !walletSnap.exists || !playerSnap.exists) {
        throw new Error('PLAYER_NOT_READY');
      }

      const saveData = (saveSnap.data()?.save || {}) as Record<string, unknown>;
      const currentRank = Math.max(1, Math.min(10, Math.floor(Number(saveData.rank) || 1)));
      if (targetRank !== currentRank + 1) {
        throw new Error('RANK_ORDER_INVALID');
      }

      const walletCash = Math.max(0, Math.floor(Number(walletSnap.data()?.cash || 0)));
      const metrics = computeServerNationalMetrics(saveData, walletCash);

      if (metrics.realGdp < rule.minGdp) throw new Error('INSUFFICIENT_GDP');
      if (metrics.buildingsTotal < rule.minBuildings) throw new Error('INSUFFICIENT_BUILDINGS');
      if (metrics.hap < rule.minHap) throw new Error('INSUFFICIENT_HAPPINESS');
      if (metrics.doctrines < rule.minTech) throw new Error('INSUFFICIENT_DOCTRINES');
      if (walletCash < rule.cost) throw new Error('INSUFFICIENT_CASH');

      const nextCash = walletCash - rule.cost;
      const prevRev = Math.max(1, Math.floor(Number(walletSnap.data()?.rev || 1)));
      const nextRev = Math.min(1e9, prevRev + 1);
      const nextMetrics = computeServerNationalMetrics(saveData, nextCash);

      tx.update(walletRef, {
        cash: nextCash,
        rev: nextRev,
        sid: sid || walletSnap.data()?.sid || 'fn',
        t: FieldValue.serverTimestamp(),
      });

      tx.update(playerRef, {
        cash: nextCash,
        gdp: nextMetrics.realGdp,
        rank: targetRank,
        lastSeen: FieldValue.serverTimestamp(),
      });

      tx.update(saveRef, {
        'save.cash': nextCash,
        'save.rank': targetRank,
      });

      return {
        rank: targetRank,
        rankName: rule.name,
        nextCash,
        walletRev: nextRev,
        gdp: nextMetrics.realGdp,
      };
    });

    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'RANK_PROMOTION_FAILED';
    const status = msg === 'PLAYER_NOT_READY' ? 409 : 400;
    res.status(status).json({ ok: false, error: msg });
  }
});
