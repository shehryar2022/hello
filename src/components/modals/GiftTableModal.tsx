import React, { useEffect, useMemo, useState } from 'react';
import { STICKERS } from '../../game/constants';
import { formatNumber } from '../../game/rules';
import type { GameState, PlayerProfile, TradeOffer } from '../../game/types';
import { CashCoinIcon, CountryFlag, GemDiamondIcon, Gift, StickerArt } from '../GameIcons';

interface GiftTableModalProps {
  mode: 'compose' | 'review';
  state: GameState;
  uid: string;
  myName: string;
  myCountryCode: string;
  target: PlayerProfile | null;
  trade: TradeOffer | null;
  serverOffsetMs: number;
  onClose: () => void;
  onSendGift: (payload: {
    toUid: string;
    offerCash: number;
    offerGems: number;
    offerStk: Record<string, number>;
    message: string;
  }) => Promise<boolean>;
  onAcceptTrade: (tradeId: string) => Promise<void>;
  onRejectTrade: (tradeId: string) => Promise<void>;
  onCancelTrade: (tradeId: string) => Promise<void>;
}

interface SlotEntry {
  kind: 'cash' | 'gems' | 'stk';
  label: string;
  qty: string;
  stkId?: string;
}

const SLOTS_MAX = 16;

export const GiftTableModal: React.FC<GiftTableModalProps> = ({
  mode,
  state,
  uid,
  myName,
  myCountryCode,
  target,
  trade,
  serverOffsetMs,
  onClose,
  onSendGift,
  onAcceptTrade,
  onRejectTrade,
  onCancelTrade,
}) => {
  const [cash, setCash] = useState(0);
  const [gems, setGems] = useState(0);
  const [stk, setStk] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const maxCash = Math.max(0, Math.min(1e12, Math.floor(state.cash)));
  const maxGems = Math.max(0, Math.min(1e9, Math.floor(state.gems)));

  const clampedCash = Math.max(0, Math.min(maxCash, Math.floor(cash)));
  const clampedGems = Math.max(0, Math.min(maxGems, Math.floor(gems)));
  const clampedStk = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, count] of Object.entries(stk)) {
      const own = Math.max(0, Math.floor(state.stk[id] || 0));
      const qty = Math.min(own, Math.max(0, Math.floor(count || 0)));
      if (qty > 0) out[id] = qty;
    }
    return out;
  }, [stk, state.stk]);

  const effectiveCash = mode === 'review' && trade ? trade.offerCash : clampedCash;
  const effectiveGems = mode === 'review' && trade ? trade.offerGems : clampedGems;
  const effectiveStk = mode === 'review' && trade ? trade.offerStk : clampedStk;

  const traySlots = useMemo(() => {
    const items: SlotEntry[] = [];
    if (effectiveCash > 0) {
      items.push({ kind: 'cash', label: 'CASH', qty: formatNumber(effectiveCash) });
    }
    if (effectiveGems > 0) {
      items.push({ kind: 'gems', label: 'GEMS', qty: String(effectiveGems) });
    }
    for (const [id, count] of Object.entries(effectiveStk || {})) {
      if (count > 0 && items.length < SLOTS_MAX) {
        const def = STICKERS.find((s) => s.id === id);
        if (def) {
          items.push({
            kind: 'stk',
            label: def.n.split(' ')[0].toUpperCase(),
            qty: `×${count}`,
            stkId: id,
          });
        }
      }
    }
    return items;
  }, [effectiveCash, effectiveGems, effectiveStk]);

  const totalParts: string[] = [];
  if (effectiveCash > 0) totalParts.push(`₨ ${formatNumber(effectiveCash)}`);
  if (effectiveGems > 0) totalParts.push(`${effectiveGems} Gems`);
  const stkTotal = Object.values(effectiveStk || {}).reduce((a, b) => a + (b || 0), 0);
  if (stkTotal > 0) totalParts.push(`${stkTotal} Stickers`);
  const totalSummary = totalParts.join(' · ');

  const ownedStickers = STICKERS.filter((s) => (state.stk[s.id] || 0) > 0);

  const toggleSticker = (id: string) => {
    if (mode !== 'compose') return;
    const owned = state.stk[id] || 0;
    const cur = stk[id] || 0;
    if (cur < owned) {
      setStk({ ...stk, [id]: cur + 1 });
    } else {
      const next = { ...stk };
      delete next[id];
      setStk(next);
    }
  };

  const removeSlot = (entry: SlotEntry) => {
    if (mode !== 'compose') return;
    if (entry.kind === 'cash') setCash(0);
    else if (entry.kind === 'gems') setGems(0);
    else if (entry.kind === 'stk' && entry.stkId) {
      const next = { ...stk };
      delete next[entry.stkId];
      setStk(next);
    }
  };

  const peerName =
    mode === 'compose'
      ? target?.username || 'Player'
      : trade?.from === uid
        ? trade.toName
        : trade?.fromName || 'Player';
  const peerCc =
    mode === 'compose'
      ? target?.countryCode || ''
      : trade?.from === uid
        ? trade.toCountry
        : trade?.fromCountry || '';
  const peerSub =
    mode === 'compose' && target
      ? `${target.countryName} · GDP ₨ ${formatNumber(target.gdp || 0)}`
      : trade?.from === uid
        ? `Outgoing gift · ${trade.status}`
        : `Incoming gift · ${trade?.status || ''}`;

  const nowSrv = Date.now() + serverOffsetMs;
  const isIncomingPending =
    mode === 'review' && trade && trade.to === uid && trade.status === 'pending' && trade.expMs > nowSrv;
  const isOutgoingPending =
    mode === 'review' && trade && trade.from === uid && trade.status === 'pending' && trade.expMs > nowSrv;

  const handleConfirmSend = async () => {
    if (!target || busy) return;
    if (clampedCash + clampedGems + Object.values(clampedStk).reduce((a, b) => a + b, 0) <= 0) {
      setConfirming(false);
      return;
    }
    setBusy(true);
    try {
      const ok = await onSendGift({
        toUid: target.id,
        offerCash: clampedCash,
        offerGems: clampedGems,
        offerStk: clampedStk,
        message: message.trim().slice(0, 140),
      });
      if (ok) onClose();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div id="tov" role="dialog" aria-modal="true" aria-label="Gift Table" onClick={onClose}>
      <div className="tt" onClick={(e) => e.stopPropagation()}>
        <div className="ttbar">
          <h2>
            <Gift size={20} color="#ffc23d" />
            <span>{mode === 'compose' ? 'Send a Gift' : 'Gift Details'}</span>
          </h2>
          {mode === 'review' && trade && (
            <span className="tag">
              {trade.status === 'pending' && trade.expMs > nowSrv
                ? `${Math.ceil((trade.expMs - nowSrv) / 1000)}s left`
                : trade.status}
            </span>
          )}
          <button type="button" className="btn sm" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div className="ttrcpt">
          <div className="tr-flag">
            <CountryFlag code={peerCc} alt={peerCc} className="" />
          </div>
          <div className="tr-info">
            <div className="tr-label">{mode === 'compose' ? 'Recipient' : trade?.from === uid ? 'To' : 'From'}</div>
            <div className="tr-name">{peerName}</div>
            <div className="tr-bal">{peerSub}</div>
          </div>
        </div>

        {mode === 'compose' && (
          <div className="ttyou">
            <div className="ty-flag">
              <CountryFlag code={myCountryCode} alt={myCountryCode} className="" />
            </div>
            <div className="ty-meta">
              <div className="ty-nm">{myName || 'You'}</div>
              <div className="ty-bal">
                <span>Balance:</span>
                <b>₨ {formatNumber(state.cash)}</b>
                <span>·</span>
                <b>
                  <GemDiamondIcon size={13} /> {Math.floor(state.gems)}
                </b>
              </div>
            </div>
          </div>
        )}

        <div className="ttgift">
          <div className="ttgift-hdr">
            <h3>{mode === 'compose' ? 'Your Gift Package' : 'Gift Contents'}</h3>
            <small>{traySlots.length}/{SLOTS_MAX} slots</small>
          </div>

          <div className="ttgift-total">
            <div className="lbl">{mode === 'compose' ? 'Total you send' : 'Total gift'}</div>
            <div id="tt-pay-total" className={`amt ${totalSummary ? '' : 'empty'}`}>
              {totalSummary || 'Nothing added yet'}
            </div>
          </div>

          <div className="slots">
            {Array.from({ length: SLOTS_MAX }).map((_, idx) => {
              const entry = traySlots[idx];
              if (!entry) return <div key={idx} className="slot" />;
              return (
                <button
                  key={idx}
                  type="button"
                  className="slot has"
                  title={mode === 'compose' ? 'Tap to remove' : entry.label}
                  onClick={() => removeSlot(entry)}
                >
                  <span className="l">{entry.label}</span>
                  {entry.kind === 'cash' ? (
                    <CashCoinIcon size={24} />
                  ) : entry.kind === 'gems' ? (
                    <GemDiamondIcon size={24} />
                  ) : (
                    entry.stkId && <StickerArt id={entry.stkId} size={22} />
                  )}
                  <span className="q">{entry.qty}</span>
                </button>
              );
            })}
          </div>

          {mode === 'compose' ? (
            <>
              <div className="chips2">
                <div className="chiprow">
                  <button type="button" onClick={() => setCash((c) => Math.min(maxCash, c + 10_000))}>
                    +10K
                  </button>
                  <button type="button" onClick={() => setCash((c) => Math.min(maxCash, c + 100_000))}>
                    +100K
                  </button>
                  <button type="button" onClick={() => setCash((c) => Math.min(maxCash, c + 1_000_000))}>
                    +1M
                  </button>
                  <button type="button" className="max" onClick={() => setCash(maxCash)}>
                    MAX ₨
                  </button>
                </div>
                <div className="chiprow">
                  <button type="button" onClick={() => setGems((g) => Math.min(maxGems, g + 1))}>
                    +1 <GemDiamondIcon size={13} />
                  </button>
                  <button type="button" onClick={() => setGems((g) => Math.min(maxGems, g + 5))}>
                    +5 <GemDiamondIcon size={13} />
                  </button>
                  <button type="button" onClick={() => setGems((g) => Math.min(maxGems, g + 25))}>
                    +25 <GemDiamondIcon size={13} />
                  </button>
                  <button type="button" className="max" onClick={() => setGems(maxGems)}>
                    MAX <GemDiamondIcon size={13} />
                  </button>
                </div>
              </div>

              <div className="ttin">
                <input
                  type="number"
                  min={0}
                  max={maxCash}
                  className="inp"
                  placeholder="Cash ₨"
                  value={clampedCash || ''}
                  onChange={(e) => {
                    const n = Math.floor(Number(e.target.value) || 0);
                    setCash(Math.max(0, Math.min(maxCash, n)));
                  }}
                />
                <input
                  type="number"
                  min={0}
                  max={maxGems}
                  className="inp"
                  placeholder="Diamonds"
                  value={clampedGems || ''}
                  onChange={(e) => {
                    const n = Math.floor(Number(e.target.value) || 0);
                    setGems(Math.max(0, Math.min(maxGems, n)));
                  }}
                />
              </div>

              {ownedStickers.length > 0 && (
                <div className="stkpick">
                  {ownedStickers.map((s) => {
                    const added = clampedStk[s.id] || 0;
                    const own = state.stk[s.id] || 0;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`stkbtn ${added > 0 ? 'on' : ''}`}
                        title={`${s.n} (own ${own})`}
                        onClick={() => toggleSticker(s.id)}
                      >
                        {added > 0 && <b>×{added}</b>}
                        <StickerArt id={s.id} size={22} />
                        <small>{own}</small>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="ttmsg">
                <input
                  className="inp"
                  maxLength={140}
                  placeholder="Optional note (max 140 chars)…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </>
          ) : (
            trade?.message && (
              <p className="dim" style={{ textAlign: 'center' }}>
                Note: “{trade.message}”
              </p>
            )
          )}
        </div>

        {mode === 'compose' ? (
          confirming ? (
            <div className="gxc" style={{ display: 'grid', gap: 8, textAlign: 'center' }}>
              <p>
                Send <b>{totalSummary}</b> to <b>{peerName}</b>? Escrow deducts it immediately (refunded if declined
                or expired in 2 min).
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button type="button" className="btn sm" disabled={busy} onClick={() => setConfirming(false)}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn sm mint"
                  disabled={busy}
                  onClick={() => void handleConfirmSend()}
                >
                  {busy ? 'Sending…' : 'Confirm Send'}
                </button>
              </div>
            </div>
          ) : (
            <div className="ttfoot">
              <button
                type="button"
                className="btn sm bd"
                onClick={() => {
                  setCash(0);
                  setGems(0);
                  setStk({});
                  setMessage('');
                }}
              >
                Clear
              </button>
              <button type="button" className="btn sm br" onClick={onClose}>
                Cancel
              </button>
              <div className="ttsum">
                <b>{totalSummary || 'Select items'}</b>
                <small>2 min expiry · auto-refund</small>
              </div>
              <button
                type="button"
                className="btn mint bc"
                disabled={!totalSummary}
                onClick={() => setConfirming(true)}
              >
                <Gift size={15} />
                <span>Send Gift</span>
              </button>
            </div>
          )
        ) : (
          <div className="ttfoot">
            <button type="button" className="btn sm bd" onClick={onClose}>
              Close
            </button>
            <div className="ttsum">
              <b>{totalSummary || 'Empty'}</b>
              <small>Status: {trade?.status}</small>
            </div>
            {isIncomingPending && trade && (
              <>
                <button
                  type="button"
                  className="btn sm red br"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onRejectTrade(trade.id);
                      onClose();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Decline
                </button>
                <button
                  type="button"
                  className="btn mint bc"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onAcceptTrade(trade.id);
                      onClose();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Accept Gift
                </button>
              </>
            )}
            {isOutgoingPending && trade && (
              <button
                type="button"
                className="btn red bc"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onCancelTrade(trade.id);
                    onClose();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Cancel &amp; Refund
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
