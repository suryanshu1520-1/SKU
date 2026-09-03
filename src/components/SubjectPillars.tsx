import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Layers,
  Scale,
  Brain,
  Cpu,
  Compass,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  FileCheck2,
  Swords,
  BookOpen,
  Anchor,
  History as HistoryIcon,
  FileSpreadsheet,
  Workflow,
  Target,
  BarChart3,
  Network,
  Maximize2,
  ArrowDown,
  GitFork,
  Search,
  Database,
  Globe2,
  Table,
  HelpCircle,
  ExternalLink,
  Flame,
  Bookmark
} from 'lucide-react';
import { SUBJECT_PILLARS, SubjectPillar, MindMapNode, StaticFactMatrix } from '../data/subject-pillars-data';
import { ExaminerPsycheModal } from './ExaminerPsycheModal';
import AnimatedNavIcon from './AnimatedNavIcon';
import type { CandidatePreferences } from '../types';
import { getOptionalSubject } from '../data/optional-subjects';

interface SubjectPillarsProps {
  candidatePreferences?: CandidatePreferences;
  onLaunchPractice?: (subjectCategory: string) => void;
  onNavigateArena?: () => void;
}

/**
 * A root question forking into distinct, mutually-exclusive branches — for
 * classificatory content (which writ? which majority threshold? which style?).
 * Selecting a leaf highlights only that branch.
 */
