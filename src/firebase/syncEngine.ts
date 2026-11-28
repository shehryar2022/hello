import { calculateGdp, cleanSavePayload, getActiveSubscription, getEquippedCosmetics, playerLevel, totalBuildings } from '../game/rules';
import type { GameState, PlayerStats } from '../game/types';

export const SYNC_IMMEDIATE_DELAY_MS = 120;
export const SYNC_COALESCE_DEBOUNCE_MS = 450;
export const SYNC_MAX_WAIT_MS = 1_400;
export const SYNC_TAIL_DRAIN_MS = 150;
export const PUBLIC_METRICS_FAST_INTERVAL_MS = 3_500;
export const PASSIVE_FULL_SAVE_INTERVAL_MS = 15_000;
export const MAX_TRANSIENT_RETRIES = 3;

export type CloudSyncPhase = 'idle' | 'syncing' | 'saving' | 'saved' | 'offline' | 'error';

export interface CloudStatusBadge {
  phase: CloudSyncPhase;
  cls: 'ok' | 'warn' | 'bad' | '';
  text: string;
}

export interface SyncStatusInput {
  uid: string | null;
  online: boolean;
  cloudLoading: boolean;
  cloudReady: boolean;
  needsOnboarding: boolean;
  kicked: boolean;
  syncBusy: boolean;
  pendingDirty: boolean;
  cloudDirty: boolean;
  permDenied: boolean;
  quotaPaused: boolean;
  syncError: boolean;
  errorLabel?: string;
}

/**
 * Pure state-machine computation for the cloud sync badge (#cloudPill).
 * Enforces the strict invariant that 'Saved' is NEVER returned while:
 * - offline
 * - loading / not ready
 * - any write is in flight (syncBusy)
 * - any unconfirmed local mutation exists (pendingDirty || cloudDirty)
 * - any sync error / permission block / quota pause / session kick is active
 */
export function computeCloudSyncStatus(input: SyncStatusInput): CloudStatusBadge {
  if (!input.uid) {
    return { phase: 'idle', cls: '', text: '' };
  }
  if (input.kicked) {
    return { phase: 'error', cls: 'bad', text: 'Session displaced' };
  }
  if (input.needsOnboarding) {
    return { phase: 'syncing', cls: 'warn', text: 'Setup profile' };
  }
  if (input.permDenied) {
    return { phase: 'error', cls: 'bad', text: 'Rules blocked sync' };
  }
  if (input.quotaPaused) {
    return { phase: 'error', cls: 'bad', text: 'Quota paused' };
  }
  if (!input.online) {
    return { phase: 'offline', cls: 'warn', text: 'Offline' };
  }
  if (input.syncError) {
    return { phase: 'error', cls: 'bad', text: input.errorLabel || 'Sync Error' };
  }
  if (input.cloudLoading || !input.cloudReady) {
    return { phase: 'syncing', cls: 'warn', text: 'Syncing…' };
  }
  if (input.syncBusy || input.pendingDirty || input.cloudDirty) {
    return { phase: 'saving', cls: 'warn', text: 'Saving…' };
  }
  return { phase: 'saved', cls: 'ok', text: 'Saved' };
}

/**
 * Computes bounded exponential backoff in ms for transient network/server errors.
 * Fast initial retry (~400ms -> 1.0s -> 2.5s) with optional jitter so concurrent
 * tabs don't collide in lockstep without creating infinite retry loops.
 */
export function computeSyncRetryBackoffMs(attemptNumber: number, jitterRatio = 0): number {
  const n = Math.max(1, Math.floor(attemptNumber));
  const base = Math.min(5_000, Math.round(400 * Math.pow(2.5, n - 1)));
  if (!Number.isFinite(jitterRatio) || jitterRatio <= 0) return base;
  const clampedJitter = Math.min(0.5, Math.max(0, jitterRatio));
  return Math.min(6_000, Math.round(base * (1 + clampedJitter)));
}

/**
 * Builds a compact fingerprint of public profile metrics (`players/{uid}`)
 * so passive lightweight sync only writes to Firestore when visible metrics
 * (cash, GDP, gems, level, rank, active subscription, stats) meaningfully changed.
 */
