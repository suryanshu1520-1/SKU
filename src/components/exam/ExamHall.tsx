import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useReducedMotion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import './exam.css';
import type {
  Confidence,
  ExamLaunch,
  OptionKey,
  PaperCode,
  PaperItem,
  RulesPreset,
  SectionSubject,
} from './types';
import { PAPER_SHORT_TITLES } from './types';
import { useExamSession } from './useExamSession';
import { useExamKeyboard } from './useExamKeyboard';
import { Booklet } from './Booklet';
import type { BookletHandlers } from './BookletItem';
import { OmrSheet, OmrBottomSheet } from './OmrSheet';
import { ExamBar } from './ExamBar';
import { HallAnnouncements } from './HallAnnouncements';
import { AdmitCard } from './AdmitCard';
import { HandInDialog } from './HandInDialog';
import { PensDown } from './PensDown';
import { ResumePrompt } from './ResumePrompt';
import { ShortcutsDialog } from './ShortcutsDialog';
import { tallies } from './lib/sheetReducer';
import { formatMarks, hallEnd, secondsLeft, serverOffsetMs } from './lib/clock';
import { ExamScorecard } from './scorecard/ExamScorecard';

export interface ExamHallProps {
  launch: ExamLaunch;
  userId: string;
  candidateName?: string | null;
  onRequestLogin?: () => void;
  onExit: () => void;
  onSittingChange?: (active: boolean) => void;
  onStartPaper: (paperCode: PaperCode, subject?: SectionSubject) => void;
}

const EMPTY_ITEMS: readonly PaperItem[] = Object.freeze([]);

