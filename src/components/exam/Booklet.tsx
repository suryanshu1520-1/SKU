import React from 'react';
import type { PaperItem, ItemResult, OptionKey, Confidence, RulesPreset, ResponseSheet } from './types';
import { pageNumberAfter } from './lib/itemLayout';
import { BookletItem, type BookletHandlers } from './BookletItem';

export interface BookletProps {
  items: PaperItem[];
  mode: 'sitting' | 'review';
  rules: RulesPreset;
  sheet?: ResponseSheet; // sitting
  results?: Record<string, ItemResult>; // review
  explanations?: Record<string, string>; // review
  activeQid: string | null;
  graceQids: ReadonlySet<string>;
  handlers?: BookletHandlers;
  registerItem?: (qid: string, el: HTMLElement | null) => void;
}

const EMPTY_OPTIONS: readonly OptionKey[] = Object.freeze([]);

export const Booklet: React.FC<BookletProps> = ({
  items,
  mode,
  rules,
  sheet,
  results,
  explanations,
  activeQid,
  graceQids,
  handlers,
  registerItem,
}) => {
  return (
    <section
      aria-label="Question booklet"
      className="rounded-md border border-[var(--eh-paper-edge)] bg-[var(--eh-paper)] text-[var(--eh-ink)] shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.35)] px-5 py-6 sm:px-10 sm:py-10 font-serif text-base lg:text-[17px] leading-[1.65]"
    >
      {items.map((item) => {
        const qid = item.qid;
        const page = pageNumberAfter(item.n);

        let bubbled: OptionKey[];
        let circled: OptionKey | null;
        let struck: OptionKey[];
        let confidence: Confidence | null;
        let flagged: boolean;
        let isActive: boolean;
        let inGrace: boolean;
        let result: ItemResult | undefined;
        let explanation: string | undefined;

        if (mode === 'sitting') {
          bubbled = sheet?.bubbles[qid] ?? (EMPTY_OPTIONS as OptionKey[]);
          circled = sheet?.circled[qid] ?? null;
          struck = sheet?.struck[qid] ?? (EMPTY_OPTIONS as OptionKey[]);
          confidence = sheet?.confidence[qid] ?? null;
          flagged = Boolean(sheet?.flagged[qid]);
          isActive = qid === activeQid;
          inGrace = graceQids.has(qid);
        } else {
          result = results?.[qid];
          bubbled = result?.bubbled ?? (EMPTY_OPTIONS as OptionKey[]);
          circled = result?.circled ?? null;
          struck = result?.struck ?? (EMPTY_OPTIONS as OptionKey[]);
          confidence = result?.confidence ?? null;
          flagged = result?.flagged ?? false;
          explanation = explanations?.[qid];
          isActive = qid === activeQid;
          inGrace = false;
        }

        return (
          <React.Fragment key={qid}>
            <BookletItem
              item={item}
              mode={mode}
              rules={rules}
              bubbled={bubbled}
              circled={circled}
              struck={struck}
              confidence={confidence}
              flagged={flagged}
              isActive={isActive}
              inGrace={inGrace}
              handlers={handlers}
              result={result}
              explanation={explanation}
              registerItem={registerItem}
            />
            {page !== null && (
              <div
                aria-hidden="true"
                className="text-center font-mono text-[11px] text-[var(--eh-ink-faint)] pt-3.5 pb-0.5"
              >
                — {page} —
              </div>
            )}
          </React.Fragment>
        );
      })}
    </section>
  );
};
