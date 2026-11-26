import {
  MAX_PROVINCES,
  PROVINCE_BUDGET_CATEGORIES,
  PROVINCE_COLORS,
  PROVINCE_DISCOUNT_EPOCH_MS,
  PROVINCE_EXPENSE_AREAS,
  PROVINCE_FLAGS,
  PROVINCE_UNLOCK_PRICES,
  PROVINCE_WEEKLY_SCHEDULE,
  PROVINCE_WEEK_MS,
} from './constants';
import type {
  GameState,
  Province,
  ProvinceBudgetCategory,
  ProvinceBudgetLogEntry,
  ProvinceBudgetMap,
  ProvinceCustomizationInput,
  ProvinceLeaderboardCategory,
  ProvinceLeaderboardEntry,
  ProvinceLevels,
  ProvinceMaintenanceBreakdown,
  ProvinceUnlockQuote,
  WeeklyProvinceDiscount,
} from './types';

const VALID_FLAG_IDS = new Set(PROVINCE_FLAGS.map((f) => f.id));
const VALID_COLORS = new Set(PROVINCE_COLORS.map((c) => c.hex.toLowerCase()));
const BUDGET_CAT_SET = new Set<string>(PROVINCE_BUDGET_CATEGORIES.map((c) => c.id));

const DEFAULT_NAMES = [
  'Capital Province',
  'Northern Heartland',
  'Coastal Crescent',
  'Emerald Valley',
  'Industrial Belt',
  'Highland March',
  'Golden Basin',
  'Silver Harbor',
  'Sunrise Plains',
  'Sovereign Reach',
];

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n)) + 0;
}

