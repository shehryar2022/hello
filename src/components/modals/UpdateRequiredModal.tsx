import React, { useEffect } from 'react';
import { RefreshCw, Sparkles } from '../GameIcons';

interface UpdateRequiredModalProps {
  open: boolean;
  refreshing: boolean;
  loopDetected: boolean;
  remoteVersion: string;
  onRefreshNow: () => void;
}

export const UpdateRequiredModal: React.FC<UpdateRequiredModalProps> = ({
  open,
  refreshing,
  loopDetected,
  remoteVersion,
  onRefreshNow,
}) => {
  useEffect(() => {
    if (!open) return;
    const blockEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', blockEscape, true);
    return () => window.removeEventListener('keydown', blockEscape, true);
  }, [open]);

  if (!open) return null;

  return (
    <div
      id="updateLock"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="updateLockTitle"
      aria-describedby="updateLockDesc"
    >
      <div className="update-lock-card card" onClick={(e) => e.stopPropagation()}>
        <div className="update-lock-icon" aria-hidden="true">
          <Sparkles size={30} color="#ffc23d" />
        </div>
        <h2 id="updateLockTitle">NEW UPDATE AVAILABLE!</h2>
        <p id="updateLockDesc">
          A new version of the game has been released. Please refresh the website to continue playing.
        </p>
        {loopDetected && (
          <div className="update-lock-warn">
            Your browser returned a cached copy on the last reload. Tap below to clear app caches and force-load
            version <code>{remoteVersion}</code>.
          </div>
        )}
        <div className="acts" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="btn gold update-lock-btn"
            disabled={refreshing}
            onClick={onRefreshNow}
            autoFocus
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'SAVING & REFRESHING…' : 'REFRESH NOW'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
