import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Pin,
  Search,
  Filter,
  Layers,
  Sparkles,
  Calendar,
  Award,
  Columns,
  HelpCircle,
  FileText,
  Compass,
} from 'lucide-react';
import canonData from '../data/humanities-canon.json';
import type { HumanitiesCanon, Thinker, Passage, PyqCitation } from '../types/humanities';
import { THINKER_ENGRAVINGS, type ThinkerEngraving } from '../data/thinker-engravings';
import ThinkerPortraitCard from './ThinkerPortraitCard';
import PassageCard from './PassageCard';
import DialecticWorkbench from './DialecticWorkbench';

const canon = canonData as HumanitiesCanon;

// Exported pure helper functions for unit test verification
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
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');

  const passageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedThinker =
    canon.thinkers.find((t) => t.id === selectedThinkerId) || canon.thinkers[0];

  const selectedEngraving =
    THINKER_ENGRAVINGS[selectedThinkerId] || THINKER_ENGRAVINGS['ambedkar'];

  const handleTogglePin = (passage: Passage) => {
    setPinnedPassages((prev) => togglePinPassage(prev, passage));
  };

  const handleClearPinned = () => {
    setPinnedPassages([]);
  };

  const handleScrollToPassage = (passageId: string) => {
    // If the passage belongs to another thinker, select that thinker first
    const ownerThinker = canon.thinkers.find((t) =>
      t.passages.some((p) => p.id === passageId)
    );
    if (ownerThinker && ownerThinker.id !== selectedThinkerId) {
      setSelectedThinkerId(ownerThinker.id);
    }

    setHighlightedPassageId(passageId);
    setTimeout(() => {
      const elem = passageRefs.current[passageId];
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    setTimeout(() => {
      setHighlightedPassageId((prev) => (prev === passageId ? null : prev));
    }, 2800);
  };

  // Collect all unique exam papers and years across the canon
  const { papers, years } = useMemo(() => {
    const paperSet = new Set<string>();
    const yearSet = new Set<number>();
    canon.thinkers.forEach((t) => {
      t.passages.forEach((p) => {
        p.pyqCitations.forEach((c) => {
          paperSet.add(c.paper);
          yearSet.add(c.year);
        });
      });
    });
    return {
      papers: Array.from(paperSet).sort(),
      years: Array.from(yearSet).sort((a, b) => b - a),
    };
  }, []);

  // Filter passages based on active search, paper, and year
  const filteredPassages = useMemo(() => {
    if (!selectedThinker) return [];

    return selectedThinker.passages.filter((passage) => {
      // Paper filter
      if (selectedPaperFilter !== 'ALL') {
        const matchesPaper = passage.pyqCitations.some(
          (c) => c.paper === selectedPaperFilter
        );
        if (!matchesPaper) return false;
      }

      // Year filter
      if (selectedYearFilter !== 'ALL') {
        const matchesYear = passage.pyqCitations.some(
          (c) => String(c.year) === selectedYearFilter
        );
        if (!matchesYear) return false;
      }

      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = passage.text.toLowerCase().includes(q);
        const citationMatch = passage.pyqCitations.some(
          (c) =>
            c.paper.toLowerCase().includes(q) ||
            String(c.year).includes(q) ||
            (c.note && c.note.toLowerCase().includes(q))
        );
        return textMatch || citationMatch;
      }

      return true;
    });
  }, [selectedThinker, selectedPaperFilter, selectedYearFilter, searchQuery]);

  // Compute total citation counts per thinker
  const thinkerCitationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    canon.thinkers.forEach((t) => {
      let count = 0;
      t.passages.forEach((p) => {
        count += p.pyqCitations.length;
      });
      counts[t.id] = count;
    });
    return counts;
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans pb-20 px-3 sm:px-6">
      {/* ── Editorial Header ── */}
      <div className="relative border border-zinc-800 bg-zinc-950 p-6 md:p-8 rounded-sm shadow-xl space-y-4">
        {/* Precision corner brackets */}
        <span className="absolute top-1.5 left-1.5 text-xs font-mono text-zinc-700 leading-none select-none">┌</span>
        <span className="absolute top-1.5 right-1.5 text-xs font-mono text-zinc-700 leading-none select-none">┐</span>
        <span className="absolute bottom-1.5 left-1.5 text-xs font-mono text-zinc-700 leading-none select-none">└</span>
        <span className="absolute bottom-1.5 right-1.5 text-xs font-mono text-zinc-700 leading-none select-none">┘</span>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-widest bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/20">
                The Philosophical Canon
              </span>
              <span className="text-zinc-500 text-xs font-sans">
                Primary Thinkers & UPSC PYQ Examination Nexus
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-100 tracking-tight">
              Primary Works of Political & Moral Philosophy
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 font-sans max-w-3xl leading-relaxed">
              Read authentic, uncurated excerpts from the seminal texts behind the UPSC CSE syllabus. Each passage is indexed directly to historical question vectors in GS-IV (Ethics) and GS-I (Society/History).
            </p>
          </div>

          {/* Telemetry Counter */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-sans text-zinc-300 bg-zinc-900/90 px-3.5 py-2.5 border border-zinc-800 rounded-sm">
              <BookOpen className="w-4 h-4 text-[#0194a8]" />
              <span>Thinkers Indexed: </span>
              <strong className="font-mono text-[#e0d0ab]">{canon.thinkers.length}</strong>
            </div>

            <div className="flex items-center gap-2 text-xs font-sans text-zinc-300 bg-zinc-900/90 px-3.5 py-2.5 border border-zinc-800 rounded-sm">
              <Pin className="w-4 h-4 text-[#e0d0ab]" />
              <span>Workbench Rail: </span>
              <strong className="font-mono text-[#e0d0ab]">{pinnedPassages.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── The Living Pantheon: Thinker Engraving Cards ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#e0d0ab]" />
            <h2 className="font-serif font-bold text-sm text-stone-200">
              The Living Pantheon
            </h2>
          </div>
          <span className="text-[11px] font-sans text-zinc-500">
            Hover, tap or focus to hear thesis resonance · Click to read
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          {canon.thinkers.map((t) => {
            const engraving = THINKER_ENGRAVINGS[t.id];
            if (!engraving) return null;
            return (
              <ThinkerPortraitCard
                key={t.id}
                engraving={engraving}
                isSelected={selectedThinkerId === t.id}
                onSelect={() => setSelectedThinkerId(t.id)}
                citationCount={thinkerCitationCounts[t.id] || 0}
              />
            );
          })}
        </div>
      </div>

      {/* ── Search, Examination Vector Filters, & Primary Reader Stage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Active Work Info & Passages List */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Thinker Editorial Masthead */}
          {selectedThinker && selectedEngraving && (
            <div className="relative p-5 rounded-sm bg-zinc-900/40 border border-zinc-800 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-850 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#c8b998]">
                    Selected Primary Work
                  </span>
                  <h2 className="font-serif font-bold text-lg text-stone-100">
                    "{selectedThinker.workTitle}" ({selectedThinker.year})
                  </h2>
                </div>

                <span className="text-[11px] font-sans text-zinc-400">
                  {selectedEngraving.title}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#e0d0ab] font-medium">Syllabus Nexus:</span>
                  <span>{selectedEngraving.syllabusNexus}</span>
                </div>

                <span className="text-[10px] font-mono text-zinc-500">
                  {selectedThinker.publicDomainBasis}
                </span>
              </div>
            </div>
          )}

          {/* Search & Exam Vector Filter Controls */}
          <div className="p-4 rounded-sm bg-zinc-950/80 border border-zinc-800 space-y-3">
            {/* Live Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across passage arguments, keywords, or examiner citations..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 focus:border-[#e0d0ab]/60 text-stone-100 placeholder-zinc-500 rounded-sm text-xs font-sans outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-stone-200"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Chips: Papers & Years */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
              {/* Paper filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-500 font-medium text-[11px] mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-[#0194a8]" />
                  Paper:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPaperFilter('ALL')}
                  className={`px-2 py-0.5 rounded-sm text-[11px] font-sans font-medium transition-colors ${
                    selectedPaperFilter === 'ALL'
                      ? 'bg-[#e0d0ab] text-zinc-950 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-stone-200 border border-zinc-800'
                  }`}
                >
                  All
                </button>
                {papers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPaperFilter(p)}
                    className={`px-2 py-0.5 rounded-sm text-[11px] font-mono font-medium transition-colors ${
                      selectedPaperFilter === p
                        ? 'bg-[#e0d0ab] text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-stone-200 border border-zinc-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Year filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-zinc-500 font-medium text-[11px] mr-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#0194a8]" />
                  Year:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedYearFilter('ALL')}
                  className={`px-2 py-0.5 rounded-sm text-[11px] font-sans font-medium transition-colors ${
                    selectedYearFilter === 'ALL'
                      ? 'bg-[#e0d0ab] text-zinc-950 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-stone-200 border border-zinc-800'
                  }`}
                >
                  All
                </button>
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setSelectedYearFilter(String(y))}
                    className={`px-2 py-0.5 rounded-sm text-[11px] font-mono font-medium transition-colors ${
                      selectedYearFilter === String(y)
                        ? 'bg-[#e0d0ab] text-zinc-950 font-bold'
                        : 'bg-zinc-900 text-zinc-400 hover:text-stone-200 border border-zinc-800'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Passages List */}
          <div className="space-y-5">
            {filteredPassages.length === 0 ? (
              <div className="p-12 text-center rounded-sm bg-zinc-950 border border-zinc-850 space-y-2">
                <p className="font-serif text-base text-stone-200">
                  No passages match your active filters
                </p>
                <p className="text-xs font-sans text-zinc-400">
                  Try clearing the search query or resetting the examination paper filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedPaperFilter('ALL');
                    setSelectedYearFilter('ALL');
                  }}
                  className="mt-3 px-3 py-1.5 rounded-sm bg-zinc-900 hover:bg-zinc-800 text-[#e0d0ab] text-xs font-sans font-semibold border border-zinc-800 cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              filteredPassages.map((passage, pIdx) => {
                const isPinned = isPassagePinned(pinnedPassages, passage.id);
                const isHighlighted = highlightedPassageId === passage.id;

                return (
                  <PassageCard
                    key={passage.id}
                    passage={passage}
                    thinker={selectedThinker}
                    index={pIdx}
                    isPinned={isPinned}
                    isHighlighted={isHighlighted}
                    onTogglePin={handleTogglePin}
                    searchQuery={searchQuery}
                    forwardRef={(el) => {
                      passageRefs.current[passage.id] = el;
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Dialectic Workbench & Cross-Thinker Rail */}
        <div className="lg:col-span-4">
          <DialecticWorkbench
            pinnedPassages={pinnedPassages}
            thinkers={canon.thinkers}
            onTogglePin={handleTogglePin}
            onClearAll={handleClearPinned}
            onScrollToPassage={handleScrollToPassage}
          />
        </div>
      </div>
    </div>
  );
}
