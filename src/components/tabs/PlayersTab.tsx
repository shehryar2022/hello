import React, { useEffect, useRef, useState } from 'react';
import { ACTIVE_WINDOW_MS, RANKS } from '../../game/constants';
import { calculateGdp, flagUrl, formatNumber } from '../../game/rules';
import type { ChatMessage, DmRecipient, GameState, PlayerProfile, PlayersSubTab } from '../../game/types';
import { GdpChart } from '../GdpChart';

interface PlayersTabProps {
  state: GameState;
  uid: string | null;
  ready: boolean;
  subTab: PlayersSubTab;
  leaderboard: PlayerProfile[];
  lbLoaded: boolean;
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
          🌍 Real players <span className="lv" style={{ background: 'var(--mint)' }}>LIVE</span>
        </h2>
        <div className="empty">
          <div className="big">🔐</div>
          <p className="dim">Sign in to see active players and chat.</p>
          <button type="button" className="btn gold" onClick={onOpenLogin}>
            Sign in
          </button>
        </div>
        <GdpChart history={state.hist} currentGdp={calculateGdp(state)} />
      </div>
    );
  }

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
          🏆 Active
        </button>
        <button type="button" className={subTab === 'chat' ? 'on' : ''} onClick={() => onChangeSubTab('chat')}>
          🌍 Chat
        </button>
        <button type="button" className={subTab === 'dm' ? 'on' : ''} onClick={() => onChangeSubTab('dm')}>
          💌 Private
        </button>
      </div>

      {!ready ? (
        <p className="dim">Loading…</p>
      ) : subTab === 'lb' ? (
        <>
          <h2 className="f sec">
            🌍 Active players <span className="lv" style={{ background: 'var(--mint)' }}>ONLINE</span>
          </h2>
          {!lbLoaded ? (
            <p className="dim">Loading players…</p>
          ) : (
            <>
              <div className="list">
                {leaderboard.map((p, idx) => {
                  const me = p.id === uid;
                  const rk = RANKS[p.rank || 0] || RANKS[0];
                  const isOnline = !me && p.seen && Date.now() - p.seen <= ACTIVE_WINDOW_MS;
                  return (
                    <div key={p.id} className={`row pcard ${me ? 'me' : ''}`}>
                      <div className={`medal m${idx + 1}`}>{idx + 1}</div>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                          <span style={{ width: 24, height: 17, flex: 'none', display: 'inline-block' }}>
                            <img className="flagimg" src={flagUrl(p.countryCode)} alt={p.countryCode} referrerPolicy="no-referrer" />
                          </span>
                          {isOnline && <i className="onl" />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.username}</span>
                          {rk.e && (
                            <span className="rank-badge" style={{ '--c': rk.c } as React.CSSProperties} title={rk.n}>
                              {rk.e}
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
                          👤
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
                              🎁
                            </button>
                            <button
                              type="button"
                              className="btn sm"
                              style={{ minWidth: 0 }}
                              title="Message"
                              aria-label={`Message ${p.username}`}
                              onClick={() => onOpenDm(p.id, p.username, p.countryCode)}
                            >
                              💬
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
            🌍 Global chat <small>be kind · max 200 chars</small>
          </div>
          <div className="chlist" ref={listRef}>
            {globalChat.length ? (
              globalChat.map((m) => {
                const rk = RANKS[m.rank || 0] || RANKS[0];
                return (
                  <div key={m.id} className={`cm ${m.uid === uid ? 'me' : ''}`}>
                    <div className="cmh">
                      <span className="cmf">
                        <img src={flagUrl(m.cc)} alt={m.cc} referrerPolicy="no-referrer" />
                      </span>
                      <button type="button" className="cmn" onClick={() => onOpenProfile(m.uid)}>
                        {m.name || 'Player'}
                      </button>
                      {rk.e && <span title={rk.n}>{rk.e}</span>}
                      <small>{formatWhen(m.ms)}</small>
                    </div>
                    <div className="cmt">{m.text}</div>
                  </div>
                );
              })
            ) : (
              <p className="dim" style={{ textAlign: 'center', margin: '16px 0' }}>
                No messages yet — say hi 👋
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
            Private chats. Tap 💬 next to a player to start one.
          </p>
          {recentDms.length ? (
            <div className="list">
              {recentDms.map((r) => (
                <div key={r.uid} className="row">
                  <div className="em">
                    <img className="flagimg" src={flagUrl(r.cc)} alt={r.cc} referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h2>{r.name}</h2>
                  </div>
                  <button
                    type="button"
                    className="btn sm mint"
                    onClick={() => onOpenDm(r.uid, r.name, r.cc)}
                  >
                    💬 Open
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="big">💌</div>
              <p className="dim">No private chats yet.</p>
            </div>
          )}
        </>
      ) : (
        <div className="chbox">
          <div className="chhd">
            <button type="button" className="btn sm" style={{ minWidth: 0 }} onClick={onBackDm}>
              ←
            </button>
            <span className="cmf">
              <img src={flagUrl(dmRecipient.cc)} alt={dmRecipient.cc} referrerPolicy="no-referrer" />
            </span>
            {dmRecipient.name}
          </div>
          <div className="chlist" ref={listRef}>
            {dmMessages.length ? (
              dmMessages.map((m) => (
                <div key={m.id} className={`cm ${m.uid === uid ? 'me' : ''}`}>
                  <div className="cmh">
                    <span className="cmf">
                      <img src={flagUrl(m.cc)} alt={m.cc} referrerPolicy="no-referrer" />
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
                No messages yet — say hi 👋
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
