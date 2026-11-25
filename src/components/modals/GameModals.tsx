import React, { useEffect, useState } from 'react';
import { COUNTRIES, RANKS, SUBSCRIPTIONS } from '../../game/constants';
import { formatNumber, isProfileSubActive } from '../../game/rules';
import type { GameState, NotificationItem, PlayerProfile } from '../../game/types';
import {
  Bell,
  Cloud,
  CountryFlag,
  GemDiamondIcon,
  Gift,
  Landmark,
  Lock,
  Mail,
  NotifIcon,
  RankEmblem,
  RefreshCw,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  SubIcon,
  Volume2,
} from '../GameIcons';

interface ProfileModalProps {
  profile: PlayerProfile | null;
  isMe: boolean;
  uid: string | null;
  onClose: () => void;
  onGift: (profile: PlayerProfile) => void;
  onMessage: (profile: PlayerProfile) => void;
  onSignOut: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  isMe,
  uid,
  onClose,
  onGift,
  onMessage,
  onSignOut,
}) => {
  if (!profile) return null;
  const rk = RANKS[profile.rank || 0] || RANKS[0];
  const subTier = isProfileSubActive(profile, Date.now());
  const subDef = subTier ? SUBSCRIPTIONS.find((x) => x.id === subTier) : null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Player Profile" onClick={onClose}>
      <div
        className={`card ${subTier ? `sub-card sub-card--${subTier}` : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bigflag">
          <CountryFlag code={profile.countryCode} alt={profile.countryCode} large className="" />
        </div>
        {rk.id > 0 && (
          <div className="rank-badge big" style={{ '--c': rk.c } as React.CSSProperties} title={rk.n}>
            <RankEmblem rank={rk.id} size={30} />
          </div>
        )}
        <h2>{profile.username}</h2>
        <p style={{ margin: '4px 0 8px' }}>
          {profile.countryName} · {rk.n}
        </p>
        {subTier && subDef && (
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
            <span className={`sub-crest sub-crest--${subTier}`}>
              <span className="sub-crest-ic">
                <SubIcon tier={subTier} size={13} />
              </span>
              <span>{subDef.n}</span>
            </span>
          </div>
        )}

        <div className="pstat">
          <div>
            <span>GDP</span>
            <b>₨ {formatNumber(profile.gdp || 0)}</b>
          </div>
          <div>
            <span>Cash</span>
            <b>₨ {formatNumber(profile.cash || 0)}</b>
          </div>
          <div>
            <span>Diamonds</span>
            <b>
              <GemDiamondIcon size={14} /> {Math.floor(profile.gems || 0)}
            </b>
          </div>
          <div>
            <span>Level</span>
            <b>Lv {profile.level || 1}</b>
          </div>
          <div>
            <span>Buildings</span>
            <b>{profile.stats?.buildings || 0}</b>
          </div>
          <div>
            <span>Gifts Done</span>
            <b>{profile.stats?.completedTrades || 0}</b>
          </div>
          <div>
            <span>Gifts Sent</span>
            <b>{profile.stats?.tradesSent || 0}</b>
          </div>
          <div>
            <span>Cash Gifted</span>
            <b>₨ {formatNumber(profile.stats?.cashTraded || 0)}</b>
          </div>
        </div>

        {uid && <div className="pid">UID: {profile.id}</div>}

        <div className="acts" style={{ marginTop: 14 }}>
          {!isMe && uid && (
            <>
              <button type="button" className="btn mint" onClick={() => onGift(profile)}>
                <Gift size={15} />
                <span>Send Gift</span>
              </button>
              <button type="button" className="btn" onClick={() => onMessage(profile)}>
                <Mail size={15} />
                <span>Private Message</span>
              </button>
            </>
          )}
          {isMe && uid && (
            <button type="button" className="btn red" onClick={onSignOut}>
              Sign out
            </button>
          )}
          <button type="button" className="btn sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  open: boolean;
  state: GameState;
  uid: string | null;
  email: string | null;
  onToggleSetting: (key: 'sfx' | 'vib' | 'anim') => void;
  onOpenAuth: () => void;
  onRequestReset: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  state,
  uid,
  email,
  onToggleSetting,
  onOpenAuth,
  onRequestReset,
  onClose,
}) => {
  if (!open) return null;

  const rows: Array<{ key: 'sfx' | 'vib' | 'anim'; icon: React.ReactNode; label: string }> = [
    { key: 'sfx', icon: <Volume2 size={17} color="#5ccbff" />, label: 'Sound effects' },
    { key: 'vib', icon: <Smartphone size={17} color="#3fe0b0" />, label: 'Haptic vibration' },
    { key: 'anim', icon: <Sparkles size={17} color="#ffc23d" />, label: 'Animations' },
  ];

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <h2>
          <SlidersHorizontal size={20} color="#5ccbff" />
          <span>Settings</span>
        </h2>
        <p style={{ marginBottom: 8 }}>{uid ? `Cloud account: ${email || 'Signed in'}` : 'Playing in offline mode'}</p>

        {rows.map((r) => {
          const on = !!state.set[r.key];
          return (
            <div key={r.key} className="setrow">
              <span>
                {r.icon} {r.label}
              </span>
              <button
                type="button"
                aria-label={r.label}
                aria-pressed={on}
                className={`btn ${on ? 'mint' : ''}`}
                onClick={() => onToggleSetting(r.key)}
              >
                {on ? 'On' : 'Off'}
              </button>
            </div>
          );
        })}

        <div className="acts" style={{ marginTop: 14 }}>
          <button type="button" className="btn" onClick={onOpenAuth}>
            {uid ? <Cloud size={15} /> : <Lock size={15} />}
            <span>{uid ? 'Account' : 'Sign in / Link Cloud'}</span>
          </button>
          {!uid && (
            <button type="button" className="btn red" onClick={onRequestReset}>
              <RefreshCw size={15} />
              <span>New Game</span>
            </button>
          )}
          <button type="button" className="btn gold" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

interface NotificationsModalProps {
  open: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onSelectNotification: (n: NotificationItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  open,
  notifications,
  onClose,
  onSelectNotification,
}) => {
  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Notifications" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <h2>
          <Bell size={20} color="#ffc23d" />
          <span>Notifications</span>
        </h2>
        <div className="nlist" style={{ marginTop: 10 }}>
          {notifications.length ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`nitem ${!n.read ? 'un' : ''}`}
                onClick={() => onSelectNotification(n)}
              >
                <div className="ni">
                  <NotifIcon type={n.type} size={18} />
                </div>
                <div>
                  <p>{n.text}</p>
                  <small>
                    {n.ms ? new Date(n.ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p className="dim" style={{ textAlign: 'center', margin: '18px 0' }}>
              No notifications yet.
            </p>
          )}
        </div>
        <div className="acts" style={{ marginTop: 12 }}>
          <button type="button" className="btn gold" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface OnboardingModalProps {
  open: boolean;
  defaultCountryCode?: string;
  onCheckUsername: (u: string) => Promise<{ available: boolean; reason?: string }>;
  onSubmitProfile: (username: string, countryCode: string) => Promise<void>;
  onSignOut: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  open,
  defaultCountryCode,
  onCheckUsername,
  onSubmitProfile,
  onSignOut,
}) => {
  const [username, setUsername] = useState('');
  const [countryCode, setCountryCode] = useState(defaultCountryCode || COUNTRIES[0][0]);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (defaultCountryCode) setCountryCode(defaultCountryCode);
  }, [defaultCountryCode]);

  useEffect(() => {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setStatus(trimmed ? { msg: 'Min 3 characters (letters, numbers, _)', ok: false } : null);
      return;
    }
    if (!/^[A-Za-z0-9_]{3,16}$/.test(trimmed)) {
      setStatus({ msg: 'Only letters, numbers, and _ (3-16 chars)', ok: false });
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await onCheckUsername(trimmed);
        if (!cancelled) {
          setStatus({
            msg: res.available ? 'Username available' : res.reason || 'Already taken',
            ok: res.available,
          });
        }
      } catch {
        if (!cancelled) setStatus(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [username, onCheckUsername]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmitProfile(username.trim(), countryCode);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Create Country">
      <div className="card">
        <h2>
          <Landmark size={20} color="#ffc23d" />
          <span>Establish Your Country</span>
        </h2>
        <p>Pick a unique leader username and national flag.</p>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <input
            className="inp"
            maxLength={16}
            placeholder="Username (e.g. Pak_Tycoon)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          {status && (
            <p className={status.ok ? 'ok' : 'bad'} style={{ fontSize: 12, margin: '0 0 8px' }}>
              {status.msg}
            </p>
          )}

          <div className="cpick">
            {COUNTRIES.map(([code, name]) => (
              <button
                key={code}
                type="button"
                className={countryCode === code ? 'on' : ''}
                onClick={() => setCountryCode(code)}
              >
                <CountryFlag code={code} alt={code} className="" />
                <span>{name}</span>
              </button>
            ))}
          </div>

          <div className="acts" style={{ marginTop: 10 }}>
            <button type="submit" className="btn gold" disabled={busy || !status?.ok}>
              {busy ? 'Creating…' : 'Start Ruling'}
            </button>
            <button type="button" className="lnk" onClick={onSignOut}>
              Cancel &amp; Sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export interface DialogConfig {
  title: string;
  body: React.ReactNode;
  actions: Array<{
    label: string;
    variant?: 'gold' | 'mint' | 'red' | '';
    onClick: () => void;
  }>;
}

export const DialogModal: React.FC<{ dialog: DialogConfig | null; onClose: () => void }> = ({
  dialog,
  onClose,
}) => {
  if (!dialog) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <h2>{dialog.title}</h2>
        <div style={{ margin: '10px 0 16px' }}>{dialog.body}</div>
        <div className="acts">
          {dialog.actions.map((a, i) => (
            <button
              key={i}
              type="button"
              className={`btn ${a.variant || ''}`}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
