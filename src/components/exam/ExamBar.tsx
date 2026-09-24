import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MoreVertical } from 'lucide-react';
import type { SaveState, ExamPrefs, RulesPreset, Series } from './types';
import { formatTimeLeft } from './lib/clock';
import { primeBell } from './lib/bell';

export interface ExamBarProps {
  paperShortTitle: string; // PAPER_SHORT_TITLES[code]
  series: Series;
  hallTime: string;
  secondsLeft: number;
  totalQuestions: number;
  tallies: { bubbled: number; circledOnly: number; flagged: number };
  rules: RulesPreset;
  saveState: SaveState;
  prefs: ExamPrefs;
  fullscreen: boolean;
  fullscreenAvailable: boolean;
  onHandIn: () => void;
  onOpenSheet: () => void;
  onShowShortcuts: () => void;
  onPrefsChange: (patch: Partial<ExamPrefs>) => void;
  onToggleFullscreen: () => void;
}

export const ExamBar: React.FC<ExamBarProps> = ({
  paperShortTitle,
  series,
  hallTime,
  secondsLeft,
  totalQuestions,
  tallies,
  rules,
  saveState,
  prefs,
  fullscreen,
  fullscreenAvailable,
  onHandIn,
  onOpenSheet,
  onShowShortcuts,
  onPrefsChange,
  onToggleFullscreen,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        moreButtonRef.current &&
        !moreButtonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenuOpen(false);
        moreButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Focus first menu item on open
  useEffect(() => {
    if (menuOpen) {
      menuItemsRef.current[0]?.focus();
    }
  }, [menuOpen]);

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const validItems = menuItemsRef.current.filter(Boolean) as HTMLButtonElement[];
    if (validItems.length === 0) return;
    const currentIndex = validItems.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % validItems.length;
      validItems[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + validItems.length) % validItems.length;
      validItems[prevIndex]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      validItems[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      validItems[validItems.length - 1]?.focus();
    }
  }, []);

  const timeColour =
    secondsLeft <= 300
      ? 'text-rose-400'
      : secondsLeft <= 600
      ? 'text-amber-400'
      : 'text-primary';

  return (
    <header className="sticky top-[104px] md:top-0 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-2 min-h-[52px] md:min-h-[56px] flex flex-wrap items-center gap-x-4 gap-y-1 bg-surface/95 backdrop-blur-sm border-b border-border">
      {/* Left: Paper identity and Series */}
      <div className="flex items-center gap-2 mr-auto sm:mr-0">
        <b className="font-semibold text-primary">GS Paper I</b>
        <span className="hidden sm:inline text-muted">· {paperShortTitle}</span>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-secondary">
          Series {series}
        </span>
      </div>

      {/* Centre: Read-outs */}
      <div className="flex gap-5 md:mx-auto">
        <div className="hidden sm:flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted">Hall clock</span>
          <span className="font-mono tabular-nums text-base md:text-lg text-primary">
            {hallTime}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted">Time left</span>
          <span className={`font-mono tabular-nums text-base md:text-lg ${timeColour}`}>
            {formatTimeLeft(secondsLeft)}
          </span>
        </div>
      </div>

      {/* Right: Tallies, Save status, Actions */}
      <div className="flex items-center gap-3 ml-auto sm:ml-0">
        {/* Desktop Tallies */}
        <div className="hidden md:flex gap-3 text-[12.5px] text-secondary items-center">
          <span>
            <span className="font-mono">{tallies.bubbled}</span> bubbled
          </span>
          {rules === 'exam_day' && (
            <span className={tallies.circledOnly > 0 ? 'text-amber-400' : ''}>
              <span className="font-mono">{tallies.circledOnly}</span> circled only
            </span>
          )}
          <span>
            <span className="font-mono">{tallies.flagged}</span> to revisit
          </span>
        </div>

        {/* Mobile Tally */}
        <span className="md:hidden font-mono text-xs text-secondary">
          {tallies.bubbled}/{totalQuestions}
        </span>

        {/* Save Status */}
        <div
          role="status"
          aria-live="polite"
          className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted"
        >
          {saveState === 'saved' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              <span>Saved</span>
            </>
          )}
          {saveState === 'saving' && <span>Saving…</span>}
          {saveState === 'offline' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              <span>Offline · kept on this device</span>
            </>
          )}
        </div>

        {/* Mobile Answer Sheet Button */}
        <button
          type="button"
          onClick={onOpenSheet}
          className="lg:hidden px-2.5 py-1.5 rounded-md border border-border text-secondary text-xs font-medium hover:bg-surface-elevated cursor-pointer"
        >
          Answer sheet
        </button>

        {/* Hand In Button */}
        <button
          type="button"
          onClick={onHandIn}
          className="px-3.5 py-1.5 rounded-md border border-[#e0d0ab] text-[#e0d0ab] text-[13px] font-semibold hover:bg-[#e0d0ab]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab] cursor-pointer"
        >
          Hand in
        </button>

        {/* More Menu */}
        <div className="relative">
          <button
            ref={moreButtonRef}
            type="button"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="w-8 h-8 rounded-md border border-border grid place-items-center text-muted hover:text-primary hover:bg-surface-elevated cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0d0ab]"
          >
            <MoreVertical className="w-4 h-4" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
              className="absolute right-0 top-full mt-1 bg-surface-elevated border border-border rounded-lg shadow-2xl py-1 min-w-56 z-50 focus:outline-none"
            >
              <button
                ref={(el) => {
                  menuItemsRef.current[0] = el;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onShowShortcuts();
                }}
                className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface text-primary cursor-pointer focus:bg-surface focus:outline-none"
              >
                <span>Keyboard shortcuts</span>
                <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-muted">
                  ?
                </kbd>
              </button>

              <button
                ref={(el) => {
                  menuItemsRef.current[1] = el;
                }}
                type="button"
                role="menuitemcheckbox"
                aria-checked={prefs.bell}
                onClick={() => {
                  primeBell();
                  onPrefsChange({ bell: !prefs.bell });
                }}
                className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface text-primary cursor-pointer focus:bg-surface focus:outline-none"
              >
                <span>Hall bell</span>
                <span className="text-[11px] text-muted">{prefs.bell ? 'On' : 'Off'}</span>
              </button>

              <button
                ref={(el) => {
                  menuItemsRef.current[2] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={prefs.booklet === 'paper'}
                onClick={() => onPrefsChange({ booklet: 'paper' })}
                className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface text-primary cursor-pointer focus:bg-surface focus:outline-none"
              >
                <span>Booklet: Paper</span>
                {prefs.booklet === 'paper' && <span className="text-[11px] text-[#e0d0ab]">✓</span>}
              </button>

              <button
                ref={(el) => {
                  menuItemsRef.current[3] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={prefs.booklet === 'night'}
                onClick={() => onPrefsChange({ booklet: 'night' })}
                className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface text-primary cursor-pointer focus:bg-surface focus:outline-none"
              >
                <span>Booklet: Night</span>
                {prefs.booklet === 'night' && <span className="text-[11px] text-[#e0d0ab]">✓</span>}
              </button>

              {fullscreenAvailable && (
                <button
                  ref={(el) => {
                    menuItemsRef.current[4] = el;
                  }}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={fullscreen}
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleFullscreen();
                  }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface text-primary cursor-pointer focus:bg-surface focus:outline-none"
                >
                  <span>Full screen</span>
                  <span className="text-[11px] text-muted">{fullscreen ? 'On' : 'Off'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
