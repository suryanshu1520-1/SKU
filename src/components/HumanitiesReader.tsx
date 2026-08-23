import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Pin,
  PinOff,
  Bookmark,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  AlertTriangle,
  History
} from 'lucide-react';
import canonData from '../data/humanities-canon.json';
import type { HumanitiesCanon, Thinker, Passage, PyqCitation } from '../types/humanities';

const canon = canonData as HumanitiesCanon;

export function togglePinPassage(
  currentPinned: Passage[],
  passage: Passage
): Passage[] {
  const isAlreadyPinned = currentPinned.some((p) => p.id === passage.id);
  if (isAlreadyPinned) {
    return currentPinned.filter((p) => p.id !== passage.id);
  }
  return [...currentPinned, passage];
}

export function isPassagePinned(
  pinnedList: Passage[],
  passageId: string
): boolean {
  return pinnedList.some((p) => p.id === passageId);
}

export default function HumanitiesReader() {
  const [selectedThinkerId, setSelectedThinkerId] = useState<string>(
    canon.thinkers[0]?.id || 'ambedkar'
  );
  const [pinnedPassages, setPinnedPassages] = useState<Passage[]>([]);
  const [highlightedPassageId, setHighlightedPassageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const passageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedThinker =
    canon.thinkers.find((t) => t.id === selectedThinkerId) || canon.thinkers[0];

  const handleTogglePin = (passage: Passage) => {
    setPinnedPassages((prev) => togglePinPassage(prev, passage));
  };

  const handleScrollToPassage = (passageId: string) => {
    setHighlightedPassageId(passageId);
    const elem = passageRefs.current[passageId];
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setTimeout(() => {
      setHighlightedPassageId((prev) => (prev === passageId ? null : prev));
    }, 2500);
  };

  const filteredPassages = (selectedThinker?.passages || []).filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.text.toLowerCase().includes(q) ||
      p.pyqCitations.some(
        (c) =>
          c.paper.toLowerCase().includes(q) ||
          String(c.year).includes(q) ||
          (c.note && c.note.toLowerCase().includes(q))
      )
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans pb-16">
      {/* Header */}
      <div className="border border-zinc-800 bg-zinc-950/80 p-6 md:p-8 rounded-sm backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/20">
                Humanities Canonical Reader
              </span>
              <span className="text-zinc-500 text-xs font-mono">Liquid Margin Rail</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-100">
              Canonical Texts & PYQ Citations
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 font-sans max-w-2xl leading-relaxed">
              Ground truth excerpts cross-referenced directly with historical UPSC CSE examination vectors. Pin key arguments to the margin rail for comparative cross-reading.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400 bg-zinc-900/80 px-3.5 py-2 border border-zinc-800 rounded-sm">
            <Pin className="w-4 h-4 text-[#e0d0ab]" />
            <span>Pinned Excerpts: </span>
            <strong className="text-[#e0d0ab]">{pinnedPassages.length}</strong>
          </div>
        </div>
      </div>

      {/* Main Reader Stage: Left 8 cols (Text column) | Right 4 cols (Pinned Margin Rail) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Thinker Selection & Passages */}
        <div className="lg:col-span-8 space-y-6">
          {/* Thinker Selector Bar */}
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {canon.thinkers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedThinkerId(t.id)}
                  className={`px-3.5 py-1.5 rounded-sm text-xs font-sans font-medium transition-all cursor-pointer ${
                    selectedThinkerId === t.id
                      ? 'bg-[#e0d0ab] text-zinc-950 font-bold shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-stone-200 border border-zinc-800'
                  }`}
                >
                  {t.name} ({t.year})
                </button>
              ))}
            </div>

            {/* Search filter */}
            <div className="relative w-48 hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter citations..."
                className="w-full pl-8 pr-3 py-1 bg-zinc-900 border border-zinc-800 focus:border-[#e0d0ab]/50 text-stone-100 placeholder-zinc-500 rounded-sm text-xs outline-none"
              />
            </div>
          </div>

          {/* Thinker Work Metadata Card */}
          {selectedThinker && (
            <div className="p-4 rounded-sm bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <div className="flex items-center justify-between text-stone-200">
                <span className="font-serif font-bold text-sm">
                  {selectedThinker.workTitle} ({selectedThinker.year})
                </span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {selectedThinker.publicDomainBasis}
                </span>
              </div>
            </div>
          )}

          {/* Passages List */}
          <div className="space-y-4">
            {filteredPassages.map((passage) => {
              const isPinned = isPassagePinned(pinnedPassages, passage.id);
              const isHighlighted = highlightedPassageId === passage.id;

              return (
                <div
                  key={passage.id}
                  ref={(el) => { passageRefs.current[passage.id] = el; }}
                  className={`p-6 rounded-sm border transition-all duration-300 space-y-4 ${
                    isHighlighted
                      ? 'bg-zinc-900/90 border-[#e0d0ab] ring-2 ring-[#e0d0ab]/40 shadow-xl'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-500">
                        § {passage.id}
                      </span>
                      {passage.isPlaceholder && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950/50 text-amber-300 border border-amber-800/40 uppercase tracking-wider">
                          PLACEHOLDER
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleTogglePin(passage)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-mono transition-all cursor-pointer ${
                        isPinned
                          ? 'bg-[#e0d0ab] text-zinc-950 font-bold'
                          : 'bg-zinc-900 text-zinc-400 hover:text-stone-200 border border-zinc-800'
                      }`}
                    >
                      {isPinned ? (
                        <>
                          <PinOff className="w-3 h-3" />
                          <span>Unpin</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-3 h-3" />
                          <span>Pin to Rail</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Passage Text */}
                  <p className="text-sm md:text-base font-serif text-stone-200 leading-relaxed italic">
                    "{passage.text}"
                  </p>

                  {/* PYQ Citations Badges */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">
                      PYQ Citations:
                    </span>
                    {passage.pyqCitations.map((cit, cIdx) => (
                      <span
                        key={cIdx}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-[#e0d0ab]"
                        title={cit.note || ''}
                      >
                        {cit.paper} ({cit.year})
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Pinned Margin Rail */}
        <div className="lg:col-span-4 space-y-4">
          <div className="sticky top-28 space-y-4">
            <div className="border border-zinc-800 bg-zinc-950/90 p-5 rounded-sm space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-[#e0d0ab]" />
                  <h3 className="font-serif font-bold text-sm text-stone-100">
                    Margin Rail (Collected)
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-zinc-500">
                  {pinnedPassages.length} Items
                </span>
              </div>

              {pinnedPassages.length === 0 ? (
                <div className="p-6 text-center text-zinc-500 text-xs font-sans space-y-1">
                  <p>No passages pinned yet.</p>
                  <p className="text-[11px] text-zinc-600">
                    Click "Pin to Rail" on any excerpt to collect it for cross-synthesis.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {pinnedPassages.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleScrollToPassage(p.id)}
                      className="p-3.5 rounded-sm bg-zinc-900/60 border border-zinc-800 hover:border-[#e0d0ab]/50 transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span className="text-[#e0d0ab] font-bold">§ {p.id}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(p);
                          }}
                          className="text-zinc-500 hover:text-red-400"
                        >
                          <PinOff className="w-3 h-3" />
                        </button>
                      </div>

                      <p className="text-xs font-serif text-stone-300 line-clamp-3 italic">
                        "{p.text}"
                      </p>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.pyqCitations.map((c, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-mono bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-400"
                          >
                            {c.paper} {c.year}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
