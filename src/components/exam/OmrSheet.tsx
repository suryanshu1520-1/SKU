import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Flag, ChevronUp, X } from 'lucide-react';
import type { PaperItem, ResponseSheet, OptionKey, RulesPreset, Series } from './types';
import { OPTIONS } from './types';

export interface OmrSheetProps {
  items: PaperItem[];
  sheet: ResponseSheet;
  rules: RulesPreset;
  activeQid: string | null;
  roll: string;
  series: Series;
  pendingDouble: { qid: string; key: OptionKey } | null;
  hint: string | null;
  variant: 'panel' | 'sheet';
  onBubble: (qid: string, key: OptionKey) => void;
  onJump: (qid: string) => void;
  onConfirmDouble: () => void;
  onCancelDouble: () => void;
}

export const OmrSheet: React.FC<OmrSheetProps> = ({
  items,
  sheet,
  rules,
  activeQid,
  roll,
  series,
  pendingDouble,
  hint,
  variant,
  onBubble,
  onJump,
  onConfirmDouble,
  onCancelDouble,
}) => {
  const initialRow = Math.max(
    0,
    items.findIndex((it) => it.qid === activeQid)
  );
  const [focus, setFocus] = useState<{ row: number; col: number }>({
    row: initialRow >= 0 ? initialRow : 0,
    col: 0,
  });

  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bubbleRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll when activeQid changes without moving keyboard focus
  useEffect(() => {
    if (!activeQid) return;
    const idx = items.findIndex((it) => it.qid === activeQid);
    if (idx !== -1) {
      setFocus((prev) => ({ ...prev, row: idx }));
    }
    const el = rowRefs.current[activeQid];
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeQid, items]);

  // Handle outside click and Escape for the overwrite popover
  useEffect(() => {
    if (!pendingDouble) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onCancelDouble();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancelDouble();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [pendingDouble, onCancelDouble]);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newRow = focus.row;
      let newCol = focus.col;
      let handled = false;

      switch (e.key) {
        case 'ArrowUp':
          newRow = Math.max(0, focus.row - 1);
          handled = true;
          break;
        case 'ArrowDown':
          newRow = Math.min(items.length - 1, focus.row + 1);
          handled = true;
          break;
        case 'ArrowLeft':
          newCol = Math.max(0, focus.col - 1);
          handled = true;
          break;
        case 'ArrowRight':
          newCol = Math.min(OPTIONS.length - 1, focus.col + 1);
          handled = true;
          break;
        case 'Home':
          newRow = 0;
          handled = true;
          break;
        case 'End':
          newRow = items.length - 1;
          handled = true;
          break;
        case ' ':
        case 'Enter': {
          handled = true;
          const targetItem = items[focus.row];
          if (targetItem) {
            onBubble(targetItem.qid, OPTIONS[focus.col]);
          }
          break;
        }
      }

      if (handled) {
        e.preventDefault();
        if (newRow !== focus.row || newCol !== focus.col) {
          setFocus({ row: newRow, col: newCol });
          bubbleRefs.current[`${newRow}-${newCol}`]?.focus();
        }
      }
    },
    [focus, items, onBubble]
  );

  const isTwoCols = variant === 'panel' && items.length >= 50;
  const splitIdx = Math.ceil(items.length / 2);
  const col1Items = isTwoCols ? items.slice(0, splitIdx) : items;
  const col2Items = isTwoCols ? items.slice(splitIdx) : [];

  const renderRow = (item: PaperItem) => {
    const n = item.n;
    const qid = item.qid;
    const rowIndex = items.findIndex((it) => it.qid === qid);
    const bubbles = sheet.bubbles[qid] ?? [];
    const isInvalid = bubbles.length >= 2;
    const isCircled = Boolean(sheet.circled[qid]);
    const isFlagged = Boolean(sheet.flagged[qid]);
    const isRowBlank = bubbles.length === 0;
    const isActive = qid === activeQid;
    const isG5 = n % 5 === 0;
    const existingBubble = bubbles[0]?.toLowerCase() ?? 'a';

    return (
      <div
        key={qid}
        role="radiogroup"
        aria-label={`Answer sheet, question ${n}`}
        aria-invalid={isInvalid || undefined}
        ref={(el) => {
          rowRefs.current[qid] = el;
        }}
        className={`relative grid grid-cols-[24px_repeat(4,20px)_12px] items-center gap-[5px] h-[26px] pl-1 border-l-2 ${
          isActive
            ? 'bg-[var(--eh-print-faint)] border-l-[var(--eh-print)]'
            : 'border-l-transparent'
        } ${isG5 ? 'border-b border-[var(--eh-print-faint)]' : ''}`}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Go to question ${n}`}
          onClick={() => onJump(qid)}
          className={`font-mono text-[11px] text-right text-[var(--eh-print)] hover:underline ${
            isInvalid ? 'line-through text-[var(--eh-danger)]' : ''
          }`}
        >
          {n}
        </button>

        {OPTIONS.map((optKey, colIndex) => {
          const filled = bubbles.includes(optKey);
          const letter = optKey.toLowerCase();
          const isBubbleFocused = focus.row === rowIndex && focus.col === colIndex;

          return (
            <button
              key={optKey}
              ref={(el) => {
                bubbleRefs.current[`${rowIndex}-${colIndex}`] = el;
              }}
              type="button"
              role="radio"
              aria-checked={filled}
              aria-label={`Question ${n} option ${letter}`}
              tabIndex={isBubbleFocused ? 0 : -1}
              onClick={() => {
                setFocus({ row: rowIndex, col: colIndex });
                onBubble(qid, optKey);
              }}
              className="relative grid place-items-center w-5 h-5 rounded-full border-[1.25px] border-[var(--eh-print)] font-mono text-[10px] text-[var(--eh-print)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
            >
              {filled && (
                <span
                  aria-hidden
                  className="eh-bubble-fill absolute inset-0 rounded-full bg-[var(--eh-bubble-ink)]"
                />
              )}
              <span
                className={`relative ${
                  filled ? 'text-[var(--eh-bubble-letter)]' : 'text-[var(--eh-print)]'
                }`}
              >
                {letter}
              </span>
            </button>
          );
        })}

        <div className="flex items-center gap-0.5">
          {rules === 'exam_day' && isCircled && isRowBlank && (
            <span
              title="Circled in booklet"
              className="w-1.5 h-1.5 rounded-full shadow-[0_0_0_1.5px_var(--eh-pencil)]"
            />
          )}
          {isFlagged && (
            <span className="inline-flex items-center">
              <Flag className="w-[9px] h-[9px] text-[var(--eh-flag)]" aria-hidden="true" />
              <span className="sr-only">Revisit</span>
            </span>
          )}
        </div>

        {pendingDouble?.qid === qid && (
          <div
            ref={popoverRef}
            role="alertdialog"
            aria-labelledby={`double-dialog-${n}`}
            className="absolute z-20 left-8 top-7 w-64 rounded-lg border border-border bg-surface-elevated p-3 text-primary font-sans text-[12.5px] leading-snug shadow-2xl"
          >
            <p id={`double-dialog-${n}`} className="mb-2.5">
              Row {n} already has ({existingBubble}). A second bubble makes this answer invalid and it will be marked wrong (−0.66).
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                autoFocus
                onClick={onCancelDouble}
                className="flex-1 px-2 py-1.5 rounded bg-[#e0d0ab] text-[#050b1a] font-semibold text-xs text-center hover:bg-[#f4ecd8]"
              >
                Keep ({existingBubble})
              </button>
              <button
                type="button"
                onClick={onConfirmDouble}
                className="flex-1 px-2 py-1.5 rounded border border-rose-500/50 text-rose-200 font-semibold text-xs text-center hover:bg-rose-500/10"
              >
                Add second bubble
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-md border border-[var(--eh-paper-edge)] bg-[var(--eh-sheet)] text-[var(--eh-ink)] px-3 pt-3.5 pb-3">
      <h2 className="font-sans text-[11px] font-semibold tracking-[0.14em] text-[var(--eh-print)]">
        ANSWER SHEET
      </h2>
      <p className="mt-1.5 mb-2.5 font-mono text-[11px] text-[var(--eh-print)]">
        Roll {roll} · Series {series} · GS-I
      </p>

      <div
        tabIndex={-1}
        onKeyDown={handleGridKeyDown}
        className="focus:outline-none"
        aria-label="Answer sheet grid"
      >
        {isTwoCols ? (
          <div className="grid grid-cols-2 gap-x-2.5">
            <div>{col1Items.map((item) => renderRow(item))}</div>
            <div>{col2Items.map((item) => renderRow(item))}</div>
          </div>
        ) : (
          <div>{col1Items.map((item) => renderRow(item))}</div>
        )}
      </div>

      <p
        aria-live="polite"
        className="mt-2 min-h-4 font-sans text-[11.5px] text-[var(--eh-pencil-text)]"
      >
        {hint}
      </p>

      <div className="mt-2.5 pt-2 border-t border-[var(--eh-print-faint)] flex flex-wrap gap-x-3 gap-y-1 font-sans text-[10.5px] text-[var(--eh-ink-soft)]">
        <span>Filled = answered</span>
        <span>Ring = circled in booklet</span>
        <span>Flag = revisit</span>
        <span>Struck number = invalid</span>
      </div>
    </div>
  );
};

export interface OmrBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bubbled: number;
  total: number;
  children: React.ReactNode;
}

export const OmrBottomSheet: React.FC<OmrBottomSheetProps> = ({
  open,
  onOpenChange,
  bubbled,
  total,
  children,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <>
      {/* Scrim backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Closed peek bar or open panel wrapper */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        {!open ? (
          <button
            type="button"
            aria-expanded={false}
            onClick={() => onOpenChange(true)}
            className="w-full h-14 flex items-center justify-between px-[18px] rounded-t-2xl border-t border-[var(--eh-paper-edge)] bg-[var(--eh-sheet)] text-[var(--eh-ink)] font-sans text-[13px] font-semibold pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.2)]"
          >
            <span>Answer sheet</span>
            <span className="font-medium text-[var(--eh-ink-soft)]">
              {bubbled}/{total} bubbled
            </span>
            <ChevronUp className="w-4 h-4 text-[var(--eh-ink-soft)]" aria-hidden="true" />
          </button>
        ) : (
          <div className="h-[75vh] rounded-t-2xl bg-[var(--eh-sheet)] border-t border-[var(--eh-paper-edge)] flex flex-col shadow-[0_-8px_32px_rgba(0,0,0,0.35)] transition-transform duration-[180ms] ease-out motion-reduce:transition-none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--eh-paper-edge)] shrink-0">
              <span className="font-sans text-sm font-semibold text-[var(--eh-ink)]">
                Answer sheet
              </span>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close answer sheet"
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-full grid place-items-center text-[var(--eh-ink-soft)] hover:bg-[var(--eh-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-y-auto px-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex-1">
              {children}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