export function stripDangerousChars(raw: unknown): string {
  return String(raw ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeProvinceName(raw: unknown): string {
  const stripped = stripDangerousChars(raw)
    .replace(/[^A-Za-z0-9 '&\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, 24).trim();
}

export function sanitizeProvinceDesc(raw: unknown): string {
  return stripDangerousChars(raw).slice(0, 120);
}

export function isValidFlagId(flagId: unknown): flagId is string {
  return typeof flagId === 'string' && VALID_FLAG_IDS.has(flagId);
}

export function isValidProvinceColor(color: unknown): color is string {
  return typeof color === 'string' && VALID_COLORS.has(color.trim().toLowerCase());
}

export function normalizeProvinceColor(color: unknown, slot = 1): string {
  if (typeof color === 'string') {
    const low = color.trim().toLowerCase();
    const matched = PROVINCE_COLORS.find((c) => c.hex.toLowerCase() === low);
    if (matched) return matched.hex;
  }
  return PROVINCE_COLORS[(Math.max(1, slot) - 1) % PROVINCE_COLORS.length].hex;
}

export function normalizeFlagId(flagId: unknown, slot = 1): string {
  if (typeof flagId === 'string' && VALID_FLAG_IDS.has(flagId)) return flagId;
  return PROVINCE_FLAGS[(Math.max(1, slot) - 1) % PROVINCE_FLAGS.length].id;
}

export function emptyProvinceBudget(): ProvinceBudgetMap {
  return {
    infrastructure: 0,
    education: 0,
    healthcare: 0,
    security: 0,
    welfare: 0,
    industry: 0,
  };
}

export function defaultProvinceLevels(): ProvinceLevels {
  return {
    infrastructure: 15,
    education: 15,
    healthcare: 15,
    security: 15,
    welfare: 15,
    businessActivity: 15,
  };
}

export function totalProvinceBudget(p: Pick<Province, 'budget'>): number {
  const b = p.budget || emptyProvinceBudget();
  return (
    (b.infrastructure || 0) +
    (b.education || 0) +
    (b.healthcare || 0) +
    (b.security || 0) +
    (b.welfare || 0) +
    (b.industry || 0)
  );
}

export function totalAllProvinceBudgets(provinces: Province[] | undefined): number {
  if (!Array.isArray(provinces)) return 0;
  return provinces.reduce((acc, p) => acc + totalProvinceBudget(p), 0);
}

export function createProvinceForSlot(
  slot: number,
  input?: Partial<ProvinceCustomizationInput> & { countryName?: string },
  paidPrice = 0,
  nowMs = Date.now(),
): Province {
  const safeSlot = Math.max(1, Math.min(MAX_PROVINCES, Math.floor(slot)));
  const fallbackName =
    safeSlot === 1 && input?.countryName
      ? `${sanitizeProvinceName(input.countryName) || 'Capital'} Core`.slice(0, 24).trim()
      : DEFAULT_NAMES[safeSlot - 1] || `Province ${safeSlot}`;
  const cleanName = sanitizeProvinceName(input?.name) || fallbackName;
  const cleanDesc =
    sanitizeProvinceDesc(input?.desc) ||
    (safeSlot === 1
      ? 'Founding capital province anchoring national governance and trade.'
      : `Chartered region #${safeSlot} expanding national industry and civic reach.`);

  const basePop = Number((6 + (safeSlot - 1) * 2.5).toFixed(2));
  const baseGdp = safeSlot === 1 ? 12_000 : Math.round(50_000 * safeSlot);
  return {
    id: `prov_${safeSlot}`,
    slot: safeSlot,
    name: cleanName,
    desc: cleanDesc,
    flagId: normalizeFlagId(input?.flagId, safeSlot),
    color: normalizeProvinceColor(input?.color, safeSlot),
    unlockedAt: Math.max(0, Math.floor(nowMs)),
    paidPrice: Math.max(0, Math.floor(paidPrice)),
    gdp: baseGdp,
    pop: basePop,
    hap: 62,
    dev: 1,
    emp: 68,
    prod: 50,
    budget: emptyProvinceBudget(),
    allocTotal: 0,
    lvls: defaultProvinceLevels(),
    lastMaint: 0,
    fundingRatio: 100,
  };
}

export function createStarterProvince(countryName?: string, nowMs = Date.now()): Province {
  return createProvinceForSlot(1, { countryName }, 0, nowMs);
}

export function validateProvinceCustomization(
  input: Partial<ProvinceCustomizationInput>,
  existingProvinces: Province[],
  editingProvinceId?: string,
): { ok: true; value: ProvinceCustomizationInput } | { ok: false; reason: string } {
  const name = sanitizeProvinceName(input.name);
  if (name.length < 2) {
    return { ok: false, reason: 'Province name must be 2-24 valid characters (letters, numbers, spaces, - or &).' };
  }
  const lower = name.toLowerCase();
  const duplicate = existingProvinces.some(
    (p) => p.id !== editingProvinceId && p.name.trim().toLowerCase() === lower,
  );
  if (duplicate) {
    return { ok: false, reason: 'You already own a Province with that name.' };
  }
  if (!isValidFlagId(input.flagId)) {
    return { ok: false, reason: 'Please select a valid built-in Province flag.' };
  }
  if (!isValidProvinceColor(input.color)) {
    return { ok: false, reason: 'Please select a valid Province color swatch.' };
  }
  const desc = sanitizeProvinceDesc(input.desc);
  return {
    ok: true,
    value: {
      name,
      desc,
      flagId: input.flagId,
      color: normalizeProvinceColor(input.color),
    },
  };
}

export function normalizeProvinces(
  raw: unknown,
  countryName?: string,
  nowMs = Date.now(),
): Province[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [createStarterProvince(countryName, nowMs)];
  }
  const bySlot = new Map<number, Province>();
  const usedNames = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const rawSlot = Math.floor(Number(obj.slot));
    const slot = Number.isFinite(rawSlot) && rawSlot >= 1 && rawSlot <= MAX_PROVINCES ? rawSlot : bySlot.size + 1;
    if (slot > MAX_PROVINCES || bySlot.has(slot)) continue;

    let name = sanitizeProvinceName(obj.name);
    if (name.length < 2) {
      name = DEFAULT_NAMES[slot - 1] || `Province ${slot}`;
    }
    if (usedNames.has(name.toLowerCase())) {
      name = `${name.slice(0, 20)} ${slot}`.trim();
    }
    usedNames.add(name.toLowerCase());

    const rawBudget = (obj.budget && typeof obj.budget === 'object' ? obj.budget : {}) as Record<string, unknown>;
    const budget: ProvinceBudgetMap = {
      infrastructure: clampNum(rawBudget.infrastructure, 0, 1e12, 0),
      education: clampNum(rawBudget.education, 0, 1e12, 0),
      healthcare: clampNum(rawBudget.healthcare, 0, 1e12, 0),
      security: clampNum(rawBudget.security, 0, 1e12, 0),
      welfare: clampNum(rawBudget.welfare, 0, 1e12, 0),
      industry: clampNum(rawBudget.industry, 0, 1e12, 0),
    };

    const rawLvls = (obj.lvls && typeof obj.lvls === 'object' ? obj.lvls : {}) as Record<string, unknown>;
    const lvls: ProvinceLevels = {
      infrastructure: clampNum(rawLvls.infrastructure, 5, 100, 15),
      education: clampNum(rawLvls.education, 5, 100, 15),
      healthcare: clampNum(rawLvls.healthcare, 5, 100, 15),
      security: clampNum(rawLvls.security, 5, 100, 15),
      welfare: clampNum(rawLvls.welfare, 5, 100, 15),
      businessActivity: clampNum(rawLvls.businessActivity, 5, 100, 15),
    };

    const prov: Province = {
      id: `prov_${slot}`,
      slot,
      name,
      desc: sanitizeProvinceDesc(obj.desc),
      flagId: normalizeFlagId(obj.flagId, slot),
      color: normalizeProvinceColor(obj.color, slot),
      unlockedAt: clampNum(obj.unlockedAt, 0, 1e13, Math.floor(nowMs)),
      paidPrice: slot === 1 ? 0 : clampNum(obj.paidPrice, 0, 1e13, PROVINCE_UNLOCK_PRICES[slot - 1] || 0),
      gdp: clampNum(obj.gdp, 1000, 1e13, slot === 1 ? 12_000 : 50_000 * slot),
      pop: clampNum(obj.pop, 0.5, 10_000, 6 + (slot - 1) * 2.5),
      hap: clampNum(obj.hap, 5, 100, 62),
      dev: clampNum(obj.dev, 1, 100, 1),
      emp: clampNum(obj.emp, 35, 99, 68),
      prod: clampNum(obj.prod, 10, 100, 50),
      budget,
      allocTotal: clampNum(obj.allocTotal, 0, 1e13, 0),
      lvls,
      lastMaint: clampNum(obj.lastMaint, 0, 1e11, 0),
      fundingRatio: clampNum(obj.fundingRatio, 0, 100, 100),
    };
    bySlot.set(slot, prov);
  }

  if (!bySlot.has(1)) {
    bySlot.set(1, createStarterProvince(countryName, nowMs));
  }

  return Array.from(bySlot.values())
    .sort((a, b) => a.slot - b.slot)
    .slice(0, MAX_PROVINCES);
}

export function cleanProvBudgetLog(raw: unknown): ProvinceBudgetLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: ProvinceBudgetLogEntry[] = [];
  for (const item of raw.slice(-20)) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const kind = r.kind === 'alloc' || r.kind === 'rebal' || r.kind === 'unlock' ? r.kind : 'alloc';
    out.push({
      t: clampNum(r.t, 0, 1e13, 0),
      provId: String(r.provId || 'prov_1').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'prov_1',
      provName: sanitizeProvinceName(r.provName) || 'Province',
      cat: String(r.cat || 'infrastructure').replace(/[^a-zA-Z0-9_>-]/g, '').slice(0, 32) || 'infrastructure',
      amt: clampNum(r.amt, 0, 1e13, 0),
      kind,
    });
  }
  return out;
}

