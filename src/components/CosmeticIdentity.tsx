import React, { memo } from 'react';
import { getCosmeticDef } from '../game/cosmetics';
import { CountryFlag } from './GameIcons';

interface CosmeticAvatarProps {
  countryCode: string;
  frameId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const CosmeticAvatar = memo(function CosmeticAvatar({
  countryCode,
  frameId,
  size = 'md',
  className = '',
}: CosmeticAvatarProps) {
  const frameDef = frameId ? getCosmeticDef(frameId) : undefined;
  const frameClass = frameDef ? `cos-frame--${frameDef.id}` : '';
  return (
    <span className={`cos-frame cos-frame--${size} ${frameClass} ${className}`.trim()}>
      <span className="cos-frame-inner">
        <CountryFlag code={countryCode} />
      </span>
    </span>
  );
});

interface CosmeticNameProps {
  name: string;
  nameEffectId?: string;
  className?: string;
}

export const CosmeticName = memo(function CosmeticName({
  name,
  nameEffectId,
  className = '',
}: CosmeticNameProps) {
  const def = nameEffectId ? getCosmeticDef(nameEffectId) : undefined;
  const fxClass = def ? `cos-nfx cos-nfx--${def.id}` : '';
  return <span className={`${fxClass} ${className}`.trim()}>{name}</span>;
});

interface CosmeticBadgeChipProps {
  badgeId?: string;
}

export const CosmeticBadgeChip = memo(function CosmeticBadgeChip({
  badgeId,
}: CosmeticBadgeChipProps) {
  const def = badgeId ? getCosmeticDef(badgeId) : undefined;
  if (!def) return null;
  return (
    <span className="cos-badge" title={def.desc}>
      <span aria-hidden="true">{def.icon}</span>
      <span>{def.name}</span>
    </span>
  );
});

interface CosmeticCardWrapProps {
  animId?: string;
  animationsEnabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function CosmeticCardWrap({
  animId,
  animationsEnabled = true,
  className = '',
  children,
}: CosmeticCardWrapProps) {
  const def = animId && animationsEnabled ? getCosmeticDef(animId) : undefined;
  const animClass = def ? `cos-anim-card cos-anim--${def.id}` : '';
  const showSparkles = def?.id === 'anim_sparkles' && animationsEnabled;
  return (
    <div className={`${animClass} ${className}`.trim()}>
      {showSparkles ? (
        <div className="cos-sparkles-layer" aria-hidden="true">
          <span className="cos-sparkle-dot" style={{ left: '12%', top: '18%', animationDelay: '0s' }} />
          <span className="cos-sparkle-dot" style={{ left: '42%', top: '12%', animationDelay: '1.1s' }} />
          <span className="cos-sparkle-dot" style={{ left: '78%', top: '22%', animationDelay: '2.2s' }} />
          <span className="cos-sparkle-dot" style={{ left: '86%', top: '64%', animationDelay: '0.6s' }} />
          <span className="cos-sparkle-dot" style={{ left: '22%', top: '76%', animationDelay: '1.8s' }} />
        </div>
      ) : null}
      {children}
    </div>
  );
}

export interface UnlockCelebrationInfo {
  title: string;
  subtitle: string;
  icon: string;
  rarityLabel?: string;
  rewardSummary?: string;
  accentColor?: string;
}

interface UnlockCelebrationModalProps {
  info: UnlockCelebrationInfo | null;
  hasFanfare?: boolean;
  onClose: () => void;
}

export function UnlockCelebrationModal({
  info,
  hasFanfare = false,
  onClose,
}: UnlockCelebrationModalProps) {
  if (!info) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Unlock Celebration">
      <div className="card unlock-modal">
        <div className="unlock-prism" style={info.accentColor ? { boxShadow: `0 0 26px ${info.accentColor}66, var(--in)` } : undefined}>
          <span aria-hidden="true">{info.icon}</span>
        </div>
        <h2>{info.title}</h2>
        {info.rarityLabel ? (
          <div style={{ marginTop: 6 }}>
            <span className="dx-rarity" style={{ color: info.accentColor || 'var(--cy)', borderColor: info.accentColor || 'var(--cy)', background: 'rgba(126, 232, 255, 0.14)' }}>
              {info.rarityLabel}
            </span>
          </div>
        ) : null}
        <p style={{ marginTop: 8 }}>{info.subtitle}</p>
        {info.rewardSummary ? (
          <div style={{ marginBottom: 14, fontWeight: 700, color: 'var(--mint)', fontSize: 13.5 }}>
            {info.rewardSummary}
          </div>
        ) : null}
        {hasFanfare ? (
          <div className="cnote" style={{ marginBottom: 10 }}>
            Imperial Unlock Fanfare Active
          </div>
        ) : null}
        <div className="acts">
          <button type="button" className="btn mint" onClick={onClose}>
            Awesome!
          </button>
        </div>
      </div>
    </div>
  );
}