export default function ExamHall(props: ExamHallProps): React.ReactElement {
  const { onExit, onStartPaper } = props;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();

  const session = useExamSession({
    launch: props.launch,
    userId: props.userId,
    onSittingChange: props.onSittingChange,
  });

  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenAvailable =
    typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      try {
        rootRef.current?.requestFullscreen?.();
      } catch {
        // ignore gesture requirement failures
      }
    } else {
      try {
        document.exitFullscreen?.();
      } catch {
        // ignore
      }
    }
  }, []);

  const handleStartFromAdmit = useCallback(
    (rules: RulesPreset, opts: { fullscreen: boolean }) => {
      if (opts.fullscreen) {
        try {
          rootRef.current?.requestFullscreen?.();
        } catch {
          // ignore
        }
      }
      session.startPaper(rules);
    },
    [session.startPaper]
  );

  const [handInOpen, setHandInOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const rules: RulesPreset = session.attempt?.paper.rules ?? session.prefs.rules;

  useEffect(() => {
    if (session.phase !== 'sitting') {
      setHandInOpen(false);
      setShortcutsOpen(false);
      setSheetOpen(false);
    }
  }, [session.phase]);

  const items = session.attempt?.paper.items ?? (EMPTY_ITEMS as PaperItem[]);
  const firstQid = items[0]?.qid ?? null;
  const [activeQid, setActiveQid] = useState<string | null>(null);

  const itemElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const elToQidRef = useRef<Map<HTMLElement, string>>(new Map());

  const registerItem = useCallback((qid: string, el: HTMLElement | null) => {
    const oldEl = itemElementsRef.current.get(qid);
    if (oldEl) {
      elToQidRef.current.delete(oldEl);
    }
    if (el) {
      itemElementsRef.current.set(qid, el);
      elToQidRef.current.set(el, qid);
    } else {
      itemElementsRef.current.delete(qid);
    }
  }, []);

  const goTo = useCallback(
    (qid: string) => {
      const el = itemElementsRef.current.get(qid);
      setActiveQid(qid);
      if (el) {
        el.scrollIntoView({
          behavior: prefersReduced ? 'auto' : 'smooth',
          block: 'start',
        });
        el.focus({ preventScroll: true });
      }
    },
    [prefersReduced]
  );

  const handleJump = useCallback(
    (qid: string) => {
      goTo(qid);
      setSheetOpen(false);
    },
    [goTo]
  );

  // Seal broken: call goTo(firstQid) once when phase enters 'sitting'
  const hasEnteredSittingRef = useRef(false);
  useEffect(() => {
    if (session.phase === 'sitting' && !hasEnteredSittingRef.current) {
      hasEnteredSittingRef.current = true;
      if (firstQid) {
        requestAnimationFrame(() => {
          goTo(firstQid);
        });
      }
    } else if (session.phase !== 'sitting' && session.phase !== 'pens-down') {
      hasEnteredSittingRef.current = false;
    }
  }, [session.phase, firstQid, goTo]);

  // Initial activeQid
  useEffect(() => {
    if (firstQid && !activeQid) {
      setActiveQid(firstQid);
    }
  }, [firstQid, activeQid]);

  // Call VISIT whenever activeQid changes during sitting
  useEffect(() => {
    if (activeQid && (session.phase === 'sitting' || session.phase === 'pens-down')) {
      session.command({ type: 'VISIT', qid: activeQid });
    }
  }, [activeQid, session.phase, session.command]);

  // IntersectionObserver to update activeQid on scroll
  useEffect(() => {
    if (session.phase !== 'sitting' && session.phase !== 'pens-down') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const qid = elToQidRef.current.get(entry.target as HTMLElement);
            if (qid) {
              setActiveQid(qid);
            }
          }
        }
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );

    itemElementsRef.current.forEach((el) => {
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [session.phase, items]);

  // Stable command-wrapped handlers
  const sessionCommand = session.command;

  const handleChoose = useCallback(
    (qid: string, key: OptionKey) => {
      sessionCommand({ type: 'CHOOSE', qid, key });
    },
    [sessionCommand]
  );

  const handleStrike = useCallback(
    (qid: string, key: OptionKey) => {
      sessionCommand({ type: 'STRIKE', qid, key });
    },
    [sessionCommand]
  );

  const handleTag = useCallback(
    (qid: string, confidence: Confidence) => {
      sessionCommand({ type: 'TAG', qid, confidence });
    },
    [sessionCommand]
  );

  const handleFlag = useCallback(
    (qid: string) => {
      sessionCommand({ type: 'FLAG', qid });
    },
    [sessionCommand]
  );

  const handleTransfer = useCallback(
    (qid: string) => {
      sessionCommand({ type: 'TRANSFER', qid });
    },
    [sessionCommand]
  );

  const handleUndo = useCallback(
    (qid: string) => {
      sessionCommand({ type: 'UNDO', qid });
    },
    [sessionCommand]
  );

  const handleBubble = useCallback(
    (qid: string, key: OptionKey) => {
      sessionCommand({ type: 'BUBBLE', qid, key });
    },
    [sessionCommand]
  );

  const handleActivate = useCallback((qid: string) => {
    setActiveQid(qid);
  }, []);

  const handleConfirmDouble = useCallback(() => {
    sessionCommand({ type: 'CONFIRM_DOUBLE' });
  }, [sessionCommand]);

  const handleCancelDouble = useCallback(() => {
    sessionCommand({ type: 'CANCEL_DOUBLE' });
  }, [sessionCommand]);

  const bookletHandlers: BookletHandlers = useMemo(
    () => ({
      onChoose: handleChoose,
      onStrike: handleStrike,
      onTag: handleTag,
      onFlag: handleFlag,
      onTransfer: handleTransfer,
      onUndo: handleUndo,
      onBubble: handleBubble,
      onActivate: handleActivate,
    }),
    [
      handleChoose,
      handleStrike,
      handleTag,
      handleFlag,
      handleTransfer,
      handleUndo,
      handleBubble,
      handleActivate,
    ]
  );

  // Keyboard navigation
  const keyboardEnabled =
    session.phase === 'sitting' &&
    !handInOpen &&
    !shortcutsOpen &&
    !sheetOpen &&
    !session.sheetState.pendingDouble;

  const handleKeyboardNext = useCallback(() => {
    if (!activeQid) return;
    const idx = items.findIndex((it) => it.qid === activeQid);
    if (idx >= 0 && idx < items.length - 1) {
      goTo(items[idx + 1].qid);
    }
  }, [activeQid, items, goTo]);

  const handleKeyboardPrev = useCallback(() => {
    if (!activeQid) return;
    const idx = items.findIndex((it) => it.qid === activeQid);
    if (idx > 0) {
      goTo(items[idx - 1].qid);
    }
  }, [activeQid, items, goTo]);

  const handleKeyboardChoose = useCallback(
    (key: OptionKey) => {
      if (!activeQid) return;
      handleChoose(activeQid, key);
    },
    [activeQid, handleChoose]
  );

  const handleKeyboardStrike = useCallback(
    (key: OptionKey) => {
      if (!activeQid) return;
      handleStrike(activeQid, key);
    },
    [activeQid, handleStrike]
  );

  const handleKeyboardTransfer = useCallback(() => {
    if (!activeQid) return;
    handleTransfer(activeQid);
  }, [activeQid, handleTransfer]);

  const handleKeyboardTag = useCallback(
    (c: Confidence) => {
      if (!activeQid) return;
      handleTag(activeQid, c);
    },
    [activeQid, handleTag]
  );

  const handleKeyboardFlag = useCallback(() => {
    if (!activeQid) return;
    handleFlag(activeQid);
  }, [activeQid, handleFlag]);

  const handleKeyboardUndo = useCallback(() => {
    if (!activeQid) return;
    handleUndo(activeQid);
  }, [activeQid, handleUndo]);

  const handleKeyboardFocusSheet = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSheetOpen(true);
    } else {
      const sheetAside = document.querySelector(
        'aside[aria-label="Answer sheet"]'
      ) as HTMLElement | null;
      sheetAside?.focus();
    }
  }, []);

  const handleKeyboardShortcuts = useCallback(() => {
    setShortcutsOpen(true);
  }, []);

  useExamKeyboard({
    enabled: keyboardEnabled,
    rules,
    onChoose: handleKeyboardChoose,
    onStrike: handleKeyboardStrike,
    onTransfer: handleKeyboardTransfer,
    onTag: handleKeyboardTag,
    onFlag: handleKeyboardFlag,
    onNext: handleKeyboardNext,
    onPrev: handleKeyboardPrev,
    onUndo: handleKeyboardUndo,
    onFocusSheet: handleKeyboardFocusSheet,
    onShortcuts: handleKeyboardShortcuts,
  });

  // Tallies and chips
  const qids = useMemo(() => items.map((it) => it.qid), [items]);
  const qidToNumber = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((it) => map.set(it.qid, it.n));
    return map;
  }, [items]);

  const sheetTallies = useMemo(
    () => tallies(session.sheetState.sheet, qids),
    [session.sheetState.sheet, qids]
  );

  const circledOnly = useMemo(
    () =>
      sheetTallies.circledOnlyQids.map((qid) => ({
        qid,
        n: qidToNumber.get(qid) ?? 0,
      })),
    [sheetTallies.circledOnlyQids, qidToNumber]
  );

  const flagged = useMemo(
    () =>
      sheetTallies.flaggedQids.map((qid) => ({
        qid,
        n: qidToNumber.get(qid) ?? 0,
      })),
    [sheetTallies.flaggedQids, qidToNumber]
  );

  const invalidQids = useMemo(
    () => sheetTallies.invalidQids.map((qid) => qidToNumber.get(qid) ?? 0),
    [sheetTallies.invalidQids, qidToNumber]
  );

  const paperCode = session.paperChoice.paperCode;
  const paperShortTitle = PAPER_SHORT_TITLES[paperCode] ?? 'Full paper';
  const duration = session.attempt?.paper.durationSeconds ?? 7200;
  const hallEndLabel = hallEnd(duration);

  // Resume interval
  const [resumeSecondsLeft, setResumeSecondsLeft] = useState<number>(0);
  useEffect(() => {
    if (session.phase !== 'resume' || !session.resumeInfo) {
      return;
    }
    const info = session.resumeInfo;
    const offset = serverOffsetMs(info.serverNow, Date.now());
    const updateSecs = () => {
      setResumeSecondsLeft(secondsLeft(info.deadlineAt, Date.now(), offset));
    };
    updateSecs();
    const interval = setInterval(updateSecs, 1000);
    return () => clearInterval(interval);
  }, [session.phase, session.resumeInfo]);

  // Non-sitting phase rendering
  if (session.phase === 'checking') {
    return (
      <div
        ref={rootRef}
        className="exam-hall w-full font-sans text-primary"
        data-booklet={session.prefs.booklet}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-sans">Opening the exam hall…</p>
        </div>
      </div>
    );
  }

  if (session.phase === 'load-error') {
    const isGuest = !props.userId || props.userId === 'guest' || props.userId === 'anonymous';
    const isAuthError = session.error?.toLowerCase().includes('sign in') || isGuest;
    return (
      <div
        ref={rootRef}
        className="exam-hall w-full font-sans text-primary"
        data-booklet={session.prefs.booklet}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
          <p className="text-sm text-[var(--eh-danger)] max-w-md">{session.error}</p>
          <div className="flex gap-3">
            {isAuthError && props.onRequestLogin ? (
              <button
                type="button"
                onClick={props.onRequestLogin}
                className="px-4 py-2 rounded-md bg-[var(--gold,#e0d0ab)] text-[#041228] font-sans font-bold text-sm hover:opacity-90 cursor-pointer shadow-sm"
              >
                Sign in
              </button>
            ) : (
              <button
                type="button"
                onClick={session.retry}
                className="px-4 py-2 rounded-md bg-[var(--eh-ink)] text-[var(--eh-paper)] font-sans font-semibold text-sm hover:opacity-90 cursor-pointer"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={props.onExit}
              className="px-4 py-2 rounded-md border border-border text-secondary font-sans text-sm hover:bg-surface-elevated cursor-pointer"
            >
              Back to Arena
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (session.phase === 'admit' || session.phase === 'starting') {
    const isGuest = !props.userId || props.userId === 'guest' || props.userId === 'anonymous';
    return (
      <div
        ref={rootRef}
        className="exam-hall w-full font-sans text-primary"
        data-booklet={session.prefs.booklet}
      >
        <AdmitCard
          paperCode={session.paperChoice.paperCode}
          subject={session.paperChoice.subject}
          catalog={session.catalog}
          candidateName={props.candidateName ?? null}
          roll={session.roll}
          series={session.series}
          prefs={session.prefs}
          starting={session.phase === 'starting'}
          error={session.error}
          isGuest={isGuest}
          onRequestLogin={props.onRequestLogin}
          onPrefsChange={session.updatePrefs}
          onStart={handleStartFromAdmit}
          onBack={props.onExit}
        />
      </div>
    );
  }

  if (session.phase === 'resume') {
    if (session.resumeInfo) {
      return (
        <div
          ref={rootRef}
          className="exam-hall w-full font-sans text-primary"
          data-booklet={session.prefs.booklet}
        >
          <ResumePrompt
            info={session.resumeInfo}
            secondsLeft={resumeSecondsLeft}
            submitting={false}
            error={session.error}
            onResume={session.resumePaper}
            onHandIn={session.handInSavedPaper}
            onBack={props.onExit}
          />
        </div>
      );
    }
    return (
      <div
        ref={rootRef}
        className="exam-hall w-full font-sans text-primary"
        data-booklet={session.prefs.booklet}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-sans">Opening the exam hall…</p>
        </div>
      </div>
    );
  }

  if (session.phase === 'submitting') {
    return (
      <div
        ref={rootRef}
        className="exam-hall w-full font-sans text-primary"
        data-booklet={session.prefs.booklet}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-sans">Collecting your answer sheet…</p>
        </div>
      </div>
    );
  }

  if (session.phase === 'submit-error') {
    return (
      <div
        ref={rootRef}
        className="exam-hall w-full font-sans text-primary"
        data-booklet={session.prefs.booklet}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4">
          <p className="text-sm text-[var(--eh-danger)] max-w-md">{session.error}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={session.retry}
              className="px-4 py-2 rounded-md bg-[var(--eh-ink)] text-[var(--eh-paper)] font-sans font-semibold text-sm hover:opacity-90 cursor-pointer"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={props.onExit}
              className="px-4 py-2 rounded-md border border-border text-secondary font-sans text-sm hover:bg-surface-elevated cursor-pointer"
            >
              Back to Arena
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (session.phase === 'scorecard' && session.submitResponse) {
    return (
      <div
        ref={rootRef}
        className="exam-hall w-full font-sans text-primary"
        data-booklet={session.prefs.booklet}
      >
        <ExamScorecard
          response={session.submitResponse!}
          collectedWhileAway={session.collectedWhileAway}
          catalog={session.catalog}
          onSitAnother={() => onStartPaper('GS1_FULL')}
          onPractise={(s) => onStartPaper('GS1_SECTION', s)}
          onBack={onExit}
        />
      </div>
    );
  }

  // Sitting layout: phase === 'sitting' || phase === 'pens-down'
  return (
    <div
      ref={rootRef}
      className="exam-hall w-full font-sans text-primary"
      data-booklet={session.prefs.booklet}
    >
      <ExamBar
        paperShortTitle={paperShortTitle}
        series={session.series}
        hallTime={session.hallTime}
        secondsLeft={session.secondsLeft}
        totalQuestions={items.length}
        tallies={{
          bubbled: sheetTallies.bubbled,
          circledOnly: sheetTallies.circledOnly,
          flagged: sheetTallies.flagged,
        }}
        rules={rules}
        saveState={session.saveState}
        prefs={session.prefs}
        fullscreen={fullscreen}
        fullscreenAvailable={fullscreenAvailable}
        onHandIn={() => setHandInOpen(true)}
        onOpenSheet={() => setSheetOpen(true)}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onPrefsChange={session.updatePrefs}
        onToggleFullscreen={toggleFullscreen}
      />

      <HallAnnouncements
        announcement={session.announcement}
        bell={session.prefs.bell}
        onDismiss={session.dismissAnnouncement}
      />

      <div className="grid items-start gap-6 pt-5 pb-24 lg:pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <Booklet
          mode="sitting"
          items={items}
          rules={rules}
          sheet={session.sheetState.sheet}
          activeQid={activeQid}
          graceQids={session.graceQids}
          handlers={bookletHandlers}
          registerItem={registerItem}
        />
        <aside
          aria-label="Answer sheet"
          className="hidden lg:block lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto"
        >
          <OmrSheet
            variant="panel"
            items={items}
            sheet={session.sheetState.sheet}
            rules={rules}
            activeQid={activeQid}
            roll={session.roll}
            series={session.series}
            pendingDouble={session.sheetState.pendingDouble}
            hint={session.inkHint}
            onBubble={handleBubble}
            onJump={goTo}
            onConfirmDouble={handleConfirmDouble}
            onCancelDouble={handleCancelDouble}
          />
        </aside>
      </div>

      <OmrBottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        bubbled={sheetTallies.bubbled}
        total={items.length}
      >
        <OmrSheet
          variant="sheet"
          items={items}
          sheet={session.sheetState.sheet}
          rules={rules}
          activeQid={activeQid}
          roll={session.roll}
          series={session.series}
          pendingDouble={session.sheetState.pendingDouble}
          hint={session.inkHint}
          onBubble={handleBubble}
          onJump={handleJump}
          onConfirmDouble={handleConfirmDouble}
          onCancelDouble={handleCancelDouble}
        />
      </OmrBottomSheet>

      <HandInDialog
        open={handInOpen}
        submitting={false}
        bubbled={sheetTallies.bubbled}
        blank={sheetTallies.blank}
        invalidQids={invalidQids}
        circledOnly={circledOnly}
        flagged={flagged}
        secondsLeft={session.secondsLeft}
        hallEndLabel={hallEndLabel}
        onClose={() => setHandInOpen(false)}
        onConfirm={() => {
          setHandInOpen(false);
          session.handIn();
        }}
        onJump={goTo}
      />

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {session.phase === 'pens-down' && <PensDown hallEndLabel={hallEndLabel} />}
    </div>
  );
}