export function buildPublicMetricsFingerprint(
  state: GameState,
  pubStats: PlayerStats | undefined,
  completedTradesCount: number,
  nowSrvMs: number,
): string {
  const cash = Math.max(0, Math.floor(Number(state.cash) || 0));
  const gdp = Math.max(1, Math.floor(calculateGdp(state)));
  const gems = Math.max(0, Math.floor(Number(state.gems) || 0));
  const lvl = Math.max(1, Math.floor(playerLevel(state)));
  const rank = Math.max(1, Math.floor(Number(state.rank) || 1));
  const bTotal = totalBuildings(state);
  const trades = Math.max(pubStats?.completedTrades || 0, completedTradesCount);
  const sub = getActiveSubscription(state, nowSrvMs);
  const subKey = sub ? `${sub.def.id}:${Math.floor(sub.exp / 1000)}` : 'none';
  const eq = getEquippedCosmetics(state);
  const cosKey = `${eq.frame || ''},${eq.nameEffect || ''},${eq.badge || ''},${eq.anim || ''},${eq.lbAnim || ''}`;
  return `${gdp}|${cash}|${gems}|${lvl}|${rank}|${bTotal}|${trades}|${subKey}|${cosKey}`;
}

/**
 * Builds a fingerprint of meaningful save state (`saves/{uid}`) excluding noisy
 * 1-second tick timestamps (`t`) and fractional `day` drift when nothing material changed.
 * Ensures idle tabs execute 0 unnecessary Firestore writes while any cash/taxPool/
 * building/policy/quest/sub change is captured promptly.
 */
export function buildMeaningfulSaveFingerprint(state: GameState, nowSrvMs?: number): string {
  const cleaned = cleanSavePayload(state, nowSrvMs) as Partial<GameState>;
  return JSON.stringify({
    cash: Math.floor(Number(cleaned.cash) || 0),
    gems: Math.floor(Number(cleaned.gems) || 0),
    taxPool: Math.floor(Number(cleaned.taxPool) || 0),
    hap: Math.round((Number(cleaned.hap) || 0) * 10),
    appr: Math.round((Number(cleaned.appr) || 0) * 10),
    pop: Math.round((Number(cleaned.pop) || 0) * 100),
    b: cleaned.b,
    gxLvl: cleaned.gx?.lvl,
    tech: cleaned.tech,
    rank: cleaned.rank,
    gov: cleaned.gov,
    tax: cleaned.tax,
    fuel: cleaned.fuel,
    carbon: cleaned.carbon,
    luxury: cleaned.luxury,
    corp: cleaned.corp,
    gst: cleaned.gst,
    prop: cleaned.prop,
    duty: cleaned.duty,
    tourism: cleaned.tourism,
    digital: cleaned.digital,
    wealth: cleaned.wealth,
    wel: cleaned.wel,
    edu: cleaned.edu,
    rd: cleaned.rd,
    green: cleaned.green,
    transitSub: cleaned.transitSub,
    stk: cleaned.stk,
    sub: cleaned.sub,
    subPromo: cleaned.subPromo,
    milestones: cleaned.milestones,
    claimed: cleaned.claimed,
    country: state.country,
    gxCond: cleaned.gx?.cond,
    gxExpN: cleaned.gx?.exp?.n || 0,
    set: cleaned.set,
    lastDaily: cleaned.lastDaily,
    streak: cleaned.streak,
    boost: Number(cleaned.boost || 0) > 0 ? 1 : 0,
    activeFx: cleaned.activeFx,
    boosterCd: cleaned.boosterCd,
    questDay: cleaned.questDay,
    questIds: cleaned.questIds,
    provBudgetLog: (cleaned as { provBudgetLog?: unknown }).provBudgetLog,
    trueRank: state.rank,
    bPolicies: state.bPolicies,
    decisionsCd: state.decisionsCd,
    achievements: state.achievements,
    weeklyDay: state.weeklyDay,
    weeklyClaimed: state.weeklyClaimed,
    cityTimeMode: state.cityTimeMode,
    cityWeather: state.cityWeather,
    pol: state.pol,
    upgQueue: state.upgQueue,
    upgHistLen: state.upgHist?.length || 0,
    resQueue: state.resQueue,
    intlTrade: state.intlTrade
      ? {
          c: state.intlTrade.contracts?.length || 0,
          done: state.intlTrade.completedCount || 0,
          rev: Math.floor(state.intlTrade.exportRevenue || 0),
          imp: Math.floor(state.intlTrade.importSpend || 0),
          mil: state.intlTrade.milestonesClaimed || {},
        }
      : null,
    challenges: state.challenges,
    megaProjects: state.megaProjects?.map((p) => `${p.id}:${p.paid}:${p.status}:${p.claimed ? 1 : 0}`),
    cos: state.cos,
    cosEq: state.cosEq,
    theme: state.theme,
    dSlot: state.dSlot,
    dLastDay: state.dLastDay,
    dHistLen: state.dHist?.length || 0,
    wMilDay: state.wMilDay,
    wMilClaim: state.wMilClaim,
    wHistLen: state.wHist?.length || 0,
    qHistLen: state.qHist?.length || 0,
    mig: state.mig,
    fused: state.fused,
  });
}

