import React, { useState } from 'react';
import { DAILY_GIFT_MAX } from '../../game/constants';
import { formatNumber } from '../../game/rules';
import type { GiftsSubTab, PlayerProfile, TradeOffer } from '../../game/types';
import {
  Clock,
  CountryFlag,
  Gift,
  Lock,
  Mail,
  Package,
  Search,
  Sparkles,
} from '../GameIcons';

interface GiftsTabProps {
  uid: string | null;
  ready: boolean;
  subTab: GiftsSubTab;
  trades: TradeOffer[];
  leaderboard: PlayerProfile[];
  sentToday: number;
  serverOffsetMs: number;
  onChangeSubTab: (sub: GiftsSubTab) => void;
  onOpenLogin: () => void;
  onOpenGiftCompose: (target: PlayerProfile) => void;
  onOpenGiftReview: (trade: TradeOffer) => void;
  onAcceptTrade: (tradeId: string) => void;
  onRejectTrade: (tradeId: string) => void;
  onCancelTrade: (tradeId: string) => void;
  onSearchPlayers: (q: string) => Promise<PlayerProfile[]>;
}

function summarizeGift(t: TradeOffer): string {
  const parts: string[] = [];
  if (t.offerCash > 0) parts.push(`₨ ${formatNumber(t.offerCash)}`);
  if (t.offerGems > 0) parts.push(`${t.offerGems} Gems`);
  const stkCount = Object.values(t.offerStk || {}).reduce((a, b) => a + (b || 0), 0);
  if (stkCount > 0) parts.push(`${stkCount} Stickers`);
  return parts.length ? parts.join(' · ') : 'Empty gift';
}

