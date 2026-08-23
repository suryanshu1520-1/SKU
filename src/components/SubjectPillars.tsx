import React, { useState } from 'react';
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
  GitFork
} from 'lucide-react';
import { SUBJECT_PILLARS, SubjectPillar, MindMapNode } from '../data/subject-pillars-data';

interface SubjectPillarsProps {
  onLaunchPractice?: (subjectCategory: string) => void;
  onNavigateArena?: () => void;
}

/**
 * A root question forking into distinct, mutually-exclusive branches — for
 * classificatory content (which writ? which majority threshold? which style?).
 * Selecting a leaf highlights only that branch. No cumulative claim is made,
 * because the branches aren't steps in a shared procedure.
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[#e0d0ab]/10 border border-[#e0d0ab]/40"
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
              strokeWidth={isActive ? 1.5 : 1}
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
              className={`cursor-pointer rounded-sm border p-4 transition-colors duration-200 ${
                isActive
                  ? 'bg-zinc-900 border-[#e0d0ab]/60 shadow-[0_10px_28px_-10px_rgba(224,208,171,0.3)]'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <span className={`text-[10px] font-mono uppercase tracking-wider ${isActive ? 'text-[#e0d0ab]' : 'text-zinc-500'}`}>
                Branch {idx + 1}
              </span>
              <p className={`mt-1.5 text-sm font-sans leading-relaxed ${isActive ? 'text-stone-100' : 'text-zinc-400'}`}>
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
 * Cumulative highlighting is correct here because the steps really do build.
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
                className="mt-3 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center"
              >
                <span className={`text-[10px] font-mono font-bold ${isDone ? 'text-zinc-950' : 'text-zinc-500'}`}>
                  {sIdx + 1}
                </span>
              </motion.div>
              <div
                className={`flex-1 p-4 rounded-sm border transition-colors duration-200 ${
                  isActive
                    ? 'bg-zinc-900 border-[#e0d0ab]/60 shadow-[0_8px_24px_-8px_rgba(224,208,171,0.25)]'
                    : isDone
                      ? 'bg-zinc-900/50 border-zinc-700'
                      : 'bg-zinc-950/60 border-zinc-800 group-hover:border-zinc-700'
                }`}
              >
                <p className={`text-sm font-sans leading-relaxed ${isDone ? 'text-stone-100' : 'text-zinc-500'}`}>
                  {step}
                </p>
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
        Step {activeStep + 1} of {mm.details.length} — click any step to jump there
      </p>
    </div>
  );
}

export default function SubjectPillars({ onLaunchPractice, onNavigateArena }: SubjectPillarsProps) {
  const [selectedPillarId, setSelectedPillarId] = useState<string>(SUBJECT_PILLARS[0].id);
  const [activeDossierTab, setActiveDossierTab] = useState<'concepts' | 'mindmaps' | 'pyq-evidence' | 'mains-blueprints'>('concepts');
  const [activeMindmapSteps, setActiveMindmapSteps] = useState<Record<string, number>>({});
  const getActiveStep = (mindmapId: string) => activeMindmapSteps[mindmapId] ?? 0;
  const setActiveStep = (mindmapId: string, stepIdx: number) =>
    setActiveMindmapSteps((prev) => ({ ...prev, [mindmapId]: stepIdx }));
  const [expandedConceptIdx, setExpandedConceptIdx] = useState<number>(0);

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
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

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
              <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800">
                UPSC CSE Corpus (2000–2025)
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-[#e0d0ab] tracking-tight leading-[1.15] drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              The Five Pillars of Governance
            </h1>

            <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-sans max-w-2xl">
              An architectural decomposition of the UPSC General Studies & CSAT syllabus. Formulated from 25 years of authentic question frequency, Supreme Court constitutional jurisprudence, and 2nd ARC administrative doctrines.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateArena && onNavigateArena()}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#e0d0ab] hover:bg-[#ebdcb7] text-zinc-950 rounded-sm text-xs font-sans font-bold uppercase tracking-widest transition-all duration-300 shadow-xl hover:shadow-[#e0d0ab]/25 active:scale-[0.98] cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              Launch Test Arena
            </button>
          </div>
        </div>

        {/* Empirical Evidence Badges Grid */}
        <div className="mt-8 pt-6 border-t border-zinc-900 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans text-zinc-400">
          <div className="flex items-center gap-2.5 p-2 rounded-sm bg-zinc-900/40 border border-zinc-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono text-[11px] text-stone-200">1,720+ Indexed Items</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded-sm bg-zinc-900/40 border border-zinc-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono text-[11px] text-stone-200">2nd ARC & Law Commission</span>
          </div>
        </div>
      </div>

      {/* ── 3D Monolithic Architectural Pillars ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#e0d0ab]" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#e0d0ab] font-bold">
              Architectural Knowledge Steles
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">Click a pillar to inspect dossier</span>
        </div>

        {/* 5 Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {SUBJECT_PILLARS.map((pillar, idx) => {
            const isSelected = pillar.id === selectedPillarId;
            return (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                onClick={() => setSelectedPillarId(pillar.id)}
                className={`relative p-5 rounded-sm border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden group ${
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

                {/* Subtle vertical watermarked pillar code */}
                <div className="absolute -right-2 top-8 text-[40px] font-mono font-black text-zinc-800/20 select-none pointer-events-none">
                  {pillar.paper}
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div
                      style={{
                        color: pillar.colorTheme.primary,
                        borderColor: isSelected ? pillar.colorTheme.primary : 'rgba(39, 39, 42, 0.8)',
                      }}
                      className="p-2 rounded-sm bg-zinc-900 border flex items-center justify-center transition-colors"
                    >
                      {getPillarIcon(pillar.paper)}
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {pillar.paper}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif font-bold text-stone-100 text-base leading-snug group-hover:text-[#e0d0ab] transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-xs font-serif text-[#e0d0ab]/80 italic mt-1">
                      {pillar.sanskritSubtitle}
                    </p>
                  </div>

                  <p className="text-xs text-zinc-400 font-sans leading-relaxed line-clamp-3">
                    {pillar.shortDescription}
                  </p>
                </div>

                {/* Bottom Telemetry Bar */}
                <div className="pt-4 mt-4 border-t border-zinc-900 flex items-center justify-between text-[11px] font-mono relative z-10">
                  <span className="text-zinc-500 font-medium">{pillar.keyMetrics.prelimsAvgQuestions.split(' ')[0]} Qs/Yr</span>
                  <span
                    style={{ color: isSelected ? pillar.colorTheme.primary : '#a1a1aa' }}
                    className="flex items-center gap-1 font-bold group-hover:translate-x-0.5 transition-transform"
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

      {/* ── Deep Interactive Pillar Dossier ── */}
      {selectedPillar && (
        <motion.div
          key={selectedPillar.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border border-zinc-800 bg-zinc-950/90 rounded-sm overflow-hidden shadow-2xl"
        >
          {/* Pillar Header Card */}
          <div className="p-6 md:p-8 border-b border-zinc-800/80 bg-gradient-to-r from-zinc-900/80 via-zinc-900/40 to-zinc-950 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/20 uppercase">
                  {selectedPillar.paper} • {selectedPillar.code}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  Weightage: {selectedPillar.keyMetrics.totalMarksWeight}
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
              <button
                onClick={() => {
                  if (onLaunchPractice) {
                    onLaunchPractice(selectedPillar.title);
                  } else if (onNavigateArena) {
                    onNavigateArena();
                  }
                }}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-[#e0d0ab] hover:bg-[#ebdcb7] text-zinc-950 rounded-sm text-xs font-sans font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                Practice {selectedPillar.paper} Questions
              </button>
            </div>
          </div>

          {/* Dossier Navigation Pills */}
          <div className="bg-zinc-900/70 border-b border-zinc-800 px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveDossierTab('concepts')}
              className={`px-4 py-2 rounded-sm text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeDossierTab === 'concepts'
                  ? 'bg-[#e0d0ab] text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Foundational Architecture & Traps
            </button>

            <button
              onClick={() => setActiveDossierTab('mindmaps')}
              className={`px-4 py-2 rounded-sm text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeDossierTab === 'mindmaps'
                  ? 'bg-[#e0d0ab] text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/60'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Visual Decision Mind Maps ({selectedPillar.mindMaps.length})
            </button>

            <button
              onClick={() => setActiveDossierTab('pyq-evidence')}
              className={`px-4 py-2 rounded-sm text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeDossierTab === 'pyq-evidence'
                  ? 'bg-[#e0d0ab] text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Exam Relevance & Examiner Traps ({selectedPillar.pyqEvidence.length})
            </button>

            <button
              onClick={() => setActiveDossierTab('mains-blueprints')}
              className={`px-4 py-2 rounded-sm text-xs font-sans font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeDossierTab === 'mains-blueprints'
                  ? 'bg-[#e0d0ab] text-zinc-950 font-bold shadow-sm'
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
                {selectedPillar.foundationalConcepts.map((concept, idx) => (
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
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        Core Diagnostic Standard
                      </span>
                    </div>

                    <p className="text-sm text-zinc-300 font-sans leading-relaxed">
                      {concept.coreTheory}
                    </p>

                    {/* Critical Provisions */}
                    <div className="space-y-2.5 pt-1">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-[#e0d0ab] font-bold">
                        Critical Constitutional & Statutory Anchors
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
                          Examiner Angle & Elimination Trap:
                        </span>
                        <span className="leading-relaxed">{concept.examinerPerspective}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── TAB 2: INTERACTIVE VISUAL MIND MAPS ── */}
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

            {/* ── TAB 3: 25-YEAR EMPIRICAL FREQUENCY & HEATMAP ── */}
            {activeDossierTab === 'pyq-evidence' && (
              <div className="space-y-6">
                <div className="p-4 rounded-sm bg-zinc-900/60 border border-zinc-800 text-xs font-sans text-zinc-300 leading-relaxed">
                  <span className="font-mono font-bold text-[#e0d0ab] block mb-1 uppercase tracking-wider text-[10px]">
                    Exam Relevance & Distractor Analysis:
                  </span>
                  Themes are editorially prioritized by syllabus weightage and recurring examination patterns. Cognitive traps highlight common distractors used by examiners to test conceptual boundary limits.
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
                        <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                          Editorial Priority: {ev.testabilityScore}
                        </span>
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

            {/* ── TAB 4: MAINS ANSWER STRUCTURE BLUEPRINTS ── */}
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
    </div>
  );
}
