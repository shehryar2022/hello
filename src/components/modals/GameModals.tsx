import React, { memo, useEffect, useState } from 'react';
import { AlertTriangle, Copy, Trash2 } from 'lucide-react';
import { FIREBASE_CONFIG, isFirebaseConfigured } from '../../firebase/config';
import { formatErrorLogReport, type AppErrorEntry } from '../../firebase/errorLog';
import { COUNTRIES, MAX_RANK, RANKS, SUBSCRIPTIONS } from '../../game/constants';
import { formatNumber, isProfileSubActive } from '../../game/rules';
import type { EquippedCosmetics, GameState, GraphicsSettings, NotificationItem, PlayerProfile, RuntimePerfStats } from '../../game/types';
import { CosmeticAvatar, CosmeticBadgeChip, CosmeticCardWrap, CosmeticName } from '../CosmeticIdentity';
import { GraphicsSettingsPanel } from '../GraphicsSettingsPanel';
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
  ownCosmetics?: EquippedCosmetics;
  animationsEnabled?: boolean;
  onClose: () => void;
  onGift: (profile: PlayerProfile) => void;
  onMessage: (profile: PlayerProfile) => void;
  onSignOut: () => void;
}

const NOTIF_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

function useEscapeClose(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);
}

export const ProfileModal: React.FC<ProfileModalProps> = memo(({
  profile,
  isMe,
  uid,
  ownCosmetics,
  animationsEnabled = true,
  onClose,
  onGift,
  onMessage,
  onSignOut,
}) => {
  useEscapeClose(Boolean(profile), onClose);
  if (!profile) return null;
  const rk = RANKS[Math.max(1, Math.min(MAX_RANK, profile.rank || 1))] || RANKS[1];
  const subTier = isProfileSubActive(profile, Date.now());
  const subDef = subTier ? SUBSCRIPTIONS.find((x) => x.id === subTier) : null;
  const frameId = (isMe ? ownCosmetics?.frame : undefined) || profile.cosFrame;
  const nameFxId = (isMe ? ownCosmetics?.nameEffect : undefined) || profile.cosNameFx;
  const badgeId = (isMe ? ownCosmetics?.badge : undefined) || profile.cosBadge;
  const animId = (isMe ? ownCosmetics?.anim : undefined) || profile.cosAnim;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Player Profile" onClick={onClose}>
      <CosmeticCardWrap
        animId={animId}
        premiumVfxId={isMe ? ownCosmetics?.premiumVfx : undefined}
        animationsEnabled={animationsEnabled}
        className={`card ${subTier ? `sub-card sub-card--${subTier}` : ''}`}
      >
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', zIndex: 1 }}>
          {frameId ? (
            <CosmeticAvatar countryCode={profile.countryCode} frameId={frameId} size="lg" />
          ) : (
            <div className="bigflag">
              <CountryFlag code={profile.countryCode} alt={profile.countryCode} large className="" />
            </div>
          )}
          {rk.id > 0 && (
            <div className="rank-badge big" style={{ '--c': rk.c } as React.CSSProperties} title={rk.n}>
              <RankEmblem rank={rk.id} size={30} />
            </div>
          )}
          <h2 style={{ flexWrap: 'wrap', gap: 6 }}>
            <CosmeticName name={profile.username} nameEffectId={nameFxId} />
          </h2>
          {badgeId && (
            <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}>
              <CosmeticBadgeChip badgeId={badgeId} />
            </div>
          )}
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
      </CosmeticCardWrap>
    </div>
  );
});

