import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Pause, ArrowRight, Shield, Target, Crosshair, Terminal, Zap } from 'lucide-react';

interface InteractiveLoopSectionProps {
  onNavigateArena: () => void;
}

export default function InteractiveLoopSection({ onNavigateArena }: InteractiveLoopSectionProps) {
  const [activeBay, setActiveBay] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [cycleStep, setCycleStep] = useState<number>(0);
  const [clockSeconds, setClockSeconds] = useState<number>(48);
  const prefersReduced = useReducedMotion();

  // Ambient 60fps clock countdown & bus cycle
  useEffect(() => {
    if (isPaused || prefersReduced) return;

    const cycleInterval = setInterval(() => {
      setCycleStep((prev) => (prev + 1) % 4);
    }, 4500);

    const clockInterval = setInterval(() => {
      setClockSeconds((prev) => (prev <= 12 ? 59 : prev - 1));
    }, 1000);

    return () => {
      clearInterval(cycleInterval);
      clearInterval(clockInterval);
    };
  }, [isPaused, prefersReduced]);

  const currentHighlight = activeBay !== null ? activeBay : cycleStep;

  return (
    <section
      aria-labelledby="h-loop"
      className="relative px-6 sm:px-10 lg:px-16 py-20 lg:py-28 border-t border-[rgba(224,208,171,0.08)] bg-[#050b1a] text-[#f4ecd8] font-mono overflow-hidden selection:bg-[#e0d0ab] selection:text-[#050b1a]"
    >
      {/* ── Background Subtle Telemetry Dot-Grid ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #e0d0ab 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* ── Ambient Radial Glows (Low opacity, pure atmospheric depth) ── */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] rounded-full opacity-20 blur-[140px]"
        style={{
          background: 'radial-gradient(circle, #0194a8 0%, #071630 60%, transparent 80%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto z-10 space-y-12">
        {/* ── Section Title & HUD Stream Status Bar ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[rgba(224,208,171,0.12)]">
          <div>
            <div className="flex items-center gap-2.5 mb-3 text-[11px] uppercase tracking-widest text-[#e0d0ab]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-ping" />
              <span>SYS_MONITOR // KINETIC EVALUATION PIPELINE</span>
              <span className="text-[#6e7d94]">:: [FPS_60.0_STABLE]</span>
            </div>

            <h2
              id="h-loop"
              className="m-0 font-sans font-extrabold text-[36px] sm:text-[44px] lg:text-[50px] leading-[1.04] tracking-[-0.03em] text-[#f4ecd8]"
            >
              What happens after you answer.
            </h2>
            <p className="mt-3 m-0 max-w-[620px] font-serif text-[17px] text-[#b5c1d1] leading-[1.55]">
              The same four-stage telemetry loop executes on our server the millisecond your answer bubble registers.
            </p>
          </div>

          {/* System Control Widget */}
          <div className="flex items-center gap-3 shrink-0 text-xs">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#071630] border border-[rgba(224,208,171,0.14)] rounded-xs text-[11px] text-[#b5c1d1]">
              <span className="text-[#6e7d94]">BUS_CYCLE:</span>
              <span className="text-[#e0d0ab] font-bold">0{currentHighlight + 1} / 04</span>
            </div>

            <button
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? 'Resume cycle animation' : 'Pause cycle animation'}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xs border border-[rgba(224,208,171,0.22)] bg-[#0a2148]/60 hover:bg-[#0a2148] hover:border-[#e0d0ab] text-[#e0d0ab] transition-all cursor-pointer text-xs"
            >
              {isPaused ? (
                <>
                  <Play className="w-3 h-3 fill-[#e0d0ab]" />
                  <span>RESUME_BUS</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 fill-[#e0d0ab]" />
                  <span>PAUSE_STREAM</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Active Optical Bus Flow Line ── */}
        <div className="relative w-full h-[2px] bg-[#071630] overflow-hidden rounded-full border-t border-[rgba(224,208,171,0.08)]">
          <motion.div
            className="absolute top-0 bottom-0 w-36 bg-gradient-to-r from-transparent via-[#e0d0ab] to-transparent shadow-[0_0_12px_#e0d0ab]"
            animate={
              prefersReduced
                ? {}
                : {
                    x: ['-10%', '1100%'],
                  }
            }
            transition={{
              duration: 3.8,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        {/* ── 4-BAY MINIMALIST HUD CONSOLE ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {/* ══════════════════════════════════════════════════════════════
              BAY 01: PRACTICE (Chrono Reticle & Input Capture)
              ══════════════════════════════════════════════════════════════ */}
          <div
            onMouseEnter={() => setActiveBay(0)}
            onMouseLeave={() => setActiveBay(null)}
            className={`relative p-5 rounded-xs border transition-all duration-300 flex flex-col justify-between min-h-[360px] ${
              currentHighlight === 0
                ? 'bg-[#071630]/90 border-[#e0d0ab] shadow-[0_0_30px_-10px_rgba(224,208,171,0.25)] ring-1 ring-[#e0d0ab]/40'
                : 'bg-[#071630]/40 border-[rgba(224,208,171,0.12)] hover:border-[rgba(224,208,171,0.28)]'
            }`}
          >
            {/* Corner Crosshair Markers */}
            <span className="absolute top-1 left-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute top-1 right-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute bottom-1 left-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute bottom-1 right-1 text-[9px] text-[#6e7d94] leading-none">+</span>

            {/* Bay Header */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-[#6e7d94] border-b border-[rgba(224,208,171,0.08)] pb-2 mb-3">
                <span className="text-[#e0d0ab] font-bold">BAY_01 // INGESTION</span>
                <span>CLK_TICKS: 60Hz</span>
              </div>
              <h3 className="m-0 font-sans font-bold text-xl text-[#f4ecd8] tracking-tight">
                Practice
              </h3>
              <p className="mt-1 m-0 font-serif text-xs text-[#b5c1d1] leading-relaxed">
                You answer under the clock, with real negative marking enforced on server.
              </p>
            </div>

            {/* Kinetic Vector Instrument: Chrono Reticle */}
            <div className="my-5 p-4 rounded-xs bg-[#041228] border border-[rgba(224,208,171,0.14)] flex flex-col items-center justify-center relative overflow-hidden">
              {/* Rotating Reticle Ring SVG */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg
                  className="w-full h-full animate-[spin_16s_linear_infinite]"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e0d0ab"
                    strokeWidth="1"
                    strokeOpacity="0.25"
                    strokeDasharray="2 4"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#0194a8"
                    strokeWidth="1.5"
                    strokeOpacity="0.4"
                    strokeDasharray="18 6"
                  />
                </svg>

                {/* Center Digital Clock Pulse */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-[#6e7d94] tracking-widest uppercase">REMAINING</span>
                  <span className="text-xl font-bold font-mono text-[#e0d0ab] tabular-nums">
                    00:{clockSeconds < 10 ? `0${clockSeconds}` : clockSeconds}
                  </span>
                </div>
              </div>

              {/* Monospace Bubble Lock Line */}
              <div className="mt-3 w-full pt-2 border-t border-[rgba(224,208,171,0.08)] flex items-center justify-between text-[10px]">
                <span className="text-[#6e7d94]">CAPTURE:</span>
                <span className="px-1.5 py-0.5 rounded-xs bg-[#e0d0ab]/10 border border-[#e0d0ab]/40 text-[#e0d0ab] font-bold">
                  OPT-B LOCKED
                </span>
              </div>
            </div>

            {/* Bay Footer Diagnostic Strip */}
            <div className="text-[10px] text-[#6e7d94] flex items-center justify-between pt-2 border-t border-[rgba(224,208,171,0.08)]">
              <span>PENALTY_INDEX</span>
              <span className="text-rose-400 font-bold">-0.66 / MISMATCH</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              BAY 02: DIAGNOSE (Spectroscopic Comparator & Delta Drop)
              ══════════════════════════════════════════════════════════════ */}
          <div
            onMouseEnter={() => setActiveBay(1)}
            onMouseLeave={() => setActiveBay(null)}
            className={`relative p-5 rounded-xs border transition-all duration-300 flex flex-col justify-between min-h-[360px] ${
              currentHighlight === 1
                ? 'bg-[#071630]/90 border-rose-400 shadow-[0_0_30px_-10px_rgba(248,113,113,0.3)] ring-1 ring-rose-400/40'
                : 'bg-[#071630]/40 border-[rgba(224,208,171,0.12)] hover:border-[rgba(224,208,171,0.28)]'
            }`}
          >
            {/* Corner Crosshair Markers */}
            <span className="absolute top-1 left-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute top-1 right-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute bottom-1 left-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute bottom-1 right-1 text-[9px] text-[#6e7d94] leading-none">+</span>

            {/* Bay Header */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-[#6e7d94] border-b border-[rgba(224,208,171,0.08)] pb-2 mb-3">
                <span className="text-rose-400 font-bold">BAY_02 // DISSECTION</span>
                <span>SRV_EVAL: 18ms</span>
              </div>
              <h3 className="m-0 font-sans font-bold text-xl text-[#f4ecd8] tracking-tight">
                Diagnose
              </h3>
              <p className="mt-1 m-0 font-serif text-xs text-[#b5c1d1] leading-relaxed">
                Answers scored immediately. Every miss dissected to the source document.
              </p>
            </div>

            {/* Kinetic Vector Instrument: Spectrometer & Delta Readout */}
            <div className="my-5 p-4 rounded-xs bg-[#041228] border border-[rgba(224,208,171,0.14)] space-y-3">
              {/* Score Drop Readout */}
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-[#6e7d94] block uppercase">CALCULATED YIELD</span>
                  <span className="text-3xl font-extrabold text-[#f87171] tracking-tight font-mono">
                    −0.66
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-xs text-[9px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase">
                  VERIFIED MISMATCH
                </span>
              </div>

              {/* Kinetic Spectrometer Wave Comparison */}
              <div className="space-y-1.5 text-[10px] font-mono">
                <div className="flex items-center justify-between py-1 px-2 rounded-xs bg-rose-950/20 border border-rose-500/20">
                  <span className="text-rose-400">MARKED: (b) 2nd Sched</span>
                  <span className="text-[#6e7d94]">FAIL</span>
                </div>
                <div className="flex items-center justify-between py-1 px-2 rounded-xs bg-emerald-950/20 border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold">KEY: (a) 1st Sched</span>
                  <span className="text-emerald-400 font-bold">TRUTH</span>
                </div>
              </div>

              {/* Oscillating Frequency Wave Vector */}
              <svg className="w-full h-5 stroke-current text-rose-400/40" viewBox="0 0 100 20">
                <path
                  d="M0 10 Q 15 0, 30 10 T 60 10 T 90 10 T 120 10"
                  fill="none"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            {/* Bay Footer Diagnostic Strip */}
            <div className="text-[10px] text-[#6e7d94] flex items-center justify-between pt-2 border-t border-[rgba(224,208,171,0.08)]">
              <span>STATUTORY ANCHOR</span>
              <span className="text-[#e0d0ab] font-bold">ART. 1 & 4</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              BAY 03: REVIEW (Longitudinal Matrix & Pattern Beacon)
              ══════════════════════════════════════════════════════════════ */}
          <div
            onMouseEnter={() => setActiveBay(2)}
            onMouseLeave={() => setActiveBay(null)}
            className={`relative p-5 rounded-xs border transition-all duration-300 flex flex-col justify-between min-h-[360px] ${
              currentHighlight === 2
                ? 'bg-[#071630]/90 border-[#0194a8] shadow-[0_0_30px_-10px_rgba(1,148,168,0.3)] ring-1 ring-[#0194a8]/40'
                : 'bg-[#071630]/40 border-[rgba(224,208,171,0.12)] hover:border-[rgba(224,208,171,0.28)]'
            }`}
          >
            {/* Corner Crosshair Markers */}
            <span className="absolute top-1 left-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute top-1 right-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute bottom-1 left-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute bottom-1 right-1 text-[9px] text-[#6e7d94] leading-none">+</span>

            {/* Bay Header */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-[#6e7d94] border-b border-[rgba(224,208,171,0.08)] pb-2 mb-3">
                <span className="text-[#0194a8] font-bold">BAY_03 // SYNTHESIS</span>
                <span>AGGREGATE: WEEKLY</span>
              </div>
              <h3 className="m-0 font-sans font-bold text-xl text-[#f4ecd8] tracking-tight">
                Review
              </h3>
              <p className="mt-1 m-0 font-serif text-xs text-[#b5c1d1] leading-relaxed">
                The miss joins your subject record, so patterns show across sessions.
              </p>
            </div>

            {/* Kinetic Vector Instrument: Equalizer Matrix & Leakage Tag */}
            <div className="my-5 p-4 rounded-xs bg-[#041228] border border-[rgba(224,208,171,0.14)] space-y-3">
              <div className="flex justify-between items-baseline text-[10px]">
                <span className="text-[#6e7d94]">SUBJECT ACCURACY:</span>
                <span className="text-[#e0d0ab] font-bold">POLITY [6 OF 10]</span>
              </div>

              {/* Kinetic Vertical Equalizer Spectrum Bars */}
              <div className="flex items-end justify-between gap-2 h-14 pt-2">
                {[
                  { name: 'POL', val: 60, col: 'bg-[#0194a8]' },
                  { name: 'ECO', val: 78, col: 'bg-[#34d399]' },
                  { name: 'HIS', val: 52, col: 'bg-[#e0d0ab]' },
                  { name: 'GEO', val: 68, col: 'bg-[#0194a8]' },
                  { name: 'ENV', val: 84, col: 'bg-[#34d399]' },
                ].map((bar) => (
                  <div key={bar.name} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-[#071630] h-10 rounded-xs flex items-end overflow-hidden">
                      <motion.div
                        className={`w-full ${bar.col}`}
                        initial={{ height: 0 }}
                        animate={{ height: `${bar.val}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[9px] text-[#6e7d94]">{bar.name}</span>
                  </div>
                ))}
              </div>

              {/* Machine Habit Detection Pill */}
              <div className="p-1.5 rounded-xs bg-amber-950/20 border border-amber-500/25 text-[9px] tracking-tight text-amber-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="truncate">VULNERABILITY: CONST_SCHED_01</span>
              </div>
            </div>

            {/* Bay Footer Diagnostic Strip */}
            <div className="text-[10px] text-[#6e7d94] flex items-center justify-between pt-2 border-t border-[rgba(224,208,171,0.08)]">
              <span>ACCURACY YIELD</span>
              <span className="text-[#34d399] font-bold">60.0% COHORT</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              BAY 04: IMPROVE (Collimator Reticle & Direct Action)
              ══════════════════════════════════════════════════════════════ */}
          <div
            onMouseEnter={() => setActiveBay(3)}
            onMouseLeave={() => setActiveBay(null)}
            className={`relative p-5 rounded-xs border transition-all duration-300 flex flex-col justify-between min-h-[360px] ${
              currentHighlight === 3
                ? 'bg-[#071630]/90 border-[#34d399] shadow-[0_0_30px_-10px_rgba(52,211,153,0.3)] ring-1 ring-[#34d399]/40'
                : 'bg-[#071630]/40 border-[rgba(224,208,171,0.12)] hover:border-[rgba(224,208,171,0.28)]'
            }`}
          >
            {/* Corner Crosshair Markers */}
            <span className="absolute top-1 left-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute top-1 right-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute bottom-1 left-1 text-[9px] text-[#6e7d94] leading-none">+</span>
            <span className="absolute bottom-1 right-1 text-[9px] text-[#6e7d94] leading-none">+</span>

            {/* Bay Header */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-[#6e7d94] border-b border-[rgba(224,208,171,0.08)] pb-2 mb-3">
                <span className="text-[#34d399] font-bold">BAY_04 // RESOLUTION</span>
                <span>ACTION_READY</span>
              </div>
              <h3 className="m-0 font-sans font-bold text-xl text-[#f4ecd8] tracking-tight">
                Improve
              </h3>
              <p className="mt-1 m-0 font-serif text-xs text-[#b5c1d1] leading-relaxed">
                You leave with one next set to practise, not a wall of charts.
              </p>
            </div>

            {/* Kinetic Vector Instrument: Collimator Lock & Direct CTA */}
            <div className="my-5 p-4 rounded-xs bg-[#041228] border border-[rgba(224,208,171,0.14)] space-y-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#6e7d94]">PRESCRIPTION:</span>
                <span className="text-[#34d399] font-bold">DRILL #PL-SCHED</span>
              </div>

              {/* Collimator Crosshair Graphic */}
              <div className="relative py-2 flex items-center justify-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <Crosshair className="w-12 h-12 text-[#34d399]/60 animate-[spin_24s_linear_infinite]" />
                  <div className="absolute w-2 h-2 rounded-full bg-[#34d399] animate-ping" />
                </div>
              </div>

              {/* Direct 1-Click Operational Trigger */}
              <button
                type="button"
                onClick={onNavigateArena}
                className="w-full py-2.5 px-3 bg-[#e0d0ab] hover:bg-white text-[#050b1a] rounded-xs font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-1.5 hover:gap-2.5"
              >
                <span>Practise Polity</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bay Footer Diagnostic Strip */}
            <div className="text-[10px] text-[#6e7d94] flex items-center justify-between pt-2 border-t border-[rgba(224,208,171,0.08)]">
              <span>TARGETED TIME</span>
              <span className="text-[#e0d0ab] font-bold">6 MIN // 10 MCQS</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
