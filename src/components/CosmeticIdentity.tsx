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
  const sparkleCount =
    !animationsEnabled || !def
      ? 0
      : def.id === 'anim_sovereign_nova'
        ? 7
        : def.id === 'anim_sparkles' || def.id === 'anim_celestial_orbit'
          ? 5
          : def.id === 'anim_celebration'
            ? 3
            : 0;
  const sparkleCoords = [
    { left: '10%', top: '16%', delay: '0s' },
    { left: '42%', top: '10%', delay: '0.9s' },
    { left: '80%', top: '20%', delay: '1.8s' },
    { left: '88%', top: '64%', delay: '0.5s' },
    { left: '20%', top: '76%', delay: '1.4s' },
    { left: '58%', top: '44%', delay: '2.3s' },
    { left: '34%', top: '86%', delay: '1.1s' },
  ];
  const showAurora = animationsEnabled && (def?.id === 'anim_aurora_curtain' || def?.id === 'anim_sovereign_nova');
  const showOrbit = animationsEnabled && (def?.id === 'anim_celestial_orbit' || def?.id === 'anim_sovereign_nova');
  const showNova = animationsEnabled && def?.id === 'anim_sovereign_nova';

  return (
    <div className={`${animClass} ${className}`.trim()}>
      {showAurora ? <div className="cos-aurora-curtain" aria-hidden="true" /> : null}
      {showOrbit ? (
        <div className="cos-orbit-rings" aria-hidden="true">
          <span className="cos-orbit-ring cos-orbit-ring--a" />
          <span className="cos-orbit-ring cos-orbit-ring--b" />
        </div>
      ) : null}
      {showNova ? <div className="cos-nova-beams" aria-hidden="true" /> : null}
      {sparkleCount > 0 ? (
        <div className="cos-sparkles-layer" aria-hidden="true">
          {sparkleCoords.slice(0, sparkleCount).map((pt, idx) => (
            <span
              key={idx}
              className="cos-sparkle-dot"
              style={{ left: pt.left, top: pt.top, animationDelay: pt.delay }}
            />
          ))}
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
