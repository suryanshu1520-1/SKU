import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Compass,
  Layers,
  ExternalLink,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Bookmark,
  Share2,
  Search,
  Filter,
  Flame,
  Swords,
  GraduationCap,
  FileText,
  Copy,
  Check
} from 'lucide-react';
import catalogData from '../data/upsc-resources-catalog.json';
import questionsData from '../data/static-subject-questions.json';

interface StaticLibraryProps {
  onLaunchPractice?: (subjectCategory: string) => void;
  onNavigateArena?: () => void;
}

export default function StaticLibrary({ onLaunchPractice, onNavigateArena }: StaticLibraryProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('polity');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPaperFilter, setSelectedPaperFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'subjects' | 'resources' | 'pyqs'>('subjects');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<number | null>(null);

  const subjects = catalogData.subjects || [];
  const resources = catalogData.resources || [];
  const questions = questionsData.questions || [];

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesPaper = selectedPaperFilter === 'ALL' || s.paper === selectedPaperFilter;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.keyThemes.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPaper && matchesSearch;
  });

  const filteredResources = resources.filter((r) => {
    const matchesPaper = selectedPaperFilter === 'ALL' || r.paper === selectedPaperFilter || r.paper === 'General';
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesPaper && matchesSearch;
  });

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.subject_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.conceptual_explanation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Top Header & Context Banner */}
      <div className="relative border border-zinc-800/80 bg-zinc-900/40 p-6 md:p-8 rounded-sm overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e0d0ab]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/20">
                UPSC Knowledge Engine
              </span>
              <span className="text-zinc-500 text-xs font-mono">MIT Curated Core</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-100 tracking-tight">
              Static GS Knowledge Vault & PYQ Arena
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans">
              Curated conceptual frameworks, mind maps, canonical textbooks, and authentic previous-year question sets spanning GS Papers 1–4 and CSAT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateArena && onNavigateArena()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#e0d0ab] hover:bg-[#ebdcb7] text-zinc-950 rounded-sm text-xs font-sans font-semibold tracking-wide transition-all shadow-lg cursor-pointer"
            >
              <Swords className="w-4 h-4" />
              Launch Test Arena
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 border-t border-zinc-800/60 pt-4 mt-6">
          <button
            onClick={() => setActiveTab('subjects')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm text-xs font-sans font-medium transition-all cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-zinc-800 text-[#e0d0ab] border border-zinc-700'
                : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Subject Modules ({subjects.length})
          </button>
          <button
            onClick={() => setActiveTab('pyqs')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm text-xs font-sans font-medium transition-all cursor-pointer ${
              activeTab === 'pyqs'
                ? 'bg-zinc-800 text-[#e0d0ab] border border-zinc-700'
                : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            PYQ & Static Bank ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-sm text-xs font-sans font-medium transition-all cursor-pointer ${
              activeTab === 'resources'
                ? 'bg-zinc-800 text-[#e0d0ab] border border-zinc-700'
                : 'text-zinc-400 hover:text-stone-200 hover:bg-zinc-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Curated Resources & GPTs ({resources.length})
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects, articles, topics..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 focus:border-[#e0d0ab]/50 text-stone-100 placeholder-zinc-500 rounded-sm text-xs outline-none transition-all"
          />
        </div>

        {/* Paper Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'GS1', 'GS2', 'GS3', 'GS4', 'CSAT'].map((paper) => (
            <button
              key={paper}
              onClick={() => setSelectedPaperFilter(paper)}
              className={`px-3 py-1 rounded-sm text-xs font-mono transition-all cursor-pointer ${
                selectedPaperFilter === paper
                  ? 'bg-[#e0d0ab] text-zinc-950 font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-stone-200 border border-zinc-800'
              }`}
            >
              {paper}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Areas */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Subject Navigation List (Left column) */}
          <div className="lg:col-span-4 space-y-2">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500 px-1 mb-3">
              Core GS Subject Pillars
            </h3>
            {filteredSubjects.map((sub) => {
              const isSelected = sub.id === selectedSubjectId;
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`p-4 rounded-sm border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 border-[#e0d0ab]/40 shadow-md ring-1 ring-[#e0d0ab]/20'
                      : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#e0d0ab]">
                      {sub.paper}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {sub.keyThemes.length} Key Themes
                    </span>
                  </div>
                  <h4 className="font-serif font-semibold text-stone-100 text-sm mt-1">
                    {sub.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                    {sub.overview}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Detailed Subject Viewer (Right column) */}
          <div className="lg:col-span-8">
            {selectedSubject && (
              <div className="border border-zinc-800 bg-zinc-900/50 p-6 md:p-8 rounded-sm space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/20">
                        {selectedSubject.paper}
                      </span>
                      {selectedSubject.syllabusNodeId && (
                        <span className="text-[10px] font-mono text-zinc-400">
                          {selectedSubject.syllabusNodeId}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-stone-100 mt-1.5">
                      {selectedSubject.title}
                    </h2>
                  </div>

                  <button
                    onClick={() => {
                      if (onLaunchPractice) {
                        onLaunchPractice(selectedSubject.title);
                      } else if (onNavigateArena) {
                        onNavigateArena();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-[#e0d0ab] text-[#e0d0ab] hover:text-zinc-950 border border-zinc-700 hover:border-[#e0d0ab] rounded-sm text-xs font-sans font-medium transition-all cursor-pointer self-start md:self-auto shadow-sm"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Drill {selectedSubject.title.split(' ')[0]} MCQs
                  </button>
                </div>

                {/* Overview */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Syllabus Scope & Strategic Importance
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                    {selectedSubject.overview}
                  </p>
                </div>

                {/* Core Themes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    High-Yield Conceptual Pillars
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {selectedSubject.keyThemes.map((theme, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-sm bg-zinc-950/70 border border-zinc-800/80"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#e0d0ab] shrink-0 mt-0.5" />
                        <span className="text-xs text-zinc-300 font-sans leading-snug">
                          {theme}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mind Maps & Visual Anchors */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Visual Revision & Mind Map Nodes
                  </h4>
                  <div className="space-y-2">
                    {selectedSubject.mindMapHighlights.map((mm, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-sm bg-zinc-950/50 border border-zinc-800 text-xs text-stone-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e0d0ab]" />
                          <span>{mm}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">Obsidian Vault Node</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Canonical Sources */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500">
                    Recommended Canonical Textbooks & Primary Sources
                  </h4>
                  <ul className="space-y-1.5 text-xs text-zinc-400 font-sans">
                    {selectedSubject.recommendedSources.map((source, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="text-[#e0d0ab]">•</span>
                        <span>{source}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PYQ & Static Question Bank Tab */}
      {activeTab === 'pyqs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Authentic UPSC CSE Prelims & Practice Questions
            </h3>
            <span className="text-xs font-mono text-zinc-500">
              Showing {filteredQuestions.length} questions
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredQuestions.map((q, idx) => {
              const isExpanded = expandedQuestionId === idx;
              return (
                <div
                  key={idx}
                  className="border border-zinc-800 bg-zinc-900/40 p-5 md:p-6 rounded-sm space-y-4 transition-all hover:border-zinc-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-stone-300 border border-zinc-700">
                        {q.exam_origin_tag} {q.year ? `(${q.year})` : ''}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/20">
                        {q.subject_category}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      Difficulty: {q.difficulty_level}
                    </span>
                  </div>

                  <p className="text-sm text-stone-100 font-serif whitespace-pre-line leading-relaxed">
                    {q.question_text}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                    {Object.entries(q.options_matrix).map(([optKey, optVal]) => {
                      const isCorrect = isExpanded && optKey === q.correct_option;
                      return (
                        <div
                          key={optKey}
                          className={`p-3 rounded-sm text-xs font-sans border transition-all ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                              : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300'
                          }`}
                        >
                          <span className="font-mono font-bold mr-2 text-[#e0d0ab]">
                            ({optKey})
                          </span>
                          <span>{optVal}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                    <button
                      onClick={() => setExpandedQuestionId(isExpanded ? null : idx)}
                      className="text-xs font-mono text-[#e0d0ab] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? 'Hide Conceptual Autopsy' : 'Reveal Answer & Detailed Analysis'}
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {isExpanded && (
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        Correct: Option ({q.correct_option})
                      </span>
                    )}
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 rounded-sm bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-sans text-zinc-300 leading-relaxed"
                    >
                      <span className="font-mono font-bold text-[#e0d0ab] block uppercase text-[10px] tracking-wider">
                        Conceptual Explanation & Constitutional Evidence:
                      </span>
                      <p>{q.conceptual_explanation}</p>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Curated External Resources & GPTs Tab */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Verified External Knowledge Sources & AI Tools
            </h3>
            <span className="text-xs font-mono text-zinc-500">
              {filteredResources.length} Curated Repositories
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((res, idx) => (
              <div
                key={idx}
                className="border border-zinc-800 bg-zinc-900/40 p-5 rounded-sm flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-all group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-[#e0d0ab] border border-zinc-700">
                      {res.category}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      {res.sourceType.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-stone-100 text-sm group-hover:text-[#e0d0ab] transition-colors">
                    {res.title}
                  </h4>

                  <p className="text-xs text-zinc-400 leading-relaxed font-sans line-clamp-3">
                    {res.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {res.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-400 rounded-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                  <button
                    onClick={() => handleCopy(res.url)}
                    className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-stone-200 cursor-pointer"
                    title="Copy resource URL"
                  >
                    {copiedUrl === res.url ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-mono font-medium text-[#e0d0ab] hover:underline"
                  >
                    <span>Open Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
