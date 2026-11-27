import React from 'react';
import { RANKS, TAB_META } from '../game/constants';
import { formatNumber } from '../game/rules';
import type { GameState, PlayerProfile, TabId } from '../game/types';
import {
  Bell,
  CashCoinIcon,
  Cloud,
  CountryFlag,
  GemDiamondIcon,
  IdCard,
  Landmark,
  Lock,
  SlidersHorizontal,
  TabIcon,
} from './GameIcons';

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

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });

export const TopBar = React.memo<TopBarProps>(({
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
  const rankDef = RANKS[Math.max(1, Math.min(10, state.rank || 1))] || RANKS[1];
  const dateLabel = `${MONTH_YEAR_FORMATTER.format(dt)} · ${rankDef.n} · #${rankPosition}`;
  const cc = state.country?.[0];

  return (
    <header className="top">
      <div className="who">
        <button type="button" className="flag" title="View profile" aria-label="View profile" onClick={onOpenProfile}>
          {cc ? <CountryFlag code={cc} alt={state.country[1]} /> : <Landmark size={20} color="#ffd257" />}
        </button>
        <div>
          <h1>Country Economy Tycoon</h1>
          <small>{dateLabel}</small>
        </div>
      </div>

      <div className="pill res">
        <b title="Coins">
          <i>
            <CashCoinIcon size={20} />
          </i>
          <span data-testid="hud-cash">{formatNumber(state.cash)}</span>
        </b>
        <b className="g" title="Gems">
          <i>
            <GemDiamondIcon size={19} />
          </i>
          <span data-testid="hud-gems">{Math.floor(state.gems)}</span>
        </b>
      </div>

      <div className="acts2">
        <button type="button" className="profbtn" title="Profile" aria-label="Profile" onClick={onOpenProfile}>
          <IdCard size={18} strokeWidth={2} />
        </button>
        <button type="button" className="profbtn" title="Settings" aria-label="Settings" onClick={onOpenSettings}>
          <SlidersHorizontal size={18} strokeWidth={2} />
        </button>
        <button type="button" className="profbtn bell" title="Notifications" aria-label="Notifications" onClick={onOpenNotifications}>
          <Bell size={18} strokeWidth={2} />
          {unreadNotifs > 0 && <i>{unreadNotifs > 9 ? '9+' : unreadNotifs}</i>}
        </button>
        <button type="button" className="btn sm" id="login" onClick={onOpenAuth}>
          {uid ? <Cloud size={15} strokeWidth={2.2} /> : <Lock size={14} strokeWidth={2.2} />}
          <span>{uid && pubProfile ? pubProfile.username : uid ? 'Syncing' : 'Login'}</span>
        </button>
      </div>
    </header>
  );
});

interface NavBarProps {
  activeTab: TabId;
  pendingIncomingGifts: number;
  onSelectTab: (tab: TabId) => void;
}

export const NavBar = React.memo<NavBarProps>(({
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
          <span aria-hidden="true">
            <TabIcon tab={key} size={18} />
          </span>
          {meta.label}
          {key === 'trade' && pendingIncomingGifts > 0 && (
            <em className="nb">{pendingIncomingGifts}</em>
          )}
        </button>
      ))}
    </nav>
  );
});