export function cleanProvTxs(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== 'string') continue;
    const clean = x.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out.slice(-30);
}

export function getWeeklyProvinceDiscountForIndex(weekIndex: number): WeeklyProvinceDiscount {
  const safeIndex = Math.max(0, Math.floor(Number.isFinite(weekIndex) ? weekIndex : 0));
  const sched = PROVINCE_WEEKLY_SCHEDULE[safeIndex % PROVINCE_WEEKLY_SCHEDULE.length];
  const basePrice = PROVINCE_UNLOCK_PRICES[sched.targetSlot - 1];
  const discountedPrice = Math.max(0, Math.floor((basePrice * (100 - sched.discountPct)) / 100));
  const startsAtMs = PROVINCE_DISCOUNT_EPOCH_MS + safeIndex * PROVINCE_WEEK_MS;
  const endsAtMs = startsAtMs + PROVINCE_WEEK_MS;
  return {
    weekIndex: safeIndex,
    cycleWeek: sched.cycleWeek,
    targetSlot: sched.targetSlot,
    discountPct: sched.discountPct,
    basePrice,
    discountedPrice,
    startsAtMs,
    endsAtMs,
    msLeft: 0,
  };
}

export function getWeeklyProvinceDiscount(nowMs = Date.now()): WeeklyProvinceDiscount {
  const safeNow = Number.isFinite(nowMs) ? nowMs : PROVINCE_DISCOUNT_EPOCH_MS;
  const weekIndex = Math.max(0, Math.floor((safeNow - PROVINCE_DISCOUNT_EPOCH_MS) / PROVINCE_WEEK_MS));
  const offer = getWeeklyProvinceDiscountForIndex(weekIndex);
  return {
    ...offer,
    msLeft: Math.max(0, offer.endsAtMs - safeNow),
  };
}

export function getUpcomingWeeklyDiscount(nowMs = Date.now()): WeeklyProvinceDiscount {
  const current = getWeeklyProvinceDiscount(nowMs);
  const next = getWeeklyProvinceDiscountForIndex(current.weekIndex + 1);
  return {
    ...next,
    msLeft: Math.max(0, next.startsAtMs - (Number.isFinite(nowMs) ? nowMs : current.startsAtMs)),
  };
}

export function getProvinceUnlockQuote(s: GameState, nowMs = Date.now()): ProvinceUnlockQuote {
  const provinces = Array.isArray(s.provinces) && s.provinces.length > 0 ? s.provinces : [createStarterProvince(s.country?.[1], nowMs)];
  const ownedCount = Math.min(MAX_PROVINCES, provinces.length);
  const activeOffer = getWeeklyProvinceDiscount(nowMs);
  const upcomingOffer = getUpcomingWeeklyDiscount(nowMs);

  if (ownedCount >= MAX_PROVINCES) {
    return {
      maxReached: true,
      ownedCount,
      maxProvinces: MAX_PROVINCES,
      nextSlot: MAX_PROVINCES,
      basePrice: 0,
      discountPct: 0,
      discountApplied: false,
      finalPrice: 0,
      canAfford: false,
      remainingCash: Math.max(0, Number.isFinite(s.cash) ? s.cash : 0),
      activeOffer,
      upcomingOffer,
    };
  }

  const nextSlot = ownedCount + 1;
  const basePrice = PROVINCE_UNLOCK_PRICES[nextSlot - 1] ?? 0;
  // Strictly apply discount only if nextSlot matches active weekly target AND slot isn't already owned
  const slotAlreadyOwned = provinces.some((p) => p.slot === nextSlot);
  const discountApplied = !slotAlreadyOwned && activeOffer.targetSlot === nextSlot && activeOffer.discountPct > 0;
  const discountPct = discountApplied ? activeOffer.discountPct : 0;
  const finalPrice = discountApplied
    ? Math.max(0, Math.floor((basePrice * (100 - discountPct)) / 100))
    : basePrice;
  const cash = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  const canAfford = cash >= finalPrice;

  return {
    maxReached: false,
    ownedCount,
    maxProvinces: MAX_PROVINCES,
    nextSlot,
    basePrice,
    discountPct,
    discountApplied,
    finalPrice,
    canAfford,
    remainingCash: Math.max(0, cash - finalPrice),
    activeOffer,
    upcomingOffer,
  };
}

