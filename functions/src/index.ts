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
  11: { id: 11, name: 'Continental Powerhouse', cost: 9_000_000_000, minGdp: 16_000_000_000, minBuildings: 185, minHap: 70, minTech: 6 },
  12: { id: 12, name: 'Global Magnate', cost: 22_000_000_000, minGdp: 36_000_000_000, minBuildings: 225, minHap: 72, minTech: 6 },
  13: { id: 13, name: 'Sovereign Architect', cost: 55_000_000_000, minGdp: 80_000_000_000, minBuildings: 270, minHap: 74, minTech: 6 },
  14: { id: 14, name: 'World Superpower', cost: 120_000_000_000, minGdp: 175_000_000_000, minBuildings: 320, minHap: 76, minTech: 6 },
  15: { id: 15, name: 'Eternal Chancellor', cost: 280_000_000_000, minGdp: 360_000_000_000, minBuildings: 380, minHap: 78, minTech: 6 },
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
  small_housing: { cost: 220, inc: 0.7, jobs: 4 },
  apartments: { cost: 2_600, inc: 6.4, jobs: 14 },
  residential_towers: { cost: 24_000, inc: 54, jobs: 32 },
  luxury_residences: { cost: 165_000, inc: 375, jobs: 65 },
  smart_housing: { cost: 620_000, inc: 1_320, jobs: 95 },
  corporate_tower: { cost: 420_000, inc: 1_120, jobs: 240 },
  trade_center: { cost: 1_250_000, inc: 3_150, jobs: 360 },
  financial_center: { cost: 3_400_000, inc: 8_200, jobs: 420 },
  intl_hotel: { cost: 92_000, inc: 248, jobs: 115 },
  small_factory: { cost: 520, inc: 2.1, jobs: 22 },
  mfg_plant: { cost: 14_500, inc: 48, jobs: 88 },
  auto_factory: { cost: 185_000, inc: 540, jobs: 220 },
  electronics_factory: { cost: 540_000, inc: 1_520, jobs: 210 },
  heavy_industry: { cost: 1_950_000, inc: 5_100, jobs: 340 },
  water_plant: { cost: 7_800, inc: 19, jobs: 26 },
  highway_network: { cost: 46_000, inc: 128, jobs: 84 },
  logistics_center: { cost: 310_000, inc: 860, jobs: 195 },
  telecom_center: { cost: 880_000, inc: 2_380, jobs: 140 },
  schools: { cost: 900, inc: 2.2, jobs: 20 },
  adv_medical: { cost: 480_000, inc: 1_050, jobs: 240 },
  central_lab: { cost: 1_550_000, inc: 3_950, jobs: 175 },
  police_hq: { cost: 11_000, inc: 22, jobs: 64 },
  fire_dept: { cost: 8_500, inc: 17, jobs: 52 },
  govt_admin: { cost: 65_000, inc: 145, jobs: 120 },
  transit_hub: { cost: 34_000, inc: 88, jobs: 90 },
  national_stadium: { cost: 290_000, inc: 760, jobs: 180 },
  national_bank: { cost: 2_600_000, inc: 6_800, jobs: 260 },
  convention_center: { cost: 4_800_000, inc: 11_800, jobs: 340 },
  space_center: { cost: 9_500_000, inc: 23_500, jobs: 420 },
};

