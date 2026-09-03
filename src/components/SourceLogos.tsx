import React from 'react';
import { motion } from 'framer-motion';

interface TheHinduLogoProps {
  height?: number | string;
  className?: string;
  animated?: boolean;
  color?: string; // '#ffffff' | '#e0d0ab' | '#072e63' | 'currentColor'
}

/**
 * The Hindu — Authentic 1878 National Masthead
 * Features the complete iconic serif wordmark and the central elephant crest emblem,
 * matching the authentic visual identity of India's National Newspaper of Record.
 */
export function TheHinduLogo({
  height = 14,
  className = '',
  animated = false,
  color = '#ffffff',
}: TheHinduLogoProps) {
  // Select color-matched authentic vector asset
  const isGold = color === '#e0d0ab' || color.toLowerCase().includes('gold') || color.toLowerCase().includes('amber');
  const isDark = color === '#072e63' || color === '#161615' || color === '#030f21' || color.toLowerCase().includes('dark') || color === 'black';
  const assetSrc = isGold
    ? '/logos/the-hindu-gold.svg'
    : isDark
    ? '/logos/the-hindu.svg'
    : '/logos/the-hindu-light.svg';

  const content = (
    <img
      src={assetSrc}
      alt="The Hindu — National Newspaper of Record"
      title="The Hindu"
      style={{ height, width: 'auto' }}
      className={`shrink-0 select-none object-contain inline-block transition-transform duration-200 ${className}`}
      loading="eager"
      draggable={false}
    />
  );

  if (animated) {
    return (
      <motion.div
        whileHover={{ scale: 1.04, y: -0.5 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center shrink-0"
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

interface PibLogoProps {
  size?: number;
  className?: string;
  variant?: 'seal' | 'badge' | 'lockup';
  animated?: boolean;
}

/**
 * Press Information Bureau (PIB) — Official Sovereign Insignia
 * Authentic Government of India wire identity:
 * - Ashoka Chakra in deep navy with 24 radial spokes
 * - Dynamic Saffron & Green tricolor brushstroke arcs
 * - Iconic Devanagari-English fusion 'pib' lettermark with continuous shirorekha top bar
 * - Official bilingual lettering: पत्र सूचना कार्यालय / PRESS INFORMATION BUREAU / भारत सरकार
 */
export function PibLogo({
  size = 20,
  className = '',
  variant = 'seal',
  animated = false,
}: PibLogoProps) {
  const sealImage = (
    <img
      src="/logos/pib-india.svg"
      alt="Press Information Bureau — Government of India"
      title="Press Information Bureau (PIB)"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full select-none object-contain shadow-xs transition-transform duration-200 ${className}`}
      loading="eager"
      draggable={false}
    />
  );

  if (variant === 'lockup') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        {animated ? (
          <motion.div
            whileHover={{ rotate: 6, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="shrink-0"
          >
            {sealImage}
          </motion.div>
        ) : (
          sealImage
        )}
        <div className="flex flex-col text-left leading-none font-sans">
          <div className="flex items-center gap-1.5">
            <span className="font-serif text-xs sm:text-sm font-bold tracking-wider text-white">
              PIB
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-[9px] font-mono text-[#e0d0ab] uppercase tracking-wider mt-0.5">
            Press Information Bureau
          </span>
          <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest">
            Government of India
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs bg-zinc-900/90 border border-zinc-800 text-[#e0d0ab] ${className}`}>
        {sealImage}
        <span className="text-[10px] font-mono font-bold tracking-wider">PIB OFFICIAL</span>
        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
      </div>
    );
  }

  if (animated) {
    return (
      <motion.div
        whileHover={{ scale: 1.08, rotate: 3 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 350, damping: 20 }}
        className="inline-flex items-center justify-center shrink-0"
      >
        {sealImage}
      </motion.div>
    );
  }

  return sealImage;
}

interface SourceBadgeProps {
  source: string;
  size?: 'xs' | 'sm' | 'md';
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

/**
 * Universal SourceBadge with authentic official emblems
 * for PIB, The Hindu, RBI, and PRS.
 */
export function SourceBadge({
  source,
  size = 'sm',
  onClick,
  active = false,
  className = '',
}: SourceBadgeProps) {
  const norm = source?.toUpperCase() || '';
  const isTheHindu = norm.includes('HINDU');
  const isPib = norm.includes('PIB');
  const isRbi = norm.includes('RBI');
  const isPrs = norm.includes('PRS');

  const baseStyle = `inline-flex items-center gap-2 px-2.5 py-1 rounded-sm border transition-all cursor-pointer font-sans select-none ${
    active
      ? 'border-[#e0d0ab] bg-[#e0d0ab]/15 text-[#e0d0ab] shadow-sm shadow-[#e0d0ab]/10'
      : 'border-zinc-800/80 bg-zinc-900/60 text-zinc-300 hover:border-[#e0d0ab]/50 hover:text-white hover:bg-zinc-800/60'
  } ${className}`;

  if (isTheHindu) {
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.02, y: -0.5 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={baseStyle}
        title="The Hindu — National Newspaper of Record"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <TheHinduLogo
          height={size === 'xs' ? 10 : size === 'sm' ? 12 : 14}
          color={active ? '#e0d0ab' : '#ffffff'}
        />
      </motion.button>
    );
  }

  if (isPib) {
    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.02, y: -0.5 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={baseStyle}
        title="Press Information Bureau — Sovereign Wire of Government of India"
      >
        <PibLogo size={size === 'xs' ? 15 : size === 'sm' ? 18 : 22} animated={false} />
        <span className="text-[11px] font-bold tracking-wider font-mono">PIB OFFICIAL</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      </motion.button>
    );
  }

  if (isRbi) {
    return (
      <button type="button" onClick={onClick} className={baseStyle} title="Reserve Bank of India">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        <span className="text-[11px] font-bold font-mono text-amber-300">RBI WIRE</span>
      </button>
    );
  }

  if (isPrs) {
    return (
      <button type="button" onClick={onClick} className={baseStyle} title="PRS Legislative Research">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
        <span className="text-[11px] font-bold font-mono text-cyan-300">⚖️ PRS LEGISLATIVE</span>
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseStyle}>
      <span className="text-xs font-mono">{source}</span>
    </button>
  );
}