export function makeProvinceTxId(prefix: string, slotOrKey: string | number, nowMs = Date.now()): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${slotOrKey}_${Math.floor(nowMs)}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

export function applyUnlockProvince(
  s: GameState,
  input: Partial<ProvinceCustomizationInput>,
  nowMs = Date.now(),
  providedTxId?: string,
): {
  ok: boolean;
  state: GameState;
  unlocked?: Province;
  paidPrice: number;
  basePrice: number;
  discountPct: number;
  txId: string;
  reason?: string;
} {
  const existingProvinces =
    Array.isArray(s.provinces) && s.provinces.length > 0
      ? s.provinces
      : [createStarterProvince(s.country?.[1], nowMs)];

  const quote = getProvinceUnlockQuote({ ...s, provinces: existingProvinces }, nowMs);
  if (quote.maxReached || existingProvinces.length >= MAX_PROVINCES) {
    return {
      ok: false,
      state: s,
      paidPrice: 0,
      basePrice: 0,
      discountPct: 0,
      txId: '',
      reason: 'Maximum limit of 10 Provinces reached.',
    };
  }

  const txId = (providedTxId || makeProvinceTxId('unlock', quote.nextSlot, nowMs))
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);

  const existingTxs = Array.isArray(s.provTxs) ? s.provTxs : [];
  if (txId && existingTxs.includes(txId)) {
    return {
      ok: false,
      state: s,
      paidPrice: 0,
      basePrice: quote.basePrice,
      discountPct: quote.discountPct,
      txId,
      reason: 'Duplicate unlock transaction blocked.',
    };
  }

  if (existingProvinces.some((p) => p.slot === quote.nextSlot)) {
    return {
      ok: false,
      state: s,
      paidPrice: 0,
      basePrice: quote.basePrice,
      discountPct: quote.discountPct,
      txId,
      reason: `Province #${quote.nextSlot} is already unlocked.`,
    };
  }

  if (!Number.isFinite(s.cash) || s.cash < quote.finalPrice || quote.finalPrice < 0) {
    return {
      ok: false,
      state: s,
      paidPrice: 0,
      basePrice: quote.basePrice,
      discountPct: quote.discountPct,
      txId,
      reason: 'Not enough cash to charter this Province.',
    };
  }

  const valid = validateProvinceCustomization(input, existingProvinces);
  if (!valid.ok) {
    return {
      ok: false,
      state: s,
      paidPrice: 0,
      basePrice: quote.basePrice,
      discountPct: quote.discountPct,
      txId,
      reason: valid.reason,
    };
  }

  const created = createProvinceForSlot(quote.nextSlot, valid.value, quote.finalPrice, nowMs);
  const nextCash = Math.max(0, s.cash - quote.finalPrice);
  const logEntry: ProvinceBudgetLogEntry = {
    t: Math.floor(nowMs),
    provId: created.id,
    provName: created.name,
    cat: 'charter',
    amt: quote.finalPrice,
    kind: 'unlock',
  };

  return {
    ok: true,
    unlocked: created,
    paidPrice: quote.finalPrice,
    basePrice: quote.basePrice,
    discountPct: quote.discountPct,
    txId,
    state: {
      ...s,
      cash: nextCash,
      provinces: [...existingProvinces, created],
      provBudgetLog: [...(s.provBudgetLog || []), logEntry].slice(-20),
      provTxs: [...existingTxs, txId].slice(-30),
    },
  };
}

export function applyCustomizeProvince(
  s: GameState,
  provinceId: string,
  input: Partial<ProvinceCustomizationInput>,
): { ok: boolean; state: GameState; province?: Province; reason?: string } {
  const provinces = Array.isArray(s.provinces) ? s.provinces : [];
  const target = provinces.find((p) => p.id === provinceId);
  if (!target) {
    return { ok: false, state: s, reason: 'Province not found.' };
  }
  const valid = validateProvinceCustomization(input, provinces, provinceId);
  if (!valid.ok) {
    return { ok: false, state: s, reason: valid.reason };
  }
  const updated: Province = {
    ...target,
    name: valid.value.name,
    desc: valid.value.desc || '',
    flagId: valid.value.flagId,
    color: valid.value.color,
  };
  return {
    ok: true,
    province: updated,
    state: {
      ...s,
      provinces: provinces.map((p) => (p.id === provinceId ? updated : p)),
    },
  };
}