const SERVER_COSMETICS: Record<string, { diamonds: number; coins: number; reqRank: number }> = {
  frame_gold_crest: { diamonds: 8, coins: 0, reqRank: 1 },
  frame_neon: { diamonds: 12, coins: 0, reqRank: 1 },
  frame_fire: { diamonds: 18, coins: 0, reqRank: 1 },
  frame_lightning: { diamonds: 20, coins: 0, reqRank: 2 },
  frame_aurora: { diamonds: 22, coins: 0, reqRank: 1 },
  frame_cyber_hex: { diamonds: 26, coins: 0, reqRank: 2 },
  frame_royal_gold: { diamonds: 34, coins: 120_000, reqRank: 4 },
  frame_galaxy: { diamonds: 40, coins: 250_000, reqRank: 5 },
  frame_diamond_crystal: { diamonds: 46, coins: 300_000, reqRank: 4 },
  frame_emperor_crown: { diamonds: 55, coins: 600_000, reqRank: 6 },
  nfx_gold: { diamonds: 10, coins: 0, reqRank: 1 },
  nfx_fire_text: { diamonds: 15, coins: 0, reqRank: 1 },
  nfx_neon: { diamonds: 18, coins: 0, reqRank: 1 },
  nfx_electric: { diamonds: 22, coins: 0, reqRank: 2 },
  nfx_shadow: { diamonds: 24, coins: 0, reqRank: 3 },
  nfx_rainbow: { diamonds: 28, coins: 0, reqRank: 1 },
  nfx_royal_gold: { diamonds: 36, coins: 180_000, reqRank: 4 },
  nfx_diamond: { diamonds: 42, coins: 280_000, reqRank: 5 },
  theme_midnight_galaxy: { diamonds: 0, coins: 0, reqRank: 1 },
  theme_ocean_blue: { diamonds: 12, coins: 0, reqRank: 1 },
  theme_sunset_paradise: { diamonds: 14, coins: 0, reqRank: 1 },
  theme_cyber_neon: { diamonds: 16, coins: 0, reqRank: 1 },
  theme_crimson_empire: { diamonds: 18, coins: 0, reqRank: 1 },
  theme_emerald_kingdom: { diamonds: 20, coins: 0, reqRank: 1 },
  theme_aurora_nights: { diamonds: 24, coins: 0, reqRank: 1 },
  theme_dark_luxury: { diamonds: 28, coins: 150_000, reqRank: 3 },
  theme_royal_gold: { diamonds: 32, coins: 250_000, reqRank: 4 },
  theme_diamond_crystal: { diamonds: 38, coins: 350_000, reqRank: 5 },
  anim_soft_glow: { diamonds: 55, coins: 0, reqRank: 1 },
  anim_ripple_veil: { diamonds: 85, coins: 0, reqRank: 1 },
  anim_backdrop: { diamonds: 115, coins: 0, reqRank: 1 },
  anim_pulse_grid: { diamonds: 140, coins: 0, reqRank: 1 },
  anim_borders: { diamonds: 175, coins: 0, reqRank: 2 },
  anim_sparkles: { diamonds: 235, coins: 0, reqRank: 2 },
  anim_aurora_curtain: { diamonds: 285, coins: 0, reqRank: 3 },
  anim_celebration: { diamonds: 355, coins: 0, reqRank: 4 },
  anim_celestial_orbit: { diamonds: 465, coins: 0, reqRank: 5 },
  anim_sovereign_nova: { diamonds: 585, coins: 0, reqRank: 6 },
  badge_diamond_member: { diamonds: 15, coins: 0, reqRank: 1 },
  badge_royal_member: { diamonds: 24, coins: 0, reqRank: 1 },
  badge_legendary_builder: { diamonds: 26, coins: 0, reqRank: 3 },
  badge_elite_governor: { diamonds: 34, coins: 0, reqRank: 4 },
  badge_galaxy_explorer: { diamonds: 38, coins: 0, reqRank: 1 },
  badge_premium_founder: { diamonds: 58, coins: 800_000, reqRank: 6 },
  asset_aurora_obelisk: { diamonds: 26, coins: 120_000, reqRank: 1 },
  asset_royal_fleet: { diamonds: 32, coins: 220_000, reqRank: 1 },
  asset_diamond_spire: { diamonds: 45, coins: 500_000, reqRank: 3 },
  asset_crystal_vault: { diamonds: 56, coins: 1_200_000, reqRank: 5 },
};

