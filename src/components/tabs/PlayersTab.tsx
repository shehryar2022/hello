import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_RANK, RANKS, SUBSCRIPTIONS } from '../../game/constants';
import { isPlayerOnline } from '../../firebase/presence';
import {
  calculateGdp,
  computeLeaderboardMetrics,
  formatNumber,
  isProfileSubActive,
  sortLeaderboardProfiles,
} from '../../game/rules';
import type {
  ChatMessage,
  DmRecipient,
  GameState,
  LeaderboardMode,
  PlayerProfile,
  PlayersSubTab,
} from '../../game/types';
import {
  ChevronLeft,
  ChevronRight,
  CountryFlag,
  Gift,
  Globe,
  IdCard,
  Lock,
  Mail,
  MessageSquare,
  RankEmblem,
  Search,
  SubIcon,
  TrendingUp,
} from '../GameIcons';
import { GdpChart } from '../GdpChart';

interface PlayersTabProps {
  state: GameState;
  uid: string | null;
  ready: boolean;
  subTab: PlayersSubTab;
  leaderboard: PlayerProfile[];
  lbLoaded: boolean;
  serverOffsetMs?: number;
  globalChat: ChatMessage[];
  dmMessages: ChatMessage[];
  dmRecipient: DmRecipient | null;
  recentDms: DmRecipient[];
  onChangeSubTab: (sub: PlayersSubTab) => void;
  onOpenLogin: () => void;
  onOpenProfile: (uid: string) => void;
  onStartGift: (uid: string) => void;
  onOpenDm: (uid: string, name: string, cc: string) => void;
  onBackDm: () => void;
  onSendGlobalChat: (text: string) => Promise<boolean>;
  onSendDm: (text: string) => Promise<boolean>;
}

const LB_MODES: Array<{ id: LeaderboardMode; label: string; unit: string }> = [
  { id: 'overall', label: 'Overall GDP', unit: 'GDP' },
  { id: 'netWorth', label: 'Net Worth', unit: 'Wealth' },
  { id: 'buildingDev', label: 'City Dev', unit: 'Dev Pts' },
  { id: 'production', label: 'Production', unit: 'Output/s' },
  { id: 'contribution', label: 'Contribution', unit: 'Contrib' },
  { id: 'weekly', label: 'Weekly', unit: 'Wk Score' },
  { id: 'monthly', label: 'Monthly', unit: 'Mo Score' },
];
const PAGE_SIZE = 10;

const WHEN_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatWhen(ms: number): string {
  if (!ms) return '';
  return WHEN_FORMATTER.format(new Date(ms));
}

