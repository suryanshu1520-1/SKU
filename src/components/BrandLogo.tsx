import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isCompact?: boolean;
  showSubtitle?: boolean;
  variant?: 'crucible' | 'monogram' | 'prism';
  className?: string;
  onClick?: () => void;
}

/**
 * Tark Master Sigil — The Crucible of Reason & Analytical Arena.
 * A high-precision faceted diamond prism enclosing the empirical crosshair
 * of truth and concentric syllabus orbits in gold and electric cyan.
 */
export function TarkSigil({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-all duration-300 group-hover:scale-105 ${className}`}
    >
      <defs>
        {/* Luxury Champagne Gold Bevel Gradient */}
        <linearGradient id="tark-gold-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff8e7" />
          <stop offset="35%" stopColor="#e8dcbf" />
          <stop offset="70%" stopColor="#c5b084" />
          <stop offset="100%" stopColor="#8c7343" />
        </linearGradient>

        {/* Deep Chiseled Gold Edge */}
        <linearGradient id="tark-gold-dark" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d4c29a" />
          <stop offset="50%" stopColor="#8c7343" />
          <stop offset="100%" stopColor="#4a3b1e" />
        </linearGradient>

        {/* Electric Cyan Radial Glow */}
        <radialGradient id="tark-cyan-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0194a8" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#041d40" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#020b18" stopOpacity="0.95" />
        </radialGradient>

        {/* Outer Glow Filter */}
        <filter id="tark-ambient-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#0194a8" floodOpacity="0.35" />
          <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#e0d0ab" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* ── Layer 1: Ambient Backdrop Diamond ── */}
      <polygon
        points="32,4 60,32 32,60 4,32"
        fill="url(#tark-cyan-core)"
        filter="url(#tark-ambient-glow)"
      />

      {/* ── Layer 2: Faceted Outer Diamond Wings (Beveled 3D Physics) ── */}
      {/* Top-Left Facet */}
      <polygon
        points="32,4 4,32 32,32"
        fill="#072042"
        fillOpacity="0.75"
        stroke="url(#tark-gold-sheen)"
        strokeWidth="1.25"
      />
      {/* Top-Right Facet (Light Catch) */}
      <polygon
        points="32,4 60,32 32,32"
        fill="#0c3568"
        fillOpacity="0.8"
        stroke="url(#tark-gold-sheen)"
        strokeWidth="1.25"
      />
      {/* Bottom-Left Facet */}
      <polygon
        points="4,32 32,60 32,32"
        fill="#04152d"
        fillOpacity="0.85"
        stroke="url(#tark-gold-dark)"
        strokeWidth="1.25"
      />
      {/* Bottom-Right Facet */}
      <polygon
        points="60,32 32,60 32,32"
        fill="#062247"
        fillOpacity="0.8"
        stroke="url(#tark-gold-sheen)"
        strokeWidth="1.25"
      />

      {/* ── Layer 3: Concentric Analytical Target / Radar Orbits ── */}
      <circle
        cx="32"
        cy="32"
        r="14"
        stroke="#0194a8"
        strokeWidth="1"
        strokeOpacity="0.5"
        strokeDasharray="2 2.5"
      />
      <circle
        cx="32"
        cy="32"
        r="8"
        stroke="url(#tark-gold-sheen)"
        strokeWidth="1.25"
        strokeOpacity="0.7"
      />

      {/* ── Layer 4: Razor-Sharp Crosshair Blades (The 4 Knowledge Axes) ── */}
      {/* North Blade */}
      <polygon
        points="32,6 30.5,23 32,25 33.5,23"
        fill="url(#tark-gold-sheen)"
      />
      {/* South Blade */}
      <polygon
        points="32,58 30.5,41 32,39 33.5,41"
        fill="url(#tark-gold-dark)"
      />
      {/* West Blade */}
      <polygon
        points="6,32 23,30.5 25,32 23,33.5"
        fill="url(#tark-gold-sheen)"
      />
      {/* East Blade */}
      <polygon
        points="58,32 41,30.5 39,32 41,33.5"
        fill="url(#tark-gold-sheen)"
      />

      {/* ── Layer 5: Central Core of Discernment (The Singularity) ── */}
      <circle cx="32" cy="32" r="3.5" fill="#ffffff" filter="drop-shadow(0 0 4px #e0d0ab)" />
      <circle cx="32" cy="32" r="1.5" fill="#041d40" />
    </svg>
  );
}

export default function BrandLogo({
  size = 'md',
  isCompact = false,
  showSubtitle = true,
  className = '',
  onClick,
}: BrandLogoProps) {
  const iconSize = size === 'sm' ? 26 : size === 'lg' ? 42 : size === 'xl' ? 52 : 32;

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 select-none cursor-pointer ${className}`}
      title="Tark | तर्क — The Analytical Crucible"
    >
      {/* Bespoke Vector Sigil Emblem */}
      <div className="relative flex items-center justify-center p-0.5">
        <TarkSigil size={iconSize} />
      </div>

      {/* Logotype Lockup */}
      {!isCompact && (
        <div className="flex flex-col min-w-0 justify-center">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-serif font-extrabold tracking-[0.08em] leading-none text-[#e8e0cf] group-hover:text-[#fbf7ee] transition-colors ${
                size === 'sm'
                  ? 'text-sm'
                  : size === 'lg'
                  ? 'text-2xl'
                  : size === 'xl'
                  ? 'text-3xl'
                  : 'text-base'
              }`}
              style={{
                textShadow: '0 2px 10px rgba(0,0,0,0.6)',
              }}
            >
              TARK
            </span>
            <span
              className={`font-serif font-bold text-[#0194a8] tracking-widest leading-none ${
                size === 'sm'
                  ? 'text-[11px]'
                  : size === 'lg'
                  ? 'text-base'
                  : size === 'xl'
                  ? 'text-lg'
                  : 'text-[13px]'
              }`}
            >
              तर्क
            </span>
          </div>

          {showSubtitle && (
            <span
              className={`font-mono font-medium text-[#8fa2bd] uppercase tracking-[0.22em] mt-1 ${
                size === 'sm'
                  ? 'text-[8px]'
                  : size === 'lg'
                  ? 'text-[10.5px]'
                  : size === 'xl'
                  ? 'text-[12px]'
                  : 'text-[9px]'
              }`}
            >
              Crucible of Reason
            </span>
          )}
        </div>
      )}
    </div>
  );
}
