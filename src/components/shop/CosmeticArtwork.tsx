import React, { memo } from 'react';
import { getCosmeticDef, raritySlug } from '../../game/cosmetics';
import type { CosmeticBundleDef, CosmeticItemDef, CosmeticRarity } from '../../game/types';
import { CosmeticAvatar, CosmeticBadgeChip, CosmeticName } from '../CosmeticIdentity';

export const RarityCrestGem = memo(function RarityCrestGem({
  rarity,
  size = 20,
}: {
  rarity: CosmeticRarity;
  size?: number;
}) {
  const palette: Record<CosmeticRarity, { fill: string; hi: string; stroke: string }> = {
    Basic: { fill: '#94a3b8', hi: '#e2e8f0', stroke: '#475569' },
    Uncommon: { fill: '#34d399', hi: '#d1fae5', stroke: '#047857' },
    Rare: { fill: '#38bdf8', hi: '#bae6fd', stroke: '#0369a1' },
    Epic: { fill: '#c084fc', hi: '#f3e8ff', stroke: '#6b21a8' },
    Legendary: { fill: '#fbbf24', hi: '#fef08a', stroke: '#b45309' },
    Mythic: { fill: '#f472b6', hi: '#fce7f3', stroke: '#9d174d' },
    Exclusive: { fill: '#fb7185', hi: '#ffe4e6', stroke: '#9f1239' },
    'Ultra Exclusive': { fill: '#fde047', hi: '#ffffff', stroke: '#be123c' },
  };
  const p = palette[rarity] || palette.Rare;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`dx-crest-svg dx-crest-svg--${raritySlug(rarity)}`}
    >
      <path
        d="M12 2L20 9.2L16.2 21H7.8L4 9.2L12 2Z"
        fill={p.fill}
        stroke={p.stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 2L16.5 9.2H7.5L12 2Z" fill={p.hi} fillOpacity="0.72" />
      <path d="M7.5 9.2L12 21L16.5 9.2H7.5Z" fill={p.hi} fillOpacity="0.22" />
    </svg>
  );
});

