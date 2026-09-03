import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Scale, ExternalLink, AlertTriangle, Sparkles, Check, X } from 'lucide-react';

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
  verification_method?: 'live_cite_or_drop_v1';
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
  verificationMethod?: 'live_contested_v1';
}

/**
 * SourceAnchor — Interactive trust surface for verified claims.
 * Uses createPortal to attach directly to document.body, completely preventing any
 * clipping from parent overflow-hidden or transform bounds on desktop and mobile.
 */
export function SourceAnchor({ claim }: { claim: VerifiedClaim }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; isAbove: boolean } | null>(null);

  const updatePosition = () => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const popoverWidth = Math.min(360, window.innerWidth - 32);

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    const spaceAbove = rect.top;
    const isAbove = spaceAbove > 220;
    const top = isAbove ? rect.top - 8 : rect.bottom + 8;

    setCoords({ top, left, isAbove });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        const portalEl = document.getElementById('source-anchor-portal-content');
        if (portalEl && portalEl.contains(e.target as Node)) return;
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

  // Fail closed. Legacy rows were once stamped with synthetic quotes by a
  // backfill script; only live cite-or-drop claims may display a trust anchor.
  if (
    !claim?.verified ||
    claim.verification_method !== 'live_cite_or_drop_v1' ||
    !claim.quotes?.length
  ) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex items-center align-middle select-none mx-1"
      onMouseEnter={() => !isMobile && setOpen(true)}
      onMouseLeave={() => !isMobile && setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={`Verified source: ${claim.source}`}
        title={`Grounded in ${claim.source} (Click to inspect evidence)`}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition-all cursor-pointer ${
          open
            ? 'bg-[#e0d0ab] text-[#072e63] shadow-[0_0_8px_rgba(224,208,171,0.6)]'
            : 'text-[#e0d0ab] hover:text-white bg-[rgba(224,208,171,0.15)] hover:bg-[rgba(224,208,171,0.3)] border border-[rgba(224,208,171,0.35)]'
        }`}
      >
        <ShieldCheck className="w-2.5 h-2.5" />
      </button>

      {/* Portal Container */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                {/* Mobile Backdrop */}
                {isMobile && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setOpen(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
                  />
                )}

                {/* Popover Card */}
                <motion.div
                  id="source-anchor-portal-content"
                  initial={{ opacity: 0, scale: 0.96, y: coords?.isAbove ? 6 : -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: coords?.isAbove ? 6 : -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  style={
                    isMobile
                      ? {
                          position: 'fixed',
                          bottom: '16px',
                          left: '16px',
                          right: '16px',
                          zIndex: 9999,
                          maxWidth: 'calc(100vw - 32px)',
                        }
                      : {
                          position: 'fixed',
                          top: coords?.isAbove ? undefined : `${coords?.top}px`,
                          bottom: coords?.isAbove ? `${window.innerHeight - (coords?.top || 0)}px` : undefined,
                          left: `${coords?.left}px`,
                          zIndex: 9999,
                          width: '350px',
                          maxWidth: 'calc(100vw - 32px)',
                        }
                  }
                >
                  <div className="rounded-xs border border-[rgba(224,208,171,0.45)] bg-[rgba(4,25,54,0.96)] backdrop-blur-xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] font-sans text-stone-100">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[rgba(19,108,153,0.35)]">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#e0d0ab]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#34d399]" />
                        <span>Grounded in {claim.source}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {claim.spanIds?.length > 0 && (
                          <span className="text-[8.5px] font-mono text-[#8fa2bd] bg-[rgba(11,61,120,0.4)] px-1.5 py-0.5 rounded-xs border border-[rgba(19,108,153,0.4)]">
                            {claim.spanIds.join(', ')}
                          </span>
                        )}
                        <button
                          onClick={() => setOpen(false)}
                          className="text-[#8fa2bd] hover:text-[#e8e0cf] p-1 cursor-pointer"
                          title="Close"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Verbatim Quotes */}
                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                      {claim.quotes.map((q, i) => (
                        <div
                          key={i}
                          className="border-l-2 border-[#e0d0ab] pl-2.5 py-0.5 text-[12px] font-serif italic text-[#e8e0cf] leading-relaxed bg-[rgba(11,61,120,0.2)] rounded-r-xs"
                        >
                          &ldquo;{q}&rdquo;
                        </div>
                      ))}
                    </div>

                    {/* Facts Verified Ledger */}
                    {claim.facts?.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-[rgba(19,108,153,0.3)] flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] font-mono text-[#8fa2bd] uppercase">Facts Verified:</span>
                        {claim.facts.map((f, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-mono px-1.5 py-0.5 bg-[rgba(52,211,153,0.12)] text-[#34d399] rounded-xs border border-[rgba(52,211,153,0.3)]"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Source Link */}
                    {claim.url && (
                      <div className="mt-2.5 pt-2 border-t border-[rgba(19,108,153,0.3)] flex justify-end">
                        <a
                          href={claim.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#e0d0ab] hover:underline"
                        >
                          <span>View Primary Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </span>
  );
}

/**
 * GroundingBadge — Displays the verification percentage for a synthesized story.
 * Clicking it triggers the interactive Grounding Verification Ledger.
 */
export function GroundingBadge({
  grounding,
  verificationMethod,
  onClick,
  headline,
  source,
  claims,
}: {
  grounding?: number;
  verificationMethod?: 'live_cite_or_drop_v1';
  onClick?: () => void;
  headline?: string;
  source?: string;
  claims?: VerifiedClaim[];
}) {
  // Missing provenance is unknown, not 100%. Values outside 0..1 are legacy
  // corruption and must never be normalized into a reassuring badge.
  if (
    verificationMethod !== 'live_cite_or_drop_v1' ||
    typeof grounding !== 'number' ||
    !Number.isFinite(grounding) ||
    grounding < 0 ||
    grounding > 1
  ) return null;

  const pct = Math.round(grounding * 100);
  const isInteractive = Boolean(onClick);

  return (
    <button
      type="button"
      onClick={onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick(); } : undefined}
      disabled={!isInteractive}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider rounded-sm border transition-all ${
        isInteractive ? 'cursor-pointer hover:scale-105 hover:shadow-xs active:scale-95' : 'cursor-default'
      } ${
        pct >= 80
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/60'
          : pct >= 50
          ? 'bg-[#e0d0ab]/10 text-[#e0d0ab] border-[#e0d0ab]/30 hover:border-[#e0d0ab]/60'
          : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:border-amber-500/60'
      }`}
      title={
        isInteractive
          ? `${pct}% Grounded — Click to inspect deterministic verification ledger`
          : `${pct}% of factual claims deterministically verified against primary source sentences`
      }
    >
      <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
      <span>{pct}% Grounded</span>
      {isInteractive && <span className="w-1 h-1 rounded-full bg-current opacity-70 animate-pulse ml-0.5" />}
    </button>
  );
}

/**
 * ContestedCard — Analytical two-column comparison when primary sources disagree.
 */
export function ContestedCard({ contested }: { contested?: ContestedClaim }) {
  // The existing detector is not yet cite-or-drop grounded. Hide both legacy
  // showcase data and raw-span disagreements until the backend emits provenance.
  if (
    contested?.verificationMethod !== 'live_contested_v1' ||
    !contested.sides ||
    contested.sides.length < 2
  ) return null;

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
        <span>UPSC Strategy: When sources differ, cite the primary government figure with secondary wire context.</span>
      </div>
    </div>
  );
}