export function applyAllocateProvinceBudget(
  s: GameState,
  provinceId: string,
  category: ProvinceBudgetCategory,
  rawAmount: number,
  nowMs = Date.now(),
  providedTxId?: string,
): { ok: boolean; state: GameState; amount: number; txId: string; reason?: string } {
  if (!BUDGET_CAT_SET.has(category)) {
    return { ok: false, state: s, amount: 0, txId: '', reason: 'Invalid budget category.' };
  }
  const amount = Math.floor(Number(rawAmount));
  if (!Number.isFinite(amount) || amount < 1) {
    return { ok: false, state: s, amount: 0, txId: '', reason: 'Enter a valid positive allocation amount.' };
  }
  if (!Number.isFinite(s.cash) || s.cash < amount) {
    return { ok: false, state: s, amount: 0, txId: '', reason: 'Not enough Country Cash for this allocation.' };
  }

  const provinces = Array.isArray(s.provinces) ? s.provinces : [];
  const target = provinces.find((p) => p.id === provinceId);
  if (!target) {
    return { ok: false, state: s, amount: 0, txId: '', reason: 'Province not found.' };
  }

  const curCat = target.budget?.[category] || 0;
  if (curCat + amount > 1e12) {
    return { ok: false, state: s, amount: 0, txId: '', reason: 'Category reserve cap (1T) reached.' };
  }

  const txId = (providedTxId || makeProvinceTxId('alloc', `${provinceId}_${category}`, nowMs))
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);
  const existingTxs = Array.isArray(s.provTxs) ? s.provTxs : [];
  if (txId && existingTxs.includes(txId)) {
    return { ok: false, state: s, amount: 0, txId, reason: 'Duplicate allocation blocked.' };
  }

  const updated: Province = {
    ...target,
    budget: {
      ...target.budget,
      [category]: curCat + amount,
    },
    allocTotal: Math.min(1e13, (target.allocTotal || 0) + amount),
  };

  const logEntry: ProvinceBudgetLogEntry = {
    t: Math.floor(nowMs),
    provId: target.id,
    provName: target.name,
    cat: category,
    amt: amount,
    kind: 'alloc',
  };

  return {
    ok: true,
    amount,
    txId,
    state: {
      ...s,
      cash: Math.max(0, s.cash - amount),
      provinces: provinces.map((p) => (p.id === provinceId ? updated : p)),
      provBudgetLog: [...(s.provBudgetLog || []), logEntry].slice(-20),
      provTxs: [...existingTxs, txId].slice(-30),
    },
  };
}

export function applyRebalanceProvinceBudget(
  s: GameState,
  provinceId: string,
  fromCategory: ProvinceBudgetCategory,
  toCategory: ProvinceBudgetCategory,
  rawAmount: number,
  nowMs = Date.now(),
): { ok: boolean; state: GameState; amount: number; reason?: string } {
  if (!BUDGET_CAT_SET.has(fromCategory) || !BUDGET_CAT_SET.has(toCategory)) {
    return { ok: false, state: s, amount: 0, reason: 'Invalid budget category.' };
  }
  if (fromCategory === toCategory) {
    return { ok: false, state: s, amount: 0, reason: 'Choose two different categories.' };
  }
  const amount = Math.floor(Number(rawAmount));
  if (!Number.isFinite(amount) || amount < 1) {
    return { ok: false, state: s, amount: 0, reason: 'Enter a valid positive amount.' };
  }
  const provinces = Array.isArray(s.provinces) ? s.provinces : [];
  const target = provinces.find((p) => p.id === provinceId);
  if (!target) {
    return { ok: false, state: s, amount: 0, reason: 'Province not found.' };
  }
  const srcBal = target.budget?.[fromCategory] || 0;
  if (srcBal < amount) {
    return { ok: false, state: s, amount: 0, reason: 'Insufficient funds in source category.' };
  }
  const dstBal = target.budget?.[toCategory] || 0;
  if (dstBal + amount > 1e12) {
    return { ok: false, state: s, amount: 0, reason: 'Destination reserve cap reached.' };
  }

  const updated: Province = {
    ...target,
    budget: {
      ...target.budget,
      [fromCategory]: srcBal - amount,
      [toCategory]: dstBal + amount,
    },
  };
  const logEntry: ProvinceBudgetLogEntry = {
    t: Math.floor(nowMs),
    provId: target.id,
    provName: target.name,
    cat: `${fromCategory}>${toCategory}`,
    amt: amount,
    kind: 'rebal',
  };

  return {
    ok: true,
    amount,
    state: {
      ...s,
      provinces: provinces.map((p) => (p.id === provinceId ? updated : p)),
      provBudgetLog: [...(s.provBudgetLog || []), logEntry].slice(-20),
    },
  };
}

export function calculateProvinceMaintenance(p: Province): ProvinceMaintenanceBreakdown {
  const budgetSum = totalProvinceBudget(p);
  const isStarterBaseline = p.slot === 1 && p.dev <= 1.05 && budgetSum <= 0 && (p.allocTotal || 0) <= 0;
  if (isStarterBaseline) {
    return {
      total: 0,
      infrastructure: 0,
      healthcare: 0,
      education: 0,
      security: 0,
      publicServices: 0,
    };
  }

  const popScale = 0.7 + Math.min(2.5, (p.pop || 6) / 60);
  const total =
    (Math.pow(Math.max(0, (p.dev || 1) - 1), 1.25) * 18 + Math.max(0, p.slot - 1) * 45) * popScale;

  const map: Record<string, number> = {};
  for (const area of PROVINCE_EXPENSE_AREAS) {
    map[area.id] = total * area.share;
  }

  return {
    total,
    infrastructure: map.infrastructure || 0,
    healthcare: map.healthcare || 0,
    education: map.education || 0,
    security: map.security || 0,
    publicServices: map.publicServices || 0,
  };
}

