import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Swords,
  Flame,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  GitFork,
  X,
  Target,
  Crosshair,
  Shield,
  Zap
} from 'lucide-react';
import SNAPSHOT from '../../data/policy-radar-snapshot.json';
import {
  CHAINS,
  ENTITIES,
  TIERS,
  CANONICAL_RIPPLE_CHAINS,
  RippleChain,
  EntityRecord,
} from './policy-ripple-data';
import {
  getBossMcqForChain,
  getVolcanoTelemetryForNode,
  getPolicyEntityForText,
  type BossMcqDefinition,
} from '../../lib/policy-ripple-radar-shared';
import { computeCalibrated5050EV } from '../../lib/examiner_psyche';
import './PolicyRippleRadar.css';

export { CANONICAL_RIPPLE_CHAINS };

export const RING_META: Record<number, { label: string; desc: string }> = {
  0: { label: 'R0 · Sovereign Origin', desc: 'Cabinet, CCEA, Parliament, or Apex Court trigger' },
  1: { label: 'R1 · Statutory Architecture', desc: 'Statutory rules, Master Directions, Gazette notifications' },
  2: { label: 'R2 · Inter-Ministerial Execution', desc: 'Executing SPVs, Special Missions, Ministry MoUs' },
  3: { label: 'R3 · Grassroots / Federal Rollout', desc: 'State adoption, terminal enforcement, citizen impact' },
};