interface SettingsModalProps {
  open: boolean;
  state: GameState;
  graphics: GraphicsSettings;
  perfStats: RuntimePerfStats;
  uid: string | null;
  email: string | null;
  errorCount: number;
  onToggleSetting: (key: 'sfx' | 'vib' | 'anim') => void;
  onApplyGraphics: (next: GraphicsSettings) => void;
  onOpenAuth: () => void;
  onOpenErrorLog: () => void;
  onRequestReset: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = memo(({
  open,
  state,
  graphics,
  perfStats,
  uid,
  email,
  errorCount,
  onToggleSetting,
  onApplyGraphics,
  onOpenAuth,
  onOpenErrorLog,
  onRequestReset,
  onClose,
}) => {
  const [section, setSection] = useState<'general' | 'graphics'>('general');
  useEscapeClose(open, onClose);
  if (!open) return null;

  const rows: Array<{ key: 'sfx' | 'vib' | 'anim'; icon: React.ReactNode; label: string }> = [
    { key: 'sfx', icon: <Volume2 size={17} color="#5ccbff" />, label: 'Sound effects' },
    { key: 'vib', icon: <Smartphone size={17} color="#3fe0b0" />, label: 'Haptic vibration' },
    { key: 'anim', icon: <Sparkles size={17} color="#ffc23d" />, label: 'UI Animations' },
  ];

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Settings" onClick={onClose}>
      <div className={`card${section === 'graphics' ? ' settings-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <h2>
          <SlidersHorizontal size={20} color="#5ccbff" />
          <span>Settings</span>
        </h2>
        <p style={{ marginBottom: 10 }}>{uid ? `Cloud account: ${email || 'Signed in'}` : 'Playing in offline mode'}</p>

        <div className="subtabs" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={section === 'general' ? 'on' : ''}
            onClick={() => setSection('general')}
          >
            <span>Audio &amp; Account</span>
          </button>
          <button
            type="button"
            className={section === 'graphics' ? 'on' : ''}
            onClick={() => setSection('graphics')}
          >
            <span>Graphics &amp; FPS</span>
          </button>
        </div>

        {section === 'general' ? (
          <>
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
              <button
                type="button"
                className={`btn ${errorCount > 0 ? 'red' : ''}`}
                onClick={onOpenErrorLog}
              >
                <AlertTriangle size={15} />
                <span>{errorCount > 0 ? `Error Log (${errorCount})` : 'Error Log'}</span>
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
          </>
        ) : (
          <GraphicsSettingsPanel
            settings={graphics}
            perfStats={perfStats}
            onApply={(next) => onApplyGraphics(next)}
            onCancel={onClose}
          />
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  if (!prev.open && !next.open) return true;
  return (
    prev.open === next.open &&
    prev.state.set === next.state.set &&
    prev.graphics === next.graphics &&
    prev.perfStats === next.perfStats &&
    prev.uid === next.uid &&
    prev.email === next.email &&
    prev.errorCount === next.errorCount &&
    prev.onToggleSetting === next.onToggleSetting &&
    prev.onApplyGraphics === next.onApplyGraphics &&
    prev.onOpenAuth === next.onOpenAuth &&
    prev.onOpenErrorLog === next.onOpenErrorLog &&
    prev.onRequestReset === next.onRequestReset &&
    prev.onClose === next.onClose
  );
});

interface NotificationsModalProps {
  open: boolean;
  notifications: NotificationItem[];
  onClose: () => void;
  onSelectNotification: (n: NotificationItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = memo(({
  open,
  notifications,
  onClose,
  onSelectNotification,
}) => {
  useEscapeClose(open, onClose);
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
                    {n.ms ? NOTIF_TIME_FORMATTER.format(new Date(n.ms)) : 'Now'}
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
});

interface OnboardingModalProps {
  open: boolean;
  defaultCountryCode?: string;
  onCheckUsername: (u: string) => Promise<{ available: boolean; reason?: string }>;
  onSubmitProfile: (username: string, countryCode: string) => Promise<void>;
  onSignOut: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = memo(({
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
    if (open) {
      setUsername('');
      setStatus(null);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (defaultCountryCode) setCountryCode(defaultCountryCode);
  }, [defaultCountryCode, open]);

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
});

export interface DialogConfig {
  title: string;
  body: React.ReactNode;
  actions: Array<{
    label: string;
    variant?: 'gold' | 'mint' | 'red' | '';
    onClick: () => void;
  }>;
}

export const DialogModal: React.FC<{ dialog: DialogConfig | null; onClose: () => void }> = memo(({
  dialog,
  onClose,
}) => {
  useEscapeClose(Boolean(dialog), onClose);
  if (!dialog) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <h2>{dialog.title}</h2>
        <div style={{ margin: '10px 0 16px' }}>{dialog.body}</div>
        <div className="acts">
          {dialog.actions.map((a, i) => (
            <button
              key={`${a.label}-${i}`}
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
});

interface ErrorLogModalProps {
  open: boolean;
  errors: AppErrorEntry[];
  uid: string | null;
  email: string | null;
  onRetrySync: () => void;
  onClear: () => void;
  onCopied: () => void;
  onClose: () => void;
}

export const ErrorLogModal: React.FC<ErrorLogModalProps> = memo(({
  open,
  errors,
  uid,
  email,
  onRetrySync,
  onClear,
  onCopied,
  onClose,
}) => {
  useEscapeClose(open, onClose);
  if (!open) return null;

  const hasPermDenied = errors.some(
    (e) =>
      e.code === 'permission-denied' ||
      /permission-denied|Missing or insufficient permissions/i.test(`${e.code || ''} ${e.message}`),
  );

  const handleCopyAll = async () => {
    const header = [
      `Project: ${FIREBASE_CONFIG.projectId || 'unset'}`,
      'Database: (default)',
      `Auth UID: ${uid || 'signed-out'}${email ? ` (${email})` : ''}`,
    ].join(' | ');
    const report = `${header}\n\n${formatErrorLogReport(errors)}`;
    try {
      await navigator.clipboard.writeText(report);
      onCopied();
    } catch {
      const ta = document.createElement('textarea');
      ta.value = report;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      onCopied();
    }
  };

  return (
    <div
      className="modal err-modal-wrap"
      role="dialog"
      aria-modal="true"
      aria-label="Error Log"
      onClick={onClose}
    >
      <div className="card err-modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          <AlertTriangle size={20} color="#ff6fa5" />
          <span>Live Error Log</span>
        </h2>
        <p style={{ margin: '6px 0 10px' }}>
          {errors.length
            ? `${errors.length} recorded ${errors.length === 1 ? 'issue' : 'issues'} with exact paths and codes.`
            : 'Everything is running cleanly — no errors recorded.'}
        </p>

        <div className="err-diag">
          <div>
            <span>Project</span>
            <code>{isFirebaseConfigured ? FIREBASE_CONFIG.projectId : 'Not configured'}</code>
          </div>
          <div>
            <span>Firestore DB</span>
            <code>(default)</code>
          </div>
          <div>
            <span>Account</span>
            <code>{uid ? `${email || uid}` : 'Offline / Signed out'}</code>
          </div>
        </div>

        {hasPermDenied && (
          <div className="err-perm-hint">
            <b>Permission Denied Fix:</b> Publish <code>firestore.rules</code> to database{' '}
            <code>(default)</code> in Firebase Console →
            Firestore Database → Rules.
          </div>
        )}

        <div className="err-list">
          {errors.length ? (
            errors.map((err) => (
              <div key={err.id} className="err-item">
                <div className="err-head">
                  <span className={`err-badge err-badge--${err.source}`}>{err.source.toUpperCase()}</span>
                  {err.code && <code className="err-code">{err.code}</code>}
                  {err.operationType && <code className="err-code">{err.operationType}</code>}
                  <small className="dim" style={{ marginLeft: 'auto' }}>
                    {NOTIF_TIME_FORMATTER.format(new Date(err.time))}
                  </small>
                </div>
                {err.path && <div className="err-path">Path: {err.path}</div>}
                <div className="err-msg">{err.message}</div>
                {err.details && (
                  <details className="err-details-wrap">
                    <summary>Raw details</summary>
                    <pre className="err-details">{err.details}</pre>
                  </details>
                )}
              </div>
            ))
          ) : (
            <div className="err-empty">No errors recorded yet.</div>
          )}
        </div>

        <div className="acts" style={{ marginTop: 12 }}>
          {errors.length > 0 && (
            <button type="button" className="btn mint" onClick={() => void handleCopyAll()}>
              <Copy size={15} />
              <span>Copy All Details</span>
            </button>
          )}
          {uid && (
            <button type="button" className="btn" onClick={onRetrySync}>
              <RefreshCw size={15} />
              <span>Retry Cloud Sync</span>
            </button>
          )}
          {errors.length > 0 && (
            <button type="button" className="btn red" onClick={onClear}>
              <Trash2 size={15} />
              <span>Clear Log</span>
            </button>
          )}
          <button type="button" className="btn gold" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
});