export const CosmeticItemArtwork = memo(function CosmeticItemArtwork({
  item,
  username,
  countryCode,
  compact = false,
}: {
  item: CosmeticItemDef;
  username: string;
  countryCode: string;
  compact?: boolean;
}) {
  if (item.category === 'profile_effect') {
    return (
      <div
        className="dx-art dx-art--frame"
        style={{
          '--art-a': item.accentColor,
          '--art-b': item.secondaryColor,
        } as React.CSSProperties}
      >
        <div className="dx-art-orb" />
        <CosmeticAvatar countryCode={countryCode} frameId={item.id} size={compact ? 'md' : 'lg'} />
        <span className="dx-art-tag">{item.previewTag}</span>
      </div>
    );
  }

  if (item.category === 'name_effect') {
    return (
      <div
        className="dx-art dx-art--name"
        style={{
          '--art-a': item.accentColor,
          '--art-b': item.secondaryColor,
        } as React.CSSProperties}
      >
        <div className="dx-art-nameplate">
          <CosmeticName name={username || 'Governor'} nameEffectId={item.id} />
        </div>
        <span className="dx-art-tag">{item.previewTag}</span>
      </div>
    );
  }

  if (item.category === 'theme' && item.themeId) {
    return (
      <div className="dx-art dx-art--theme" data-theme={item.themeId}>
        <div className="dx-theme-mini">
          <div className="dx-theme-mini-top">
            <span className="dx-theme-mini-dot" />
            <span className="dx-theme-mini-bar" />
            <span className="dx-theme-mini-pill">GDP</span>
          </div>
          <div className="dx-theme-mini-body">
            <div className="dx-theme-mini-side">
              <i />
              <i />
              <i />
            </div>
            <div className="dx-theme-mini-cards">
              <div className="dx-theme-mini-hero" />
              <div className="dx-theme-mini-row">
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (item.category === 'badge') {
    return (
      <div
        className="dx-art dx-art--badge"
        style={{
          '--art-a': item.accentColor,
          '--art-b': item.secondaryColor,
        } as React.CSSProperties}
      >
        <div className="dx-art-medal">
          <span aria-hidden="true">{item.icon}</span>
        </div>
        <CosmeticBadgeChip badgeId={item.id} />
      </div>
    );
  }

  if (item.category === 'leaderboard_anim') {
    return (
      <div
        className="dx-art"
        style={{
          '--art-a': item.accentColor,
          '--art-b': item.secondaryColor,
        } as React.CSSProperties}
      >
        <div
          className={`row pcard lb-fx lb-fx--${item.id}`}
          style={{
            width: '92%',
            padding: '7px 9px',
            margin: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(13, 16, 38, 0.92)',
          }}
        >
          <span style={{ fontWeight: 800, color: '#ffc93c', fontSize: 11 }}>#1</span>
          <span style={{ fontWeight: 700, fontSize: 11.5, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username || 'Governor'}
          </span>
        </div>
        <span className="dx-art-tag">{item.previewTag}</span>
      </div>
    );
  }

  if (item.category === 'achievement_fx') {
    return (
      <div
        className="dx-art"
        style={{
          '--art-a': item.accentColor,
          '--art-b': item.secondaryColor,
        } as React.CSSProperties}
      >
        <div
          className={`dx-art-anim-card ach-fx--${item.id}`}
          style={{ width: '78%', padding: '10px 8px' }}
        >
          <span className="dx-art-anim-ic" aria-hidden="true">{item.icon}</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#f8fafc' }}>Trophy Unlocked</span>
        </div>
        <span className="dx-art-tag">{item.previewTag}</span>
      </div>
    );
  }

  if (item.category === 'premium_vfx') {
    return (
      <div
        className={`dx-art pvfx--${item.id}`}
        style={{
          '--art-a': item.accentColor,
          '--art-b': item.secondaryColor,
        } as React.CSSProperties}
      >
        <div className="dx-art-medal">
          <span aria-hidden="true">{item.icon}</span>
        </div>
        <span className="dx-art-tag">{item.previewTag}</span>
      </div>
    );
  }

  if (item.category === 'animation') {
    const isApex = item.id === 'anim_sovereign_nova' || item.id === 'anim_celestial_orbit' || item.id === 'anim_apex_crown';
    const hasGlint =
      item.id === 'anim_sparkles' ||
      item.id === 'anim_aurora_curtain' ||
      item.id === 'anim_celebration' ||
      item.id === 'anim_quantum_ripple' ||
      isApex;
    return (
      <div
        className={`dx-art dx-art--anim dx-art--${item.id}`}
        style={{
          '--art-a': item.accentColor,
          '--art-b': item.secondaryColor,
        } as React.CSSProperties}
      >
        {hasGlint && <div className="dx-art-anim-aura" aria-hidden="true" />}
        {isApex && <div className="dx-art-anim-orbit" aria-hidden="true" />}
        <div className="dx-art-anim-card">
          <span className="dx-art-anim-ic" aria-hidden="true">
            {item.icon}
          </span>
          <span className="dx-art-anim-line" />
        </div>
        <span className="dx-art-tag">{item.previewTag}</span>
      </div>
    );
  }

  // diamond_asset (3D Landmark vignette)
  return (
    <div
      className="dx-art dx-art--landmark"
      style={{
        '--art-a': item.accentColor,
        '--art-b': item.secondaryColor,
      } as React.CSSProperties}
    >
      <div className="dx-art-horizon" />
      <div className="dx-art-pedestal">
        <span className="dx-art-landmark-ic" aria-hidden="true">
          {item.icon}
        </span>
      </div>
      <span className="dx-art-tag">3D Capital Landmark</span>
    </div>
  );
});

export const CollectionArtwork = memo(function CollectionArtwork({
  bundle,
  username,
  countryCode,
}: {
  bundle: CosmeticBundleDef;
  username: string;
  countryCode: string;
}) {
  const frameId = bundle.itemIds.find((id) => id.startsWith('frame_'));
  const nameId = bundle.itemIds.find((id) => id.startsWith('nfx_'));
  const badgeId = bundle.itemIds.find((id) => id.startsWith('badge_'));
  const themeId = bundle.itemIds.find((id) => id.startsWith('theme_'));
  const themeDef = themeId ? getCosmeticDef(themeId) : undefined;

  return (
    <div
      className="dx-bundle-art"
      data-theme={themeDef?.themeId}
      style={{
        '--art-a': bundle.accentColor,
        '--art-b': bundle.secondaryColor,
      } as React.CSSProperties}
    >
      <div className="dx-bundle-art-glow" />
      <div className="dx-bundle-art-stage">
        <CosmeticAvatar countryCode={countryCode} frameId={frameId} size="lg" />
        <div className="dx-bundle-art-copy">
          <CosmeticName name={username || 'Governor'} nameEffectId={nameId} />
          <div className="dx-bundle-art-meta">
            {badgeId && <CosmeticBadgeChip badgeId={badgeId} />}
            <span className="dx-bundle-art-theme">{themeDef?.name || bundle.badgeText}</span>
          </div>
        </div>
      </div>
    </div>
  );
});
