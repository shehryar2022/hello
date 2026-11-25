import React, { useEffect, useRef, useState } from 'react';
import { ACTIVE_WINDOW_MS, RANKS, SUBSCRIPTIONS } from '../../game/constants';
import { calculateGdp, formatNumber, isProfileSubActive } from '../../game/rules';
import type { ChatMessage, DmRecipient, GameState, PlayerProfile, PlayersSubTab } from '../../game/types';
import {
  CountryFlag,
  Gift,
  Globe,
  IdCard,
  Lock,
  Mail,
  MessageSquare,
  RankEmblem,
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

function formatWhen(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const PlayersTab: React.FC<PlayersTabProps> = ({
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
  const listRef = useRef<HTMLDivElement>(null);

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
        <GdpChart history={state.hist} currentGdp={calculateGdp(state)} />
      </div>
    );
  }

  const nowSrv = Date.now() + serverOffsetMs;

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
          <span>Active</span>
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
            <span>Active players</span>
            <span className="lv" style={{ background: 'var(--mint)', color: '#04332a' }}>ONLINE</span>
          </h2>
          {!lbLoaded ? (
            <p className="dim">Loading players…</p>
          ) : (
            <>
              <div className="list">
                {leaderboard.map((p, idx) => {
                  const me = p.id === uid;
                  const rk = RANKS[p.rank || 0] || RANKS[0];
                  const isOnline = !me && p.seen && nowSrv - p.seen <= ACTIVE_WINDOW_MS;
                  const subTier = isProfileSubActive(p, nowSrv);
                  const subLabel = subTier
                    ? SUBSCRIPTIONS.find((x) => x.id === subTier)?.periodLabel || subTier
                    : '';
                  return (
                    <div
                      key={p.id}
                      className={`row pcard ${me ? 'me' : ''} ${subTier ? `sub-card sub-card--${subTier}` : ''}`}
                    >
                      <div className={`medal m${idx + 1}`}>{idx + 1}</div>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                          <span style={{ width: 24, height: 17, flex: 'none', display: 'inline-block' }}>
                            <CountryFlag code={p.countryCode} alt={p.countryCode} />
                          </span>
                          {isOnline && <i className="onl" />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.username}</span>
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
                          {p.countryName} · GDP ₨ {formatNumber(p.gdp || 0)}
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
                })}
              </div>
              <p className="cnote" style={{ marginTop: 8 }}>
                {leaderboard.length < 2 ? 'Nobody else is online right now. ' : ''}
                Only players active in the last 4 minutes are listed. Ranks update live.
              </p>
            </>
          )}
          <GdpChart history={state.hist} currentGdp={calculateGdp(state)} />
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
                const rk = RANKS[m.rank || 0] || RANKS[0];
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
};
