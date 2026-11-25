import React from 'react';
import { TAB_META } from '../game/constants';
import { flagUrl, formatNumber } from '../game/rules';
import type { GameState, PlayerProfile, TabId } from '../game/types';
import { GoogleIcon } from './LoginGate';

interface TopBarProps {
  state: GameState;
  uid: string | null;
  pubProfile: PlayerProfile | null;
  rankPosition: number;
  unreadNotifs: number;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  uid,
  pubProfile,
  rankPosition,
  unreadNotifs,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  onOpenAuth,
}) => {
  const dt = new Date(2000, 0, 1 + Math.floor(state.day));
  const dateLabel = `${dt.toLocaleDateString('en', { month: 'long', year: 'numeric' })} · GDP Rank #${rankPosition}`;
  const cc = state.country?.[0];

  return (
    <header className="top">
      <div className="who">
        <button type="button" className="flag" title="View profile" aria-label="View profile" onClick={onOpenProfile}>
          {cc ? <img className="flagimg" src={flagUrl(cc)} alt={state.country[1]} referrerPolicy="no-referrer" /> : '🏛️'}
        </button>
        <div>
          <h1>Country Economy Tycoon</h1>
          <small>{dateLabel}</small>
        </div>
      </div>

      <div className="pill res">
        <b title="Cash">
          <i>💵</i>
          <span data-testid="hud-cash">{formatNumber(state.cash)}</span>
        </b>
        <b className="g" title="Diamonds">
          <i>💎</i>
          <span data-testid="hud-gems">{Math.floor(state.gems)}</span>
        </b>
      </div>

      <div className="acts2">
        <button type="button" className="profbtn" title="Profile" aria-label="Profile" onClick={onOpenProfile}>
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>🪪</span>
        </button>
        <button type="button" className="profbtn" title="Settings" aria-label="Settings" onClick={onOpenSettings}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
            <circle cx="16" cy="6" r="2" />
            <circle cx="10" cy="12" r="2" />
            <circle cx="18" cy="18" r="2" />
          </svg>
        </button>
        <button type="button" className="profbtn bell" title="Notifications" aria-label="Notifications" onClick={onOpenNotifications}>
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>🔔</span>
          {unreadNotifs > 0 && <i>{unreadNotifs > 9 ? '9+' : unreadNotifs}</i>}
        </button>
        <button type="button" className="btn sm" id="login" onClick={onOpenAuth}>
          {uid && pubProfile ? `☁️ ${pubProfile.username}` : uid ? '☁️ …' : '🔐 Login'}
        </button>
      </div>
    </header>
  );
};

interface NavBarProps {
  activeTab: TabId;
  pendingIncomingGifts: number;
  onSelectTab: (tab: TabId) => void;
}

export const NavBar: React.FC<NavBarProps> = ({
  activeTab,
  pendingIncomingGifts,
  onSelectTab,
}) => {
  const entries = Object.entries(TAB_META) as Array<[TabId, (typeof TAB_META)[TabId]]>;
  return (
    <nav id="nav" aria-label="Main navigation">
      {entries.map(([key, meta]) => (
        <button
          key={key}
          type="button"
          className={activeTab === key ? 'on' : ''}
          data-t={key}
          onClick={() => onSelectTab(key)}
        >
          <span aria-hidden="true">{meta.emoji}</span>
          {meta.label}
          {key === 'trade' && pendingIncomingGifts > 0 && (
            <em className="nb">{pendingIncomingGifts}</em>
          )}
        </button>
      ))}
    </nav>
  );
};
