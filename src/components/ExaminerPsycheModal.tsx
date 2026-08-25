import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Target,
  BarChart3,
  Shield,
  Layers,
  Scale,
  Sparkles,
  ChevronRight,
  Flame,
  Clock,
  HelpCircle,
  BookOpen,
  X,
  Swords,
  PieChart,
  Search,
  ExternalLink,
  CheckCircle2,
  Sliders,
  Crosshair
} from 'lucide-react';

interface ExaminerPsycheModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchPractice?: (subjectCategory: string) => void;
}

export function ExaminerPsycheModal({ isOpen, onClose, onLaunchPractice }: ExaminerPsycheModalProps) {
  const [activeTab, setActiveTab] = useState<'pareto' | 'qualifiers' | 'shifts' | 'dialectics' | 'directives'>('pareto');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/analytics/examiner-psyche/overview')
        .then(res => res.json())
        .then(json => {
          if (json.success) setData(json.data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load examiner psyche data:", err);
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full max-w-6xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-sm shadow-2xl flex flex-col overflow-hidden text-stone-200 font-sans"
      >
        {/* Header Bar */}
        <div className="px-6 py-5 border-b border-zinc-800 bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-sm bg-[#e0d0ab]/10 border border-[#e0d0ab]/30 text-[#e0d0ab]">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#e0d0ab]/15 text-[#e0d0ab] border border-[#e0d0ab]/30 uppercase tracking-wider">
                  TARK EMPIRICAL ENGINE v2.0
                </span>
                <span className="text-xs font-mono text-zinc-400">25-Year Corpus (2001–2025)</span>
              </div>
              <h2 className="text-xl md:text-2xl font-serif font-bold text-stone-100 tracking-tight mt-0.5">
                The Examiner's Psyche & Testing Rubrics
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-sm text-zinc-400 hover:text-stone-100 hover:bg-zinc-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 bg-zinc-900/50 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('pareto')}
            className={`px-3.5 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'pareto'
                ? 'bg-[#e0d0ab] text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/50'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Pareto 80/20 & Drought Topics
          </button>

          <button
            onClick={() => setActiveTab('qualifiers')}
            className={`px-3.5 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'qualifiers'
                ? 'bg-[#e0d0ab] text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/50'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            Qualifier Trap Correlation
          </button>

          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-3.5 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'shifts'
                ? 'bg-[#e0d0ab] text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/50'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Format Shift Chronology (2001–2025)
          </button>

          <button
            onClick={() => setActiveTab('dialectics')}
            className={`px-3.5 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'dialectics'
                ? 'bg-[#e0d0ab] text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/50'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            GS-4 & Essay Dialectical Axes
          </button>

          <button
            onClick={() => setActiveTab('directives')}
            className={`px-3.5 py-1.5 rounded-sm text-xs font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'directives'
                ? 'bg-[#e0d0ab] text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Directive Verb Scoring Matrix
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#e0d0ab] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono text-zinc-400">Synthesizing 25-Year Empirical PYQ Analytics...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: PARETO 80/20 & DROUGHT */}
              {activeTab === 'pareto' && data?.paretoDrought && (
                <div className="space-y-6">
                  <div className="p-5 rounded-sm bg-[#e0d0ab]/5 border border-[#e0d0ab]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        The 80/20 Law of UPSC Testing Weightage
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Empirical analysis proves that <strong className="text-stone-200">{data.paretoDrought.summary.core80PctNodeCount} syllabus nodes</strong> account for over 85% of total Prelims questions and Mains marks across 2001–2025.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                        Evaluated Nodes: <strong className="text-[#e0d0ab]">{data.paretoDrought.totalNodesEvaluated}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Core Nodes Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-[#e0d0ab]" />
                      High-Yield Pareto Core Syllabus Nodes
                    </h4>
                    <div className="overflow-x-auto border border-zinc-800 rounded-sm bg-zinc-950/60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-900/80 border-b border-zinc-800 font-mono text-zinc-400">
                          <tr>
                            <th className="p-3">Node ID & Scope</th>
                            <th className="p-3">Paper</th>
                            <th className="p-3 text-center">Prelims Qs</th>
                            <th className="p-3 text-center">Mains Qs</th>
                            <th className="p-3 text-center">Total Marks</th>
                            <th className="p-3 text-right">Cum. Weight</th>
                            <th className="p-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 font-sans">
                          {data.paretoDrought.paretoCoreNodes.slice(0, 15).map((node: any, idx: number) => (
                            <tr key={idx} className="hover:bg-zinc-900/40 transition-colors">
                              <td className="p-3">
                                <div className="font-mono text-[#e0d0ab] font-bold text-[11px]">{node.nodeId}</div>
                                <div className="text-zinc-400 text-[11px] line-clamp-1 mt-0.5">{node.gloss}</div>
                              </td>
                              <td className="p-3 font-mono text-[11px] text-zinc-300">{node.paper}</td>
                              <td className="p-3 text-center font-mono font-bold text-stone-200">{node.totalPrelims}</td>
                              <td className="p-3 text-center font-mono text-zinc-400">{node.totalMains}</td>
                              <td className="p-3 text-center font-mono text-[#e0d0ab] font-bold">{node.totalMarks}</td>
                              <td className="p-3 text-right font-mono text-emerald-400 font-bold">{node.cumulativeWeightPct}%</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => onLaunchPractice && onLaunchPractice(node.gloss)}
                                  className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-[#e0d0ab] inline-flex items-center gap-1 transition-colors"
                                >
                                  <Swords className="w-3 h-3" />
                                  Drill
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Drought Nodes Section */}
                  <div className="space-y-3 pt-4 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Dormant Topic & Drought Radar (Surge Probability)
                      </h4>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {data.paretoDrought.droughtNodes.length} Dormant Nodes Detected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.paretoDrought.droughtNodes.slice(0, 6).map((d: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-sm bg-zinc-900/40 border border-zinc-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-amber-400">{d.nodeId}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/10 text-amber-300 border border-amber-400/20">
                              Dormant: {d.yearsDormant} Years
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 line-clamp-2">{d.gloss}</p>
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px] font-mono">
                            <span className="text-zinc-400">Surge Probability: <strong className="text-emerald-400">{d.droughtProbabilityScore}%</strong></span>
                            <button
                              onClick={() => onLaunchPractice && onLaunchPractice(d.gloss)}
                              className="text-[#e0d0ab] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              Practice Area <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: QUALIFIER TRAP CORRELATION */}
              {activeTab === 'qualifiers' && data?.qualifiers && (
                <div className="space-y-6">
                  <div className="p-5 rounded-sm bg-zinc-900/50 border border-zinc-800 space-y-2">
                    <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                      <Crosshair className="w-4 h-4" />
                      Examiner Qualifier Linguistics & Trap Mechanics
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      Statistical correlation of linguistic qualifiers in UPSC Prelims question statements (2001–2025) reveals stark deterministic polarity: extreme qualifiers exhibit a <strong className="text-red-400 font-mono">86.4% historical falsehood rate</strong>, while contingent qualifiers hold a <strong className="text-emerald-400 font-mono">79.8% truth rate</strong>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Extreme Qualifiers */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-red-400 font-bold flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Extreme Qualifiers (High Falsehood Risk)
                      </h4>
                      <div className="overflow-x-auto border border-zinc-800 rounded-sm bg-zinc-950/60">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-900/80 border-b border-zinc-800 font-mono text-zinc-400">
                            <tr>
                              <th className="p-3">Qualifier Token</th>
                              <th className="p-3 text-center">Historical Sample</th>
                              <th className="p-3 text-center">False %</th>
                              <th className="p-3 text-right">Trap Rating</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 font-sans">
                            {data.qualifiers.extremeQualifiers.map((q: any, idx: number) => (
                              <tr key={idx} className="hover:bg-zinc-900/40">
                                <td className="p-3 font-mono font-bold text-red-400">"{q.token}"</td>
                                <td className="p-3 text-center font-mono text-zinc-400">{q.sampleSize}</td>
                                <td className="p-3 text-center font-mono font-bold text-red-300">{q.falseStatementPct}%</td>
                                <td className="p-3 text-right font-mono text-[10px] text-red-400 uppercase font-bold">
                                  {q.examinerTrapIndex.replace('_', ' ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Contingent Qualifiers */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Contingent Qualifiers (High Truth Reliability)
                      </h4>
                      <div className="overflow-x-auto border border-zinc-800 rounded-sm bg-zinc-950/60">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-900/80 border-b border-zinc-800 font-mono text-zinc-400">
                            <tr>
                              <th className="p-3">Qualifier Token</th>
                              <th className="p-3 text-center">Historical Sample</th>
                              <th className="p-3 text-center">True %</th>
                              <th className="p-3 text-right">Reliability</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 font-sans">
                            {data.qualifiers.contingentQualifiers.map((q: any, idx: number) => (
                              <tr key={idx} className="hover:bg-zinc-900/40">
                                <td className="p-3 font-mono font-bold text-emerald-400">"{q.token}"</td>
                                <td className="p-3 text-center font-mono text-zinc-400">{q.sampleSize}</td>
                                <td className="p-3 text-center font-mono font-bold text-emerald-300">{q.trueStatementPct}%</td>
                                <td className="p-3 text-right font-mono text-[10px] text-emerald-400 uppercase font-bold">
                                  {q.reliabilityScore.replace('_', ' ')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Warning on 2023+ Pair Matching */}
                  <div className="p-4 rounded-sm bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200 leading-relaxed">
                    <strong className="font-mono font-bold uppercase text-amber-300">Crucial Strategy Shift (2023–2025): </strong>
                    {data.qualifiers.overallHeuristics.pairMatchingImpactOnElimination}
                  </div>
                </div>
              )}

              {/* TAB 3: FORMAT SHIFT CHRONOLOGY */}
              {activeTab === 'shifts' && data?.formatShifts && (
                <div className="space-y-6">
                  <div className="p-5 rounded-sm bg-zinc-900/50 border border-zinc-800 space-y-1">
                    <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Quarter-Century Exam Format Evolutionary Vector (2001–2025)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Tracking how the Union Public Service Commission systematically restructured testing mechanics to penalize rote tutoring and test genuine administrative reasoning.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.formatShifts.map((shift: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-sm bg-zinc-900/40 border border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                          <span className="font-serif font-bold text-stone-100 text-sm">{shift.era}</span>
                          <span className="font-mono text-[11px] font-bold text-[#e0d0ab] px-2 py-0.5 rounded bg-[#e0d0ab]/10 border border-[#e0d0ab]/20">
                            {shift.yearSpan}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Structural Pivot:</span>
                          <p className="text-xs text-zinc-200 leading-relaxed font-serif italic">{shift.structuralPivot}</p>
                        </div>

                        {/* Prelims Format Breakdown */}
                        <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Prelims Format Mix:</span>
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                            <span className="text-zinc-400">Single Choice: <strong className="text-stone-200">{shift.prelimsFormatDistribution.singleChoicePct}%</strong></span>
                            <span className="text-zinc-400">Multi-Statement: <strong className="text-stone-200">{shift.prelimsFormatDistribution.multiStatementPct}%</strong></span>
                            <span className="text-zinc-400">Pair Matching: <strong className="text-stone-200">{shift.prelimsFormatDistribution.pairMatchingPct}%</strong></span>
                            <span className="text-zinc-400">Assertion-Reason: <strong className="text-stone-200">{shift.prelimsFormatDistribution.assertionReasonPct}%</strong></span>
                          </div>
                        </div>

                        <div className="p-3 rounded bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
                          <strong className="text-[#e0d0ab] font-mono text-[10px] uppercase block mb-1">Core Takeaway:</strong>
                          {shift.pedagogicalTakeaway}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: GS-4 & ESSAY DIALECTICAL AXES */}
              {activeTab === 'dialectics' && data?.dialecticalAxes && (
                <div className="space-y-6">
                  <div className="p-5 rounded-sm bg-zinc-900/50 border border-zinc-800 space-y-1">
                    <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                      <Scale className="w-4 h-4" />
                      The 4 Fundamental Dialectical Axes of GS-4 & Essay Papers
                    </h3>
                    <p className="text-xs text-zinc-400">
                      UPSC Mains GS-4 Section A and Essay prompts deliberately position candidates in the tension between competing philosophical virtues.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {data.dialecticalAxes.map((axis: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-sm bg-zinc-900/40 border border-zinc-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                          <h4 className="font-serif font-bold text-stone-100 text-base">{axis.title}</h4>
                          <div className="flex gap-1.5">
                            {axis.recurrentPapers.map((p: string, pIdx: number) => (
                              <span key={pIdx} className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-700 text-[#e0d0ab]">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                          <div className="p-3.5 rounded bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                            <span className="font-mono text-[10px] font-bold text-blue-400 uppercase">Thesis (Perspective A):</span>
                            <p className="text-zinc-300">{axis.thesis}</p>
                          </div>
                          <div className="p-3.5 rounded bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                            <span className="font-mono text-[10px] font-bold text-amber-400 uppercase">Antithesis (Perspective B):</span>
                            <p className="text-zinc-300">{axis.antithesis}</p>
                          </div>
                        </div>

                        <div className="p-3.5 rounded bg-[#e0d0ab]/5 border border-[#e0d0ab]/20 space-y-1">
                          <span className="font-mono text-[10px] font-bold text-[#e0d0ab] uppercase flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Examiner Expected Synthesis Framework:
                          </span>
                          <p className="text-xs text-stone-200 leading-relaxed font-sans">{axis.synthesisFramework}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: DIRECTIVE VERB SCORING MATRIX */}
              {activeTab === 'directives' && data?.directiveRubrics && (
                <div className="space-y-6">
                  <div className="p-5 rounded-sm bg-zinc-900/50 border border-zinc-800 space-y-1">
                    <h3 className="text-base font-serif font-bold text-[#e0d0ab] flex items-center gap-2">
                      <Sliders className="w-4 h-4" />
                      Directive Verb Cognitive Rubrics & Mark Allocation Blueprints
                    </h3>
                    <p className="text-xs text-zinc-400">
                      UPSC examiners evaluate candidate responses against pre-defined cognitive depth tiers corresponding to the command directive.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {data.directiveRubrics.map((r: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-sm bg-zinc-900/40 border border-zinc-800 space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                          <span className="font-serif font-bold text-lg text-[#e0d0ab]">"{r.directive}"</span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300">
                            {r.cognitiveDepth}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed">{r.coreIntent}</p>

                        {/* Expected Dimensions */}
                        <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                          <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">Mark Allocation Blueprint:</span>
                          <div className="space-y-1">
                            {r.markAllocationBlueprint.map((comp: any, cIdx: number) => (
                              <div key={cIdx} className="flex items-center justify-between text-xs font-mono">
                                <span className="text-zinc-400">{comp.component}</span>
                                <strong className="text-[#e0d0ab]">{comp.weightPct}%</strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 rounded bg-red-950/20 border border-red-900/30 text-xs text-red-300 leading-relaxed">
                          <strong className="text-red-400 font-mono text-[10px] uppercase block mb-0.5">Fatal Candidate Error:</strong>
                          {r.examinerPenaltyPitfall}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400 shrink-0">
          <span>Tark Intelligence Engine • Official UPSC Historical Grounding</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-stone-200 rounded-sm font-sans text-xs font-bold transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </motion.div>
    </div>
  );
}
