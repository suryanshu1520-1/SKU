import React, { useState } from 'react';
import {
  Pin,
  PinOff,
  Copy,
  Check,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import type { Passage, Thinker } from '../types/humanities';

interface PassageCardProps {
  passage: Passage;
  thinker: Thinker;
  index: number;
  isPinned: boolean;
  isHighlighted: boolean;
  onTogglePin: (passage: Passage) => void;
  searchQuery?: string;
  forwardRef?: (el: HTMLDivElement | null) => void;
}

export default function PassageCard({
  passage,
  thinker,
  index,
  isPinned,
  isHighlighted,
  onTogglePin,
  searchQuery = '',
  forwardRef,
}: PassageCardProps) {
  const [copied, setCopied] = useState(false);
  const [showCitationDetails, setShowCitationDetails] = useState(true);

  // Approximate reading time (approx 200 wpm)
  const wordCount = passage.text.trim().split(/\s+/).length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 180));

  const handleCopyFormattedQuote = async () => {
    const primaryCit = passage.pyqCitations[0];
    const citationString = primaryCit
      ? ` [UPSC CSE ${primaryCit.paper} ${primaryCit.year}]`
      : '';
    const formatted = `"${passage.text.trim()}"\n— ${thinker.name}, ${thinker.workTitle} (${thinker.year})${citationString}`;

    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy quote', err);
    }
  };

  // Highlight search term matches if active
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className="bg-[#e0d0ab] text-zinc-950 px-1 py-0.5 rounded-xs font-semibold not-italic"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      ref={forwardRef}
      id={`passage-${passage.id}`}
      className={`relative rounded-sm border p-5 md:p-7 transition-all duration-300 space-y-5 ${
        isHighlighted
          ? 'bg-zinc-900/95 border-[#e0d0ab] ring-2 ring-[#e0d0ab]/50 shadow-[0_12px_40px_rgba(7,46,99,0.9),0_0_24px_rgba(224,208,171,0.2)]'
          : isPinned
          ? 'bg-zinc-950/90 border-[#0194a8]/80 shadow-md'
          : 'bg-zinc-950/70 border-zinc-800/80 hover:border-zinc-700'
      }`}
    >
      {/* Corner filigree brackets */}
      <span className="absolute top-1.5 left-1.5 text-xs font-mono text-zinc-700 leading-none select-none">┌</span>
      <span className="absolute top-1.5 right-1.5 text-xs font-mono text-zinc-700 leading-none select-none">┐</span>
      <span className="absolute bottom-1.5 left-1.5 text-xs font-mono text-zinc-700 leading-none select-none">└</span>
      <span className="absolute bottom-1.5 right-1.5 text-xs font-mono text-zinc-700 leading-none select-none">┘</span>

      {/* Header bar: Section folio, word count, actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-zinc-900 border border-zinc-800 text-[#e0d0ab]">
            § {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-xs font-sans text-zinc-400">
            {thinker.shortName || thinker.name} · {thinker.workTitle}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
            ({wordCount} words · {readTimeMin} min read)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* 1-Click Copy Answer Quote */}
          <button
            type="button"
            onClick={handleCopyFormattedQuote}
            title="Copy formatted answer quotation for UPSC Ethics / Essay"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-sans font-medium transition-all cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-[#e0d0ab] border border-zinc-800"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-sans">Copied Quote</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Copy for Essay/Ethics</span>
                <span className="sm:hidden">Copy</span>
              </>
            )}
          </button>

          {/* Pin to Workbench button */}
          <button
            type="button"
            onClick={() => onTogglePin(passage)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-sans font-semibold transition-all cursor-pointer ${
              isPinned
                ? 'bg-[#e0d0ab] text-zinc-950 shadow-sm hover:bg-[#c8b998]'
                : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-stone-100 border border-zinc-800'
            }`}
          >
            {isPinned ? (
              <>
                <PinOff className="w-3.5 h-3.5" />
                <span>Pinned to Workbench</span>
              </>
            ) : (
              <>
                <Pin className="w-3.5 h-3.5 text-[#e0d0ab]" />
                <span>Pin to Workbench</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary Passage Text Body */}
      <div className="relative pl-1">
        <blockquote className="font-serif text-base md:text-lg text-stone-200 leading-[1.8] tracking-normal italic selection:bg-[#e0d0ab] selection:text-zinc-950">
          "{renderHighlightedText(passage.text.trim(), searchQuery)}"
        </blockquote>
      </div>

      {/* Citations & Syllabus Matrix Connector */}
      <div className="pt-2 border-t border-zinc-900/90 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-sans font-medium uppercase tracking-wider text-zinc-400">
              Exam Nexus:
            </span>
            {passage.pyqCitations.length === 0 ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-sans text-zinc-500 bg-zinc-950 border border-zinc-900">
                Foundational Canon (Contextual synthesis)
              </span>
            ) : (
              passage.pyqCitations.map((cit, cIdx) => (
                <div
                  key={cIdx}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-zinc-900 border border-zinc-800 text-[#e0d0ab]"
                >
                  <Calendar className="w-3 h-3 text-[#0194a8]" />
                  <span>
                    UPSC {cit.paper} ({cit.year})
                  </span>
                </div>
              ))
            )}
          </div>

          {passage.pyqCitations.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCitationDetails(!showCitationDetails)}
              className="text-[11px] font-sans text-zinc-400 hover:text-[#e0d0ab] transition-colors"
            >
              {showCitationDetails ? 'Hide examiner context' : 'Show examiner context'}
            </button>
          )}
        </div>

        {/* Detailed Examiner Note / Context Accordion */}
        {showCitationDetails && passage.pyqCitations.length > 0 && (
          <div className="p-3.5 rounded-sm bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
            {passage.pyqCitations.map((cit, idx) => (
              <div key={idx} className="space-y-1 text-xs font-sans">
                <div className="flex items-center gap-2 text-[#c8b998] font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-[#e0d0ab]" />
                  <span>Syllabus Correlation & Model Answer Application:</span>
                </div>
                <p className="text-zinc-300 leading-relaxed pl-5">
                  {cit.note ||
                    'Directly tested as a core ethical vector in UPSC Civil Services Examination.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
