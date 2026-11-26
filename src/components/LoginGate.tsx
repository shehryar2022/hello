import React, { useState } from 'react';
import { COUNTRIES } from '../game/constants';
import type { CountryTuple } from '../game/types';
import { Cloud, CountryFlag, Gift, Landmark, TrendingUp, Zap } from './GameIcons';

interface LoginGateProps {
  selectedCountry: CountryTuple;
  onSelectCountry: (country: CountryTuple) => void;
  onGoogleLogin: () => Promise<void>;
  onEmailAuth: (email: string, password: string, register: boolean) => Promise<void>;
  onPlayOffline: () => void;
  authMsg: string;
}

export const GoogleIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"
    />
    <path
      fill="#FBBC05"
      d="M10.4 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2.1 1.4-4.7 2.3-7.7 2.3-6.3 0-11.7-4.1-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
    />
  </svg>
);

export const LoginGate: React.FC<LoginGateProps> = React.memo(({
  selectedCountry,
  onSelectCountry,
  onGoogleLogin,
  onEmailAuth,
  onPlayOffline,
  authMsg,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isBusyMsg = /…$/.test(authMsg.trim());

  return (
    <div id="gate">
      <div className="g-in">
        <section className="g-hero">
          <div className="g-mark">
            <Landmark size={28} strokeWidth={2.2} />
          </div>
          <h1>Country Economy Tycoon</h1>
          <p>Build your nation&apos;s economy, govern policies, and climb the live GDP leaderboard.</p>
          <ul className="g-feat">
            <li>
              <TrendingUp size={15} color="#3fe0b0" />
              <span>Live leaderboard</span>
            </li>
            <li>
              <Gift size={15} color="#ffc23d" />
              <span>Player gifting</span>
            </li>
            <li>
              <Cloud size={15} color="#5ccbff" />
              <span>Cloud save</span>
            </li>
          </ul>
          <div className="g-sky" aria-hidden="true">
            <i style={{ height: '38%' }} />
            <i style={{ height: '62%' }} />
            <i style={{ height: '48%' }} />
            <i style={{ height: '86%' }} />
            <i style={{ height: '58%' }} />
            <i style={{ height: '72%' }} />
            <i style={{ height: '44%' }} />
            <i style={{ height: '100%' }} />
            <i style={{ height: '66%' }} />
            <i style={{ height: '40%' }} />
          </div>
        </section>

        <div className="gc card">
          <h2>Start your nation</h2>
          <p className="dim g-sub">Pick a flag, then sign in to save your progress.</p>
          <span className="g-lbl">Your country&apos;s flag</span>
          <div className="cpick">
            {COUNTRIES.map((c) => (
              <button
                key={c[0]}
                type="button"
                className={selectedCountry[0] === c[0] ? 'on' : ''}
                onClick={() => onSelectCountry(c)}
              >
                <CountryFlag code={c[0]} alt={c[1]} className="" />
                <span>{c[1]}</span>
              </button>
            ))}
          </div>

          <button type="button" className="gbtn" disabled={isBusyMsg} onClick={() => void onGoogleLogin()}>
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>

          <div className="g-or">
            <span>or use email</span>
          </div>

          <input
            className="inp"
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="inp"
            type="password"
            placeholder="Password (min 6)"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="tgrid">
            <button
              type="button"
              className="btn sm"
              disabled={isBusyMsg}
              onClick={() => void onEmailAuth(email, password, false)}
            >
              Sign in
            </button>
            <button
              type="button"
              className="btn sm mint"
              disabled={isBusyMsg}
              onClick={() => void onEmailAuth(email, password, true)}
            >
              Register
            </button>
          </div>
          <button type="button" className="lnk" data-start="true" onClick={onPlayOffline}>
            <Zap size={14} color="#ffc23d" />
            <span>Play offline (no leaderboard, no gifting)</span>
          </button>
          {authMsg && <small className={isBusyMsg ? 'dim' : 'bad'}>{authMsg}</small>}
        </div>
      </div>
    </div>
  );
});
