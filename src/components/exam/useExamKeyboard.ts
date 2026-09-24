import { useEffect } from 'react';
import type { OptionKey, Confidence, RulesPreset } from './types';

export interface UseExamKeyboardOpts {
  enabled: boolean;
  rules: RulesPreset;
  onChoose: (key: OptionKey) => void;
  onStrike: (key: OptionKey) => void;
  onTransfer: () => void;
  onTag: (c: Confidence) => void;
  onFlag: () => void;
  onNext: () => void;
  onPrev: () => void;
  onUndo: () => void;
  onFocusSheet: () => void;
  onShortcuts: () => void;
}

const DIGIT_OR_KEY_TO_OPTION: Record<string, OptionKey> = {
  Digit1: 'A',
  Digit2: 'B',
  Digit3: 'C',
  Digit4: 'D',
  KeyA: 'A',
  KeyB: 'B',
  KeyC: 'C',
  KeyD: 'D',
};

export function useExamKeyboard({
  enabled,
  rules,
  onChoose,
  onStrike,
  onTransfer,
  onTag,
  onFlag,
  onNext,
  onPrev,
  onUndo,
  onFocusSheet,
  onShortcuts,
}: UseExamKeyboardOpts): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Digit1-4 or KeyA-D (or Shift + Digit1-4 / KeyA-D)
      const opt = DIGIT_OR_KEY_TO_OPTION[e.code];
      if (opt) {
        e.preventDefault();
        if (e.shiftKey) {
          onStrike(opt);
        } else {
          onChoose(opt);
        }
        return;
      }

      // Slash with Shift (?)
      if (e.code === 'Slash' && e.shiftKey) {
        e.preventDefault();
        onShortcuts();
        return;
      }

      // Unshifted single-key actions
      if (!e.shiftKey) {
        if (e.code === 'Enter') {
          if (rules === 'exam_day') {
            e.preventDefault();
            onTransfer();
          }
          return;
        }

        if (e.code === 'KeyS') {
          e.preventDefault();
          onTag('sure');
          return;
        }

        if (e.code === 'KeyF') {
          e.preventDefault();
          onTag('fifty');
          return;
        }

        if (e.code === 'KeyG') {
          e.preventDefault();
          onTag('guess');
          return;
        }

        if (e.code === 'KeyR') {
          e.preventDefault();
          onFlag();
          return;
        }

        if (e.code === 'KeyN' || e.code === 'KeyJ') {
          e.preventDefault();
          onNext();
          return;
        }

        if (e.code === 'KeyP' || e.code === 'KeyK') {
          e.preventDefault();
          onPrev();
          return;
        }

        if (e.code === 'KeyU') {
          e.preventDefault();
          onUndo();
          return;
        }

        if (e.code === 'KeyO') {
          e.preventDefault();
          onFocusSheet();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    rules,
    onChoose,
    onStrike,
    onTransfer,
    onTag,
    onFlag,
    onNext,
    onPrev,
    onUndo,
    onFocusSheet,
    onShortcuts,
  ]);
}
