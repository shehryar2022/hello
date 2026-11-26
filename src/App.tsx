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
import { CashCoinIcon, Landmark, StickerArt, TabIcon } from './components/GameIcons';
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
import { UpdateRequiredModal } from './components/modals/UpdateRequiredModal';
import { NavBar, TopBar } from './components/TopBar';
import { BuildTab } from './components/tabs/BuildTab';
import { GiftsTab } from './components/tabs/GiftsTab';
import { GovtTab } from './components/tabs/GovtTab';
import { PlayersTab } from './components/tabs/PlayersTab';
import { PolicyTab } from './components/tabs/PolicyTab';
import { ProvincesTab } from './components/tabs/ProvincesTab';
import { QuestsTab } from './components/tabs/QuestsTab';
import { ShopTab } from './components/tabs/ShopTab';
import { StickersTab } from './components/tabs/StickersTab';
import {
  buildInitialCloudState,
  buildOnboardingSeedState,
  hasOfflineSave,
  isSessionStillValid,
  readAccountSave,
  writeAccountSave,
} from './firebase/accountSession';
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
  fetchProvinceLeaderboard,
  finishGovProject,
  markNotificationsRead,
  normalizeProject,
  payGovProjectStage,
  recordProvinceTxAndSyncOnline,
  rejectGiftOffer,
  searchPlayersByUsername,
  sendDirectMessage,
  sendGlobalChatMessage,
  sendHeartbeat,
  settleExpiredTrades,
  syncProvinceLeaderboardEntries,
  syncSaveToCloud,
  tickGovProject,
  timestampToMs,
} from './firebase/api';
import {
  auth,
  db,
  FIREBASE_CONFIG,
  formatFirebaseError,
  isFirebaseConfigured,
  OperationType,
  recordFirestoreError,
} from './firebase/config';
import {
  clearErrorLog,
  extractErrorCode,
  extractErrorMessage,
  formatErrorLogReport,
  getErrorLog,
  installGlobalErrorListeners,
  recordAppError,
  subscribeErrorLog,
} from './firebase/errorLog';
import {
  filterAndSortLeaderboard,
  isHeartbeatDue,
  shouldRefreshPresenceQuery,
} from './firebase/presence';
import {
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
  canBuySubscription,
  claimMilestone,
  claimSubscriptionDaily,
  cleanStickersMap,
  computeDailyAndOfflineChecks,
  formatNumber,
  freshState,
  fuseSticker,
  getActiveSubscription,
  getExecDecisionQuote,
  getInfraDecayMult,
  getProjectSpeedMult,
  getSubscriptionPrice,
  getTaxPoolCapSeconds,
  migrateState,
  playerLevel,
  POLICY_BOUNDS,
  resolveExecutiveDecision,
  rollWeeklySubPromo,
  rotateDailyQuestsIfNeeded,
  selectDailyQuestIds,
  shouldRunOfflineEntryCheck,
  targetHappiness,
  tierOfCompletedTrades,
  type DailyOfflineCheckResult,
} from './game/rules';
import {
  buildCacheBustedUrl,
  clearAppCachesBeforeReload,
  clearUpdateReloadGuardIfMatched,
  evaluateUpdateReloadGuard,
  fetchLatestVersion,
  getRunningAppVersion,
  isNewerVersionDeployed,
  recordUpdateReloadAttempt,
  VERSION_BROADCAST_CHANNEL,
  VERSION_POLL_INTERVAL_MS,
} from './game/versionCheck';
import {
  applyAllocateProvinceBudget,
  applyCustomizeProvince,
  applyRebalanceProvinceBudget,
  applyUnlockProvince,
  buildProvinceLeaderboardEntries,
  buildProvinceLeaderboardFingerprint,
  stepProvincesTick,
} from './game/province';
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
  ProvinceBudgetCategory,
  ProvinceCustomizationInput,
  ProvinceLeaderboardCategory,
  ProvinceLeaderboardEntry,
  ProvincesSubTab,
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
const HAS_FIREBASE_AUTH = Boolean(isFirebaseConfigured && auth && db);