export interface MaxWaitScheduleState {
  firstDirtyAtMs: number | null;
  scheduledAtMs: number | null;
}

/**
 * Computes next timeout delay for a max-wait coalesced write scheduler.
 * Prevents debounce starvation during rapid clicks while collapsing tight bursts
 * into a single network write.
 */
export function computeCoalescedDelayMs(
  scheduleState: MaxWaitScheduleState,
  requestedDelayMs: number,
  nowMs: number,
  maxWaitMs = SYNC_MAX_WAIT_MS,
): { delayMs: number; nextFirstDirtyAtMs: number } {
  const clampedReq = Math.max(0, Math.floor(requestedDelayMs));
  const firstDirty = scheduleState.firstDirtyAtMs ?? nowMs;
  const elapsed = Math.max(0, nowMs - firstDirty);
  const remainingBudget = Math.max(0, maxWaitMs - elapsed);
  const delayMs = Math.min(clampedReq, remainingBudget);
  return {
    delayMs,
    nextFirstDirtyAtMs: firstDirty,
  };
}

/**
 * Resolves a wallet revision mismatch safely:
 * - Always adopts authoritative server wallet balances (`cash`, `gems`, `stk`)
 *   so accepted gifts/transactions are never overwritten.
 * - If server also holds a strictly newer cloud save (`serverSave.t > local.t + 1500`
 *   and `!hasUnconfirmedLocalMutations`), prefers newer server progression fields.
 */
export function resolveWalletRevisionConflict(params: {
  localState: GameState;
  serverWallet: { cash: number; gems: number; stk: Record<string, number> };
  serverSave?: Partial<GameState> | null;
  hasLocalMutationsDuringWrite: boolean;
  preWriteWallet?: { cash: number; gems: number; stk: Record<string, number> };
}): { nextState: GameState; shouldFollowUpSync: boolean } {
  const { localState, serverWallet, serverSave, hasLocalMutationsDuringWrite, preWriteWallet } = params;
  const srvT = Number(serverSave?.t || 0);
  const locT = Number(localState.t || 0);
  const adoptServerSave = Boolean(serverSave && srvT > locT + 1500 && !hasLocalMutationsDuringWrite);

  const base = adoptServerSave
    ? {
        ...localState,
        ...serverSave,
      }
    : localState;

  // When a local spend (building, rank, sub, crate) occurred while a save write was in flight,
  // deduct only the negative delta against serverWallet so the player never receives free purchases
  // from adopting pre-spend serverWallet balances, while never duplicating Coins/Gems.
  let mergedCash = serverWallet.cash;
  let mergedGems = serverWallet.gems;
  if (hasLocalMutationsDuringWrite && !adoptServerSave && preWriteWallet) {
    const localCashSpend = Math.min(0, (Number(localState.cash) || 0) - (Number(preWriteWallet.cash) || 0));
    const localGemsSpend = Math.min(0, (Number(localState.gems) || 0) - (Number(preWriteWallet.gems) || 0));
    mergedCash = Math.max(0, Math.min(1e13, mergedCash + localCashSpend));
    mergedGems = Math.max(0, Math.min(1e9, mergedGems + localGemsSpend));
  }

  const nextState: GameState = {
    ...base,
    cash: mergedCash,
    gems: mergedGems,
    stk: serverWallet.stk,
  };

  return {
    nextState,
    shouldFollowUpSync: !adoptServerSave || hasLocalMutationsDuringWrite,
  };
}

