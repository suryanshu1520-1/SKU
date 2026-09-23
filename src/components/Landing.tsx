import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Swords, Globe, Layers, BookOpen, Sparkles, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import DiagnosticPreview from './DiagnosticPreview';
import MobileLanding from './MobileLanding';
import type { CandidatePreferences } from '../types';

interface LandingProps {
  onNavigateArena: () => void;
  onNavigateTracker: () => void;
  onNavigateProfile: () => void;
  onNavigateLibrary?: () => void;
  onNavigateHumanities?: () => void;
  onNavigateObservatory?: () => void;
  onNavigateLeaderboard?: () => void;
  onNavigateManifesto?: () => void;
  onNavigateLegal?: (type: 'privacy' | 'terms' | 'refund') => void;
  candidatePreferences?: CandidatePreferences;
}

interface SeatCountData {
  max_capacity: number;
  claimed_seats: number;
  remaining_seats: number;
}

export default function Landing({
  onNavigateArena,
  onNavigateTracker,
  onNavigateProfile,
  onNavigateLibrary,
  onNavigateHumanities,
  onNavigateObservatory,
  onNavigateLeaderboard,
  onNavigateManifesto,
  onNavigateLegal,
  candidatePreferences,
}: LandingProps) {
  const [seatData, setSeatData] = useState<SeatCountData | null>(null);

  // Fetch live Postgres-locked seat data
  useEffect(() => {
    async function fetchSeats() {
      try {
        const { data, error } = await supabase.rpc('get_available_seat_count');
        if (!error && data) {
          setSeatData(data as SeatCountData);
        }
      } catch (e) {
        console.warn('Could not load live seat count:', e);
      }
    }
    fetchSeats();
  }, []);

  const claimedCount = (seatData?.claimed_seats && seatData.claimed_seats > 0) ? seatData.claimed_seats : 137;
  const maxCapacity = seatData?.max_capacity ?? 500;
  const remainingCount = maxCapacity - claimedCount;

  const scrollToDiagnostic = () => {
    const el = document.getElementById('diagnostic-embed');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const dispatchRailPeek = (id: string | null) => {
    window.dispatchEvent(new CustomEvent('tark:rail-peek', { detail: { id } }));
  };

  // 100-cell question palette for Test Arena card preview
  const PALETTE_MARKED = [7, 19, 23, 31, 40];
  const arenaPalette = Array.from({ length: 100 }, (_, i) => {
    let status: 'answered' | 'review' | 'current' | 'unvisited' = 'unvisited';
    if (i < 46 && !PALETTE_MARKED.includes(i)) status = 'answered';
    else if (PALETTE_MARKED.includes(i)) status = 'review';
    else if (i === 46) status = 'current';
    return { id: i, status };
  });

  return (
    <div className="w-full min-h-screen bg-[#050b1a] text-[#f4ecd8] font-serif relative overflow-x-hidden selection:bg-[#e0d0ab] selection:text-[#050b1a]">
      {/* ── Ambient Radial Glows ── */}
      <div
        className="pointer-events-none absolute -top-[400px] left-1/2 -translate-x-1/2 w-[1600px] h-[900px] z-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(14,44,92,0.85) 0%, rgba(10,33,72,0.4) 35%, rgba(7,22,48,0.0) 65%)',
        }}
      />
      <div
        className="pointer-events-none absolute top-[200px] -right-[200px] w-[800px] h-[800px] z-0"
        style={{
          background: 'radial-gradient(circle, rgba(224,208,171,0.06) 0%, rgba(224,208,171,0.0) 60%)',
        }}
      />

      {/* ── Mobile Viewport Switch (< 768px) ── */}
      <div className="block md:hidden relative z-10">
        <MobileLanding
          onNavigateArena={onNavigateArena}
          onNavigateTracker={onNavigateTracker}
          onNavigateProfile={onNavigateProfile}
          onNavigateLibrary={onNavigateLibrary}
          onNavigateHumanities={onNavigateHumanities}
          onNavigateObservatory={onNavigateObservatory}
          onNavigateLeaderboard={onNavigateLeaderboard}
          onNavigateManifesto={onNavigateManifesto}
          onNavigateLegal={onNavigateLegal}
          candidatePreferences={candidatePreferences}
          seatData={seatData}
        />
      </div>

      {/* ── Desktop & Tablet Viewport (>= 768px) ── */}
      {/* Note: In DesignV3, the rail IS the desktop chrome. No duplicate top bar! */}
      <div className="hidden md:block relative z-10 w-full max-w-[1366px] mx-auto">
        
        {/* ═══════════════════════════════════════════════════════════════════
             SECTION 1: FOLD (Hero Promise + Diagnostic Preview)
             ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="h-promise" className="relative px-10 lg:px-16 pt-16 lg:pt-20 pb-16">
          <div aria-hidden="true" className="absolute left-0 top-0 w-[1100px] h-[720px] bg-[radial-gradient(ellipse_70%_70%_at_0%_0%,rgba(14,44,92,0.72)_0%,rgba(10,33,72,0.28)_45%,rgba(5,11,26,0)_75%)] pointer-events-none" />

          <motion.h1
            id="h-promise"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            className="m-0 max-w-[1120px] font-sans font-extrabold text-[58px] lg:text-[76px] leading-[1.0] tracking-[-0.035em] text-[#f4ecd8] text-balance"
          >
            Diagnose your UPSC readiness and improve with <span className="text-[#e0d0ab]">evidence.</span>
          </motion.h1>

          <div className="relative mt-11 grid grid-cols-1 lg:grid-cols-[464px_minmax(0,1fr)] gap-12 lg:gap-14 items-start">
            {/* Left: Lead + CTAs + 3-tier Proof DL */}
            <div>
              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
                className="m-0 max-w-[440px] font-serif text-[19px] lg:text-[20px] leading-[1.5] text-[#b5c1d1]"
              >
                Timed Prelims questions with real negative marking, scored on our server. Every miss comes back explained.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="mt-8 flex items-center gap-7"
              >
                <button
                  type="button"
                  onClick={scrollToDiagnostic}
                  className="cta-primary inline-flex items-center gap-3.5 py-1.5 pl-6 pr-1.5 bg-[#e0d0ab] text-[#050b1a] font-sans font-semibold text-[15px] rounded-full shadow-[0_12px_36px_-16px_rgba(224,208,171,0.5)] cursor-pointer"
                >
                  <span>Start diagnostic</span>
                  <span className="w-10 h-10 rounded-full bg-[rgba(5,11,26,0.12)] inline-flex items-center justify-center">
                    <svg className="cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onNavigateTracker}
                  className="text-link font-sans text-[15px] font-medium text-[#b5c1d1] hover:text-[#f0dfb8] cursor-pointer"
                >
                  Explore the daily brief
                </button>
              </motion.div>

              {/* 3-tier Proof DL */}
              <dl className="m-0 mt-12 pt-6 border-t border-[rgba(224,208,171,0.10)] grid grid-cols-[112px_minmax(0,1fr)] column-gap-[18px] row-gap-[14px] items-baseline">
                <dt className="font-sans text-[15px] font-semibold text-[#e0d0ab] tabular-nums">2,063</dt>
                <dd className="m-0 font-serif text-[15px] leading-[1.5] text-[#b5c1d1]">
                  UPSC Prelims questions from 2000 to 2025, each tagged with its year and paper.
                </dd>
                <dt className="font-sans text-[15px] font-semibold text-[#e0d0ab]">Every miss</dt>
                <dd className="m-0 font-serif text-[15px] leading-[1.5] text-[#b5c1d1]">
                  comes back with why the right option is right.
                </dd>
                <dt className="font-sans text-[15px] font-semibold text-[#e0d0ab] tabular-nums">10 a day</dt>
                <dd className="m-0 font-serif text-[15px] leading-[1.5] text-[#b5c1d1]">
                  Daily Brief dispatches from PIB and Cabinet releases, every sentence cited.
                </dd>
              </dl>
            </div>

            {/* Right: Authentic Prelims 2001 Question 39 Embedded Diagnostic */}
            <div id="diagnostic-embed" className="w-full">
              <DiagnosticPreview onLaunchFullArena={onNavigateArena} />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
             SECTION 2: LOOP (What happens after you answer)
             ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="h-loop" className="px-10 lg:px-16 py-24 border-t border-[rgba(224,208,171,0.06)]">
          <h2 id="h-loop" className="m-0 font-sans font-extrabold text-[44px] lg:text-[52px] leading-[1.04] tracking-[-0.03em] text-[#f4ecd8]">
            What happens after you answer.
          </h2>
          <p className="mt-3.5 m-0 max-w-[600px] font-serif text-[18px] leading-[1.55] text-[#b5c1d1]">
            The same four steps run after every question you answer in Tark.
          </p>

          <div className="relative mt-14">
            {/* Horizontal progress connector line */}
            <div aria-hidden="true" className="absolute left-1 right-0 top-1 h-[1px] bg-gradient-to-r from-[rgba(224,208,171,0.45)] to-[rgba(224,208,171,0.18)] pointer-events-none" />

            <ol className="list-none m-0 p-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.75fr)_minmax(0,1fr)_minmax(0,1fr)] gap-8 relative">
              {/* Step 1: Practice */}
              <li>
                <span aria-hidden="true" className="block w-[9px] h-[9px] rounded-full bg-[#050b1a] border-2 border-[#e0d0ab] box-border" />
                <h3 className="my-4 font-sans font-bold text-[24px] tracking-[-0.02em] text-[#f4ecd8]">
                  Practice
                </h3>
                <p className="m-0 font-serif text-[15px] leading-[1.55] text-[#b5c1d1]">
                  You answer under the clock, with negative marking on.
                </p>
                <div className="mt-4.5 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#e0d0ab] rounded-[10px] font-serif text-[14px] text-[#f4ecd8]">
                    <span className="font-mono text-[11px] text-[#e0d0ab]">b</span>Second
                  </span>
                  <span className="font-mono text-[12px] text-[#7d8ca4] tabular-nums">00:48</span>
                </div>
              </li>

              {/* Step 2: Diagnose */}
              <li>
                <span aria-hidden="true" className="block w-[9px] h-[9px] rounded-full bg-[#e0d0ab] box-border" />
                <h3 className="my-4 font-sans font-bold text-[24px] tracking-[-0.02em] text-[#f4ecd8]">
                  Diagnose
                </h3>
                <div className="p-1.5 rounded-[18px] bg-gradient-to-br from-[rgba(224,208,171,0.10)] to-[rgba(224,208,171,0.02)] border border-[rgba(224,208,171,0.14)] shadow-[0_28px_70px_-30px_rgba(1,6,18,0.85)]">
                  <div className="bg-[#071630] rounded-[12px] border border-[rgba(224,208,171,0.07)] p-5 lg:p-6">
                    <div className="flex items-baseline justify-between mb-3.5">
                      <span className="font-sans text-[12px] font-semibold text-[#7d8ca4]">Sample result</span>
                      <span className="font-mono text-[11px] text-[#7d8ca4]">Prelims 2001, Q39</span>
                    </div>
                    <div className="flex items-baseline gap-3.5">
                      <span className="font-sans font-extrabold text-[44px] tracking-[-0.03em] leading-none text-[#f87171] tabular-nums">−0.66</span>
                      <span className="font-sans font-semibold text-[14px] text-[#f87171]">Incorrect</span>
                    </div>
                    <p className="mt-4 m-0 font-serif text-[15px] leading-[1.55] text-[#f4ecd8]">
                      Correct answer: <strong className="font-semibold text-[#34d399]">(a) First</strong>.
                    </p>
                    <p className="mt-2 m-0 font-serif text-[14.5px] leading-[1.6] text-[#b5c1d1]">
                      The First Schedule lists every State and Union Territory, so a new State means amending it. The Second Schedule sets salaries and allowances.
                    </p>
                  </div>
                </div>
              </li>

              {/* Step 3: Review */}
              <li>
                <span aria-hidden="true" className="block w-[9px] h-[9px] rounded-full bg-[#050b1a] border-2 border-[#e0d0ab] box-border" />
                <h3 className="my-4 font-sans font-bold text-[24px] tracking-[-0.02em] text-[#f4ecd8]">
                  Review
                </h3>
                <p className="m-0 font-serif text-[15px] leading-[1.55] text-[#b5c1d1]">
                  The miss joins your subject record, so patterns show across sessions.
                </p>
                <p className="mt-4.5 m-0 font-sans text-[14px] font-semibold text-[#f4ecd8]">
                  Polity <span className="ml-2 font-mono font-normal text-[12px] text-[#7d8ca4] tabular-nums">6 of 10 this week</span>
                </p>
              </li>

              {/* Step 4: Improve */}
              <li>
                <span aria-hidden="true" className="block w-[9px] h-[9px] rounded-full bg-[#050b1a] border-2 border-[#e0d0ab] box-border" />
                <h3 className="my-4 font-sans font-bold text-[24px] tracking-[-0.02em] text-[#f4ecd8]">
                  Improve
                </h3>
                <p className="m-0 font-serif text-[15px] leading-[1.55] text-[#b5c1d1]">
                  You leave with one next set to practise, not a wall of charts.
                </p>
                <button
                  type="button"
                  onClick={onNavigateArena}
                  className="mt-4.5 inline-block px-4 py-2 border border-[rgba(224,208,171,0.32)] hover:border-[#e0d0ab] rounded-full font-sans text-[13px] font-semibold text-[#e0d0ab] transition-colors cursor-pointer"
                >
                  Practise Polity
                </button>
              </li>
            </ol>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
             SECTION 3: SIX ROOMS (Mirrors the Rail with Alt Hotkeys)
             ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="h-rooms" className="px-10 lg:px-16 py-24 border-t border-[rgba(224,208,171,0.06)]">
          <h2 id="h-rooms" className="m-0 font-sans font-extrabold text-[44px] lg:text-[52px] leading-[1.04] tracking-[-0.03em] text-[#f4ecd8]">
            Six rooms, one keystroke each.
          </h2>
          <p className="mt-3.5 m-0 max-w-[620px] font-serif text-[18px] leading-[1.55] text-[#b5c1d1]">
            Each room sits in the rail on your left, in the same order. Press Alt with its number to jump straight there.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* ROOM 1: Test Arena (Spans 2 cols, 2 rows) */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateArena}
              onKeyDown={(e) => e.key === 'Enter' && onNavigateArena()}
              onMouseEnter={() => dispatchRailPeek('arena')}
              onMouseLeave={() => dispatchRailPeek(null)}
              onFocus={() => dispatchRailPeek('arena')}
              onBlur={() => dispatchRailPeek(null)}
              className="room-cell md:col-span-2 md:row-span-2 p-1.5 rounded-[20px] bg-gradient-to-br from-[rgba(224,208,171,0.08)] to-[rgba(224,208,171,0.015)] border border-[rgba(224,208,171,0.12)] hover:border-[rgba(224,208,171,0.38)] cursor-pointer outline-none transition-all"
            >
              <div className="h-full bg-gradient-to-b from-[#0a2148] to-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.07)] p-7 lg:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <Swords className="w-5.5 h-5.5 text-[#e0d0ab]" strokeWidth={1.75} />
                    <h3 className="m-0 font-sans font-bold text-[28px] lg:text-[30px] tracking-[-0.025em] text-[#f4ecd8]">
                      Test Arena
                    </h3>
                    <span className="ml-auto inline-flex gap-1">
                      <kbd className="inline-flex items-center justify-center h-[22px] px-2 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] bg-[rgba(224,208,171,0.03)] font-mono text-[11px] text-[#b5c1d1]">Alt</kbd>
                      <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] bg-[rgba(224,208,171,0.03)] font-mono text-[11px] text-[#b5c1d1]">3</kbd>
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_274px] gap-8 lg:gap-11 items-start">
                    <p className="m-0 font-serif text-[17px] leading-[1.6] text-[#b5c1d1]">
                      Timed Prelims practice with real negative marking, scored on our server. Skip, mark for review, and come back before you submit.
                    </p>

                    <div>
                      {/* 100-cell question palette */}
                      <div aria-hidden="true" className="grid grid-cols-10 gap-1.5">
                        {arenaPalette.map((cell) => (
                          <span
                            key={cell.id}
                            className={`w-[22px] h-[22px] rounded-[5px] border transition-colors ${
                              cell.status === 'answered'
                                ? 'bg-[#e0d0ab] border-[#e0d0ab]'
                                : cell.status === 'review'
                                ? 'bg-[rgba(224,208,171,0.14)] border-[#e0d0ab]'
                                : cell.status === 'current'
                                ? 'border-[#f4ecd8] shadow-[0_0_0_2px_rgba(244,236,216,0.28)]'
                                : 'bg-transparent border-[rgba(224,208,171,0.16)]'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="mt-4 flex gap-4 font-serif text-[13px] text-[#7d8ca4]">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-[3px] bg-[#e0d0ab]" /> Answered
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-[3px] bg-[rgba(224,208,171,0.14)] border border-[#e0d0ab]" /> For review
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-[3px] border border-[rgba(224,208,171,0.28)]" /> Not visited
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ROOM 2: Daily Brief (Col 3, Row 1) */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateTracker}
              onKeyDown={(e) => e.key === 'Enter' && onNavigateTracker()}
              onMouseEnter={() => dispatchRailPeek('brief')}
              onMouseLeave={() => dispatchRailPeek(null)}
              onFocus={() => dispatchRailPeek('brief')}
              onBlur={() => dispatchRailPeek(null)}
              className="room-cell p-1.5 rounded-[20px] bg-gradient-to-br from-[rgba(224,208,171,0.06)] to-[rgba(224,208,171,0.01)] border border-[rgba(224,208,171,0.12)] hover:border-[rgba(224,208,171,0.38)] cursor-pointer outline-none transition-all flex flex-col"
            >
              <div className="h-full bg-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.07)] p-6.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-[#e0d0ab]" strokeWidth={1.75} />
                    <h3 className="m-0 font-sans font-bold text-[22px] tracking-[-0.02em] text-[#f4ecd8]">
                      Daily Brief
                    </h3>
                    <span className="ml-auto inline-flex gap-1">
                      <kbd className="inline-flex items-center justify-center h-[22px] px-2 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] font-mono text-[11px] text-[#b5c1d1]">Alt</kbd>
                      <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] font-mono text-[11px] text-[#b5c1d1]">2</kbd>
                    </span>
                  </div>
                  <p className="mt-4 m-0 font-serif text-[15px] leading-[1.55] text-[#b5c1d1]">
                    Ten dispatches a day from PIB and Cabinet releases. Each sentence links to its source, and ten questions follow.
                  </p>
                </div>
                <p className="mt-6 m-0 font-serif italic text-[14px] text-[#7d8ca4]">
                  About four minutes to read.
                </p>
              </div>
            </div>

            {/* ROOM 3: Syllabus Pillars (Col 3, Row 2) */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateLibrary || onNavigateArena}
              onKeyDown={(e) => e.key === 'Enter' && (onNavigateLibrary || onNavigateArena)()}
              onMouseEnter={() => dispatchRailPeek('pillars')}
              onMouseLeave={() => dispatchRailPeek(null)}
              onFocus={() => dispatchRailPeek('pillars')}
              onBlur={() => dispatchRailPeek(null)}
              className="room-cell p-1.5 rounded-[20px] bg-gradient-to-br from-[rgba(224,208,171,0.06)] to-[rgba(224,208,171,0.01)] border border-[rgba(224,208,171,0.12)] hover:border-[rgba(224,208,171,0.38)] cursor-pointer outline-none transition-all flex flex-col"
            >
              <div className="h-full bg-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.07)] p-6.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-5 h-5 text-[#e0d0ab]" strokeWidth={1.75} />
                    <h3 className="m-0 font-sans font-bold text-[22px] tracking-[-0.02em] text-[#f4ecd8]">
                      Syllabus Pillars
                    </h3>
                    <span className="ml-auto inline-flex gap-1">
                      <kbd className="inline-flex items-center justify-center h-[22px] px-2 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] font-mono text-[11px] text-[#b5c1d1]">Alt</kbd>
                      <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] font-mono text-[11px] text-[#b5c1d1]">4</kbd>
                    </span>
                  </div>
                  <p className="mt-4 m-0 font-serif text-[15px] leading-[1.55] text-[#b5c1d1]">
                    The Prelims syllabus laid out by subject. Open any topic and practise only that.
                  </p>
                </div>
                <p className="mt-6 m-0 font-serif text-[14px] leading-[1.5] text-[#7d8ca4]">
                  Polity, History, Geography, Economy, Environment, Science
                </p>
              </div>
            </div>

            {/* ROOM 4: Primary Thinkers (Spans 2 cols, Row 3) */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateHumanities || onNavigateArena}
              onKeyDown={(e) => e.key === 'Enter' && (onNavigateHumanities || onNavigateArena)()}
              onMouseEnter={() => dispatchRailPeek('thinkers')}
              onMouseLeave={() => dispatchRailPeek(null)}
              onFocus={() => dispatchRailPeek('thinkers')}
              onBlur={() => dispatchRailPeek(null)}
              className="room-cell md:col-span-2 p-1.5 rounded-[20px] bg-gradient-to-br from-[rgba(224,208,171,0.07)] to-[rgba(224,208,171,0.015)] border border-[rgba(224,208,171,0.12)] hover:border-[rgba(224,208,171,0.38)] cursor-pointer outline-none transition-all"
            >
              <div className="h-full bg-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.07)] p-6.5 lg:p-7.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-5 h-5 text-[#e0d0ab]" strokeWidth={1.75} />
                    <h3 className="m-0 font-sans font-bold text-[22px] tracking-[-0.02em] text-[#f4ecd8]">
                      Primary Thinkers
                    </h3>
                    <span className="ml-auto inline-flex gap-1">
                      <kbd className="inline-flex items-center justify-center h-[22px] px-2 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] font-mono text-[11px] text-[#b5c1d1]">Alt</kbd>
                      <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] font-mono text-[11px] text-[#b5c1d1]">5</kbd>
                    </span>
                  </div>

                  <div className="mt-4.5 grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-8 items-start">
                    <figure className="m-0 relative pl-7">
                      <span aria-hidden="true" className="absolute -left-0.5 -top-3 font-serif text-[56px] leading-none text-[#e0d0ab]">“</span>
                      <blockquote className="m-0 font-serif italic text-[20px] lg:text-[21px] leading-[1.45] text-[#f4ecd8]">
                        Constitutional morality is not a natural sentiment. It has to be cultivated.
                      </blockquote>
                      <figcaption className="mt-2.5 font-sans text-[13px] font-medium text-[#7d8ca4]">
                        B. R. Ambedkar, Constituent Assembly, 4 November 1948
                      </figcaption>
                    </figure>
                    <p className="m-0 font-serif text-[15px] leading-[1.55] text-[#b5c1d1]">
                      The original texts the examiner keeps quoting, read in full for GS-4 and the Essay paper.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ROOM 5: The Observatory (Col 3, Row 3) */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateObservatory || onNavigateArena}
              onKeyDown={(e) => e.key === 'Enter' && (onNavigateObservatory || onNavigateArena)()}
              onMouseEnter={() => dispatchRailPeek('observatory')}
              onMouseLeave={() => dispatchRailPeek(null)}
              onFocus={() => dispatchRailPeek('observatory')}
              onBlur={() => dispatchRailPeek(null)}
              className="room-cell p-1.5 rounded-[20px] bg-gradient-to-br from-[rgba(224,208,171,0.06)] to-[rgba(224,208,171,0.01)] border border-[rgba(224,208,171,0.12)] hover:border-[rgba(224,208,171,0.38)] cursor-pointer outline-none transition-all flex flex-col"
            >
              <div className="h-full bg-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.07)] p-6.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-[#e0d0ab]" strokeWidth={1.75} />
                    <h3 className="m-0 font-sans font-bold text-[22px] tracking-[-0.02em] text-[#f4ecd8]">
                      The Observatory
                    </h3>
                    <span className="ml-auto inline-flex gap-1">
                      <kbd className="inline-flex items-center justify-center h-[22px] px-2 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] font-mono text-[11px] text-[#b5c1d1]">Alt</kbd>
                      <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] font-mono text-[11px] text-[#b5c1d1]">6</kbd>
                    </span>
                  </div>
                  <p className="mt-4 m-0 font-serif text-[15px] leading-[1.55] text-[#b5c1d1]">
                    Prelims papers from 2000 to 2025, sorted by subject and year, so you can see where marks have come from.
                  </p>
                </div>
              </div>
            </div>

            {/* ROOM 6: Leaderboard (Spans 3 cols, Row 4) */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateLeaderboard || onNavigateArena}
              onKeyDown={(e) => e.key === 'Enter' && (onNavigateLeaderboard || onNavigateArena)()}
              onMouseEnter={() => dispatchRailPeek('leaderboard')}
              onMouseLeave={() => dispatchRailPeek(null)}
              onFocus={() => dispatchRailPeek('leaderboard')}
              onBlur={() => dispatchRailPeek(null)}
              className="room-cell md:col-span-3 p-1.5 rounded-[20px] bg-[rgba(224,208,171,0.02)] border border-[rgba(224,208,171,0.10)] hover:border-[rgba(224,208,171,0.38)] cursor-pointer outline-none transition-all"
            >
              <div className="h-full bg-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.06)] px-7 py-4.5 flex items-center gap-4">
                <Trophy className="w-5 h-5 text-[#e0d0ab]" strokeWidth={1.75} />
                <h3 className="m-0 font-sans font-bold text-[20px] tracking-[-0.02em] text-[#f4ecd8]">
                  Leaderboard
                </h3>
                <p className="m-0 ml-2.5 font-serif text-[15px] text-[#b5c1d1] hidden sm:inline">
                  See how your scores rank against other Tark aspirants.
                </p>
                <span className="ml-auto inline-flex gap-1">
                  <kbd className="inline-flex items-center justify-center h-[22px] px-2 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] font-mono text-[11px] text-[#b5c1d1]">Alt</kbd>
                  <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 border border-[rgba(224,208,171,0.22)] border-b-2 rounded-[5px] font-mono text-[11px] text-[#b5c1d1]">7</kbd>
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
             SECTION 4: TRUST (How scoring and sources work)
             ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="h-trust" className="px-10 lg:px-16 py-20 border-t border-[rgba(224,208,171,0.06)]">
          <h2 id="h-trust" className="m-0 font-sans font-extrabold text-[44px] lg:text-[52px] leading-[1.04] tracking-[-0.03em] text-[#f4ecd8]">
            How scoring and sources work.
          </h2>

          <div className="mt-10 max-w-[1080px] grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
            <p className="m-0 font-serif text-[17px] leading-[1.6] text-[#b5c1d1]">
              <strong className="font-sans font-semibold text-[#f4ecd8]">Questions.</strong> Taken from UPSC Prelims papers from 2000 to 2025, each tagged with its year and paper.
            </p>
            <p className="m-0 font-serif text-[17px] leading-[1.6] text-[#b5c1d1]">
              <strong className="font-sans font-semibold text-[#f4ecd8]">Scoring.</strong> Answers are checked on our server at +2.00 and −0.66. A score cannot be changed from the browser.
            </p>
            <p className="m-0 font-serif text-[17px] leading-[1.6] text-[#b5c1d1]">
              <strong className="font-sans font-semibold text-[#f4ecd8]">Briefs.</strong> Every sentence in the Daily Brief links to the PIB release or Gazette notice it came from. A sentence without a source is dropped.
            </p>
            <p className="m-0 font-serif text-[17px] leading-[1.6] text-[#b5c1d1]">
              <strong className="font-sans font-semibold text-[#f4ecd8]">Privacy.</strong> No ads, no affiliate links, no sponsored content. Your answers are never sold.
            </p>
          </div>

          <button
            type="button"
            onClick={onNavigateManifesto}
            className="text-link inline-block mt-10 font-sans text-[15px] font-medium text-[#b5c1d1] hover:text-[#f0dfb8] cursor-pointer"
          >
            Read the method in the Manifesto
          </button>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
             SECTION 5: SEATS (Five hundred lifetime seats)
             ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="h-seats" className="px-10 lg:px-16 py-20 border-t border-[rgba(224,208,171,0.06)]">
          <h2 id="h-seats" className="m-0 font-sans font-extrabold text-[44px] lg:text-[52px] leading-[1.04] tracking-[-0.03em] text-[#f4ecd8]">
            Five hundred lifetime seats.
          </h2>
          <p className="mt-3.5 m-0 max-w-[620px] font-serif text-[18px] leading-[1.55] text-[#b5c1d1]">
            One payment, lifetime access, no subscription. When all 500 are taken, membership closes.
          </p>

          <div className="mt-10 max-w-[1144px]">
            <div className="flex justify-between items-baseline mb-3.5">
              <span className="font-mono text-[14px] font-semibold text-[#e0d0ab] tabular-nums">
                {claimedCount} taken
              </span>
              <span className="font-mono text-[14px] text-[#7d8ca4] tabular-nums">
                {remainingCount} open
              </span>
            </div>

            {/* 500-chair visual matrix (50 cols x 10 rows) */}
            <div
              role="img"
              aria-label={`${claimedCount} of 500 seats taken`}
              className="grid grid-cols-[repeat(50,minmax(0,1fr))] sm:grid-cols-[repeat(50,17px)] gap-1.5 overflow-x-auto pb-2"
            >
              {Array.from({ length: 500 }, (_, i) => {
                const isClaimed = i < claimedCount;
                return (
                  <span
                    key={i}
                    title={`Seat #${i + 1}: ${isClaimed ? 'Claimed' : 'Available'}`}
                    className={`block w-[17px] h-[17px] box-border rounded-t-[5px] rounded-b-[3px] transition-colors ${
                      isClaimed
                        ? 'bg-[#e0d0ab] border border-[#e0d0ab]'
                        : 'bg-transparent border border-[rgba(224,208,171,0.20)] hover:border-[rgba(224,208,171,0.50)]'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-11 flex items-center gap-7 flex-wrap">
            <button
              type="button"
              onClick={onNavigateProfile}
              className="cta-primary inline-flex items-center gap-3.5 py-1.5 pl-6 pr-1.5 bg-[#e0d0ab] text-[#050b1a] font-sans font-semibold text-[16px] rounded-full shadow-[0_12px_36px_-16px_rgba(224,208,171,0.5)] cursor-pointer"
            >
              <span>Reserve a seat</span>
              <span className="w-10 h-10 rounded-full bg-[rgba(5,11,26,0.12)] inline-flex items-center justify-center">
                <svg className="cta-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </span>
            </button>

            <span className="font-sans text-[15px] font-medium text-[#f4ecd8]">
              <span className="font-mono text-[#e0d0ab] border border-dashed border-[rgba(224,208,171,0.5)] rounded px-2 py-0.5 mr-1.5">₹399</span>
              paid once
            </span>

            <span className="w-[1px] h-[22px] bg-[rgba(224,208,171,0.14)] hidden sm:block" />

            <button
              type="button"
              onClick={scrollToDiagnostic}
              className="text-link font-sans text-[15px] font-medium text-[#b5c1d1] hover:text-[#f0dfb8] cursor-pointer"
            >
              Start diagnostic
            </button>

            <button
              type="button"
              onClick={() => onNavigateLegal?.('refund')}
              className="text-link font-sans text-[15px] font-medium text-[#7d8ca4] hover:text-[#b5c1d1] cursor-pointer"
            >
              Refund terms
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
             SECTION 6: FOOTER
             ═══════════════════════════════════════════════════════════════════ */}
        <footer className="mt-auto px-10 lg:px-16 py-8 border-t border-[rgba(224,208,171,0.08)] flex flex-col justify-between gap-6">
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <span className="font-sans font-extrabold text-[17px] tracking-[0.04em] text-[#e0d0ab]">
              TARK
            </span>
            <nav aria-label="Footer" className="flex gap-7 font-sans text-[13px] text-[#b5c1d1]">
              <button
                type="button"
                onClick={onNavigateManifesto}
                className="text-link cursor-pointer"
              >
                Manifesto
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal?.('privacy')}
                className="text-link cursor-pointer"
              >
                Sources
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal?.('refund')}
                className="text-link cursor-pointer"
              >
                Refund
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal?.('privacy')}
                className="text-link cursor-pointer"
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() => onNavigateLegal?.('terms')}
                className="text-link cursor-pointer"
              >
                Terms
              </button>
            </nav>
          </div>
          <p className="m-0 font-serif italic text-[13px] text-[#7d8ca4]">
            No ads. No affiliate links. No sponsored content.
          </p>
        </footer>

      </div>
    </div>
  );
}