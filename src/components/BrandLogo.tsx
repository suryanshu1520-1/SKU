import React from 'react';
import { motion } from 'motion/react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  isCompact?: boolean;
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Tark Brand Sigil — The Crucible of Reason & Dialectic.
 * Handcrafted vector emblem combining the Devanagari 'त' (Tark / Logic),
 * the analytical diamond prism, and the gold compass star of discernment.
 */
export function TarkSigil({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 group-hover:scale-105 ${className}`}
    >
      <defs>
        {/* Outer Frame Gradient */}
        <linearGradient id="tark-gold-linear" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7f0df" />
          <stop offset="50%" stopColor="#e0d0ab" />
          <stop offset="100%" stopColor="#c8b998" />
        </linearGradient>

        {/* Ambient Radial Core Glow */}
        <radialGradient id="tark-core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e0d0ab" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#0194a8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#041d40" stopOpacity="0" />
        </radialGradient>

        {/* Shadow filter */}
        <filter id="sigil-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#e0d0ab" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* ── Layer 1: Outer Faceted Diamond Shield ── */}
      <path
        d="M24 3L43 14V34L24 45L5 34V14L24 3Z"
        fill="#041936"
        fillOpacity="0.9"
        stroke="url(#tark-gold-linear)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        filter="url(#sigil-glow)"
      />

      {/* ── Layer 2: Inner Radial Core Background ── */}
      <circle cx="24" cy="24" r="16" fill="url(#tark-core-glow)" />

      {/* ── Layer 3: Concentric Geometric Precision Arcs ── */}
      <circle
        cx="24"
        cy="24"
        r="14"
        stroke="#0194a8"
        strokeOpacity="0.4"
        strokeWidth="0.75"
        strokeDasharray="2 3"
      />

      {/* ── Layer 4: The 'त' Dialectic Axis & Stylized Shirorekha ── */}
      {/* Shirorekha (Top Horizontal Bar) */}
      <path
        d="M14 16H34"
        stroke="url(#tark-gold-linear)"
        strokeWidth="2.25"
        strokeLinecap="round"
      />

      {/* Right Vertical Spine (Danda) */}
      <path
        d="M30 16V33"
        stroke="url(#tark-gold-linear)"
        strokeWidth="2.25"
        strokeLinecap="round"
      />

      {/* The Iconic 'त' Left Curvature with analytical taper */}
      <path
        d="M30 23.5H22.5C18.5 23.5 17 26 17 29.5V33"
        stroke="url(#tark-gold-linear)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── Layer 5: Central Discernment Beacon (Golden Crosshair Star) ── */}
      <path
        d="M24 19L25.2 22.8L29 24L25.2 25.2L24 29L22.8 25.2L19 24L22.8 22.8L24 19Z"
        fill="#ffffff"
        opacity="0.95"
      />

      {/* Micro-sparkle node */}
      <circle cx="24" cy="24" r="1.2" fill="#072e63" />
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
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 34;

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 select-none cursor-pointer ${className}`}
      title="Tark | तर्क — The Analytical Testing Arena"
    >
      {/* Bespoke Sigil Emblem */}
      <div className="relative flex items-center justify-center">
        <TarkSigil size={iconSize} />
      </div>

      {/* Logotype Lockup */}
      {!isCompact && (
        <div className="flex flex-col min-w-0 justify-center">
          <div className="flex items-baseline gap-2">
            <span
              className={`font-serif font-bold text-[#e0d0ab] tracking-wider leading-none group-hover:text-white transition-colors ${
                size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base'
              }`}
            >
              TARK
            </span>
            <span
              className={`font-serif text-[#0194a8] tracking-widest leading-none ${
                size === 'sm' ? 'text-[11px]' : size === 'lg' ? 'text-base' : 'text-[13px]'
              }`}
            >
              तर्क
            </span>
          </div>

          {showSubtitle && (
            <span
              className={`font-mono text-[#8fa2bd] uppercase tracking-[0.2em] mt-1 ${
                size === 'sm' ? 'text-[8.5px]' : size === 'lg' ? 'text-[11px]' : 'text-[9.5px]'
              }`}
            >
              Analytical Arena
            </span>
          )}
        </div>
      )}
    </div>
  );
}