export default function PolicyRippleRadar() {
  const [view, setView] = useState<'ripple' | 'entities'>('ripple');
  const [chains, setChains] = useState<RippleChain[]>(
    ((SNAPSHOT?.chains as unknown) as RippleChain[]) || CHAINS
  );
  const [entities, setEntities] = useState<EntityRecord[]>(
    ((SNAPSHOT?.entities as unknown) as EntityRecord[]) || ENTITIES
  );
  const [chainIndex, setChainIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const targetChain = new URLSearchParams(window.location.search).get('chain');
      if (targetChain) {
        const initialChains = ((SNAPSHOT?.chains as unknown) as RippleChain[]) || CHAINS;
        const found = initialChains.findIndex((c) => c.chain_id === targetChain);
        if (found !== -1) return found;
      }
    }
    return 0;
  });
  const [activeStep, setActiveStep] = useState<number>(0);
  const [tracing, setTracing] = useState<boolean>(false);
  const [hoverStep, setHoverStep] = useState<number>(-1);
  const [pathOpen, setPathOpen] = useState<boolean>(false);
  const [refsOpen, setRefsOpen] = useState<boolean>(false);
  const [entitySearch, setEntitySearch] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [entityAuthority, setEntityAuthority] = useState<string>(
    SNAPSHOT?.entities?.[0]?.authority || ENTITIES[0]?.authority || ''
  );

  // Full-Chain Boss MCQ Interactive State
  const [bossMcqOpen, setBossMcqOpen] = useState<boolean>(false);
  const [bossSelectedOption, setBossSelectedOption] = useState<number | null>(null);
  const [bossStruckOptions, setBossStruckOptions] = useState<Set<number>>(new Set());
  const [bossSubmitted, setBossSubmitted] = useState<boolean>(false);

  // Background Edge Hydration: updates with fresh live dispatches if online
  useEffect(() => {
    let isMounted = true;
    async function hydrateLiveRadar() {
      try {
        const res = await fetch('/api/policy-radar');
        if (res.ok) {
          const liveData = await res.json();
          if (isMounted && liveData?.chains?.length > 0) {
            setChains(liveData.chains);
            if (liveData?.entities?.length > 0) {
              setEntities(liveData.entities);
            }
          }
        }
      } catch {
        // Silently preserve prebaked snapshot fallback
      }
    }
    hydrateLiveRadar();
    return () => {
      isMounted = false;
    };
  }, []);

  const traceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const TRACE_MS = 1800;

  const currentChain: RippleChain = chains[chainIndex] || chains[0] || CHAINS[0];
  const steps = currentChain.nodes_flow;
  const n = steps.length;
  const currentStepIndex = Math.min(activeStep, n - 1);
  const currentStep = steps[currentStepIndex];

  // 4-Ring Deterministic Radar Polar Coordinate Geometry (r0..r3)
  const geometry = useMemo(() => {
    const points = steps.map((node, i) => {
      const ringDepth = node.ring_depth;
      const radius =
        typeof ringDepth === 'number'
          ? ringDepth === 0
            ? 0
            : 75 + ringDepth * 65 // r1: 140, r2: 205, r3: 270
          : i === 0
          ? 0
          : 112 + ((i - 1) * 136) / Math.max(1, n - 2);

      const spread = Math.min(320, (n - 2) * 100);
      const angle = -90 + ((i - 1) * spread) / Math.max(1, n - 2);
      const t = (angle * Math.PI) / 180;
      return {
        x: 320 + Math.cos(t) * radius,
        y: 320 + Math.sin(t) * radius,
        radius,
        angle,
      };
    });

    const links = points.slice(1).map((p, i) => {
      const q = points[i];
      const L = Math.hypot(p.x - q.x, p.y - q.y);
      const dx = (p.x - q.x) / L;
      const dy = (p.y - q.y) / L;
      const inset = i === 0 ? 48 : 24;
      const x1 = q.x + dx * inset;
      const y1 = q.y + dy * inset;
      const x2 = p.x - dx * 24;
      const y2 = p.y - dy * 24;
      return {
        x1,
        y1,
        x2,
        y2,
        len: Math.hypot(x2 - x1, y2 - y1),
        deg: (Math.atan2(dy, dx) * 180) / Math.PI,
      };
    });

    return { points, links };
  }, [steps, n]);

  // 360-degree ticks
  const ticks = useMemo(() => {
    const arr = [];
    for (let d = 0; d < 360; d += 10) {
      const t = (d * Math.PI) / 180;
      const major = d % 30 === 0;
      const r1 = 280;
      const r2 = major ? 270 : 275;
      arr.push({
        x1: 320 + Math.cos(t) * r1,
        y1: 320 + Math.sin(t) * r1,
        x2: 320 + Math.cos(t) * r2,
        y2: 320 + Math.sin(t) * r2,
        w: major ? 1.25 : 1,
      });
    }
    return arr;
  }, []);

  // Tracing auto-advance schedule
  useEffect(() => {
    if (!tracing || view !== 'ripple') {
      if (traceTimerRef.current) clearInterval(traceTimerRef.current);
      return;
    }

    traceTimerRef.current = setTimeout(() => {
      setActiveStep((prev) => {
        if (prev >= n - 1) {
          setTracing(false);
          return prev;
        }
        return prev + 1;
      });
    }, TRACE_MS);

    return () => {
      if (traceTimerRef.current) clearTimeout(traceTimerRef.current);
    };
  }, [tracing, activeStep, n, view]);

  // Filtered authorities list
  const filteredEntities = useMemo(() => {
    const q = entitySearch.trim().toLowerCase();
    return entities.filter((e) => {
      const matchSearch =
        !q ||
        `${e.authority} ${e.tier_description} ${e.neutralized_trap} ${e.parent_ministry || ''} ${e.entity_slug || ''}`
          .toLowerCase()
          .includes(q);
      const matchTier =
        tierFilter === 'all' || e.tier_number === Number(tierFilter);
      return matchSearch && matchTier;
    });
  }, [entities, entitySearch, tierFilter]);

  const selectedEntity: EntityRecord = useMemo(() => {
    return (
      filteredEntities.find((e) => e.authority === entityAuthority) ||
      filteredEntities[0] ||
      entities[0] ||
      ENTITIES[0]
    );
  }, [entities, filteredEntities, entityAuthority]);

  const handleSelectChain = (idx: number) => {
    setTracing(false);
    setActiveStep(0);
    setChainIndex(idx);
    setPathOpen(false);
    setRefsOpen(false);
    setHoverStep(-1);
    setBossMcqOpen(false);
    setBossSubmitted(false);
    setBossSelectedOption(null);
    setBossStruckOptions(new Set());
    if (typeof window !== 'undefined' && chains[idx]) {
      const url = new URL(window.location.href);
      url.searchParams.set('chain', chains[idx].chain_id);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSelectStep = (stepIdx: number) => {
    setTracing(false);
    setActiveStep(stepIdx);
  };

  const toggleTrace = () => {
    if (tracing) {
      setTracing(false);
    } else {
      if (activeStep >= n - 1) setActiveStep(0);
      setTracing(true);
    }
  };

  const activePoint = geometry.points[currentStepIndex] || { x: 320, y: 320, angle: -90 };

  return (
    <div className="w-full text-[#f4ecd8] font-sans space-y-6">
      {/* ══════════════════════════════════════════════════════════════════
          HERO & SUB-NAV: RADAR VS LEGAL TIERS
          ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-5 border-b border-[rgba(224,208,171,0.14)]">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-sm bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/30 text-[10px] font-mono uppercase tracking-wider font-semibold">
              Sovereign Knowledge Web
            </span>
            <span className="text-xs text-[#8fa2bd] font-mono">
              {chains.length} Chains · 5 Legal Tiers
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#e0d0ab] tracking-tight">
            Policy Ripple Radar
          </h2>
          <p className="text-xs sm:text-sm text-[#b5c1d1] leading-relaxed max-w-2xl">
            Trace how a single Union policy trigger cascades across collaborating ministries, and verify the exact constitutional parentage of every authority behind the action.
          </p>
        </div>

        {/* View Switcher: Radar vs Legal Tiers */}
        <div className="flex items-center gap-1.5 bg-[#041228] p-1 rounded-sm border border-[rgba(224,208,171,0.16)] shrink-0">
          <button
            type="button"
            onClick={() => setView('ripple')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-all duration-150 ${
              view === 'ripple'
                ? 'bg-[#e0d0ab] text-[#072e63] shadow-sm'
                : 'text-[#8fa2bd] hover:text-[#f4ecd8]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <span>Ripple Radar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTracing(false);
              setView('entities');
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm text-xs font-semibold cursor-pointer transition-all duration-150 ${
              view === 'entities'
                ? 'bg-[#e0d0ab] text-[#072e63] shadow-sm'
                : 'text-[#8fa2bd] hover:text-[#f4ecd8]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
              <path d="M7 21h10" />
              <path d="M12 3v18" />
              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
            </svg>
            <span>5 Legal Tiers</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          VIEW 1: RADAR RIPPLE SIMULATOR
          ══════════════════════════════════════════════════════════════════ */}
      {view === 'ripple' && (
        <div className="space-y-6">
          {/* Chain Selection Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.14)]">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <label htmlFor="chain-selector" className="text-xs font-mono uppercase tracking-wider text-[#e0d0ab] font-bold shrink-0">
                Policy Chain:
              </label>
              <select
                id="chain-selector"
                value={chainIndex}
                onChange={(e) => handleSelectChain(Number(e.target.value))}
                className="w-full max-w-xl py-2 px-3 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.2)] text-xs sm:text-sm text-[#f4ecd8] focus:outline-none focus:border-[#e0d0ab] cursor-pointer"
              >
                {chains.map((c, i) => (
                  <option key={c.chain_id} value={i} className="bg-[#041228] text-[#f4ecd8]">
                    {String(i + 1).padStart(2, '0')} · {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={chainIndex === 0}
                onClick={() => handleSelectChain(chainIndex - 1)}
                className="p-2 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.2)] text-[#e0d0ab] hover:bg-[#e0d0ab] hover:text-[#072e63] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous Policy Chain"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                disabled={chainIndex === chains.length - 1}
                onClick={() => handleSelectChain(chainIndex + 1)}
                className="p-2 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.2)] text-[#e0d0ab] hover:bg-[#e0d0ab] hover:text-[#072e63] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next Policy Chain"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Active Chain Title & Badges */}
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#f4ecd8]">
              {currentChain.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-sm bg-[rgba(1,148,168,0.15)] text-[#0194a8] border border-[rgba(1,148,168,0.3)] text-[10px] font-mono uppercase font-bold">
                {currentChain.primary_pillar}
              </span>
              {currentChain.node_id && (
                <span className="px-2 py-0.5 rounded-sm bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/30 text-[10px] font-mono font-semibold" title="Master Syllabus Link">
                  Syllabus: {currentChain.node_id}
                </span>
              )}
              {currentChain.has_sync_debt && (
                <span className="px-2 py-0.5 rounded-sm bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[10px] font-mono uppercase font-bold flex items-center gap-1" title="Downstream fact mutation / Sync debt detected">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Sync Debt Active
                </span>
              )}
              {currentChain.historical_twin_pyq_id && (
                <span className="px-2 py-0.5 rounded-sm bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-mono">
                  Twin PYQ: {currentChain.historical_twin_pyq_id}
                </span>
              )}
              {(() => {
                const v = getVolcanoTelemetryForNode(currentChain.node_id);
                if (!v || v.volcano_status !== 'ERUPTING') return null;
                return (
                  <span
                    className="px-2 py-0.5 rounded-sm bg-rose-500/15 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold flex items-center gap-1 shadow-xs"
                    title={`Volcano Node ${v.node_id}: ${v.years_dormant} years since tested, high news velocity`}
                  >
                    <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
                    <span>VOLCANO V_j: {v.volcano_index.toFixed(1)} // {v.years_dormant}-YR REBOUND</span>
                  </span>
                );
              })()}
              <span className="text-xs text-[#8fa2bd]">
                {steps.length} sequential checkpoints
              </span>
            </div>
          </div>

          {/* Radar Main Console: Left Radar Display + Right Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 bg-[#041228] border border-[rgba(224,208,171,0.14)] rounded-sm overflow-hidden shadow-sm">
            {/* LEFT COLUMN: SONAR RADAR CANVAS (Cols 1-7) */}
            <div className="lg:col-span-7 flex flex-col justify-between p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-[rgba(224,208,171,0.14)] relative">
              {/* Radar status telemetry header */}
              <div className="flex items-center justify-between gap-3 text-xs text-[#b5c1d1] pb-2 border-b border-[rgba(224,208,171,0.08)]">
                <div className="flex items-center gap-4 flex-wrap text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#e0d0ab]" />
                    <span>Origin Trigger</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#b5c1d1]" />
                    <span>Propagation Vector</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-[#e0d0ab]">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      tracing ? 'bg-emerald-400 animate-ping' : 'bg-[#e0d0ab]'
                    }`}
                  />
                  <span>
                    {tracing ? 'Tracing Active' : `${n - 1} Downstream Ripples`}
                  </span>
                </div>
              </div>

              {/* The Interactive SVG Radar Viewport */}
              <div className="relative w-full max-w-[560px] mx-auto aspect-square my-4 select-none">
                <svg
                  viewBox="0 0 640 640"
                  className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                >
                  <defs>
                    <radialGradient id="ripple-sector-fill" cx="320" cy="320" r="270" gradientUnits="userSpaceOnUse">
                      <stop offset="0.15" stopColor="#e0d0ab" stopOpacity="0" />
                      <stop offset="1" stopColor="#e0d0ab" stopOpacity="0.12" />
                    </radialGradient>
                  </defs>

                  {/* Center Crosshairs */}
                  <line x1="320" y1="40" x2="320" y2="600" stroke="rgba(224,208,171,0.16)" strokeDasharray="3 7" />
                  <line x1="40" y1="320" x2="600" y2="320" stroke="rgba(224,208,171,0.16)" strokeDasharray="3 7" />

                  {/* Outer Sonar Boundary Ring */}
                  <circle cx="320" cy="320" r="280" fill="none" stroke="rgba(224,208,171,0.16)" />

                  {/* 360-degree ticks */}
                  {ticks.map((t, i) => (
                    <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(224,208,171,0.22)" strokeWidth={t.w} />
                  ))}

                  {/* Concentric 4-Ring Taxonomy Boundary Rings (r1: 140px, r2: 205px, r3: 270px) */}
                  {[
                    { r: 140, depth: 1 },
                    { r: 205, depth: 2 },
                    { r: 270, depth: 3 },
                  ].map(({ r, depth }) => {
                    const isRingActive = currentStep.ring_depth === depth;
                    return (
                      <circle
                        key={`ring-depth-${depth}`}
                        cx="320"
                        cy="320"
                        r={r}
                        fill="none"
                        stroke={isRingActive ? '#e0d0ab' : 'rgba(224,208,171,0.18)'}
                        strokeWidth={isRingActive ? 1.5 : 1}
                        strokeDasharray={isRingActive ? 'none' : '2 5'}
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Active Sector Wedge pointing towards selected contact */}
                  {currentStepIndex > 0 && (
                    <path
                      d="M 320 320 L 585.9 273.1 A 270 270 0 0 1 585.9 366.9 Z"
                      fill="url(#ripple-sector-fill)"
                      style={{
                        transformOrigin: '320px 320px',
                        transform: `rotate(${activePoint.angle}deg)`,
                        transition: 'transform 450ms cubic-bezier(.3,.7,.2,1)',
                      }}
                    />
                  )}

                  {/* Propagation Vector Lines & Arrowheads */}
                  {geometry.links.map((l, i) => {
                    const isTraced = i < currentStepIndex;
                    return (
                      <g key={`link-${i}`}>
                        {/* Background guide dotted line */}
                        <line
                          x1={l.x1}
                          y1={l.y1}
                          x2={l.x2}
                          y2={l.y2}
                          stroke="#b5c1d1"
                          strokeOpacity="0.35"
                          strokeWidth="1.25"
                          strokeDasharray="4 5"
                        />
                        {/* Active glowing connection line */}
                        {isTraced && (
                          <line
                            x1={l.x1}
                            y1={l.y1}
                            x2={l.x2}
                            y2={l.y2}
                            stroke="#e0d0ab"
                            strokeOpacity="0.9"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        )}
                        {/* Directional arrowhead */}
                        <path
                          d="M -6 -3.5 L 1 0 L -6 3.5 Z"
                          fill={isTraced ? '#e0d0ab' : '#b5c1d1'}
                          fillOpacity={isTraced ? 1 : 0.4}
                          transform={`translate(${l.x2} ${l.y2}) rotate(${l.deg})`}
                        />
                      </g>
                    );
                  })}

                  {/* Origin Central Hub Circle */}
                  <circle cx="320" cy="320" r="44" fill="#071630" stroke="#e0d0ab" strokeWidth="1.5" />
                </svg>

                {/* Rotating Sonar Conic Gradient Sweep Line */}
                {tracing && (
                  <div
                    className="absolute inset-[6.25%] w-[87.5%] h-[87.5%] rounded-full pointer-events-none radar-sweep-spinning"
                    style={{
                      background:
                        'conic-gradient(from 0deg, rgba(224,208,171,0) 0deg 290deg, rgba(224,208,171,0.08) 352deg, rgba(224,208,171,0.3) 359.4deg, rgba(224,208,171,0) 360deg)',
                    }}
                  />
                )}

                {/* Interactive Contact Buttons Layer */}
                {steps.map((st, i) => {
                  const p = geometry.points[i];
                  const isOrigin = i === 0;
                  const isActive = i === currentStepIndex;
                  const isTraced = i < currentStepIndex;
                  const isHov = hoverStep === i;
                  const isLit = isActive || (isHov && !isOrigin);
                  const align = p.x < 130 ? 'start' : p.x > 510 ? 'end' : 'center';

                  return (
                    <button
                      key={`contact-${i}`}
                      type="button"
                      onClick={() => handleSelectStep(i)}
                      onMouseEnter={() => setHoverStep(i)}
                      onMouseLeave={() => setHoverStep(-1)}
                      className="absolute flex items-center justify-center cursor-pointer -translate-x-1/2 -translate-y-1/2 group"
                      style={{
                        left: `${(p.x / 640) * 100}%`,
                        top: `${(p.y / 640) * 100}%`,
                        width: isOrigin ? 60 : 44,
                        height: isOrigin ? 60 : 44,
                        zIndex: isHov || isActive ? 20 : 10,
                      }}
                      title={`${isOrigin ? 'Trigger' : `Step ${i}`}: ${st.ministry}`}
                    >
                      {/* Active Contact Target Ping */}
                      {isActive && (
                        <span className="absolute inset-0 rounded-full border border-[#e0d0ab] radar-node-ping pointer-events-none" />
                      )}

                      {/* Blip Circle */}
                      <span
                        className={`rounded-full flex items-center justify-center font-mono font-bold transition-all duration-200 text-xs ${
                          isOrigin
                            ? 'w-11 h-11 bg-[#071630] text-[#e0d0ab] border-2 border-[#e0d0ab]'
                            : isLit
                            ? 'w-8 h-8 bg-[#e0d0ab] text-[#072e63] border border-[#e0d0ab] scale-110 shadow-md'
                            : isTraced
                            ? 'w-7 h-7 bg-[#041228] text-[#e0d0ab] border border-[#e0d0ab]'
                            : 'w-7 h-7 bg-[#041228] text-[#8fa2bd] border border-[#8fa2bd]/40 group-hover:border-[#e0d0ab]'
                        }`}
                      >
                        {isOrigin ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                        ) : (
                          String(i).padStart(2, '0')
                        )}
                      </span>

                      {/* Ministry Floating Label */}
                      <span
                        className={`absolute top-full mt-1 w-32 text-[11px] leading-tight font-medium bg-[#041228]/95 px-1.5 py-0.5 rounded border border-[rgba(224,208,171,0.18)] pointer-events-none transition-colors duration-150 ${
                          align === 'start'
                            ? 'left-0 text-left'
                            : align === 'end'
                            ? 'right-0 text-right'
                            : 'left-1/2 -translate-x-1/2 text-center'
                        } ${
                          isActive || isHov
                            ? 'text-[#e0d0ab] border-[#e0d0ab]/50'
                            : 'text-[#8fa2bd]'
                        }`}
                      >
                        {st.ministry}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-radar explanatory footer */}
              <div className="flex justify-between items-center text-[10px] text-[#8fa2bd] pt-2 border-t border-[rgba(224,208,171,0.08)]">
                <span>4 concentric rings: Hub (R0 Sovereign) → Inner (R1 Regulatory) → Middle (R2 Inter-Ministerial) → Outer (R3 Rollout)</span>
                <span className="font-mono">Tark 2026 Executive Intelligence</span>
              </div>
            </div>

            {/* RIGHT COLUMN: INSPECTION SIDEBAR (Cols 8-12) */}
            <div className="lg:col-span-5 p-5 sm:p-6 bg-[#071630] flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                {/* Current Position & Counter */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold uppercase tracking-wider text-[#e0d0ab]">
                    {currentStepIndex === 0
                      ? 'Policy Trigger Point'
                      : currentStepIndex === n - 1
                      ? 'Terminal Executive Step'
                      : `Downstream Ripple ${currentStepIndex}`}
                  </span>
                  <span className="font-mono text-[#8fa2bd]">
                    Step {currentStepIndex + 1} of {n}
                  </span>
                </div>

                {/* Horizontal Segment Progress Bar */}
                <div className="flex items-center gap-1">
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectStep(i)}
                      className={`h-1.5 flex-1 rounded-sm transition-all cursor-pointer ${
                        i <= currentStepIndex
                          ? 'bg-[#e0d0ab]'
                          : 'bg-[rgba(224,208,171,0.15)] hover:bg-[rgba(224,208,171,0.3)]'
                      }`}
                      title={`Jump to step ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Active Ministry & Action Card */}
                <div className="p-4 rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.18)] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-mono text-[#0194a8] font-bold block">
                      Executing Authority / Ministry
                    </span>
                    {typeof currentStep.ring_depth === 'number' && (
                      <span className="px-1.5 py-0.5 rounded bg-[#e0d0ab]/10 border border-[#e0d0ab]/25 text-[10px] font-mono text-[#e0d0ab] font-bold">
                        {RING_META[currentStep.ring_depth]?.label || `Ring ${currentStep.ring_depth}`}
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg sm:text-xl font-serif font-bold text-[#f4ecd8] leading-snug">
                    {currentStep.ministry}
                  </h4>
                  <p className="text-xs sm:text-sm text-[#b5c1d1] leading-relaxed pt-1 border-t border-[rgba(224,208,171,0.1)]">
                    {currentStep.action}
                  </p>
                  {currentStep.mutates_prior_fact && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">⚠️ Sync Debt:</span>
                      <span>This step mutates an earlier baseline fact or target in the chain.</span>
                    </div>
                  )}
                  {currentStep.examiner_operator && (
                    <div className="text-[10px] font-mono text-[#8fa2bd] pt-1">
                      Examiner Trap: <span className="text-[#e0d0ab]">{currentStep.examiner_operator}</span>
                    </div>
                  )}
                </div>

                {/* Step Navigation Controls */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={currentStepIndex === 0}
                    onClick={() => handleSelectStep(currentStepIndex - 1)}
                    className="p-2.5 rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.18)] text-left hover:border-[#e0d0ab] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    <span className="block text-[10px] text-[#8fa2bd] font-mono">← Previous</span>
                    <strong className="block text-xs text-[#e0d0ab] truncate">
                      {currentStepIndex > 0 ? steps[currentStepIndex - 1].ministry : 'Origin'}
                    </strong>
                  </button>

                  <button
                    type="button"
                    disabled={currentStepIndex === n - 1}
                    onClick={() => handleSelectStep(currentStepIndex + 1)}
                    className="p-2.5 rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.18)] text-right hover:border-[#e0d0ab] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    <span className="block text-[10px] text-[#8fa2bd] font-mono">Next Ripple →</span>
                    <strong className="block text-xs text-[#e0d0ab] truncate">
                      {currentStepIndex < n - 1 ? steps[currentStepIndex + 1].ministry : 'Terminal'}
                    </strong>
                  </button>
                </div>

                {/* Trace Automated Player Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={toggleTrace}
                    className="flex-1 py-2.5 px-4 rounded-sm bg-[#e0d0ab] hover:bg-white text-[#072e63] font-sans font-bold text-xs uppercase tracking-wider transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden"
                  >
                    {tracing ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" />
                          <rect x="14" y="4" width="4" height="16" />
                        </svg>
                        <span>Pause Trace</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>
                          {currentStepIndex === n - 1 ? 'Replay Chain' : 'Trace Chain'}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectStep(0)}
                    disabled={currentStepIndex === 0 && !tracing}
                    className="p-2.5 rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.2)] text-[#e0d0ab] hover:border-[#e0d0ab] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    title="Reset to Policy Trigger (Step 0)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Lead Policy Catalyst Callout */}
              <div className="p-3.5 rounded-sm bg-[#041228]/80 border border-[rgba(224,208,171,0.15)] space-y-1 text-xs">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#e0d0ab] font-bold block">
                  Lead Policy Catalyst:
                </span>
                <p className="text-[#b5c1d1] text-xs leading-relaxed">
                  {currentChain.lead_driver}
                </p>
              </div>

              {/* Fight Full-Chain Boss MCQ CTA */}
              {(steps.length >= 3 || currentChain.boss_mcq) && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBossMcqOpen(!bossMcqOpen);
                      setBossSubmitted(false);
                      setBossSelectedOption(null);
                      setBossStruckOptions(new Set());
                    }}
                    className="w-full py-2.5 px-4 rounded-sm bg-gradient-to-r from-[#e0d0ab] via-[#f4ecd8] to-[#e0d0ab] hover:brightness-110 active:scale-[0.99] text-[#072e63] font-mono font-bold text-xs uppercase tracking-wider transition-all duration-150 shadow-md flex items-center justify-center gap-2 cursor-pointer border border-[#e0d0ab]"
                  >
                    <Swords className="w-4 h-4 text-[#072e63]" />
                    <span>[FIGHT FULL-CHAIN BOSS MCQ (+2.00 / −0.66)]</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Full-Chain Boss MCQ Drawer */}
          {bossMcqOpen && (() => {
            const boss = getBossMcqForChain(currentChain);
            if (!boss) return null;
            const keyMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
            const correctIdx = keyMap[boss.official_key] ?? 0;
            const isCorrect = bossSelectedOption === correctIdx;
            const is5050 = bossStruckOptions.size === 2;
            const op = boss.primary_operator || 'PSY_01_INST_SWAP';
            const entity = getPolicyEntityForText(
              `${boss.stem} ${boss.statements.join(' ')} ${boss.statutory_anchor}`,
              []
            );
            const evMetrics = is5050
              ? computeCalibrated5050EV(op, isCorrect ? 1 : 0, 4, isCorrect ? 0.30 : 0.76)
              : null;

            return (
              <div className="rounded-sm bg-[#050b1a] border-2 border-[#e0d0ab]/50 p-5 sm:p-6 space-y-5 shadow-lg relative my-4">
                {/* Header Strip */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(224,208,171,0.15)] pb-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-[#e0d0ab] text-[#072e63] font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <Swords className="w-3 h-3 text-[#072e63]" />
                        FULL-CHAIN BOSS MCQ // MULTI-RING
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold uppercase">
                        FACT HALF-LIFE: T_1/2 = {boss.claim_half_life_days.toFixed(1)} DAYS
                      </span>
                    </div>
                    <div className="text-xs text-[#8fa2bd] font-mono">
                      r0 Origin Mandate + r1 Statutory Swap [PSY_01] + r2 Legal Tier Trap [PSY_03]
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBossMcqOpen(false)}
                    className="p-1.5 rounded bg-[#071630] border border-[rgba(224,208,171,0.2)] text-[#8fa2bd] hover:text-[#f4ecd8] cursor-pointer"
                    title="Close Boss MCQ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Stem & Statements */}
                <div className="space-y-3 font-serif text-[#e8e0cf] text-sm sm:text-base leading-relaxed">
                  <p className="font-semibold">{boss.stem}</p>
                  <div className="space-y-2.5 pl-2 sm:pl-4 border-l-2 border-[#0194a8]/40">
                    {boss.statements.map((stmt, sIdx) => (
                      <p key={sIdx} className="text-sm text-[#f4ecd8] leading-relaxed">
                        {stmt}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs font-mono font-bold uppercase text-[#e0d0ab] pt-1">
                    How many of the above statements are correct?
                  </p>
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {(['a', 'b', 'c', 'd'] as const).map((optKey, optIdx) => {
                    const isSelected = bossSelectedOption === optIdx;
                    const isStruck = bossStruckOptions.has(optIdx);
                    const optText = boss.options[optKey];

                    return (
                      <div
                        key={optKey}
                        className={`p-3 rounded-sm border flex items-center justify-between gap-3 transition-all ${
                          bossSubmitted
                            ? optIdx === correctIdx
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                              : isSelected
                              ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                              : 'bg-[#071630]/40 border-[rgba(224,208,171,0.1)] opacity-50'
                            : isSelected
                            ? 'bg-[#e0d0ab]/15 border-[#e0d0ab] text-[#f4ecd8]'
                            : isStruck
                            ? 'bg-[#071630]/30 border-dashed border-red-500/40 text-red-300 line-through opacity-60'
                            : 'bg-[#071630]/70 border-[rgba(224,208,171,0.2)] text-[#e8e0cf] hover:border-[#e0d0ab]/60'
                        }`}
                      >
                        <button
                          type="button"
                          disabled={bossSubmitted}
                          onClick={() => {
                            if (!isStruck) setBossSelectedOption(optIdx);
                          }}
                          className="flex-1 text-left flex items-center gap-2 cursor-pointer font-sans text-xs sm:text-sm font-medium"
                        >
                          <span className="font-mono text-xs font-bold text-[#e0d0ab]">
                            ({optKey})
                          </span>
                          <span className={isStruck ? 'line-through text-red-300' : ''}>
                            {optText}
                          </span>
                        </button>

                        {!bossSubmitted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = new Set(bossStruckOptions);
                              if (next.has(optIdx)) {
                                next.delete(optIdx);
                              } else {
                                if (bossSelectedOption === optIdx) setBossSelectedOption(null);
                                next.add(optIdx);
                              }
                              setBossStruckOptions(next);
                            }}
                            className={`p-1 rounded text-[10px] font-mono border transition-colors cursor-pointer shrink-0 ${
                              isStruck
                                ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                                : 'bg-[#041228] text-[#8fa2bd] border-[rgba(224,208,171,0.2)] hover:text-[#f4ecd8]'
                            }`}
                            title="Strike out option (Elimination)"
                          >
                            {isStruck ? 'Undo Strike' : 'Strike'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Submit / Retake Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[rgba(224,208,171,0.12)]">
                  <div className="text-[11px] font-mono text-[#8fa2bd]">
                    {bossStruckOptions.size === 2 ? (
                      <span className="text-purple-300 font-bold">
                        ★ 50:50 PROTOCOL ACTIVE (2 Options Eliminated)
                      </span>
                    ) : (
                      <span>Tip: Strike out 2 options to compute your Calibrated 50:50 EV</span>
                    )}
                  </div>

                  {!bossSubmitted ? (
                    <button
                      type="button"
                      disabled={bossSelectedOption === null}
                      onClick={() => setBossSubmitted(true)}
                      className="px-5 py-2 rounded-sm bg-[#e0d0ab] hover:bg-white text-[#072e63] font-mono text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    >
                      Lock In Answer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setBossSubmitted(false);
                        setBossSelectedOption(null);
                        setBossStruckOptions(new Set());
                      }}
                      className="px-4 py-1.5 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.3)] text-[#e0d0ab] hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-fight Boss MCQ</span>
                    </button>
                  )}
                </div>

                {/* Instant Forensic BAY_02 Dissection & BAY_03 Synthesis */}
                {bossSubmitted && (
                  <div className="pt-4 border-t border-[rgba(224,208,171,0.15)] space-y-4">
                    {/* Verdict Banner */}
                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.2)]">
                      <div className="flex items-center gap-3">
                        <span className={`text-3xl font-mono font-black ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isCorrect ? '+2.00' : '−0.66'}
                        </span>
                        <div>
                          <span className={`text-xs font-bold uppercase font-mono block ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {isCorrect ? 'FULL-CHAIN SYNTHESIS VALIDATED' : 'TRAPPED IN MULTI-RING DECEPTION'}
                          </span>
                          <span className="text-[11px] font-mono text-[#8fa2bd]">
                            Official Key: <strong>({boss.official_key})</strong> • Primary Operator: <strong>{boss.primary_operator}</strong>
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xs bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 text-[#e0d0ab] font-mono text-[10px] font-bold uppercase">
                        BAY_02 AUTOPSY
                      </span>
                    </div>

                    {/* Statement Dissection Grid */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#e0d0ab] font-bold block">
                        Statement-by-Statement Ring Dissection:
                      </span>
                      {boss.statement_dissection.map((sd) => (
                        <div
                          key={sd.stmt_num}
                          className={`p-3 rounded-sm border text-xs font-mono space-y-1 ${
                            sd.is_true
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                              : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>Statement {sd.stmt_num}: {sd.is_true ? 'TRUE (Sovereign Anchor)' : 'FALSE (Examiner Trap)'}</span>
                            {sd.operator && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-900/50 text-rose-300 text-[9.5px]">
                                {sd.operator}
                              </span>
                            )}
                          </div>
                          {sd.anchor && (
                            <div className="text-[11px] text-[#f4ecd8] font-sans">
                              <strong>Anchor:</strong> {sd.anchor}
                            </div>
                          )}
                          {sd.marked_trap && (
                            <div className="text-[11px] font-sans text-rose-100">
                              <span className="line-through text-rose-400 font-bold">{sd.marked_trap}</span> &rarr; Truth: <strong className="text-emerald-300">{sd.truth_key}</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 5-Tier Legal Authority Dissection Block */}
                    {entity && (
                      <div className="p-3.5 rounded-sm bg-[rgba(1,148,168,0.08)] border border-[rgba(1,148,168,0.3)] space-y-1">
                        <div className="font-mono text-[10.5px] text-[#5fe3f5] font-bold uppercase tracking-wider">
                          AUTHORITY TIER // TIER {entity.tier_number}: {entity.tier_name.toUpperCase()}
                        </div>
                        <div className="font-sans text-xs text-[#e8e0cf]">
                          <strong className="text-[#e0d0ab]">ENTITY:</strong> {entity.authority} • <span className="text-[#9fb0c8]">Parent: {entity.parent_ministry}</span>
                        </div>
                        <div className="font-mono text-[11px] text-[#fca5a5] pt-0.5">
                          <strong className="text-[#f87171]">TRAP DEFENSE [{entity.neutralized_trap || 'PSY_03'}]:</strong> {entity.trap_explanation}
                        </div>
                      </div>
                    )}

                    {/* Calibrated 50:50 EV Degradation Ledger */}
                    {is5050 && evMetrics && (
                      evMetrics.isEvInverted ? (
                        <div className="p-3.5 rounded-sm bg-rose-950/70 border border-rose-500/60 text-rose-200 space-y-1">
                          <div className="font-mono text-[11px] font-bold text-rose-300 uppercase flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            <span>EV INVERSION ALERT [{evMetrics.operator}]: STRICT ABSTENTION</span>
                          </div>
                          <p className="font-sans text-xs text-rose-100 m-0 leading-relaxed">
                            Your calibrated 50:50 accuracy on {op} is {(evMetrics.empiricalAccuracy * 100).toFixed(1)}% (EV: {evMetrics.calibratedEvPerCall > 0 ? `+${evMetrics.calibratedEvPerCall}` : evMetrics.calibratedEvPerCall} marks/call). Continuous trap attraction exceeds the 75.2% breakeven horizon. Protocol: <strong>STRICT ABSTENTION</strong>.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 rounded-sm font-mono text-xs border bg-[rgba(168,85,247,0.10)] border-[rgba(168,85,247,0.35)] text-[#d8b4fe] space-y-1">
                          <div>
                            <strong>CALIBRATED 50:50 EV [{evMetrics.operator}]:</strong> {evMetrics.calibratedEvPerCall > 0 ? `+${evMetrics.calibratedEvPerCall}` : evMetrics.calibratedEvPerCall} marks/call (Naive: +0.67 marks).
                          </div>
                          <div className="text-[11px] text-[#c4b5fd]">
                            Protocol: <strong>{evMetrics.protocol}</strong> • Projected 15 Calls: {evMetrics.cumulativeEv15Calls > 0 ? `+${evMetrics.cumulativeEv15Calls}` : evMetrics.cumulativeEv15Calls} marks.
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Collapsible Section 1: Full Propagation Path Timeline */}
          <div className="rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.14)] overflow-hidden">
            <button
              type="button"
              onClick={() => setPathOpen(!pathOpen)}
              className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-[#e0d0ab] hover:bg-[#071630] cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>View Full Chronological Propagation Vector</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/20">
                  {steps.length} Steps
                </span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${pathOpen ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {pathOpen && (
              <div className="p-4 pt-1 space-y-2 border-t border-[rgba(224,208,171,0.1)]">
                {steps.map((st, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectStep(i)}
                    className={`p-3 rounded-sm flex items-start gap-3 cursor-pointer transition-colors ${
                      i === currentStepIndex
                        ? 'bg-[#e0d0ab]/15 border border-[#e0d0ab]/50'
                        : 'bg-[#071630]/60 hover:bg-[#071630] border border-transparent'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-[#e0d0ab] shrink-0 w-6 pt-0.5">
                      {i === 0 ? 'TRG' : String(i).padStart(2, '0')}
                    </span>
                    <div className="space-y-0.5 text-xs">
                      <strong className={`block ${i === currentStepIndex ? 'text-[#e0d0ab]' : 'text-[#f4ecd8]'}`}>
                        {st.ministry}
                      </strong>
                      <p className="text-[#b5c1d1] leading-relaxed">
                        {st.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible Section 2: Compendium References */}
          <div className="rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.14)] overflow-hidden">
            <button
              type="button"
              onClick={() => setRefsOpen(!refsOpen)}
              className="w-full p-4 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-[#e0d0ab] hover:bg-[#071630] cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <span>Associated PIB Compendium Dossiers</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[rgba(1,148,168,0.15)] text-[#0194a8] border border-[rgba(1,148,168,0.3)]">
                  {currentChain.linked_dispatches.length} Sources
                </span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${refsOpen ? 'rotate-180' : ''}`}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {refsOpen && (
              <div className="p-4 pt-1 space-y-2 border-t border-[rgba(224,208,171,0.1)] text-xs">
                <p className="text-[#8fa2bd] text-[11px] pb-1">
                  Primary source releases filed in the 2026 Master Chronicle grounding this ripple chain:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentChain.linked_dispatches.map((ref, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.12)] text-[#e8e0cf] font-mono text-[11px]"
                    >
                      {ref}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VIEW 2: 5 LEGAL TIERS ENTITY DISAMBIGUATION MATRIX
          ══════════════════════════════════════════════════════════════════ */}
      {view === 'entities' && (
        <div className="space-y-6">
          {/* Header intro */}
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#f4ecd8]">
              Know the Authority Behind the Action
            </h3>
            <p className="text-xs sm:text-sm text-[#b5c1d1] leading-relaxed max-w-3xl">
              UPSC Prelims repeatedly tests whether an entity is a <strong>Constitutional organ</strong>, a <strong>Statutory regulator</strong>, an <strong>Executive division</strong>, or a <strong>Registered society</strong>. Use this matrix to instantly eliminate institutional swap traps.
            </p>
          </div>

          {/* Search & Tier Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.14)]">
            <div className="sm:col-span-8 relative">
              <input
                type="search"
                value={entitySearch}
                onChange={(e) => setEntitySearch(e.target.value)}
                placeholder="Search authority name, parent Act, or trap keyword (e.g. 'Article 324', 'SEBI', 'ISM')..."
                className="w-full py-2.5 px-3 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.2)] text-xs sm:text-sm text-[#f4ecd8] focus:outline-none focus:border-[#e0d0ab]"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="w-full py-2.5 px-3 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.2)] text-xs sm:text-sm text-[#f4ecd8] focus:outline-none focus:border-[#e0d0ab] cursor-pointer"
              >
                <option value="all">All 5 Legal Tiers</option>
                {TIERS.map((t, i) => (
                  <option key={i} value={String(i + 1)}>
                    Tier {i + 1} · {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Entity Grid: Left List + Right Detail with 5-Tier Ladder */}
          {filteredEntities.length === 0 ? (
            <div className="p-10 rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.14)] text-center space-y-3">
              <p className="text-sm text-[#b5c1d1]">No authorities match your query.</p>
              <button
                type="button"
                onClick={() => {
                  setEntitySearch('');
                  setTierFilter('all');
                }}
                className="text-xs text-[#0194a8] hover:text-[#e0d0ab] underline cursor-pointer font-medium"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Authority Selector List (Cols 1-5) */}
              <div className="lg:col-span-5 space-y-2 max-h-[580px] overflow-y-auto pr-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8fa2bd] block pb-1">
                  Showing {filteredEntities.length} Authorities
                </span>
                {filteredEntities.map((ent) => {
                  const isSelected = selectedEntity.authority === ent.authority;
                  return (
                    <button
                      key={ent.authority}
                      type="button"
                      onClick={() => setEntityAuthority(ent.authority)}
                      className={`w-full p-3.5 rounded-sm text-left transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#071630] border-[#e0d0ab] shadow-sm'
                          : 'bg-[#041228] border-[rgba(224,208,171,0.12)] hover:border-[rgba(224,208,171,0.3)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className={`text-xs sm:text-sm font-semibold truncate ${isSelected ? 'text-[#e0d0ab]' : 'text-[#f4ecd8]'}`}>
                          {ent.authority}
                        </strong>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[rgba(11,61,120,0.5)] text-[#e0d0ab] shrink-0 font-bold">
                          Tier {ent.tier_number}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8fa2bd] block pt-1">
                        {ent.tier_name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Authority Dossier & 5-Tier Ladder (Cols 6-12) */}
              <div className="lg:col-span-7 p-6 rounded-sm bg-[#041228] border border-[rgba(224,208,171,0.18)] space-y-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-sm bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/30 text-[10px] font-mono uppercase font-bold">
                      Tier {selectedEntity.tier_number} · {selectedEntity.tier_name}
                    </span>
                    <span className="text-[11px] font-mono text-[#8fa2bd]">
                      {selectedEntity.appearances_count} Compendium Mentions
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#f4ecd8] pt-1">
                    {selectedEntity.authority}
                  </h3>
                </div>

                {/* THE 5-TIER VERTICAL LADDER (Interactive visual ladder) */}
                <div className="p-4 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.14)] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#0194a8] font-bold block pb-1">
                    Constitutional & Legal Hierarchy
                  </span>
                  <div className="space-y-2">
                    {TIERS.map((tName, idx) => {
                      const tNum = idx + 1;
                      const isCurrentTier = selectedEntity.tier_number === tNum;
                      return (
                        <div
                          key={tNum}
                          className={`flex items-center gap-3 p-2 rounded-sm transition-all ${
                            isCurrentTier
                              ? 'bg-[#e0d0ab]/15 border-l-2 border-[#e0d0ab]'
                              : 'opacity-50'
                          }`}
                        >
                          <span
                            className={`font-mono text-xs font-bold w-6 ${
                              isCurrentTier ? 'text-[#e0d0ab]' : 'text-[#8fa2bd]'
                            }`}
                          >
                            T{tNum}
                          </span>
                          <span
                            className={`h-1.5 rounded-sm transition-all ${
                              isCurrentTier ? 'w-10 bg-[#e0d0ab]' : 'w-4 bg-[rgba(224,208,171,0.2)]'
                            }`}
                          />
                          <span
                            className={`text-xs ${
                              isCurrentTier ? 'font-bold text-[#f4ecd8]' : 'text-[#8fa2bd]'
                            }`}
                          >
                            {tName}
                          </span>
                          {isCurrentTier && (
                            <span className="ml-auto text-[10px] font-mono text-[#e0d0ab] font-bold">
                              ← ACTIVE
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Administrative Parentage & Statutory Grounding */}
                {(selectedEntity.parent_ministry || selectedEntity.parent_statute_or_article) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {selectedEntity.parent_ministry && (
                      <div className="p-2.5 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.1)]">
                        <span className="text-[10px] font-mono uppercase text-[#8fa2bd] block">Nodal Ministry</span>
                        <span className="text-[#f4ecd8] font-medium">{selectedEntity.parent_ministry}</span>
                      </div>
                    )}
                    {selectedEntity.parent_statute_or_article && (
                      <div className="p-2.5 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.1)]">
                        <span className="text-[10px] font-mono uppercase text-[#8fa2bd] block">Parent Statute / Article</span>
                        <span className="text-[#e0d0ab] font-mono font-semibold">{selectedEntity.parent_statute_or_article}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Legal Origin & Mandate */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[#e0d0ab] font-bold">
                    Legal Origin & Constitutional Grounding
                  </h4>
                  <p className="text-xs sm:text-sm text-[#b5c1d1] leading-relaxed p-3.5 rounded-sm bg-[#071630] border border-[rgba(224,208,171,0.1)]">
                    {selectedEntity.tier_description}
                  </p>
                </div>

                {/* Neutralized UPSC Trap */}
                <div className="p-3.5 rounded-sm bg-red-950/20 border border-red-500/35 space-y-1.5 text-xs">
                  <span className="text-red-400 font-bold block text-[11px] font-mono uppercase">
                    Examiner Trap Neutralized:
                  </span>
                  <p className="text-red-200 text-xs leading-relaxed font-semibold">
                    {selectedEntity.neutralized_trap}
                  </p>
                  {selectedEntity.trap_explanation && (
                    <p className="text-red-300/80 text-[11px] leading-relaxed pt-1.5 border-t border-red-500/20">
                      {selectedEntity.trap_explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
