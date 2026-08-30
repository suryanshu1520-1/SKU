import React, { useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { AlertTriangle, Target, Lightbulb, CheckCircle2 } from 'lucide-react';

export interface StructuredInsight {
  conceptualExplanation?: string;
  examinerTrap?: string;
  eliminationTip?: string;
  highYieldNotes?: string[];
  syllabusNode?: string;
  overview?: string;
  rawText?: string;
}

/**
 * Normalizes any explanation/insight data structure (object, JSON string, markdown, plain text)
 * into a clean, deterministic structured representation and markdown text.
 */
export function parseInsightContent(raw: any, fallbackText?: string): {
  structured: StructuredInsight | null;
  displayText: string;
  hasStructure: boolean;
} {
  if (!raw && !fallbackText) {
    return { structured: null, displayText: '', hasStructure: false };
  }

  let data = raw;

  // If string, check if it's stringified JSON
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        data = JSON.parse(trimmed);
      } catch {
        // Leave as plain string
      }
    }
  }

  // If data is an object, extract structured fields
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const conceptualExplanation =
      data.conceptual_explanation ||
      data.conceptualExplanation ||
      data.explanation ||
      data.core ||
      data.overview ||
      data.why_correct ||
      (typeof data.overallInsights === 'string' ? data.overallInsights : '') ||
      fallbackText ||
      '';

    const examinerTrap =
      data.examiner_trap ||
      data.examinerTrap ||
      data.trap ||
      data.trap_analysis ||
      data.trapAnalysis ||
      '';

    const eliminationTip =
      data.elimination_tip ||
      data.eliminationTip ||
      data.elimination ||
      data.heuristic ||
      '';

    const highYieldNotes = Array.isArray(data.high_yield_notes)
      ? data.high_yield_notes
      : Array.isArray(data.highYieldNotes)
      ? data.highYieldNotes
      : Array.isArray(data.notes)
      ? data.notes
      : typeof data.high_yield_notes === 'string'
      ? [data.high_yield_notes]
      : [];

    const syllabusNode =
      data.syllabus_node ||
      data.syllabusNode ||
      data.syllabus ||
      data.topic ||
      '';

    const hasStructure = Boolean(examinerTrap || eliminationTip || highYieldNotes.length > 0 || syllabusNode);

    // Build unified text representation for markdown / text consumers
    let combinedText = conceptualExplanation ? `${conceptualExplanation}\n\n` : '';
    if (examinerTrap) {
      combinedText += `> ⚠️ **Examiner Trap:** ${examinerTrap}\n\n`;
    }
    if (eliminationTip) {
      combinedText += `> 🎯 **Elimination Angle:** ${eliminationTip}\n\n`;
    }
    if (highYieldNotes.length > 0) {
      combinedText += `**High-Yield Takeaways:**\n${highYieldNotes.map((n: string) => `- ${n}`).join('\n')}\n\n`;
    }

    return {
      structured: {
        conceptualExplanation,
        examinerTrap,
        eliminationTip,
        highYieldNotes,
        syllabusNode,
        overview: data.overview,
        rawText: combinedText.trim(),
      },
      displayText: combinedText.trim() || fallbackText || '',
      hasStructure,
    };
  }

  // If data is a plain string
  const str = String(data || fallbackText || '').trim();
  return {
    structured: fallbackText ? { conceptualExplanation: fallbackText, rawText: str } : null,
    displayText: str,
    hasStructure: false,
  };
}

/**
 * Format any insight payload into clean plaintext/markdown for bookmarking or clipboard
 */
export function formatInsightToText(raw: any, fallbackText?: string): string {
  const { displayText } = parseInsightContent(raw, fallbackText);
  return displayText;
}

interface ConceptInsightRendererProps {
  content?: any;
  fallbackText?: string;
  className?: string;
  showBadges?: boolean;
}

export const ConceptInsightRenderer: React.FC<ConceptInsightRendererProps> = ({
  content,
  fallbackText,
  className = '',
  showBadges = true,
}) => {
  const parsed = useMemo(
    () => parseInsightContent(content, fallbackText),
    [content, fallbackText]
  );

  if (!parsed.displayText && !parsed.structured) {
    return (
      <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-sm text-xs font-sans text-zinc-500 italic">
        No conceptual explanation available for this question.
      </div>
    );
  }

  const { structured, displayText, hasStructure } = parsed;

  if (hasStructure && structured && showBadges) {
    return (
      <div className={`space-y-3.5 ${className}`}>
        {/* Syllabus / Domain Node Tag if available */}
        {structured.syllabusNode && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-xs bg-[#0194a8]/10 border border-[#0194a8]/30 text-[#0194a8] font-mono text-[10px] font-bold uppercase tracking-wider">
              {structured.syllabusNode}
            </span>
          </div>
        )}

        {/* Primary Conceptual Explanation */}
        {structured.conceptualExplanation && (
          <div className="prose prose-invert prose-p:text-xs sm:prose-p:text-sm prose-p:leading-relaxed max-w-none text-zinc-200 font-serif">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {structured.conceptualExplanation}
            </Markdown>
          </div>
        )}

        {/* Examiner Trap Pitfall Box */}
        {structured.examinerTrap && (
          <div className="p-3.5 rounded-sm bg-rose-950/20 border border-rose-500/30 text-xs text-rose-200/90 font-sans space-y-1">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10.5px] text-rose-400 font-mono">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Examiner Trap & Cognitive Pitfall</span>
            </div>
            <p className="m-0 text-stone-200 leading-relaxed text-xs sm:text-[13px]">
              {structured.examinerTrap}
            </p>
          </div>
        )}

        {/* Elimination Angle / Tactical Tip */}
        {structured.eliminationTip && (
          <div className="p-3.5 rounded-sm bg-[#0194a8]/10 border border-[#0194a8]/30 text-xs text-cyan-200/90 font-sans space-y-1">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10.5px] text-[#0194a8] font-mono">
              <Target className="w-3.5 h-3.5 text-[#0194a8] shrink-0" />
              <span>Elimination Angle & Heuristic</span>
            </div>
            <p className="m-0 text-stone-200 leading-relaxed text-xs sm:text-[13px]">
              {structured.eliminationTip}
            </p>
          </div>
        )}

        {/* High-Yield Notes */}
        {structured.highYieldNotes && structured.highYieldNotes.length > 0 && (
          <div className="p-3.5 rounded-sm bg-zinc-900/60 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#e0d0ab]">
              <Lightbulb className="w-3.5 h-3.5 text-[#e0d0ab] shrink-0" />
              <span>High-Yield Retention Notes</span>
            </div>
            <ul className="m-0 p-0 list-none space-y-1.5">
              {structured.highYieldNotes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-stone-300 font-sans leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#e0d0ab] shrink-0 mt-0.5 opacity-80" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Standard Markdown rendering with GFM + Sanitize
  return (
    <div className={`prose prose-invert prose-p:text-xs sm:prose-p:text-sm prose-p:leading-relaxed prose-li:text-xs sm:prose-li:text-sm prose-strong:text-[#e0d0ab] max-w-none text-zinc-200 font-serif leading-relaxed ${className}`}>
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {displayText}
      </Markdown>
    </div>
  );
};