export function calculateSingleProvinceGrossPerSec(p: Province): number {
  const budgetSum = totalProvinceBudget(p);
  const isStarterBaseline = p.slot === 1 && p.dev <= 1.05 && budgetSum <= 0 && (p.allocTotal || 0) <= 0;
  if (isStarterBaseline) return 0;

  const diminish = 1 / (1 + 0.18 * (Math.max(1, p.slot) - 1));
  const devTerm = Math.pow(Math.max(0, (p.dev || 1) - 1), 1.45) * 65;
  const slotTerm = Math.max(0, p.slot - 1) * 420;
  const prodMult = 0.6 + (p.prod || 50) / 100;
  const empMult = 0.7 + (p.emp || 68) / 200;
  return diminish * (devTerm + slotTerm) * prodMult * empMult;
}

export function calculateProvinceNationalContribution(s: GameState): {
  grossIncomePerSec: number;
  maintenancePerSec: number;
  netIncomePerSec: number;
  happinessBonus: number;
  totalProvinceGdp: number;
  totalProvincePop: number;
  totalAllocatedBudget: number;
} {
  const provinces = Array.isArray(s.provinces) ? s.provinces : [];
  if (provinces.length === 0) {
    return {
      grossIncomePerSec: 0,
      maintenancePerSec: 0,
      netIncomePerSec: 0,
      happinessBonus: 0,
      totalProvinceGdp: 0,
      totalProvincePop: 0,
      totalAllocatedBudget: 0,
    };
  }

  let grossIncomePerSec = 0;
  let maintenancePerSec = 0;
  let totalProvinceGdp = 0;
  let totalProvincePop = 0;
  let totalAllocatedBudget = 0;
  let hapSum = 0;

  for (const p of provinces) {
    const g = calculateSingleProvinceGrossPerSec(p);
    const m = calculateProvinceMaintenance(p).total;
    grossIncomePerSec += g;
    maintenancePerSec += m;
    totalProvinceGdp += p.gdp || 0;
    totalProvincePop += p.pop || 0;
    totalAllocatedBudget += totalProvinceBudget(p);

    const isStarterBaseline =
      p.slot === 1 && p.dev <= 1.05 && totalProvinceBudget(p) <= 0 && (p.allocTotal || 0) <= 0;
    if (!isStarterBaseline) {
      hapSum += Math.max(0, ((p.hap || 60) - 55) * 0.04) * (1 / (1 + 0.25 * (p.slot - 1)));
    }
  }

  const netIncomePerSec = grossIncomePerSec - maintenancePerSec;
  const happinessBonus = Math.min(8, Math.max(0, hapSum));

  return {
    grossIncomePerSec,
    maintenancePerSec,
    netIncomePerSec,
    happinessBonus,
    totalProvinceGdp,
    totalProvincePop,
    totalAllocatedBudget,
  };
}

export function calculateProvinceOverallScore(p: Province): number {
  const gdpScore = Math.min(250, Math.max(0, Math.log10(Math.max(1000, p.gdp || 1000)) * 22));
  const devScore = (Math.max(1, Math.min(100, p.dev || 1)) / 100) * 230;
  const hapScore = (Math.max(5, Math.min(100, p.hap || 60)) / 100) * 200;
  const empScore = (Math.max(35, Math.min(99, p.emp || 68)) / 100) * 180;
  const popScore = Math.min(140, Math.max(0, Math.log10(Math.max(1, p.pop || 1) + 1) * 45));
  return Math.max(0, Math.min(1000, Math.round(gdpScore + devScore + hapScore + empScore + popScore)));
}