/**
 * Classifies a Firebase/network error to determine if it is offline/transient,
 * version-conflict (CAS/failed-precondition), permission-denied, quota exceeded,
 * or session-displaced.
 */
export function classifySyncError(err: unknown, isNavigatorOnline = true): {
  kind:
    | 'displaced'
    | 'account-changed'
    | 'not-initialized'
    | 'version-conflict'
    | 'permission'
    | 'quota'
    | 'offline'
    | 'transient'
    | 'fatal';
  code: string;
  message: string;
} {
  const rawObj = err && typeof err === 'object' ? (err as { code?: unknown; message?: unknown }) : null;
  const code = typeof rawObj?.code === 'string' ? rawObj.code.toLowerCase() : '';
  const message =
    err instanceof Error
      ? err.message
      : typeof rawObj?.message === 'string'
        ? rawObj.message
        : String(err || '');
  const combined = `${code} ${message}`;

  if (code === 'aborted' && /another session/i.test(message)) {
    return { kind: 'displaced', code, message };
  }
  if (code === 'aborted' && /active account changed/i.test(message)) {
    return { kind: 'account-changed', code, message };
  }
  if (code === 'failed-precondition' && /not initialized/i.test(message)) {
    return { kind: 'not-initialized', code, message };
  }
  if (
    code === 'failed-precondition' ||
    /stored version does not match|required base version|base version|version conflict/i.test(combined)
  ) {
    return { kind: 'version-conflict', code: code || 'failed-precondition', message };
  }
  if (code === 'permission-denied' || /permission-denied|missing or insufficient permissions/i.test(combined)) {
    return { kind: 'permission', code, message };
  }
  if (code === 'resource-exhausted' || /quota exceeded/i.test(combined)) {
    return { kind: 'quota', code, message };
  }
  if (!isNavigatorOnline || /client is offline|network-request-failed|failed to fetch|offline/i.test(combined)) {
    return { kind: 'offline', code, message };
  }
  if (/aborted|unavailable|deadline-exceeded|internal|cancelled|unauthenticated|unknown|timeout/i.test(combined)) {
    return { kind: 'transient', code, message };
  }
  return { kind: 'fatal', code, message };
}

/**
 * Per-user FIFO serialized cloud write queue.
 * Ensures at most ONE Firestore mutation touching `wallet`, `players/{uid}`, or `saves/{uid}`
 * runs at a time for a given `(uid, authSeq)` session, eliminating concurrent CAS/version conflicts.
 */
export class UserCloudWriteQueue {
  private tail: Promise<void> = Promise.resolve();
  private inFlight = 0;
  private queued = 0;
  private invalidated = false;

  constructor(
    public readonly uid: string,
    public readonly authSeq: number,
  ) {}

  isInvalidated(): boolean {
    return this.invalidated;
  }

  isBusy(): boolean {
    return this.inFlight > 0 || this.queued > 0;
  }

  pendingCount(): number {
    return this.inFlight + this.queued;
  }

