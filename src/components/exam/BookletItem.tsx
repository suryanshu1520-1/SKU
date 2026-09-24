import React, { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Strikethrough, Flag } from 'lucide-react';
import type { PaperItem, ItemResult, OptionKey, Confidence, RulesPreset } from './types';
import { OPTIONS, SUBJECT_LABELS } from './types';
import { normalizeStemMarkdown, optionLayout } from './lib/itemLayout';
import { formatDuration } from './lib/clock';

export interface BookletHandlers {
  onChoose: (qid: string, key: OptionKey) => void;
  onStrike: (qid: string, key: OptionKey) => void;
  onTag: (qid: string, c: Confidence) => void;
  onFlag: (qid: string) => void;
  onTransfer: (qid: string) => void;
  onUndo: (qid: string) => void;
  onBubble: (qid: string, key: OptionKey) => void;
  onActivate: (qid: string) => void;
}

export interface BookletItemProps {
  item: PaperItem;
  mode: 'sitting' | 'review';
  rules: RulesPreset;
  bubbled: OptionKey[];
  circled: OptionKey | null;
  struck: OptionKey[];
  confidence: Confidence | null;
  flagged: boolean;
  isActive: boolean;
  inGrace: boolean;
  handlers?: BookletHandlers; // required in sitting mode
  result?: ItemResult; // required in review mode
  explanation?: string; // review mode
  registerItem?: (qid: string, el: HTMLElement | null) => void;
}

const CONFIDENCE_OPTIONS: readonly { key: Confidence; label: string }[] = [
  { key: 'sure', label: 'Sure' },
  { key: 'fifty', label: '50:50' },
  { key: 'guess', label: 'Guess' },
];