export const GiftsTab: React.FC<GiftsTabProps> = ({
  uid,
  ready,
  subTab,
  trades,
  leaderboard,
  sentToday,
  serverOffsetMs,
  onChangeSubTab,
  onOpenLogin,
  onOpenGiftCompose,
  onOpenGiftReview,
  onAcceptTrade,
  onRejectTrade,
  onCancelTrade,
  onSearchPlayers,
}) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerProfile[] | null>(null);
  const [searching, setSearching] = useState(false);

  if (!uid) {
    return (
      <div className="empty">
        <div className="big">
          <Gift size={28} color="#ffc23d" />
        </div>
        <p className="dim">Sign in to send and receive gifts with other players.</p>
        <button type="button" className="btn gold" onClick={onOpenLogin}>
          <Lock size={15} />
          <span>Sign in</span>
        </button>
      </div>
    );
  }

  if (!ready) {
    return <p className="dim">Loading…</p>;
  }

  const nowSrv = Date.now() + serverOffsetMs;
  const incoming = trades.filter((t) => t.to === uid && t.status === 'pending' && t.expMs > nowSrv);
  const outgoing = trades.filter((t) => t.from === uid && t.status === 'pending' && t.expMs > nowSrv);
  const history = trades
    .filter((t) => t.status !== 'pending' || t.expMs <= nowSrv)
    .slice()
    .sort((a, b) => (b.resMs || b.createdMs) - (a.resMs || a.createdMs));

  const handleSearch = async (val: string) => {
    setSearchText(val);
    const trimmed = val.trim();
    if (trimmed.length < 2) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await onSearchPlayers(trimmed);
      setSearchResults(res);
    } finally {
      setSearching(false);
    }
  };

  const candidatePlayers =
    searchResults !== null ? searchResults : leaderboard.filter((p) => p.id !== uid);

  return (
    <div>
      <div className="tradelim">
        <span>Daily gift allowance</span>
        <b>
          {sentToday} / {DAILY_GIFT_MAX} sent
        </b>
      </div>

      <div className="subtabs">
        <button type="button" className={subTab === 'in' ? 'on' : ''} onClick={() => onChangeSubTab('in')}>
          <Package size={14} />
          <span>Inbox</span>
          {incoming.length > 0 && <em>{incoming.length}</em>}
        </button>
        <button type="button" className={subTab === 'out' ? 'on' : ''} onClick={() => onChangeSubTab('out')}>
          <Mail size={14} />
          <span>Sent ({outgoing.length})</span>
        </button>
        <button type="button" className={subTab === 'hist' ? 'on' : ''} onClick={() => onChangeSubTab('hist')}>
          <Clock size={14} />
          <span>History</span>
        </button>
        <button type="button" className={subTab === 'find' ? 'on' : ''} onClick={() => onChangeSubTab('find')}>
          <Gift size={14} />
          <span>Send Gift</span>
        </button>
      </div>

      {subTab === 'in' && (
        <>
          {incoming.length ? (
            <div className="list">
              {incoming.map((t) => {
                const leftMs = Math.max(0, t.expMs - nowSrv);
                const pct = Math.max(0, Math.min(100, (leftMs / 120_000) * 100));
                return (
                  <div
                    key={t.id}
                    className="row trow"
                    onClick={() => onOpenGiftReview(t)}
                  >
                    <div className="em">
                      <CountryFlag code={t.fromCountry} alt={t.fromCountry} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2>
                        {t.fromName} <span className="lv st-pending">{Math.ceil(leftMs / 1000)}s</span>
                      </h2>
                      <p>
                        {summarizeGift(t)}
                        {t.message ? ` — “${t.message}”` : ''}
                      </p>
                      <div className="countdown">
                        <i style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="tbtn">
                      <button
                        type="button"
                        className="btn sm mint"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcceptTrade(t.id);
                        }}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="btn sm red"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRejectTrade(t.id);
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <div className="big">
                <Package size={28} />
              </div>
              <p className="dim">No incoming gifts right now.</p>
            </div>
          )}
        </>
      )}

      {subTab === 'out' && (
        <>
          {outgoing.length ? (
            <div className="list">
              {outgoing.map((t) => {
                const leftMs = Math.max(0, t.expMs - nowSrv);
                const pct = Math.max(0, Math.min(100, (leftMs / 120_000) * 100));
                return (
                  <div
                    key={t.id}
                    className="row trow"
                    onClick={() => onOpenGiftReview(t)}
                  >
                    <div className="em">
                      <CountryFlag code={t.toCountry} alt={t.toCountry} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2>
                        To {t.toName} <span className="lv st-pending">{Math.ceil(leftMs / 1000)}s</span>
                      </h2>
                      <p>{summarizeGift(t)}</p>
                      <div className="countdown">
                        <i style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn sm red"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelTrade(t.id);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <div className="big">
                <Sparkles size={28} />
              </div>
              <p className="dim">No active outgoing gifts.</p>
              <button type="button" className="btn mint" onClick={() => onChangeSubTab('find')}>
                Find a player
              </button>
            </div>
          )}
        </>
      )}

      {subTab === 'hist' && (
        <>
          {history.length ? (
            <div className="list">
              {history.map((t) => {
                const isSender = t.from === uid;
                const peerName = isSender ? `To ${t.toName}` : `From ${t.fromName}`;
                const peerCc = isSender ? t.toCountry : t.fromCountry;
                const effStatus =
                  t.status === 'pending' && t.expMs <= nowSrv ? 'expired' : t.status;
                return (
                  <div key={t.id} className="row trow" onClick={() => onOpenGiftReview(t)}>
                    <div className="em">
                      <CountryFlag code={peerCc} alt={peerCc} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h2>
                        {peerName} <span className={`lv st-${effStatus}`}>{effStatus}</span>
                      </h2>
                      <p>{summarizeGift(t)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <div className="big">
                <Clock size={28} />
              </div>
              <p className="dim">No past gifts yet.</p>
            </div>
          )}
        </>
      )}

      {subTab === 'find' && (
        <div>
          <input
            className="inp"
            placeholder="Search username (min 2 chars)…"
            value={searchText}
            onChange={(e) => void handleSearch(e.target.value)}
          />
          {searching ? (
            <p className="dim">Searching…</p>
          ) : candidatePlayers.length ? (
            <div className="list">
              {candidatePlayers.map((p) => (
                <div key={p.id} className="row pcard">
                  <div className="em">
                    <CountryFlag code={p.countryCode} alt={p.countryCode} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h2>{p.username}</h2>
                    <p>
                      {p.countryName} · GDP ₨ {formatNumber(p.gdp || 0)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn sm mint"
                    disabled={sentToday >= DAILY_GIFT_MAX}
                    onClick={() => onOpenGiftCompose(p)}
                  >
                    <Gift size={14} />
                    <span>Gift</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="big">
                <Search size={28} />
              </div>
              <p className="dim">
                {searchText.trim().length >= 2
                  ? 'No matching players found.'
                  : 'No other players online right now. Type a username above to search.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
