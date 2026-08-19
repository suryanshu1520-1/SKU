import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Scale, ExternalLink, AlertTriangle, Sparkles, Check } from 'lucide-react';

const ACCENT = '#e0d0ab';

export interface VerifiedClaim {
  text: string;
  spanIds: string[];
  quotes: string[]; // verbatim source sentences
  facts: string[];
  claimType: 'numeric' | 'context';
  verified: boolean;
  source: string;
  url: string;
}

export interface ContestedSide {
  source: string;
  url: string;
  value: string;
  quote: string;
}

export interface ContestedClaim {
  entity: string;
  metric: string;
  period: string;
  sides: [ContestedSide, ContestedSide, ...ContestedSide[]];
  nodeId?: string;
}

/**
 * SourceAnchor — Interactive trust surface for verified claims.
 * Hover on desktop, click/tap to toggle on mobile/touch with glassmorphic tooltip.
 */
export function SourceAnchor({ claim }: { claim: VerifiedClaim }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  if (!claim?.quotes?.length) return null;

  return (
    <span
      ref={anchorRef}
      className="relative inline-block align-super select-none z-10"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={`Verified source: ${claim.source}`}
        title={`Grounded in ${claim.source}`}
        className={`ml-1 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full transition-all cursor-pointer ${
          open
            ? 'bg-[#e0d0ab] text-zinc-950 shadow-[0_0_8px_rgba(224,208,171,0.5)]'
            : 'text-[#e0d0ab]/70 hover:text-[#e0d0ab] bg-[#e0d0ab]/10 hover:bg-[#e0d0ab]/20'
        }`}
      >
        <ShieldCheck className="w-2.5 h-2.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 bottom-full mb-2 w-80 max-w-[85vw] z-50 origin-bottom-left"
          >
            <div className="rounded-sm border border-[#e0d0ab]/30 bg-zinc-950/95 backdrop-blur-md p-3 shadow-[0_16px_36px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-zinc-800">
                <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[#e0d0ab]">
                  <ShieldCheck className="w-3 h-3 text-[#e0d0ab]" />
                  <span>Grounded in {claim.source}</span>
                </div>
                {claim.spanIds?.length > 0 && (
                  <span className="text-[8px] font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800">
                    {claim.spanIds.join(', ')}
                  </span>
                )}
              </div>

              {/* Verbatim Quotes */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {claim.quotes.map((q, i) => (
                  <div
                    key={i}
                    className="border-l-2 border-[#e0d0ab]/50 pl-2 py-0.5 text-[11px] font-serif italic text-zinc-200 leading-relaxed"
                  >
                    &ldquo;{q}&rdquo;
                  </div>
                ))}
              </div>

              {/* Facts Verified Ledger */}
              {claim.facts?.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex flex-wrap gap-1 items-center">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">Facts Verified:</span>
                  {claim.facts.map((f, i) => (
                    <span
                      key={i}
                      className="text-[8px] font-mono px-1 py-0.2 bg-[#e0d0ab]/10 text-[#e0d0ab] rounded-sm border border-[#e0d0ab]/20"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {/* Source Link */}
              {claim.url && (
                <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex justify-end">
                  <a
                    href={claim.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-[#e0d0ab] hover:underline"
                  >
                    <span>View Primary Gazette</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * GroundingBadge — Displays the verification percentage for a synthesized story.
 */
export function GroundingBadge({ grounding }: { grounding?: number }) {
  if (typeof grounding !== 'number') return null;
  const pct = Math.round(grounding * 100);

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-sm border ${
        pct >= 80
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          : pct >= 50
          ? 'bg-[#e0d0ab]/10 text-[#e0d0ab] border-[#e0d0ab]/30'
          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
      }`}
      title={`${pct}% of factual claims deterministically verified against primary source sentences`}
    >
      <ShieldCheck className="w-2.5 h-2.5" />
      <span>{pct}% Grounded</span>
    </span>
  );
}

/**
 * ContestedCard — Analytical two-column comparison when primary sources disagree.
 */
export function ContestedCard({ contested }: { contested?: ContestedClaim }) {
  if (!contested?.sides || contested.sides.length < 2) return null;

  const [sideA, sideB] = contested.sides;

  return (
    <div className="my-3 rounded-sm border border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-zinc-950/80 to-zinc-950 p-3.5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-amber-500/20">
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
          <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Contested Intelligence: {contested.entity} &bull; {contested.metric.replace(/_/g, ' ')}</span>
        </div>
        {contested.period && contested.period !== 'CURRENT_PERIOD' && (
          <span className="text-[9px] font-mono text-amber-200/80 px-1.5 py-0.5 bg-amber-500/10 rounded-sm border border-amber-500/30">
            {contested.period}
          </span>
        )}
      </div>

      {/* Two Column Disagreement Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2.5">
        {/* Side A */}
        <div className="rounded-sm bg-zinc-900/80 border border-zinc-800 p-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase text-[#e0d0ab]">{sideA.source}</span>
              <span className="text-xs font-mono font-bold text-white px-1.5 py-0.5 bg-zinc-800 rounded">
                {sideA.value}
              </span>
            </div>
            <p className="text-[11px] font-serif italic text-zinc-300 leading-snug line-clamp-3">
              &ldquo;{sideA.quote}&rdquo;
            </p>
          </div>
          {sideA.url && (
            <div className="mt-2 pt-1 border-t border-zinc-800 flex justify-end">
              <a
                href={sideA.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[9px] font-mono text-zinc-400 hover:text-[#e0d0ab]"
              >
                <span>Verify Source</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}
        </div>

        {/* Side B */}
        <div className="rounded-sm bg-zinc-900/80 border border-zinc-800 p-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase text-[#e0d0ab]">{sideB.source}</span>
              <span className="text-xs font-mono font-bold text-white px-1.5 py-0.5 bg-zinc-800 rounded">
                {sideB.value}
              </span>
            </div>
            <p className="text-[11px] font-serif italic text-zinc-300 leading-snug line-clamp-3">
              &ldquo;{sideB.quote}&rdquo;
            </p>
          </div>
          {sideB.url && (
            <div className="mt-2 pt-1 border-t border-zinc-800 flex justify-end">
              <a
                href={sideB.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[9px] font-mono text-zinc-400 hover:text-[#e0d0ab]"
              >
                <span>Verify Source</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Analytical Note */}
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
        <span>UPSC Strategy: When sources differ, cite the primary gazette figure with secondary wire context.</span>
      </div>
    </div>
  );
}