  invalidate(): void {
    this.invalidated = true;
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    if (this.invalidated) {
      return Promise.reject(Object.assign(new Error('Active account changed'), { code: 'aborted' }));
    }
    this.queued += 1;
    const run = this.tail.then(async () => {
      this.queued = Math.max(0, this.queued - 1);
      if (this.invalidated) {
        throw Object.assign(new Error('Active account changed'), { code: 'aborted' });
      }
      this.inFlight += 1;
      try {
        return await task();
      } finally {
        this.inFlight = Math.max(0, this.inFlight - 1);
      }
    });
    this.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

/**
 * Timer-based coalescing sync coordinator that handles:
 * - Coalesced debouncing with strict max-wait cap
 * - Serialized single in-flight write queue
 * - Post-write mutation sequence checking (never clears dirty if new edits arrived during write)
 * - Clean teardown on UID switch or unmount
 */
export class CoalescedSyncController {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private tailTimer: ReturnType<typeof setTimeout> | null = null;
  private firstDirtyAtMs: number | null = null;
  private scheduledFireAtMs: number | null = null;
  private mutationSeq = 0;
  private busy = false;
  private dirty = false;
  private retryCount = 0;
  private disposed = false;

  constructor(
    private readonly executeWrite: () => Promise<'ok' | 'retry' | 'stop'>,
    private readonly maxWaitMs = SYNC_MAX_WAIT_MS,
    private readonly tailDrainMs = SYNC_TAIL_DRAIN_MS,
  ) {}

  getMutationSeq(): number {
    return this.mutationSeq;
  }

  isBusy(): boolean {
    return this.busy;
  }

  isDirty(): boolean {
    return this.dirty;
  }

  getRetryCount(): number {
    return this.retryCount;
  }

  markMutation(delayMs = SYNC_COALESCE_DEBOUNCE_MS, nowMs = Date.now()): number {
    if (this.disposed) return -1;
    this.mutationSeq += 1;
    this.dirty = true;
    this.retryCount = 0;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    if (this.busy) {
      // Write in flight; tail drain will flush after it finishes
      return delayMs;
    }

    const { delayMs: nextDelay, nextFirstDirtyAtMs } = computeCoalescedDelayMs(
      { firstDirtyAtMs: this.firstDirtyAtMs, scheduledAtMs: this.scheduledFireAtMs },
      delayMs,
      nowMs,
      this.maxWaitMs,
    );
    this.firstDirtyAtMs = nextFirstDirtyAtMs;
    const nextFireAt = nowMs + nextDelay;

    if (this.timer !== null && this.scheduledFireAtMs !== null && this.scheduledFireAtMs <= nextFireAt) {
      return Math.max(0, this.scheduledFireAtMs - nowMs);
    }

    if (this.timer) clearTimeout(this.timer);
    this.scheduledFireAtMs = nextFireAt;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.scheduledFireAtMs = null;
      void this.flushNow();
    }, nextDelay);
    return nextDelay;
  }

  async flushNow(): Promise<void> {
    if (this.disposed) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.scheduledFireAtMs = null;
    }
    if (this.tailTimer) {
      clearTimeout(this.tailTimer);
      this.tailTimer = null;
    }
    if (this.busy) {
      this.dirty = true;
      return;
    }

    this.busy = true;
    this.firstDirtyAtMs = null;
    const capturedSeq = this.mutationSeq;
    let outcome: 'ok' | 'retry' | 'stop' = 'ok';
    try {
      outcome = await this.executeWrite();
    } finally {
      this.busy = false;
      if (!this.disposed) {
        const mutatedWhileWriting = this.mutationSeq > capturedSeq;
        if (outcome === 'ok') {
          this.retryCount = 0;
          if (!mutatedWhileWriting) {
            this.dirty = false;
          } else {
            this.dirty = true;
            this.tailTimer = setTimeout(() => {
              this.tailTimer = null;
              void this.flushNow();
            }, this.tailDrainMs);
          }
        } else if (outcome === 'retry') {
          this.dirty = true;
          if (mutatedWhileWriting) {
            this.tailTimer = setTimeout(() => {
              this.tailTimer = null;
              void this.flushNow();
            }, this.tailDrainMs);
          } else if (this.retryCount < MAX_TRANSIENT_RETRIES) {
            this.retryCount += 1;
            const backoff = computeSyncRetryBackoffMs(this.retryCount);
            this.retryTimer = setTimeout(() => {
              this.retryTimer = null;
              void this.flushNow();
            }, backoff);
          }
        } else {
          // 'stop' (perm denied / quota / kicked / offline waiting for online)
          this.retryCount = 0;
        }
      }
    }
  }

  reset(dispose = false): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.tailTimer) {
      clearTimeout(this.tailTimer);
      this.tailTimer = null;
    }
    this.firstDirtyAtMs = null;
    this.scheduledFireAtMs = null;
    this.dirty = false;
    this.retryCount = 0;
    this.busy = false;
    if (dispose) this.disposed = true;
  }
}