interface LeaderboardRowProps {
  p: PlayerProfile;
  rankIndex: number;
  me: boolean;
  isOnline: boolean;
  subTier: '' | 'daily' | 'weekly' | 'monthly';
  lbMode: LeaderboardMode;
  unitLabel: string;
  onOpenProfile: (uid: string) => void;
  onStartGift: (uid: string) => void;
  onOpenDm: (uid: string, name: string, cc: string) => void;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = memo(({
  p,
  rankIndex,
  me,
  isOnline,
  subTier,
  lbMode,
  unitLabel,
  onOpenProfile,
  onStartGift,
  onOpenDm,
}) => {
  const rk = RANKS[Math.max(1, Math.min(MAX_RANK, p.rank || 1))] || RANKS[1];
  const subLabel = subTier
    ? SUBSCRIPTIONS.find((x) => x.id === subTier)?.periodLabel || subTier
    : '';
  const metricVal = computeLeaderboardMetrics(p)[lbMode];

  return (
    <div
      className={`row pcard ${me ? 'me' : ''} ${subTier ? `sub-card sub-card--${subTier}` : ''}`}
      data-testid={`lb-row-${p.id}`}
    >
      <div className={`medal m${rankIndex + 1}`}>{rankIndex + 1}</div>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <span style={{ width: 24, height: 17, flex: 'none', display: 'inline-block' }}>
            <CountryFlag code={p.countryCode} alt={p.countryCode} />
          </span>
          {!me && <i className={`onl${isOnline ? '' : ' off'}`} aria-hidden="true" />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.username}</span>
          {rk.id > 0 && (
            <span className="rank-badge" style={{ '--c': rk.c } as React.CSSProperties} title={rk.n}>
              <RankEmblem rank={rk.id} size={18} />
            </span>
          )}
          {subTier && (
            <span className={`sub-crest sub-crest--${subTier}`} title={`${subLabel} Subscriber`}>
              <span className="sub-crest-ic">
                <SubIcon tier={subTier} size={11} />
              </span>
              <span>{subLabel}</span>
            </span>
          )}
        </h2>
        <p>
          {p.countryName} · {unitLabel}{' '}
          {lbMode === 'buildingDev' || lbMode === 'production' || lbMode === 'contribution'
            ? formatNumber(metricVal)
            : `₨ ${formatNumber(metricVal)}`}
          {me ? ' · you' : ''}
        </p>
      </div>
      <div className="tbtn" style={{ gridAutoFlow: 'column' }}>
        <button
          type="button"
          className="btn sm"
          style={{ minWidth: 0 }}
          title="Profile"
          aria-label={`View ${p.username} profile`}
          onClick={() => onOpenProfile(p.id)}
        >
          <IdCard size={15} />
        </button>
        {!me && (
          <>
            <button
              type="button"
              className="btn sm mint"
              style={{ minWidth: 0 }}
              title="Gift"
              aria-label={`Gift ${p.username}`}
              onClick={() => onStartGift(p.id)}
            >
              <Gift size={15} />
            </button>
            <button
              type="button"
              className="btn sm"
              style={{ minWidth: 0 }}
              title="Message"
              aria-label={`Message ${p.username}`}
              onClick={() => onOpenDm(p.id, p.username, p.countryCode)}
            >
              <Mail size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export const PlayersTab: React.FC<PlayersTabProps> = memo(({
  state,
  uid,
  ready,
  subTab,
  leaderboard,
  lbLoaded,
  serverOffsetMs = 0,
  globalChat,
  dmMessages,
  dmRecipient,
  recentDms,
  onChangeSubTab,
  onOpenLogin,
  onOpenProfile,
  onStartGift,
  onOpenDm,
  onBackDm,
  onSendGlobalChat,
  onSendDm,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [dmInput, setDmInput] = useState('');
  const [lbMode, setLbMode] = useState<LeaderboardMode>('overall');
  const [lbSearch, setLbSearch] = useState('');
  const [lbPage, setLbPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  const currentGdp = useMemo(() => calculateGdp(state), [state]);
  const sortedLb = useMemo(() => sortLeaderboardProfiles(leaderboard, lbMode), [leaderboard, lbMode]);
  const filteredLb = useMemo(() => {
    const q = lbSearch.trim().toLowerCase();
    if (!q) return sortedLb;
    return sortedLb.filter(
      (p) =>
        p.username.toLowerCase().includes(q) ||
        p.countryName.toLowerCase().includes(q) ||
        p.countryCode.toLowerCase().includes(q),
    );
  }, [sortedLb, lbSearch]);
  const totalPages = Math.max(1, Math.ceil(filteredLb.length / PAGE_SIZE));
  const safePage = Math.min(lbPage, totalPages);
  const pagedLb = useMemo(
    () => filteredLb.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredLb, safePage],
  );
  const activeModeMeta = LB_MODES.find((m) => m.id === lbMode) || LB_MODES[0];

  useEffect(() => {
    setLbPage(1);
  }, [lbMode, lbSearch]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [globalChat.length, dmMessages.length, subTab, dmRecipient?.uid]);

  if (!uid) {
    return (
      <div>
        <h2 className="f sec">
          <Globe size={18} color="#3fe0b0" />
          <span>Real players</span>
          <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>LIVE</span>
        </h2>
        <div className="empty">
          <div className="big">
            <Lock size={28} />
          </div>
          <p className="dim">Sign in to see active players and chat.</p>
          <button type="button" className="btn gold" onClick={onOpenLogin}>
            Sign in
          </button>
        </div>
        <GdpChart history={state.hist} currentGdp={currentGdp} />
      </div>
    );
  }

  const nowSrv = (state.t || Date.now()) + serverOffsetMs;

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    const ok = await onSendGlobalChat(trimmed);
    if (ok) setChatInput('');
  };

  const handleSendDm = async () => {
    const trimmed = dmInput.trim();
    if (!trimmed) return;
    const ok = await onSendDm(trimmed);
    if (ok) setDmInput('');
  };

  return (
    <div>
      <div className="subtabs">
        <button type="button" className={subTab === 'lb' ? 'on' : ''} onClick={() => onChangeSubTab('lb')}>
          <TrendingUp size={14} />
          <span>Rankings</span>
        </button>
        <button type="button" className={subTab === 'chat' ? 'on' : ''} onClick={() => onChangeSubTab('chat')}>
          <MessageSquare size={14} />
          <span>Chat</span>
        </button>
        <button type="button" className={subTab === 'dm' ? 'on' : ''} onClick={() => onChangeSubTab('dm')}>
          <Mail size={14} />
          <span>Private</span>
        </button>
      </div>

      {!ready ? (
        <p className="dim">Loading…</p>
      ) : subTab === 'lb' ? (
        <>
          <h2 className="f sec">
            <Globe size={18} color="#3fe0b0" />
            <span>Global Rankings</span>
            <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>LIVE</span>
          </h2>

          <div className="lb-modes" role="group" aria-label="Leaderboard ranking mode">
            {LB_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`fchip ${lbMode === m.id ? 'on' : ''}`}
                onClick={() => setLbMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="build-search-wrap" style={{ marginBottom: 10 }}>
            <Search size={14} color="#a79fd0" />
            <input
              type="search"
              className="inp build-search-inp"
              placeholder="Search leaders or nations…"
              aria-label="Search leaderboard"
              value={lbSearch}
              onChange={(e) => setLbSearch(e.target.value)}
            />
          </div>

          {!lbLoaded ? (
            <p className="dim">Loading players…</p>
          ) : (
            <>
              <div className="list">
                {pagedLb.map((p, idx) => {
                  const globalIdx = (safePage - 1) * PAGE_SIZE + idx;
                  const me = p.id === uid;
                  const isOnline = !me && isPlayerOnline(p.seen, nowSrv);
                  const subTier = isProfileSubActive(p, nowSrv);
                  return (
                    <LeaderboardRow
                      key={p.id}
                      p={p}
                      rankIndex={globalIdx}
                      me={me}
                      isOnline={isOnline}
                      subTier={subTier}
                      lbMode={lbMode}
                      unitLabel={activeModeMeta.unit}
                      onOpenProfile={onOpenProfile}
                      onStartGift={onStartGift}
                      onOpenDm={onOpenDm}
                    />
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={safePage <= 1}
                    onClick={() => setLbPage((pg) => Math.max(1, pg - 1))}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span className="dim" style={{ fontSize: 12 }}>
                    Page {safePage} / {totalPages} ({filteredLb.length} nations)
                  </span>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setLbPage((pg) => Math.min(totalPages, pg + 1))}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
              <p className="cnote" style={{ marginTop: 8 }}>
                {leaderboard.length < 2 ? 'Nobody else is online right now. ' : ''}
                Only players active in the last 5 minutes are listed. Ranks update live.
              </p>
            </>
          )}
          <GdpChart history={state.hist} currentGdp={currentGdp} />
        </>
      ) : subTab === 'chat' ? (
        <div className="chbox">
          <div className="chhd">
            <Globe size={16} color="#5ccbff" />
            <span>Global chat</span>
            <small>be kind · max 200 chars</small>
          </div>
          <div className="chlist" ref={listRef}>
            {globalChat.length ? (
              globalChat.map((m) => {
                const rk = RANKS[Math.max(1, Math.min(MAX_RANK, m.rank || 1))] || RANKS[1];
                const senderProfile = leaderboard.find((p) => p.id === m.uid);
                const subTier = isProfileSubActive(senderProfile, nowSrv);
                return (
                  <div key={m.id} className={`cm ${m.uid === uid ? 'me' : ''} ${subTier ? `sub-card sub-card--${subTier}` : ''}`}>
                    <div className="cmh">
                      <span className="cmf">
                        <CountryFlag code={m.cc} alt={m.cc} className="" />
                      </span>
                      <button type="button" className="cmn" onClick={() => onOpenProfile(m.uid)}>
                        {m.name || 'Player'}
                      </button>
                      {rk.id > 0 && <RankEmblem rank={rk.id} size={15} />}
                      {subTier && (
                        <span className={`sub-crest sub-crest--${subTier}`}>
                          <span className="sub-crest-ic">
                            <SubIcon tier={subTier} size={10} />
                          </span>
                        </span>
                      )}
                      <small>{formatWhen(m.ms)}</small>
                    </div>
                    <div className="cmt">{m.text}</div>
                  </div>
                );
              })
            ) : (
              <p className="dim" style={{ textAlign: 'center', margin: '16px 0' }}>
                No messages yet — say hello!
              </p>
            )}
          </div>
          <div className="chin">
            <input
              className="inp"
              maxLength={200}
              placeholder="Say something…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendChat();
                }
              }}
            />
            <button type="button" className="btn sm mint" onClick={() => void handleSendChat()}>
              Send
            </button>
          </div>
        </div>
      ) : !dmRecipient ? (
        <>
          <p className="dim" style={{ marginBottom: 8 }}>
            Private chats. Tap the mail icon next to any player to start one.
          </p>
          {recentDms.length ? (
            <div className="list">
              {recentDms.map((r) => (
                <div key={r.uid} className="row">
                  <div className="em">
                    <CountryFlag code={r.cc} alt={r.cc} />
                  </div>
                  <div>
                    <h2>{r.name}</h2>
                  </div>
                  <button
                    type="button"
                    className="btn sm mint"
                    onClick={() => onOpenDm(r.uid, r.name, r.cc)}
                  >
                    <Mail size={14} />
                    <span>Open</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="big">
                <Mail size={28} />
              </div>
              <p className="dim">No private chats yet.</p>
            </div>
          )}
        </>
      ) : (
        <div className="chbox">
          <div className="chhd">
            <button type="button" className="btn sm" style={{ minWidth: 0 }} onClick={onBackDm} aria-label="Back to DM list">
              ←
            </button>
            <span className="cmf">
              <CountryFlag code={dmRecipient.cc} alt={dmRecipient.cc} className="" />
            </span>
            <span>{dmRecipient.name}</span>
          </div>
          <div className="chlist" ref={listRef}>
            {dmMessages.length ? (
              dmMessages.map((m) => (
                <div key={m.id} className={`cm ${m.uid === uid ? 'me' : ''}`}>
                  <div className="cmh">
                    <span className="cmf">
                      <CountryFlag code={m.cc} alt={m.cc} className="" />
                    </span>
                    <button type="button" className="cmn" onClick={() => onOpenProfile(m.uid)}>
                      {m.name || 'Player'}
                    </button>
                    <small>{formatWhen(m.ms)}</small>
                  </div>
                  <div className="cmt">{m.text}</div>
                </div>
              ))
            ) : (
              <p className="dim" style={{ textAlign: 'center', margin: '16px 0' }}>
                No messages yet — say hello!
              </p>
            )}
          </div>
          <div className="chin">
            <input
              className="inp"
              maxLength={300}
              placeholder={`Message ${dmRecipient.name}…`}
              value={dmInput}
              onChange={(e) => setDmInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendDm();
                }
              }}
            />
            <button type="button" className="btn sm mint" onClick={() => void handleSendDm()}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  if (
    prev.serverOffsetMs !== next.serverOffsetMs ||
    prev.uid !== next.uid ||
    prev.ready !== next.ready ||
    prev.subTab !== next.subTab ||
    prev.leaderboard !== next.leaderboard ||
    prev.lbLoaded !== next.lbLoaded ||
    prev.globalChat !== next.globalChat ||
    prev.dmMessages !== next.dmMessages ||
    prev.dmRecipient !== next.dmRecipient ||
    prev.recentDms !== next.recentDms ||
    prev.onChangeSubTab !== next.onChangeSubTab ||
    prev.onOpenLogin !== next.onOpenLogin ||
    prev.onOpenProfile !== next.onOpenProfile ||
    prev.onStartGift !== next.onStartGift ||
    prev.onOpenDm !== next.onOpenDm ||
    prev.onBackDm !== next.onBackDm ||
    prev.onSendGlobalChat !== next.onSendGlobalChat ||
    prev.onSendDm !== next.onSendDm
  ) {
    return false;
  }
  const p = prev.state;
  const n = next.state;
  if (
    p.hist !== n.hist ||
    p.cash !== n.cash ||
    p.rank !== n.rank ||
    p.b !== n.b ||
    p.tech !== n.tech ||
    p.gx?.lvl !== n.gx?.lvl ||
    p.sub !== n.sub
  ) {
    return false;
  }
  const pBucket = Math.floor(((p.t || 0) + (prev.serverOffsetMs || 0)) / 30_000);
  const nBucket = Math.floor(((n.t || 0) + (next.serverOffsetMs || 0)) / 30_000);
  return pBucket === nBucket;
});