const SERVER_REWARD_CAPS = {
  dailySlotDiamonds: [1, 2, 2, 3, 6] as const,
  dailySlotCoins: [1_500, 4_500, 12_000, 30_000, 75_000] as const,
  weeklyDiamonds: {
    wk_policy_3: 2,
    wk_fuse_3: 3,
    wk_housing_80: 3,
    wk_hap_80: 4,
    wk_build_60: 5,
    wk_tech_4: 6,
  } as Record<string, number>,
  achievements: {
    ach_city_15: { gems: 1, cash: 15_000 },
    ach_cash_1m: { gems: 2, cash: 50_000 },
    ach_civic_hap: { gems: 2, cash: 150_000 },
    ach_city_75: { gems: 3, cash: 250_000 },
    ach_rank_5: { gems: 3, cash: 500_000 },
    ach_streak_14: { gems: 4, cash: 500_000 },
    ach_civic_tech: { gems: 4, cash: 1_500_000 },
    ach_stk_25: { gems: 5, cash: 1_000_000 },
    ach_cash_100m: { gems: 5, cash: 5_000_000 },
    ach_city_200: { gems: 6, cash: 2_500_000 },
    ach_city_350: { gems: 8, cash: 25_000_000 },
    ach_rank_15: { gems: 10, cash: 50_000_000 },
  } as Record<string, { gems: number; cash: number }>,
  milestones: {
    m_first_bldg: 1,
    m_cash_1m: 2,
    m_builders_25: 3,
    m_infra_5: 3,
    m_stk_10: 4,
    m_tech_3: 4,
    m_rank_4: 5,
    m_gdp_100m: 6,
    m_rank_10: 8,
    m_rank_15: 10,
  } as Record<string, number>,
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

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://pakora-tab.web.app',
  'https://pakora-tab.firebaseapp.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
]);

function getAllowedOrigins(): Set<string> {
  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (extra.length === 0) return DEFAULT_ALLOWED_ORIGINS;
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
}

function setCors(
  req: { headers: { origin?: string } },
  res: { setHeader: (k: string, v: string) => void },
): boolean {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
  const allowed = getAllowedOrigins();
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (!origin) return true;
  if (allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    return true;
  }
  return false;
}

function serverDayKey(nowMs = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs));
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

  const safeFlow = Math.max(0, baseFlow);
  const pop = Math.max(1, Math.min(100_000, Number(saveData.pop) || 48));
  const hap = Math.max(0, Math.min(100, Number(saveData.hap) || 0));
  const humanCapital = pop * 220 + jobsCreated * 45 + doctrines * 150_000;
  const treasuryComponent = Math.min(1e12, Math.max(0, walletCash) * 0.35);
  const realGdp = Math.max(
    1000,
    Math.min(1e13, Math.floor(capitalEquity + safeFlow * 180 + humanCapital + treasuryComponent)),
  );

  return { buildingsTotal, doctrines, hap, realGdp };
}

/**
 * Server-authoritative National Rank Promotion endpoint (Ranks 2..15).
 */
