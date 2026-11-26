import React, { memo, useId } from 'react';
import { normalizeFlagId, normalizeProvinceColor } from '../game/province';

interface ProvinceFlagProps {
  flagId?: string;
  color?: string;
  slot?: number;
  width?: number;
  height?: number;
  className?: string;
  title?: string;
}

export const ProvinceFlag: React.FC<ProvinceFlagProps> = memo(
  ({ flagId, color, slot = 1, width = 44, height = 30, className = 'prov-flag-svg', title }) => {
    const id = normalizeFlagId(flagId, slot);
    const accent = normalizeProvinceColor(color, slot);
    const clipId = `clip_${id}_${slot}_${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 60 40"
        fill="none"
        className={className}
        aria-label={title || id}
        role="img"
      >
        {title && <title>{title}</title>}
        <rect x="0.75" y="0.75" width="58.5" height="38.5" rx="6" fill="#171236" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
        <clipPath id={clipId}>
          <rect x="1" y="1" width="58" height="38" rx="5.5" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          {id === 'crest_star' && (
            <>
              <rect x="0" y="0" width="60" height="40" fill={accent} fillOpacity="0.22" />
              <rect x="0" y="0" width="22" height="40" fill={accent} fillOpacity="0.75" />
              <polygon
                points="39,10 41.9,16.2 48.7,17.1 43.7,21.8 45,28.5 39,25.2 33,28.5 34.3,21.8 29.3,17.1 36.1,16.2"
                fill="#FFF4C2"
                stroke={accent}
                strokeWidth="1.2"
              />
            </>
          )}
          {id === 'nordic_cross' && (
            <>
              <rect x="0" y="0" width="60" height="40" fill={accent} fillOpacity="0.82" />
              <rect x="16" y="0" width="8" height="40" fill="#151034" />
              <rect x="0" y="16" width="60" height="8" fill="#151034" />
              <rect x="18" y="0" width="4" height="40" fill="#F8FAFC" />
              <rect x="0" y="18" width="60" height="4" fill="#F8FAFC" />
            </>
          )}
          {id === 'rising_sun' && (
            <>
              <rect x="0" y="0" width="60" height="22" fill="#1B1542" />
              <rect x="0" y="22" width="60" height="18" fill={accent} fillOpacity="0.85" />
              <circle cx="30" cy="22" r="10" fill="#FFE28A" />
              <rect x="0" y="22" width="60" height="3" fill="#FFFFFF" fillOpacity="0.45" />
            </>
          )}
          {id === 'twin_peaks' && (
            <>
              <rect x="0" y="0" width="60" height="40" fill={accent} fillOpacity="0.25" />
              <polygon points="0,40 20,10 40,40" fill={accent} />
              <polygon points="22,40 42,13 60,40" fill={accent} fillOpacity="0.78" />
              <polygon points="15,17 20,10 25,17" fill="#FFFFFF" />
              <polygon points="37,20 42,13 47,20" fill="#FFFFFF" fillOpacity="0.9" />
            </>
          )}
          {id === 'royal_chevron' && (
            <>
              <rect x="0" y="0" width="60" height="13.5" fill={accent} fillOpacity="0.85" />
              <rect x="0" y="13.5" width="60" height="13" fill="#F8FAFC" fillOpacity="0.92" />
              <rect x="0" y="26.5" width="60" height="13.5" fill={accent} fillOpacity="0.85" />
              <polygon points="0,0 26,20 0,40" fill="#1A1240" />
              <circle cx="9.5" cy="20" r="4.5" fill="#FFC23D" />
            </>
          )}
          {id === 'emerald_tri' && (
            <>
              <rect x="0" y="0" width="20" height="40" fill={accent} />
              <rect x="20" y="0" width="20" height="40" fill="#F8FAFC" fillOpacity="0.94" />
              <rect x="40" y="0" width="20" height="40" fill={accent} fillOpacity="0.65" />
              <polygon points="30,13 35,20 30,27 25,20" fill="#1A1240" stroke={accent} strokeWidth="1.5" />
            </>
          )}
          {id === 'harbor_stripes' && (
            <>
              <rect x="0" y="0" width="60" height="40" fill="#1D1648" />
              <rect x="0" y="6" width="60" height="6" fill={accent} />
              <rect x="0" y="17" width="60" height="6" fill="#F8FAFC" fillOpacity="0.88" />
              <rect x="0" y="28" width="60" height="6" fill={accent} />
              <rect x="0" y="0" width="24" height="23" fill="#120E2E" />
              <circle cx="12" cy="11.5" r="5" stroke="#FFE28A" strokeWidth="2" fill="none" />
            </>
          )}
          {id === 'imperial_diamond' && (
            <>
              <rect x="0" y="0" width="60" height="40" fill={accent} fillOpacity="0.82" />
              <polygon points="30,4 54,20 30,36 6,20" fill="#17123A" />
              <circle cx="30" cy="20" r="7" fill="#FFE28A" stroke={accent} strokeWidth="1.5" />
            </>
          )}
          {id === 'civic_wheel' && (
            <>
              <rect x="0" y="0" width="60" height="20" fill={accent} fillOpacity="0.85" />
              <rect x="0" y="20" width="60" height="20" fill="#18133D" />
              <circle cx="30" cy="20" r="9" fill="#171236" stroke="#FFE28A" strokeWidth="2.2" />
              <circle cx="30" cy="20" r="3.5" fill={accent} />
            </>
          )}
          {id === 'aurora_arc' && (
            <>
              <rect x="0" y="0" width="60" height="40" fill="#151034" />
              <path d="M0 32 Q30 6 60 32 L60 40 L0 40 Z" fill={accent} fillOpacity="0.88" />
              <path d="M0 36 Q30 15 60 36 L60 40 L0 40 Z" fill="#FFFFFF" fillOpacity="0.28" />
              <circle cx="46" cy="11" r="3.5" fill="#FFE28A" />
            </>
          )}
          {id === 'shield_quarter' && (
            <>
              <rect x="0" y="0" width="30" height="20" fill={accent} />
              <rect x="30" y="0" width="30" height="20" fill="#1E1749" />
              <rect x="0" y="20" width="30" height="20" fill="#1E1749" />
              <rect x="30" y="20" width="30" height="20" fill={accent} />
              <path d="M30 11 L37 14 V21 C37 25 33.8 28 30 29.5 C26.2 28 23 25 23 21 V14 Z" fill="#FFE28A" />
            </>
          )}
          {id === 'citadel_gate' && (
            <>
              <rect x="0" y="0" width="60" height="40" fill={accent} fillOpacity="0.3" />
              <polygon points="0,0 60,0 30,22" fill={accent} fillOpacity="0.85" />
              <rect x="21" y="18" width="18" height="22" rx="9" fill="#161136" stroke="#FFE28A" strokeWidth="1.6" />
            </>
          )}
        </g>
        <rect x="0.75" y="0.75" width="58.5" height="38.5" rx="6" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      </svg>
    );
  },
);
