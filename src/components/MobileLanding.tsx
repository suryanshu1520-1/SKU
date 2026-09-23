import { motion } from 'motion/react';
import { Swords, Globe, Layers, BookOpen, Sparkles, Trophy } from 'lucide-react';
import DiagnosticPreview from './DiagnosticPreview';
import type { CandidatePreferences } from '../types';

interface MobileLandingProps {
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
  seatData: {
    max_capacity: number;
    claimed_seats: number;
    remaining_seats: number;
  } | null;
}

export default function MobileLanding({
  onNavigateArena,
  onNavigateTracker,
  onNavigateProfile,
  onNavigateLibrary,
  onNavigateHumanities,
  onNavigateObservatory,
  onNavigateLeaderboard,
  onNavigateManifesto,
  onNavigateLegal,
  seatData,
}: MobileLandingProps) {
  const claimedCount = (seatData?.claimed_seats && seatData.claimed_seats > 0) ? seatData.claimed_seats : 137;
  const maxCapacity = seatData?.max_capacity ?? 500;
  const remainingCount = maxCapacity - claimedCount;

  const scrollToDiagnostic = () => {
    const el = document.getElementById('mobile-diagnostic-embed');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
    <div className="w-full min-h-screen bg-[#050b1a] text-[#f4ecd8] font-serif relative overflow-x-hidden">
      {/* ── Ambient Radial Glow ── */}
      <div
        className="pointer-events-none absolute -top-[160px] left-1/2 -translate-x-1/2 w-[420px] h-[520px] z-0"
        style={{
          background: 'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(14,44,92,0.7) 0%, rgba(10,33,72,0.26) 45%, rgba(5,11,26,0) 78%)',
        }}
      />

      <main id="mobile-main-content" className="relative z-10 flex flex-col flex-grow">
        
        {/* ═══════════════════════════════════════════════════════════════════
             FOLD
             ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="m-promise" className="relative px-5 pt-8 pb-4 flex flex-col">
          <motion.h1
            id="m-promise"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="m-0 font-sans font-extrabold text-[32px] sm:text-[38px] leading-[1.08] tracking-[-0.03em] text-[#f4ecd8] text-balance"
          >
            Diagnose your UPSC readiness and improve with <span className="text-[#e0d0ab]">evidence.</span>
          </motion.h1>

          <p className="mt-3.5 m-0 font-serif text-[16px] leading-[1.5] text-[#b5c1d1]">
            Timed Prelims questions with real negative marking, scored on our server. Every miss comes back explained.
          </p>

          <button
            type="button"
            onClick={scrollToDiagnostic}
            className="cta-primary mt-6 flex items-center justify-between min-h-[56px] px-5 py-1.5 bg-[#e0d0ab] text-[#050b1a] rounded-full font-sans font-semibold text-[16px] shadow-[0_14px_36px_-16px_rgba(224,208,171,0.55)] cursor-pointer"
          >
            <span>Start diagnostic</span>
            <span className="w-10 h-10 rounded-full bg-[rgba(5,11,26,0.12)] inline-flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </button>

          <div className="mt-4.5 text-center">
            <button
              type="button"
              onClick={onNavigateTracker}
              className="text-link font-sans text-[15px] font-medium text-[#b5c1d1] cursor-pointer"
            >
              Explore the daily brief
            </button>
          </div>

          {/* Embedded Sample Question (UPSC Prelims 2001 Question 39) */}
          <div id="mobile-diagnostic-embed" className="mt-7">
            <DiagnosticPreview onLaunchFullArena={onNavigateArena} />
          </div>

          {/* 3-tier Proof DL */}
          <dl className="mt-8 pt-5 border-t border-[rgba(224,208,171,0.10)] grid grid-cols-[100px_minmax(0,1fr)] column-gap-3 row-gap-3 items-baseline">
            <dt className="font-sans text-[15px] font-semibold text-[#e0d0ab] tabular-nums">2,063</dt>
            <dd className="m-0 font-serif text-[14.5px] leading-[1.5] text-[#b5c1d1]">
              UPSC Prelims questions from 2000 to 2025, each tagged with its year and paper.
            </dd>
            <dt className="font-sans text-[15px] font-semibold text-[#e0d0ab]">Every miss</dt>
            <dd className="m-0 font-serif text-[14.5px] leading-[1.5] text-[#b5c1d1]">
              comes back with why the right option is right.
            </dd>
            <dt className="font-sans text-[15px] font-semibold text-[#e0d0ab] tabular-nums">10 a day</dt>
            <dd className="m-0 font-serif text-[14.5px] leading-[1.5] text-[#b5c1d1]">
              Daily Brief dispatches from PIB and Cabinet releases, every sentence cited.
            </dd>
          </dl>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
             LOOP (What happens after you answer)
             ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="m-loop" className="mt-10 px-5 pt-10 pb-4 border-t border-[rgba(224,208,171,0.06)]">
          <h2 id="m-loop" className="m-0 font-sans font-extrabold text-[30px] leading-[1.08] tracking-[-0.03em] text-[#f4ecd8]">
            What happens after you answer.
          </h2>
          <p className="mt-3 m-0 font-serif text-[15px] leading-[1.55] text-[#b5c1d1]">
            The same four steps run after every question you answer in Tark.
          </p>

          <div className="relative mt-8 pl-6">
            {/* Vertical timeline connector */}
            <div aria-hidden="true" className="absolute left-1 top-2 bottom-2 w-[1px] bg-[rgba(224,208,171,0.28)]" />

            <ol className="list-none m-0 p-0 flex flex-col gap-8">
              {/* Step 1: Practice */}
              <li className="relative">
                <span aria-hidden="true" className="absolute -left-6 top-2 w-[9px] h-[9px] rounded-full bg-[#050b1a] border-2 border-[#e0d0ab]" />
                <h3 className="m-0 font-sans font-bold text-[21px] tracking-[-0.02em] text-[#f4ecd8]">Practice</h3>
                <p className="mt-1.5 m-0 font-serif text-[14.5px] leading-[1.55] text-[#b5c1d1]">
                  You answer under the clock, with negative marking on.
                </p>
              </li>

              {/* Step 2: Diagnose */}
              <li className="relative">
                <span aria-hidden="true" className="absolute -left-6 top-2 w-[9px] h-[9px] rounded-full bg-[#e0d0ab]" />
                <h3 className="m-0 font-sans font-bold text-[21px] tracking-[-0.02em] text-[#f4ecd8]">Diagnose</h3>
                <div className="mt-3 p-1 rounded-[16px] bg-gradient-to-br from-[rgba(224,208,171,0.10)] to-[rgba(224,208,171,0.02)] border border-[rgba(224,208,171,0.14)]">
                  <div className="bg-[#071630] rounded-[12px] border border-[rgba(224,208,171,0.07)] p-4">
                    <div className="flex justify-between items-baseline mb-2.5">
                      <span className="font-sans text-[11px] font-semibold text-[#7d8ca4]">Sample result</span>
                      <span className="font-mono text-[10.5px] text-[#7d8ca4]">Prelims 2001, Q39</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-sans font-extrabold text-[36px] tracking-[-0.03em] leading-none text-[#f87171] tabular-nums">−0.66</span>
                      <span className="font-sans font-semibold text-[13px] text-[#f87171]">Incorrect</span>
                    </div>
                    <p className="mt-3 m-0 font-serif text-[14.5px] leading-[1.5]">
                      Correct answer: <strong className="font-semibold text-[#34d399]">(a) First</strong>.
                    </p>
                    <p className="mt-1.5 m-0 font-serif text-[13.5px] leading-[1.6] text-[#b5c1d1]">
                      The First Schedule lists every State and Union Territory, so a new State means amending it. The Second Schedule sets salaries and allowances.
                    </p>
                  </div>
                </div>
              </li>

              {/* Step 3: Review */}
              <li className="relative">
                <span aria-hidden="true" className="absolute -left-6 top-2 w-[9px] h-[9px] rounded-full bg-[#050b1a] border-2 border-[#e0d0ab]" />
                <h3 className="m-0 font-sans font-bold text-[21px] tracking-[-0.02em] text-[#f4ecd8]">Review</h3>
                <p className="mt-1.5 m-0 font-serif text-[14.5px] leading-[1.55] text-[#b5c1d1]">
                  The miss joins your subject record, so patterns show across sessions.
                </p>
              </li>

              {/* Step 4: Improve */}
              <li className="relative">
                <span aria-hidden="true" className="absolute -left-6 top-2 w-[9px] h-[9px] rounded-full bg-[#050b1a] border-2 border-[#e0d0ab]" />
                <h3 className="m-0 font-sans font-bold text-[21px] tracking-[-0.02em] text-[#f4ecd8]">Improve</h3>
                <p className="mt-1.5 m-0 font-serif text-[14.5px] leading-[1.55] text-[#b5c1d1]">
                  You leave with one next set to practise, not a wall of charts.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
             SIX ROOMS
             ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="m-rooms" className="mt-8 px-5 pt-10 pb-4 border-t border-[rgba(224,208,171,0.06)]">
          <h2 id="m-rooms" className="m-0 font-sans font-extrabold text-[30px] leading-[1.08] tracking-[-0.03em] text-[#f4ecd8]">
            Six rooms.
          </h2>
          <p className="mt-2.5 m-0 font-serif text-[15px] leading-[1.55] text-[#b5c1d1]">
            The same six sit in the bar at the top of every page, in this order.
          </p>

          <div className="mt-7 flex flex-col gap-3.5">
            {/* ROOM 1: Test Arena */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateArena}
              className="p-1 rounded-[18px] bg-gradient-to-br from-[rgba(224,208,171,0.08)] to-[rgba(224,208,171,0.015)] border border-[rgba(224,208,171,0.12)] cursor-pointer"
            >
              <div className="bg-gradient-to-b from-[#0a2148] to-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.07)] p-5">
                <div className="flex items-center gap-2.5">
                  <Swords className="w-5 h-5 text-[#e0d0ab]" strokeWidth={1.75} />
                  <h3 className="m-0 font-sans font-bold text-[22px] tracking-[-0.02em] text-[#f4ecd8]">Test Arena</h3>
                </div>
                <p className="mt-3 m-0 font-serif text-[14.5px] leading-[1.55] text-[#b5c1d1]">
                  Timed Prelims practice with real negative marking, scored on our server. Skip, mark for review, and come back before you submit.
                </p>
                <div aria-hidden="true" className="mt-4 grid grid-cols-10 gap-1">
                  {arenaPalette.map((cell) => (
                    <span
                      key={cell.id}
                      className={`w-[18px] h-[18px] rounded-[4px] border ${
                        cell.status === 'answered'
                          ? 'bg-[#e0d0ab] border-[#e0d0ab]'
                          : cell.status === 'review'
                          ? 'bg-[rgba(224,208,171,0.14)] border-[#e0d0ab]'
                          : cell.status === 'current'
                          ? 'border-[#f4ecd8] shadow-[0_0_0_1px_rgba(244,236,216,0.28)]'
                          : 'bg-transparent border-[rgba(224,208,171,0.16)]'
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 font-serif text-[12px] text-[#7d8ca4]">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#e0d0ab]" />Answered</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[rgba(224,208,171,0.14)] border border-[#e0d0ab]" />For review</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] border border-[rgba(224,208,171,0.28)]" />Not visited</span>
                </div>
              </div>
            </div>

            {/* ROOM 2: Daily Brief */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateTracker}
              className="p-1 rounded-[18px] bg-[rgba(224,208,171,0.03)] border border-[rgba(224,208,171,0.12)] cursor-pointer"
            >
              <div className="bg-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.07)] p-4.5">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4.5 h-4.5 text-[#e0d0ab]" strokeWidth={1.75} />
                  <h3 className="m-0 font-sans font-bold text-[19px] tracking-[-0.02em] text-[#f4ecd8]">Daily Brief</h3>
                </div>
                <p className="mt-2.5 m-0 font-serif text-[14.5px] leading-[1.55] text-[#b5c1d1]">
                  Ten dispatches a day from PIB and Cabinet releases, each sentence linked to its source. About four minutes to read.
                </p>
              </div>
            </div>

            {/* ROOM 3: Syllabus Pillars */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateLibrary || onNavigateArena}
              className="p-1 rounded-[18px] bg-[rgba(224,208,171,0.03)] border border-[rgba(224,208,171,0.12)] cursor-pointer"
            >
              <div className="bg-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.07)] p-4.5">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4.5 h-4.5 text-[#e0d0ab]" strokeWidth={1.75} />
                  <h3 className="m-0 font-sans font-bold text-[19px] tracking-[-0.02em] text-[#f4ecd8]">Syllabus Pillars</h3>
                </div>
                <p className="mt-2.5 m-0 font-serif text-[14.5px] leading-[1.55] text-[#b5c1d1]">
                  The Prelims syllabus laid out by subject. Open any topic and practise only that.
                </p>
              </div>
            </div>

            {/* ROOM 4: Primary Thinkers */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateHumanities || onNavigateArena}
              className="p-1 rounded-[18px] bg-gradient-to-br from-[rgba(224,208,171,0.07)] to-[rgba(224,208,171,0.015)] border border-[rgba(224,208,171,0.12)] cursor-pointer"
            >
              <div className="bg-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.07)] p-4.5">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4.5 h-4.5 text-[#e0d0ab]" strokeWidth={1.75} />
                  <h3 className="m-0 font-sans font-bold text-[19px] tracking-[-0.02em] text-[#f4ecd8]">Primary Thinkers</h3>
                </div>
                <figure className="mt-3.5 m-0 relative pl-5">
                  <span aria-hidden="true" className="absolute -left-0.5 -top-2 font-serif text-[44px] leading-none text-[#e0d0ab]">“</span>
                  <blockquote className="m-0 font-serif italic text-[17px] leading-[1.45] text-[#f4ecd8]">
                    Constitutional morality is not a natural sentiment. It has to be cultivated.
                  </blockquote>
                  <figcaption className="mt-2 font-sans text-[12px] font-medium text-[#7d8ca4]">
                    B. R. Ambedkar, Constituent Assembly, 4 November 1948
                  </figcaption>
                </figure>
              </div>
            </div>

            {/* ROOM 5: The Observatory */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateObservatory || onNavigateArena}
              className="p-1 rounded-[18px] bg-[rgba(224,208,171,0.03)] border border-[rgba(224,208,171,0.12)] cursor-pointer"
            >
              <div className="bg-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.07)] p-4.5">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4.5 h-4.5 text-[#e0d0ab]" strokeWidth={1.75} />
                  <h3 className="m-0 font-sans font-bold text-[19px] tracking-[-0.02em] text-[#f4ecd8]">The Observatory</h3>
                </div>
                <p className="mt-2.5 m-0 font-serif text-[14.5px] leading-[1.55] text-[#b5c1d1]">
                  Prelims papers from 2000 to 2025, sorted by subject and year, so you can see where marks have come from.
                </p>
              </div>
            </div>

            {/* ROOM 6: Leaderboard */}
            <div
              role="button"
              tabIndex={0}
              onClick={onNavigateLeaderboard || onNavigateArena}
              className="p-1 rounded-[18px] bg-[rgba(224,208,171,0.02)] border border-[rgba(224,208,171,0.10)] cursor-pointer"
            >
              <div className="bg-[#071630] rounded-[14px] border border-[rgba(224,208,171,0.06)] p-4.5 flex items-center gap-3">
                <Trophy className="w-4.5 h-4.5 text-[#e0d0ab]" strokeWidth={1.75} />
                <div>
                  <h3 className="m-0 font-sans font-bold text-[18px] tracking-[-0.02em] text-[#f4ecd8]">Leaderboard</h3>
                  <p className="mt-1 m-0 font-serif text-[13.5px] text-[#b5c1d1]">
                    See how your scores rank against other Tark aspirants.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
             TRUST (How scoring and sources work)
             ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="m-trust" className="mt-8 px-5 pt-10 pb-4 border-t border-[rgba(224,208,171,0.06)]">
          <h2 id="m-trust" className="m-0 font-sans font-extrabold text-[28px] leading-[1.1] tracking-[-0.03em] text-[#f4ecd8]">
            How scoring and sources work.
          </h2>
          <div className="mt-6 flex flex-col gap-5">
            <p className="m-0 font-serif text-[15px] leading-[1.6] text-[#b5c1d1]">
              <strong className="font-sans font-semibold text-[#f4ecd8]">Questions.</strong> Taken from UPSC Prelims papers from 2000 to 2025, each tagged with its year and paper.
            </p>
            <p className="m-0 font-serif text-[15px] leading-[1.6] text-[#b5c1d1]">
              <strong className="font-sans font-semibold text-[#f4ecd8]">Scoring.</strong> Answers are checked on our server at +2.00 and −0.66. A score cannot be changed from the browser.
            </p>
            <p className="m-0 font-serif text-[15px] leading-[1.6] text-[#b5c1d1]">
              <strong className="font-sans font-semibold text-[#f4ecd8]">Briefs.</strong> Every sentence in the Daily Brief links to the PIB release or Gazette notice it came from. A sentence without a source is dropped.
            </p>
            <p className="m-0 font-serif text-[15px] leading-[1.6] text-[#b5c1d1]">
              <strong className="font-sans font-semibold text-[#f4ecd8]">Privacy.</strong> No ads, no affiliate links, no sponsored content. Your answers are never sold.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateManifesto}
            className="text-link inline-block mt-6 font-sans text-[14.5px] font-medium text-[#b5c1d1] cursor-pointer"
          >
            Read the method in the Manifesto
          </button>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
             SEATS (Five hundred lifetime seats)
             ═══════════════════════════════════════════════════════════════════ */}
        <section aria-labelledby="m-seats" className="mt-8 px-5 pt-10 pb-8 border-t border-[rgba(224,208,171,0.06)]">
          <h2 id="m-seats" className="m-0 font-sans font-extrabold text-[28px] leading-[1.1] tracking-[-0.03em] text-[#f4ecd8]">
            Five hundred lifetime seats.
          </h2>
          <p className="mt-3 m-0 font-serif text-[15px] leading-[1.55] text-[#b5c1d1]">
            One payment, lifetime access, no subscription. When all 500 are taken, membership closes.
          </p>

          <div className="mt-6">
            <div className="flex justify-between items-baseline mb-2.5">
              <span className="font-mono text-[13px] font-semibold text-[#e0d0ab] tabular-nums">{claimedCount} taken</span>
              <span className="font-mono text-[13px] text-[#7d8ca4] tabular-nums">{remainingCount} open</span>
            </div>

            {/* 500-chair visual matrix for mobile (20 cols x 25 rows = 500 chairs) */}
            <div
              role="img"
              aria-label={`${claimedCount} of 500 seats taken`}
              className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 overflow-hidden"
            >
              {Array.from({ length: 500 }, (_, i) => {
                const isClaimed = i < claimedCount;
                return (
                  <span
                    key={i}
                    className={`block aspect-square box-border rounded-t-[3px] rounded-b-[2px] ${
                      isClaimed
                        ? 'bg-[#e0d0ab] border border-[#e0d0ab]'
                        : 'bg-transparent border border-[rgba(224,208,171,0.20)]'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateProfile}
            className="cta-primary mt-7 w-full flex items-center justify-between min-h-[54px] px-5 py-1.5 bg-[#e0d0ab] text-[#050b1a] rounded-full font-sans font-semibold text-[16px] shadow-[0_14px_36px_-16px_rgba(224,208,171,0.55)] cursor-pointer"
          >
            <span>Reserve a seat</span>
            <span className="w-10 h-10 rounded-full bg-[rgba(5,11,26,0.12)] inline-flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </button>

          <p className="mt-3.5 m-0 text-center font-sans text-[14px] font-medium text-[#f4ecd8]">
            <span className="font-mono text-[#e0d0ab] border border-dashed border-[rgba(224,208,171,0.5)] rounded px-2 py-0.5 mr-1.5">₹399</span>
            paid once
          </p>

          <div className="mt-4 flex justify-center gap-6">
            <button
              type="button"
              onClick={scrollToDiagnostic}
              className="text-link font-sans text-[14px] font-medium text-[#b5c1d1] cursor-pointer"
            >
              Start diagnostic
            </button>
            <button
              type="button"
              onClick={() => onNavigateLegal?.('refund')}
              className="text-link font-sans text-[14px] font-medium text-[#7d8ca4] cursor-pointer"
            >
              Refund terms
            </button>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
             FOOTER
             ═══════════════════════════════════════════════════════════════════ */}
        <footer className="mt-auto px-5 py-7 border-t border-[rgba(224,208,171,0.08)] flex flex-col gap-4">
          <span className="font-sans font-extrabold text-[15px] tracking-[0.04em] text-[#e0d0ab]">
            TARK
          </span>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 font-sans text-[13px] text-[#b5c1d1]">
            <button type="button" onClick={onNavigateManifesto} className="text-link cursor-pointer">Manifesto</button>
            <button type="button" onClick={() => onNavigateLegal?.('privacy')} className="text-link cursor-pointer">Sources</button>
            <button type="button" onClick={() => onNavigateLegal?.('refund')} className="text-link cursor-pointer">Refund</button>
            <button type="button" onClick={() => onNavigateLegal?.('privacy')} className="text-link cursor-pointer">Privacy</button>
            <button type="button" onClick={() => onNavigateLegal?.('terms')} className="text-link cursor-pointer">Terms</button>
          </nav>
          <p className="m-0 font-serif italic text-[12.5px] text-[#7d8ca4]">
            No ads. No affiliate links. No sponsored content.
          </p>
        </footer>

      </main>
    </div>
  );
}