export default function App() {
  // Never preload offline shared localStorage before Firebase auth resolves when Firebase is configured
  const [state, setState] = useState<GameState>(() =>
    HAS_FIREBASE_AUTH ? freshState() : readAccountSave(null) || freshState(),
  );
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  const [tab, setTab] = useState<TabId>('build');
  const [govtSubTab, setGovtSubTab] = useState<GovtSubTab>('infra');
  const [provincesSubTab, setProvincesSubTab] = useState<ProvincesSubTab>('overview');
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('prov_1');
  const [provUnlockBusy, setProvUnlockBusy] = useState(false);
  const [provLbCat, setProvLbCat] = useState<ProvinceLeaderboardCategory>('overall');
  const [provLbEntries, setProvLbEntries] = useState<ProvinceLeaderboardEntry[]>([]);
  const [provLbLoading, setProvLbLoading] = useState(false);
  const [playersSubTab, setPlayersSubTab] = useState<PlayersSubTab>('lb');
  const [giftsSubTab, setGiftsSubTab] = useState<GiftsSubTab>('in');
  const [shopSubTab, setShopSubTab] = useState<ShopSubTab>('rank');

  const [gateOpen, setGateOpen] = useState<boolean>(() => {
    if (HAS_FIREBASE_AUTH) return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') return false;
    return !hasOfflineSave();
  });
  const gateOpenRef = useRef<boolean>(gateOpen);
  gateOpenRef.current = gateOpen;

  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  userRef.current = user;
  const [uid, setUid] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState<boolean>(() => !HAS_FIREBASE_AUTH);
  const authResolvedRef = useRef<boolean>(authResolved);
  authResolvedRef.current = authResolved;
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
  const notificationsRef = useRef<NotificationItem[]>([]);
  notificationsRef.current = notifications;
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
  const [dismissedErrorId, setDismissedErrorId] = useState<string | null>(null);
  const appErrors = React.useSyncExternalStore(subscribeErrorLog, getErrorLog);

  const [updateAvailable, setUpdateAvailable] = useState<{
    version: string;
    loopDetected: boolean;
  } | null>(null);
  const updateAvailableRef = useRef<boolean>(false);
  updateAvailableRef.current = Boolean(updateAvailable);
  const [refreshingUpdate, setRefreshingUpdate] = useState(false);
  const refreshingUpdateRef = useRef<boolean>(false);
  const lastVersionCheckAtRef = useRef<number>(0);
  const versionChannelRef = useRef<BroadcastChannel | null>(null);

  const sidRef = useRef<string>(`${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  const entryCheckedKeyRef = useRef<string | null>(null);
  const cloudLoadingRef = useRef<boolean>(false);
  const authBusyRef = useRef<boolean>(false);
  const walletRevRef = useRef<number>(0);
  const expectedWalletRevRef = useRef<number | null>(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const serverOffsetMsRef = useRef<number>(0);
  const serverTimeVerifiedRef = useRef<boolean>(false);
  const [presenceEpoch, setPresenceEpoch] = useState(0);
  const leaderboardRawRef = useRef<PlayerProfile[]>([]);
  const lastHeartbeatSuccessAtRef = useRef<number>(0);
  const lastHeartbeatAttemptAtRef = useRef<number>(0);
  const ownLastSeenMsRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());
  const cloudSyncTimerRef = useRef<number | null>(null);
  const syncRetryTimerRef = useRef<number | null>(null);
  const cloudRetryTailTimerRef = useRef<number | null>(null);
  const syncRetryCountRef = useRef<number>(0);
  const lastSyncedAtRef = useRef<number>(0);
  const cloudSyncBusyRef = useRef<boolean>(false);
  const cloudDirtyRef = useRef<boolean>(false);
  const pendingDirtyRef = useRef<boolean>(false);
  const localSaveTimerRef = useRef<number | null>(null);
  const toastTimersRef = useRef<Set<number>>(new Set());
  const floatTimersRef = useRef<Set<number>>(new Set());
  const permWarnShownRef = useRef<boolean>(false);
  const cloudSyncPermDeniedRef = useRef<boolean>(false);
  const cloudSyncQuotaPausedRef = useRef<boolean>(false);
  const quotaPausedAtRef = useRef<number>(0);
  const pubProfileRef = useRef<PlayerProfile | null>(null);
  pubProfileRef.current = pubProfile;
  const uidRef = useRef<string | null>(null);
  uidRef.current = uid;
  const prevAuthUidRef = useRef<string | null | undefined>(undefined);
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
  const projClaimedLocalRef = useRef<Set<string>>(new Set());
  const projCreatingRef = useRef<boolean>(false);
  const justCreatedProjIdsRef = useRef<Set<string>>(new Set());
  const projStartedLocalAtRef = useRef<Record<string, number>>({});
  const projLiveRef = useRef<Record<string, number>>({});
  const projLastSyncRef = useRef<Record<string, number>>({});
  const projPrevTickMsRef = useRef<Record<string, number>>({});
  const lastCityTapRef = useRef<number>(0);
  const settlingTradesRef = useRef<boolean>(false);
  const markingNotifIdsRef = useRef<Set<string>>(new Set());
  const tradesRef = useRef<TradeOffer[]>([]);
  tradesRef.current = trades;
  const lastSettledTradeCheckRef = useRef<number>(0);
  const provUnlockBusyRef = useRef<boolean>(false);
  const provAllocBusyRef = useRef<boolean>(false);
  const subBuyBusyRef = useRef<boolean>(false);
  const lastExpiredSubKeyRef = useRef<string>('');
  const lastProvLbSyncAtRef = useRef<number>(0);
  const lastProvLbHashRef = useRef<string>('');
  const provLbCacheRef = useRef<
    Partial<Record<ProvinceLeaderboardCategory, { entries: ProvinceLeaderboardEntry[]; fetchedAt: number }>>
  >({});
  const rankPositionRef = useRef<number>(1);
  const modalOpenRef = useRef<boolean>(false);
  const anyModalOpen = Boolean(
    dialog || giftModal || settingsOpen || errorLogOpen || notifsOpen || profileView || needsOnboarding,
  );
  modalOpenRef.current = anyModalOpen;

  const updateServerOffset = useCallback((srvMs: number) => {
    if (srvMs > 0 && Number.isFinite(srvMs)) {
      const prevOffset = serverOffsetMsRef.current;
      const wasVerified = serverTimeVerifiedRef.current;
      const next = srvMs - Date.now();
      serverOffsetMsRef.current = next;
      serverTimeVerifiedRef.current = true;
      setServerOffsetMs((prev) => (Math.abs(prev - next) >= 1000 ? next : prev));
      if (shouldRefreshPresenceQuery(prevOffset, next, wasVerified)) {
        const curUid = uidRef.current;
        if (curUid && leaderboardRawRef.current.length > 0) {
          setLeaderboard(filterAndSortLeaderboard(leaderboardRawRef.current, curUid, Date.now() + next));
        }
        setPresenceEpoch((n) => n + 1);
      }
    }
  }, []);

  const triggerHeartbeat = useCallback(async () => {
    const currentUid = uidRef.current;
    const capturedSeq = authSeqRef.current;
    if (
      !currentUid ||
      updateAvailableRef.current ||
      !cloudReadyRef.current ||
      kickedRef.current ||
      needsOnboardingRef.current ||
      cloudSyncBusyRef.current ||
      cloudSyncPermDeniedRef.current ||
      cloudSyncQuotaPausedRef.current
    ) {
      return;
    }
    lastHeartbeatAttemptAtRef.current = Date.now();
    try {
      await sendHeartbeat(currentUid);
      if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
      lastHeartbeatSuccessAtRef.current = Date.now();
    } catch (err) {
      if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
      const code = extractErrorCode(err);
      if (code === 'resource-exhausted') {
        cloudSyncQuotaPausedRef.current = true;
        quotaPausedAtRef.current = Date.now();
        setCloudStatus({ cls: 'bad', text: 'Quota paused' });
      } else if (code === 'permission-denied') {
        cloudSyncPermDeniedRef.current = true;
        setCloudStatus({ cls: 'bad', text: 'Rules blocked sync' });
      }
      if (code !== 'aborted' && code !== 'unavailable' && code !== 'resource-exhausted') {
        recordFirestoreError(err, OperationType.UPDATE, `players/${currentUid}`);
      }
    }
  }, []);

  const addToast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, text }]);
    const tid = window.setTimeout(() => {
      toastTimersRef.current.delete(tid);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
    toastTimersRef.current.add(tid);
  }, []);

  const spawnFloat = useCallback((text: string, x: number, y: number, color = '#ffc23d') => {
    if (!stateRef.current.set.anim) return;
    const clampedX = Math.max(24, Math.min(window.innerWidth - 110, x - 20));
    const clampedY = Math.max(40, Math.min(window.innerHeight - 80, y - 24));
    const id = Date.now() + Math.random();
    setFloats((prev) => [...prev.slice(-10), { id, text, x: clampedX, y: clampedY, color }]);
    const tid = window.setTimeout(() => {
      floatTimersRef.current.delete(tid);
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 950);
    floatTimersRef.current.add(tid);
  }, []);

  const saveLocal = useCallback((next: GameState, targetUid: string | null = uidRef.current) => {
    if (localSaveTimerRef.current) {
      window.clearTimeout(localSaveTimerRef.current);
      localSaveTimerRef.current = null;
    }
    if (HAS_FIREBASE_AUTH && !authResolvedRef.current) return;
    if (targetUid !== uidRef.current) return;
    if (targetUid !== null && (cloudLoadingRef.current || needsOnboardingRef.current)) return;
    writeAccountSave(targetUid, next);
  }, []);

  const scheduleSaveLocal = useCallback(() => {
    if (HAS_FIREBASE_AUTH && !authResolvedRef.current) return;
    const capturedUid = uidRef.current;
    const capturedSeq = authSeqRef.current;
    if (capturedUid !== null && (cloudLoadingRef.current || needsOnboardingRef.current)) return;
    if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = window.setTimeout(() => {
      localSaveTimerRef.current = null;
      if (!isSessionStillValid(uidRef.current, capturedUid, authSeqRef.current, capturedSeq)) return;
      if (capturedUid !== null && (cloudLoadingRef.current || needsOnboardingRef.current)) return;
      writeAccountSave(capturedUid, stateRef.current);
    }, 300);
  }, []);

  useEffect(() => {
    installGlobalErrorListeners();
    const toastTimers = toastTimersRef.current;
    const floatTimers = floatTimersRef.current;
    return () => {
      if (localSaveTimerRef.current) window.clearTimeout(localSaveTimerRef.current);
      if (cloudSyncTimerRef.current) window.clearTimeout(cloudSyncTimerRef.current);
      if (syncRetryTimerRef.current) window.clearTimeout(syncRetryTimerRef.current);
      if (cloudRetryTailTimerRef.current) window.clearTimeout(cloudRetryTailTimerRef.current);
      for (const tid of toastTimers) window.clearTimeout(tid);
      toastTimers.clear();
      for (const tid of floatTimers) window.clearTimeout(tid);
      floatTimers.clear();
    };
  }, []);

  // Keep body classes synced with animation preference and modal/gate/update state
  useEffect(() => {
    document.body.classList.toggle('noanim', !state.set.anim);
  }, [state.set.anim]);

  useEffect(() => {
    document.body.classList.toggle('modal-open', anyModalOpen);
  }, [anyModalOpen]);

  useEffect(() => {
    document.body.classList.toggle('gate-open', gateOpen);
  }, [gateOpen]);

  useEffect(() => {
    document.body.classList.toggle('update-locked', Boolean(updateAvailable));
    return () => document.body.classList.remove('update-locked');
  }, [updateAvailable]);

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
    async (immediate = false, allowDuringUpdate = false) => {
      const currentUid = uidRef.current;
      const capturedSeq = authSeqRef.current;
      if (!currentUid || !cloudReadyRef.current || kickedRef.current || needsOnboardingRef.current) return;
      if (updateAvailableRef.current && !allowDuringUpdate) return;
      if (!immediate && (cloudSyncPermDeniedRef.current || cloudSyncQuotaPausedRef.current)) return;
      if (immediate) {
        cloudSyncPermDeniedRef.current = false;
        cloudSyncQuotaPausedRef.current = false;
        syncRetryCountRef.current = 0;
      }
      if (syncRetryTimerRef.current) {
        window.clearTimeout(syncRetryTimerRef.current);
        syncRetryTimerRef.current = null;
      }
      if (cloudRetryTailTimerRef.current) {
        window.clearTimeout(cloudRetryTailTimerRef.current);
        cloudRetryTailTimerRef.current = null;
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
          expectedUid: currentUid,
          state: stateRef.current,
          pubStats: pubProfileRef.current?.stats,
          completedTradesCount: completedTradesRef.current,
          rev: walletRevRef.current,
          sid: sidRef.current,
          onKicked: handleKicked,
        });
        if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
        walletRevRef.current = res.wallet.rev;
        syncRetryCountRef.current = 0;
        cloudSyncPermDeniedRef.current = false;
        cloudSyncQuotaPausedRef.current = false;
        quotaPausedAtRef.current = 0;
        permWarnShownRef.current = false;
        lastSyncedAtRef.current = Date.now();
        if (!res.accepted) {
          const next: GameState = {
            ...stateRef.current,
            cash: res.wallet.cash,
            gems: res.wallet.gems,
            stk: res.wallet.stk,
          };
          stateRef.current = next;
          saveLocal(next, currentUid);
          setState((prev) => ({
            ...prev,
            cash: res.wallet.cash,
            gems: res.wallet.gems,
            stk: res.wallet.stk,
          }));
          cloudDirtyRef.current = true;
          void sendHeartbeat(currentUid)
            .then(() => {
              if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
                lastHeartbeatSuccessAtRef.current = Date.now();
              }
            })
            .catch(() => null);
        } else {
          pendingDirtyRef.current = false;
          lastHeartbeatSuccessAtRef.current = Date.now();
        }
        setCloudStatus({ cls: 'ok', text: 'Saved' });
      } catch (err) {
        if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
        const code = (err as { code?: string })?.code || '';
        const msg = err instanceof Error ? err.message : String(err || '');
        const combined = `${code} ${msg}`;
        if (code === 'aborted' && (msg.includes('Another session') || msg.includes('Active account changed'))) {
          if (msg.includes('Another session')) {
            setCloudStatus({ cls: 'bad', text: 'Session displaced' });
          }
        } else if (code === 'failed-precondition' && /not initialized/i.test(msg)) {
          if (db) {
            const pRef = doc(db, 'players', currentUid);
            const pCheck = await getDocFromServer(pRef)
              .catch(() => getDoc(pRef))
              .catch(() => null);
            if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
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
        } else if (code === 'resource-exhausted' || /Quota exceeded/i.test(combined)) {
          cloudSyncQuotaPausedRef.current = true;
          quotaPausedAtRef.current = Date.now();
          cloudDirtyRef.current = false;
          syncRetryCountRef.current = 0;
          recordAppError({
            source: 'sync',
            code: code || 'resource-exhausted',
            path: `players/${currentUid}`,
            message: msg || 'Firebase Spark free plan quota reached — auto-sync paused (saved locally).',
          });
          setCloudStatus({ cls: 'bad', text: 'Quota paused' });
          addToast('Firebase free quota limit reached — progress saved locally.');
        } else if (
          /aborted|unavailable|deadline-exceeded|internal|cancelled|network|offline|unauthenticated|unknown/i.test(
            combined,
          )
        ) {
          if (syncRetryCountRef.current < 3) {
            syncRetryCountRef.current += 1;
            const backoff = Math.min(20_000, 3000 * Math.pow(2, syncRetryCountRef.current - 1));
            setCloudStatus({ cls: 'warn', text: 'Retrying…' });
            syncRetryTimerRef.current = window.setTimeout(() => {
              syncRetryTimerRef.current = null;
              if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
                void performCloudSync(false);
              }
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
              if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
                void performCloudSync(false);
              }
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
        if (
          isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq) &&
          cloudDirtyRef.current &&
          !cloudSyncPermDeniedRef.current &&
          !cloudSyncQuotaPausedRef.current &&
          !updateAvailableRef.current
        ) {
          cloudDirtyRef.current = false;
          cloudRetryTailTimerRef.current = window.setTimeout(() => {
            cloudRetryTailTimerRef.current = null;
            if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
              void performCloudSync(false);
            }
          }, 1200);
        }
      }
    },
    [addToast, handleKicked, saveLocal],
  );

  const scheduleCloudSync = useCallback(
    (delayMs = 10_000) => {
      pendingDirtyRef.current = true;
      const capturedUid = uidRef.current;
      const capturedSeq = authSeqRef.current;
      if (
        !capturedUid ||
        updateAvailableRef.current ||
        !cloudReadyRef.current ||
        kickedRef.current ||
        needsOnboardingRef.current ||
        cloudSyncPermDeniedRef.current ||
        cloudSyncQuotaPausedRef.current
      ) {
        return;
      }
      if (syncRetryCountRef.current > 0) {
        syncRetryCountRef.current = 0;
      }
      if (cloudSyncTimerRef.current) window.clearTimeout(cloudSyncTimerRef.current);
      cloudSyncTimerRef.current = window.setTimeout(() => {
        cloudSyncTimerRef.current = null;
        if (isSessionStillValid(uidRef.current, capturedUid, authSeqRef.current, capturedSeq)) {
          void performCloudSync(false);
        }
      }, delayMs);
    },
    [performCloudSync],
  );

  // Build Welcome / Daily Streak modal from pure daily & offline check outcome
  const buildEntryDialog = useCallback((res: DailyOfflineCheckResult): DialogConfig | null => {
    if (res.dailyGrant) {
      const g = res.dailyGrant;
      return {
        title: `Day ${g.streak} Streak!`,
        body: (
          <div>
            <p>Welcome back! Here is today&apos;s treasury bonus:</p>
            <p style={{ fontSize: 18, color: 'var(--gold)', fontFamily: 'var(--d)' }}>
              +₨ {formatNumber(g.cashAdded)} {g.gemsAdded > 0 ? `· +${g.gemsAdded} Gems` : ''}
              {g.sticker ? ` · ${g.sticker.n}` : ''}
            </p>
            {g.sticker && (
              <div style={{ margin: '8px auto' }}>
                <StickerArt id={g.sticker.id} size={34} />
              </div>
            )}
            {res.offlineCredited >= 1 && (
              <p className="ok" style={{ fontSize: 13 }}>
                Plus +₨ {formatNumber(res.offlineCredited)} offline tax collected while away!
              </p>
            )}
          </div>
        ),
        actions: [{ label: 'Collect', variant: 'gold', onClick: () => setDialog(null) }],
      };
    }
    if (res.offlineCredited >= 1) {
      return {
        title: 'Welcome Back!',
        body: (
          <p>
            Your economy kept running while away!{' '}
            <b className="ok">+₨ {formatNumber(res.offlineCredited)}</b> added to your Tax Pool
            {res.offlineWasCapped ? ' (30m offline cap reached)' : ''}.
          </p>
        ),
        actions: [{ label: 'Awesome', variant: 'mint', onClick: () => setDialog(null) }],
      };
    }
    return null;
  }, []);

  const resetSessionStateForAccountSwitch = useCallback((nextUid: string | null) => {
    if (cloudSyncTimerRef.current) {
      window.clearTimeout(cloudSyncTimerRef.current);
      cloudSyncTimerRef.current = null;
    }
    if (syncRetryTimerRef.current) {
      window.clearTimeout(syncRetryTimerRef.current);
      syncRetryTimerRef.current = null;
    }
    if (localSaveTimerRef.current) {
      window.clearTimeout(localSaveTimerRef.current);
      localSaveTimerRef.current = null;
    }
    if (cloudRetryTailTimerRef.current) {
      window.clearTimeout(cloudRetryTailTimerRef.current);
      cloudRetryTailTimerRef.current = null;
    }

    cloudLoadingRef.current = false;
    kickedRef.current = false;
    setKicked(false);
    walletRevRef.current = 0;
    expectedWalletRevRef.current = null;
    lastSyncedAtRef.current = 0;
    cloudSyncBusyRef.current = false;
    cloudDirtyRef.current = false;
    pendingDirtyRef.current = false;
    syncRetryCountRef.current = 0;
    cloudSyncPermDeniedRef.current = false;
    cloudSyncQuotaPausedRef.current = false;
    quotaPausedAtRef.current = 0;
    permWarnShownRef.current = false;
    completedTradesRef.current = 0;
    settlingTradesRef.current = false;
    lastSettledTradeCheckRef.current = 0;
    serverTimeVerifiedRef.current = false;
    serverOffsetMsRef.current = 0;
    lastHeartbeatSuccessAtRef.current = 0;
    lastHeartbeatAttemptAtRef.current = 0;
    ownLastSeenMsRef.current = 0;
    leaderboardRawRef.current = [];
    projBusyRef.current.clear();
    projPayBusyRef.current.clear();
    projClaimedLocalRef.current.clear();
    projCreatingRef.current = false;
    justCreatedProjIdsRef.current.clear();
    projStartedLocalAtRef.current = {};
    projLiveRef.current = {};
    projLastSyncRef.current = {};
    projPrevTickMsRef.current = {};
    markingNotifIdsRef.current.clear();
    provUnlockBusyRef.current = false;
    provAllocBusyRef.current = false;
    subBuyBusyRef.current = false;
    lastExpiredSubKeyRef.current = '';
    lastProvLbSyncAtRef.current = 0;
    lastProvLbHashRef.current = '';
    provLbCacheRef.current = {};
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
    setProvLbEntries([]);
    setProvLbLoading(false);
    setSelectedProvinceId('prov_1');
    setSentToday(0);
    setLiveProjectProgress({});
    setGlobalChat([]);
    setDmMessages([]);
    setDmRecipient(null);
    setRecentDms([]);
    setSentDmContacts([]);
    setDialog(null);
    setGiftModal(null);
    setProfileView(null);
    setNotifsOpen(false);
    setSettingsOpen(false);
    setCloudStatus({ cls: '', text: 'Saved' });

    if (nextUid === null) {
      const offlineState = readAccountSave(null) || freshState();
      stateRef.current = offlineState;
      setState(offlineState);
    } else {
      const clean = freshState();
      stateRef.current = clean;
      setState(clean);
    }
  }, []);

  const loadCloudSession = useCallback(
    async (u: User, seq: number) => {
      if (!db) return;
      if (!isSessionStillValid(uidRef.current, u.uid, authSeqRef.current, seq)) return;
      cloudLoadingRef.current = true;
      cloudSyncPermDeniedRef.current = false;
      cloudSyncQuotaPausedRef.current = false;
      quotaPausedAtRef.current = 0;
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
        if (!isSessionStillValid(uidRef.current, u.uid, authSeqRef.current, seq)) return;

        // Estimate server clock offset strictly from server (never fall back to stale cache)
        const sesSnap = await getDocFromServer(doc(db, 'players', u.uid, 'private', 'session')).catch(() => null);
        if (!isSessionStillValid(uidRef.current, u.uid, authSeqRef.current, seq)) return;
        if (sesSnap && sesSnap.exists()) {
          const srvMs = timestampToMs(sesSnap.data()?.t);
          if (srvMs > 0) updateServerOffset(srvMs);
        }

        const pRef = doc(db, 'players', u.uid);
        const pSnap = await getDocFromServer(pRef).catch(() => getDoc(pRef));
        if (!isSessionStillValid(uidRef.current, u.uid, authSeqRef.current, seq)) return;
        if (!pSnap.exists()) {
          // Brand new account: ensure clean state and trigger onboarding
          const clean = freshState();
          stateRef.current = clean;
          setState(clean);
          needsOnboardingRef.current = true;
          cloudReadyRef.current = false;
          setNeedsOnboarding(true);
          setCloudReady(false);
          authResolvedRef.current = true;
          setAuthResolved(true);
          return;
        }

        const pData = pSnap.data() as Omit<PlayerProfile, 'id'>;
        setPubProfile({ ...pData, id: u.uid, seen: timestampToMs(pData.lastSeen) });

        // Load authoritative wallet + save strictly from saves/{uid} (never fall back to localStorage)
        const wRef = doc(db, 'players', u.uid, 'private', 'wallet');
        const sRef = doc(db, 'saves', u.uid);
        const [wSnap, sSnap] = await Promise.all([
          getDocFromServer(wRef).catch(() => getDoc(wRef)),
          getDocFromServer(sRef).catch(() => getDoc(sRef)),
        ]);
        if (!isSessionStillValid(uidRef.current, u.uid, authSeqRef.current, seq)) return;

        const cloudSaveRaw = sSnap.exists() ? (sSnap.data()?.save as Partial<GameState> | undefined) : null;
        const loaded = buildInitialCloudState(
          cloudSaveRaw,
          pData.countryCode || 'PK',
          pData.countryName || 'Pakistan',
        );

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
        if (!sSnap.exists()) {
          pendingDirtyRef.current = true;
        }

        const tier = tierOfCompletedTrades(pData.stats?.completedTrades);
        completedTradesRef.current = pData.stats?.completedTrades || 0;

        // Run daily & offline rewards at most once per entry for this cloud account using final cloud state
        const cloudEntryKey = `cloud:${u.uid}`;
        let finalState = loaded;
        if (entryCheckedKeyRef.current !== cloudEntryKey) {
          entryCheckedKeyRef.current = cloudEntryKey;
          const checkedRes = computeDailyAndOfflineChecks(loaded, tier, Date.now() + serverOffsetMsRef.current);
          finalState = checkedRes.state;
          if (
            checkedRes.changed ||
            finalState.lastDaily !== loaded.lastDaily ||
            finalState.taxPool !== loaded.taxPool ||
            finalState.questDay !== loaded.questDay ||
            finalState.subPromo !== loaded.subPromo
          ) {
            pendingDirtyRef.current = true;
          }
          if (checkedRes.promoBannerText) addToast(checkedRes.promoBannerText);
          const entryDlg = buildEntryDialog(checkedRes);
          if (entryDlg) setDialog(entryDlg);
        }

        stateRef.current = finalState;
        setState(finalState);
        needsOnboardingRef.current = false;
        cloudReadyRef.current = true;
        cloudLoadingRef.current = false;
        setNeedsOnboarding(false);
        setCloudReady(true);
        setAuthResolved(true);
        authResolvedRef.current = true;
        writeAccountSave(u.uid, finalState);

        if ((finalState.provinces?.length || 0) > 0) {
          lastProvLbSyncAtRef.current = Date.now();
          const lbEntries = buildProvinceLeaderboardEntries(
            finalState,
            u.uid,
            pData.username || 'Player',
            finalState.country?.[0] || 'PK',
            Date.now() + serverOffsetMsRef.current,
          );
          lastProvLbHashRef.current = buildProvinceLeaderboardFingerprint(lbEntries);
          void syncProvinceLeaderboardEntries(lbEntries, u.uid).catch(() => null);
        }
      } catch (err) {
        if (isSessionStillValid(uidRef.current, u.uid, authSeqRef.current, seq)) {
          setAuthResolved(true);
          authResolvedRef.current = true;
          setCloudStatus({ cls: 'warn', text: 'Cloud load pending' });
          recordFirestoreError(err, OperationType.GET, `players/${u.uid}`);
          addToast(formatFirebaseError(err));
        }
      } finally {
        if (isSessionStillValid(uidRef.current, u.uid, authSeqRef.current, seq)) {
          cloudLoadingRef.current = false;
        }
      }
    },
    [addToast, buildEntryDialog, updateServerOffset],
  );

  // Automatically recover cloud sync, heartbeat, and presence listeners on connectivity or tab resume
  useEffect(() => {
    const onOffline = () => {
      if (uidRef.current && cloudReadyRef.current) {
        setCloudStatus({ cls: 'warn', text: 'Offline (local)' });
      }
    };
    const onOnline = () => {
      if (updateAvailableRef.current) return;
      if (
        userRef.current &&
        !cloudReadyRef.current &&
        !needsOnboardingRef.current &&
        !cloudLoadingRef.current &&
        !kickedRef.current
      ) {
        void loadCloudSession(userRef.current, ++authSeqRef.current);
        return;
      }
      if (
        uidRef.current &&
        cloudReadyRef.current &&
        !kickedRef.current &&
        !needsOnboardingRef.current &&
        !cloudSyncPermDeniedRef.current
      ) {
        syncRetryCountRef.current = 0;
        if (cloudSyncQuotaPausedRef.current && Date.now() - quotaPausedAtRef.current >= 60_000) {
          cloudSyncQuotaPausedRef.current = false;
        }
        setPresenceEpoch((n) => n + 1);
        if (pendingDirtyRef.current && !cloudSyncQuotaPausedRef.current) {
          void performCloudSync(false);
        } else if (!cloudSyncQuotaPausedRef.current) {
          setCloudStatus({ cls: 'ok', text: 'Saved' });
          void triggerHeartbeat();
        }
      }
    };
    document.body.classList.toggle('doc-hidden', document.visibilityState === 'hidden');
    const onVisChange = () => {
      document.body.classList.toggle('doc-hidden', document.visibilityState === 'hidden');
      if (document.visibilityState === 'hidden') {
        saveLocal(stateRef.current, uidRef.current);
        if (
          !updateAvailableRef.current &&
          uidRef.current &&
          cloudReadyRef.current &&
          !kickedRef.current &&
          !needsOnboardingRef.current &&
          !cloudSyncPermDeniedRef.current &&
          !cloudSyncQuotaPausedRef.current &&
          pendingDirtyRef.current &&
          Date.now() - lastSyncedAtRef.current >= 5000
        ) {
          void performCloudSync(false);
        }
      } else if (
        document.visibilityState === 'visible' &&
        !updateAvailableRef.current &&
        uidRef.current &&
        cloudReadyRef.current &&
        !kickedRef.current &&
        !needsOnboardingRef.current
      ) {
        if (isHeartbeatDue(lastHeartbeatSuccessAtRef.current, lastHeartbeatAttemptAtRef.current, Date.now(), 60_000, 15_000)) {
          void triggerHeartbeat();
        }
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisChange);
    return () => {
      document.body.classList.remove('doc-hidden');
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [loadCloudSession, performCloudSync, saveLocal, triggerHeartbeat]);

  // Firebase bootstrap & auth listener
  useEffect(() => {
    if (!HAS_FIREBASE_AUTH || !auth || !db) {
      authResolvedRef.current = true;
      setAuthResolved(true);
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
      const prevUid = prevAuthUidRef.current;
      const nextUid = u?.uid || null;
      const hadSignedInUser = typeof prevUid === 'string' && prevUid.length > 0;
      prevAuthUidRef.current = nextUid;

      uidRef.current = nextUid;
      userRef.current = u;
      setUser(u);
      setUid(nextUid);

      if (prevUid !== nextUid || !u) {
        resetSessionStateForAccountSwitch(nextUid);
      }

      if (!u) {
        if (hadSignedInUser) {
          // Signing out switches strictly to offline storage without reusing signed-in user's state
          entryCheckedKeyRef.current = 'signed-out';
        }
        authResolvedRef.current = true;
        setAuthResolved(true);
        const params = new URLSearchParams(window.location.search);
        const shouldAutoOpen = params.get('autostart') === '1' || hasOfflineSave();
        setGateOpen(!shouldAutoOpen);
        return;
      }

      await loadCloudSession(u, seq);
    });

    return () => unsub();
  }, [loadCloudSession, resetSessionStateForAccountSwitch]);

  // Run daily & offline check ONCE for offline mode only after Firebase auth is confirmed signed-out (or unconfigured)
  useEffect(() => {
    const canRunOffline = shouldRunOfflineEntryCheck({
      isFirebaseConfigured: HAS_FIREBASE_AUTH,
      authResolved,
      uid,
      gateOpen,
      completedEntryKey: entryCheckedKeyRef.current,
    });
    if (!canRunOffline) return;

    entryCheckedKeyRef.current = 'offline';
    const checkedRes = computeDailyAndOfflineChecks(stateRef.current, 0, Date.now() + serverOffsetMsRef.current);
    stateRef.current = checkedRes.state;
    setState(checkedRes.state);
    saveLocal(checkedRes.state, null);
    if (checkedRes.promoBannerText) addToast(checkedRes.promoBannerText);
    const entryDlg = buildEntryDialog(checkedRes);
    if (entryDlg) setDialog(entryDlg);
  }, [authResolved, gateOpen, uid, buildEntryDialog, saveLocal, addToast]);

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
              const cash = capValue(w.cash, 1e13);
              const gems = capValue(w.gems, 1e9);
              const stk = cleanStickersMap(w.stk);
              const next: GameState = { ...stateRef.current, cash, gems, stk };
              stateRef.current = next;
              saveLocal(next);
              setState((prev) => ({ ...prev, cash, gems, stk }));
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
          const d = snap.data({ serverTimestamps: 'estimate' }) as Omit<PlayerProfile, 'id'>;
          const seenMs = timestampToMs(d.lastSeen);
          if (!snap.metadata.hasPendingWrites && seenMs > ownLastSeenMsRef.current) {
            ownLastSeenMsRef.current = seenMs;
            if (!serverTimeVerifiedRef.current) {
              updateServerOffset(seenMs);
            }
          }
          completedTradesRef.current = d.stats?.completedTrades || 0;
          setPubProfile({ ...d, id: snap.id, seen: seenMs });
        },
        (err) => handleSnapshotError(`players/${uid}`, err),
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
          const activeIds = new Set<string>();
          for (const p of normalized) {
            activeIds.add(p.id);
            nextLive[p.id] = Math.max(projLiveRef.current[p.id] || 0, p.progressMs);
          }
          // Prune per-project refs for projects removed from the active snapshot window
          for (const id of Object.keys(projStartedLocalAtRef.current)) {
            if (!activeIds.has(id)) delete projStartedLocalAtRef.current[id];
          }
          for (const id of Object.keys(projLastSyncRef.current)) {
            if (!activeIds.has(id)) delete projLastSyncRef.current[id];
          }
          for (const id of Object.keys(projPrevTickMsRef.current)) {
            if (!activeIds.has(id)) delete projPrevTickMsRef.current[id];
          }
          for (const id of Array.from(projClaimedLocalRef.current)) {
            if (!activeIds.has(id)) projClaimedLocalRef.current.delete(id);
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

    // Initial heartbeat + resilience loop (retries transient failures within 30s, normal cadence 3m)
    if (!pendingDirtyRef.current) {
      void triggerHeartbeat();
    } else {
      const initHbTimer = window.setTimeout(() => {
        if (isHeartbeatDue(lastHeartbeatSuccessAtRef.current, lastHeartbeatAttemptAtRef.current, Date.now(), HEARTBEAT_MS, 5000)) {
          void triggerHeartbeat();
        }
      }, 2500);
      unsubs.push(() => window.clearTimeout(initHbTimer));
    }

    const hb = window.setInterval(() => {
      if (
        !document.hidden &&
        isHeartbeatDue(lastHeartbeatSuccessAtRef.current, lastHeartbeatAttemptAtRef.current, Date.now())
      ) {
        void triggerHeartbeat();
      }
    }, 30_000);

    return () => {
      window.clearInterval(hb);
      unsubs.forEach((u) => u());
    };
  }, [uid, cloudReady, needsOnboarding, kicked, handleKicked, handleSnapshotError, saveLocal, triggerHeartbeat, updateServerOffset]);

  // Dedicated realtime active-players listener + periodic presence pruning & window sliding
  useEffect(() => {
    if (!uid || !cloudReady || needsOnboarding || kicked) return;
    const queries = buildQueryHelpers();
    const unsub = onSnapshot(
      queries.playersActiveQuery(serverOffsetMsRef.current),
      (snap) => {
        const nowEst = Date.now() + serverOffsetMsRef.current;
        const rawRows = snap.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' }) as Omit<PlayerProfile, 'id'>;
          return { ...data, id: d.id, seen: timestampToMs(data.lastSeen) };
        });
        leaderboardRawRef.current = rawRows;
        setLeaderboard(filterAndSortLeaderboard(rawRows, uid, nowEst));
        setLbLoaded(true);
      },
      (err) => {
        setLbLoaded(true);
        handleSnapshotError('players', err);
      },
    );

    const pruneTimer = window.setInterval(() => {
      if (leaderboardRawRef.current.length > 0) {
        const nowEst = Date.now() + serverOffsetMsRef.current;
        setLeaderboard(filterAndSortLeaderboard(leaderboardRawRef.current, uid, nowEst));
      }
    }, 15_000);

    const slideTimer = window.setInterval(() => {
      if (!document.hidden) {
        setPresenceEpoch((n) => n + 1);
      }
    }, HEARTBEAT_MS);

    return () => {
      window.clearInterval(pruneTimer);
      window.clearInterval(slideTimer);
      unsub();
    };
  }, [uid, cloudReady, needsOnboarding, kicked, presenceEpoch, handleSnapshotError]);

  // Direct messages listener for active DM recipient (keyed on primitive UID/name/cc)
  const dmUid = dmRecipient?.uid || '';
  const dmName = dmRecipient?.name || '';
  const dmCc = dmRecipient?.cc || '';
  useEffect(() => {
    if (!uid || !cloudReady || !dmUid) {
      setDmMessages([]);
      return;
    }
    const q = buildQueryHelpers().dmQuery(uid, dmUid);
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
              name: isMe ? pubProfileRef.current?.username || 'You' : dmName,
              cc: isMe ? stateRef.current.country[0] : dmCc,
              rank: 0,
              text: String(x.text || ''),
              ms: timestampToMs(x.createdAt),
            };
          })
          .reverse();
        setDmMessages(msgs);
      },
      (err) => handleSnapshotError(`dms/${dmUid}`, err),
    );
    return () => unsub();
  }, [uid, cloudReady, dmUid, dmName, dmCc, handleSnapshotError]);

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
    if (
      gateOpen ||
      otherTabLocked ||
      kicked ||
      updateAvailable ||
      (HAS_FIREBASE_AUTH && !authResolved) ||
      needsOnboarding
    ) {
      return;
    }

    const iv = window.setInterval(() => {
      if (updateAvailableRef.current) return;
      const now = Date.now();
      const nowSrv = now + serverOffsetMsRef.current;
      const isUserActive = !document.hidden && now - lastActivityRef.current < 120_000;
      tickCountRef.current += 1;

      // Pre-roll event outside setState so React state setters never fire inside updater callbacks
      let triggerDecisionId: string | null = null;
      let passiveEvent: { kind: 'bonus' | 'fine'; amt: number } | null = null;
      const curSnap = stateRef.current;
      const expiredSubTier =
        curSnap.sub?.tier && curSnap.sub?.exp && curSnap.sub.exp <= nowSrv ? curSnap.sub : null;
      const expiredSubKey = expiredSubTier ? `${expiredSubTier.tier}_${expiredSubTier.exp}` : '';
      const shouldNotifyExpiredSub = Boolean(expiredSubKey && lastExpiredSubKeyRef.current !== expiredSubKey);
      if (shouldNotifyExpiredSub) {
        lastExpiredSubKeyRef.current = expiredSubKey;
      }
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
          let nextCond = prev.gx.cond;
          if (tickCountRef.current % 15 === 0) {
            nextCond = { ...prev.gx.cond };
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

        const clearedSub =
          prev.sub?.tier && prev.sub?.exp && prev.sub.exp <= nowSrv ? {} : prev.sub;

        const preProv: GameState = rotateDailyQuestsIfNeeded(
          {
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
            sub: clearedSub,
            subPromo: nextSubPromo,
            t: now,
          },
          nowSrv,
        );

        return stepProvincesTick(preProv, 1, nowSrv);
      });

      if (shouldNotifyExpiredSub && expiredSubTier) {
        const expDef = SUBSCRIPTIONS.find((x) => x.id === expiredSubTier.tier);
        addToast(`${expDef ? expDef.n : 'Subscription'} expired — you can renew anytime in Shop.`);
        scheduleCloudSync(2_000);
      }

      if (tickCountRef.current % 8 === 0) {
        scheduleSaveLocal();
      }

      if (passiveEvent?.kind === 'bonus') {
        addToast(`Trade Windfall! +₨ ${formatNumber(passiveEvent.amt)}`);
      } else if (passiveEvent?.kind === 'fine') {
        addToast(`Grid Maintenance Fee: −₨ ${formatNumber(passiveEvent.amt)}`);
      } else if (triggerDecisionId) {
        const dec = EXEC_DECISIONS.find((d) => d.id === triggerDecisionId);
        if (dec) {
          const quote = getExecDecisionQuote(curSnap, dec.id, tradeTier, nowSrv);
          let decisionHandled = false;
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
                  if (decisionHandled) return;
                  const nowExec = Date.now() + serverOffsetMsRef.current;
                  const res = resolveExecutiveDecision(stateRef.current, dec.id, 0, tradeTier, nowExec);
                  if (!res.ok) {
                    addToast(res.summary);
                    return;
                  }
                  decisionHandled = true;
                  stateRef.current = res.state;
                  saveLocal(res.state);
                  playSfx('win', !!res.state.set.sfx);
                  triggerBuzz(16, !!res.state.set.vib);
                  setState((prev) => {
                    const recheck = resolveExecutiveDecision(prev, dec.id, 0, tradeTier, nowExec);
                    return recheck.ok ? recheck.state : prev;
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
                  if (decisionHandled) return;
                  const nowExec = Date.now() + serverOffsetMsRef.current;
                  const res = resolveExecutiveDecision(stateRef.current, dec.id, 1, tradeTier, nowExec);
                  if (res.ok) {
                    decisionHandled = true;
                    stateRef.current = res.state;
                    saveLocal(res.state);
                    playSfx('coin', !!res.state.set.sfx);
                    setState((prev) => {
                      const recheck = resolveExecutiveDecision(prev, dec.id, 1, tradeTier, nowExec);
                      return recheck.ok ? recheck.state : prev;
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

      // Dirty-aware cloud sync every 120s when tab is visible (Spark Free Plan friendly)
      if (
        tickCountRef.current % 120 === 0 &&
        !document.hidden &&
        uidRef.current &&
        cloudReadyRef.current &&
        !needsOnboardingRef.current &&
        !cloudSyncPermDeniedRef.current &&
        !cloudSyncQuotaPausedRef.current &&
        (pendingDirtyRef.current || (isUserActive && now - lastSyncedAtRef.current >= 120_000))
      ) {
        syncRetryCountRef.current = 0;
        void performCloudSync(false);
        if (now - lastProvLbSyncAtRef.current >= 120_000 && (stateRef.current.provinces?.length || 0) > 0) {
          const entries = buildProvinceLeaderboardEntries(
            stateRef.current,
            uidRef.current,
            pubProfileRef.current?.username || 'Player',
            stateRef.current.country?.[0] || 'PK',
            nowSrv,
          );
          const nextHash = buildProvinceLeaderboardFingerprint(entries);
          if (nextHash && nextHash !== lastProvLbHashRef.current) {
            lastProvLbSyncAtRef.current = now;
            lastProvLbHashRef.current = nextHash;
            void syncProvinceLeaderboardEntries(entries, uidRef.current).catch(() => null);
          }
        }
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
            (t.from === curUid && t.status === 'pending' && t.expMs > 0 && t.expMs + 4500 <= nowSrv) ||
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
        const capturedProjUid = curUid;
        const capturedProjSeq = authSeqRef.current;
        if (
          capturedProjUid &&
          cloudReadyRef.current &&
          projectsRef.current.length > 0 &&
          !cloudSyncPermDeniedRef.current &&
          !cloudSyncQuotaPausedRef.current
        ) {
          let liveDirty = false;
          const speedMult = getProjectSpeedMult(stateRef.current, nowSrv);
          const stepMs = Math.max(1000, Math.floor(1000 * speedMult));
          const onProjWriteErr = (pid: string, err: unknown) => {
            if (!isSessionStillValid(uidRef.current, capturedProjUid, authSeqRef.current, capturedProjSeq)) return;
            const code = extractErrorCode(err);
            if (code === 'resource-exhausted') {
              cloudSyncQuotaPausedRef.current = true;
              quotaPausedAtRef.current = Date.now();
              setCloudStatus({ cls: 'bad', text: 'Quota paused' });
              return;
            }
            if (code === 'permission-denied') {
              cloudSyncPermDeniedRef.current = true;
              setCloudStatus({ cls: 'bad', text: 'Rules blocked sync' });
            }
            if (code !== 'aborted') {
              recordFirestoreError(err, OperationType.UPDATE, `players/${capturedProjUid}/projects/${pid}`);
            }
          };

          for (const p of projectsRef.current) {
            if (p.status === 'active') {
              const curLive = Math.max(p.progressMs, projLiveRef.current[p.id] || 0);
              const alreadyDoneLocally = curLive >= p.t.dur && p.paid >= PROJECT_STAGES;
              if (alreadyDoneLocally) {
                const lastSync = projLastSyncRef.current[p.id] || 0;
                if (now - lastSync >= 10_000 && !projBusyRef.current.has(p.id)) {
                  projLastSyncRef.current[p.id] = now;
                  projBusyRef.current.add(p.id);
                  void finishGovProject(capturedProjUid, p.id, 'done', p.t.dur)
                    .catch((err) => onProjWriteErr(p.id, err))
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
                  void finishGovProject(capturedProjUid, p.id, 'failed')
                    .catch((err) => onProjWriteErr(p.id, err))
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
                    void finishGovProject(capturedProjUid, p.id, 'done', p.t.dur)
                      .catch((err) => onProjWriteErr(p.id, err))
                      .finally(() => projBusyRef.current.delete(p.id));
                  } else {
                    const lastSync = projLastSyncRef.current[p.id] || 0;
                    const hitStageCap = nextMs >= capMs && p.progressMs < capMs;
                    if ((hitStageCap || now - lastSync >= 60_000) && !projBusyRef.current.has(p.id)) {
                      projLastSyncRef.current[p.id] = now;
                      projBusyRef.current.add(p.id);
                      void tickGovProject(capturedProjUid, p.id, nextMs)
                        .catch((err) => onProjWriteErr(p.id, err))
                        .finally(() => projBusyRef.current.delete(p.id));
                    }
                  }
                } else if (p.progressMs < capMs && p.paid < PROJECT_STAGES && !projBusyRef.current.has(p.id)) {
                  projLastSyncRef.current[p.id] = now;
                  projBusyRef.current.add(p.id);
                  void tickGovProject(capturedProjUid, p.id, capMs)
                    .catch((err) => onProjWriteErr(p.id, err))
                    .finally(() => projBusyRef.current.delete(p.id));
                }
              }
            } else if (
              !p.claimed &&
              !projClaimedLocalRef.current.has(p.id) &&
              (p.status === 'done' || p.status === 'failed')
            ) {
              if (!projBusyRef.current.has(p.id)) {
                projBusyRef.current.add(p.id);
                void claimGovProject(capturedProjUid, p.id)
                  .then((resStatus) => {
                    if (!isSessionStillValid(uidRef.current, capturedProjUid, authSeqRef.current, capturedProjSeq)) {
                      return;
                    }
                    if (resStatus) projClaimedLocalRef.current.add(p.id);
                    if (resStatus === 'done') {
                      const early = p.rs > 0 && p.dl > p.st && (p.dl - p.rs) / (p.dl - p.st) > 0.5;
                      const profit = Math.ceil(p.t.cost * 0.4 * (early ? 1.5 : 1));
                      const cashReward = p.t.cost + profit;
                      const applyDoneReward = (s: GameState): GameState => ({
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
                      });
                      const nextSnap = applyDoneReward(stateRef.current);
                      stateRef.current = nextSnap;
                      saveLocal(nextSnap, capturedProjUid);
                      setState(applyDoneReward);
                      addToast(`${p.t.n} finished! +₨ ${formatNumber(cashReward)}`);
                      scheduleCloudSync(150);
                    } else if (resStatus === 'failed') {
                      const refund = Math.ceil((p.t.cost / PROJECT_STAGES) * p.paid * 0.75);
                      const applyFailedRefund = (s: GameState): GameState => ({
                        ...s,
                        cash: Math.min(1e13, s.cash + refund),
                        gx: {
                          ...s.gx,
                          log: [`${p.t.n} missed deadline (75% refunded)`, ...s.gx.log].slice(0, 8),
                        },
                      });
                      const nextSnap = applyFailedRefund(stateRef.current);
                      stateRef.current = nextSnap;
                      saveLocal(nextSnap, capturedProjUid);
                      setState(applyFailedRefund);
                      addToast(`${p.t.n} missed deadline — ₨ ${formatNumber(refund)} refunded`);
                      scheduleCloudSync(150);
                    }
                  })
                  .catch((err) => onProjWriteErr(p.id, err))
                  .finally(() => projBusyRef.current.delete(p.id));
              }
            }
          }
          if (liveDirty && isSessionStillValid(uidRef.current, capturedProjUid, authSeqRef.current, capturedProjSeq)) {
            setLiveProjectProgress({ ...projLiveRef.current });
          }
        }
      }, 1000);

      return () => window.clearInterval(iv);
    }, [
      gateOpen,
      otherTabLocked,
      kicked,
      updateAvailable,
      authResolved,
      needsOnboarding,
      tradeTier,
      addToast,
      saveLocal,
      scheduleSaveLocal,
      performCloudSync,
      scheduleCloudSync,
      handleKicked,
    ]);

  // Helper to commit state + persist + sync (keeps setState updater pure)
  const updateState = useCallback(
    (updater: (prev: GameState) => GameState, syncDelay = 10_000) => {
      if (otherTabLockedRef.current || kickedRef.current || updateAvailableRef.current) return;
      const targetUid = uidRef.current;
      const immediateNext = updater(stateRef.current);
      stateRef.current = immediateNext;
      saveLocal(immediateNext, targetUid);
      setState(updater);
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
      saveLocal(res.state);
      playSfx('coin', !!res.state.set.sfx);
      triggerBuzz(14, !!res.state.set.vib);
      setBurstKey((k) => k + 1);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(`+₨ ${formatNumber(res.collected)}`, rect.left + rect.width / 2, rect.top, '#3fe0b0');

      setState((prev) => {
        const recheck = applyCollectTax(prev, tradeTier, nowSrv, makeRng());
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(10_000);

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
    saveLocal(res.state);
    playSfx('buy', !!res.state.set.sfx);
    triggerBuzz(18, !!res.state.set.vib);
    setState((prev) => {
      const recheck = applyActivateGemBoost(prev);
      return recheck.ok ? recheck.state : prev;
    });
    scheduleCloudSync(10_000);
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
      updateState((prev) => ({ ...prev, cash: Math.min(1e13, prev.cash + bonus) }), 12_000);
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
      saveLocal(res.state);
      playSfx('buy', !!res.state.set.sfx);
      triggerBuzz(15, !!res.state.set.vib);
      setBurstKey((k) => k + 1);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(`${def.n} Lv ${res.newCount}`, rect.left + rect.width / 2, rect.top, '#ffc23d');

      setState((prev) => {
        const recheck = applyBuyBuilding(prev, id, qty, nowSrv);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(10_000);
    },
    [spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleFixInfra = useCallback(
    (key: string, full: boolean) => {
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const res = applyFixInfra(stateRef.current, key, full, nowSrv);
      if (!res.ok) return;
      stateRef.current = res.state;
      saveLocal(res.state);
      playSfx('buy', !!res.state.set.sfx);
      setState((prev) => {
        const recheck = applyFixInfra(prev, key, full, nowSrv);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(10_000);
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
      saveLocal(res.state);
      playSfx('buy', !!res.state.set.sfx);
      setState((prev) => {
        const recheck = applyUpgradeBuilding(prev, id, nowSrv);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(10_000);
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
      saveLocal(res.state);
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(18, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(tDef.n, rect.left + rect.width / 2, rect.top, '#a88bff');
      setState((prev) => {
        const recheck = applyUnlockTech(prev, techId);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(5_000);
      addToast(`Researched ${tDef.n}!`);
    },
    [addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleStartProject = useCallback(
    async (type: ProjectType) => {
      const currentUid = uidRef.current;
      const capturedSeq = authSeqRef.current;
      if (!currentUid || !cloudReadyRef.current || projCreatingRef.current) return;
      const pendingNewCount = Array.from(justCreatedProjIdsRef.current).filter(
        (id) => !projectsRef.current.some((p) => p.id === id),
      ).length;
      const activeCount = projectsRef.current.filter((p) => p.status === 'active').length + pendingNewCount;
      if (activeCount >= 3) {
        addToast('Max 3 active projects at once.');
        return;
      }
      const def = GX_PROJECT_TYPES[type];
      const stageCost = Math.ceil(def.cost / PROJECT_STAGES);
      if (!Number.isFinite(stateRef.current.cash) || stateRef.current.cash < stageCost) {
        addToast('Not enough cash for Stage 1.');
        return;
      }
      projCreatingRef.current = true;
      // Deduct optimistically so the same cash cannot be concurrently spent while awaiting Firestore
      updateState((prev) => ({ ...prev, cash: Math.max(0, prev.cash - stageCost) }), 3_000);
      try {
        await createGovProject(currentUid, type, (newId) => {
          if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
            justCreatedProjIdsRef.current.add(newId);
            projStartedLocalAtRef.current[newId] = Date.now();
          }
        });
        if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
        playSfx('buy', !!stateRef.current.set.sfx);
        addToast(`Started ${def.n}!`);
      } catch (err) {
        if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
        updateState((prev) => ({ ...prev, cash: Math.min(1e13, prev.cash + stageCost) }), 3_000);
        recordFirestoreError(err, OperationType.CREATE, `players/${currentUid}/projects`);
        addToast(formatFirebaseError(err));
      } finally {
        if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
          projCreatingRef.current = false;
        }
      }
    },
    [addToast, updateState],
  );

  const handlePayProjectStage = useCallback(
    async (projectId: string) => {
      const currentUid = uidRef.current;
      const capturedSeq = authSeqRef.current;
      if (!currentUid || !cloudReadyRef.current || projPayBusyRef.current.has(projectId)) return;
      const proj = projectsRef.current.find((p) => p.id === projectId);
      if (!proj || proj.status !== 'active' || proj.paid >= PROJECT_STAGES) return;
      const stageCost = Math.ceil(proj.t.cost / PROJECT_STAGES);
      if (!Number.isFinite(stateRef.current.cash) || stateRef.current.cash < stageCost) {
        addToast('Not enough cash for next stage.');
        return;
      }
      projPayBusyRef.current.add(projectId);
      updateState((prev) => ({ ...prev, cash: Math.max(0, prev.cash - stageCost) }), 3_000);
      try {
        await payGovProjectStage(currentUid, projectId, proj.paid);
        if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
        playSfx('buy', !!stateRef.current.set.sfx);
        addToast(`Paid stage ${proj.paid + 1}/${PROJECT_STAGES}`);
      } catch (err) {
        if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
        updateState((prev) => ({ ...prev, cash: Math.min(1e13, prev.cash + stageCost) }), 3_000);
        recordFirestoreError(err, OperationType.UPDATE, `players/${currentUid}/projects/${projectId}`);
        addToast(formatFirebaseError(err));
      } finally {
        if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
          projPayBusyRef.current.delete(projectId);
        }
      }
    },
    [addToast, updateState],
  );

  const handlePolicyChange = useCallback(
    (key: keyof GameState, value: number) => {
      const bounds = POLICY_BOUNDS[key as string];
      if (!bounds || !Number.isFinite(value)) return;
      const clamped = Math.round(Math.max(bounds[0], Math.min(bounds[1], value)));
      if (stateRef.current[key] === clamped) return;
      stateRef.current = { ...stateRef.current, [key]: clamped };
      setState((prev) => {
        if (prev[key] === clamped) return prev;
        return { ...prev, [key]: clamped };
      });
      scheduleSaveLocal();
      scheduleCloudSync(10_000);
    },
    [scheduleSaveLocal, scheduleCloudSync],
  );

  const handleApplyPreset = useCallback(
    (presetId: 'balanced' | 'revenue' | 'welfare') => {
      playSfx('buy', !!stateRef.current.set.sfx);
      updateState((prev) => applyPolicyPreset(prev, presetId), 8_000);
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
      saveLocal(res.state);
      playSfx('win', !!res.state.set.sfx);
      setState((prev) => {
        const recheck = applyChangeGov(prev, govId, nowSrv);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(8_000);
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
      saveLocal(res.state);
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(20, !!res.state.set.vib);
      setState((prev) => {
        const recheck = fuseSticker(prev, stickerId, () => roll);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(8_000);
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
      saveLocal(res.state);
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(18, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(`+${res.granted.length} Sticker`, rect.left + rect.width / 2, rect.top, '#ffc23d');
      setState((prev) => {
        const recheck = buyStickerCrate(prev, kind, nowSrv, makeRng());
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(8_000);
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
      saveLocal(res.state);
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(16, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(`+${res.gemsAdded} Gems`, rect.left + rect.width / 2, rect.top, '#5ccbff');
      setState((prev) => {
        const recheck = applyClaimQuest(prev, questId, today, rankPos);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(8_000);
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
      saveLocal(res.state);
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(18, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(`+${res.gemsAdded} Gems`, rect.left + rect.width / 2, rect.top, '#5ccbff');
      setState((prev) => {
        const recheck = claimMilestone(prev, milestoneId);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(6_000);
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
      saveLocal(res.state);
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(20, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(rk.n, rect.left + rect.width / 2, rect.top, '#ffc23d');
      setState((prev) => {
        const recheck = applyBuyRank(prev, rankId);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(2_000);
      addToast(`Promoted to ${rk.n}!`);
    },
    [addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  const handleBuySubscription = useCallback(
    (tierId: SubscriptionTierId, e: React.MouseEvent<HTMLButtonElement>) => {
      if (subBuyBusyRef.current) return;
      const subDef = SUBSCRIPTIONS.find((x) => x.id === tierId);
      if (!subDef) return;
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const preCheck = canBuySubscription(stateRef.current, subDef, nowSrv);
      if (!preCheck.ok) {
        addToast(preCheck.reason || 'Unable to purchase subscription');
        return;
      }
      const price = getSubscriptionPrice(stateRef.current, subDef, nowSrv);
      const currentCash = Number.isFinite(stateRef.current.cash)
        ? Math.max(0, Math.floor(stateRef.current.cash))
        : 0;
      const afterCash = Math.max(0, currentCash - price.finalCost);
      const anchorRect = e.currentTarget.getBoundingClientRect();
      const isUpgrade = Boolean(getActiveSubscription(stateRef.current, nowSrv));

      let confirmed = false;
      setDialog({
        title: `${isUpgrade ? 'Upgrade to' : 'Confirm'} ${subDef.n}`,
        body: (
          <div>
            <p>
              Duration: <b>{subDef.durationLabel}</b>
            </p>
            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 16, color: '#ffe082' }}>
              <span>Price:</span>
              <CashCoinIcon size={16} />
              <b>₨ {formatNumber(price.finalCost)} Coins</b>
              {price.promoActive && (
                <span className="dim" style={{ fontSize: 12 }}>
                  (−{price.discountPct}% Weekly Deal)
                </span>
              )}
            </p>
            <p className="dim" style={{ fontSize: 13 }}>
              Balance: ₨ {formatNumber(currentCash)} → ₨ {formatNumber(afterCash)} Coins
            </p>
          </div>
        ),
        actions: [
          {
            label: `Confirm (₨ ${formatNumber(price.finalCost)})`,
            variant: 'gold',
            onClick: () => {
              if (confirmed || subBuyBusyRef.current) return;
              confirmed = true;
              subBuyBusyRef.current = true;
              try {
                setDialog(null);
                const execNow = Date.now() + serverOffsetMsRef.current;
                const res = applyBuySubscription(stateRef.current, subDef, execNow);
                if (!res.ok) {
                  if (res.reason) addToast(res.reason);
                  return;
                }
                stateRef.current = res.state;
                saveLocal(res.state);
                playSfx('win', !!res.state.set.sfx);
                triggerBuzz(20, !!res.state.set.vib);
                const paidCost = res.paidCost ?? price.finalCost;
                spawnFloat(
                  `−₨ ${formatNumber(paidCost)}`,
                  anchorRect.left + anchorRect.width / 2,
                  anchorRect.top,
                  '#ffc23d',
                );
                setState((prev) => {
                  const recheck = applyBuySubscription(prev, subDef, execNow);
                  return recheck.ok ? recheck.state : prev;
                });
                if (uidRef.current && cloudReadyRef.current) {
                  void performCloudSync(true);
                } else {
                  scheduleCloudSync(1_000);
                }
                addToast(
                  `${subDef.n} (${subDef.durationLabel}) activated for ₨ ${formatNumber(paidCost)} Coins!`,
                );
              } finally {
                subBuyBusyRef.current = false;
              }
            },
          },
          {
            label: 'Cancel',
            onClick: () => setDialog(null),
          },
        ],
      });
    },
    [addToast, spawnFloat, saveLocal, performCloudSync, scheduleCloudSync],
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
      saveLocal(res.state);
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
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(5_000);
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
      saveLocal(res.state);
      playSfx('buy', !!res.state.set.sfx);
      triggerBuzz(16, !!res.state.set.vib);
      const rect = e.currentTarget.getBoundingClientRect();
      spawnFloat(b.n, rect.left + rect.width / 2, rect.top, '#3fe0b0');
      setState((prev) => {
        const recheck = applyBuyBooster(prev, b, nowSrv);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(8_000);
      addToast(`${b.n} activated!`);
    },
    [addToast, spawnFloat, saveLocal, scheduleCloudSync],
  );

  // Province Management Handlers & Leaderboard Fetcher
  const refreshProvLeaderboard = useCallback(
    async (category: ProvinceLeaderboardCategory, force = false) => {
      const currentUid = uidRef.current;
      const capturedSeq = authSeqRef.current;
      if (!currentUid || !cloudReadyRef.current) {
        setProvLbEntries([]);
        return;
      }
      const cached = provLbCacheRef.current[category];
      if (!force && cached && Date.now() - cached.fetchedAt < 20_000) {
        setProvLbEntries(cached.entries);
        return;
      }
      setProvLbLoading(true);
      try {
        const list = await fetchProvinceLeaderboard(category, 100);
        if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
          provLbCacheRef.current[category] = { entries: list, fetchedAt: Date.now() };
          setProvLbEntries(list);
        }
      } catch (err) {
        if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
          recordFirestoreError(err, OperationType.LIST, 'provinceLeaderboard');
        }
      } finally {
        if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
          setProvLbLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (tab === 'provinces' && provincesSubTab === 'leaderboard' && uid && cloudReady) {
      void refreshProvLeaderboard(provLbCat, false);
    }
  }, [tab, provincesSubTab, provLbCat, uid, cloudReady, refreshProvLeaderboard]);

  const handleUnlockProvince = useCallback(
    async (input: ProvinceCustomizationInput): Promise<boolean> => {
      if (provUnlockBusyRef.current) return false;
      const currentUid = uidRef.current;
      const capturedSeq = authSeqRef.current;
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const res = applyUnlockProvince(stateRef.current, input, nowSrv);
      if (!res.ok || !res.unlocked) {
        addToast(res.reason || 'Could not charter Province.');
        return false;
      }

      provUnlockBusyRef.current = true;
      setProvUnlockBusy(true);
      stateRef.current = res.state;
      saveLocal(res.state, currentUid);
      playSfx('win', !!res.state.set.sfx);
      triggerBuzz(20, !!res.state.set.vib);
      setSelectedProvinceId(res.unlocked.id);
      setState((prev) => {
        const recheck = applyUnlockProvince(prev, input, nowSrv, res.txId);
        return recheck.ok ? recheck.state : prev;
      });
      addToast(
        res.discountPct > 0
          ? `Chartered ${res.unlocked.name} (${res.discountPct}% Weekly Deal)!`
          : `Chartered ${res.unlocked.name}!`,
      );

      try {
        if (currentUid && cloudReadyRef.current && !needsOnboardingRef.current && !kickedRef.current) {
          if (!cloudSyncPermDeniedRef.current && !cloudSyncQuotaPausedRef.current) {
            try {
              const txRes = await recordProvinceTxAndSyncOnline({
                expectedUid: currentUid,
                txId: res.txId,
                kind: 'unlock',
                provId: res.unlocked.id,
                slot: res.unlocked.slot,
                finalPrice: res.paidPrice,
                discountPct: res.discountPct,
                nextState: stateRef.current,
                pubStats: pubProfileRef.current?.stats,
                completedTradesCount: completedTradesRef.current,
                rev: walletRevRef.current,
                sid: sidRef.current,
                onKicked: handleKicked,
              });
              if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
                return false;
              }
              walletRevRef.current = txRes.walletRev;
              pendingDirtyRef.current = false;
              lastSyncedAtRef.current = Date.now();
              setCloudStatus({ cls: 'ok', text: 'Saved' });
            } catch {
              if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
                scheduleCloudSync(800);
              }
            }
            if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
              return false;
            }
            const lbEntries = buildProvinceLeaderboardEntries(
              stateRef.current,
              currentUid,
              pubProfileRef.current?.username || 'Player',
              stateRef.current.country?.[0] || 'PK',
              nowSrv,
            );
            lastProvLbSyncAtRef.current = Date.now();
            lastProvLbHashRef.current = buildProvinceLeaderboardFingerprint(lbEntries);
            void syncProvinceLeaderboardEntries(lbEntries, currentUid).catch(() => null);
          }
        }
      } finally {
        if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
          provUnlockBusyRef.current = false;
          setProvUnlockBusy(false);
        }
      }
      return true;
    },
    [addToast, handleKicked, saveLocal, scheduleCloudSync],
  );

  const handleCustomizeProvince = useCallback(
    async (provId: string, input: ProvinceCustomizationInput): Promise<boolean> => {
      const currentUid = uidRef.current;
      const res = applyCustomizeProvince(stateRef.current, provId, input);
      if (!res.ok || !res.province) {
        addToast(res.reason || 'Invalid Province details.');
        return false;
      }
      stateRef.current = res.state;
      saveLocal(res.state, currentUid);
      playSfx('buy', !!res.state.set.sfx);
      setState((prev) => {
        const recheck = applyCustomizeProvince(prev, provId, input);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(2500);
      addToast(`Updated ${res.province.name}!`);

      if (currentUid && cloudReadyRef.current && !needsOnboardingRef.current && !kickedRef.current) {
        const lbEntries = buildProvinceLeaderboardEntries(
          stateRef.current,
          currentUid,
          pubProfileRef.current?.username || 'Player',
          stateRef.current.country?.[0] || 'PK',
          Date.now() + serverOffsetMsRef.current,
        );
        lastProvLbSyncAtRef.current = Date.now();
        lastProvLbHashRef.current = buildProvinceLeaderboardFingerprint(lbEntries);
        void syncProvinceLeaderboardEntries(lbEntries, currentUid).catch(() => null);
      }
      return true;
    },
    [addToast, saveLocal, scheduleCloudSync],
  );

  const handleAllocateProvinceBudget = useCallback(
    async (provId: string, category: ProvinceBudgetCategory, amount: number): Promise<boolean> => {
      if (provAllocBusyRef.current) return false;
      const currentUid = uidRef.current;
      const capturedSeq = authSeqRef.current;
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const res = applyAllocateProvinceBudget(stateRef.current, provId, category, amount, nowSrv);
      if (!res.ok) {
        addToast(res.reason || 'Allocation failed.');
        return false;
      }

      provAllocBusyRef.current = true;
      stateRef.current = res.state;
      saveLocal(res.state, currentUid);
      playSfx('coin', !!res.state.set.sfx);
      triggerBuzz(12, !!res.state.set.vib);
      setState((prev) => {
        const recheck = applyAllocateProvinceBudget(prev, provId, category, amount, nowSrv, res.txId);
        return recheck.ok ? recheck.state : prev;
      });
      addToast(`Allocated ₨ ${formatNumber(res.amount)} to ${category}`);

      try {
        if (
          currentUid &&
          cloudReadyRef.current &&
          !needsOnboardingRef.current &&
          !kickedRef.current &&
          !cloudSyncPermDeniedRef.current &&
          !cloudSyncQuotaPausedRef.current
        ) {
          try {
            const targetProv = stateRef.current.provinces?.find((p) => p.id === provId);
            const txRes = await recordProvinceTxAndSyncOnline({
              expectedUid: currentUid,
              txId: res.txId,
              kind: 'alloc',
              provId,
              slot: targetProv?.slot || 1,
              finalPrice: res.amount,
              discountPct: 0,
              nextState: stateRef.current,
              pubStats: pubProfileRef.current?.stats,
              completedTradesCount: completedTradesRef.current,
              rev: walletRevRef.current,
              sid: sidRef.current,
              onKicked: handleKicked,
            });
            if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
              return false;
            }
            walletRevRef.current = txRes.walletRev;
            pendingDirtyRef.current = false;
            lastSyncedAtRef.current = Date.now();
            setCloudStatus({ cls: 'ok', text: 'Saved' });
          } catch {
            if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
              scheduleCloudSync(1200);
            }
          }
        }
      } finally {
        if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
          provAllocBusyRef.current = false;
        }
      }
      return true;
    },
    [addToast, handleKicked, saveLocal, scheduleCloudSync],
  );

  const handleRebalanceProvinceBudget = useCallback(
    (provId: string, fromCat: ProvinceBudgetCategory, toCat: ProvinceBudgetCategory, amount: number): boolean => {
      const nowSrv = Date.now() + serverOffsetMsRef.current;
      const res = applyRebalanceProvinceBudget(stateRef.current, provId, fromCat, toCat, amount, nowSrv);
      if (!res.ok) {
        addToast(res.reason || 'Rebalance failed.');
        return false;
      }
      stateRef.current = res.state;
      saveLocal(res.state);
      playSfx('buy', !!res.state.set.sfx);
      setState((prev) => {
        const recheck = applyRebalanceProvinceBudget(prev, provId, fromCat, toCat, amount, nowSrv);
        return recheck.ok ? recheck.state : prev;
      });
      scheduleCloudSync(4_000);
      addToast(`Rebalanced ₨ ${formatNumber(res.amount)} (${fromCat} → ${toCat})`);
      return true;
    },
    [addToast, saveLocal, scheduleCloudSync],
  );

  // Auth handlers (guarded against double submission)
  const handleGoogleLogin = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      setAuthMsg('Cloud sign-in is not configured. Play offline or configure Firebase env vars.');
      return;
    }
    if (authBusyRef.current) return;
    authBusyRef.current = true;
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
    } finally {
      authBusyRef.current = false;
    }
  }, []);

  const handleEmailAuth = useCallback(async (email: string, password: string, register: boolean) => {
    if (!isFirebaseConfigured || !auth) {
      setAuthMsg('Cloud sign-in is not configured. Play offline or configure Firebase env vars.');
      return;
    }
    if (authBusyRef.current) return;
    if (!email.trim() || password.length < 6) {
      setAuthMsg('Enter a valid email and password (min 6 chars).');
      return;
    }
    authBusyRef.current = true;
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
    } finally {
      authBusyRef.current = false;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (authBusyRef.current) return;
    authBusyRef.current = true;
    try {
      if (
        uidRef.current &&
        cloudReadyRef.current &&
        pendingDirtyRef.current &&
        !kickedRef.current &&
        !needsOnboardingRef.current &&
        navigator.onLine !== false
      ) {
        await performCloudSync(true).catch(() => null);
      }
      if (auth) {
        await signOut(auth);
      }
      setDialog(null);
      setProfileView(null);
      setSettingsOpen(false);
      addToast('Signed out — switched to offline mode');
    } finally {
      authBusyRef.current = false;
    }
  }, [addToast, performCloudSync]);

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
            stateRef.current = fresh;
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
    const rankSlice = { cash: state.cash, country: state.country };
    if (uid && lbLoaded && leaderboard.length > 0) {
      return calculateOnlineRank(rankSlice as GameState, uid, leaderboard);
    }
    return calculateOfflineRank(rankSlice as GameState);
  }, [uid, lbLoaded, leaderboard, state.cash, state.country]);
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
      const capturedUid = uidRef.current;
      const capturedSeq = authSeqRef.current;
      const cached = leaderboardRef.current.find((p) => p.id === targetUid);
      if (cached) {
        setProfileView(cached);
        return;
      }
      try {
        const p = await fetchPlayerProfile(targetUid);
        if (!isSessionStillValid(uidRef.current, capturedUid, authSeqRef.current, capturedSeq)) return;
        if (p) setProfileView(p);
        else addToast('Player profile not found.');
      } catch (err) {
        if (isSessionStillValid(uidRef.current, capturedUid, authSeqRef.current, capturedSeq)) {
          addToast(formatFirebaseError(err));
        }
      }
    },
    [addToast],
  );

  const openGiftComposer = useCallback(
    async (targetUid: string) => {
      const capturedUid = uidRef.current;
      const capturedSeq = authSeqRef.current;
      let target = leaderboardRef.current.find((p) => p.id === targetUid) || null;
      if (!target) {
        target = await fetchPlayerProfile(targetUid).catch((err) => {
          recordFirestoreError(err, OperationType.GET, `players/${targetUid}`);
          return null;
        });
      }
      if (!isSessionStillValid(uidRef.current, capturedUid, authSeqRef.current, capturedSeq)) return;
      if (!target) {
        addToast('Could not load recipient.');
        return;
      }
      setGiftModal({ mode: 'compose', target, trade: null });
    },
    [addToast],
  );

  const handleSelectCountry = useCallback(
    (c: CountryTuple) => {
      if (uidRef.current === null && gateOpenRef.current && !hasOfflineSave()) {
        if (otherTabLockedRef.current || kickedRef.current || updateAvailableRef.current) return;
        const next = { ...stateRef.current, country: c };
        stateRef.current = next;
        setState((prev) => ({ ...prev, country: c }));
        return;
      }
      updateState((prev) => ({ ...prev, country: c }), 0);
    },
    [updateState],
  );
  const handlePlayOffline = useCallback(() => {
    setGateOpen(false);
    if (uidRef.current === null) {
      saveLocal(stateRef.current, null);
    }
  }, [saveLocal]);
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
      const unreadIds = notificationsRef.current
        .filter((n) => !n.read && !markingNotifIdsRef.current.has(n.id))
        .map((n) => n.id);
      if (unreadIds.length) {
        for (const id of unreadIds) markingNotifIdsRef.current.add(id);
        void markNotificationsRead(currentUid, unreadIds)
          .catch((err) => {
            recordFirestoreError(err, OperationType.UPDATE, `players/${currentUid}/notifications`);
          })
          .finally(() => {
            for (const id of unreadIds) markingNotifIdsRef.current.delete(id);
          });
      }
    }
  }, []);
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
    async (id: string): Promise<boolean> => {
      try {
        const res = await acceptGiftOffer(id, sidRef.current, handleKicked, serverOffsetMsRef.current);
        if (res.status === 'accepted') {
          addToast('Gift accepted!');
        } else if (res.status === 'expired') {
          addToast('This gift has already expired.');
        } else {
          addToast(`Gift is already ${res.status}.`);
        }
        return true;
      } catch (err) {
        recordFirestoreError(err, OperationType.UPDATE, `trades/${id}`);
        addToast(formatFirebaseError(err));
        return false;
      }
    },
    [addToast, handleKicked],
  );
  const handleRejectTrade = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await rejectGiftOffer(id, sidRef.current, handleKicked, serverOffsetMsRef.current);
        if (res.status === 'rejected') {
          addToast('Gift declined');
        } else if (res.status === 'expired') {
          addToast('This gift has already expired.');
        } else {
          addToast(`Gift is already ${res.status}.`);
        }
        return true;
      } catch (err) {
        recordFirestoreError(err, OperationType.UPDATE, `trades/${id}`);
        addToast(formatFirebaseError(err));
        return false;
      }
    },
    [addToast, handleKicked],
  );
  const handleCancelTrade = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const status = await endSenderOffer(id, 'cancelled', sidRef.current, handleKicked, serverOffsetMsRef.current);
        if (status === 'cancelled') {
          addToast('Gift cancelled & refunded');
        } else if (status === 'expired') {
          addToast('Gift expired & refunded');
        } else {
          addToast(`Gift is already ${status}.`);
        }
        return true;
      } catch (err) {
        recordFirestoreError(err, OperationType.UPDATE, `trades/${id}`);
        addToast(formatFirebaseError(err));
        return false;
      }
    },
    [addToast, handleKicked],
  );
  const handleSearchPlayers = useCallback(async (q: string) => {
    const currentUid = uidRef.current;
    if (!currentUid) return [];
    try {
      return await searchPlayersByUsername(q, currentUid);
    } catch (err) {
      recordFirestoreError(err, OperationType.LIST, 'players');
      return [];
    }
  }, []);

  const handleToggleSetting = useCallback(
    (key: 'sfx' | 'vib' | 'anim') => {
      updateState(
        (prev) => ({
          ...prev,
          set: { ...prev.set, [key]: prev.set[key] ? 0 : 1 },
        }),
        1500,
      );
    },
    [updateState],
  );
  const handleOpenErrorLog = useCallback(() => setErrorLogOpen(true), []);
  const handleCloseErrorLog = useCallback(() => setErrorLogOpen(false), []);
  const handleOpenAuthFromSettings = useCallback(() => {
    setSettingsOpen(false);
    if (uidRef.current) openOwnProfile();
    else setGateOpen(true);
  }, [openOwnProfile]);
  const handleOpenErrorLogFromSettings = useCallback(() => {
    setSettingsOpen(false);
    setErrorLogOpen(true);
  }, []);
  const handleRetrySyncFromErrorLog = useCallback(() => {
    setErrorLogOpen(false);
    handleSaveCloudNow();
  }, [handleSaveCloudNow]);
  const handleClearErrorLog = useCallback(() => {
    clearErrorLog();
    setDismissedErrorId(null);
    addToast('Error log cleared');
  }, [addToast]);
  const handleCopiedToast = useCallback(() => addToast('Error details copied!'), [addToast]);
  const handleSelectNotification = useCallback((n: NotificationItem) => {
    setNotifsOpen(false);
    if (n.type === 'dm' && n.from) {
      setDmRecipient({ uid: n.from, name: n.fromName || 'Player', cc: n.fromCc || '' });
      setTab('rivals');
      setPlayersSubTab('dm');
    } else {
      setTab('trade');
      setGiftsSubTab(n.type === 'new_offer' ? 'in' : 'hist');
    }
  }, []);
  const handleGiftFromProfile = useCallback((p: PlayerProfile) => {
    setProfileView(null);
    setGiftModal({ mode: 'compose', target: p, trade: null });
  }, []);
  const handleMessageFromProfile = useCallback((p: PlayerProfile) => {
    setProfileView(null);
    const rec = { uid: p.id, name: p.username, cc: p.countryCode };
    setSentDmContacts((prev) => (prev.some((x) => x.uid === rec.uid) ? prev : [rec, ...prev]));
    setDmRecipient(rec);
    setTab('rivals');
    setPlayersSubTab('dm');
  }, []);
  const handleSignOutCb = useCallback(() => void handleSignOut(), [handleSignOut]);
  const handleClaimTabHere = useCallback(() => {
    if (kickedRef.current) {
      window.location.reload();
      return;
    }
    try {
      localStorage.setItem(TAB_LOCK_KEY, JSON.stringify({ id: sidRef.current, t: Date.now() }));
    } catch {
      // ignore storage errors
    }
    otherTabLockedRef.current = false;
    setOtherTabLocked(false);
  }, []);

  const handleCopyBannerError = useCallback(async () => {
    const header = [
      `Project: ${FIREBASE_CONFIG.projectId || 'unset'}`,
      'Database: (default)',
      `Auth UID: ${uid || 'signed-out'}${user?.email ? ` (${user.email})` : ''}`,
    ].join(' | ');
    const report = `${header}\n\n${formatErrorLogReport(appErrors)}`;
    try {
      await navigator.clipboard.writeText(report);
      addToast('Error details copied!');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = report;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      addToast('Error details copied!');
    }
  }, [uid, user?.email, appErrors, addToast]);

  const latestBannerError = appErrors.length > 0 && appErrors[0].id !== dismissedErrorId ? appErrors[0] : null;

  const currentTabMeta = TAB_META[tab];
  const srvMinute = Math.floor((state.t + serverOffsetMs) / 60_000);
  const dayKey = useMemo(() => dayKeyFor(srvMinute * 60_000), [srvMinute]);

  // Mandatory Website Version Detection & Cross-Tab Update Lock
  useEffect(() => {
    const runningVersion = getRunningAppVersion();
    clearUpdateReloadGuardIfMatched(runningVersion);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(VERSION_BROADCAST_CHANNEL);
        versionChannelRef.current = channel;
        channel.onmessage = (ev: MessageEvent) => {
          const msg = ev?.data as { type?: string; version?: string } | undefined;
          if (msg?.type === 'new-version' && msg.version && msg.version !== runningVersion) {
            const guard = evaluateUpdateReloadGuard(runningVersion, msg.version);
            setUpdateAvailable((prev) =>
              prev?.version === msg.version
                ? prev
                : { version: msg.version!, loopDetected: guard.loopDetected },
            );
          }
        };
      }
    } catch {
      // BroadcastChannel unavailable in restricted environments
    }

    const checkForUpdates = async (force = false) => {
      if (updateAvailableRef.current) return;
      const now = Date.now();
      if (!force && now - lastVersionCheckAtRef.current < 5_000) return;
      lastVersionCheckAtRef.current = now;

      const manifest = await fetchLatestVersion();
      if (!isNewerVersionDeployed(runningVersion, manifest) || !manifest) return;

      const guard = evaluateUpdateReloadGuard(runningVersion, manifest.version);
      setUpdateAvailable({
        version: manifest.version,
        loopDetected: guard.loopDetected,
      });
      try {
        channel?.postMessage({ type: 'new-version', version: manifest.version });
      } catch {
        // ignore
      }
    };

    void checkForUpdates(true);

    const pollIv = window.setInterval(() => {
      if (!document.hidden) {
        void checkForUpdates(false);
      }
    }, VERSION_POLL_INTERVAL_MS);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdates(false);
      }
    };
    const onFocus = () => void checkForUpdates(false);
    const onOnline = () => void checkForUpdates(true);

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(pollIv);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      if (channel) {
        channel.close();
      }
      versionChannelRef.current = null;
    };
  }, []);

  const handleForceUpdateRefresh = useCallback(async () => {
    if (refreshingUpdateRef.current || !updateAvailable) return;
    refreshingUpdateRef.current = true;
    setRefreshingUpdate(true);
    const runningVersion = getRunningAppVersion();
    const targetVersion = updateAvailable.version;
    try {
      // Flush active account's critical state safely before leaving without overwriting newer cloud data
      if (
        uidRef.current &&
        cloudReadyRef.current &&
        pendingDirtyRef.current &&
        !kickedRef.current &&
        !needsOnboardingRef.current &&
        navigator.onLine !== false
      ) {
        await Promise.race([
          performCloudSync(true, true).catch(() => null),
          new Promise<void>((resolve) => window.setTimeout(resolve, 4000)),
        ]);
      } else if (authResolvedRef.current && !cloudLoadingRef.current && !needsOnboardingRef.current) {
        saveLocal(stateRef.current, uidRef.current);
      }

      recordUpdateReloadAttempt(runningVersion, targetVersion);
      await clearAppCachesBeforeReload();
    } finally {
      const nextUrl = buildCacheBustedUrl(window.location.href, targetVersion);
      if (nextUrl !== window.location.href) {
        window.location.replace(nextUrl);
      } else {
        window.location.reload();
      }
    }
  }, [performCloudSync, saveLocal, updateAvailable]);

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

  if (updateAvailable) {
    return (
      <UpdateRequiredModal
        open
        refreshing={refreshingUpdate}
        loopDetected={updateAvailable.loopDetected}
        remoteVersion={updateAvailable.version}
        onRefreshNow={() => void handleForceUpdateRefresh()}
      />
    );
  }

  if (HAS_FIREBASE_AUTH && !authResolved) {
    return (
      <div id="authBoot" role="status" aria-live="polite">
        <div className="auth-boot-card card">
          <div className="g-mark">
            <Landmark size={26} strokeWidth={2.2} />
          </div>
          <h2>Country Economy Tycoon</h2>
          <p>Verifying session…</p>
        </div>
      </div>
    );
  }

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
            <button type="button" className="btn gold" onClick={handleClaimTabHere}>
              Use Here Instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {latestBannerError && (
        <div id="errBanner" role="alert" aria-live="assertive">
          <div className="err-banner-top">
            <span className={`err-badge err-badge--${latestBannerError.source}`}>
              {latestBannerError.source.toUpperCase()}
            </span>
            {latestBannerError.code && <code className="err-code">{latestBannerError.code}</code>}
            {latestBannerError.path && <span className="err-path">{latestBannerError.path}</span>}
            {appErrors.length > 1 && (
              <small className="dim" style={{ marginLeft: 'auto' }}>
                +{appErrors.length - 1} more
              </small>
            )}
          </div>
          <div className="err-banner-msg">{latestBannerError.message}</div>
          <div className="err-banner-acts">
            <button type="button" className="primary" onClick={handleOpenErrorLog}>
              Details / Fix
            </button>
            <button type="button" className="copy" onClick={() => void handleCopyBannerError()}>
              Copy
            </button>
            <button type="button" onClick={() => setDismissedErrorId(latestBannerError.id)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

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
            {tab === 'provinces' && (
              <ProvincesTab
                state={state}
                uid={uid}
                cloudReady={cloudReady}
                ownerName={pubProfile?.username || 'Player'}
                subTab={provincesSubTab}
                selectedProvinceId={selectedProvinceId}
                serverOffsetMs={serverOffsetMs}
                unlockBusy={provUnlockBusy}
                lbCategory={provLbCat}
                lbEntries={provLbEntries}
                lbLoading={provLbLoading}
                onChangeSubTab={setProvincesSubTab}
                onSelectProvince={setSelectedProvinceId}
                onUnlockProvince={handleUnlockProvince}
                onCustomizeProvince={handleCustomizeProvince}
                onAllocateBudget={handleAllocateProvinceBudget}
                onRebalanceBudget={handleRebalanceProvinceBudget}
                onChangeLbCategory={setProvLbCat}
                onRefreshLb={() => void refreshProvLeaderboard(provLbCat, true)}
                onOpenLogin={handleOpenLoginGate}
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
          onClick={handleOpenErrorLog}
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
            if (cloudStatus.cls === 'bad') handleOpenErrorLog();
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
        onGift={handleGiftFromProfile}
        onMessage={handleMessageFromProfile}
        onSignOut={handleSignOutCb}
      />

      <SettingsModal
        open={settingsOpen}
        state={state}
        uid={uid}
        email={user?.email || null}
        errorCount={appErrors.length}
        onToggleSetting={handleToggleSetting}
        onOpenAuth={handleOpenAuthFromSettings}
        onOpenErrorLog={handleOpenErrorLogFromSettings}
        onRequestReset={handleResetGame}
        onClose={handleCloseSettings}
      />

      <ErrorLogModal
        open={errorLogOpen}
        errors={appErrors}
        uid={uid}
        email={user?.email || null}
        onRetrySync={handleRetrySyncFromErrorLog}
        onClear={handleClearErrorLog}
        onCopied={handleCopiedToast}
        onClose={handleCloseErrorLog}
      />

      <NotificationsModal
        open={notifsOpen}
        notifications={notifications}
        onClose={handleCloseNotifs}
        onSelectNotification={handleSelectNotification}
      />

      <OnboardingModal
        open={needsOnboarding}
        defaultCountryCode={state.country?.[0]}
        onCheckUsername={checkUsernameAvailability}
        onSubmitProfile={async (username, cc) => {
          const currentUid = uidRef.current;
          const capturedSeq = authSeqRef.current;
          if (!currentUid) return;
          try {
            // Strictly seed new accounts with a fresh state (never copy previous account/offline progress)
            const seedState = buildOnboardingSeedState(cc);
            const res = await createPlayerProfile(
              username,
              cc,
              seedState,
              sidRef.current,
              handleKicked,
              currentUid,
            );
            if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
            walletRevRef.current = res.walletRev;
            cloudSyncPermDeniedRef.current = false;
            permWarnShownRef.current = false;
            syncRetryCountRef.current = 0;
            const p = await fetchPlayerProfile(currentUid);
            if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
            if (p) setPubProfile(p);
            const chosen = COUNTRIES.find((c) => c[0] === cc) || COUNTRIES[0];
            const base = res.restoredSave ? migrateState(res.restoredSave) : seedState;
            let merged: GameState = { ...base, country: chosen };
            if (res.wallet) {
              merged = {
                ...merged,
                cash: res.wallet.cash,
                gems: res.wallet.gems,
                stk: res.wallet.stk,
              };
            }
            const cloudEntryKey = `cloud:${currentUid}`;
            if (entryCheckedKeyRef.current !== cloudEntryKey) {
              entryCheckedKeyRef.current = cloudEntryKey;
              const tier = tierOfCompletedTrades(p?.stats?.completedTrades);
              const checkedRes = computeDailyAndOfflineChecks(merged, tier, Date.now() + serverOffsetMsRef.current);
              merged = checkedRes.state;
              if (checkedRes.promoBannerText) addToast(checkedRes.promoBannerText);
              const entryDlg = buildEntryDialog(checkedRes);
              if (entryDlg) setDialog(entryDlg);
            }
            stateRef.current = merged;
            setState(merged);
            needsOnboardingRef.current = false;
            cloudReadyRef.current = true;
            setNeedsOnboarding(false);
            setCloudReady(true);
            saveLocal(merged, currentUid);
            scheduleCloudSync(500);
            addToast(`Welcome, ${username}!`);
          } catch (err) {
            if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) return;
            recordFirestoreError(err, OperationType.CREATE, `players/${currentUid}`);
            addToast(formatFirebaseError(err));
          }
        }}
        onSignOut={handleSignOutCb}
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
            const currentUid = uidRef.current;
            const capturedSeq = authSeqRef.current;
            if (!currentUid) return false;
            try {
              if (!serverTimeVerifiedRef.current && db) {
                const sesRef = doc(db, 'players', currentUid, 'private', 'session');
                await setDoc(sesRef, { sid: sidRef.current, t: serverTimestamp() });
                const sesSnap = await getDocFromServer(sesRef).catch(() => null);
                if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
                  return false;
                }
                if (sesSnap && sesSnap.exists()) {
                  const srvMs = timestampToMs(sesSnap.data()?.t);
                  if (srvMs > 0) updateServerOffset(srvMs);
                }
              }
              if (pendingDirtyRef.current || cloudSyncBusyRef.current) {
                await performCloudSync(true);
              }
              if (!isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
                return false;
              }
              await createGiftOffer({
                ...payload,
                sid: sidRef.current,
                serverOffsetMs: serverOffsetMsRef.current,
                onKicked: handleKicked,
              });
              if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
                addToast('Gift sent!');
              }
              return true;
            } catch (err) {
              if (isSessionStillValid(uidRef.current, currentUid, authSeqRef.current, capturedSeq)) {
                recordFirestoreError(err, OperationType.CREATE, 'trades');
                addToast(formatFirebaseError(err));
              }
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