export const verifyNationalRankPromotion = onRequest(async (req, res) => {
  const corsAllowed = setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(corsAllowed ? 204 : 403).send('');
    return;
  }
  if (!corsAllowed) {
    res.status(403).json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' });
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
      const currentRank = Math.max(1, Math.min(15, Math.floor(Number(saveData.rank) || 1)));
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
        'save.t': Date.now(),
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

/**
 * Server-authoritative Diamond Exclusives cosmetic purchase endpoint.
 */
export const verifyCosmeticPurchase = onRequest(async (req, res) => {
  const corsAllowed = setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(corsAllowed ? 204 : 403).send('');
    return;
  }
  if (!corsAllowed) {
    res.status(403).json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' });
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

  const body = (req.body || {}) as { itemId?: unknown; sid?: unknown };
  const itemId = String(body.itemId ?? '').trim();
  const sid = String(body.sid ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const spec = SERVER_COSMETICS[itemId];
  if (!spec || spec.diamonds <= 0) {
    res.status(400).json({ ok: false, error: 'UNKNOWN_COSMETIC_ITEM' });
    return;
  }

  try {
    const out = await adminDb.runTransaction(async (tx) => {
      const saveRef = adminDb.doc(`saves/${uid}`);
      const walletRef = adminDb.doc(`players/${uid}/private/wallet`);
      const playerRef = adminDb.doc(`players/${uid}`);
      const receiptRef = adminDb.doc(`players/${uid}/cosmeticReceipts/${itemId}`);

      const [saveSnap, walletSnap, playerSnap, receiptSnap] = await Promise.all([
        tx.get(saveRef),
        tx.get(walletRef),
        tx.get(playerRef),
        tx.get(receiptRef),
      ]);

      if (!saveSnap.exists || !walletSnap.exists || !playerSnap.exists) {
        throw new Error('PLAYER_NOT_READY');
      }
      if (receiptSnap.exists) {
        throw new Error('ALREADY_OWNED');
      }

      const saveData = (saveSnap.data()?.save || {}) as Record<string, unknown>;
      const curRank = Math.max(1, Math.min(15, Math.floor(Number(saveData.rank) || 1)));
      if (curRank < spec.reqRank) throw new Error('RANK_LOCKED');

      const wCash = Math.max(0, Math.floor(Number(walletSnap.data()?.cash || 0)));
      const wGems = Math.max(0, Math.floor(Number(walletSnap.data()?.gems || 0)));
      if (wGems < spec.diamonds) throw new Error('INSUFFICIENT_DIAMONDS');
      if (spec.coins > 0 && wCash < spec.coins) throw new Error('INSUFFICIENT_COINS');

      const nextGems = wGems - spec.diamonds;
      const nextCash = wCash - spec.coins;
      const prevRev = Math.max(1, Math.floor(Number(walletSnap.data()?.rev || 1)));
      const nextRev = Math.min(1e9, prevRev + 1);

      tx.set(receiptRef, {
        itemId,
        diamondsPaid: spec.diamonds,
        coinsPaid: spec.coins,
        purchasedAt: FieldValue.serverTimestamp(),
      });
      tx.update(walletRef, {
        cash: nextCash,
        gems: nextGems,
        rev: nextRev,
        sid: sid || walletSnap.data()?.sid || 'fn',
        t: FieldValue.serverTimestamp(),
      });
      tx.update(playerRef, {
        cash: nextCash,
        gems: nextGems,
        lastSeen: FieldValue.serverTimestamp(),
      });
      tx.update(saveRef, {
        'save.cash': nextCash,
        'save.gems': nextGems,
        'save.t': Date.now(),
      });

      return { itemId, nextCash, nextGems, walletRev: nextRev };
    });

    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'COSMETIC_PURCHASE_FAILED';
    const status = msg === 'PLAYER_NOT_READY' ? 409 : 400;
    res.status(status).json({ ok: false, error: msg });
  }
});

/**
 * Server-authoritative reward claim ledger to block duplicate farming/claims.
 */
export const verifyRewardClaim = onRequest(async (req, res) => {
  const corsAllowed = setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(corsAllowed ? 204 : 403).send('');
    return;
  }
  if (!corsAllowed) {
    res.status(403).json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' });
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

  const body = (req.body || {}) as { kind?: unknown; rewardId?: unknown; periodKey?: unknown; sid?: unknown };
  const kind = String(body.kind ?? '').trim();
  const rewardId = String(body.rewardId ?? '').trim().slice(0, 64);
  const sid = String(body.sid ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const todayKey = serverDayKey(Date.now());

  if (!['daily_slot', 'weekly_mission', 'achievement', 'milestone'].includes(kind)) {
    res.status(400).json({ ok: false, error: 'INVALID_REWARD_KIND' });
    return;
  }

  try {
    const out = await adminDb.runTransaction(async (tx) => {
      const saveRef = adminDb.doc(`saves/${uid}`);
      const walletRef = adminDb.doc(`players/${uid}/private/wallet`);
      const playerRef = adminDb.doc(`players/${uid}`);
      const ledgerId = kind === 'daily_slot'
        ? `daily_${todayKey}`
        : kind === 'weekly_mission'
          ? `weekly_${String(body.periodKey || todayKey).replace(/[^a-zA-Z0-9_-]/g, '')}_${rewardId}`
          : `${kind}_${rewardId}`;
      const ledgerRef = adminDb.doc(`players/${uid}/rewardClaims/${ledgerId}`);

      const [saveSnap, walletSnap, playerSnap, ledgerSnap] = await Promise.all([
        tx.get(saveRef),
        tx.get(walletRef),
        tx.get(playerRef),
        tx.get(ledgerRef),
      ]);

      if (!saveSnap.exists || !walletSnap.exists || !playerSnap.exists) {
        throw new Error('PLAYER_NOT_READY');
      }
      if (ledgerSnap.exists) {
        throw new Error('ALREADY_CLAIMED');
      }

      const saveData = (saveSnap.data()?.save || {}) as Record<string, unknown>;
      let addGems = 0;
      let addCash = 0;

      if (kind === 'daily_slot') {
        const slotIdx = Math.max(0, Math.min(4, Math.floor(Number(rewardId) || 1) - 1));
        addGems = SERVER_REWARD_CAPS.dailySlotDiamonds[slotIdx];
        addCash = SERVER_REWARD_CAPS.dailySlotCoins[slotIdx];
      } else if (kind === 'weekly_mission') {
        const g = SERVER_REWARD_CAPS.weeklyDiamonds[rewardId];
        if (!g) throw new Error('UNKNOWN_WEEKLY_MISSION');
        addGems = g;
      } else if (kind === 'achievement') {
        const ach = SERVER_REWARD_CAPS.achievements[rewardId];
        if (!ach) throw new Error('UNKNOWN_ACHIEVEMENT');
        addGems = ach.gems;
        addCash = ach.cash;
      } else if (kind === 'milestone') {
        const g = SERVER_REWARD_CAPS.milestones[rewardId];
        if (!g) throw new Error('UNKNOWN_MILESTONE');
        addGems = g;
      }

      const wCash = Math.max(0, Math.floor(Number(walletSnap.data()?.cash || 0)));
      const wGems = Math.max(0, Math.floor(Number(walletSnap.data()?.gems || 0)));
      const nextCash = Math.min(1e13, wCash + addCash);
      const nextGems = Math.min(1e9, wGems + addGems);
      const prevRev = Math.max(1, Math.floor(Number(walletSnap.data()?.rev || 1)));
      const nextRev = Math.min(1e9, prevRev + 1);
      const nextMetrics = computeServerNationalMetrics(saveData, nextCash);

      tx.set(ledgerRef, {
        kind,
        rewardId,
        gemsAdded: addGems,
        cashAdded: addCash,
        claimedAt: FieldValue.serverTimestamp(),
      });
      tx.update(walletRef, {
        cash: nextCash,
        gems: nextGems,
        rev: nextRev,
        sid: sid || walletSnap.data()?.sid || 'fn',
        t: FieldValue.serverTimestamp(),
      });
      tx.update(playerRef, {
        cash: nextCash,
        gems: nextGems,
        gdp: nextMetrics.realGdp,
        lastSeen: FieldValue.serverTimestamp(),
      });

      return { kind, rewardId, gemsAdded: addGems, cashAdded: addCash, nextCash, nextGems, walletRev: nextRev };
    });

    res.status(200).json({ ok: true, ...out });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'REWARD_CLAIM_FAILED';
    const status = msg === 'PLAYER_NOT_READY' ? 409 : 400;
    res.status(status).json({ ok: false, error: msg });
  }
});
