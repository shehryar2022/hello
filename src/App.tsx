import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { Landmark, StickerArt, TabIcon } from './components/GameIcons';
import { HeroPanel } from './components/HeroPanel';
import { LoginGate } from './components/LoginGate';
import {
  DialogModal,
  ErrorLogModal,
  NotificationsModal,
  OnboardingModal,
  ProfileModal,
  SettingsModal,
  type DialogConfig,
} from './components/modals/GameModals';
import { GiftTableModal } from './components/modals/GiftTableModal';
import { NavBar, TopBar } from './components/TopBar';
import { BuildTab } from './components/tabs/BuildTab';
import { GiftsTab } from './components/tabs/GiftsTab';
import { GovtTab } from './components/tabs/GovtTab';
import { PlayersTab } from './components/tabs/PlayersTab';
import { PolicyTab } from './components/tabs/PolicyTab';
import { QuestsTab } from './components/tabs/QuestsTab';
import { ShopTab } from './components/tabs/ShopTab';
import { StickersTab } from './components/tabs/StickersTab';
import {
  acceptGiftOffer,
  buildQueryHelpers,
  capValue,
  checkUsernameAvailability,
  claimGovProject,
  createGiftOffer,
  createPlayerProfile,
  createGovProject,
  dayKeyFor,
  endSenderOffer,
  fetchPlayerProfile,
  finishGovProject,
  markNotificationsRead,
  normalizeProject,
  payGovProjectStage,
  rejectGiftOffer,
  searchPlayersByUsername,
  sendDirectMessage,
  sendGlobalChatMessage,
  sendHeartbeat,
  settleExpiredTrades,
  syncSaveToCloud,
  tickGovProject,
  timestampToMs,
} from './firebase/api';
import {
  auth,
  db,
  formatFirebaseError,
  isFirebaseConfigured,
  OperationType,
  recordFirestoreError,
} from './firebase/config';
import {
  clearErrorLog,
  extractErrorCode,
  extractErrorMessage,
  getErrorLog,
  installGlobalErrorListeners,
  recordAppError,
  subscribeErrorLog,
} from './firebase/errorLog';
import {
  ACTIVE_WINDOW_MS,
  BOOSTERS,
  BUILDINGS,
  COUNTRIES,
  DAILY_REWARDS,
  EXEC_DECISIONS,
  GOV_CHANGE_CD_MS,
  GOV_DAY_SEC,
  GOVS,
  GX_GOV_BUILDINGS,
  GX_PROJECT_TYPES,
  GX_ROADS,
  HEARTBEAT_MS,
  PROJECT_STAGES,
  RANKS,
  SAVE_KEY,
  STICKERS,
  SUBSCRIPTIONS,
  TAB_META,
  TECH_TREE,
} from './game/constants';
import {
  applyActivateGemBoost,
  applyBuyBooster,
  applyBuyBuilding,
  applyBuyRank,
  applyBuySubscription,
  applyChangeGov,
  applyClaimQuest,
  applyCollectTax,
  applyFixInfra,
  applyOfflineEarnings,
  applyPolicyPreset,
  applyUnlockTech,
  applyUpgradeBuilding,
  buyStickerCrate,
  calculateGdp,
  calculateIncome,
  calculateOfflineRank,
  calculateOnlineRank,
  claimMilestone,
  claimSubscriptionDaily,
  cleanStickersMap,
  formatNumber,
  freshState,
  fuseSticker,
  getActiveSubscription,
  getExecDecisionQuote,
  getInfraDecayMult,
  getProjectSpeedMult,
  getTaxPoolCapSeconds,
  migrateState,
  playerLevel,
  POLICY_BOUNDS,
  resolveExecutiveDecision,
  rollWeeklySubPromo,
  selectDailyQuestIds,
  targetHappiness,
  tierOfCompletedTrades,
} from './game/rules';
import { playSfx, triggerBuzz } from './game/sound';
import type {
  ChatMessage,
  CountryTuple,
  DmRecipient,
  GameState,
  GiftsSubTab,
  GovtSubTab,
  GovProject,
  NotificationItem,
  PlayerProfile,
  PlayersSubTab,
  ProjectType,
  ShopSubTab,
  SubscriptionTierId,
  TabId,
  TradeOffer,
} from './game/types';

interface ToastItem {
  id: number;
  text: string;
}

interface FloatPop {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

const TAB_LOCK_KEY = 'cet_tab_lock';

function loadInitialState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      return migrateState(JSON.parse(raw) as Partial<GameState>);
    }
  } catch {
    // Ignore invalid local storage
  }
  return freshState();
}