export function stepProvincesTick(
  s: GameState,
  elapsedSec: number,
  nowMs = Date.now(),
): GameState {
  const dt = Math.max(0, Math.min(1800, Number.isFinite(elapsedSec) ? elapsedSec : 0));
  if (dt <= 0) return s;

  const existing =
    Array.isArray(s.provinces) && s.provinces.length > 0
      ? s.provinces
      : [createStarterProvince(s.country?.[1], nowMs)];

  let cashAvailable = Number.isFinite(s.cash) ? Math.max(0, s.cash) : 0;
  let cashSpentOnShortfall = 0;

  const nextProvinces = existing.map((p) => {
    const budget = { ...(p.budget || emptyProvinceBudget()) };
    const lvls = { ...(p.lvls || defaultProvinceLevels()) };
    const totalB = totalProvinceBudget({ budget });
    const isStarterUntouched =
      p.slot === 1 && p.dev <= 1.05 && totalB <= 0 && (p.allocTotal || 0) <= 0;

    if (isStarterUntouched) {
      return {
        ...p,
        lastMaint: 0,
        fundingRatio: 100,
      };
    }

    // 1. Apply 6-category budget investment vs demand
    const demandPerCatPerSec = (18 + Math.pow(p.dev || 1, 1.35) * 4.2) * (1 + (p.slot - 1) * 0.2);
    let fundedCategories = 0;

    for (const catMeta of PROVINCE_BUDGET_CATEGORIES) {
      const catId = catMeta.id;
      const lvlKey = catMeta.levelKey;
      const avail = Math.max(0, budget[catId] || 0);
      const wantSpend = demandPerCatPerSec * dt;

      if (avail > 0) {
        const spent = Math.min(avail, wantSpend * 1.15);
        budget[catId] = Math.max(0, avail - spent);
        const adequacy = Math.min(1.5, spent / Math.max(1, wantSpend));
        // Diminishing returns above level 70, capped at 100
        const cur = lvls[lvlKey] ?? 15;
        const gain = adequacy * (1 - cur / 106) * 0.65 * dt;
        lvls[lvlKey] = Math.min(100, Math.max(10, cur + gain));
        fundedCategories += 1;
      } else {
        // Unfunded categories slowly degrade if above baseline 15
        const cur = lvls[lvlKey] ?? 15;
        if (cur > 15) {
          lvls[lvlKey] = Math.max(15, cur - 0.05 * dt);
        }
      }
    }

    // 2. Maintenance across 5 expense areas: covered by province reserve mix or remaining national cash
    const maint = calculateProvinceMaintenance(p);
    const maintNeeded = maint.total * dt;
    let maintPaid = 0;
    if (maintNeeded > 0) {
      const reserveKeys: ProvinceBudgetCategory[] = [
        'infrastructure',
        'healthcare',
        'education',
        'security',
        'welfare',
      ];
      const reserveAvail = reserveKeys.reduce((acc, k) => acc + (budget[k] || 0), 0);
      if (reserveAvail > 0) {
        const coverFromReserve = Math.min(reserveAvail, maintNeeded);
        for (const k of reserveKeys) {
          const share = (budget[k] || 0) / reserveAvail;
          budget[k] = Math.max(0, (budget[k] || 0) - coverFromReserve * share);
        }
        maintPaid += coverFromReserve;
      }
      const remainingNeed = Math.max(0, maintNeeded - maintPaid);
      if (remainingNeed > 0 && cashAvailable > 0) {
        // Gentle shortfall draw only if player has surplus cash and not actively starving starter fund
        const coverFromCash = Math.min(cashAvailable * 0.25, remainingNeed);
        cashAvailable = Math.max(0, cashAvailable - coverFromCash);
        cashSpentOnShortfall += coverFromCash;
        maintPaid += coverFromCash;
      }
    }

    const fundingRatio =
      maintNeeded <= 0.001
        ? 100
        : Math.min(100, Math.max(0, Math.round((maintPaid / maintNeeded) * 100 + fundedCategories * 4)));

    // 3. Recompute derived Province metrics gradually
    const avgLvl =
      (lvls.infrastructure +
        lvls.education +
        lvls.healthcare +
        lvls.security +
        lvls.welfare +
        lvls.businessActivity) /
      6;

    const targetDev = Math.max(1, Math.min(100, 1 + (avgLvl - 15) * 1.16));
    const devDelta = (targetDev - (p.dev || 1)) * Math.min(1, 0.08 * dt);
    const nextDev = Math.max(1, Math.min(100, Number(((p.dev || 1) + devDelta).toFixed(3))));

    const targetHap = Math.max(
      5,
      Math.min(
        100,
        34 +
          lvls.welfare * 0.22 +
          lvls.healthcare * 0.2 +
          lvls.security * 0.14 +
          lvls.education * 0.12 -
          Math.max(0, lvls.businessActivity - lvls.welfare) * 0.12 -
          (100 - fundingRatio) * 0.18,
      ),
    );
    const hapDelta = (targetHap - (p.hap || 62)) * Math.min(1, 0.08 * dt);
    const nextHap = Math.max(5, Math.min(100, Number(((p.hap || 62) + hapDelta).toFixed(2))));

    const targetEmp = Math.max(
      35,
      Math.min(
        99,
        46 +
          lvls.businessActivity * 0.24 +
          lvls.infrastructure * 0.14 +
          lvls.education * 0.12 +
          (nextHap - 50) * 0.12 -
          (100 - fundingRatio) * 0.15,
      ),
    );
    const empDelta = (targetEmp - (p.emp || 68)) * Math.min(1, 0.08 * dt);
    const nextEmp = Math.max(35, Math.min(99, Number(((p.emp || 68) + empDelta).toFixed(2))));

    const nextProd = Math.max(
      10,
      Math.min(
        100,
        Math.round(
          lvls.infrastructure * 0.25 +
            lvls.education * 0.22 +
            lvls.healthcare * 0.18 +
            lvls.businessActivity * 0.2 +
            nextHap * 0.15,
        ),
      ),
    );

    const popGrowthRate =
      nextHap >= 55 && fundingRatio >= 60
        ? (0.0012 * (lvls.healthcare / 50) * (1 + nextHap / 200)) * dt
        : nextHap < 35
          ? -0.0005 * dt
          : 0;
    const nextPop = Math.max(
      0.5,
      Math.min(2500, Number(((p.pop || 6) * (1 + popGrowthRate)).toFixed(3))),
    );

    const diminish = 1 / (1 + 0.18 * (p.slot - 1));
    const nextGdp = Math.max(
      1000,
      Math.min(
        1e13,
        Math.round(
          diminish *
            (50_000 * p.slot +
              Math.pow(nextDev, 2.2) * 2800 * (nextProd / 50) * (0.5 + nextPop / 20)),
        ),
      ),
    );

    return {
      ...p,
      budget,
      lvls,
      dev: nextDev,
      hap: nextHap,
      emp: nextEmp,
      prod: nextProd,
      pop: nextPop,
      gdp: nextGdp,
      lastMaint: Number(maint.total.toFixed(2)),
      fundingRatio,
    };
  });

  return {
    ...s,
    cash: cashSpentOnShortfall > 0 ? Math.max(0, s.cash - cashSpentOnShortfall) : s.cash,
    provinces: nextProvinces,
  };
}

