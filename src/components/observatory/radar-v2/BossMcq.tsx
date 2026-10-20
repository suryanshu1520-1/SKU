/**
 * src/components/observatory/radar-v2/BossMcq.tsx
 *
 * Interactive Boss MCQ card evaluated strictly server-side.
 * Shows question statements, options, evaluation result, and dissection with evidence chips.
 * TASK_085Q
 */

import React, { useState } from "react";
import type { ProgramBossMcq } from "../../../lib/policy-radar-v2-types.ts";
import { sourceHref, sourceLabel } from "./sourceLink.ts";

interface BossMcqProps {
  mcq: ProgramBossMcq;
}

interface DissectionItem {
  n: number;
  is_true: boolean;
  operator: string | null;
  original?: string;
  replaced?: string;
  evidence: {
    quote: string;
    url: string;
  };
}

interface CheckResult {
  correct: boolean;
  correct_index: number;
  dissection: DissectionItem[];
}

export function BossMcq({ mcq }: BossMcqProps) {
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (selectedChoice === null) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/policy-radar/v2/boss-mcq/${mcq.id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice: selectedChoice }),
      });

      if (!res.ok) {
        throw new Error("Unable to check answer at this time");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setSubmitError(err.message || "Evaluation error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="p-5 rounded-lg bg-[rgba(4,18,40,0.7)] border border-[rgba(224,208,171,0.22)] space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-[rgba(224,208,171,0.12)] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#5fe3f5]" aria-hidden="true" />
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#e0d0ab]">
            Boss MCQ Evaluation
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#8fa2bd]">
          Edition {mcq.edition_date}
        </span>
      </div>

      {/* Question stem & statements */}
      <div className="space-y-2 text-sm text-[#f4ecd8] leading-relaxed whitespace-pre-line">
        {mcq.question}
      </div>

      {/* Options form */}
      <form onSubmit={handleCheck} className="space-y-3">
        <fieldset disabled={result !== null || isSubmitting} className="space-y-2">
          <legend className="sr-only">Answer Options</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {mcq.options.map((opt, idx) => {
              const isSelected = selectedChoice === idx;
              const isCorrectOpt = result && result.correct_index === idx;
              const isWrongSelected =
                result && !result.correct && isSelected;

              let borderCls = "border-[rgba(224,208,171,0.18)]";
              let bgCls = "bg-[#031124]/60 hover:bg-[#031124]";

              if (result) {
                if (isCorrectOpt) {
                  borderCls = "border-emerald-500/70 bg-emerald-950/30";
                } else if (isWrongSelected) {
                  borderCls = "border-red-500/70 bg-red-950/30";
                }
              } else if (isSelected) {
                borderCls = "border-[#5fe3f5] bg-[#0194a8]/20";
              }

              return (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded border text-xs font-mono cursor-pointer transition-colors ${borderCls} ${bgCls}`}
                >
                  <input
                    type="radio"
                    name={`mcq-${mcq.id}`}
                    value={idx}
                    checked={isSelected}
                    onChange={() => setSelectedChoice(idx)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                      isSelected
                        ? "border-[#5fe3f5] text-[#5fe3f5]"
                        : "border-[rgba(224,208,171,0.3)] text-[#8fa2bd]"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-[#e8e0cf]">{opt}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {!result && (
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={selectedChoice === null || isSubmitting}
              className="py-1.5 px-4 rounded bg-[#0194a8] hover:bg-[#0194a8]/80 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono text-[#041936] font-semibold transition-all cursor-pointer"
            >
              {isSubmitting ? "Checking..." : "Submit Answer"}
            </button>
            {submitError && (
              <span className="text-xs text-red-400 font-mono">
                {submitError}
              </span>
            )}
          </div>
        )}
      </form>

      {/* Dissection & Verification Result */}
      {result && (
        <div className="pt-3 border-t border-[rgba(224,208,171,0.12)] space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            {result.correct ? (
              <span className="px-2 py-0.5 rounded bg-emerald-900/60 border border-emerald-500/50 text-emerald-300 font-bold">
                Correct
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-red-900/60 border border-red-500/50 text-red-300 font-bold">
                Incorrect
              </span>
            )}
            <span className="text-[#8fa2bd]">
              Correct option: {String.fromCharCode(65 + result.correct_index)} (
              {mcq.options[result.correct_index]})
            </span>
          </div>

          {result.dissection && result.dissection.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-[#e0d0ab]">
                Statement Dissection
              </h4>
              <div className="space-y-2">
                {result.dissection.map((item) => {
                  const ev = item.evidence
                    ? { quote: item.evidence.quote, source_url: item.evidence.url }
                    : null;
                  const href = ev ? sourceHref(ev) : "";
                  const host = ev ? sourceLabel(ev.source_url) : "";

                  return (
                    <div
                      key={item.n}
                      className="p-2.5 rounded bg-[#031124]/50 border border-[rgba(224,208,171,0.1)] text-xs space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                            item.is_true
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-600/40"
                              : "bg-amber-950 text-amber-300 border border-amber-600/40"
                          }`}
                        >
                          Statement {item.n}: {item.is_true ? "True" : "False"}
                        </span>
                        {item.operator && (
                          <span className="font-mono text-[10px] text-[#5fe3f5] bg-[#0194a8]/10 px-1.5 py-0.5 rounded">
                            {item.operator}
                          </span>
                        )}
                      </div>

                      {item.evidence?.quote && (
                        <blockquote className="text-[11px] text-[#8fa2bd] italic pl-2 border-l border-[rgba(224,208,171,0.2)]">
                          "{item.evidence.quote}"
                        </blockquote>
                      )}

                      {href && (
                        <div className="pt-0.5">
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open source: ${host}`}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-[#5fe3f5] hover:underline"
                          >
                            <span>Source: {host}</span>
                            <span aria-hidden="true">↗</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default BossMcq;