function BranchingMindMap({
  mm,
  activeLeaf,
  onSelectLeaf,
}: {
  mm: MindMapNode;
  activeLeaf: number;
  onSelectLeaf: (idx: number) => void;
}) {
  const n = mm.details.length;
  return (
    <div className="my-4">
      {/* Root question */}
      <div className="flex justify-center mb-1">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[#e0d0ab]/10 border border-[#e0d0ab]/40 shadow-sm"
        >
          <GitFork className="w-3.5 h-3.5 text-[#e0d0ab]" />
          <span className="text-xs font-serif italic text-[#e0d0ab]">{mm.rootQuestion}</span>
        </motion.div>
      </div>

      {/* Branch connectors: trunk down from root, then out to each leaf */}
      <svg
        viewBox={`0 0 ${Math.max(n, 1) * 100} 36`}
        preserveAspectRatio="none"
        className="w-full h-9"
        aria-hidden="true"
      >
        {mm.details.map((_, idx) => {
          const cx = (idx + 0.5) * 100;
          const midX = (n * 100) / 2;
          const isActive = activeLeaf === idx;
          const d = `M ${midX} 0 L ${midX} 12 L ${cx} 12 L ${cx} 36`;
          return (
            <motion.path
              key={idx}
              d={d}
              fill="none"
              stroke={isActive ? '#e0d0ab' : 'rgb(63 63 70)'}
              strokeWidth={isActive ? 2 : 1}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          );
        })}
      </svg>

      {/* Leaves */}
      <div className={`grid gap-3 grid-cols-1 sm:grid-cols-2 ${n === 3 ? 'lg:grid-cols-3' : n >= 4 ? 'lg:grid-cols-4' : ''}`}>
        {mm.details.map((leaf, idx) => {
          const isActive = activeLeaf === idx;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              onClick={() => onSelectLeaf(idx)}
              className={`cursor-pointer rounded-sm border p-4 transition-all duration-200 ${
                isActive
                  ? 'bg-zinc-900 border-[#e0d0ab] shadow-[0_10px_28px_-10px_rgba(224,208,171,0.3)] ring-1 ring-[#e0d0ab]/30'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${isActive ? 'text-[#e0d0ab]' : 'text-zinc-500'}`}>
                  Branch {idx + 1}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e0d0ab] animate-pulse" />
                )}
              </div>
              <p className={`mt-2 text-xs md:text-sm font-sans leading-relaxed ${isActive ? 'text-stone-100' : 'text-zinc-400'}`}>
                {leaf}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A genuine ordered procedure where each step presumes the last — for
 * algorithmic content (a resolution framework, an elimination filter).
 */
function SequentialMindMap({
  mm,
  activeStep,
  onSelectStep,
}: {
  mm: MindMapNode;
  activeStep: number;
  onSelectStep: (idx: number) => void;
}) {
  return (
    <div className="my-4 space-y-0">
      {mm.details.map((step, sIdx) => {
        const isActive = activeStep === sIdx;
        const isDone = sIdx <= activeStep;
        return (
          <React.Fragment key={sIdx}>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: Math.min(sIdx, 6) * 0.06, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ x: 2 }}
              onClick={() => onSelectStep(sIdx)}
              className="relative cursor-pointer group flex items-start gap-3"
            >
              <motion.div
                animate={{
                  backgroundColor: isDone ? '#e0d0ab' : 'rgb(9 9 11)',
                  borderColor: isDone ? '#e0d0ab' : 'rgb(82 82 91)',
                  scale: isActive ? 1.15 : 1,
                }}
                transition={{ duration: 0.25 }}
                className="mt-3 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-sm"
              >
                <span className={`text-[10px] font-mono font-bold ${isDone ? 'text-zinc-950' : 'text-zinc-500'}`}>
                  {sIdx + 1}
                </span>
              </motion.div>
              <div
                className={`flex-1 p-4 rounded-sm border transition-all duration-200 ${
                  isActive
                    ? 'bg-zinc-900 border-[#e0d0ab] shadow-[0_8px_24px_-8px_rgba(224,208,171,0.25)] ring-1 ring-[#e0d0ab]/30'
                    : isDone
                      ? 'bg-zinc-900/50 border-zinc-700'
                      : 'bg-zinc-950/60 border-zinc-800 group-hover:border-zinc-700'
                }`}
              >
                <p className={`text-xs md:text-sm font-sans leading-relaxed ${isDone ? 'text-stone-100' : 'text-zinc-500'}`}>
                  {step}
                </p>
                {isActive && mm.examples?.[sIdx] && (
                  <div className="mt-2.5 pt-2.5 border-t border-zinc-800/80">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#e0d0ab]">Worked example</span>
                    <p className="text-[11px] md:text-xs text-zinc-400 leading-relaxed font-sans mt-1 italic">
                      {mm.examples[sIdx]}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
            {sIdx < mm.details.length - 1 && (
              <div className="flex justify-start pl-[10px]">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: sIdx * 0.06 + 0.15 }}
                  className={sIdx < activeStep ? 'text-[#e0d0ab]' : 'text-zinc-700'}
                >
                  <ArrowDown className="w-4 h-4 my-1" />
                </motion.div>
              </div>
            )}
          </React.Fragment>
        );
      })}
      <p className="mt-3 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
        Step {activeStep + 1} of {mm.details.length} — click any step to focus
      </p>
    </div>
  );
}

export default function SubjectPillars({ candidatePreferences, onLaunchPractice, onNavigateArena }: SubjectPillarsProps) {
  const defaultPillarId = useMemo(() => {
    if (candidatePreferences?.focusPillars && candidatePreferences.focusPillars.length > 0) {
      const first = candidatePreferences.focusPillars[0].toLowerCase();
      const match = SUBJECT_PILLARS.find((p) => p.paper.toLowerCase() === first || (first === 'csat' && p.paper === 'CSAT'));
      if (match) return match.id;
    }
    return SUBJECT_PILLARS[0].id;
  }, [candidatePreferences]);

  const [selectedPillarId, setSelectedPillarId] = useState<string>(defaultPillarId);
  const [activeDossierTab, setActiveDossierTab] = useState<'concepts' | 'mindmaps' | 'pyq-evidence' | 'mains-blueprints' | 'static-vault'>('concepts');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExaminerPsycheOpen, setIsExaminerPsycheOpen] = useState<boolean>(false);
  const [activeMindmapSteps, setActiveMindmapSteps] = useState<Record<string, number>>({});
  const getActiveStep = (mindmapId: string) => activeMindmapSteps[mindmapId] ?? 0;
  const setActiveStep = (mindmapId: string, stepIdx: number) =>
    setActiveMindmapSteps((prev) => ({ ...prev, [mindmapId]: stepIdx }));

  const candidateOptional = useMemo(() => {
    if (!candidatePreferences?.optionalSubject) return null;
    return getOptionalSubject(candidatePreferences.optionalSubject);
  }, [candidatePreferences]);

  const selectedPillar = SUBJECT_PILLARS.find((p) => p.id === selectedPillarId) || SUBJECT_PILLARS[0];

  const getPillarIcon = (paper: string) => {
    switch (paper) {
      case 'GS1':
        return <HistoryIcon className="w-5 h-5" />;
      case 'GS2':
        return <Scale className="w-5 h-5" />;
      case 'GS3':
        return <TrendingUp className="w-5 h-5" />;
      case 'GS4':
        return <Shield className="w-5 h-5" />;
      case 'CSAT':
        return <Brain className="w-5 h-5" />;
      case 'STATIC_GK':
        return <Database className="w-5 h-5" />;
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

  // Filter concepts based on search query
  const filteredConcepts = useMemo(() => {
    if (!searchQuery.trim()) return selectedPillar.foundationalConcepts;
    const q = searchQuery.toLowerCase();
    return selectedPillar.foundationalConcepts.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.syllabusTag.toLowerCase().includes(q) ||
        c.coreTheory.toLowerCase().includes(q) ||
        c.criticalProvisions.some((p) => p.toLowerCase().includes(q)) ||
        c.examinerPerspective.toLowerCase().includes(q)
    );
  }, [selectedPillar, searchQuery]);

  // Filter static matrices based on search query
  const filteredMatrices = useMemo(() => {
    if (!selectedPillar.staticMatrices) return [];
    if (!searchQuery.trim()) return selectedPillar.staticMatrices;
    const q = searchQuery.toLowerCase();
    return selectedPillar.staticMatrices.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.highYieldTip.toLowerCase().includes(q) ||
        m.rows.some((r) => r.some((cell) => cell.toLowerCase().includes(q)))
    );
  }, [selectedPillar, searchQuery]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24 max-w-7xl mx-auto font-sans">
      {/* ── Spatial Hero & Sovereign Grounding Header ── */}
      <div className="relative border border-zinc-800/90 bg-zinc-950/80 p-6 md:p-10 rounded-sm overflow-hidden shadow-2xl backdrop-blur-2xl">
        {/* Dynamic ambient radial gradients */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-[#e0d0ab]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-[400px] h-[300px] bg-[#0194a8]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono text-[#e0d0ab] bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 flex items-center gap-1.5 font-bold">
                <Anchor className="w-3.5 h-3.5" />
                UPSC CSE 25-Year Corpus (2000–2025)
              </span>
              <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Static GK & Elimination Engine Active
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#e0d0ab] tracking-tight leading-[1.15] drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              Syllabus Knowledge Pillars & Static Vault
            </h1>

            <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-sans max-w-2xl">
              An analytical decomposition of the UPSC General Studies, CSAT, and Static GK domains. Formulated from 25 years of authentic PYQ frequency patterns, Supreme Court constitutional bench rulings, Ramsar treaties, and 2nd ARC administrative doctrines.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <motion.button
              onClick={() => setIsExaminerPsycheOpen(true)}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-[#e0d0ab] border border-[#e0d0ab]/40 hover:border-[#e0d0ab] rounded-md text-xs font-sans font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
            >
              <Brain className="w-4 h-4 text-[#e0d0ab]" />
              <span>Examiner's Psyche</span>
            </motion.button>
            <motion.button
              onClick={() => onNavigateArena && onNavigateArena()}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="relative flex items-center justify-center gap-2 px-6 py-3 bg-[#e0d0ab] hover:bg-white text-[#072e63] rounded-md text-xs font-sans font-bold tracking-wider uppercase transition-colors shadow-lg hover:shadow-[#e0d0ab]/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 group overflow-hidden"
            >
              {/* Luminous Shimmer Light Wave */}
              <motion.div
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                animate={{ x: ['100%', '-100%'] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
              />
              <motion.div whileHover={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 0.4 }}>
                <Swords className="w-4 h-4 text-[#072e63]" />
              </motion.div>
              <span className="relative z-10">Launch Test Arena</span>
            </motion.button>
          </div>
        </div>

        {/* Search & Empirical Metrics Grid */}
        <div className="mt-8 pt-6 border-t border-zinc-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts, articles, cases, passes, Ramsar sites..."
              className="w-full pl-9 pr-4 py-2 rounded-md bg-zinc-900/90 border border-zinc-800 text-xs text-stone-100 placeholder-zinc-500 focus:outline-none focus:border-[#e0d0ab]/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-sans text-zinc-400 hover:text-zinc-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Core General Studies Subjects ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <AnimatedNavIcon id="library" isActive={true} isHovered={true} size={16} className="w-4 h-4 text-[#e0d0ab] shrink-0" />
            <h2 className="text-xs font-sans font-semibold uppercase tracking-wider text-[#e0d0ab]">
              Core General Studies Subjects
            </h2>
          </div>
          <span className="text-xs font-sans text-zinc-400">Select a pillar to inspect high-yield dossiers</span>
        </div>

        {/* 6 Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {SUBJECT_PILLARS.map((pillar, idx) => {
            const isSelected = pillar.id === selectedPillarId;
            const isTrackPillar = candidatePreferences?.focusPillars?.some(
              (fp) => fp.toLowerCase() === pillar.paper.toLowerCase() || (fp === 'csat' && pillar.paper === 'CSAT')
            );
            return (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                onClick={() => {
                  setSelectedPillarId(pillar.id);
                  if (pillar.paper === 'STATIC_GK' && activeDossierTab === 'mains-blueprints') {
                    setActiveDossierTab('static-vault');
                  }
                }}
                className={`relative p-5 rounded-md border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden group ${
                  isSelected
                    ? 'bg-zinc-900 border-[#e0d0ab] shadow-[0_16px_36px_-10px_rgba(224,208,171,0.2)] ring-1 ring-[#e0d0ab]/40'
                    : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/50'
                }`}
              >
                {/* Top Pillar Capstone Indicator */}
                <div
                  style={{
                    backgroundColor: isSelected ? pillar.colorTheme.primary : 'transparent',
                  }}
                  className="absolute top-0 left-0 right-0 h-1 transition-colors duration-300"
                />

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <div
                      style={{
                        color: pillar.colorTheme.primary,
                        borderColor: isSelected ? pillar.colorTheme.primary : 'rgba(39, 39, 42, 0.8)',
                      }}
                      className="p-2 rounded-md bg-zinc-900 border flex items-center justify-center transition-colors"
                    >
                      {getPillarIcon(pillar.paper)}
                    </div>

                    {isTrackPillar ? (
                      <span className="text-xs font-sans font-bold px-2.5 py-0.5 rounded-md bg-[#e0d0ab]/15 text-[#e0d0ab] border border-[#e0d0ab]/35 flex items-center gap-1 shadow-xs">
                        <span>★</span>
                        <span>{pillar.paper === 'STATIC_GK' ? 'STATIC' : pillar.paper}</span>
                      </span>
                    ) : (
                      <span className="text-xs font-sans font-semibold px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
                        {pillar.paper === 'STATIC_GK' ? 'STATIC' : pillar.paper}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-serif font-bold text-stone-100 text-sm leading-snug group-hover:text-[#e0d0ab] transition-colors">
                      {pillar.title}
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-400 font-sans leading-relaxed line-clamp-2">
                    {pillar.shortDescription}
                  </p>
                </div>

                {/* Bottom Telemetry Bar - No Collisions */}
                <div className="pt-3 mt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs font-sans relative z-10 gap-2">
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span className="font-mono tabular-nums font-bold text-zinc-200 text-xs shrink-0">
                      {pillar.paper === 'GS4'
                        ? '250M'
                        : pillar.paper === 'CSAT'
                        ? '80 Qs'
                        : pillar.keyMetrics.prelimsAvgQuestions.split(' ')[0]}
                    </span>
                    <span className="text-zinc-500 text-[11px] truncate">
                      {pillar.paper === 'GS4' ? 'Mains Core' : 'Prelims Avg'}
                    </span>
                  </div>
                  <span
                    style={{ color: isSelected ? pillar.colorTheme.primary : '#a1a1aa' }}
                    className="flex items-center gap-1 font-semibold shrink-0 text-xs group-hover:translate-x-0.5 transition-transform"
                  >
                    {isSelected ? 'Active' : 'Inspect'}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Candidate Optional Subject Synergies Matrix ── */}
      {candidateOptional && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 md:p-8 bg-gradient-to-br from-[rgba(4,25,54,0.85)] via-[rgba(7,36,75,0.7)] to-[rgba(4,25,54,0.9)] border border-[rgba(19,108,153,0.45)] rounded-md space-y-6 shadow-xl font-sans backdrop-blur-xl"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[rgba(19,108,153,0.3)] pb-5">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="px-2.5 py-0.5 rounded-md bg-[#e0d0ab] text-[#072e63] text-xs font-sans font-bold uppercase tracking-wider shadow-xs">
                  Your Optional Track
                </span>
                <span className="text-xs font-sans text-[#e0d0ab] font-medium">
                  500 Marks across Paper 1 &amp; 2
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-white tracking-tight">
                {candidateOptional.name}
              </h3>
              <p className="text-xs text-[#cad5e2] mt-1 max-w-2xl leading-relaxed">
                {candidateOptional.description}
              </p>
            </div>

            <div className="p-4 bg-[rgba(3,18,42,0.6)] border border-[rgba(19,108,153,0.3)] rounded-md max-w-md">
              <span className="text-xs font-sans uppercase tracking-wider text-[#e0d0ab] font-bold block mb-1">
                💡 Mains Strategy Advisory
              </span>
              <p className="text-xs text-[#cad5e2] leading-relaxed">
                {candidateOptional.mainsStrategyTip}
              </p>
            </div>
          </div>

          {/* Synergies with General Studies */}
          <div>
            <h4 className="text-xs font-sans uppercase tracking-wider text-[#e0d0ab] font-bold mb-3">
              General Studies &amp; Essay Cross-Over Synergies
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'GS-1 Synergy', value: candidateOptional.gsSynergies.find((s) => s.paper === 'GS1')?.details || 'Foundational conceptual depth' },
                { label: 'GS-2 Synergy', value: candidateOptional.gsSynergies.find((s) => s.paper === 'GS2')?.details || 'Governance and institutional analysis' },
                { label: 'GS-3 Synergy', value: candidateOptional.gsSynergies.find((s) => s.paper === 'GS3')?.details || 'Empirical and policy relevance' },
                { label: 'GS-4 Ethics Synergy', value: candidateOptional.gsSynergies.find((s) => s.paper === 'GS4')?.details || 'Philosophical reasoning and case studies' },
                { label: 'Mains Essay Synergy', value: candidateOptional.gsSynergies.find((s) => s.paper === 'ESSAY')?.details || 'High-scoring thematic arguments and examples' },
              ].map((syn, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[rgba(3,18,42,0.65)] border border-[rgba(19,108,153,0.3)] rounded-md flex flex-col justify-between space-y-2 hover:border-[#e0d0ab]/50 transition-colors"
                >
                  <span className="text-xs font-sans uppercase tracking-wider font-bold text-[#e0d0ab]">
                    {syn.label}
                  </span>
                  <p className="text-xs text-[#9fb0c8] leading-relaxed">
                    {syn.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Deep Interactive Pillar Dossier ── */}
      {selectedPillar && (
        <motion.div
          key={selectedPillar.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border border-zinc-800 bg-zinc-950/90 rounded-md overflow-hidden shadow-2xl"
        >
          {/* Pillar Header Card */}
          <div className="p-6 md:p-8 border-b border-zinc-800/80 bg-gradient-to-r from-zinc-900/80 via-zinc-900/40 to-zinc-950 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-sans font-bold bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/30 uppercase">
                  {selectedPillar.paper} • {selectedPillar.code}
                </span>
                <span className="text-xs font-sans text-zinc-300">
                  Weightage: <strong className="text-stone-100 font-medium">{selectedPillar.keyMetrics.totalMarksWeight}</strong>
                </span>
                <span className="text-xs font-sans text-zinc-400">
                  Corpus Coverage: {selectedPillar.keyMetrics.pyqCoverageYears}
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#e0d0ab] tracking-tight">
                {selectedPillar.title}
              </h2>

              <p className="text-xs md:text-sm text-zinc-300 font-sans leading-relaxed">
                {selectedPillar.empiricalBasis}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <motion.button
                onClick={() => {
                  if (onLaunchPractice) {
                    onLaunchPractice(selectedPillar.paper);
                  } else if (onNavigateArena) {
                    onNavigateArena();
                  }
                }}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="relative flex items-center justify-center gap-2 px-5 py-2.5 bg-[#e0d0ab] hover:bg-white text-[#072e63] rounded-md text-xs font-sans font-bold uppercase tracking-wider transition-colors shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] overflow-hidden group"
              >
                {/* Luminous Shimmer Light Wave */}
                <motion.div
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                  animate={{ x: ['100%', '-100%'] }}
                  transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                />
                <motion.div whileHover={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.4 }}>
                  <Swords className="w-4 h-4 text-[#072e63]" />
                </motion.div>
                <span className="relative z-10">Practice {selectedPillar.paper === 'STATIC_GK' ? 'Static GK' : selectedPillar.paper} Arena</span>
              </motion.button>
            </div>
          </div>

          {/* Dossier Navigation Pills */}
          <div className="bg-zinc-900/70 border-b border-zinc-800 px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveDossierTab('concepts')}
              className={`px-4 py-2 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] ${
                activeDossierTab === 'concepts'
                  ? 'bg-[#e0d0ab] text-[#072e63] font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Foundational Architecture &amp; Traps ({filteredConcepts.length})</span>
            </button>

            {selectedPillar.staticMatrices && selectedPillar.staticMatrices.length > 0 && (
              <button
                onClick={() => setActiveDossierTab('static-vault')}
                className={`px-4 py-2 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] ${
                  activeDossierTab === 'static-vault'
                    ? 'bg-[#e0d0ab] text-[#072e63] font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/60'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Static Recall Matrices ({selectedPillar.staticMatrices.length})</span>
              </button>
            )}

            <button
              onClick={() => setActiveDossierTab('mindmaps')}
              className={`px-4 py-2 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] ${
                activeDossierTab === 'mindmaps'
                  ? 'bg-[#e0d0ab] text-[#072e63] font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/60'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Visual Decision Trees ({selectedPillar.mindMaps.length})</span>
            </button>

            <button
              onClick={() => setActiveDossierTab('pyq-evidence')}
              className={`px-4 py-2 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] ${
                activeDossierTab === 'pyq-evidence'
                  ? 'bg-[#e0d0ab] text-[#072e63] font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Exam Relevance &amp; Pitfalls ({selectedPillar.pyqEvidence.length})</span>
            </button>

            <button
              onClick={() => setActiveDossierTab('mains-blueprints')}
              className={`px-4 py-2 rounded-md text-xs font-sans font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] ${
                activeDossierTab === 'mains-blueprints'
                  ? 'bg-[#e0d0ab] text-[#072e63] font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/60'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              Mains Answer Blueprints ({selectedPillar.mainsBlueprints.length})
            </button>
          </div>

          {/* Dossier Body Content */}
          <div className="p-6 md:p-8 space-y-6">
            {/* ── TAB 1: FOUNDATIONAL ARCHITECTURE ── */}
            {activeDossierTab === 'concepts' && (
              <div className="space-y-6">
                {filteredConcepts.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-zinc-800 rounded-sm">
                    <Search className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm font-sans text-zinc-400">No concepts found matching "{searchQuery}"</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-3 text-xs font-mono text-[#e0d0ab] hover:underline"
                    >
                      Clear search filter
                    </button>
                  </div>
                ) : (
                  filteredConcepts.map((concept, idx) => (
                    <div
                      key={idx}
                      className="p-6 rounded-sm bg-zinc-900/40 border border-zinc-800/90 space-y-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                        <div>
                          <span className="text-[10px] font-mono text-[#e0d0ab] bg-[#e0d0ab]/10 border border-[#e0d0ab]/20 px-2 py-0.5 rounded font-bold mr-2">
                            {concept.syllabusTag}
                          </span>
                          <h3 className="text-lg font-serif font-bold text-stone-100 inline-block mt-1">
                            {concept.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onLaunchPractice && onLaunchPractice(concept.title)}
                            className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-[#e0d0ab] flex items-center gap-1 transition-colors"
                          >
                            <Swords className="w-3 h-3" />
                            Drill Qs
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-zinc-300 font-sans leading-relaxed">
                        {concept.coreTheory}
                      </p>

                      {/* Critical Provisions */}
                      <div className="space-y-2.5 pt-1">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-[#e0d0ab] font-bold">
                          Critical Statutory, Judicial & Factual Anchors
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {concept.criticalProvisions.map((prov, pIdx) => (
                            <div
                              key={pIdx}
                              className="p-3 rounded-sm bg-zinc-950/80 border border-zinc-800/90 text-xs text-zinc-300 font-sans leading-relaxed flex items-start gap-2.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#e0d0ab] mt-1.5 shrink-0" />
                              <span>{prov}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Examiner Angle / Cognitive Trap */}
                      <div className="p-4 rounded-sm bg-amber-950/20 border border-amber-800/30 flex items-start gap-3 text-xs text-amber-200 font-sans leading-relaxed">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono font-bold text-amber-300 uppercase text-[10px] tracking-wider block mb-1">
                            Examiner Cognitive Trap & Elimination Radar:
                          </span>
                          <span className="leading-relaxed">{concept.examinerPerspective}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── TAB 2: STATIC RECALL MATRICES ── */}
            {activeDossierTab === 'static-vault' && (
              <div className="space-y-8">
                {filteredMatrices.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-zinc-800 rounded-sm">
                    <Database className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm font-sans text-zinc-400">No static matrices match your current filter.</p>
                  </div>
                ) : (
                  filteredMatrices.map((matrix) => (
                    <div
                      key={matrix.id}
                      className="p-6 md:p-8 rounded-sm bg-zinc-900/40 border border-zinc-800 space-y-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                        <div>
                          <span className="text-[10px] font-mono text-[#e0d0ab] bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 px-2 py-0.5 rounded font-bold mr-2 uppercase">
                            {matrix.category}
                          </span>
                          <h3 className="text-xl font-serif font-bold text-stone-100 inline-block mt-1">
                            {matrix.title}
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider px-2 py-1 bg-emerald-950/40 border border-emerald-800/40 rounded">
                          Deterministic Static Fact
                        </span>
                      </div>

                      {/* Responsive Data Table */}
                      <div className="overflow-x-auto border border-zinc-800 rounded-sm">
                        <table className="w-full text-left text-xs font-sans">
                          <thead className="bg-zinc-950 text-zinc-400 font-mono text-[11px] uppercase tracking-wider border-b border-zinc-800">
                            <tr>
                              {matrix.headers.map((header, hIdx) => (
                                <th key={hIdx} className="px-4 py-3 font-semibold">
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900 bg-zinc-950/60">
                            {matrix.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-zinc-900/60 transition-colors">
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={`px-4 py-3 leading-relaxed ${
                                      cIdx === 0
                                        ? 'font-bold text-stone-100 font-serif'
                                        : 'text-zinc-300'
                                    }`}
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* High-Yield Tip */}
                      <div className="p-4 rounded-sm bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 flex items-start gap-3 text-xs text-[#ebdcb7] font-sans leading-relaxed">
                        <Sparkles className="w-4 h-4 text-[#e0d0ab] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-mono font-bold text-[#e0d0ab] uppercase text-[10px] tracking-wider block mb-1">
                            High-Yield Prelims Rule:
                          </span>
                          <span>{matrix.highYieldTip}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── TAB 3: INTERACTIVE VISUAL MIND MAPS ── */}
            {activeDossierTab === 'mindmaps' && (
              <div className="space-y-8">
                {selectedPillar.mindMaps.map((mm, mmIdx) => (
                  <div
                    key={mm.id}
                    className="p-6 md:p-8 rounded-sm bg-zinc-900/40 border border-zinc-800 space-y-6"
                  >
                    <div className="border-b border-zinc-800/80 pb-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-[#e0d0ab] uppercase tracking-widest font-bold">
                          Visual Decision Tree #{mmIdx + 1}
                        </span>
                        <h3 className="text-xl font-serif font-bold text-stone-100 mt-1">
                          {mm.title}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">{mm.subtitle}</p>
                      </div>

                      <span className="text-[10px] font-mono text-zinc-500 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded flex items-center gap-1.5">
                        {mm.structureType === 'branching' ? (
                          <><GitFork className="w-3 h-3" /> Branching</>
                        ) : (
                          <><ArrowDown className="w-3 h-3" /> Procedure</>
                        )}
                      </span>
                    </div>

                    {mm.structureType === 'branching' ? (
                      <BranchingMindMap
                        mm={mm}
                        activeLeaf={getActiveStep(mm.id)}
                        onSelectLeaf={(idx) => setActiveStep(mm.id, idx)}
                      />
                    ) : (
                      <SequentialMindMap
                        mm={mm}
                        activeStep={getActiveStep(mm.id)}
                        onSelectStep={(idx) => setActiveStep(mm.id, idx)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── TAB 4: 25-YEAR EMPIRICAL FREQUENCY & HEATMAP ── */}
            {activeDossierTab === 'pyq-evidence' && (
              <div className="space-y-6">
                <div className="p-4 rounded-sm bg-zinc-900/60 border border-zinc-800 text-xs font-sans text-zinc-300 leading-relaxed">
                  <span className="font-mono font-bold text-[#e0d0ab] block mb-1 uppercase tracking-wider text-[10px]">
                    25-Year Empirical Distractor & Trap Analysis:
                  </span>
                  Themes are mapped against 25 years of UPSC Prelims and Mains papers. Cognitive traps unpack the standard distractors examiners employ to test conceptual boundaries.
                </div>

                <div className="grid grid-cols-1 gap-5">
                  {selectedPillar.pyqEvidence.map((ev, eIdx) => (
                    <div
                      key={eIdx}
                      className="p-6 rounded-sm bg-zinc-900/30 border border-zinc-800/90 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
                        <h4 className="font-serif font-bold text-stone-100 text-base md:text-lg">
                          {ev.theme}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                            Editorial Priority: {ev.testabilityScore}
                          </span>
                          <span className="px-2.5 py-1 rounded text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800">
                            Anchors: {ev.recentYearAnchors.join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-sm text-xs text-rose-200 font-sans leading-relaxed">
                        <span className="font-mono font-bold text-rose-400 text-[10px] uppercase tracking-wider block mb-1">
                          Examiner Cognitive Elimination Trap:
                        </span>
                        {ev.examinerTrap}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 5: MAINS ANSWER STRUCTURE BLUEPRINTS ── */}
            {activeDossierTab === 'mains-blueprints' && (
              <div className="space-y-6">
                {selectedPillar.mainsBlueprints.map((mb, mIdx) => (
                  <div
                    key={mIdx}
                    className="p-6 md:p-8 rounded-sm bg-zinc-900/40 border border-zinc-800 space-y-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                      <div>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-[#e0d0ab] border border-zinc-700 mr-2 font-bold">
                          {mb.marks} Marks Blueprint
                        </span>
                        <span className="text-xs font-mono text-zinc-400">{mb.yearContext}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                        Standard Scoring Rubric
                      </span>
                    </div>

                    <h3 className="text-lg md:text-xl font-serif font-bold text-stone-100 leading-snug">
                      "{mb.questionTitle}"
                    </h3>

                    {/* Step 1: Introduction */}
                    <div className="space-y-2 p-4 bg-zinc-950/90 border border-zinc-800 rounded-sm text-xs font-sans">
                      <span className="font-mono font-bold text-[#e0d0ab] uppercase text-[10px] tracking-widest block">
                        1. Introduction (Definitional & Constitutional Hook)
                      </span>
                      <p className="text-zinc-300 leading-relaxed">{mb.structure.introduction}</p>
                    </div>

                    {/* Step 2: Body Arguments */}
                    <div className="space-y-3">
                      <span className="font-mono font-bold text-zinc-400 uppercase text-[10px] tracking-widest block">
                        2. Multi-Dimensional Body Matrix
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {mb.structure.bodyArguments.map((arg, aIdx) => (
                          <div
                            key={aIdx}
                            className="p-4 bg-zinc-950/70 border border-zinc-800/90 rounded-sm space-y-2 text-xs font-sans"
                          >
                            <h4 className="font-bold text-[#e0d0ab] text-xs font-serif">
                              {arg.heading}
                            </h4>
                            <ul className="space-y-1.5 text-zinc-300">
                              {arg.points.map((pt, pIdx) => (
                                <li key={pIdx} className="flex items-start gap-2">
                                  <span className="text-[#e0d0ab] mt-0.5">•</span>
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step 3: Statutory Citations */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 mr-1">
                        Authoritative Citations:
                      </span>
                      {mb.structure.statutoryAnchors.map((sa, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2.5 py-1 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-stone-300"
                        >
                          § {sa}
                        </span>
                      ))}
                    </div>

                    {/* Step 4: Conclusion */}
                    <div className="space-y-2 p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-sm text-xs font-sans">
                      <span className="font-mono font-bold text-emerald-400 uppercase text-[10px] tracking-widest block">
                        3. Balanced Forward-Looking Synthesis
                      </span>
                      <p className="text-emerald-200/90 leading-relaxed">{mb.structure.balancedConclusion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── The Examiner's Psyche Modal ── */}
      <ExaminerPsycheModal
        isOpen={isExaminerPsycheOpen}
        onClose={() => setIsExaminerPsycheOpen(false)}
        onLaunchPractice={onLaunchPractice}
      />
    </div>
  );
}