export const BookletItem = memo(function BookletItem({
  item,
  mode,
  rules,
  bubbled,
  circled,
  struck,
  confidence,
  flagged,
  isActive,
  inGrace,
  handlers,
  result,
  explanation,
  registerItem,
}: BookletItemProps) {
  const isGrid = optionLayout(item.options) === 'grid';

  return (
    <article
      id={`q-${item.n}`}
      tabIndex={-1}
      aria-labelledby={`q-${item.n}-label`}
      ref={(el) => registerItem?.(item.qid, el)}
      onPointerDown={() => handlers?.onActivate(item.qid)}
      onFocusCapture={() => handlers?.onActivate(item.qid)}
      className={`relative grid grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[2.5rem_minmax(0,1fr)] py-[18px] scroll-mt-[168px] md:scroll-mt-[72px] focus:outline-none ${
        isActive
          ? "before:content-[''] before:absolute before:-left-3 sm:before:-left-5 before:top-[22px] before:bottom-[22px] before:w-0.5 before:rounded before:bg-[var(--eh-print)]"
          : ''
      }`}
    >
      <div className="font-semibold tabular-nums select-none">
        <span aria-hidden="true">{item.n}.</span>
        <h3 id={`q-${item.n}-label`} className="sr-only">
          Question {item.n}
        </h3>
      </div>

      <div>
        {mode === 'review' && result && (
          <div className="font-sans text-[12.5px] text-[var(--eh-ink-soft)] flex flex-wrap gap-x-3.5 gap-y-1 mb-1">
            {result.verdict === 'correct' && (
              <span className="font-mono font-bold text-[var(--eh-correct)]">+2.00</span>
            )}
            {result.verdict === 'wrong' && (
              <span className="font-mono font-bold text-[var(--eh-danger)]">−0.66</span>
            )}
            {result.verdict === 'invalid' && (
              <span className="font-mono font-bold text-[var(--eh-danger)]">−0.66 · invalid</span>
            )}
            {result.verdict === 'blank' && (
              <span className="font-mono font-bold">0.00 · blank</span>
            )}
            <span>
              UPSC {result.year} · {SUBJECT_LABELS[result.subject] ?? result.subject}
              {result.dwellSeconds > 0
                ? ` · ${formatDuration(result.dwellSeconds)} on this question`
                : ''}
            </span>
          </div>
        )}

        <div className="eh-stem max-w-[68ch]">
          <Markdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              table: ({ node, ...props }: any) => (
                <div className="overflow-x-auto">
                  <table {...props} />
                </div>
              ),
            }}
          >
            {normalizeStemMarkdown(item.stem)}
          </Markdown>
        </div>

        <div
          className={
            isGrid
              ? 'mt-2.5 grid gap-x-6 gap-y-0.5 sm:grid-cols-2'
              : 'mt-2.5 grid gap-y-0.5'
          }
        >
          {OPTIONS.map((optKey, idx) => {
            const text = item.options[idx];
            const lower = optKey.toLowerCase();
            const isStruck = struck.includes(optKey);
            const isBubbled = bubbled.includes(optKey);
            const isCircled = circled === optKey;

            if (mode === 'review') {
              const isCorrect = result?.key === optKey;
              return (
                <div key={optKey} className="flex items-start gap-2">
                  <div
                    className={`flex flex-1 items-start gap-2.5 min-h-[44px] px-1.5 py-1 text-left rounded-md ${
                      isCorrect ? 'shadow-[inset_3px_0_0_var(--eh-correct)]' : ''
                    }`}
                  >
                    <span
                      className={`w-[30px] h-[30px] shrink-0 grid place-items-center rounded-full font-serif text-base text-[var(--eh-ink-soft)] transition-shadow ${
                        isBubbled
                          ? 'bg-[var(--eh-bubble-ink)] text-[var(--eh-bubble-letter)]'
                          : isCircled
                          ? 'shadow-[0_0_0_1.5px_var(--eh-pencil)] text-[var(--eh-ink)] font-semibold opacity-60'
                          : ''
                      }`}
                    >
                      ({lower})
                    </span>
                    <span
                      className={`pt-0.5 ${isCircled ? 'font-semibold opacity-60' : ''} ${
                        isStruck ? 'line-through text-[var(--eh-ink-faint)] opacity-60' : ''
                      }`}
                    >
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                        components={{ p: ({ node, ...props }: any) => <span {...props} /> }}
                      >
                        {text}
                      </Markdown>
                      {isCorrect && (
                        <span className="ml-2 inline-block rounded-full border border-[var(--eh-correct)] text-[var(--eh-correct)] px-1.5 text-[11px] font-semibold font-sans">
                          Correct answer
                        </span>
                      )}
                      {isBubbled && (
                        <span
                          className={`ml-2 inline-block rounded-full border px-1.5 text-[11px] font-semibold font-sans ${
                            result?.verdict === 'correct'
                              ? 'border-[var(--eh-correct)] text-[var(--eh-correct)]'
                              : 'border-[var(--eh-danger)] text-[var(--eh-danger)]'
                          }`}
                        >
                          Your answer
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              );
            }

            const isPressed = rules === 'exam_day' ? isCircled : isBubbled;

            return (
              <div key={optKey} className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => handlers?.onChoose(item.qid, optKey)}
                  aria-pressed={isPressed}
                  aria-describedby={`q-${item.n}-state`}
                  className="flex flex-1 items-start gap-2.5 min-h-[44px] px-1.5 py-1 text-left rounded-md hover:bg-[var(--eh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--eh-paper)]"
                >
                  <span
                    className={`w-[30px] h-[30px] shrink-0 grid place-items-center rounded-full font-serif text-base text-[var(--eh-ink-soft)] transition-shadow ${
                      isBubbled
                        ? 'bg-[var(--eh-bubble-ink)] text-[var(--eh-bubble-letter)]'
                        : isCircled
                        ? 'shadow-[0_0_0_1.5px_var(--eh-pencil)] text-[var(--eh-ink)] font-semibold'
                        : ''
                    }`}
                  >
                    ({lower})
                  </span>
                  <span
                    className={`pt-0.5 ${isCircled ? 'font-semibold' : ''} ${
                      isStruck ? 'line-through text-[var(--eh-ink-faint)] opacity-55' : ''
                    }`}
                  >
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeSanitize]}
                      components={{ p: ({ node, ...props }: any) => <span {...props} /> }}
                    >
                      {text}
                    </Markdown>
                  </span>
                </button>

                <button
                  type="button"
                  aria-pressed={isStruck}
                  aria-label={isStruck ? `Restore option ${lower}` : `Strike out option ${lower}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlers?.onStrike(item.qid, optKey);
                  }}
                  className="shrink-0 grid place-items-center w-11 h-11 lg:w-8 lg:h-8 rounded-md text-[var(--eh-ink-faint)] opacity-45 hover:opacity-100 focus-visible:opacity-100 aria-pressed:opacity-100 aria-pressed:text-[var(--eh-ink)]"
                >
                  <Strikethrough className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>

        {mode === 'sitting' && (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-2 font-sans text-xs text-[var(--eh-ink-soft)]">
              <div
                role="radiogroup"
                aria-label={`Confidence for question ${item.n}`}
                className="inline-flex rounded-full border border-[var(--eh-paper-edge)] overflow-hidden"
              >
                {CONFIDENCE_OPTIONS.map(({ key: confKey, label }) => {
                  const isChecked = confidence === confKey;
                  return (
                    <button
                      key={confKey}
                      type="button"
                      role="radio"
                      aria-checked={isChecked}
                      onClick={() => handlers?.onTag(item.qid, confKey)}
                      className={`px-2.5 py-1 transition-colors ${
                        isChecked
                          ? 'bg-[var(--eh-ink)] text-[var(--eh-paper)]'
                          : 'hover:bg-[var(--eh-hover)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                aria-pressed={flagged}
                onClick={() => handlers?.onFlag(item.qid)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 transition-colors ${
                  flagged
                    ? 'text-[var(--eh-flag)] border-[var(--eh-flag)]'
                    : 'border-[var(--eh-paper-edge)] hover:bg-[var(--eh-hover)]'
                }`}
              >
                <Flag className="w-3 h-3" aria-hidden="true" />
                <span>Revisit</span>
              </button>

              <span id={`q-${item.n}-state`} className="ml-auto inline-flex items-center gap-2">
                {bubbled.length >= 2 ? (
                  <span className="text-[var(--eh-danger)] font-semibold">
                    Invalid · two bubbles
                  </span>
                ) : bubbled.length === 1 ? (
                  <>
                    <span>On your sheet: ({bubbled[0].toLowerCase()})</span>
                    {inGrace && rules === 'exam_day' && (
                      <button
                        type="button"
                        onClick={() => handlers?.onUndo(item.qid)}
                        className="rounded-full bg-[var(--eh-ink)] text-[var(--eh-paper)] px-2.5 py-0.5 text-[11.5px] font-semibold inline-flex items-center gap-1"
                      >
                        Undo <kbd className="font-mono text-[10.5px] opacity-75">U</kbd>
                      </button>
                    )}
                  </>
                ) : rules === 'exam_day' && circled ? (
                  <>
                    <span className="text-[var(--eh-pencil-text)] font-semibold">
                      Circled ({circled.toLowerCase()}) · not on your sheet
                    </span>
                    <button
                      type="button"
                      onClick={() => handlers?.onTransfer(item.qid)}
                      className="rounded-full bg-[var(--eh-ink)] text-[var(--eh-paper)] px-2.5 py-0.5 text-[11.5px] font-semibold inline-flex items-center gap-1"
                    >
                      Bubble it <kbd className="font-mono text-[10.5px] opacity-75">↵</kbd>
                    </button>
                  </>
                ) : null}
              </span>
            </div>

            <div className="lg:hidden mt-3 flex items-center gap-3 rounded-lg border border-[var(--eh-paper-edge)] bg-[var(--eh-sheet)] px-3 py-2">
              <span className="font-sans text-[11px] uppercase tracking-[0.08em] text-[var(--eh-print)]">
                Answer sheet
              </span>
              <div
                role="radiogroup"
                aria-label={`Answer sheet, question ${item.n}`}
                className="ml-auto flex gap-2"
              >
                {OPTIONS.map((optKey) => {
                  const isFilled = bubbled.includes(optKey);
                  const lower = optKey.toLowerCase();
                  return (
                    <button
                      key={optKey}
                      type="button"
                      role="radio"
                      aria-checked={isFilled}
                      aria-label={`Question ${item.n} option ${lower}`}
                      onClick={() => handlers?.onBubble(item.qid, optKey)}
                      className="relative w-11 h-11 grid place-items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] focus-visible:ring-offset-1 rounded-full"
                    >
                      <span
                        className={`w-[30px] h-[30px] rounded-full border-[1.25px] font-mono text-xs flex items-center justify-center transition-transform ${
                          isFilled
                            ? 'bg-[var(--eh-bubble-ink)] border-[var(--eh-bubble-ink)] text-[var(--eh-bubble-letter)] eh-bubble-fill'
                            : 'border-[var(--eh-print)] text-[var(--eh-print)]'
                        }`}
                      >
                        {lower}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {mode === 'review' && (
          <div className="mt-3 pt-3 border-t border-[var(--eh-paper-edge)] text-[15px]">
            <div className="font-sans text-[11.5px] font-semibold text-[var(--eh-ink-faint)] mb-1.5">
              Explanation · written by Tark, not UPSC
            </div>
            {explanation && explanation.trim().length > 0 ? (
              <div className="eh-stem max-w-[68ch]">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    table: ({ node, ...props }: any) => (
                      <div className="overflow-x-auto">
                        <table {...props} />
                      </div>
                    ),
                  }}
                >
                  {explanation}
                </Markdown>
              </div>
            ) : (
              <p className="text-[var(--eh-ink-soft)] text-sm italic">
                No explanation in our bank for this question yet.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
});