export default function App() {
  const [state, setState] = useState<GameState>(() => loadInitialState());
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  const [tab, setTab] = useState<TabId>('build');
  const [govtSubTab, setGovtSubTab] = useState<GovtSubTab>('infra');
  const [playersSubTab, setPlayersSubTab] = useState<PlayersSubTab>('lb');
  const [giftsSubTab, setGiftsSubTab] = useState<GiftsSubTab>('in');
  const [shopSubTab, setShopSubTab] = useState<ShopSubTab>('rank');

  const [gateOpen, setGateOpen] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return false;
    return !localStorage.getItem(SAVE_KEY);
  });

  const [user, setUser] = useState<User | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState('');
  const [cloudReady, setCloudReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [pubProfile, setPubProfile] = useState<PlayerProfile | null>(null);
  const [cloudStatus, setCloudStatus] = useState<{ cls: 'ok' | 'warn' | 'bad' | ''; text: string }>({
    cls: '',
    text: 'Saved',
  });
  const [kicked, setKicked] = useState(false);
  const [otherTabLocked, setOtherTabLocked] = useState(false);
  const otherTabLockedRef = useRef(false);
  otherTabLockedRef.current = otherTabLocked;

  const [leaderboard, setLeaderboard] = useState<PlayerProfile[]>([]);
  const [lbLoaded, setLbLoaded] = useState(false);
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [sentToday, setSentToday] = useState(0);
  const [projects, setProjects] = useState<GovProject[]>([]);
  const [liveProjectProgress, setLiveProjectProgress] = useState<Record<string, number>>({});
  const [globalChat, setGlobalChat] = useState<ChatMessage[]>([]);
  const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);
  const [dmRecipient, setDmRecipient] = useState<DmRecipient | null>(null);
  const [recentDms, setRecentDms] = useState<DmRecipient[]>([]);
  const [sentDmContacts, setSentDmContacts] = useState<DmRecipient[]>([]);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [floats, setFloats] = useState<FloatPop[]>([]);
  const [burstKey, setBurstKey] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorLogOpen, setErrorLogOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [profileView, setProfileView] = useState<PlayerProfile | null>(null);
  const [giftModal, setGiftModal] = useState<{
    mode: 'compose' | 'review';
    target: PlayerProfile | null;
    trade: TradeOffer | null;
  } | null>(null);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const appErrors = React.useSyncExternalStore(subscribeErrorLog, getErrorLog);

  const sidRef = useRef<string>(`${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  const walletRevRef = useRef<number>(0);
  const expectedWalletRevRef = useRef<number | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const serverOffsetMsRef = useRef<number>(0);
  const serverTimeVerifiedRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const cloudSyncTimerRef = useRef<number | null>(null);
  const syncRetryTimerRef = useRef<number | null>(null);
  const syncRetryCountRef = useRef<number>(0);
  const lastSyncedAtRef = useRef<number>(0);
  const cloudSyncBusyRef = useRef<boolean>(false);
  const cloudDirtyRef = useRef<boolean>(false);
  const pendingDirtyRef = useRef<boolean>(false);
  const localSaveTimerRef = useRef<number | null>(null);
  const permWarnShownRef = useRef<boolean>(false);
  const cloudSyncPermDeniedRef = useRef<boolean>(false);
  const pubProfileRef = useRef<PlayerProfile | null>(null);
  pubProfileRef.current = pubProfile;
  const uidRef = useRef<string | null>(null);
  uidRef.current = uid;
  const cloudReadyRef = useRef<boolean>(false);
  cloudReadyRef.current = cloudReady;
  const needsOnboardingRef = useRef<boolean>(false);
  needsOnboardingRef.current = needsOnboarding;
  const authSeqRef = useRef<number>(0);
  const kickedRef = useRef<boolean>(false);
  kickedRef.current = kicked;
  const completedTradesRef = useRef<number>(0);
  const projBusyRef = useRef<Set<string>>(new Set());
  const projPayBusyRef = useRef<Set<string>>(new Set());
  const projCreatingRef = useRef<boolean>(false);
  const justCreatedProjIdsRef = useRef<Set<string>>(new Set());
  const projStartedLocalAtRef = useRef<Record<string, number>>({});
  const projLiveRef = useRef<Record<string, number>>({});
  const projLastSyncRef = useRef<Record<string, number>>({});
  const projPrevTickMsRef = useRef<Record<string, number>>({});
  const lastCityTapRef = useRef<number>(0);
  const settlingTradesRef = useRef<boolean>(false);
  const tradesRef = useRef<TradeOffer[]>([]);
  tradesRef.current = trades;
  const lastSettledTradeCheckRef = useRef<number>(0);
  const rankPositionRef = useRef<number>(1);
  const modalOpenRef = useRef<boolean>(false);
  const anyModalOpen = Boolean(
    dialog || giftModal || settingsOpen || errorLogOpen || notifsOpen || profileView || needsOnboarding,
  );
  modalOpenRef.current = anyModalOpen;

  const updateServerOffset = useCallback((srvMs: number) => {
    if (srvMs > 0 && Number.isFinite(srvMs)) {
      const next = srvMs - Date.now();
      serverOffsetMsRef.current = next;
      serverTimeVerifiedRef.current = true;
      setServerOffsetMs((prev) => (Math.abs(prev - next) >= 1000 ? next : prev));
    }
  }, []);

  const addToast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const spawnFloat = useCallback((text: string, x: number, y: number, color = '#ffc23d') => {
    if (!stateRef.current.set.anim) return;
    const clampedX = Math.max(24, Math.min(window.innerWidth - 110, x - 20));
    const clampedY = Math.max(40, Math.min(window.innerHeight - 80, y - 24));
    const id = Date.now() + Math.random();
    setFloats((prev) => [...prev.slice(-10), { id, text, x: clampedX, y: clampedY, color }]);
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 950);
  }, []);

  const saveLocal = useCallback((next: GameState) => {
    if (localSaveTimerRef.current) {
      window.clearTimeout(localSaveTimerRef.current);
      localSaveTimerRef.current = null;
    }
    try {
      const toStore = { ...next, t: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(toStore));
    } catch {
      // Ignore quota issues
    }
  }, []);

  const scheduleSaveLocal = useCallback(() => {
    if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = window.setTimeout(() => {
      localSaveTimerRef.current = null;
      try {
        const toStore = { ...stateRef.current, t: Date.now() };
        localStorage.setItem(SAVE_KEY, JSON.stringify(toStore));
      } catch {
        // Ignore quota issues
      }
    }, 300);
  }, []);

  useEffect(() => {
    installGlobalErrorListeners();
    return () => {
      if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
      if (cloudSyncTimerRef.current) window.clearTimeout(cloudSyncTimerRef.current);
      if (syncRetryTimerRef.current) window.clearTimeout(syncRetryTimerRef.current);
    };
  }, []);

  // Keep body classes synced with animation preference and modal/gate state
  useEffect(() => {
    document.body.classList.toggle('noanim', !state.set.anim);
  }, [state.set.anim]);

  useEffect(() => {
    document.body.classList.toggle('modal-open', anyModalOpen);
  }, [anyModalOpen]);

  useEffect(() => {
    document.body.classList.toggle('gate-open', gateOpen);
  }, [gateOpen]);

  // Track responsive mobile vs desktop viewport
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Track user activity for gov day & project construction
  useEffect(() => {
    const bump = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('pointerdown', bump, { passive: true });
    window.addEventListener('keydown', bump, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', bump);
      window.removeEventListener('keydown', bump);
    };
  }, []);

  // Single-tab localStorage lock (matches original tab lock, releases cleanly on reload)
  useEffect(() => {
    const releaseOwnLock = () => {
      try {
        const cur = localStorage.getItem(TAB_LOCK_KEY);
        if (cur && JSON.parse(cur).id === sidRef.current) {
          localStorage.removeItem(TAB_LOCK_KEY);
        }
      } catch {
        // ignore
      }
    };
    const handleExit = () => {
      saveLocal(stateRef.current);
      releaseOwnLock();
    };
    const claimTab = () => {
      const cur = localStorage.getItem(TAB_LOCK_KEY);
      if (cur && cur !== sidRef.current) {
        try {
          const parsed = JSON.parse(cur) as { id: string; t: number };
          if (parsed.id !== sidRef.current && Date.now() - parsed.t < 7000) {
            otherTabLockedRef.current = true;
            setOtherTabLocked(true);
            return;
          }
        } catch {
          // Malformed
        }
      }
      otherTabLockedRef.current = false;
      setOtherTabLocked(false);
      localStorage.setItem(TAB_LOCK_KEY, JSON.stringify({ id: sidRef.current, t: Date.now() }));
    };
    claimTab();
    const iv = window.setInterval(() => {
      if (!otherTabLockedRef.current && !kickedRef.current) {
        localStorage.setItem(TAB_LOCK_KEY, JSON.stringify({ id: sidRef.current, t: Date.now() }));
      }
    }, 2500);
    const onStorage = (e: StorageEvent) => {
      if (e.key === TAB_LOCK_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as { id: string; t: number };
          if (parsed.id !== sidRef.current && Date.now() - parsed.t < 7000) {
            otherTabLockedRef.current = true;
            setOtherTabLocked(true);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pagehide', handleExit);
    window.addEventListener('beforeunload', handleExit);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pagehide', handleExit);
      window.removeEventListener('beforeunload', handleExit);
      releaseOwnLock();
    };
  }, [saveLocal]);

  const handleKicked = useCallback(() => {
    if (kickedRef.current) return;
    kickedRef.current = true;
    setKicked(true);
  }, []);

  const performCloudSync = useCallback(
    async (immediate = false) => {
      const currentUid = uidRef.current;
      if (!currentUid || !cloudReadyRef.current || kickedRef.current || needsOnboardingRef.current) return;
      if (!immediate && cloudSyncPermDeniedRef.current) return;
      if (immediate) {
        cloudSyncPermDeniedRef.current = false;
        syncRetryCountRef.current = 0;
      }
      if (syncRetryTimerRef.current) {
        window.clearTimeout(syncRetryTimerRef.current);
        syncRetryTimerRef.current = null;
      }
      if (cloudSyncBusyRef.current) {
        cloudDirtyRef.current = true;
        return;
      }
      cloudSyncBusyRef.current = true;
      cloudDirtyRef.current = false;
      expectedWalletRevRef.current = walletRevRef.current + 1;
      setCloudStatus({ cls: 'warn', text: 'Saving…' });
      try {
        const res = await syncSaveToCloud({
          state: stateRef.current,
          pubStats: pubProfileRef.current?.stats,
          completedTradesCount: completedTradesRef.current,
          rev: walletRevRef.current,
          sid: sidRef.current,
          onKicked: handleKicked,
        });
        walletRevRef.current = res.wallet.rev;
        syncRetryCountRef.current = 0;
        cloudSyncPermDeniedRef.current = false;
        permWarnShownRef.current = false;
        lastSyncedAtRef.current = Date.now();
        if (!res.accepted) {
          setState((prev) => {
            const next = {
              ...prev,
              cash: res.wallet.cash,
              gems: res.wallet.gems,
              stk: res.wallet.stk,
            };
            stateRef.current = next;
            saveLocal(next);
            return next;
          });
          cloudDirtyRef.current = true;
        } else {
          pendingDirtyRef.current = false;
        }
        setCloudStatus({ cls: 'ok', text: 'Saved' });
      } catch (err) {
        const code = (err as { code?: string })?.code || '';
        const msg = err instanceof Error ? err.message : String(err || '');
        const combined = `${code} ${msg}`;
        if (code === 'aborted' && msg.includes('Another session')) {
          setCloudStatus({ cls: 'bad', text: 'Session displaced' });
        } else if (code === 'failed-precondition' && /not initialized/i.test(msg)) {
          if (db) {
            const pRef = doc(db, 'players', currentUid);
            const pCheck = await getDocFromServer(pRef)
              .catch(() => getDoc(pRef))
              .catch(() => null);
            if (pCheck && !pCheck.exists()) {
              needsOnboardingRef.current = true;
              cloudReadyRef.current = false;
              setNeedsOnboarding(true);
              setCloudReady(false);
              setCloudStatus({ cls: 'warn', text: 'Setup profile' });
              return;
            }
          }
          setCloudStatus({ cls: 'warn', text: 'Retrying…' });
          cloudDirtyRef.current = true;
        } else if (
          code === 'permission-denied' ||
          /permission-denied|Missing or insufficient permissions/i.test(combined)
        ) {
          cloudSyncPermDeniedRef.current = true;
          cloudDirtyRef.current = false;
          syncRetryCountRef.current = 0;
          setCloudStatus({ cls: 'bad', text: 'Rules blocked sync' });
          if (!permWarnShownRef.current || immediate) {
            permWarnShownRef.current = true;
            addToast(formatFirebaseError(err));
          }
        } else if (
          /aborted|unavailable|deadline-exceeded|internal|cancelled|resource-exhausted|network|offline|unauthenticated|unknown/i.test(
            combined,
          )
        ) {
          if (syncRetryCountRef.current < 4) {
            syncRetryCountRef.current += 1;
            const backoff = Math.min(16_000, 2000 * Math.pow(2, syncRetryCountRef.current - 1));
            setCloudStatus({ cls: 'warn', text: 'Retrying…' });
            syncRetryTimerRef.current = window.setTimeout(() => {
              syncRetryTimerRef.current = null;
              void performCloudSync(false);
            }, backoff);
          } else {
            recordAppError({
              source: 'sync',
              code: code || undefined,
              path: `players/${currentUid}`,
              message: msg || 'Sync paused after retries',
            });
            setCloudStatus({ cls: 'bad', text: 'Sync paused' });
            if (immediate) addToast(formatFirebaseError(err));
          }
        } else {
          if (syncRetryCountRef.current < 2) {
            syncRetryCountRef.current += 1;
            setCloudStatus({ cls: 'warn', text: 'Retrying…' });
            syncRetryTimerRef.current = window.setTimeout(() => {
              syncRetryTimerRef.current = null;
              void performCloudSync(false);
            }, 3000);
          } else {
            recordAppError({
              source: 'sync',
              code: code || undefined,
              path: `players/${currentUid}`,
              message: msg || 'Cloud sync failed',
            });
            setCloudStatus({ cls: 'bad', text: 'Sync failed' });
            if (immediate) addToast(formatFirebaseError(err));
          }
        }
      } finally {
        expectedWalletRevRef.current = null;
        cloudSyncBusyRef.current = false;
        if (cloudDirtyRef.current) {
          cloudDirtyRef.current = false;
          window.setTimeout(() => void performCloudSync(false), 900);
        }
      }
    },
    [addToast, handleKicked, saveLocal],
  );

  const scheduleCloudSync = useCallback(
    (delayMs = 2000) => {
      pendingDirtyRef.current = true;
      if (
        !uidRef.current ||
        !cloudReadyRef.current ||
        kickedRef.current ||
        needsOnboardingRef.current ||
        cloudSyncPermDeniedRef.current
      ) {
        return;
      }
      if (syncRetryCountRef.current > 0) {
        syncRetryCountRef.current = 0;
      }
      if (cloudSyncTimerRef.current) window.clearTimeout(cloudSyncTimerRef.current);
      cloudSyncTimerRef.current = window.setTimeout(() => {
        cloudSyncTimerRef.current = null;
        void performCloudSync(false);
      }, delayMs);
    },
    [performCloudSync],
  );

  // Automatically recover cloud sync when browser regains connectivity, and flush dirty saves on tab hide
  useEffect(() => {
    const onOnline = () => {
      if (uidRef.current && cloudReadyRef.current && !kickedRef.current && !needsOnboardingRef.current) {
        syncRetryCountRef.current = 0;
        cloudSyncPermDeniedRef.current = false;
        void performCloudSync(false);
      }
    };
    const onVisChange = () => {
      if (document.visibilityState === 'hidden') {
        saveLocal(stateRef.current);
        if (
          uidRef.current &&
          cloudReadyRef.current &&
          !kickedRef.current &&
          !needsOnboardingRef.current &&
          pendingDirtyRef.current &&
          Date.now() - lastSyncedAtRef.current >= 5000
        ) {
          void performCloudSync(false);
        }
      }
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [performCloudSync, saveLocal]);

  // Daily check & offline earnings calculation (pure computation; caller displays dialog/toast)
  const runDailyAndOfflineChecks = useCallback(
    (baseState: GameState, tradeTier: number, nowOverride?: number) => {
      const now = nowOverride ?? Date.now() + serverOffsetMsRef.current;
      let working = { ...baseState };
      const todayKey = dayKeyFor(now);

      // Update daily quests if new day
      if (working.questDay !== todayKey) {
        working = {
          ...working,
          questDay: todayKey,
          questIds: selectDailyQuestIds(todayKey),
          claimed: {},
        };
      }

      // Roll weekly random subscription promo (once per Asia/Karachi ISO week)
      let promoToast: string | null = null;
      const promoRes = rollWeeklySubPromo(working, now);
      working = promoRes.state;
      if (promoRes.rolled && promoRes.promo) {
        const promoTier = SUBSCRIPTIONS.find((x) => x.id === promoRes.promo!.tier);
        if (promoTier) {
          promoToast = `Weekly Flash Deal: −${promoRes.promo.pct}% off ${promoTier.n}!`;
        }
      }

      // Apply offline earnings
      const off = applyOfflineEarnings(working, now, tradeTier);
      working = off.state;

      // Check daily login streak
      let streakDialog: DialogConfig | null = null;
      const lastKey = working.lastDaily ? dayKeyFor(working.lastDaily) : '';
      if (lastKey !== todayKey) {
        const ydayKey = dayKeyFor(now - 86_400_000);
        const nextStreak = lastKey === ydayKey ? (working.streak || 0) + 1 : 1;
        const rw = DAILY_REWARDS[Math.min(DAILY_REWARDS.length - 1, nextStreak - 1)];
        const nextStk = { ...working.stk };
        let grantedStickerId = '';
        let grantedStickerName = '';
        if (rw.e) {
          const picked = STICKERS[Math.floor(Math.random() * STICKERS.length)];
          nextStk[picked.id] = (nextStk[picked.id] || 0) + 1;
          grantedStickerId = picked.id;
          grantedStickerName = picked.n;
        }
        working = {
          ...working,
          cash: Math.min(1e13, working.cash + rw.c),
          gems: Math.min(1e9, working.gems + rw.g),
          stk: nextStk,
          streak: nextStreak,
          lastDaily: now,
        };
        streakDialog = {
          title: `Day ${nextStreak} Streak!`,
          body: (
            <div>
              <p>Welcome back! Here is today&apos;s treasury bonus:</p>
              <p style={{ fontSize: 18, color: 'var(--gold)', fontFamily: 'var(--d)' }}>
                +₨ {formatNumber(rw.c)} {rw.g > 0 ? `· +${rw.g} Gems` : ''}
                {grantedStickerName ? ` · ${grantedStickerName}` : ''}
              </p>
              {grantedStickerId && (
                <div style={{ margin: '8px auto' }}>
                  <StickerArt id={grantedStickerId} size={34} />
                </div>
              )}
              {off.credited >= 1 && (
                <p className="ok" style={{ fontSize: 13 }}>
                  Plus +₨ {formatNumber(off.credited)} offline tax collected while away!
                </p>
              )}
            </div>
          ),
          actions: [{ label: 'Collect', variant: 'gold', onClick: () => setDialog(null) }],
        };
      } else if (off.credited >= 1) {
        streakDialog = {
          title: 'Welcome Back!',
          body: (
            <p>
              Your economy kept running while away!{' '}
              <b className="ok">+₨ {formatNumber(off.credited)}</b> added to your Tax Pool
              {off.wasCapped ? ' (30m offline cap reached)' : ''}.
            </p>
          ),
          actions: [{ label: 'Awesome', variant: 'mint', onClick: () => setDialog(null) }],
        };
      }

      return { state: working, streakDialog, promoToast };
    },
    [],
  );

  // Firebase bootstrap & auth listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      return;
    }
    void getRedirectResult(auth).catch((err) => {
      recordAppError({
        source: 'auth',
        code: extractErrorCode(err) || undefined,
        message: extractErrorMessage(err),
      });
      setAuthMsg(formatFirebaseError(err));
    });

    const unsub = onAuthStateChanged(auth, async (u) => {
      const seq = ++authSeqRef.current;
      setUser(u);
      setUid(u?.uid || null);
      if (!u) {
        if (cloudSyncTimerRef.current) {
          window.clearTimeout(cloudSyncTimerRef.current);
          cloudSyncTimerRef.current = null;
        }
        if (syncRetryTimerRef.current) {
          window.clearTimeout(syncRetryTimerRef.current);
          syncRetryTimerRef.current = null;
        }
        walletRevRef.current = 0;
        expectedWalletRevRef.current = null;
        lastSyncedAtRef.current = 0;
        cloudSyncBusyRef.current = false;
        cloudDirtyRef.current = false;
        pendingDirtyRef.current = false;
        syncRetryCountRef.current = 0;
        cloudSyncPermDeniedRef.current = false;
        permWarnShownRef.current = false;
        completedTradesRef.current = 0;
        settlingTradesRef.current = false;
        serverTimeVerifiedRef.current = false;
        serverOffsetMsRef.current = 0;
        projBusyRef.current.clear();
        projPayBusyRef.current.clear();
        projCreatingRef.current = false;
        justCreatedProjIdsRef.current.clear();
        projStartedLocalAtRef.current = {};
        projLiveRef.current = {};
        projLastSyncRef.current = {};
        projPrevTickMsRef.current = {};
        cloudReadyRef.current = false;
        needsOnboardingRef.current = false;
        setServerOffsetMs(0);
        setCloudReady(false);
        setNeedsOnboarding(false);
        setPubProfile(null);
        setTrades([]);
        setNotifications([]);
        setProjects([]);
        setLeaderboard([]);
        setLbLoaded(false);
        setSentToday(0);
        setLiveProjectProgress({});
        setGlobalChat([]);
        setDmMessages([]);
        setDmRecipient(null);
        setRecentDms([]);
        setSentDmContacts([]);
        setCloudStatus({ cls: '', text: 'Saved' });
        return;
      }

      cloudSyncPermDeniedRef.current = false;
      permWarnShownRef.current = false;
      syncRetryCountRef.current = 0;
      setGateOpen(false);
      setAuthMsg('');
      try {
        // Claim single session lock on sign-in
        await setDoc(doc(db, 'players', u.uid, 'private', 'session'), {
          sid: sidRef.current,
          t: serverTimestamp(),
        });
        if (authSeqRef.current !== seq) return;

        // Estimate server clock offset strictly from server (never fall back to stale cache)
        const sesSnap = await getDocFromServer(doc(db, 'players', u.uid, 'private', 'session')).catch(() => null);
        if (authSeqRef.current !== seq) return;
        if (sesSnap && sesSnap.exists()) {
          const srvMs = timestampToMs(sesSnap.data()?.t);
          if (srvMs > 0) updateServerOffset(srvMs);
        }

        const pRef = doc(db, 'players', u.uid);
        const pSnap = await getDocFromServer(pRef).catch(() => getDoc(pRef));
        if (authSeqRef.current !== seq) return;
        if (!pSnap.exists()) {
          needsOnboardingRef.current = true;
          cloudReadyRef.current = false;
          setNeedsOnboarding(true);
          setCloudReady(false);
          return;
        }

        const pData = pSnap.data() as Omit<PlayerProfile, 'id'>;
        setPubProfile({ ...pData, id: u.uid, seen: timestampToMs(pData.lastSeen) });

        // Load authoritative wallet + save from server when online (fallback to cache offline)
        const wRef = doc(db, 'players', u.uid, 'private', 'wallet');
        const sRef = doc(db, 'saves', u.uid);
        const [wSnap, sSnap] = await Promise.all([
          getDocFromServer(wRef).catch(() => getDoc(wRef)),
          getDocFromServer(sRef).catch(() => getDoc(sRef)),
        ]);
        if (authSeqRef.current !== seq) return;

        let loaded = sSnap.exists()
          ? migrateState((sSnap.data()?.save as Partial<GameState>) || {})
          : loadInitialState();
        loaded = {
          ...loaded,
          country:
            COUNTRIES.find((c) => c[0] === pData.countryCode) || [
              pData.countryCode || 'PK',
              pData.countryName || 'Pakistan',
            ],
        };

        if (wSnap.exists()) {
          const w = wSnap.data();
          const rawRev = Number(w.rev);
          walletRevRef.current = Number.isFinite(rawRev) ? Math.max(0, Math.floor(rawRev)) : 0;
          loaded.cash = capValue(w.cash, 1e13);
          loaded.gems = capValue(w.gems, 1e9);
          loaded.stk = cleanStickersMap(w.stk);
        } else {
          walletRevRef.current = 0;
          pendingDirtyRef.current = true;
        }

        const tier = tierOfCompletedTrades(pData.stats?.completedTrades);
        completedTradesRef.current = pData.stats?.completedTrades || 0;
        const checkedRes = runDailyAndOfflineChecks(loaded, tier, Date.now() + serverOffsetMsRef.current);
        const checked = checkedRes.state;
        if (
          checked.lastDaily !== loaded.lastDaily ||
          checked.taxPool !== loaded.taxPool ||
          checked.questDay !== loaded.questDay ||
          checked.subPromo !== loaded.subPromo
        ) {
          pendingDirtyRef.current = true;
        }
        stateRef.current = checked;
        setState(checked);
        saveLocal(checked);
        if (checkedRes.promoToast) addToast(checkedRes.promoToast);
        if (checkedRes.streakDialog) setDialog(checkedRes.streakDialog);
        needsOnboardingRef.current = false;
        cloudReadyRef.current = true;
        setNeedsOnboarding(false);
        setCloudReady(true);
      } catch (err) {
        if (authSeqRef.current === seq) {
          recordFirestoreError(err, OperationType.GET, `players/${u.uid}`);
          addToast(formatFirebaseError(err));
        }
      }
    });

    return () => unsub();
  }, [addToast, runDailyAndOfflineChecks, saveLocal, updateServerOffset]);

  // Run daily check for offline mode on mount or when switching back to offline play
  useEffect(() => {
    if (!gateOpen && !uid) {
      const checkedRes = runDailyAndOfflineChecks(stateRef.current, 0);
      stateRef.current = checkedRes.state;
      setState(checkedRes.state);
      saveLocal(checkedRes.state);
      if (checkedRes.promoToast) addToast(checkedRes.promoToast);
      if (checkedRes.streakDialog) setDialog(checkedRes.streakDialog);
    }
  }, [gateOpen, uid, runDailyAndOfflineChecks, saveLocal, addToast]);

  // Trigger initial sync after sign-in if daily/offline rewards updated local state
  useEffect(() => {
    if (uid && cloudReady && !needsOnboarding && !kicked && pendingDirtyRef.current) {
      scheduleCloudSync(800);
    }
  }, [uid, cloudReady, needsOnboarding, kicked, scheduleCloudSync]);

  const handleSnapshotError = useCallback(
    (path: string, err: unknown) => {
      const info = recordFirestoreError(err, OperationType.GET, path);
      console.error('Firestore Snapshot Error: ', JSON.stringify(info));
      const raw = err instanceof Error ? err.message : String(err || '');
      const code = (err as { code?: string })?.code || '';
      if (/permission-denied|Missing or insufficient permissions/i.test(code + raw) && !permWarnShownRef.current) {
        permWarnShownRef.current = true;
        addToast(formatFirebaseError(err));
        setCloudStatus({ cls: 'bad', text: 'Rules / Auth error' });
      }
    },
    [addToast],
  );

  // Realtime Firestore listeners when signed in & onboarded
  useEffect(() => {
    if (!uid || !cloudReady || needsOnboarding || kicked) return;
    const unsubs: Unsubscribe[] = [];
    const queries = buildQueryHelpers();

    // 1. Session lock listener + continuous clock calibration
    unsubs.push(
      onSnapshot(
        doc(db, 'players', uid, 'private', 'session'),
        (snap) => {
          if (!snap.exists()) return;
          const d = snap.data();
          if (d?.sid && d.sid !== sidRef.current) {
            handleKicked();
            return;
          }
          if (!snap.metadata.hasPendingWrites && d?.t) {
            updateServerOffset(timestampToMs(d.t));
          }
        },
        (err) => handleSnapshotError(`players/${uid}/private/session`, err),
      ),
    );

    // 2. Wallet listener (authoritative balance updates from gifts, ignoring self-echoes)
    unsubs.push(
      onSnapshot(
        doc(db, 'players', uid, 'private', 'wallet'),
        (snap) => {
          if (!snap.exists()) return;
          const w = snap.data();
          const newRev = Number(w.rev) || 0;
          if (newRev > walletRevRef.current) {
            const isOwnInFlightEcho =
              !w.tradeId &&
              cloudSyncBusyRef.current &&
              w.sid === sidRef.current &&
              expectedWalletRevRef.current === newRev;
            walletRevRef.current = newRev;
            if (!isOwnInFlightEcho) {
              setState((prev) => {
                const next = {
                  ...prev,
                  cash: capValue(w.cash, 1e13),
                  gems: capValue(w.gems, 1e9),
                  stk: cleanStickersMap(w.stk),
                };
                stateRef.current = next;
                saveLocal(next);
                return next;
              });
            }
          }
        },
        (err) => handleSnapshotError(`players/${uid}/private/wallet`, err),
      ),
    );

    // 3. Own player profile listener
    unsubs.push(
      onSnapshot(
        doc(db, 'players', uid),
        (snap) => {
          if (!snap.exists()) return;
          const d = snap.data() as Omit<PlayerProfile, 'id'>;
          completedTradesRef.current = d.stats?.completedTrades || 0;
          setPubProfile({ ...d, id: snap.id, seen: timestampToMs(d.lastSeen) });
        },
        (err) => handleSnapshotError(`players/${uid}`, err),
      ),
    );

    // 4. Active leaderboard listener
    unsubs.push(
      onSnapshot(
        queries.playersActiveQuery(serverOffsetMsRef.current),
        (snap) => {
          const nowEst = Date.now() + serverOffsetMsRef.current;
          const rows = snap.docs
            .map((d) => {
              const data = d.data({ serverTimestamps: 'estimate' }) as Omit<PlayerProfile, 'id'>;
              return { ...data, id: d.id, seen: timestampToMs(data.lastSeen) };
            })
            .filter((p) => p.id === uid || (p.seen && nowEst - p.seen <= ACTIVE_WINDOW_MS))
            .sort((a, b) => (b.gdp || 0) - (a.gdp || 0));
          setLeaderboard(rows);
          setLbLoaded(true);
        },
        (err) => {
          setLbLoaded(true);
          handleSnapshotError('players', err);
        },
      ),
    );

    // 5. Gifts/trades listener + expired gift auto-settlement
    unsubs.push(
      onSnapshot(
        queries.tradesQuery(uid),
        (snap) => {
          const list: TradeOffer[] = snap.docs.map((d) => {
            const x = d.data({ serverTimestamps: 'estimate' });
            return {
              id: d.id,
              from: String(x.from || ''),
              to: String(x.to || ''),
              fromName: String(x.fromName || ''),
              toName: String(x.toName || ''),
              fromCountry: String(x.fromCountry || ''),
              toCountry: String(x.toCountry || ''),
              participants: Array.isArray(x.participants) ? (x.participants as string[]) : [],
              offerCash: Number(x.offerCash) || 0,
              offerGems: Number(x.offerGems) || 0,
              offerStk: (x.offerStk as Record<string, number>) || {},
              reqCash: Number(x.reqCash) || 0,
              reqGems: Number(x.reqGems) || 0,
              reqStk: (x.reqStk as Record<string, number>) || {},
              message: String(x.message || ''),
              status: (x.status as TradeOffer['status']) || 'pending',
              refunded: Boolean(x.refunded),
              createdMs: timestampToMs(x.createdAt),
              expMs: timestampToMs(x.expiresAt),
              resMs: timestampToMs(x.resolvedAt),
            };
          });
          setTrades(list);
          if (!settlingTradesRef.current) {
            settlingTradesRef.current = true;
            void settleExpiredTrades(
              list,
              uid,
              sidRef.current,
              handleKicked,
              serverOffsetMsRef.current,
            ).finally(() => {
              settlingTradesRef.current = false;
            });
          }
        },
        (err) => handleSnapshotError('trades', err),
      ),
    );

    // 6. Daily gift limit listener handled in dedicated dayKey effect below

    // 7. Notifications listener
    unsubs.push(
      onSnapshot(
        queries.notifsQuery(uid),
        (snap) => {
          const items: NotificationItem[] = snap.docs.map((d) => {
            const x = d.data({ serverTimestamps: 'estimate' });
            return {
              id: d.id,
              type: (x.type as NotificationItem['type']) || 'dm',
              text: String(x.text || ''),
              tradeId: (x.tradeId as string | null) || null,
              read: Boolean(x.read),
              from: String(x.from || ''),
              fromName: x.fromName ? String(x.fromName) : undefined,
              fromCc: x.fromCc ? String(x.fromCc) : undefined,
              ms: timestampToMs(x.createdAt),
            };
          });
          setNotifications(items);
        },
        (err) => handleSnapshotError(`players/${uid}/notifications`, err),
      ),
    );

    // 8. Gov projects listener (guard pending writes & calibrate server offset only from fresh server writes)
    unsubs.push(
      onSnapshot(
        queries.projectsQuery(uid),
        (snap) => {
          for (const ch of snap.docChanges()) {
            const raw = ch.doc.data();
            if (!ch.doc.metadata.hasPendingWrites) {
              if (justCreatedProjIdsRef.current.has(ch.doc.id) && raw.startedAt) {
                justCreatedProjIdsRef.current.delete(ch.doc.id);
                const startMs = timestampToMs(raw.startedAt);
                if (startMs > 0) {
                  updateServerOffset(startMs);
                  projPrevTickMsRef.current[ch.doc.id] = startMs;
                }
              } else if (ch.type === 'modified' && raw.lastTickAt) {
                const tickMs = timestampToMs(raw.lastTickAt);
                const prevTick = projPrevTickMsRef.current[ch.doc.id] || 0;
                if (tickMs > prevTick) {
                  projPrevTickMsRef.current[ch.doc.id] = tickMs;
                  updateServerOffset(tickMs);
                }
              } else if (raw.lastTickAt) {
                const tickMs = timestampToMs(raw.lastTickAt);
                if (tickMs > (projPrevTickMsRef.current[ch.doc.id] || 0)) {
                  projPrevTickMsRef.current[ch.doc.id] = tickMs;
                }
              }
            }
          }
          const nowEst = Date.now() + serverOffsetMsRef.current;
          const normalized = snap.docs.map((d) =>
            normalizeProject(
              d.id,
              d.data({ serverTimestamps: 'estimate' }) as Record<string, unknown>,
              nowEst,
              d.metadata.hasPendingWrites,
            ),
          );
          const nextLive: Record<string, number> = {};
          for (const p of normalized) {
            nextLive[p.id] = Math.max(projLiveRef.current[p.id] || 0, p.progressMs);
          }
          const hadPrevLive = Object.keys(projLiveRef.current).length > 0;
          projLiveRef.current = nextLive;
          setProjects(normalized);
          if (normalized.length > 0 || hadPrevLive) {
            setLiveProjectProgress(nextLive);
          }
        },
        (err) => handleSnapshotError(`players/${uid}/projects`, err),
      ),
    );

    // 9. Global chat listener
    unsubs.push(
      onSnapshot(
        queries.globalChatQuery(),
        (snap) => {
          const msgs: ChatMessage[] = snap.docs
            .map((d) => {
              const x = d.data({ serverTimestamps: 'estimate' });
              return {
                id: d.id,
                uid: String(x.uid || ''),
                name: String(x.name || ''),
                cc: String(x.cc || ''),
                rank: Number(x.rank) || 0,
                text: String(x.text || ''),
                ms: timestampToMs(x.createdAt),
              };
            })
            .reverse();
          setGlobalChat(msgs);
        },
        (err) => handleSnapshotError('globalChat', err),
      ),
    );

    // Heartbeat interval (skip initial heartbeat if an initial sync is queued to avoid transaction contention)
    if (!pendingDirtyRef.current) {
      void sendHeartbeat(uid).catch((err) => {
        if (/permission-denied/i.test(extractErrorCode(err))) {
          recordFirestoreError(err, OperationType.UPDATE, `players/${uid}`);
        }
      });
    }
    const hb = window.setInterval(() => {
      if (
        !document.hidden &&
        !kickedRef.current &&
        !cloudSyncBusyRef.current &&
        Date.now() - lastSyncedAtRef.current >= HEARTBEAT_MS - 5000
      ) {
        void sendHeartbeat(uid).catch((err) => {
          if (/permission-denied/i.test(extractErrorCode(err))) {
            recordFirestoreError(err, OperationType.UPDATE, `players/${uid}`);
          }
        });
      }
    }, HEARTBEAT_MS);

    return () => {
      window.clearInterval(hb);
      unsubs.forEach((u) => u());
    };
  }, [uid, cloudReady, needsOnboarding, kicked, handleKicked, handleSnapshotError, saveLocal, updateServerOffset]);

  // Direct messages listener for active DM recipient
  useEffect(() => {
    if (!uid || !cloudReady || !dmRecipient) {
      setDmMessages([]);
      return;
    }
    const q = buildQueryHelpers().dmQuery(uid, dmRecipient.uid);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs
          .map((d) => {
            const x = d.data({ serverTimestamps: 'estimate' });
            const isMe = x.from === uid;
            return {
              id: d.id,
              uid: String(x.from || ''),
              name: isMe ? pubProfileRef.current?.username || 'You' : dmRecipient.name,
              cc: isMe ? stateRef.current.country[0] : dmRecipient.cc,
              rank: 0,
              text: String(x.text || ''),
              ms: timestampToMs(x.createdAt),
            };
          })
          .reverse();
        setDmMessages(msgs);
      },
      (err) => handleSnapshotError(`dms/${dmRecipient.uid}`, err),
    );
    return () => unsub();
  }, [uid, cloudReady, dmRecipient, handleSnapshotError]);

  // Collect recent DM contacts from both incoming DM notifications and initiated DMs
  useEffect(() => {
    const map = new Map<string, DmRecipient>();
    for (const c of sentDmContacts) {
      if (c.uid && c.name) map.set(c.uid, c);
    }
    for (const n of notifications) {
      if (n.type === 'dm' && n.from && n.fromName && !map.has(n.from)) {
        map.set(n.from, { uid: n.from, name: n.fromName, cc: n.fromCc || '' });
      }
    }
    setRecentDms(Array.from(map.values()));
  }, [notifications, sentDmContacts]);

  const tradeTier = useMemo(
    () => tierOfCompletedTrades(pubProfile?.stats?.completedTrades),
    [pubProfile?.stats?.completedTrades],
  );

  // Main 1-second simulation & save loop
  const tickCountRef = useRef(0);
  const projectsRef = useRef<GovProject[]>([]);
  projectsRef.current = projects;

  useEffect(() => {
    if (gateOpen || otherTabLocked || kicked) return;

    const iv = window.setInterval(() => {
      const now = Date.now();
      const nowSrv = now + serverOffsetMsRef.current;
      const isUserActive = !document.hidden && now - lastActivityRef.current < 120_000;
      tickCountRef.current += 1;

      // Pre-roll event outside setState so React state setters never fire inside updater callbacks
      let triggerDecisionId: string | null = null;
      let passiveEvent: { kind: 'bonus' | 'fine'; amt: number } | null = null;
      const curSnap = stateRef.current;
      if (curSnap.ev - 1 <= 0) {
        const curInc = calculateIncome(curSnap, { tradeTier, nowMs: nowSrv });
        if (curInc.gross > 8 && isUserActive && !modalOpenRef.current && Math.random() < 0.55) {
          const pick = EXEC_DECISIONS[Math.floor(Math.random() * EXEC_DECISIONS.length)];
          triggerDecisionId = pick.id;
        } else if (curInc.gross > 5 && Math.random() < 0.65) {
          if (Math.random() < 0.65) {
            const bonus = Math.max(100, Math.floor(Math.max(1, Math.abs(curInc.net)) * 45));
            passiveEvent = { kind: 'bonus', amt: bonus };
          } else {
            const fine = Math.min(Math.floor(curSnap.cash * 0.05), Math.floor(curInc.gross * 25));
            if (fine > 0) passiveEvent = { kind: 'fine', amt: fine };
          }
        }
      }

      setState((prev) => {
        const inc = calculateIncome(prev, { tradeTier, nowMs: nowSrv });
        const capPool = Math.max(0, inc.net * getTaxPoolCapSeconds(prev));
        const prevPool = prev.taxPool || 0;
        const nextTaxPool =
          inc.net > 0
            ? prevPool >= capPool
              ? Math.min(1e13, prevPool)
              : Math.min(1e13, Math.min(capPool, prevPool + inc.net))
            : Math.max(0, prevPool + inc.net);

        const targHap = targetHappiness(prev);
        const nextHap = Math.max(0, Math.min(100, prev.hap + (targHap - prev.hap) * 0.04));
        const nextAppr = Math.max(0, Math.min(100, prev.appr + (nextHap - prev.appr) * 0.02));
        const promoTick = rollWeeklySubPromo(prev, nowSrv);
        const nextSubPromo = promoTick.rolled ? promoTick.state.subPromo : prev.subPromo;
        const nextPop = Math.min(
          100_000,
          Math.max(
            1,
            prev.pop +
              (nextHap - 45) * 0.0005 +
              ((prev.b.water || 0) * 0.0002 +
                (prev.b.rail || 0) * 0.0003 +
                (prev.b.transit || 0) * 0.00025 +
                (prev.transitSub || 0) * 0.00004),
          ),
        );

        let nextCash = prev.cash;
        let nextGx = prev.gx;
        const nextDay = prev.day + 1 / 12;
        let nextEv = prev.ev - 1;

        // Clear expired shop income boost cleanly using server clock
        let nextActiveFx = prev.activeFx;
        if (nextActiveFx?.incomeBoostEnd && nextActiveFx.incomeBoostEnd <= nowSrv) {
          nextActiveFx = { ...nextActiveFx };
          delete nextActiveFx.incomeBoostEnd;
          delete nextActiveFx.incomeBoostMult;
          delete nextActiveFx.incomeBoostId;
        }

        // Gov infrastructure decay & daily expenses on active play
        if (isUserActive) {
          const acc = (prev.gx.acc || 0) + 1;
          const nextCond = { ...prev.gx.cond };
          if (tickCountRef.current % 15 === 0) {
            const decayStep = 0.15 * getInfraDecayMult(prev);
            for (const [k] of [...GX_GOV_BUILDINGS, ...GX_ROADS]) {
              nextCond[k] = Math.max(0, (nextCond[k] ?? 100) - decayStep);
            }
          }
          let blk = prev.gx.blk || 0;
          if (blk > 0) blk -= 1;

          if (acc >= GOV_DAY_SEC) {
            const dailyGross = Math.max(0, inc.gross) * GOV_DAY_SEC;
            const sal = Math.floor(dailyGross * 0.03);
            const el = Math.floor(dailyGross * 0.015);
            const inf = Math.floor(dailyGross * 0.015);
            const total = sal + el + inf;
            const paid = Math.min(nextCash, total);
            nextCash = Math.max(0, nextCash - paid);
            const unpaidEl = Math.max(0, el - Math.max(0, paid - sal));
            if (unpaidEl > 0) blk = Math.max(blk, 90);
            const dayNum = (prev.gx.exp?.n || 0) + 1;
            const msg = `Day ${dayNum}: Paid ₨ ${formatNumber(paid)} of ₨ ${formatNumber(total)} expenses`;
            nextGx = {
              ...prev.gx,
              cond: nextCond,
              acc: 0,
              blk,
              exp: { sal, el, inf, total, paid, n: dayNum, t: now },
              log: [msg, ...prev.gx.log].slice(0, 8),
            };
          } else {
            nextGx = { ...prev.gx, cond: nextCond, acc, blk };
          }
        }

        // Apply pre-rolled passive windfall/fine or reset executive event countdown
        if (nextEv <= 0) {
          nextEv = 150;
          if (passiveEvent?.kind === 'bonus') {
            nextCash = Math.min(1e13, nextCash + passiveEvent.amt);
          } else if (passiveEvent?.kind === 'fine') {
            nextCash = Math.max(0, nextCash - passiveEvent.amt);
          }
        }

        // Push GDP history every 5s
        let nextHist = prev.hist;
        if (tickCountRef.current % 5 === 0) {
          nextHist = [...prev.hist, calculateGdp({ ...prev, cash: nextCash })].slice(-60);
        }

        const updated: GameState = {
          ...prev,
          cash: nextCash,
          taxPool: nextTaxPool,
          day: nextDay,
          hap: nextHap,
          appr: nextAppr,
          pop: nextPop,
          boost: Math.max(0, (prev.boost || 0) - 1),
          ev: nextEv,
          hist: nextHist,
          activeFx: nextActiveFx,
          gx: nextGx,
          subPromo: nextSubPromo,
          t: now,
        };

        if (tickCountRef.current % 8 === 0) {
          saveLocal(updated);
        }
        return updated;
      });

      if (passiveEvent?.kind === 'bonus') {
        addToast(`Trade Windfall! +₨ ${formatNumber(passiveEvent.amt)}`);
      } else if (passiveEvent?.kind === 'fine') {
        addToast(`Grid Maintenance Fee: −₨ ${formatNumber(passiveEvent.amt)}`);
      } else if (triggerDecisionId) {
        const dec = EXEC_DECISIONS.find((d) => d.id === triggerDecisionId);
        if (dec) {
          const quote = getExecDecisionQuote(curSnap, dec.id, tradeTier, nowSrv);
          setDialog({
            title: `Cabinet Briefing: ${dec.title}`,
            body: (
              <div>
                <p style={{ margin: '0 0 10px', fontSize: 13 }}>{dec.summary}</p>
                <div className="notifs" style={{ marginBottom: 4 }}>
                  <div className="notif unread">
                    <b>{dec.options[0].label}</b>
                    <small>
                      Cost: ₨ {formatNumber(quote.spendCost)} · {dec.options[0].hint}
                    </small>
                  </div>
                  <div className="notif">
                    <b>{dec.options[1].label}</b>
                    <small>
                      Gain: +₨ {formatNumber(quote.gainCash)} · {dec.options[1].hint}
                    </small>
                  </div>
                </div>
              </div>
            ),
            actions: [
              {
                label: `${dec.options[0].label} (−₨ ${formatNumber(quote.spendCost)})`,
                variant: dec.options[0].variant,
                onClick: () => {
                  const res = resolveExecutiveDecision(
                    stateRef.current,
                    dec.id,
                    0,
                    tradeTier,
                    Date.now() + serverOffsetMsRef.current,
                  );
                  if (!res.ok) {
                    addToast(res.summary);
                    return;
                  }
                  const nowExec = Date.now() + serverOffsetMsRef.current;
                  stateRef.current = res.state;
                  playSfx('win', !!res.state.set.sfx);
                  triggerBuzz(16, !!res.state.set.vib);
                  setState((prev) => {
                    const recheck = resolveExecutiveDecision(prev, dec.id, 0, tradeTier, nowExec);
                    if (!recheck.ok) return prev;
                    saveLocal(recheck.state);
                    return recheck.state;
                  });
                  scheduleCloudSync(800);
                  addToast(res.summary);
                  setDialog(null);
                },
              },
              {
                label: `${dec.options[1].label} (+₨ ${formatNumber(quote.gainCash)})`,
                variant: dec.options[1].variant,
                onClick: () => {
                  const nowExec = Date.now() + serverOffsetMsRef.current;
                  const res = resolveExecutiveDecision(
                    stateRef.current,
                    dec.id,
                    1,
                    tradeTier,
                    nowExec,
                  );
                  if (res.ok) {
                    stateRef.current = res.state;
                    playSfx('coin', !!res.state.set.sfx);
                    setState((prev) => {
                      const recheck = resolveExecutiveDecision(prev, dec.id, 1, tradeTier, nowExec);
                      if (!recheck.ok) return prev;
                      saveLocal(recheck.state);
                      return recheck.state;
                    });
                    scheduleCloudSync(800);
                    addToast(res.summary);
                  }
                  setDialog(null);
                },
              },
            ],
          });
        }
      }

      // Dirty-aware cloud sync every 60s when tab is visible (Spark Free Plan friendly)
      if (
        tickCountRef.current % 60 === 0 &&
        !document.hidden &&
        uidRef.current &&
        cloudReadyRef.current &&
        !needsOnboardingRef.current &&
        (pendingDirtyRef.current || (isUserActive && now - lastSyncedAtRef.current >= 60_000))
      ) {
        cloudSyncPermDeniedRef.current = false;
        syncRetryCountRef.current = 0;
        void performCloudSync(false);
      }

      // Settle expired outgoing gifts periodically (every 5s) even without a new Firestore trade snapshot
      const curUid = uidRef.current;
      if (
        curUid &&
        cloudReadyRef.current &&
        !settlingTradesRef.current &&
        now - lastSettledTradeCheckRef.current >= 5000 &&
        tradesRef.current.some(
          (t) =>
            (t.from === curUid && t.status === 'pending' && t.expMs > 0 && t.expMs + 1500 <= nowSrv) ||
            (t.from === curUid && (t.status === 'rejected' || t.status === 'expired') && !t.refunded),
        )
      ) {
        lastSettledTradeCheckRef.current = now;
        settlingTradesRef.current = true;
        void settleExpiredTrades(
          tradesRef.current,
          curUid,
          sidRef.current,
          handleKicked,
          serverOffsetMsRef.current,
        ).finally(() => {
          settlingTradesRef.current = false;
        });
      }

      // Tick active Gov Projects in Firestore
      if (curUid && projectsRef.current.length > 0) {
        let liveDirty = false;
        const speedMult = getProjectSpeedMult(stateRef.current, nowSrv);
        const stepMs = Math.max(1000, Math.floor(1000 * speedMult));
        for (const p of projectsRef.current) {
          if (p.status === 'active') {
            const curLive = Math.max(p.progressMs, projLiveRef.current[p.id] || 0);
            const alreadyDoneLocally = curLive >= p.t.dur && p.paid >= PROJECT_STAGES;
            if (alreadyDoneLocally) {
              const lastSync = projLastSyncRef.current[p.id] || 0;
              if (now - lastSync >= 5000 && !projBusyRef.current.has(p.id)) {
                projLastSyncRef.current[p.id] = now;
                projBusyRef.current.add(p.id);
                void finishGovProject(curUid, p.id, 'done', p.t.dur)
                  .catch((err) => {
                    if (/permission-denied/i.test(extractErrorCode(err))) {
                      recordFirestoreError(err, OperationType.UPDATE, `players/${curUid}/projects/${p.id}`);
                    }
                  })
                  .finally(() => projBusyRef.current.delete(p.id));
              }
            } else if (
              serverTimeVerifiedRef.current &&
              !p.pending &&
              p.st > 0 &&
              nowSrv >= p.dl &&
              now - (projStartedLocalAtRef.current[p.id] || 0) >= 30_000
            ) {
              if (!projBusyRef.current.has(p.id)) {
                projBusyRef.current.add(p.id);
                void finishGovProject(curUid, p.id, 'failed')
                  .catch((err) => {
                    if (/permission-denied/i.test(extractErrorCode(err))) {
                      recordFirestoreError(err, OperationType.UPDATE, `players/${curUid}/projects/${p.id}`);
                    }
                  })
                  .finally(() => projBusyRef.current.delete(p.id));
              }
            } else if (isUserActive && !p.pending) {
              const capMs = Math.floor((p.t.dur * p.paid) / PROJECT_STAGES);
              if (curLive < capMs) {
                const nextMs = Math.min(capMs, curLive + stepMs);
                projLiveRef.current[p.id] = nextMs;
                liveDirty = true;
                if (nextMs >= p.t.dur && p.paid >= PROJECT_STAGES && !projBusyRef.current.has(p.id)) {
                  projLastSyncRef.current[p.id] = now;
                  projBusyRef.current.add(p.id);
                  void finishGovProject(curUid, p.id, 'done', p.t.dur)
                    .catch((err) => {
                      if (/permission-denied/i.test(extractErrorCode(err))) {
                        recordFirestoreError(err, OperationType.UPDATE, `players/${curUid}/projects/${p.id}`);
                      }
                    })
                    .finally(() => projBusyRef.current.delete(p.id));
                } else {
                  const lastSync = projLastSyncRef.current[p.id] || 0;
                  const hitStageCap = nextMs >= capMs && p.progressMs < capMs;
                  if ((hitStageCap || now - lastSync >= 30_000) && !projBusyRef.current.has(p.id)) {
                    projLastSyncRef.current[p.id] = now;
                    projBusyRef.current.add(p.id);
                    void tickGovProject(curUid, p.id, nextMs)
                      .catch((err) => {
                        if (/permission-denied/i.test(extractErrorCode(err))) {
                          recordFirestoreError(err, OperationType.UPDATE, `players/${curUid}/projects/${p.id}`);
                        }
                      })
                      .finally(() => projBusyRef.current.delete(p.id));
                  }
                }
              } else if (p.progressMs < capMs && p.paid < PROJECT_STAGES && !projBusyRef.current.has(p.id)) {
                projLastSyncRef.current[p.id] = now;
                projBusyRef.current.add(p.id);
                void tickGovProject(curUid, p.id, capMs)
                  .catch((err) => {
                    if (/permission-denied/i.test(extractErrorCode(err))) {
                      recordFirestoreError(err, OperationType.UPDATE, `players/${curUid}/projects/${p.id}`);
                    }
                  })
                  .finally(() => projBusyRef.current.delete(p.id));
              }
            }
          } else if (!p.claimed && (p.status === 'done' || p.status === 'failed')) {
            if (!projBusyRef.current.has(p.id)) {
              projBusyRef.current.add(p.id);
              void claimGovProject(curUid, p.id)
                .then((resStatus) => {
                  if (resStatus === 'done') {
                    const early = p.rs > 0 && p.dl > p.st && (p.dl - p.rs) / (p.dl - p.st) > 0.5;
                    const profit = Math.ceil(p.t.cost * 0.4 * (early ? 1.5 : 1));
                    const cashReward = p.t.cost + profit;
                    setState((s) => {
                      const next = {
                        ...s,
                        cash: Math.min(1e13, s.cash + cashReward),
                        hap: Math.min(100, s.hap + 3),
                        gx: {
                          ...s.gx,
                          pb: Math.min(0.25, (s.gx.pb || 0) + p.t.pb),
                          ph: Math.min(10, (s.gx.ph || 0) + p.t.ph),
                          log: [
                            `${p.t.n} completed${early ? ' EARLY' : ''}! +₨ ${formatNumber(cashReward)}`,
                            ...s.gx.log,
                          ].slice(0, 8),
                        },
                      };
                      saveLocal(next);
                      return next;
                    });
                    addToast(`${p.t.n} finished! +₨ ${formatNumber(cashReward)}`);
                    scheduleCloudSync(500);
                  } else if (resStatus === 'failed') {
                    const refund = Math.ceil((p.t.cost / PROJECT_STAGES) * p.paid * 0.75);
                    setState((s) => {
                      const next = {
                        ...s,
                        cash: Math.min(1e13, s.cash + refund),
                        gx: {
                          ...s.gx,
                          log: [`${p.t.n} missed deadline (75% refunded)`, ...s.gx.log].slice(0, 8),
                        },
                      };
                      saveLocal(next);
                      return next;
                    });
                    addToast(`${p.t.n} missed deadline — ₨ ${formatNumber(refund)} refunded`);
                    scheduleCloudSync(500);
                  }
                })
                .finally(() => projBusyRef.current.delete(p.id));
            }
          }
        }
        if (liveDirty) {
          setLiveProjectProgress({ ...projLiveRef.current });
        }
      }
    }, 1000);

    return () => window.clearInterval(iv);
  }, [
    gateOpen,
    otherTabLocked,
    kicked,
    tradeTier,
    addToast,
    saveLocal,
    performCloudSync,
    scheduleCloudSync,
  ]);

  // Helper to commit state + persist + sync
  const updateState = useCallback(
    (updater: (prev: GameState) => GameState, syncDelay = 1500) => {
      setState((prev) => {
        const next = updater(prev);
        stateRef.current = next;
        saveLocal(next);
        return next;
      });
      scheduleCloudSync(syncDelay);
    },
    [saveLocal, scheduleCloudSync],
  );

  // Actions (all mutations validate atomically against both live stateRef and functional React prev)
  const handleCollectTax = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const rolls = [Math.random(), Math.random(), Math.random(), Math.random()];
      const makeRng = () => {
        let i = 0;
        return () => rolls[i++ % rolls.length];
      };
      const res = applyCollectTax(stateRef.current, tradeTier, nowSrv, makeRng());
      if (!res.ok) {
        addToast('Tax pool is empty — wait a moment!');
        return;
      }
      stateRef.current = res.state;
      playSfx('coin', !!res.state.set.sfx);
      triggerBuzz(14, !!res.state.set.vib);
      setBurstKey((k) => k + 1);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(`+₨ ${formatNumber(res.collected)}`, rect.left + rect.width / 2, rect.top, '#3fe0b0');

      setState((prev) => {
        const recheck = applyCollectTax(prev, tradeTier, nowSrv, makeRng());
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(1000);

      if (res.bonusApplied) {
        addToast(`Tax Surge added +₨ ${formatNumber(res.bonusAmount)}!`);
      }
      if (res.portDrop.gems > 0) {
        addToast(`Trade Port Export: +${res.portDrop.gems} Gem!`);
      } else if (res.portDrop.sticker) {
        addToast(`Trade Port Export: ${res.portDrop.sticker.n} sticker!`);
      }
    },
    [tradeTier, addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleActivateGemBoost = useCallback(() => {
    const res = applyActivateGemBoost(stateRef.current);
    if (!res.ok) return;
    stateRef.current = res.state;
    playSfx('buy', !!res.state.set.sfx);
    triggerBuzz(18, !!res.state.set.vib);
    setState((prev) => {
      const recheck = applyActivateGemBoost(prev);
      if (!recheck.ok) return prev;
      saveLocal(recheck.state);
      return recheck.state;
    });
    scheduleCloudSync(1000);
    addToast('×2 Boost active for 30s!');
  }, [addToast, saveLocal, scheduleCloudSync]);

  const handleCityBuildingTap = useCallback(
    (clientX?: number, clientY?: number) => {
      const now = Date.now();
      if (now - lastCityTapRef.current < 600) return;
      lastCityTapRef.current = now;
      const cur = stateRef.current;
      const inc = calculateIncome(cur, {
        tradeTier,
        nowMs: now + serverOffsetMsRef.current,
        ignoreTempBoosters: true,
      });
      const bonus = Math.max(5, Math.floor(Math.max(1, inc.net) * 2));
      playSfx('tap', !!cur.set.sfx);
      setBurstKey((k) => k + 1);
      updateState((prev) => ({ ...prev, cash: Math.min(1e13, prev.cash + bonus) }), 3000);
      spawnFloat(
        `+₨ ${formatNumber(bonus)}`,
        clientX ?? window.innerWidth / 2,
        clientY ?? 260,
        '#ffc23d',
      );
    },
    [tradeTier, spawnFloat, updateState],
  );

  const handleBuyBuilding = useCallback(
    (id: string, qty: 1 | 5, e: React.MouseEvent<HTMLButtonElement>) => {
      const def = BUILDINGS.find((b) => b.id === id);
      if (!def) return;
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const res = applyBuyBuilding(stateRef.current, id, qty, nowSrv);
      if (!res.ok) return;

      stateRef.current = res.state;
      playSfx('buy', !!res.state.set.sfx);
      triggerBuzz(15, !!res.state.set.vib);
      setBurstKey((k) => k + 1);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(`${def.n} Lv ${res.newCount}`, rect.left + rect.width / 2, rect.top, '#ffc23d');

      setState((prev) => {
        const recheck = applyBuyBuilding(prev, id, qty, nowSrv);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(1200);
    },
    [spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleFixInfra = useCallback(
    (key: string, full: boolean) => {
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const res = applyFixInfra(stateRef.current, key, full, nowSrv);
      if (!res.ok) return;
      stateRef.current = res.state;
      playSfx('buy', !!res.state.set.sfx);
      setState((prev) => {
        const recheck = applyFixInfra(prev, key, full, nowSrv);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(1200);
      addToast('Infrastructure repaired!');
    },
    [addToast, saveLocal, scheduleCloudSync],
  );

  const handleUpgradeBuilding = useCallback(
    (id: string) => {
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const res = applyUpgradeBuilding(stateRef.current, id, nowSrv);
      if (!res.ok) return;
      stateRef.current = res.state;
      playSfx('buy', !!res.state.set.sfx);
      setState((prev) => {
        const recheck = applyUpgradeBuilding(prev, id, nowSrv);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(1200);
      addToast('Building upgraded!');
    },
    [addToast, saveLocal, scheduleCloudSync],
  );

  const handleUnlockTech = useCallback(
    (techId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      const tDef = TECH_TREE.find((x) => x.id === techId);
      if (!tDef) return;
      const res = applyUnlockTech(stateRef.current, techId);
      if (!res.ok) {
        if (res.reason) addToast(res.reason);
        return;
      }
      stateRef.current = res.state;
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(18, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(tDef.n, rect.left + rect.width / 2, rect.top, '#a88bff');
      setState((prev) => {
        const recheck = applyUnlockTech(prev, techId);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(700);
      addToast(`Researched ${tDef.n}!`);
    },
    [addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleStartProject = useCallback(
    async (type: ProjectType) => {
      const currentUid = uidRef.current;
      if (!currentUid || projCreatingRef.current) return;
      const activeCount = projectsRef.current.filter((p) => p.status === 'active').length;
      if (activeCount >= 3) {
        addToast('Max 3 active projects at once.');
        return;
      }
      const def = GX_PROJECT_TYPES[type];
      const stageCost = Math.ceil(def.cost / PROJECT_STAGES);
      if (stateRef.current.cash < stageCost) {
        addToast('Not enough cash for Stage 1.');
        return;
      }
      projCreatingRef.current = true;
      // Deduct optimistically so the same cash cannot be concurrently spent while awaiting Firestore
      updateState((prev) => ({ ...prev, cash: Math.max(0, prev.cash - stageCost) }), 800);
      try {
        await createGovProject(currentUid, type, (newId) => {
          justCreatedProjIdsRef.current.add(newId);
          projStartedLocalAtRef.current[newId] = Date.now();
        });
        playSfx('buy', !!stateRef.current.set.sfx);
        addToast(`Started ${def.n}!`);
      } catch (err) {
        updateState((prev) => ({ ...prev, cash: Math.min(1e13, prev.cash + stageCost) }), 500);
        recordFirestoreError(err, OperationType.CREATE, `players/${currentUid}/projects`);
        addToast(formatFirebaseError(err));
      } finally {
        projCreatingRef.current = false;
      }
    },
    [addToast, updateState],
  );

  const handlePayProjectStage = useCallback(
    async (projectId: string) => {
      const currentUid = uidRef.current;
      if (!currentUid || projPayBusyRef.current.has(projectId)) return;
      const proj = projectsRef.current.find((p) => p.id === projectId);
      if (!proj || proj.status !== 'active' || proj.paid >= PROJECT_STAGES) return;
      const stageCost = Math.ceil(proj.t.cost / PROJECT_STAGES);
      if (stateRef.current.cash < stageCost) {
        addToast('Not enough cash for next stage.');
        return;
      }
      projPayBusyRef.current.add(projectId);
      updateState((prev) => ({ ...prev, cash: Math.max(0, prev.cash - stageCost) }), 800);
      try {
        await payGovProjectStage(currentUid, projectId, proj.paid);
        playSfx('buy', !!stateRef.current.set.sfx);
        addToast(`Paid stage ${proj.paid + 1}/${PROJECT_STAGES}`);
      } catch (err) {
        updateState((prev) => ({ ...prev, cash: Math.min(1e13, prev.cash + stageCost) }), 500);
        recordFirestoreError(err, OperationType.UPDATE, `players/${currentUid}/projects/${projectId}`);
        addToast(formatFirebaseError(err));
      } finally {
        projPayBusyRef.current.delete(projectId);
      }
    },
    [addToast, updateState],
  );

  const handlePolicyChange = useCallback(
    (key: keyof GameState, value: number) => {
      const bounds = POLICY_BOUNDS[key as string];
      if (!bounds || !Number.isFinite(value)) return;
      const clamped = Math.round(Math.max(bounds[0], Math.min(bounds[1], value)));
      setState((prev) => {
        if (prev[key] === clamped) return prev;
        const next = { ...prev, [key]: clamped };
        stateRef.current = next;
        return next;
      });
      scheduleSaveLocal();
      scheduleCloudSync(2200);
    },
    [scheduleSaveLocal, scheduleCloudSync],
  );

  const handleApplyPreset = useCallback(
    (presetId: 'balanced' | 'revenue' | 'welfare') => {
      playSfx('buy', !!stateRef.current.set.sfx);
      updateState((prev) => applyPolicyPreset(prev, presetId), 1200);
      const label = presetId === 'balanced' ? 'Balanced Growth' : presetId === 'revenue' ? 'High Revenue' : 'Citizen Bliss';
      addToast(`Policy preset applied: ${label}`);
    },
    [addToast, updateState],
  );

  const handleChangeGov = useCallback(
    (govId: string) => {
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const res = applyChangeGov(stateRef.current, govId, nowSrv);
      if (!res.ok || !res.govName) return;
      stateRef.current = res.state;
      playSfx('win', !!res.state.set.sfx);
      setState((prev) => {
        const recheck = applyChangeGov(prev, govId, nowSrv);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(1000);
      addToast(`Switched government to ${res.govName}!`);
    },
    [addToast, saveLocal, scheduleCloudSync],
  );

  const handleFuseSticker = useCallback(
    (stickerId: string) => {
      const roll = Math.random();
      const res = fuseSticker(stateRef.current, stickerId, () => roll);
      if (!res.ok || !res.granted) {
        if (res.reason) addToast(res.reason);
        return;
      }
      stateRef.current = res.state;
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(20, !!res.state.set.vib);
      setState((prev) => {
        const recheck = fuseSticker(prev, stickerId, () => roll);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(1000);
      setDialog({
        title: 'Sticker Fused!',
        body: (
          <div className="stkcard big">
            <StickerArt id={res.granted.id} size={40} />
            <span className="stk-n">{res.granted.n}</span>
            <span className="stk-r" style={{ color: '#ffc93c' }}>
              {'★'.repeat(res.granted.r)}
            </span>
          </div>
        ),
        actions: [{ label: 'Awesome', variant: 'gold', onClick: () => setDialog(null) }],
      });
    },
    [addToast, saveLocal, scheduleCloudSync],
  );

  const handleBuyStickerCrate = useCallback(
    (kind: 'cash' | 'gems', e: React.MouseEvent<HTMLButtonElement>) => {
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const rolls = [Math.random(), Math.random(), Math.random(), Math.random()];
      const makeRng = () => {
        let i = 0;
        return () => rolls[i++ % rolls.length];
      };
      const res = buyStickerCrate(stateRef.current, kind, nowSrv, makeRng());
      if (!res.ok || res.granted.length === 0) {
        if (res.reason) addToast(res.reason);
        return;
      }
      stateRef.current = res.state;
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(18, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(`+${res.granted.length} Sticker`, rect.left + rect.width / 2, rect.top, '#ffc23d');
      setState((prev) => {
        const recheck = buyStickerCrate(prev, kind, nowSrv, makeRng());
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(800);
      setDialog({
        title: kind === 'gems' ? 'Royal Crate Opened!' : 'Standard Crate Opened!',
        body: (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {res.granted.map((st, idx) => (
              <div key={`${st.id}_${idx}`} className="stkcard" style={{ minWidth: 120 }}>
                <StickerArt id={st.id} size={36} />
                <span className="stk-n">{st.n}</span>
                <span className="stk-r" style={{ color: '#ffc93c' }}>
                  {'★'.repeat(st.r)}
                </span>
              </div>
            ))}
          </div>
        ),
        actions: [{ label: 'Collect', variant: 'gold', onClick: () => setDialog(null) }],
      });
    },
    [addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleClaimQuest = useCallback(
    (questId: string, _rewardGems: number, e: React.MouseEvent<HTMLButtonElement>) => {
      const today = dayKeyFor(Date.now() + serverOffsetMsRef.current);
      const rankPos = rankPositionRef.current;
      const res = applyClaimQuest(stateRef.current, questId, today, rankPos);
      if (!res.ok) return;

      stateRef.current = res.state;
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(16, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(`+${res.gemsAdded} Gems`, rect.left + rect.width / 2, rect.top, '#5ccbff');
      setState((prev) => {
        const recheck = applyClaimQuest(prev, questId, today, rankPos);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(1000);
    },
    [spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleClaimMilestone = useCallback(
    (milestoneId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      const res = claimMilestone(stateRef.current, milestoneId);
      if (!res.ok) {
        if (res.reason) addToast(res.reason);
        return;
      }
      stateRef.current = res.state;
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(18, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(`+${res.gemsAdded} Gems`, rect.left + rect.width / 2, rect.top, '#5ccbff');
      setState((prev) => {
        const recheck = claimMilestone(prev, milestoneId);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(800);
      addToast(`Milestone completed! +${res.gemsAdded} Gems`);
    },
    [addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleBuyRank = useCallback(
    (rankId: number, e: React.MouseEvent<HTMLButtonElement>) => {
      const res = applyBuyRank(stateRef.current, rankId);
      if (!res.ok) {
        if (res.reason) addToast(res.reason);
        return;
      }
      const rk = RANKS[rankId];
      stateRef.current = res.state;
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(20, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(rk.n, rect.left + rect.width / 2, rect.top, '#ffc23d');
      setState((prev) => {
        const recheck = applyBuyRank(prev, rankId);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(800);
      addToast(`Promoted to ${rk.n}!`);
    },
    [addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleBuySubscription = useCallback(
    (tierId: SubscriptionTierId, e: React.MouseEvent<HTMLButtonElement>) => {
      const subDef = SUBSCRIPTIONS.find((x) => x.id === tierId);
      if (!subDef) return;
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const res = applyBuySubscription(stateRef.current, subDef, nowSrv);
      if (!res.ok) {
        if (res.reason) addToast(res.reason);
        return;
      }
      stateRef.current = res.state;
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(20, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(subDef.n, rect.left + rect.width / 2, rect.top, '#ffc23d');
      setState((prev) => {
        const recheck = applyBuySubscription(prev, subDef, nowSrv);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(600);
      if (res.paidCost && res.paidCost < subDef.cost) {
        addToast(`${subDef.n} activated for ₨ ${formatNumber(res.paidCost)} (Weekly Deal)!`);
      } else {
        addToast(`${subDef.n} activated!`);
      }
    },
    [addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleClaimSubDaily = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const today = dayKeyFor(nowSrv);
      const res = claimSubscriptionDaily(stateRef.current, today, nowSrv);
      if (!res.ok) {
        if (res.reason) addToast(res.reason);
        return;
      }
      stateRef.current = res.state;
      playSfx('coin', !!res.state.set.sfx);
      triggerBuzz(16, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(
        `+₨ ${formatNumber(res.cashAdded)}${res.gemsAdded > 0 ? ` +${res.gemsAdded} Gems` : ''}`,
        rect.left + rect.width / 2,
        rect.top,
        '#3fe0b0',
      );
      setState((prev) => {
        const recheck = claimSubscriptionDaily(prev, today, nowSrv);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(600);
      addToast(
        `Subscription stipend: +₨ ${formatNumber(res.cashAdded)}${res.gemsAdded > 0 ? ` + ${res.gemsAdded} Gems` : ''}`,
      );
    },
    [addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleBuyBooster = useCallback(
    (boosterId: string, e: React.MouseEvent<HTMLButtonElement>) => {
      const b = BOOSTERS.find((x) => x.id === boosterId);
      if (!b) return;
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const res = applyBuyBooster(stateRef.current, b, nowSrv);
      if (!res.ok) {
        if (res.reason) addToast(res.reason);
        return;
      }
      stateRef.current = res.state;
      playSfx('buy', !!res.state.set.sfx);
      triggerBuzz(16, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(b.n, rect.left + rect.width / 2, rect.top, '#3fe0b0');
      setState((prev) => {
        const recheck = applyBuyBooster(prev, b, nowSrv);
        if (!recheck.ok) return prev;
        saveLocal(recheck.state);
        return recheck.state;
      });
      scheduleCloudSync(800);
      addToast(`${b.n} activated!`);
    },
    [addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  // Auth handlers
  const handleGoogleLogin = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      setAuthMsg('Cloud sign-in is not configured. Play offline or configure Firebase env vars.');
      return;
    }
    setAuthMsg('Signing in with Google…');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, new GoogleAuthProvider());
        } catch (redirectErr) {
          recordAppError({
            source: 'auth',
            code: extractErrorCode(redirectErr) || undefined,
            message: extractErrorMessage(redirectErr),
          });
          setAuthMsg(formatFirebaseError(redirectErr));
        }
      } else {
        if (!/popup-closed-by-user|cancelled-popup-request/i.test(code)) {
          recordAppError({
            source: 'auth',
            code: code || undefined,
            message: extractErrorMessage(err),
          });
        }
        setAuthMsg(formatFirebaseError(err));
      }
    }
  }, []);

  const handleEmailAuth = useCallback(async (email: string, password: string, register: boolean) => {
    if (!isFirebaseConfigured || !auth) {
      setAuthMsg('Cloud sign-in is not configured. Play offline or configure Firebase env vars.');
      return;
    }
    if (!email.trim() || password.length < 6) {
      setAuthMsg('Enter a valid email and password (min 6 chars).');
      return;
    }
    setAuthMsg(register ? 'Creating account…' : 'Signing in…');
    try {
      if (register) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      recordAppError({
        source: 'auth',
        code: extractErrorCode(err) || undefined,
        message: extractErrorMessage(err),
      });
      setAuthMsg(formatFirebaseError(err));
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (auth) {
      await signOut(auth);
    }
    setProfileView(null);
    setSettingsOpen(false);
    addToast('Signed out — switched to offline mode');
  }, [addToast]);

  const handleResetGame = useCallback(() => {
    setDialog({
      title: 'Start New Game?',
      body: <p>This will reset your local offline nation progress back to ₨ 260. This cannot be undone.</p>,
      actions: [
        {
          label: 'Yes, Reset',
          variant: 'red',
          onClick: () => {
            const fresh = freshState();
            setState(fresh);
            saveLocal(fresh);
            setDialog(null);
            setSettingsOpen(false);
            addToast('Started a fresh nation!');
          },
        },
        { label: 'Cancel', onClick: () => setDialog(null) },
      ],
    });
  }, [addToast, saveLocal]);

  const rankPosition = useMemo(() => {
    if (uid && lbLoaded && leaderboard.length > 0) {
      return calculateOnlineRank(state, uid, leaderboard);
    }
    return calculateOfflineRank(state);
  }, [uid, lbLoaded, leaderboard, state]);
  rankPositionRef.current = rankPosition;

  const currentSecond = Math.floor(state.t / 1000);
  const hasPendingGifts = useMemo(
    () => Boolean(uid && trades.some((t) => t.status === 'pending')),
    [uid, trades],
  );
  const activeGiftsSecond = hasPendingGifts ? currentSecond : 0;
  const giftsNowSrvMs = useMemo(
    () => (activeGiftsSecond > 0 ? activeGiftsSecond * 1000 : Date.now()) + serverOffsetMs,
    [activeGiftsSecond, serverOffsetMs],
  );

  const hasPendingIncomingGifts = useMemo(
    () => Boolean(uid && trades.some((t) => t.to === uid && t.status === 'pending')),
    [uid, trades],
  );
  const activeIncomingSecond = hasPendingIncomingGifts ? currentSecond : 0;
  const pendingIncomingGifts = useMemo(() => {
    if (!uid || !hasPendingIncomingGifts) return 0;
    const nowSrv = activeIncomingSecond * 1000 + serverOffsetMs;
    return trades.filter((t) => t.to === uid && t.status === 'pending' && t.expMs > nowSrv).length;
  }, [uid, hasPendingIncomingGifts, trades, activeIncomingSecond, serverOffsetMs]);

  const unreadNotifs = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const openOwnProfile = useCallback(() => {
    const cur = stateRef.current;
    const nowSrv = Date.now() + serverOffsetMsRef.current;
    const activeSub = getActiveSubscription(cur, nowSrv);
    const liveSubTier = activeSub ? activeSub.def.id : '';
    const liveSubExp = activeSub ? activeSub.exp : 0;

    if (uidRef.current && pubProfileRef.current) {
      setProfileView({
        ...pubProfileRef.current,
        subTier: liveSubTier,
        subExp: liveSubExp,
      });
    } else {
      setProfileView({
        id: 'offline',
        username: 'Offline Leader',
        usernameLower: 'offline',
        countryCode: cur.country[0],
        countryName: cur.country[1],
        gdp: calculateGdp(cur),
        cash: cur.cash,
        gems: cur.gems,
        level: playerLevel(cur),
        rank: cur.rank,
        subTier: liveSubTier,
        subExp: liveSubExp,
        stats: {
          buildings: Object.values(cur.b).reduce((a, b) => a + b, 0),
          completedTrades: 0,
          tradesSent: 0,
          tradesReceived: 0,
          cashTraded: 0,
          gemsTraded: 0,
        },
      });
    }
  }, []);

  const leaderboardRef = useRef<PlayerProfile[]>([]);
  leaderboardRef.current = leaderboard;

  const openPlayerProfile = useCallback(
    async (targetUid: string) => {
      const cached = leaderboardRef.current.find((p) => p.id === targetUid);
      if (cached) {
        setProfileView(cached);
        return;
      }
      try {
        const p = await fetchPlayerProfile(targetUid);
        if (p) setProfileView(p);
        else addToast('Player profile not found.');
      } catch (err) {
        addToast(formatFirebaseError(err));
      }
    },
    [addToast],
  );

  const openGiftComposer = useCallback(
    async (targetUid: string) => {
      let target = leaderboardRef.current.find((p) => p.id === targetUid) || null;
      if (!target) {
        target = await fetchPlayerProfile(targetUid).catch(() => null);
      }
      if (!target) {
        addToast('Could not load recipient.');
        return;
      }
      setGiftModal({ mode: 'compose', target, trade: null });
    },
    [addToast],
  );

  const handleSelectCountry = useCallback(
    (c: CountryTuple) => updateState((prev) => ({ ...prev, country: c }), 0),
    [updateState],
  );
  const handlePlayOffline = useCallback(() => setGateOpen(false), []);
  const handleOpenLoginGate = useCallback(() => setGateOpen(true), []);
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);
  const handleCloseNotifs = useCallback(() => setNotifsOpen(false), []);
  const handleCloseProfile = useCallback(() => setProfileView(null), []);
  const handleCloseGiftModal = useCallback(() => setGiftModal(null), []);
  const handleCloseDialog = useCallback(() => setDialog(null), []);
  const handleOpenAuth = useCallback(() => {
    if (uidRef.current) {
      openOwnProfile();
    } else {
      setGateOpen(true);
    }
  }, [openOwnProfile]);
  const handleOpenNotifications = useCallback(() => {
    setNotifsOpen(true);
    const currentUid = uidRef.current;
    if (currentUid) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length) void markNotificationsRead(currentUid, unreadIds).catch(() => {});
    }
  }, [notifications]);
  const handleSaveCloudNow = useCallback(() => void performCloudSync(true), [performCloudSync]);
  const handleStartProjectCb = useCallback(
    (type: ProjectType) => void handleStartProject(type),
    [handleStartProject],
  );
  const handlePayProjectStageCb = useCallback(
    (pid: string) => void handlePayProjectStage(pid),
    [handlePayProjectStage],
  );
  const handleOpenPlayerProfileCb = useCallback(
    (targetUid: string) => void openPlayerProfile(targetUid),
    [openPlayerProfile],
  );
  const handleStartGiftCb = useCallback(
    (targetUid: string) => void openGiftComposer(targetUid),
    [openGiftComposer],
  );
  const handleOpenDm = useCallback((targetUid: string, name: string, cc: string) => {
    const rec = { uid: targetUid, name, cc };
    setSentDmContacts((prev) => (prev.some((x) => x.uid === targetUid) ? prev : [rec, ...prev]));
    setDmRecipient(rec);
    setPlayersSubTab('dm');
  }, []);
  const handleBackDm = useCallback(() => setDmRecipient(null), []);
  const handleSendGlobalChat = useCallback(
    async (text: string) => {
      const currentUid = uidRef.current;
      const profile = pubProfileRef.current;
      const cur = stateRef.current;
      if (!currentUid || !profile) return false;
      try {
        await sendGlobalChatMessage({
          uid: currentUid,
          username: profile.username,
          countryCode: cur.country[0],
          rank: cur.rank,
          text,
        });
        return true;
      } catch (err) {
        recordFirestoreError(err, OperationType.CREATE, 'globalChat');
        addToast(formatFirebaseError(err));
        return false;
      }
    },
    [addToast],
  );
  const handleSendDm = useCallback(
    async (text: string) => {
      const currentUid = uidRef.current;
      const profile = pubProfileRef.current;
      const cur = stateRef.current;
      if (!currentUid || !profile || !dmRecipient) return false;
      try {
        await sendDirectMessage({
          fromUid: currentUid,
          fromName: profile.username,
          fromCc: cur.country[0],
          toUid: dmRecipient.uid,
          text,
          notify: true,
        });
        setSentDmContacts((prev) =>
          prev.some((x) => x.uid === dmRecipient.uid) ? prev : [dmRecipient, ...prev],
        );
        return true;
      } catch (err) {
        recordFirestoreError(err, OperationType.CREATE, `dms/${dmRecipient.uid}`);
        addToast(formatFirebaseError(err));
        return false;
      }
    },
    [addToast, dmRecipient],
  );
  const handleOpenGiftCompose = useCallback(
    (target: PlayerProfile) => setGiftModal({ mode: 'compose', target, trade: null }),
    [],
  );
  const handleOpenGiftReview = useCallback(
    (tr: TradeOffer) => setGiftModal({ mode: 'review', target: null, trade: tr }),
    [],
  );
  const handleAcceptTrade = useCallback(
    async (id: string) => {
      try {
        const res = await acceptGiftOffer(id, sidRef.current, handleKicked, serverOffsetMsRef.current);
        if (res.status === 'accepted') {
          addToast('Gift accepted!');
        } else if (res.status === 'expired') {
          addToast('This gift has already expired.');
        } else {
          addToast(`Gift is already ${res.status}.`);
        }
      } catch (err) {
        recordFirestoreError(err, OperationType.UPDATE, `trades/${id}`);
        addToast(formatFirebaseError(err));
      }
    },
    [addToast, handleKicked],
  );
  const handleRejectTrade = useCallback(
    async (id: string) => {
      try {
        const res = await rejectGiftOffer(id, sidRef.current, handleKicked, serverOffsetMsRef.current);
        if (res.status === 'rejected') {
          addToast('Gift declined');
        } else if (res.status === 'expired') {
          addToast('This gift has already expired.');
        } else {
          addToast(`Gift is already ${res.status}.`);
        }
      } catch (err) {
        recordFirestoreError(err, OperationType.UPDATE, `trades/${id}`);
        addToast(formatFirebaseError(err));
      }
    },
    [addToast, handleKicked],
  );
  const handleCancelTrade = useCallback(
    async (id: string) => {
      try {
        const status = await endSenderOffer(id, 'cancelled', sidRef.current, handleKicked, serverOffsetMsRef.current);
        if (status === 'cancelled') {
          addToast('Gift cancelled & refunded');
        } else if (status === 'expired') {
          addToast('Gift expired & refunded');
        } else {
          addToast(`Gift is already ${status}.`);
        }
      } catch (err) {
        recordFirestoreError(err, OperationType.UPDATE, `trades/${id}`);
        addToast(formatFirebaseError(err));
      }
    },
    [addToast, handleKicked],
  );
  const handleSearchPlayers = useCallback(async (q: string) => {
    const currentUid = uidRef.current;
    if (!currentUid) return [];
    try {
      return await searchPlayersByUsername(q, currentUid);
    } catch {
      return [];
    }
  }, []);

  const currentTabMeta = TAB_META[tab];
  const srvMinute = Math.floor((state.t + serverOffsetMs) / 60_000);
  const dayKey = useMemo(() => dayKeyFor(srvMinute * 60_000), [srvMinute]);

  // Daily gift limit listener (automatically rotates at midnight Asia/Karachi time)
  useEffect(() => {
    if (!uid || !cloudReady || needsOnboarding || kicked || !db) return;
    const dlKey = `${uid}_${dayKey}`;
    const unsub = onSnapshot(
      doc(db, 'dailyLimits', dlKey),
      (snap) => {
        setSentToday(snap.exists() ? Number(snap.data()?.count || 0) : 0);
      },
      (err) => handleSnapshotError(`dailyLimits/${dlKey}`, err),
    );
    return () => unsub();
  }, [uid, cloudReady, needsOnboarding, kicked, dayKey, handleSnapshotError]);

  if (otherTabLocked || kicked) {
    return (
      <div className="modal" role="alertdialog" aria-modal="true">
        <div className="card">
          <h2>{kicked ? 'Signed in elsewhere' : 'Game already open'}</h2>
          <p>
            {kicked
              ? 'Another browser session took over this account to prevent duplicate cloud saves.'
              : 'Country Economy Tycoon is active in another tab.'}
          </p>
          <div className="acts">
            <button type="button" className="btn gold" onClick={() => window.location.reload()}>
              Use Here Instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {gateOpen && (
        <LoginGate
          selectedCountry={state.country}
          onSelectCountry={handleSelectCountry}
          onGoogleLogin={handleGoogleLogin}
          onEmailAuth={handleEmailAuth}
          onPlayOffline={handlePlayOffline}
          authMsg={authMsg}
        />
      )}

      <div id="toast" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id}>{t.text}</div>
        ))}
      </div>

      {floats.map((f) => (
        <div
          key={f.id}
          className="fl"
          style={{ left: f.x, top: f.y, color: f.color }}
        >
          {f.text}
        </div>
      ))}

      <aside className="brand" aria-hidden="true">
        <div className="bm">
          <Landmark size={22} strokeWidth={2.2} />
        </div>
        <div>
          <b>Country Economy</b>
          <small>Tycoon</small>
        </div>
      </aside>

      <div id="app">
        <TopBar
          state={state}
          uid={uid}
          pubProfile={pubProfile}
          rankPosition={rankPosition}
          unreadNotifs={unreadNotifs}
          onOpenProfile={openOwnProfile}
          onOpenSettings={handleOpenSettings}
          onOpenNotifications={handleOpenNotifications}
          onOpenAuth={handleOpenAuth}
        />

        <div className="main">
          {(!isMobile || tab === 'build') && (
            <HeroPanel
              state={state}
              tradeTier={tradeTier}
              serverOffsetMs={serverOffsetMs}
              showCity={!isMobile || tab === 'build'}
              burstKey={burstKey}
              onCollectTax={handleCollectTax}
              onActivateGemBoost={handleActivateGemBoost}
              onCityBuildingTap={handleCityBuildingTap}
            />
          )}

          <div className="card">
            <div className="tabs">
              <div className="ttl-ic">
                <TabIcon tab={tab} size={20} />
              </div>
              <div>
                <b>{currentTabMeta.label}</b>
                <small>{currentTabMeta.subtitle}</small>
              </div>
            </div>

            {tab === 'build' && (
              <BuildTab
                state={state}
                serverOffsetMs={serverOffsetMs}
                onBuyBuilding={handleBuyBuilding}
              />
            )}
            {tab === 'gov' && (
              <GovtTab
                state={state}
                subTab={govtSubTab}
                uid={uid}
                projects={projects}
                liveProjectProgress={liveProjectProgress}
                serverOffsetMs={serverOffsetMs}
                isUserActive={state.t - lastActivityRef.current < 120_000}
                onChangeSubTab={setGovtSubTab}
                onFixInfra={handleFixInfra}
                onUpgradeBuilding={handleUpgradeBuilding}
                onStartProject={handleStartProjectCb}
                onPayProjectStage={handlePayProjectStageCb}
                onUnlockTech={handleUnlockTech}
              />
            )}
            {tab === 'policy' && (
              <PolicyTab
                state={state}
                uid={uid}
                serverOffsetMs={serverOffsetMs}
                onPolicyChange={handlePolicyChange}
                onApplyPreset={handleApplyPreset}
                onChangeGov={handleChangeGov}
                onResetGame={handleResetGame}
                onSaveCloudNow={handleSaveCloudNow}
              />
            )}
            {tab === 'rivals' && (
              <PlayersTab
                state={state}
                uid={uid}
                ready={cloudReady}
                subTab={playersSubTab}
                leaderboard={leaderboard}
                lbLoaded={lbLoaded}
                serverOffsetMs={serverOffsetMs}
                globalChat={globalChat}
                dmMessages={dmMessages}
                dmRecipient={dmRecipient}
                recentDms={recentDms}
                onChangeSubTab={setPlayersSubTab}
                onOpenLogin={handleOpenLoginGate}
                onOpenProfile={handleOpenPlayerProfileCb}
                onStartGift={handleStartGiftCb}
                onOpenDm={handleOpenDm}
                onBackDm={handleBackDm}
                onSendGlobalChat={handleSendGlobalChat}
                onSendDm={handleSendDm}
              />
            )}
            {tab === 'stickers' && (
              <StickersTab
                state={state}
                serverOffsetMs={serverOffsetMs}
                onFuseSticker={handleFuseSticker}
                onBuyCrate={handleBuyStickerCrate}
              />
            )}
            {tab === 'trade' && (
              <GiftsTab
                uid={uid}
                ready={cloudReady}
                subTab={giftsSubTab}
                trades={trades}
                leaderboard={leaderboard}
                sentToday={sentToday}
                nowSrvMs={giftsNowSrvMs}
                onChangeSubTab={setGiftsSubTab}
                onOpenLogin={handleOpenLoginGate}
                onOpenGiftCompose={handleOpenGiftCompose}
                onOpenGiftReview={handleOpenGiftReview}
                onAcceptTrade={handleAcceptTrade}
                onRejectTrade={handleRejectTrade}
                onCancelTrade={handleCancelTrade}
                onSearchPlayers={handleSearchPlayers}
              />
            )}
            {tab === 'quest' && (
              <QuestsTab
                state={state}
                dayKey={dayKey}
                rankPosition={rankPosition}
                onClaimQuest={handleClaimQuest}
                onClaimMilestone={handleClaimMilestone}
              />
            )}
            {tab === 'shop' && (
              <ShopTab
                state={state}
                subTab={shopSubTab}
                dayKey={dayKey}
                serverOffsetMs={serverOffsetMs}
                onChangeSubTab={setShopSubTab}
                onBuyRank={handleBuyRank}
                onBuySubscription={handleBuySubscription}
                onClaimSubDaily={handleClaimSubDaily}
                onBuyBooster={handleBuyBooster}
              />
            )}
          </div>
        </div>
      </div>

      <NavBar
        activeTab={tab}
        pendingIncomingGifts={pendingIncomingGifts}
        onSelectTab={setTab}
      />

      {appErrors.length > 0 && (
        <button
          type="button"
          id="errPill"
          onClick={() => setErrorLogOpen(true)}
        >
          ⚠️ {appErrors.length} {appErrors.length === 1 ? 'Error' : 'Errors'}
        </button>
      )}

      {uid && cloudReady && (
        <button
          type="button"
          id="cloudPill"
          className={cloudStatus.cls}
          onClick={() => {
            if (cloudStatus.cls === 'bad') setErrorLogOpen(true);
            else handleSaveCloudNow();
          }}
        >
          {cloudStatus.text}
        </button>
      )}

      <ProfileModal
        profile={profileView}
        isMe={!profileView || profileView.id === uid || profileView.id === 'offline'}
        uid={uid}
        onClose={handleCloseProfile}
        onGift={(p) => {
          setProfileView(null);
          setGiftModal({ mode: 'compose', target: p, trade: null });
        }}
        onMessage={(p) => {
          setProfileView(null);
          const rec = { uid: p.id, name: p.username, cc: p.countryCode };
          setSentDmContacts((prev) => (prev.some((x) => x.uid === rec.uid) ? prev : [rec, ...prev]));
          setDmRecipient(rec);
          setTab('rivals');
          setPlayersSubTab('dm');
        }}
        onSignOut={() => void handleSignOut()}
      />

      <SettingsModal
        open={settingsOpen}
        state={state}
        uid={uid}
        email={user?.email || null}
        errorCount={appErrors.length}
        onToggleSetting={(key) => {
          updateState((prev) => ({
            ...prev,
            set: { ...prev.set, [key]: prev.set[key] ? 0 : 1 },
          }), 1500);
        }}
        onOpenAuth={() => {
          setSettingsOpen(false);
          if (uid) openOwnProfile();
          else setGateOpen(true);
        }}
        onOpenErrorLog={() => {
          setSettingsOpen(false);
          setErrorLogOpen(true);
        }}
        onRequestReset={handleResetGame}
        onClose={handleCloseSettings}
      />

      <ErrorLogModal
        open={errorLogOpen}
        errors={appErrors}
        uid={uid}
        onRetrySync={() => {
          setErrorLogOpen(false);
          handleSaveCloudNow();
        }}
        onClear={() => {
          clearErrorLog();
          addToast('Error log cleared');
        }}
        onCopied={() => addToast('Error details copied!')}
        onClose={() => setErrorLogOpen(false)}
      />

      <NotificationsModal
        open={notifsOpen}
        notifications={notifications}
        onClose={handleCloseNotifs}
        onSelectNotification={(n) => {
          setNotifsOpen(false);
          if (n.type === 'dm' && n.from) {
            setDmRecipient({ uid: n.from, name: n.fromName || 'Player', cc: n.fromCc || '' });
            setTab('rivals');
            setPlayersSubTab('dm');
          } else {
            setTab('trade');
            setGiftsSubTab(n.type === 'new_offer' ? 'in' : 'hist');
          }
        }}
      />

      <OnboardingModal
        open={needsOnboarding}
        defaultCountryCode={state.country?.[0]}
        onCheckUsername={checkUsernameAvailability}
        onSubmitProfile={async (username, cc) => {
          try {
            const res = await createPlayerProfile(username, cc, stateRef.current, sidRef.current, handleKicked);
            walletRevRef.current = res.walletRev;
            cloudSyncPermDeniedRef.current = false;
            permWarnShownRef.current = false;
            syncRetryCountRef.current = 0;
            const p = await fetchPlayerProfile(uid!);
            if (p) setPubProfile(p);
            const chosen = COUNTRIES.find((c) => c[0] === cc) || COUNTRIES[0];
            needsOnboardingRef.current = false;
            cloudReadyRef.current = true;
            setState((prev) => {
              const base = res.restoredSave ? migrateState(res.restoredSave) : prev;
              const next = { ...base, country: chosen };
              stateRef.current = next;
              saveLocal(next);
              return next;
            });
            setNeedsOnboarding(false);
            setCloudReady(true);
            scheduleCloudSync(500);
            addToast(`Welcome, ${username}!`);
          } catch (err) {
            recordFirestoreError(err, OperationType.CREATE, `players/${uid}`);
            addToast(formatFirebaseError(err));
          }
        }}
        onSignOut={() => void handleSignOut()}
      />

      {giftModal && uid && (
        <GiftTableModal
          mode={giftModal.mode}
          state={state}
          uid={uid}
          myName={pubProfile?.username || 'You'}
          myCountryCode={state.country[0]}
          target={giftModal.target}
          trade={giftModal.trade}
          serverOffsetMs={serverOffsetMs}
          onClose={handleCloseGiftModal}
          onSendGift={async (payload) => {
            try {
              if (!serverTimeVerifiedRef.current && db) {
                const sesRef = doc(db, 'players', uid, 'private', 'session');
                await setDoc(sesRef, { sid: sidRef.current, t: serverTimestamp() });
                const sesSnap = await getDocFromServer(sesRef).catch(() => null);
                if (sesSnap && sesSnap.exists()) {
                  const srvMs = timestampToMs(sesSnap.data()?.t);
                  if (srvMs > 0) updateServerOffset(srvMs);
                }
              }
              await createGiftOffer({
                ...payload,
                sid: sidRef.current,
                serverOffsetMs: serverOffsetMsRef.current,
                onKicked: handleKicked,
              });
              addToast('Gift sent!');
              return true;
            } catch (err) {
              recordFirestoreError(err, OperationType.CREATE, 'trades');
              addToast(formatFirebaseError(err));
              return false;
            }
          }}
          onAcceptTrade={handleAcceptTrade}
          onRejectTrade={handleRejectTrade}
          onCancelTrade={handleCancelTrade}
        />
      )}

      <DialogModal dialog={dialog} onClose={handleCloseDialog} />
    </>
  );
}
