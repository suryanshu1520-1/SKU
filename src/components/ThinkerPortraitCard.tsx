import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, BookOpen, ExternalLink, Award } from 'lucide-react';
import type { ThinkerEngraving } from '../data/thinker-engravings';
import ThinkerEngravingSvg from './ThinkerEngravingSvg';

interface ThinkerPortraitCardProps {
  engraving: ThinkerEngraving;
  isSelected: boolean;
  onSelect: () => void;
  citationCount: number;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

export default function ThinkerPortraitCard({
  engraving,
  isSelected,
  onSelect,
  citationCount,
}: ThinkerPortraitCardProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false);
  const [revealedChars, setRevealedChars] = useState(0);

  const isActive = isHovered || isTapped || isSelected;
  const quote = engraving.pullQuote.text;
  const citation = engraving.pullQuote.citation;

  // Auto-clear tap timer on mobile after quote read time
  useEffect(() => {
    if (!isTapped) return;
    const timer = setTimeout(() => {
      setIsTapped(false);
    }, quote.length * 20 + 4000);
    return () => clearTimeout(timer);
  }, [isTapped, quote]);

  // Typewriter effect when activated
  useEffect(() => {
    if (!isActive) {
      setRevealedChars(0);
      return;
    }
    if (reducedMotion) {
      setRevealedChars(quote.length);
      return;
    }

    setRevealedChars(0);
    const interval = setInterval(() => {
      setRevealedChars((n) => {
        if (n >= quote.length) {
          clearInterval(interval);
          return n;
        }
        return n + 1;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [isActive, quote, reducedMotion]);

  const revealedText = quote.slice(0, revealedChars);
  const isFullyRevealed = revealedChars >= quote.length;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${engraving.name}: ${engraving.workTitle}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onClick={() => {
        onSelect();
        setIsTapped(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
          setIsTapped(true);
        }
      }}
      className={`group relative flex flex-col rounded-sm border p-4 transition-all duration-300 cursor-pointer outline-none select-none text-left overflow-hidden ${
        isSelected
          ? 'bg-zinc-900/90 border-[#e0d0ab] shadow-[0_12px_32px_rgba(7,46,99,0.7),0_0_24px_rgba(224,208,171,0.15)] ring-1 ring-[#e0d0ab]/40'
          : isActive
          ? 'bg-zinc-900/70 border-[#0194a8] shadow-lg'
          : 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      {/* Precision corner brackets */}
      <span className="absolute top-1 left-1.5 text-[10px] font-mono text-zinc-600 leading-none select-none">┌</span>
      <span className="absolute top-1 right-1.5 text-[10px] font-mono text-zinc-600 leading-none select-none">┐</span>
      <span className="absolute bottom-1 left-1.5 text-[10px] font-mono text-zinc-600 leading-none select-none">└</span>
      <span className="absolute bottom-1 right-1.5 text-[10px] font-mono text-zinc-600 leading-none select-none">┘</span>

      {/* Ambient background gold/teal spotlight aura on hover/active */}
      <div
        aria-hidden="true"
        className={`absolute -inset-px pointer-events-none transition-opacity duration-700 ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: isSelected
            ? 'radial-gradient(circle at 50% 30%, rgba(224,208,171,0.12) 0%, rgba(19,108,153,0.06) 60%, transparent 100%)'
            : 'radial-gradient(circle at 50% 30%, rgba(1,148,168,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Top Header Badge Row */}
      <div className="flex items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
              isSelected ? 'bg-[#e0d0ab] shadow-[0_0_8px_#e0d0ab]' : isActive ? 'bg-[#0194a8]' : 'bg-zinc-600'
            }`}
          />
          <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
            {engraving.era}
          </span>
        </div>

        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[10px] font-mono text-[#e0d0ab]">
          <Award className="w-3 h-3 text-[#e0d0ab]" />
          <span>{citationCount} PYQs</span>
        </div>
      </div>

      {/* Vector Engraving Portrait Centerpiece */}
      <div className="relative my-3 w-full h-36 flex items-center justify-center z-10">
        <ThinkerEngravingSvg
          thinkerId={engraving.id}
          isHovered={isHovered || isTapped}
          isSelected={isSelected}
          className="w-32 h-32 md:w-36 md:h-36"
        />

        {/* Selected Active Indicator Pill */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute bottom-0 px-2.5 py-0.5 rounded-full bg-[#e0d0ab] text-zinc-950 text-[10px] font-sans font-semibold tracking-wide shadow-md flex items-center gap-1"
          >
            <span>Active Reader</span>
          </motion.div>
        )}
      </div>

      {/* Thinker Name & Primary Work */}
      <div className="z-10 text-center space-y-1">
        <h3
          className={`font-serif font-bold text-base md:text-lg transition-colors ${
            isSelected ? 'text-[#e0d0ab]' : 'text-stone-100 group-hover:text-stone-50'
          }`}
        >
          {engraving.name}
        </h3>
        <p className="font-serif italic text-xs text-zinc-400 line-clamp-1">
          {engraving.workTitle} ({engraving.workYear})
        </p>
      </div>

      {/* Voice Resonance Chamber: Animated Pull-Quote & Exact UPSC Citation */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2.5 z-10 overflow-hidden"
          >
            {/* Thesis Eyebrow */}
            <div className="flex items-center gap-1.5 text-[10px] font-sans font-medium text-[#c8b998]">
              <Sparkles className="w-3 h-3 text-[#e0d0ab]" />
              <span>Core Thesis Resonance:</span>
            </div>

            {/* Verbatim Excerpt */}
            <blockquote className="font-serif text-xs md:text-[13px] text-stone-200 leading-relaxed italic pl-2 border-l-2 border-[#e0d0ab]/60 bg-zinc-950/40 py-1 pr-1 rounded-r-sm min-h-[3.6em]">
              "{revealedText}"
              {!isFullyRevealed && (
                <span className="inline-block w-1.5 h-3.5 bg-[#e0d0ab] ml-0.5 animate-pulse align-middle" />
              )}
            </blockquote>

            {/* Exam Vector Citation Link */}
            {isFullyRevealed && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#e0d0ab]/15 text-[#e0d0ab] border border-[#e0d0ab]/30">
                      UPSC {citation.paper} {citation.year}
                    </span>
                    <span className="text-[10px] font-sans text-zinc-400 hidden sm:inline">
                      Primary Question Root
                    </span>
                  </div>
                  <p className="text-[10px] font-sans text-zinc-500 line-clamp-1">
                    {citation.note}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-[11px] font-sans font-medium text-[#e0d0ab] group-hover:translate-x-0.5 transition-transform">
                  <span>Read</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-active summary hint */}
      {!isActive && (
        <div className="mt-3 pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] font-sans text-zinc-500 z-10">
          <span>{engraving.accentTitle}</span>
          <span className="text-[10px] font-mono text-zinc-600">hover/tap</span>
        </div>
      )}
    </div>
  );
}