export function buildProvinceLeaderboardEntries(
  s: GameState,
  ownerUid: string,
  ownerName: string,
  countryCode: string,
  nowMs = Date.now(),
): ProvinceLeaderboardEntry[] {
  const provinces = Array.isArray(s.provinces) ? s.provinces : [];
  const cleanUid = (ownerUid || 'local').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'local';
  const cleanOwner = (ownerName || 'Leader').trim().slice(0, 16) || 'Leader';
  const cleanCc = (countryCode || s.country?.[0] || 'PK').replace(/[^A-Za-z]/g, '').slice(0, 3) || 'PK';

  return provinces.map((p) => ({
    entryId: `${cleanUid}_${p.id}`,
    ownerUid: cleanUid,
    ownerName: cleanOwner,
    countryCode: cleanCc,
    provId: p.id,
    slot: p.slot,
    name: p.name,
    flagId: p.flagId,
    color: p.color,
    gdp: Math.max(0, Math.min(1e13, Math.round(p.gdp || 0))),
    pop: Number(Math.max(0.5, Math.min(10_000, p.pop || 1)).toFixed(2)),
    hap: Number(Math.max(5, Math.min(100, p.hap || 60)).toFixed(1)),
    dev: Number(Math.max(1, Math.min(100, p.dev || 1)).toFixed(1)),
    emp: Number(Math.max(35, Math.min(99, p.emp || 68)).toFixed(1)),
    overallScore: calculateProvinceOverallScore(p),
    updatedMs: Math.floor(nowMs),
  }));
}

export function compareProvinceLeaderboardEntries(
  a: ProvinceLeaderboardEntry,
  b: ProvinceLeaderboardEntry,
  category: ProvinceLeaderboardCategory,
): number {
  switch (category) {
    case 'gdp':
      return (
        b.gdp - a.gdp ||
        b.overallScore - a.overallScore ||
        b.dev - a.dev ||
        a.slot - b.slot ||
        a.provId.localeCompare(b.provId)
      );
    case 'hap':
      return (
        b.hap - a.hap ||
        b.overallScore - a.overallScore ||
        b.gdp - a.gdp ||
        a.slot - b.slot ||
        a.provId.localeCompare(b.provId)
      );
    case 'dev':
      return (
        b.dev - a.dev ||
        b.overallScore - a.overallScore ||
        b.gdp - a.gdp ||
        a.slot - b.slot ||
        a.provId.localeCompare(b.provId)
      );
    case 'pop':
      return (
        b.pop - a.pop ||
        b.overallScore - a.overallScore ||
        b.gdp - a.gdp ||
        a.slot - b.slot ||
        a.provId.localeCompare(b.provId)
      );
    case 'emp':
      return (
        b.emp - a.emp ||
        b.overallScore - a.overallScore ||
        b.gdp - a.gdp ||
        a.slot - b.slot ||
        a.provId.localeCompare(b.provId)
      );
    case 'overall':
    default:
      return (
        b.overallScore - a.overallScore ||
        b.gdp - a.gdp ||
        b.dev - a.dev ||
        b.hap - a.hap ||
        a.slot - b.slot ||
        a.provId.localeCompare(b.provId)
      );
  }
}

export function selectBestProvinceLeaderboardEntries(
  entries: ProvinceLeaderboardEntry[],
  category: ProvinceLeaderboardCategory,
): ProvinceLeaderboardEntry[] {
  const bestByOwner = new Map<string, ProvinceLeaderboardEntry>();
  for (const entry of entries) {
    if (!entry) continue;
    const ownerKey = (entry.ownerUid || '').trim() || entry.entryId;
    const prev = bestByOwner.get(ownerKey);
    if (!prev || compareProvinceLeaderboardEntries(entry, prev, category) < 0) {
      bestByOwner.set(ownerKey, entry);
    }
  }
  const unique = Array.from(bestByOwner.values());
  unique.sort((a, b) => compareProvinceLeaderboardEntries(a, b, category));
  return unique;
}

export function sortProvinceLeaderboard(
  entries: ProvinceLeaderboardEntry[],
  category: ProvinceLeaderboardCategory,
): ProvinceLeaderboardEntry[] {
  return selectBestProvinceLeaderboardEntries(entries, category);
}

export function buildProvinceLeaderboardFingerprint(entries: ProvinceLeaderboardEntry[]): string {
  if (!entries.length) return '';
  return entries
    .map(
      (e) =>
        `${e.provId}:${e.ownerName}:${e.countryCode}:${e.name}:${e.flagId}:${e.color}:${e.gdp}:${e.pop}:${e.hap}:${e.dev}:${e.emp}:${e.overallScore}`,
    )
    .join(';');
}
