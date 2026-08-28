import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pin,
  PinOff,
  Columns,
  Layers,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Sparkles,
  BookOpen,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { Passage, Thinker } from '../types/humanities';

interface DialecticWorkbenchProps {
  pinnedPassages: Passage[];
  thinkers: Thinker[];
  onTogglePin: (passage: Passage) => void;
  onClearAll: () => void;
  onScrollToPassage: (passageId: string) => void;
}

export default function DialecticWorkbench({
  pinnedPassages,
  thinkers,
  onTogglePin,
  onClearAll,
  onScrollToPassage,
}: DialecticWorkbenchProps) {
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [copiedSynthesis, setCopiedSynthesis] = useState(false);

  // Helper to find parent thinker for a passage
  const getThinkerForPassage = (passageId: string): Thinker | undefined => {
    return thinkers.find((t) => t.passages.some((p) => p.id === passageId));
  };

  // Group pinned passages by thinker
  const groupedByThinker = thinkers
    .map((thinker) => {
      const passages = pinnedPassages.filter((p) =>
        thinker.passages.some((tp) => tp.id === p.id)
      );
      return { thinker, passages };
    })
    .filter((group) => group.passages.length > 0);

  // Generate a multi-thinker synthesis markdown block ready for GS-IV answers
  const handleCopyMultiThinkerSynthesis = async () => {
    if (pinnedPassages.length === 0) return;

    let text = `# UPSC GS-IV & Essay Dialectic Synthesis\n\n`;
    groupedByThinker.forEach(({ thinker, passages }) => {
      text += `### ${thinker.name} — *${thinker.workTitle}* (${thinker.year})\n`;
      passages.forEach((p, idx) => {
        const citations = p.pyqCitations
          .map((c) => `[UPSC ${c.paper} ${c.year}]`)
          .join(' ');
        text += `> "${p.text.trim()}"\n`;
        if (citations) text += `> *Citation: ${citations}*\n\n`;
        else text += `\n`;
      });
    });

    text += `---\n*Synthesized via Tark Canonical Testing Arena*\n`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSynthesis(true);
      setTimeout(() => setCopiedSynthesis(false), 2200);
    } catch (err) {
      console.error('Failed to copy synthesis', err);
    }
  };

  return (
    <>
      {/* Sticky Docked Margin Rail */}
      <div className="sticky top-24 space-y-4">
        <div className="relative border border-zinc-800 bg-zinc-950/90 backdrop-blur-md p-5 rounded-sm shadow-xl space-y-4">
          {/* Decorative Corner Filigree */}
          <span className="absolute top-1.5 left-1.5 text-xs font-mono text-zinc-700 leading-none select-none">┌</span>
          <span className="absolute top-1.5 right-1.5 text-xs font-mono text-zinc-700 leading-none select-none">┐</span>
          <span className="absolute bottom-1.5 left-1.5 text-xs font-mono text-zinc-700 leading-none select-none">└</span>
          <span className="absolute bottom-1.5 right-1.5 text-xs font-mono text-zinc-700 leading-none select-none">┘</span>

          {/* Workbench Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-[#e0d0ab]/10 border border-[#e0d0ab]/20 text-[#e0d0ab]">
                <Columns className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm text-stone-100">
                  Dialectic Workbench
                </h3>
                <p className="text-[11px] font-sans text-zinc-400">
                  Cross-Thinker Margin Rail
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-zinc-900 border border-zinc-800 text-[#e0d0ab]">
              {pinnedPassages.length} Pinned
            </span>
          </div>

          {/* Action Row when items are pinned */}
          {pinnedPassages.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#e0d0ab] hover:bg-[#c8b998] text-zinc-950 font-sans font-semibold text-xs transition-all cursor-pointer shadow-sm"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Compare Matrix</span>
              </button>

              <button
                type="button"
                onClick={handleCopyMultiThinkerSynthesis}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-sm bg-zinc-900 hover:bg-zinc-850 text-stone-200 border border-zinc-800 font-sans font-medium text-xs transition-all cursor-pointer"
              >
                {copiedSynthesis ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied Block</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Synthesis</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Empty State */}
          {pinnedPassages.length === 0 ? (
            <div className="p-6 text-center space-y-3 rounded-sm bg-zinc-900/30 border border-dashed border-zinc-800/80">
              <div className="mx-auto w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <Pin className="w-4 h-4 text-[#e0d0ab]" />
              </div>
              <div className="space-y-1">
                <p className="font-serif text-sm font-semibold text-stone-200">
                  No passages in the rail yet
                </p>
                <p className="text-xs font-sans text-zinc-400 leading-relaxed max-w-xs mx-auto">
                  Click <strong className="text-[#e0d0ab]">"Pin to Workbench"</strong> on excerpts from Ambedkar, Gandhi, or Kant to compare their arguments side by side.
                </p>
              </div>
              <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800 text-[11px] font-sans text-zinc-400 text-left">
                <span className="text-[#e0d0ab] font-semibold">UPSC Strategy:</span> Juxtaposing opposing moral frameworks in GS-IV (e.g. Deontology vs Soul-Force) demonstrates multidimensional critical thinking.
              </div>
            </div>
          ) : (
            /* Pinned Excerpts List */
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {pinnedPassages.map((p) => {
                const parentThinker = getThinkerForPassage(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => onScrollToPassage(p.id)}
                    className="p-3.5 rounded-sm bg-zinc-900/70 border border-zinc-800 hover:border-[#e0d0ab]/60 transition-all cursor-pointer space-y-2 group shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[#e0d0ab] text-[11px]">
                          § {p.id.split('-').pop()?.toUpperCase() || p.id}
                        </span>
                        <span className="font-sans font-medium text-stone-200 text-xs">
                          {parentThinker?.name || 'Canon Thinker'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(p);
                        }}
                        title="Remove from rail"
                        className="text-zinc-500 hover:text-red-400 p-1 transition-colors"
                      >
                        <PinOff className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs font-serif text-stone-300 line-clamp-3 italic leading-relaxed">
                      "{p.text}"
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-zinc-850">
                      <div className="flex flex-wrap gap-1">
                        {p.pyqCitations.map((c, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-[#e0d0ab] border border-zinc-850"
                          >
                            {c.paper} {c.year}
                          </span>
                        ))}
                      </div>

                      <span className="text-[10px] font-sans text-zinc-500 group-hover:text-[#e0d0ab] transition-colors">
                        Jump to text →
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Clear all action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClearAll}
                  className="flex items-center gap-1 text-[11px] font-sans text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Workbench</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Side-by-Side Dialectic Matrix Modal */}
      <AnimatePresence>
        {isCompareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-6xl max-h-[90vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl overflow-hidden"
            >
              {/* Filigree corner brackets */}
              <span className="absolute top-2 left-2 text-xs font-mono text-zinc-600 select-none">┌</span>
              <span className="absolute top-2 right-2 text-xs font-mono text-zinc-600 select-none">┐</span>
              <span className="absolute bottom-2 left-2 text-xs font-mono text-zinc-600 select-none">└</span>
              <span className="absolute bottom-2 right-2 text-xs font-mono text-zinc-600 select-none">┘</span>

              {/* Modal Masthead */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between gap-4 bg-zinc-900/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/20">
                      Dialectic Matrix
                    </span>
                    <span className="text-zinc-400 text-xs font-sans">
                      Side-by-Side Comparative Synthesis
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-serif font-bold text-stone-100">
                    Comparative Ethics & Political Philosophy Matrix
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCopyMultiThinkerSynthesis}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#e0d0ab] hover:bg-[#c8b998] text-zinc-950 font-sans font-semibold text-xs transition-all cursor-pointer"
                  >
                    {copiedSynthesis ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied Synthesis</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Matrix Markdown</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCompareModalOpen(false)}
                    className="p-1.5 rounded text-zinc-400 hover:text-stone-100 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Matrix Columns */}
              <div className="p-6 overflow-y-auto flex-1">
                {groupedByThinker.length === 0 ? (
                  <div className="text-center py-16 text-zinc-500 font-sans">
                    No passages selected for comparison.
                  </div>
                ) : (
                  <div
                    className={`grid gap-6 ${
                      groupedByThinker.length === 1
                        ? 'grid-cols-1'
                        : groupedByThinker.length === 2
                        ? 'grid-cols-1 md:grid-cols-2'
                        : 'grid-cols-1 md:grid-cols-3'
                    }`}
                  >
                    {groupedByThinker.map(({ thinker, passages }) => (
                      <div
                        key={thinker.id}
                        className="p-5 rounded-sm bg-zinc-900/60 border border-zinc-800 space-y-4 flex flex-col"
                      >
                        <div className="border-b border-zinc-800 pb-3">
                          <h3 className="font-serif font-bold text-base text-[#e0d0ab]">
                            {thinker.name}
                          </h3>
                          <p className="font-serif italic text-xs text-zinc-400">
                            {thinker.workTitle} ({thinker.year})
                          </p>
                        </div>

                        <div className="space-y-4 flex-1">
                          {passages.map((p) => (
                            <div
                              key={p.id}
                              className="p-4 rounded-sm bg-zinc-950 border border-zinc-800/80 space-y-2.5"
                            >
                              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                                <span className="text-[#e0d0ab] font-bold">
                                  § {p.id}
                                </span>
                                {p.pyqCitations.map((c, i) => (
                                  <span
                                    key={i}
                                    className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                                  >
                                    UPSC {c.paper} ({c.year})
                                  </span>
                                ))}
                              </div>

                              <blockquote className="font-serif text-xs md:text-sm text-stone-200 italic leading-relaxed">
                                "{p.text}"
                              </blockquote>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
