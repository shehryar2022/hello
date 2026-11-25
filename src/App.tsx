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
import { HeroPanel } from './components/HeroPanel';
import { LoginGate } from './components/LoginGate';
import {
  DialogModal,
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
import { auth, db, formatFirebaseError, testFirestoreConnection } from './firebase/config';
import {
  ACTIVE_WINDOW_MS,
  BOOSTERS,
  BUILDINGS,
  COUNTRIES,
  DAILY_REWARDS,
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
} from './game/constants';
import {
  applyBuyBooster,
  applyBuyRank,
  applyBuySubscription,
  applyOfflineEarnings,
  buildingCost,
  calculateGdp,
  calculateIncome,
  calculateOfflineRank,
  calculateOnlineRank,
  calculateTaxCollect,
  claimSubscriptionDaily,
  cleanStickersMap,
  formatNumber,
  freshState,
  fuseSticker,
  getDevelopmentDiscount,
  getSubscriptionProjectSpeedMult,
  gxRepairCost,
  gxUpgradeCost,
  migrateState,
  QUEST_POOL,
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
    text: '☁️ Saved',
  });
  const [kicked, setKicked] = useState(false);
  const [otherTabLocked, setOtherTabLocked] = useState(false);

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

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [floats, setFloats] = useState<FloatPop[]>([]);
  const [burstKey, setBurstKey] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [profileView, setProfileView] = useState<PlayerProfile | null>(null);
  const [giftModal, setGiftModal] = useState<{
    mode: 'compose' | 'review';
    target: PlayerProfile | null;
    trade: TradeOffer | null;
  } | null>(null);
  const [dialog, setDialog] = useState<DialogConfig | null>(null);

  const sidRef = useRef<string>(`${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
  const walletRevRef = useRef<number>(0);
  const serverOffsetMsRef = useRef<number>(0);
  const serverTimeVerifiedRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const cloudSyncTimerRef = useRef<number | null>(null);
  const cloudSyncBusyRef = useRef<boolean>(false);
  const cloudDirtyRef = useRef<boolean>(false);
  const pubProfileRef = useRef<PlayerProfile | null>(null);
  pubProfileRef.current = pubProfile;
  const uidRef = useRef<string | null>(null);
  uidRef.current = uid;
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
  const settlingTradesRef = useRef<boolean>(false);
  const rankPositionRef = useRef<number>(1);

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
    try {
      const toStore = { ...next, t: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(toStore));
    } catch {
      // Ignore quota issues
    }
  }, []);

  // Keep body.noanim synced with state.set.anim
  useEffect(() => {
    document.body.classList.toggle('noanim', !state.set.anim);
  }, [state.set.anim]);

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
    const claimTab = () => {
      const cur = localStorage.getItem(TAB_LOCK_KEY);
      if (cur && cur !== sidRef.current) {
        try {
          const parsed = JSON.parse(cur) as { id: string; t: number };
          if (parsed.id !== sidRef.current && Date.now() - parsed.t < 7000) {
            setOtherTabLocked(true);
            return;
          }
        } catch {
          // Malformed
        }
      }
      setOtherTabLocked(false);
      localStorage.setItem(TAB_LOCK_KEY, JSON.stringify({ id: sidRef.current, t: Date.now() }));
    };
    claimTab();
    const iv = window.setInterval(() => {
      if (!otherTabLocked && !kickedRef.current) {
        localStorage.setItem(TAB_LOCK_KEY, JSON.stringify({ id: sidRef.current, t: Date.now() }));
      }
    }, 2500);
    const onStorage = (e: StorageEvent) => {
      if (e.key === TAB_LOCK_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as { id: string; t: number };
          if (parsed.id !== sidRef.current && Date.now() - parsed.t < 7000) {
            setOtherTabLocked(true);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pagehide', releaseOwnLock);
    window.addEventListener('beforeunload', releaseOwnLock);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pagehide', releaseOwnLock);
      window.removeEventListener('beforeunload', releaseOwnLock);
      releaseOwnLock();
    };
  }, [otherTabLocked]);

  const handleKicked = useCallback(() => {
    if (kickedRef.current) return;
    kickedRef.current = true;
    setKicked(true);
  }, []);

  const performCloudSync = useCallback(
    async (immediate = false) => {
      const currentUid = uidRef.current;
      if (!currentUid || !cloudReady || kickedRef.current || needsOnboarding) return;
      if (cloudSyncBusyRef.current) {
        cloudDirtyRef.current = true;
        return;
      }
      cloudSyncBusyRef.current = true;
      cloudDirtyRef.current = false;
      setCloudStatus({ cls: 'warn', text: '☁️ Saving…' });
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
        if (!res.accepted) {
          setState((prev) => ({
            ...prev,
            cash: res.wallet.cash,
            gems: res.wallet.gems,
            stk: res.wallet.stk,
          }));
        }
        setCloudStatus({ cls: 'ok', text: '☁️ Saved' });
      } catch (err) {
        if ((err as { code?: string })?.code === 'aborted') {
          setCloudStatus({ cls: 'bad', text: '⚠️ Session displaced' });
        } else {
          setCloudStatus({ cls: 'bad', text: '⚠️ Sync failed' });
          if (immediate) addToast(formatFirebaseError(err));
        }
      } finally {
        cloudSyncBusyRef.current = false;
        if (cloudDirtyRef.current) {
          cloudDirtyRef.current = false;
          window.setTimeout(() => void performCloudSync(false), 1500);
        }
      }
    },
    [addToast, cloudReady, handleKicked, needsOnboarding],
  );

  const scheduleCloudSync = useCallback(
    (delayMs = 2000) => {
      if (!uidRef.current || !cloudReady || kickedRef.current || needsOnboarding) return;
      if (cloudSyncTimerRef.current) window.clearTimeout(cloudSyncTimerRef.current);
      cloudSyncTimerRef.current = window.setTimeout(() => {
        cloudSyncTimerRef.current = null;
        void performCloudSync(false);
      }, delayMs);
    },
    [cloudReady, needsOnboarding, performCloudSync],
  );

  // Daily check & offline earnings trigger
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
        let grantedStickerEmoji = '';
        let grantedStickerName = '';
        if (rw.e) {
          const picked = STICKERS[Math.floor(Math.random() * STICKERS.length)];
          nextStk[picked.id] = (nextStk[picked.id] || 0) + 1;
          grantedStickerEmoji = picked.e;
          grantedStickerName = picked.n;
        }
        working = {
          ...working,
          cash: working.cash + rw.c,
          gems: working.gems + rw.g,
          stk: nextStk,
          streak: nextStreak,
          lastDaily: now,
        };
        streakDialog = {
          title: `🎁 Day ${nextStreak} Streak!`,
          body: (
            <div>
              <p>Welcome back! Here is today&apos;s treasury bonus:</p>
              <p style={{ fontSize: 18, color: 'var(--gold)', fontFamily: 'var(--d)' }}>
                +₨ {formatNumber(rw.c)} {rw.g > 0 ? `· +${rw.g} 💎` : ''}
                {grantedStickerName ? ` · ${grantedStickerEmoji} ${grantedStickerName}` : ''}
              </p>
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
          title: '🌙 Welcome Back!',
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

      if (streakDialog) setDialog(streakDialog);
      return working;
    },
    [],
  );

  // Firebase bootstrap & auth listener
  useEffect(() => {
    void testFirestoreConnection();
    void getRedirectResult(auth).catch((err) => {
      setAuthMsg(formatFirebaseError(err));
    });

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setUid(u?.uid || null);
      if (!u) {
        serverTimeVerifiedRef.current = false;
        serverOffsetMsRef.current = 0;
        setCloudReady(false);
        setNeedsOnboarding(false);
        setPubProfile(null);
        setTrades([]);
        setNotifications([]);
        setProjects([]);
        setLeaderboard([]);
        return;
      }

      setGateOpen(false);
      setAuthMsg('');
      try {
        // Claim single session lock on sign-in
        await setDoc(doc(db, 'players', u.uid, 'private', 'session'), {
          sid: sidRef.current,
          t: serverTimestamp(),
        });

        // Estimate server clock offset strictly from server (never fall back to stale cache)
        const sesSnap = await getDocFromServer(doc(db, 'players', u.uid, 'private', 'session')).catch(() => null);
        if (sesSnap && sesSnap.exists()) {
          const srvMs = timestampToMs(sesSnap.data()?.t);
          if (srvMs > 0) {
            serverOffsetMsRef.current = srvMs - Date.now();
            serverTimeVerifiedRef.current = true;
          }
        }

        const pSnap = await getDoc(doc(db, 'players', u.uid));
        if (!pSnap.exists()) {
          setNeedsOnboarding(true);
          setCloudReady(false);
          return;
        }

        const pData = pSnap.data() as Omit<PlayerProfile, 'id'>;
        setPubProfile({ ...pData, id: u.uid, seen: timestampToMs(pData.lastSeen) });

        // Load wallet + save
        const [wSnap, sSnap] = await Promise.all([
          getDoc(doc(db, 'players', u.uid, 'private', 'wallet')),
          getDoc(doc(db, 'saves', u.uid)),
        ]);

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
          walletRevRef.current = Number(w.rev) || 1;
          loaded.cash = capValue(w.cash, 1e13);
          loaded.gems = capValue(w.gems, 1e9);
          loaded.stk = cleanStickersMap(w.stk);
        }

        const tier = tierOfCompletedTrades(pData.stats?.completedTrades);
        completedTradesRef.current = pData.stats?.completedTrades || 0;
        const checked = runDailyAndOfflineChecks(loaded, tier, Date.now() + serverOffsetMsRef.current);
        setState(checked);
        saveLocal(checked);
        setNeedsOnboarding(false);
        setCloudReady(true);
      } catch (err) {
        addToast(formatFirebaseError(err));
      }
    });

    return () => unsub();
  }, [addToast, runDailyAndOfflineChecks, saveLocal]);

  // Run daily check for offline mode on mount if gate is bypassed
  useEffect(() => {
    if (!gateOpen && !uid) {
      setState((prev) => {
        const checked = runDailyAndOfflineChecks(prev, 0);
        saveLocal(checked);
        return checked;
      });
    }
  }, [gateOpen, uid, runDailyAndOfflineChecks, saveLocal]);

  // Realtime Firestore listeners when signed in & onboarded
  useEffect(() => {
    if (!uid || !cloudReady || needsOnboarding || kicked) return;
    const unsubs: Unsubscribe[] = [];
    const queries = buildQueryHelpers();

    // 1. Session lock listener
    unsubs.push(
      onSnapshot(
        doc(db, 'players', uid, 'private', 'session'),
        (snap) => {
          if (snap.exists() && snap.data()?.sid && snap.data()?.sid !== sidRef.current) {
            handleKicked();
          }
        },
        () => {},
      ),
    );

    // 2. Wallet listener (authoritative balance updates from gifts)
    unsubs.push(
      onSnapshot(
        doc(db, 'players', uid, 'private', 'wallet'),
        (snap) => {
          if (!snap.exists()) return;
          const w = snap.data();
          const newRev = Number(w.rev) || 0;
          if (newRev > walletRevRef.current) {
            walletRevRef.current = newRev;
            setState((prev) => ({
              ...prev,
              cash: capValue(w.cash, 1e13),
              gems: capValue(w.gems, 1e9),
              stk: cleanStickersMap(w.stk),
            }));
          }
        },
        () => {},
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
        () => {},
      ),
    );

    // 4. Active leaderboard listener
    unsubs.push(
      onSnapshot(
        queries.playersActiveQuery(),
        (snap) => {
          const rows = snap.docs
            .map((d) => {
              const data = d.data({ serverTimestamps: 'estimate' }) as Omit<PlayerProfile, 'id'>;
              return { ...data, id: d.id, seen: timestampToMs(data.lastSeen) };
            })
            .filter((p) => p.id === uid || (p.seen && Date.now() - p.seen <= ACTIVE_WINDOW_MS))
            .sort((a, b) => (b.gdp || 0) - (a.gdp || 0));
          setLeaderboard(rows);
          setLbLoaded(true);
        },
        () => setLbLoaded(true),
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
        () => {},
      ),
    );

    // 6. Daily gift limit listener
    const dlKey = `${uid}_${dayKeyFor(Date.now() + serverOffsetMsRef.current)}`;
    unsubs.push(
      onSnapshot(
        doc(db, 'dailyLimits', dlKey),
        (snap) => {
          setSentToday(snap.exists() ? Number(snap.data()?.count || 0) : 0);
        },
        () => {},
      ),
    );

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
        () => {},
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
                  serverOffsetMsRef.current = startMs - Date.now();
                  serverTimeVerifiedRef.current = true;
                }
              } else if (ch.type === 'modified' && raw.lastTickAt) {
                const tickMs = timestampToMs(raw.lastTickAt);
                if (tickMs > 0) {
                  serverOffsetMsRef.current = tickMs - Date.now();
                  serverTimeVerifiedRef.current = true;
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
          projLiveRef.current = nextLive;
          setProjects(normalized);
          setLiveProjectProgress(nextLive);
        },
        () => {},
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
        () => {},
      ),
    );

    // Heartbeat interval
    void sendHeartbeat(uid).catch(() => {});
    const hb = window.setInterval(() => {
      if (!document.hidden && !kickedRef.current) {
        void sendHeartbeat(uid).catch(() => {});
      }
    }, HEARTBEAT_MS);

    return () => {
      window.clearInterval(hb);
      unsubs.forEach((u) => u());
    };
  }, [uid, cloudReady, needsOnboarding, kicked, handleKicked]);

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
      () => {},
    );
    return () => unsub();
  }, [uid, cloudReady, dmRecipient]);

  // Collect recent DM contacts from DM notifications
  useEffect(() => {
    const map = new Map<string, DmRecipient>();
    for (const n of notifications) {
      if (n.type === 'dm' && n.from && n.fromName && !map.has(n.from)) {
        map.set(n.from, { uid: n.from, name: n.fromName, cc: n.fromCc || '' });
      }
    }
    setRecentDms(Array.from(map.values()));
  }, [notifications]);

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

      setState((prev) => {
        const inc = calculateIncome(prev, { tradeTier, nowMs: nowSrv });
        const capPool = Math.max(0, inc.net * 1800);
        const nextTaxPool =
          inc.net > 0
            ? Math.min(capPool, (prev.taxPool || 0) + inc.net)
            : Math.max(0, (prev.taxPool || 0) + inc.net);

        const targHap = targetHappiness(prev);
        const nextHap = Math.max(0, Math.min(100, prev.hap + (targHap - prev.hap) * 0.04));
        const nextAppr = Math.max(0, Math.min(100, prev.appr + (nextHap - prev.appr) * 0.02));
        const nextPop = Math.max(
          1,
          prev.pop + (nextHap - 45) * 0.0005 + ((prev.b.water || 0) * 0.0002 + (prev.b.rail || 0) * 0.0003),
        );

        let nextCash = prev.cash;
        let nextGx = prev.gx;
        let nextDay = prev.day + 1 / 12;
        let nextEv = prev.ev - 1;

        // Clear expired shop income boost cleanly
        let nextActiveFx = prev.activeFx;
        if (nextActiveFx?.incomeBoostEnd && nextActiveFx.incomeBoostEnd <= now) {
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
            for (const [k] of [...GX_GOV_BUILDINGS, ...GX_ROADS]) {
              nextCond[k] = Math.max(0, (nextCond[k] ?? 100) - 0.15);
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

        // Random economic event (~every 150s) — bug-fixed for negative net & saves cleanly
        if (nextEv <= 0) {
          nextEv = 150;
          if (Math.random() < 0.65 && inc.gross > 5) {
            const roll = Math.random();
            if (roll < 0.65) {
              const bonus = Math.max(100, Math.floor(Math.max(1, Math.abs(inc.net)) * 45));
              nextCash += bonus;
              addToast(`📈 Trade Windfall! +₨ ${formatNumber(bonus)}`);
            } else {
              const fine = Math.min(Math.floor(nextCash * 0.05), Math.floor(inc.gross * 25));
              if (fine > 0) {
                nextCash = Math.max(0, nextCash - fine);
                addToast(`⚡ Grid Maintenance Fee: −₨ ${formatNumber(fine)}`);
              }
            }
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
          t: now,
        };

        if (tickCountRef.current % 4 === 0) {
          saveLocal(updated);
        }
        return updated;
      });

      // Cloud sync every 12s if signed in
      if (tickCountRef.current % 12 === 0 && uidRef.current) {
        void performCloudSync(false);
      }

      // Tick active Gov Projects in Firestore
      const curUid = uidRef.current;
      if (curUid && projectsRef.current.length > 0) {
        let liveDirty = false;
        const speedMult = getSubscriptionProjectSpeedMult(stateRef.current, nowSrv);
        const stepMs = Math.max(1000, Math.floor(1000 * speedMult));
        for (const p of projectsRef.current) {
          if (p.status === 'active') {
            if (
              serverTimeVerifiedRef.current &&
              !p.pending &&
              p.st > 0 &&
              nowSrv >= p.dl &&
              now - (projStartedLocalAtRef.current[p.id] || 0) >= 30_000
            ) {
              if (!projBusyRef.current.has(p.id)) {
                projBusyRef.current.add(p.id);
                void finishGovProject(curUid, p.id, 'failed').finally(() =>
                  projBusyRef.current.delete(p.id),
                );
              }
            } else if (isUserActive && !p.pending) {
              const capMs = Math.floor((p.t.dur * p.paid) / PROJECT_STAGES);
              const curLive = Math.max(p.progressMs, projLiveRef.current[p.id] || 0);
              if (curLive < capMs) {
                const nextMs = Math.min(capMs, curLive + stepMs);
                projLiveRef.current[p.id] = nextMs;
                liveDirty = true;
                if (nextMs >= p.t.dur && p.paid >= PROJECT_STAGES && !projBusyRef.current.has(p.id)) {
                  projBusyRef.current.add(p.id);
                  void finishGovProject(curUid, p.id, 'done', p.t.dur).finally(() =>
                    projBusyRef.current.delete(p.id),
                  );
                } else {
                  const lastSync = projLastSyncRef.current[p.id] || 0;
                  const hitStageCap = nextMs >= capMs && p.progressMs < capMs;
                  if ((hitStageCap || now - lastSync >= 10_000) && !projBusyRef.current.has(p.id)) {
                    projLastSyncRef.current[p.id] = now;
                    projBusyRef.current.add(p.id);
                    void tickGovProject(curUid, p.id, nextMs)
                      .catch(() => {})
                      .finally(() => projBusyRef.current.delete(p.id));
                  }
                }
              } else if (p.progressMs < capMs && p.paid < PROJECT_STAGES && !projBusyRef.current.has(p.id)) {
                projLastSyncRef.current[p.id] = now;
                projBusyRef.current.add(p.id);
                void tickGovProject(curUid, p.id, capMs)
                  .catch(() => {})
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
                        cash: s.cash + cashReward,
                        hap: Math.min(100, s.hap + 3),
                        gx: {
                          ...s.gx,
                          pb: Math.min(0.25, (s.gx.pb || 0) + p.t.pb),
                          ph: Math.min(10, (s.gx.ph || 0) + p.t.ph),
                          log: [
                            `✅ ${p.t.n} completed${early ? ' EARLY' : ''}! +₨ ${formatNumber(cashReward)}`,
                            ...s.gx.log,
                          ].slice(0, 8),
                        },
                      };
                      saveLocal(next);
                      return next;
                    });
                    addToast(`🏗️ ${p.t.n} finished! +₨ ${formatNumber(cashReward)}`);
                    scheduleCloudSync(500);
                  } else if (resStatus === 'failed') {
                    const refund = Math.ceil((p.t.cost / PROJECT_STAGES) * p.paid * 0.75);
                    setState((s) => {
                      const next = {
                        ...s,
                        cash: s.cash + refund,
                        gx: {
                          ...s.gx,
                          log: [`❌ ${p.t.n} missed deadline (75% refunded)`, ...s.gx.log].slice(0, 8),
                        },
                      };
                      saveLocal(next);
                      return next;
                    });
                    addToast(`⏳ ${p.t.n} missed deadline — ₨ ${formatNumber(refund)} refunded`);
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
        saveLocal(next);
        return next;
      });
      scheduleCloudSync(syncDelay);
    },
    [saveLocal, scheduleCloudSync],
  );

  // Actions
  const handleCollectTax = (e: React.MouseEvent<HTMLButtonElement>) => {
    const cur = stateRef.current;
    const res = calculateTaxCollect(cur, tradeTier, Date.now() + serverOffsetMsRef.current);
    if (res.collected < 1) {
      addToast('Tax pool is empty — wait a moment!');
      return;
    }
    playSfx('coin', !!cur.set.sfx);
    triggerBuzz(14, !!cur.set.vib);
    setBurstKey((k) => k + 1);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloat(`+₨ ${formatNumber(res.collected)}`, rect.left + rect.width / 2, rect.top, '#3fe0b0');

    updateState((prev) => ({
      ...prev,
      cash: prev.cash + res.collected,
      taxPool: 0,
      activeFx: res.bonusApplied ? { ...prev.activeFx, taxSurge: 0 } : prev.activeFx,
    }), 1000);

    if (res.bonusApplied) {
      addToast(`💰 Tax Surge added +₨ ${formatNumber(res.bonusAmount)}!`);
    }
  };

  const handleActivateGemBoost = () => {
    const cur = stateRef.current;
    if (cur.gems < 5 || cur.boost > 0) return;
    playSfx('buy', !!cur.set.sfx);
    triggerBuzz(18, !!cur.set.vib);
    updateState((prev) => ({
      ...prev,
      gems: prev.gems - 5,
      boost: 30,
    }), 1000);
    addToast('⚡ ×2 Boost active for 30s!');
  };

  const handleCityBuildingTap = () => {
    const cur = stateRef.current;
    const inc = calculateIncome(cur, { tradeTier, nowMs: Date.now() + serverOffsetMsRef.current });
    const bonus = Math.max(5, Math.floor(Math.max(1, inc.net) * 2));
    playSfx('tap', !!cur.set.sfx);
    setBurstKey((k) => k + 1);
    updateState((prev) => ({ ...prev, cash: prev.cash + bonus }), 3000);
    addToast(`🏙️ City tap bonus +₨ ${formatNumber(bonus)}`);
  };

  const handleBuyBuilding = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const def = BUILDINGS.find((b) => b.id === id);
    if (!def) return;
    const cur = stateRef.current;
    const nowSrv = Date.now() + serverOffsetMsRef.current;
    const count = cur.b[id] || 0;
    const cost = buildingCost(def, count, getDevelopmentDiscount(cur, nowSrv));
    if (cur.cash < cost) return;

    playSfx('buy', !!cur.set.sfx);
    triggerBuzz(15, !!cur.set.vib);
    setBurstKey((k) => k + 1);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloat(`${def.e} Lv ${count + 1}`, rect.left + rect.width / 2, rect.top, '#ffc23d');

    updateState((prev) => ({
      ...prev,
      cash: prev.cash - cost,
      b: { ...prev.b, [id]: (prev.b[id] || 0) + 1 },
    }), 1200);
  };

  const handleFixInfra = (key: string, full: boolean) => {
    const cur = stateRef.current;
    const nowSrv = Date.now() + serverOffsetMsRef.current;
    const cost = gxRepairCost(cur, key, full, nowSrv);
    if (cur.cash < cost || cost <= 0) return;
    playSfx('buy', !!cur.set.sfx);
    updateState((prev) => ({
      ...prev,
      cash: prev.cash - cost,
      gx: {
        ...prev.gx,
        cond: {
          ...prev.gx.cond,
          [key]: full ? 100 : Math.min(100, (prev.gx.cond[key] ?? 100) + 20),
        },
      },
    }), 1200);
    addToast('🔧 Infrastructure repaired!');
  };

  const handleUpgradeBuilding = (id: string) => {
    const cur = stateRef.current;
    const nowSrv = Date.now() + serverOffsetMsRef.current;
    const cost = gxUpgradeCost(cur, id, nowSrv);
    const lvl = cur.gx.lvl[id] || 1;
    if (cur.cash < cost || cost <= 0 || lvl >= 5) return;
    playSfx('buy', !!cur.set.sfx);
    updateState((prev) => ({
      ...prev,
      cash: prev.cash - cost,
      gx: {
        ...prev.gx,
        lvl: { ...prev.gx.lvl, [id]: (prev.gx.lvl[id] || 1) + 1 },
      },
    }), 1200);
    addToast('⬆️ Building upgraded!');
  };

  const handleStartProject = async (type: ProjectType) => {
    if (!uid || projCreatingRef.current) return;
    const activeCount = projects.filter((p) => p.status === 'active').length;
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
      await createGovProject(uid, type, (newId) => {
        justCreatedProjIdsRef.current.add(newId);
        projStartedLocalAtRef.current[newId] = Date.now();
      });
      playSfx('buy', !!stateRef.current.set.sfx);
      addToast(`🏗️ Started ${def.n}!`);
    } catch (err) {
      updateState((prev) => ({ ...prev, cash: prev.cash + stageCost }), 500);
      addToast(formatFirebaseError(err));
    } finally {
      projCreatingRef.current = false;
    }
  };

  const handlePayProjectStage = async (projectId: string) => {
    if (!uid || projPayBusyRef.current.has(projectId)) return;
    const proj = projects.find((p) => p.id === projectId);
    if (!proj || proj.status !== 'active' || proj.paid >= PROJECT_STAGES) return;
    const stageCost = Math.ceil(proj.t.cost / PROJECT_STAGES);
    if (stateRef.current.cash < stageCost) {
      addToast('Not enough cash for next stage.');
      return;
    }
    projPayBusyRef.current.add(projectId);
    updateState((prev) => ({ ...prev, cash: Math.max(0, prev.cash - stageCost) }), 800);
    try {
      await payGovProjectStage(uid, projectId, proj.paid);
      playSfx('buy', !!stateRef.current.set.sfx);
      addToast(`💳 Paid stage ${proj.paid + 1}/${PROJECT_STAGES}`);
    } catch (err) {
      updateState((prev) => ({ ...prev, cash: prev.cash + stageCost }), 500);
      addToast(formatFirebaseError(err));
    } finally {
      projPayBusyRef.current.delete(projectId);
    }
  };

  const handlePolicyChange = (key: keyof GameState, value: number) => {
    updateState((prev) => ({ ...prev, [key]: value }), 2200);
  };

  const handleChangeGov = (govId: string) => {
    const g = GOVS.find((x) => x.id === govId);
    if (!g) return;
    const nowSrv = Date.now() + serverOffsetMsRef.current;
    const cur = stateRef.current;
    if (cur.gov === govId || (cur.govT || 0) + GOV_CHANGE_CD_MS > nowSrv || cur.cash < g.cost) {
      return;
    }
    playSfx('win', !!cur.set.sfx);
    updateState((prev) => ({
      ...prev,
      cash: prev.cash - g.cost,
      gov: govId,
      govT: nowSrv,
    }), 1000);
    addToast(`🏛️ Switched to ${g.n}!`);
  };

  const handleFuseSticker = (stickerId: string) => {
    const res = fuseSticker(stateRef.current, stickerId);
    if (!res.ok || !res.granted) {
      if (res.reason) addToast(res.reason);
      return;
    }
    playSfx('win', !!stateRef.current.set.sfx);
    triggerBuzz(20, !!stateRef.current.set.vib);
    updateState(() => res.state, 1000);
    setDialog({
      title: '🔮 Sticker Fused!',
      body: (
        <div className="stkcard big">
          <span className="stk-e">{res.granted.e}</span>
          <span className="stk-n">{res.granted.n}</span>
          <span className="stk-r" style={{ color: '#ffc93c' }}>
            {'★'.repeat(res.granted.r)}
          </span>
        </div>
      ),
      actions: [{ label: 'Awesome', variant: 'gold', onClick: () => setDialog(null) }],
    });
  };

  const handleClaimQuest = (
    questId: string,
    _rewardGems: number,
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const cur = stateRef.current;
    if (cur.claimed?.[questId]) return;
    const today = dayKeyFor(Date.now() + serverOffsetMsRef.current);
    const activeIds = cur.questIds?.length === 3 && cur.questDay === today ? cur.questIds : selectDailyQuestIds(today);
    const qIndex = QUEST_POOL.findIndex((q) => q.id === questId);
    if (qIndex < 0 || !activeIds.includes(qIndex)) return;
    const q = QUEST_POOL[qIndex];
    if (q.f(cur, { rank: rankPositionRef.current }) < q.g) return;

    const verifiedGems = q.r;
    playSfx('win', !!cur.set.sfx);
    triggerBuzz(16, !!cur.set.vib);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloat(`+${verifiedGems} 💎`, rect.left + rect.width / 2, rect.top, '#5ccbff');
    updateState((prev) => ({
      ...prev,
      gems: prev.gems + verifiedGems,
      claimed: { ...prev.claimed, [questId]: 1 },
    }), 1000);
  };

  const handleBuyRank = (rankId: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const res = applyBuyRank(stateRef.current, rankId);
    if (!res.ok) {
      if (res.reason) addToast(res.reason);
      return;
    }
    const rk = RANKS[rankId];
    playSfx('win', !!stateRef.current.set.sfx);
    triggerBuzz(20, !!stateRef.current.set.vib);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloat(`${rk.e} ${rk.n}`, rect.left + rect.width / 2, rect.top, '#ffc23d');
    updateState(() => res.state, 800);
    addToast(`🏅 Promoted to ${rk.n}!`);
  };

  const handleBuySubscription = (tierId: SubscriptionTierId, e: React.MouseEvent<HTMLButtonElement>) => {
    const subDef = SUBSCRIPTIONS.find((x) => x.id === tierId);
    if (!subDef) return;
    const nowSrv = Date.now() + serverOffsetMsRef.current;
    const res = applyBuySubscription(stateRef.current, subDef, nowSrv);
    if (!res.ok) {
      if (res.reason) addToast(res.reason);
      return;
    }
    playSfx('win', !!stateRef.current.set.sfx);
    triggerBuzz(20, !!stateRef.current.set.vib);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloat(`${subDef.e} ${subDef.n}`, rect.left + rect.width / 2, rect.top, '#ffc23d');
    updateState(() => res.state, 600);
    addToast(`${subDef.e} ${subDef.n} activated!`);
  };

  const handleClaimSubDaily = (e: React.MouseEvent<HTMLButtonElement>) => {
    const nowSrv = Date.now() + serverOffsetMsRef.current;
    const today = dayKeyFor(nowSrv);
    const res = claimSubscriptionDaily(stateRef.current, today, nowSrv);
    if (!res.ok) {
      if (res.reason) addToast(res.reason);
      return;
    }
    playSfx('coin', !!stateRef.current.set.sfx);
    triggerBuzz(16, !!stateRef.current.set.vib);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloat(
      `+₨ ${formatNumber(res.cashAdded)}${res.gemsAdded > 0 ? ` +${res.gemsAdded}💎` : ''}`,
      rect.left + rect.width / 2,
      rect.top,
      '#3fe0b0',
    );
    updateState(() => res.state, 600);
    addToast(
      `💵 Subscription stipend: +₨ ${formatNumber(res.cashAdded)}${res.gemsAdded > 0 ? ` + ${res.gemsAdded}💎` : ''}`,
    );
  };

  const handleBuyBooster = (boosterId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const b = BOOSTERS.find((x) => x.id === boosterId);
    if (!b) return;
    const res = applyBuyBooster(stateRef.current, b, Date.now() + serverOffsetMsRef.current);
    if (!res.ok) {
      if (res.reason) addToast(res.reason);
      return;
    }
    playSfx('buy', !!stateRef.current.set.sfx);
    triggerBuzz(16, !!stateRef.current.set.vib);
    const rect = e.currentTarget.getBoundingClientRect();
    spawnFloat(`${b.e} ${b.n}`, rect.left + rect.width / 2, rect.top, '#3fe0b0');
    updateState(() => res.state, 800);
    addToast(`${b.e} ${b.n} activated!`);
  };

  // Auth handlers
  const handleGoogleLogin = async () => {
    setAuthMsg('Signing in with Google…');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, new GoogleAuthProvider());
      } else {
        setAuthMsg(formatFirebaseError(err));
      }
    }
  };

  const handleEmailAuth = async (email: string, password: string, register: boolean) => {
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
      setAuthMsg(formatFirebaseError(err));
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setProfileView(null);
    setSettingsOpen(false);
    addToast('Signed out — switched to offline mode');
  };

  const handleResetGame = () => {
    setDialog({
      title: '♻️ Start New Game?',
      body: <p>This will reset your local offline nation progress back to ₨ 80. This cannot be undone.</p>,
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
  };

  const rankPosition = useMemo(() => {
    if (uid && lbLoaded && leaderboard.length > 0) {
      return calculateOnlineRank(state, uid, leaderboard);
    }
    return calculateOfflineRank(state);
  }, [uid, lbLoaded, leaderboard, state]);
  rankPositionRef.current = rankPosition;

  const pendingIncomingGifts = useMemo(() => {
    if (!uid) return 0;
    const nowSrv = Date.now() + serverOffsetMsRef.current;
    return trades.filter((t) => t.to === uid && t.status === 'pending' && t.expMs > nowSrv).length;
  }, [uid, trades]);

  const unreadNotifs = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const openOwnProfile = () => {
    if (uid && pubProfile) {
      setProfileView(pubProfile);
    } else {
      setProfileView({
        id: 'offline',
        username: 'Offline Leader',
        usernameLower: 'offline',
        countryCode: state.country[0],
        countryName: state.country[1],
        gdp: calculateGdp(state),
        cash: state.cash,
        gems: state.gems,
        level: 1,
        rank: state.rank,
        stats: {
          buildings: Object.values(state.b).reduce((a, b) => a + b, 0),
          completedTrades: 0,
          tradesSent: 0,
          tradesReceived: 0,
          cashTraded: 0,
          gemsTraded: 0,
        },
      });
    }
  };

  const openPlayerProfile = async (targetUid: string) => {
    const cached = leaderboard.find((p) => p.id === targetUid);
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
  };

  const openGiftComposer = async (targetUid: string) => {
    let target = leaderboard.find((p) => p.id === targetUid) || null;
    if (!target) {
      target = await fetchPlayerProfile(targetUid).catch(() => null);
    }
    if (!target) {
      addToast('Could not load recipient.');
      return;
    }
    setGiftModal({ mode: 'compose', target, trade: null });
  };

  const currentTabMeta = TAB_META[tab];
  const dayKey = dayKeyFor(Date.now() + serverOffsetMsRef.current);

  if (otherTabLocked || kicked) {
    return (
      <div className="modal" role="alertdialog" aria-modal="true">
        <div className="card">
          <h2>{kicked ? '⚠️ Signed in elsewhere' : '⚠️ Game already open'}</h2>
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
          onSelectCountry={(c: CountryTuple) => updateState((prev) => ({ ...prev, country: c }), 0)}
          onGoogleLogin={handleGoogleLogin}
          onEmailAuth={handleEmailAuth}
          onPlayOffline={() => setGateOpen(false)}
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
        <div className="bm">🏛️</div>
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
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenNotifications={() => {
            setNotifsOpen(true);
            if (uid) {
              const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
              if (unreadIds.length) void markNotificationsRead(uid, unreadIds).catch(() => {});
            }
          }}
          onOpenAuth={() => {
            if (uid) {
              openOwnProfile();
            } else {
              setGateOpen(true);
            }
          }}
        />

        <div className="main">
          {(!isMobile || tab === 'build') && (
            <HeroPanel
              state={state}
              tradeTier={tradeTier}
              serverOffsetMs={serverOffsetMsRef.current}
              showCity={!isMobile || tab === 'build'}
              burstKey={burstKey}
              onCollectTax={handleCollectTax}
              onActivateGemBoost={handleActivateGemBoost}
              onCityBuildingTap={handleCityBuildingTap}
            />
          )}

          <div className="card">
            <div className="tabs">
              <div className="ttl-ic">{currentTabMeta.emoji}</div>
              <div>
                <b>{currentTabMeta.label}</b>
                <small>{currentTabMeta.subtitle}</small>
              </div>
            </div>

            {tab === 'build' && (
              <BuildTab
                state={state}
                serverOffsetMs={serverOffsetMsRef.current}
                onBuyBuilding={handleBuyBuilding}
              />
            )}
            {tab === 'gov' && (
              <GovtTab
                state={state}
                uid={uid}
                projects={projects}
                liveProjectProgress={liveProjectProgress}
                serverOffsetMs={serverOffsetMsRef.current}
                isUserActive={Date.now() - lastActivityRef.current < 120_000}
                onFixInfra={handleFixInfra}
                onUpgradeBuilding={handleUpgradeBuilding}
                onStartProject={(type) => void handleStartProject(type)}
                onPayProjectStage={(pid) => void handlePayProjectStage(pid)}
              />
            )}
            {tab === 'policy' && (
              <PolicyTab
                state={state}
                uid={uid}
                serverOffsetMs={serverOffsetMsRef.current}
                onPolicyChange={handlePolicyChange}
                onChangeGov={handleChangeGov}
                onResetGame={handleResetGame}
                onSaveCloudNow={() => void performCloudSync(true)}
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
                globalChat={globalChat}
                dmMessages={dmMessages}
                dmRecipient={dmRecipient}
                recentDms={recentDms}
                onChangeSubTab={setPlayersSubTab}
                onOpenLogin={() => setGateOpen(true)}
                onOpenProfile={(targetUid) => void openPlayerProfile(targetUid)}
                onStartGift={(targetUid) => void openGiftComposer(targetUid)}
                onOpenDm={(targetUid, name, cc) => {
                  setDmRecipient({ uid: targetUid, name, cc });
                  setPlayersSubTab('dm');
                }}
                onBackDm={() => setDmRecipient(null)}
                onSendGlobalChat={async (text) => {
                  if (!uid || !pubProfile) return false;
                  try {
                    await sendGlobalChatMessage({
                      uid,
                      username: pubProfile.username,
                      countryCode: state.country[0],
                      rank: state.rank,
                      text,
                    });
                    return true;
                  } catch (err) {
                    addToast(formatFirebaseError(err));
                    return false;
                  }
                }}
                onSendDm={async (text) => {
                  if (!uid || !pubProfile || !dmRecipient) return false;
                  try {
                    await sendDirectMessage({
                      fromUid: uid,
                      fromName: pubProfile.username,
                      fromCc: state.country[0],
                      toUid: dmRecipient.uid,
                      text,
                      notify: true,
                    });
                    return true;
                  } catch (err) {
                    addToast(formatFirebaseError(err));
                    return false;
                  }
                }}
              />
            )}
            {tab === 'stickers' && <StickersTab state={state} onFuseSticker={handleFuseSticker} />}
            {tab === 'trade' && (
              <GiftsTab
                uid={uid}
                ready={cloudReady}
                subTab={giftsSubTab}
                trades={trades}
                leaderboard={leaderboard}
                sentToday={sentToday}
                serverOffsetMs={serverOffsetMsRef.current}
                onChangeSubTab={setGiftsSubTab}
                onOpenLogin={() => setGateOpen(true)}
                onOpenGiftCompose={(target) => setGiftModal({ mode: 'compose', target, trade: null })}
                onOpenGiftReview={(tr) => setGiftModal({ mode: 'review', target: null, trade: tr })}
                onAcceptTrade={async (id) => {
                  try {
                    await acceptGiftOffer(id, sidRef.current, handleKicked, serverOffsetMsRef.current);
                    addToast('🎁 Gift accepted!');
                  } catch (err) {
                    addToast(formatFirebaseError(err));
                  }
                }}
                onRejectTrade={async (id) => {
                  try {
                    await rejectGiftOffer(id, sidRef.current, handleKicked, serverOffsetMsRef.current);
                    addToast('Gift declined');
                  } catch (err) {
                    addToast(formatFirebaseError(err));
                  }
                }}
                onCancelTrade={async (id) => {
                  try {
                    await endSenderOffer(id, 'cancelled', sidRef.current, handleKicked, serverOffsetMsRef.current);
                    addToast('Gift cancelled & refunded');
                  } catch (err) {
                    addToast(formatFirebaseError(err));
                  }
                }}
                onSearchPlayers={async (q) => {
                  if (!uid) return [];
                  try {
                    return await searchPlayersByUsername(q, uid);
                  } catch {
                    return [];
                  }
                }}
              />
            )}
            {tab === 'quest' && (
              <QuestsTab
                state={state}
                dayKey={dayKey}
                rankPosition={rankPosition}
                onClaimQuest={handleClaimQuest}
              />
            )}
            {tab === 'shop' && (
              <ShopTab
                state={state}
                subTab={shopSubTab}
                dayKey={dayKey}
                serverOffsetMs={serverOffsetMsRef.current}
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

      {uid && cloudReady && (
        <button
          type="button"
          id="cloudPill"
          className={cloudStatus.cls}
          onClick={() => void performCloudSync(true)}
        >
          {cloudStatus.text}
        </button>
      )}

      <ProfileModal
        profile={profileView}
        isMe={!profileView || profileView.id === uid || profileView.id === 'offline'}
        uid={uid}
        onClose={() => setProfileView(null)}
        onGift={(p) => {
          setProfileView(null);
          setGiftModal({ mode: 'compose', target: p, trade: null });
        }}
        onMessage={(p) => {
          setProfileView(null);
          setDmRecipient({ uid: p.id, name: p.username, cc: p.countryCode });
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
        onRequestReset={handleResetGame}
        onClose={() => setSettingsOpen(false)}
      />

      <NotificationsModal
        open={notifsOpen}
        notifications={notifications}
        onClose={() => setNotifsOpen(false)}
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
        onCheckUsername={checkUsernameAvailability}
        onSubmitProfile={async (username, cc) => {
          try {
            await createPlayerProfile(username, cc, stateRef.current, sidRef.current, handleKicked);
            const p = await fetchPlayerProfile(uid!);
            if (p) setPubProfile(p);
            const chosen = COUNTRIES.find((c) => c[0] === cc) || COUNTRIES[0];
            updateState((prev) => ({ ...prev, country: chosen }), 500);
            setNeedsOnboarding(false);
            setCloudReady(true);
            addToast(`🎉 Welcome, ${username}!`);
          } catch (err) {
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
          serverOffsetMs={serverOffsetMsRef.current}
          onClose={() => setGiftModal(null)}
          onSendGift={async (payload) => {
            try {
              await createGiftOffer({
                ...payload,
                sid: sidRef.current,
                serverOffsetMs: serverOffsetMsRef.current,
                onKicked: handleKicked,
              });
              addToast('🎁 Gift sent!');
              return true;
            } catch (err) {
              addToast(formatFirebaseError(err));
              return false;
            }
          }}
          onAcceptTrade={async (id) => {
            try {
              await acceptGiftOffer(id, sidRef.current, handleKicked, serverOffsetMsRef.current);
              addToast('🎁 Gift accepted!');
            } catch (err) {
              addToast(formatFirebaseError(err));
            }
          }}
          onRejectTrade={async (id) => {
            try {
              await rejectGiftOffer(id, sidRef.current, handleKicked, serverOffsetMsRef.current);
              addToast('Gift declined');
            } catch (err) {
              addToast(formatFirebaseError(err));
            }
          }}
          onCancelTrade={async (id) => {
            try {
              await endSenderOffer(id, 'cancelled', sidRef.current, handleKicked, serverOffsetMsRef.current);
              addToast('Gift cancelled & refunded');
            } catch (err) {
              addToast(formatFirebaseError(err));
            }
          }}
        />
      )}

      <DialogModal dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}
