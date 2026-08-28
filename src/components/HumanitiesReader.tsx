import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Pin,
  PinOff,
  Search,
  Check,
  Copy,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Columns3,
  Layers,
  Award,
  Calendar,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import canonData from '../data/humanities-canon.json';
import type { HumanitiesCanon, Thinker, Passage, PyqCitation } from '../types/humanities';
import ThinkerEngravingSvg from './ThinkerEngravingSvg';

const canon = canonData as HumanitiesCanon;

// Rich thinker metadata definitions
const THINKER_METADATA: Record<string, { era: string; workShort: string; workYear: number; voice: string; voiceCite?: { paper: string; year: number } }> = {
  ambedkar: {
    era: '1891–1956',
    workShort: 'Annihilation of Caste',
    workYear: 1936,
    voice: 'Democracy is not merely a form of Government. It is primarily a mode of associated living, of conjoint communicated experience.',
    voiceCite: { paper: 'GS-IV', year: 2021 }
  },
  gandhi: {
    era: '1869–1948',
    workShort: 'Hind Swaraj',
    workYear: 1909,
    voice: 'Passive resistance is a method of securing rights by personal suffering; it is the reverse of resistance by arms.',
    voiceCite: { paper: 'GS-IV', year: 2019 }
  },
  kant: {
    era: '1724–1804',
    workShort: 'Metaphysic of Morals',
    workYear: 1785,
    voice: 'Act only on that maxim whereby thou canst at the same time will that it should become a universal law.',
    voiceCite: { paper: 'GS-IV', year: 2022 }
  }
};

// Ambient floating particles coordinates
const AMBIENT_DOTS = [
  { left: '6%', top: '18%', size: 2.5, animDuration: 9 },
  { left: '14%', top: '62%', size: 1.5, animDuration: 11 },
  { left: '23%', top: '34%', size: 2, animDuration: 13 },
  { left: '31%', top: '78%', size: 1.5, animDuration: 8 },
  { left: '39%', top: '12%', size: 2.5, animDuration: 12 },
  { left: '47%', top: '55%', size: 1.5, animDuration: 10 },
  { left: '56%', top: '26%', size: 2, animDuration: 14 },
  { left: '63%', top: '70%', size: 1.5, animDuration: 9 },
  { left: '71%', top: '40%', size: 2, animDuration: 12 },
  { left: '79%', top: '15%', size: 1.5, animDuration: 11 },
  { left: '86%', top: '60%', size: 2, animDuration: 13 },
  { left: '93%', top: '33%', size: 1.5, animDuration: 10 }
];

const PAPERS = ['GS-I', 'GS-IV'];
const YEARS = [2023, 2022, 2021, 2020, 2019, 2015];

// Pure helper functions preserved for contract & unit test verification
export function togglePinPassage(currentPinned: Passage[], passage: Passage): Passage[] {
  const isAlreadyPinned = currentPinned.some((p) => p.id === passage.id);
  if (isAlreadyPinned) {
    return currentPinned.filter((p) => p.id !== passage.id);
  }
  return [...currentPinned, passage];
}

export function isPassagePinned(pinnedList: Passage[], passageId: string): boolean {
  return pinnedList.some((p) => p.id === passageId);
}

export default function HumanitiesReader() {
  // Navigation & View Mode
  const [mode, setMode] = useState<'hall' | 'read'>('hall');
  const [activeThinkerId, setActiveThinkerId] = useState<string>('ambedkar');
  const [readThinkerId, setReadThinkerId] = useState<string>('ambedkar');
  const [readPassageIdx, setReadPassageIdx] = useState<number>(0);

  // Bench / Pinned State
  const [pinnedPassages, setPinnedPassages] = useState<Passage[]>([]);
  const [benchOpen, setBenchOpen] = useState<boolean>(false);

  // Search & Lens Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPaper, setSelectedPaper] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // Interactive typewriter & UI state
  const [typedLength, setTypedLength] = useState<number>(0);
  const [copiedPassage, setCopiedPassage] = useState<boolean>(false);
  const [copiedSynthesis, setCopiedSynthesis] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Detect reduced motion preferences
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const activeThinker = useMemo(() => {
    return canon.thinkers.find((t) => t.id === activeThinkerId) || canon.thinkers[0];
  }, [activeThinkerId]);

  const readThinker = useMemo(() => {
    return canon.thinkers.find((t) => t.id === readThinkerId) || canon.thinkers[0];
  }, [readThinkerId]);

  const currentPassage = useMemo(() => {
    if (!readThinker || !readThinker.passages.length) return null;
    const safeIdx = Math.min(Math.max(0, readPassageIdx), readThinker.passages.length - 1);
    return readThinker.passages[safeIdx];
  }, [readThinker, readPassageIdx]);

  // Voice typewriter effect when attending a thinker
  useEffect(() => {
    const meta = THINKER_METADATA[activeThinkerId];
    if (!meta || !meta.voice) return;

    if (prefersReducedMotion) {
      setTypedLength(meta.voice.length);
      return;
    }

    setTypedLength(0);
    const speed = 18; // ms per char
    const interval = setInterval(() => {
      setTypedLength((prev) => {
        if (prev >= meta.voice.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [activeThinkerId, prefersReducedMotion]);

  // Match test for lens & search
  const matchesPassage = useCallback(
    (thinker: Thinker, passage: Passage) => {
      if (selectedPaper !== 'ALL') {
        const hasPaper = passage.pyqCitations.some((c) => c.paper === selectedPaper);
        if (!hasPaper) return false;
      }
      if (selectedYear !== 'ALL') {
        const hasYear = passage.pyqCitations.some((c) => String(c.year) === selectedYear);
        if (!hasYear) return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const textToSearch = (
          passage.text +
          ' ' +
          thinker.name +
          ' ' +
          thinker.workTitle +
          ' ' +
          passage.pyqCitations.map((c) => `${c.paper} ${c.year} ${c.note || ''}`).join(' ')
        ).toLowerCase();
        if (!textToSearch.includes(q)) return false;
      }
      return true;
    },
    [selectedPaper, selectedYear, searchQuery]
  );

  // Total matching passage count across the entire canon
  const totalMatchesCount = useMemo(() => {
    let count = 0;
    canon.thinkers.forEach((t) => {
      t.passages.forEach((p) => {
        if (matchesPassage(t, p)) count++;
      });
    });
    return count;
  }, [matchesPassage]);

  const hasActiveLens = selectedPaper !== 'ALL' || selectedYear !== 'ALL' || searchQuery.trim().length > 0;

  // Actions
  const handleAttendThinker = (thinkerId: string) => {
    if (activeThinkerId !== thinkerId) {
      setActiveThinkerId(thinkerId);
    }
  };

  const handleOpenReadingChamber = (thinkerId: string, passageIndex: number = 0) => {
    setReadThinkerId(thinkerId);
    setActiveThinkerId(thinkerId);
    setReadPassageIdx(passageIndex);
    setMode('read');
  };

  const handleExitReadingChamber = () => {
    setMode('hall');
  };

  const handleStepPassage = (delta: number) => {
    if (!readThinker || !readThinker.passages.length) return;
    const n = readThinker.passages.length;
    setReadPassageIdx((prev) => (prev + delta + n) % n);
  };

  const handleStepThinkerInHall = (delta: number) => {
    const idx = canon.thinkers.findIndex((t) => t.id === activeThinkerId);
    const n = canon.thinkers.length;
    const nextThinker = canon.thinkers[(idx + delta + n) % n];
    if (nextThinker) {
      setActiveThinkerId(nextThinker.id);
    }
  };

  const handleTogglePinCurrent = (passageToPin?: Passage) => {
    const target = passageToPin || currentPassage;
    if (!target) return;
    setPinnedPassages((prev) => togglePinPassage(prev, target));
  };

  const handleCopyPassage = () => {
    if (!currentPassage || !readThinker) return;
    const cite = currentPassage.pyqCitations[0];
    const citeTail = cite ? ` [UPSC ${cite.paper} ${cite.year}]` : '';
    const formatted = `"${currentPassage.text}"\n— ${readThinker.name}, ${readThinker.workTitle} (${readThinker.year})${citeTail}`;

    navigator.clipboard?.writeText(formatted).then(() => {
      setCopiedPassage(true);
      setTimeout(() => setCopiedPassage(false), 2000);
    });
  };

  const handleCopySynthesis = () => {
    if (pinnedPassages.length === 0) return;
    let out = '# Cross-Thinker Dialectic Synthesis (Tark Canon)\n\n';
    canon.thinkers.forEach((t) => {
      const items = t.passages.filter((p) => pinnedPassages.some((pinned) => pinned.id === p.id));
      if (!items.length) return;
      out += `## ${t.name} — ${t.workTitle} (${t.year})\n\n`;
      items.forEach((p) => {
        out += `> "${p.text}"\n`;
        p.pyqCitations.forEach((c) => {
          out += `> — UPSC ${c.paper} ${c.year}${c.note ? ` (${c.note})` : ''}\n`;
        });
        out += '\n';
      });
    });

    navigator.clipboard?.writeText(out).then(() => {
      setCopiedSynthesis(true);
      setTimeout(() => setCopiedSynthesis(false), 2000);
    });
  };

  const handleClearLens = () => {
    setSelectedPaper('ALL');
    setSelectedYear('ALL');
    setSearchQuery('');
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') target.blur();
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setBenchOpen((prev) => !prev);
        return;
      }

      if (mode === 'hall') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          handleStepThinkerInHall(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          handleStepThinkerInHall(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleOpenReadingChamber(activeThinkerId, 0);
        }
      } else if (mode === 'read') {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleExitReadingChamber();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          handleStepPassage(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          handleStepPassage(-1);
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handleTogglePinCurrent();
        } else if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          handleCopyPassage();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, activeThinkerId, readPassageIdx, currentPassage, readThinker]);

  return (
    <div className="relative min-h-[90vh] bg-radial-[120%_78%_at_50%_0%] from-[#0b3d78] via-[#072e63] to-[#041d40] text-stone-200 font-sans pb-32 overflow-x-hidden selection:bg-[#e0d0ab] selection:text-[#072e63]">
      {/* ── Ambient Constellation Particle Atmosphere ── */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
        {AMBIENT_DOTS.map((d, idx) => (
          <span
            key={idx}
            style={{
              position: 'absolute',
              left: d.left,
              top: d.top,
              width: `${d.size}px`,
              height: `${d.size}px`,
              borderRadius: '50%',
              backgroundColor: '#7fd4e0',
              opacity: 0.35,
              animation: prefersReducedMotion ? 'none' : `pulse ${d.animDuration}s ease-in-out infinite`
            }}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none bg-radial-[115%_80%_at_50%_30%] from-transparent via-[rgba(4,29,64,0)] to-[rgba(3,16,38,0.75)]"
      />

      {/* ══════════════════════════════════════════════════════════════════
          MODE 1: THE PHILOSOPHICAL CANON HALL OF THINKERS
          ══════════════════════════════════════════════════════════════════ */}
      {mode === 'hall' && (
        <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 sm:pt-12">
          {/* Header & Atmospheric Lens Masthead */}
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 mb-10">
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-[#0194a8]" />
                <span className="font-serif text-[11px] uppercase tracking-[0.2em] text-[#0194a8] font-bold">
                  The Philosophical Canon
                </span>
              </div>
              <h1 className="font-serif font-light text-3xl sm:text-4xl md:text-5xl text-[#e0d0ab] leading-[1.1] tracking-tight">
                Sit with the thinkers <br />
                <span className="italic text-[#9fb0c8]">the examiner keeps returning to.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#9fb0c8] leading-relaxed font-sans max-w-xl">
                Every line is a verbatim excerpt from the primary text, carrying the exact paper and year it has been drawn from. Give a thinker your attention — hover, tap or tab — and they speak first.
              </p>
            </div>

            {/* Interactive Lens & Search Panel */}
            <div className="flex flex-col gap-3 min-w-[280px] w-full lg:w-auto lg:max-w-md">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-[#0194a8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search the canon — text, thinker or citation (/)"
                  className="w-full pl-10 pr-8 py-2.5 bg-[#03122a]/80 border border-[#0194a8]/50 focus:border-[#e0d0ab] rounded-sm text-xs text-[#e0d0ab] placeholder-[#8fa2bd] outline-none transition-colors font-sans shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Lens Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#8fa2bd] mr-1">
                  Lens
                </span>

                <button
                  onClick={() => {
                    setSelectedPaper('ALL');
                    setSelectedYear('ALL');
                  }}
                  className={`px-2.5 py-1 rounded-sm font-mono text-[10.5px] transition-all cursor-pointer border ${
                    selectedPaper === 'ALL' && selectedYear === 'ALL'
                      ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab] font-bold shadow-sm'
                      : 'bg-[#03122a]/60 text-[#9fb0c8] border-[#0194a8]/35 hover:border-[#e0d0ab] hover:text-[#e0d0ab]'
                  }`}
                >
                  ALL
                </button>

                {PAPERS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPaper(selectedPaper === p ? 'ALL' : p)}
                    className={`px-2.5 py-1 rounded-sm font-mono text-[10.5px] transition-all cursor-pointer border ${
                      selectedPaper === p
                        ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab] font-bold shadow-sm'
                        : 'bg-[#03122a]/60 text-[#9fb0c8] border-[#0194a8]/35 hover:border-[#e0d0ab] hover:text-[#e0d0ab]'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                {YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(selectedYear === String(y) ? 'ALL' : String(y))}
                    className={`px-2.5 py-1 rounded-sm font-mono text-[10.5px] transition-all cursor-pointer border ${
                      selectedYear === String(y)
                        ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab] font-bold shadow-sm'
                        : 'bg-[#03122a]/60 text-[#9fb0c8] border-[#0194a8]/35 hover:border-[#e0d0ab] hover:text-[#e0d0ab]'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              {/* Lens Results Feedback */}
              <div className="flex items-center justify-between text-[10.5px] font-mono">
                <span className={hasActiveLens ? 'text-[#e0d0ab]' : 'text-[#8fa2bd]'}>
                  {totalMatchesCount} passages match active lens
                </span>
                {hasActiveLens && (
                  <button
                    onClick={handleClearLens}
                    className="text-[#9fb0c8] hover:text-[#e0d0ab] underline cursor-pointer"
                  >
                    ✕ Clear Lens
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Thinker Steles / Expanding Stele Row ── */}
          <div className="grid grid-cols-1 lg:flex lg:flex-row gap-4 sm:gap-6 items-stretch mb-10">
            {canon.thinkers.map((thinker) => {
              const isActive = activeThinkerId === thinker.id;
              const meta = THINKER_METADATA[thinker.id] || {
                era: 'Canonical Era',
                workShort: thinker.workTitle,
                workYear: thinker.year,
                voice: thinker.passages[0]?.text.slice(0, 120) || ''
              };

              // Count citations on this thinker
              const totalThinkerCites = thinker.passages.reduce(
                (sum, p) => sum + p.pyqCitations.length,
                0
              );

              return (
                <div
                  key={thinker.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleAttendThinker(thinker.id)}
                  onMouseEnter={() => handleAttendThinker(thinker.id)}
                  onFocus={() => handleAttendThinker(thinker.id)}
                  style={{
                    flex: isActive ? '3.5' : '1',
                    transition: 'flex 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s, border-color 0.3s'
                  }}
                  className={`relative p-5 sm:p-7 rounded-sm border cursor-pointer outline-none overflow-hidden flex flex-col justify-between transition-all select-none ${
                    isActive
                      ? 'bg-gradient-to-b from-[#072e63]/90 via-[#072e63]/70 to-[#041d40] border-[#e0d0ab]/80 shadow-[0_12px_40px_rgba(0,0,0,0.6)]'
                      : 'bg-[#041936]/60 border-[#136c99]/40 hover:border-[#0194a8]/70 hover:bg-[#072e63]/40'
                  }`}
                >
                  {/* Top Meta Badges */}
                  <div className="flex items-center justify-between w-full font-mono text-[9.5px] tracking-wider text-[#8fa2bd] mb-4">
                    <span>{meta.era}</span>
                    <span className="px-2 py-0.5 rounded bg-[#0b3d78]/60 border border-[#136c99]/50 text-[#e0d0ab]">
                      {totalThinkerCites} CITATION{totalThinkerCites !== 1 ? 'S' : ''}
                    </span>
                  </div>

                  {/* Thinker Portrait & Voice Block */}
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 my-auto">
                    {/* SVG Engraving Portrait */}
                    <div
                      className={`shrink-0 transition-all duration-500 ${
                        isActive ? 'w-32 h-32 sm:w-40 sm:h-40' : 'w-24 h-24 sm:w-28 sm:h-28 opacity-80'
                      }`}
                    >
                      <ThinkerEngravingSvg
                        thinkerId={thinker.id}
                        isHovered={isActive}
                        isSelected={isActive}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Thinker Info & Typed Voice */}
                    <div className="flex-1 min-w-0 text-center lg:text-left space-y-2">
                      <h2
                        className={`font-serif transition-colors ${
                          isActive ? 'text-2xl sm:text-3xl text-[#e0d0ab] font-normal' : 'text-lg sm:text-xl text-[#c8b998]'
                        }`}
                      >
                        {thinker.name}
                      </h2>
                      <div className="font-serif italic text-xs text-[#9fb0c8]">
                        {thinker.workTitle} · {thinker.year}
                      </div>

                      {/* Active Voice Box with Real-time Typing */}
                      {isActive && (
                        <div className="pt-3 space-y-4 animate-in fade-in duration-300">
                          <div className="flex items-start gap-2.5">
                            <span className="font-serif text-3xl sm:text-4xl text-[#e0d0ab]/40 leading-none select-none">
                              “
                            </span>
                            <p className="font-serif font-light text-xs sm:text-sm text-[#e8e0cf] leading-relaxed">
                              {meta.voice.slice(0, typedLength)}
                              <span
                                className={`inline-block w-1.5 h-3.5 bg-[#e0d0ab] ml-1 align-baseline ${
                                  prefersReducedMotion ? 'hidden' : 'animate-pulse'
                                }`}
                              />
                            </p>
                          </div>

                          {/* UPSC Citation Stamp with Animated Rule */}
                          {meta.voiceCite && (
                            <div className="flex items-center gap-3 pt-2">
                              <span className="w-8 h-px bg-gradient-to-r from-transparent to-[#e0d0ab]" />
                              <span className="px-2 py-0.5 rounded bg-[#e0d0ab] text-[#072e63] font-mono text-[10px] font-bold">
                                {meta.voiceCite.paper} {meta.voiceCite.year}
                              </span>
                              <span className="font-mono text-[9.5px] text-[#9fb0c8]">
                                drawn from this passage
                              </span>
                            </div>
                          )}

                          {/* Passage Ticks & Enter Action */}
                          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#136c99]/40 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#8fa2bd]">
                                Passages:
                              </span>
                              {thinker.passages.map((p, pIdx) => {
                                const cite = p.pyqCitations[0];
                                return (
                                  <button
                                    key={p.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenReadingChamber(thinker.id, pIdx);
                                    }}
                                    className="px-2 py-1 rounded bg-[#03122a]/80 hover:bg-[#e0d0ab] hover:text-[#072e63] border border-[#0194a8]/40 hover:border-[#e0d0ab] text-[#e0d0ab] font-mono text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                                  >
                                    P{pIdx + 1}
                                    {cite && (
                                      <span className="text-[8.5px] opacity-75 font-normal">
                                        ({cite.paper})
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenReadingChamber(thinker.id, 0);
                              }}
                              className="px-3.5 py-1.5 rounded bg-[#e0d0ab] hover:bg-[#e0d0ab]/90 text-[#072e63] font-mono text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                            >
                              <span>Enter Chamber</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {!isActive && (
                        <div className="pt-2">
                          <span className="font-mono text-[10px] text-[#8fa2bd] group-hover:text-[#e0d0ab] flex items-center justify-center lg:justify-start gap-1">
                            Click or Hover to Attend →
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Keyboard Hotkeys Telemetry */}
          <div className="flex items-center gap-4 flex-wrap font-mono text-[10px] text-[#8fa2bd] border-t border-[#136c99]/40 pt-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#041936] border border-[#136c99]/50 text-[#e0d0ab]">← →</kbd> Switch Thinker
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#041936] border border-[#136c99]/50 text-[#e0d0ab]">↵ Enter</kbd> Read in Full
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#041936] border border-[#136c99]/50 text-[#e0d0ab]">/</kbd> Search Canon
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[#041936] border border-[#136c99]/50 text-[#e0d0ab]">B</kbd> Toggle Bench
            </span>
            <span className="text-[#41536e] ml-auto">
              hover, tap or tab — all the same door
            </span>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODE 2: THE MONASTIC READING CHAMBER
          ══════════════════════════════════════════════════════════════════ */}
      {mode === 'read' && currentPassage && (
        <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-6 sm:pt-10">
          {/* Ambient Background Watermark of Active Thinker */}
          <div
            aria-hidden="true"
            className="absolute top-12 left-1/2 -translate-x-1/2 w-[520px] h-[520px] opacity-[0.06] pointer-events-none select-none"
          >
            <ThinkerEngravingSvg
              thinkerId={readThinker.id}
              isHovered={true}
              isSelected={true}
              className="w-full h-full"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start relative">
            {/* Sticky Left Spine: Thinker Nav & Legal Basis */}
            <aside className="hidden md:flex flex-col gap-2 w-44 shrink-0 sticky top-24 pt-2">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#8fa2bd] mb-2 font-bold">
                The Canon
              </span>
              {canon.thinkers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleOpenReadingChamber(t.id, 0)}
                  className={`p-2.5 rounded-sm text-left font-serif text-xs transition-all cursor-pointer border-l-2 ${
                    readThinker.id === t.id
                      ? 'border-[#e0d0ab] bg-[#072e63] text-[#e0d0ab] font-bold'
                      : 'border-transparent text-[#9fb0c8] hover:text-[#e0d0ab] hover:bg-[#072e63]/40'
                  }`}
                >
                  {t.name}
                </button>
              ))}

              <div className="my-4 h-px bg-[#136c99]/40" />

              <div className="font-mono text-[9px] text-[#8fa2bd] leading-relaxed">
                {readThinker.publicDomainBasis}
              </div>
            </aside>

            {/* Reading Center Article (Optimal 690px Reading Measure) */}
            <main className="flex-1 min-w-0 flex justify-center">
              <article className="w-full max-w-[690px] space-y-6">
                {/* Top Action & Passage Counter */}
                <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#136c99]/40">
                  <button
                    onClick={handleExitReadingChamber}
                    className="px-3 py-1.5 rounded border border-[#0194a8]/50 hover:border-[#e0d0ab] text-[#9fb0c8] hover:text-[#e0d0ab] font-mono text-[10px] tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>ESC — Back to Hall</span>
                  </button>

                  <span className="font-mono text-[10.5px] tracking-widest text-[#8fa2bd]">
                    PASSAGE {readPassageIdx + 1} OF {readThinker.passages.length}
                  </span>
                </div>

                {/* Reading Progress Line */}
                <div className="h-0.5 bg-[#136c99]/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#e0d0ab] transition-all duration-400 ease-out"
                    style={{ width: `${((readPassageIdx + 1) / readThinker.passages.length) * 100}%` }}
                  />
                </div>

                {/* Thinker Name & Work Header */}
                <div className="space-y-1 pt-2">
                  <h2 className="font-serif font-light text-3xl sm:text-4xl text-[#e0d0ab] tracking-tight">
                    {readThinker.name}
                  </h2>
                  <div className="font-serif italic text-sm text-[#9fb0c8]">
                    {readThinker.workTitle} · {readThinker.year}
                  </div>
                </div>

                {/* Primary Source Passage Text with Elegant Drop-Cap */}
                <div className="pt-2 font-serif font-light text-stone-100 text-sm sm:text-base leading-[1.9] text-pretty">
                  <span className="float-left font-serif font-bold text-4xl sm:text-5xl text-[#e0d0ab] mr-3 mt-1 leading-[0.8]">
                    {currentPassage.text.trim().charAt(0)}
                  </span>
                  {currentPassage.text.trim().slice(1)}
                </div>

                {/* WHERE THIS WAS ASKED — Verified UPSC Citation Dossier */}
                <div className="pt-6 border-t border-[#136c99]/50 space-y-3">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-[#8fa2bd] font-bold">
                    Where this was asked in UPSC
                  </div>

                  {currentPassage.pyqCitations.length > 0 ? (
                    currentPassage.pyqCitations.map((cite, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3.5 rounded bg-[#03122a]/70 border border-[#0194a8]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 rounded bg-[#e0d0ab] text-[#072e63] font-mono text-xs font-bold">
                            UPSC {cite.paper} · {cite.year}
                          </span>
                          <span className="text-xs text-[#9fb0c8] leading-relaxed">
                            {cite.note || 'Tested conceptual anchor in UPSC examination cycle.'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded bg-[#03122a]/40 border border-[#136c99]/30 text-xs italic text-[#8fa2bd]">
                      Foundational philosophical text — carried for conceptual rigor and synthesis drafting.
                    </div>
                  )}
                </div>

                {/* Action Bar: Pin, Copy, Prev, Next */}
                <div className="flex items-center justify-between gap-3 pt-6 border-t border-[#136c99]/50 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePinCurrent()}
                      className={`px-3.5 py-2 rounded-sm font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isPassagePinned(pinnedPassages, currentPassage.id)
                          ? 'bg-[#e0d0ab] text-[#072e63] border-[#e0d0ab]'
                          : 'bg-[#03122a] text-[#c8b998] border-[#0194a8]/50 hover:border-[#e0d0ab] hover:text-[#e0d0ab]'
                      }`}
                    >
                      {isPassagePinned(pinnedPassages, currentPassage.id) ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Pinned to Bench</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-3.5 h-3.5" />
                          <span>Pin to Bench (P)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCopyPassage}
                      className="px-3.5 py-2 rounded-sm font-mono text-xs text-[#c8b998] border border-[#0194a8]/50 hover:border-[#e0d0ab] hover:text-[#e0d0ab] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedPassage ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy (C)</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => handleStepPassage(-1)}
                      className="px-3 py-2 rounded-sm font-mono text-xs text-[#9fb0c8] border border-[#0194a8]/50 hover:border-[#e0d0ab] hover:text-[#e0d0ab] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>
                    <button
                      onClick={() => handleStepPassage(1)}
                      className="px-3 py-2 rounded-sm font-mono text-xs text-[#9fb0c8] border border-[#0194a8]/50 hover:border-[#e0d0ab] hover:text-[#e0d0ab] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            </main>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          THE BENCH: FIXED BOTTOM BAR & DIALECTIC WORKBENCH DRAWER
          ══════════════════════════════════════════════════════════════════ */}
      <div className="fixed left-0 right-0 bottom-0 z-40">
        {/* Sliding Bench Drawer */}
        <AnimatePresence>
          {benchOpen && (
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="max-h-[65vh] overflow-y-auto bg-[#03122a]/95 backdrop-blur-xl border-t border-[#e0d0ab]/30 p-6 shadow-2xl space-y-6"
            >
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#136c99]/40">
                  <div>
                    <h3 className="font-serif text-xl text-[#e0d0ab] font-normal flex items-center gap-2">
                      <Columns3 className="w-5 h-5 text-[#0194a8]" />
                      The Dialectic Bench
                    </h3>
                    <p className="text-xs text-[#9fb0c8] mt-1 max-w-xl">
                      Passages pinned from different thinkers line up here side by side — the exact multidimensional structure demanded by high-yield GS-IV ethics and essay answers.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {pinnedPassages.length > 0 && (
                      <button
                        onClick={handleCopySynthesis}
                        className="px-4 py-2 rounded-sm bg-[#e0d0ab] hover:bg-[#e0d0ab]/90 text-[#072e63] font-mono text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        {copiedSynthesis ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Synthesis Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Full Synthesis</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => setBenchOpen(false)}
                      className="px-3.5 py-2 rounded-sm border border-[#0194a8]/50 hover:border-[#e0d0ab] text-[#c8b998] hover:text-[#e0d0ab] font-mono text-xs transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Multi-Column Dialectic Comparison */}
                {pinnedPassages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {canon.thinkers.map((thinker) => {
                      const thinkerPinned = thinker.passages.filter((p) =>
                        pinnedPassages.some((pinned) => pinned.id === p.id)
                      );
                      if (!thinkerPinned.length) return null;

                      return (
                        <div
                          key={thinker.id}
                          className="border-t-2 border-[#e0d0ab] pt-3 bg-[#072e63]/40 p-4 rounded-sm border border-[#136c99]/40 space-y-3"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-serif font-bold text-sm text-[#e0d0ab]">
                              {thinker.name}
                            </span>
                            <span className="font-serif italic text-[11px] text-[#9fb0c8]">
                              {thinker.workTitle}
                            </span>
                          </div>

                          <div className="space-y-3">
                            {thinkerPinned.map((p) => (
                              <div
                                key={p.id}
                                className="p-3 rounded bg-[#03122a]/80 border border-[#0194a8]/35 space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                                  <span className="text-[#e0d0ab] font-bold">
                                    {p.pyqCitations[0]
                                      ? `UPSC ${p.pyqCitations[0].paper} ${p.pyqCitations[0].year}`
                                      : 'Foundational'}
                                  </span>
                                  <button
                                    onClick={() => handleTogglePinCurrent(p)}
                                    className="text-[#9fb0c8] hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <PinOff className="w-3 h-3" />
                                    <span>Unpin</span>
                                  </button>
                                </div>

                                <p className="font-serif font-light text-stone-300 leading-relaxed text-[12.5px] line-clamp-4">
                                  "{p.text}"
                                </p>

                                <div className="pt-2 flex justify-end">
                                  <button
                                    onClick={() => {
                                      const pIdx = thinker.passages.findIndex((item) => item.id === p.id);
                                      handleOpenReadingChamber(thinker.id, Math.max(0, pIdx));
                                      setBenchOpen(false);
                                    }}
                                    className="font-mono text-[10px] text-[#0194a8] hover:text-[#e0d0ab] flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Open in full →</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-[#0194a8]/40 rounded-sm space-y-2">
                    <p className="font-serif text-sm text-[#c8b998]">
                      Nothing on the Dialectic Bench yet.
                    </p>
                    <p className="text-xs text-[#9fb0c8] max-w-md mx-auto leading-relaxed">
                      Pin passages from different thinkers while in reading mode (press <kbd className="px-1 py-0.5 rounded bg-[#041936] text-[#e0d0ab] font-mono text-[10px]">P</kbd>) to compare them side by side for comparative synthesis.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Floating Bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-[#020d20]/95 backdrop-blur-md border-t border-[#136c99]/55">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setBenchOpen((prev) => !prev)}
              className="flex items-center gap-2 cursor-pointer font-mono text-xs text-[#e0d0ab] hover:underline"
            >
              <Columns3 className="w-4 h-4 text-[#0194a8]" />
              <span className="font-bold tracking-wider">BENCH</span>
              <span className="px-2 py-0.5 rounded bg-[#e0d0ab] text-[#072e63] font-bold text-[10.5px]">
                {pinnedPassages.length}
              </span>
            </button>

            <span className="h-4 w-px bg-[#136c99]/60" />

            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-xl">
              {pinnedPassages.length > 0 ? (
                pinnedPassages.map((p) => (
                  <span
                    key={p.id}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#072e63]/60 border border-[#e0d0ab]/30 text-[#c8b998] whitespace-nowrap"
                  >
                    {p.id}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-[#8fa2bd]">
                  Pin passages to start comparing thinkers — press <kbd className="font-mono text-[#e0d0ab]">P</kbd> while reading
                </span>
              )}
            </div>
          </div>

          <div className="font-mono text-[10px] text-[#8fa2bd] tracking-wider hidden md:block">
            TARK CANON v2.5 · EMPIRICAL HUMANITIES
          </div>
        </div>
      </div>
    </div>
  );
}
