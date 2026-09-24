import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  CHECKPOINT_INTERVAL_MS,
  type ActiveAttempt,
  type CatalogResponse,
  type Confidence,
  type ExamLaunch,
  type ExamPhase,
  type ExamPrefs,
  type OptionKey,
  type PaperCode,
  type ResponseSheet,
  type RulesPreset,
  type SaveState,
  type SectionSubject,
  type Series,
  type StartResponse,
  type SubmitResponse,
} from './types.js';
import {
  clearLocalSheet,
  loadLocalSheet,
  loadPrefs,
  saveLocalSheet,
  savePrefs,
} from './lib/localStorage.js';
import { chooseResumeSheet, keepaliveBodyFits } from './lib/sessionHelpers.js';
import {
  emptyResponseSheet,
  initSheetState,
  isInGrace,
  sheetReducer,
  tallies,
  type SheetState,
} from './lib/sheetReducer.js';
import {
  hallClock,
  msLeft,
  rollNumber,
  secondsElapsed,
  serverOffsetMs,
} from './lib/clock.js';
import { examApi, ExamApiError } from './lib/examApi.js';

export type SheetCommand =
  | { type: 'CHOOSE' | 'BUBBLE' | 'STRIKE'; qid: string; key: OptionKey }
  | { type: 'TRANSFER' | 'UNDO' | 'FLAG' | 'VISIT'; qid: string }
  | { type: 'TAG'; qid: string; confidence: Confidence }
  | { type: 'CONFIRM_DOUBLE' | 'CANCEL_DOUBLE' };

export interface Announcement {
  id: number;
  text: string;
  urgent: boolean;
}

export interface UseExamSessionArgs {
  launch: ExamLaunch;
  userId: string;
  onSittingChange?: (active: boolean) => void;
}

export interface ExamSession {
  phase: ExamPhase;
  error: string | null;
  catalog: CatalogResponse | null;
  prefs: ExamPrefs;
  updatePrefs: (patch: Partial<ExamPrefs>) => void;
  roll: string;
  paperChoice: { paperCode: PaperCode; subject?: SectionSubject };
  series: Series;
  startPaper: (rules: RulesPreset) => Promise<void>;
  attempt: StartResponse | null;
  sheetState: SheetState;
  command: (cmd: SheetCommand) => void;
  secondsLeft: number;
  elapsedSeconds: number;
  hallTime: string;
  saveState: SaveState;
  lastSavedAt: number | null;
  announcement: Announcement | null;
  dismissAnnouncement: () => void;
  inkHint: string | null;
  graceQids: ReadonlySet<string>;
  handIn: () => Promise<void>;
  resumeInfo: ActiveAttempt | null;
  resumePaper: () => void;
  handInSavedPaper: () => Promise<void>;
  submitResponse: SubmitResponse | null;
  collectedWhileAway: boolean;
  retry: () => void;
}

const SERIES_LIST: readonly Series[] = ['A', 'B', 'C', 'D'];

export function useExamSession({
  launch,
  userId,
  onSittingChange,
}: UseExamSessionArgs): ExamSession {
  const [prefs, setPrefs] = useState<ExamPrefs>(() => loadPrefs());
  const [series] = useState<Series>(() => SERIES_LIST[Math.floor(Math.random() * 4)]);
  const roll = useMemo(() => rollNumber(userId), [userId]);

  const [phase, setPhase] = useState<ExamPhase>('checking');
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);

  const [paperChoice, setPaperChoice] = useState<{
    paperCode: PaperCode;
    subject?: SectionSubject;
  }>({ paperCode: 'GS1_FULL' });

  const [attempt, setAttempt] = useState<StartResponse | null>(null);
  const [sheetState, dispatch] = useReducer(sheetReducer, prefs.rules, initSheetState);

  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [hallTime, setHallTime] = useState<string>('09:30');
  const [graceQids, setGraceQids] = useState<ReadonlySet<string>>(new Set());

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [inkHint, setInkHint] = useState<string | null>(null);

  const [resumeInfo, setResumeInfo] = useState<ActiveAttempt | null>(null);
  const [submitResponse, setSubmitResponse] = useState<SubmitResponse | null>(null);
  const [collectedWhileAway, setCollectedWhileAway] = useState<boolean>(false);

  // Refs to avoid stale closures
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  const sheetStateRef = useRef(sheetState);
  sheetStateRef.current = sheetState;

  const offsetRef = useRef<number>(0);
  const lastCheckpointedRef = useRef<number>(0);
  const lastSavedAtRef = useRef<number | null>(null);
  const lastSubmitModeRef = useRef<'manual' | 'timeout'>('manual');

  const pendingSubmitRef = useRef<{
    attempt: StartResponse;
    sheet: ResponseSheet;
    mode: 'manual' | 'timeout';
  } | null>(null);
  const submitInFlightRef = useRef<boolean>(false);
  const submittedRef = useRef<boolean>(false);
  const sittingNotifiedRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const onSittingChangeRef = useRef(onSittingChange);
  onSittingChangeRef.current = onSittingChange;

  const firedAnnouncementsRef = useRef<Set<number>>(new Set());
  const announcementIdRef = useRef<number>(0);
  const announcementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inkHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pensDownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePrefs = useCallback((patch: Partial<ExamPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  const dismissAnnouncement = useCallback(() => {
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
      announcementTimeoutRef.current = null;
    }
    setAnnouncement(null);
  }, []);

  // Forward declarations for submit and load
  const doSubmit = useCallback(
    async (
      attId: string,
      targetSheet: ResponseSheet,
      mode: 'manual' | 'timeout',
      targetAttempt: StartResponse,
      isSavedPaper = false
    ) => {
      if (submitInFlightRef.current || submittedRef.current) {
        return;
      }
      submitInFlightRef.current = true;

      setPhase('submitting');
      const now = Date.now();
      const offset = offsetRef.current;
      const elapsed = secondsElapsed(
        targetAttempt.startedAt,
        now,
        offset,
        targetAttempt.paper.durationSeconds
      );

      const finalSheet = isSavedPaper
        ? targetSheet
        : sheetReducer(sheetStateRef.current, { type: 'AWAY_END', t: elapsed, now }).sheet;

      pendingSubmitRef.current = { attempt: targetAttempt, sheet: finalSheet, mode };

      try {
        const resp = await examApi.submit(attId, finalSheet, mode);
        submittedRef.current = true;
        submitInFlightRef.current = false;
        clearLocalSheet(attId);
        setSubmitResponse(resp);
        setPhase('scorecard');
        if (sittingNotifiedRef.current) {
          sittingNotifiedRef.current = false;
          onSittingChangeRef.current?.(false);
        }
      } catch {
        submitInFlightRef.current = false;
        setPhase('submit-error');
        lastSubmitModeRef.current = mode;
        if (lastSavedAtRef.current) {
          const savedElapsed = secondsElapsed(
            targetAttempt.startedAt,
            lastSavedAtRef.current,
            offset,
            targetAttempt.paper.durationSeconds
          );
          const hhmm = hallClock(savedElapsed);
          setError(
            `We couldn't reach the server. Your answers are safe on this device and were last saved to your account at ${hhmm}.`
          );
        } else {
          setError(
            "We couldn't reach the server. Your answers are safe on this device."
          );
        }
      }
    },
    []
  );

  const beginSitting = useCallback(
    (
      att: StartResponse,
      existingSheet: ResponseSheet | null,
      receivedAtMs: number,
      serverCheckpointTimestamp?: number
    ) => {
      const offset = serverOffsetMs(att.serverNow, receivedAtMs);
      offsetRef.current = offset;
      attemptRef.current = att;
      setAttempt(att);

      const hydrated = existingSheet
        ? { ...existingSheet, rules: att.paper.rules }
        : emptyResponseSheet(att.paper.rules);

      dispatch({ type: 'HYDRATE', sheet: hydrated });
      lastCheckpointedRef.current =
        serverCheckpointTimestamp !== undefined
          ? serverCheckpointTimestamp
          : (hydrated.clientUpdatedAt ?? 0);

      const ms = msLeft(att.deadlineAt, Date.now(), offset);
      const sLeft = Math.max(0, Math.ceil(ms / 1000));
      setSecondsLeft(sLeft);

      const elapsed = secondsElapsed(
        att.startedAt,
        Date.now(),
        offset,
        att.paper.durationSeconds
      );
      setElapsedSeconds(elapsed);
      setHallTime(hallClock(elapsed));

      firedAnnouncementsRef.current = new Set();
      for (const th of [3600, 1800, 600, 300]) {
        if (sLeft <= th) {
          firedAnnouncementsRef.current.add(th);
        }
      }

      setPhase('sitting');
      sittingNotifiedRef.current = true;
      onSittingChangeRef.current?.(true);
    },
    []
  );

  const loadGenRef = useRef<number>(0);

  const load = useCallback(async () => {
    mountedRef.current = true;
    const gen = ++loadGenRef.current;
    setError(null);
    setPhase('checking');

    examApi
      .catalog()
      .then((c) => {
        if (mountedRef.current && gen === loadGenRef.current) setCatalog(c);
      })
      .catch(() => {});

    if (launch.kind === 'result') {
      try {
        const resp = await examApi.result(launch.attemptId);
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        setSubmitResponse(resp);
        setPhase('scorecard');
      } catch (err) {
        if (!mountedRef.current || gen !== loadGenRef.current) return;
        if (err instanceof ExamApiError && err.status === 401) {
          setPhase('admit');
          setError('Sign in to view your exam result.');
          return;
        }
        setPhase('load-error');
        setError("We couldn't load that result. Check your connection and try again.");
      }
      return;
    }

    const isGuest = !userId || userId === 'guest' || userId === 'anonymous';
    if (isGuest) {
      if (!mountedRef.current || gen !== loadGenRef.current) return;
      setPaperChoice(
        launch.kind === 'new'
          ? { paperCode: launch.paperCode, subject: launch.subject }
          : { paperCode: 'GS1_FULL' }
      );
      setPhase('admit');
      return;
    }

    try {
      const activeResp = await examApi.active();
      if (!mountedRef.current || gen !== loadGenRef.current) return;
      if (activeResp.finalized) {
        setSubmitResponse(activeResp.finalized);
        setCollectedWhileAway(true);
        clearLocalSheet(activeResp.finalized.result.attemptId);
        setPhase('scorecard');
      } else if (activeResp.active) {
        setResumeInfo(activeResp.active);
        setPhase('resume');
      } else {
        setPaperChoice(
          launch.kind === 'new'
            ? { paperCode: launch.paperCode, subject: launch.subject }
            : { paperCode: 'GS1_FULL' }
        );
        setPhase('admit');
      }
    } catch (err) {
      if (!mountedRef.current || gen !== loadGenRef.current) return;
      if (err instanceof ExamApiError && err.status === 401) {
        setPaperChoice(
          launch.kind === 'new'
            ? { paperCode: launch.paperCode, subject: launch.subject }
            : { paperCode: 'GS1_FULL' }
        );
        setPhase('admit');
        setError('Sign in to sit a paper.');
        return;
      }
      setPhase('load-error');
      setError("We couldn't reach the exam hall. Check your connection and try again.");
    }
  }, [launch, userId]);

  useEffect(() => {
    mountedRef.current = true;
    load();
  }, [load]);

  const startPaper = useCallback(
    async (rules: RulesPreset) => {
      mountedRef.current = true;
      updatePrefs({ rules });
      setError(null);
      setPhase('starting');

      if (!userId || userId === 'guest' || userId === 'anonymous') {
        setPhase('admit');
        setError('Sign in to start this paper.');
        return;
      }

      try {
        const res = await examApi.start({
          paperCode: paperChoice.paperCode,
          subject: paperChoice.subject,
          rules,
          series,
        });
        const receivedAt = Date.now();
        if (!mountedRef.current) return;
        beginSitting(res, null, receivedAt);
      } catch (err) {
        if (!mountedRef.current) return;
        if (err instanceof ExamApiError && err.code === 'ATTEMPT_IN_PROGRESS') {
          await load();
          return;
        }
        setPhase('admit');
        const msg =
          err instanceof ExamApiError && err.status >= 400 && err.status < 500
            ? err.message
            : "We couldn't start the paper. Check your connection and try again.";
        setError(msg);
      }
    },
    [updatePrefs, paperChoice, series, beginSitting, load, userId]
  );

  const resumePaper = useCallback(async () => {
    mountedRef.current = true;
    setError(null);
    try {
      const activeResp = await examApi.active();
      const receivedAt = Date.now();
      if (!mountedRef.current) return;

      if (activeResp.active) {
        const att = activeResp.active;
        const local = loadLocalSheet(att.attemptId);
        const server = att.sheet;
        const chosen = chooseResumeSheet(local, server);
        beginSitting(att, chosen, receivedAt, server?.clientUpdatedAt ?? 0);
      } else if (activeResp.finalized) {
        setSubmitResponse(activeResp.finalized);
        setCollectedWhileAway(true);
        clearLocalSheet(activeResp.finalized.result.attemptId);
        setPhase('scorecard');
      } else {
        setPhase('admit');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof ExamApiError && err.status === 401) {
        setPhase('admit');
        setError('Sign in to resume your paper.');
        return;
      }
      setError("We couldn't reach the exam hall. Check your connection and try again.");
    }
  }, [beginSitting]);

  const handInSavedPaper = useCallback(async () => {
    mountedRef.current = true;
    if (!resumeInfo) return;
    const local = loadLocalSheet(resumeInfo.attemptId);
    const server = resumeInfo.sheet;
    const chosen = chooseResumeSheet(local, server);
    await doSubmit(
      resumeInfo.attemptId,
      chosen ?? emptyResponseSheet(resumeInfo.paper.rules),
      'manual',
      resumeInfo,
      true
    );
  }, [resumeInfo, doSubmit]);

  const command = useCallback(
    (cmd: SheetCommand) => {
      if (phaseRef.current !== 'sitting' || !attemptRef.current) {
        return;
      }
      const curAtt = attemptRef.current;
      const now = Date.now();
      const t = secondsElapsed(
        curAtt.startedAt,
        now,
        offsetRef.current,
        curAtt.paper.durationSeconds
      );

      if (
        sheetStateRef.current.sheet.rules === 'exam_day' &&
        cmd.type === 'BUBBLE'
      ) {
        const b = sheetStateRef.current.sheet.bubbles[cmd.qid];
        if (b && b.length === 1 && b[0] === cmd.key) {
          setInkHint('Ink is permanent. Practice rules allow erasing.');
          if (inkHintTimeoutRef.current) {
            clearTimeout(inkHintTimeoutRef.current);
          }
          inkHintTimeoutRef.current = setTimeout(() => {
            setInkHint(null);
            inkHintTimeoutRef.current = null;
          }, 3000);
        }
      }

      dispatch({ ...cmd, t, now });
    },
    []
  );

  const handIn = useCallback(async () => {
    if (phaseRef.current !== 'sitting' || !attemptRef.current) return;
    await doSubmit(
      attemptRef.current.attemptId,
      sheetStateRef.current.sheet,
      'manual',
      attemptRef.current
    );
  }, [doSubmit]);

  const retry = useCallback(() => {
    if (phaseRef.current === 'load-error') {
      load();
    } else if (phaseRef.current === 'submit-error' && pendingSubmitRef.current) {
      const { attempt, sheet, mode } = pendingSubmitRef.current;
      doSubmit(attempt.attemptId, sheet, mode, attempt, true);
    }
  }, [load, doSubmit]);

  // Clock loop (sitting only)
  useEffect(() => {
    if (phase !== 'sitting' || !attempt) {
      return;
    }

    const curAtt = attempt;
    const duration = curAtt.paper.durationSeconds;

    const timer = setInterval(() => {
      const now = Date.now();
      const offset = offsetRef.current;
      const ms = msLeft(curAtt.deadlineAt, now, offset);
      const sLeft = Math.max(0, Math.ceil(ms / 1000));
      const elapsed = secondsElapsed(curAtt.startedAt, now, offset, duration);
      const hTime = hallClock(elapsed);

      setSecondsLeft((prev) => (prev !== sLeft ? sLeft : prev));
      setElapsedSeconds((prev) => (prev !== elapsed ? elapsed : prev));
      setHallTime((prev) => (prev !== hTime ? hTime : prev));

      // Grace QIDs
      const curSheet = sheetStateRef.current;
      const activeGrace = new Set<string>();
      for (const qid of Object.keys(curSheet.inkAt)) {
        if (isInGrace(curSheet, qid, now)) {
          activeGrace.add(qid);
        }
      }
      setGraceQids((prev) => {
        if (prev.size !== activeGrace.size) return activeGrace;
        for (const id of activeGrace) {
          if (!prev.has(id)) return activeGrace;
        }
        return prev;
      });

      // Announcements
      const thresholds = [3600, 1800, 600, 300].filter((th) => th < duration);
      for (const th of thresholds) {
        if (sLeft <= th && !firedAnnouncementsRef.current.has(th)) {
          firedAnnouncementsRef.current.add(th);
          let text = '';
          let urgent = false;

          if (th === 3600) {
            text = 'One hour left.';
          } else if (th === 1800) {
            text = '30 minutes left.';
          } else if (th === 600) {
            const tRes = tallies(
              sheetStateRef.current.sheet,
              curAtt.paper.items.map((i) => i.qid)
            );
            text = '10 minutes left. Only bubbled answers are scored.';
            if (tRes.circledOnly > 0) {
              const extra =
                tRes.circledOnly === 1
                  ? ' 1 circled answer is not on your sheet yet.'
                  : ` ${tRes.circledOnly} circled answers are not on your sheet yet.`;
              text += extra;
            }
          } else if (th === 300) {
            text = '5 minutes left.';
            urgent = true;
          }

          if (text) {
            const ann: Announcement = {
              id: ++announcementIdRef.current,
              text,
              urgent,
            };
            setAnnouncement(ann);
            if (announcementTimeoutRef.current) {
              clearTimeout(announcementTimeoutRef.current);
            }
            announcementTimeoutRef.current = setTimeout(() => {
              setAnnouncement(null);
              announcementTimeoutRef.current = null;
            }, 8000);
          }
        }
      }

      // Deadline reached
      if (ms <= 0) {
        setPhase('pens-down');
        clearInterval(timer);
        pensDownTimeoutRef.current = setTimeout(() => {
          if (phaseRef.current === 'pens-down' && attemptRef.current) {
            doSubmit(
              attemptRef.current.attemptId,
              sheetStateRef.current.sheet,
              'timeout',
              attemptRef.current
            );
          }
          pensDownTimeoutRef.current = null;
        }, 1500);
      }
    }, 250);

    return () => {
      clearInterval(timer);
    };
  }, [phase, attempt, doSubmit]);

  // Local autosave debounce
  useEffect(() => {
    if (
      (phase === 'sitting' || phase === 'pens-down') &&
      attemptRef.current
    ) {
      const attId = attemptRef.current.attemptId;
      const curSheet = sheetState.sheet;
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      autosaveTimeoutRef.current = setTimeout(() => {
        saveLocalSheet(attId, curSheet);
        autosaveTimeoutRef.current = null;
      }, 300);
    }
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [phase, sheetState.sheet]);

  // Server checkpoint (sitting only)
  useEffect(() => {
    if (phase !== 'sitting' || !attempt) {
      return;
    }
    const attId = attempt.attemptId;

    const checkpointTimer = setInterval(async () => {
      const curSheet = sheetStateRef.current.sheet;
      if (curSheet.clientUpdatedAt > lastCheckpointedRef.current) {
        setSaveState('saving');
        try {
          await examApi.checkpoint(attId, curSheet);
          setSaveState('saved');
          const nowMs = Date.now();
          lastSavedAtRef.current = nowMs;
          setLastSavedAt(nowMs);
          lastCheckpointedRef.current = curSheet.clientUpdatedAt;
        } catch {
          setSaveState('offline');
        }
      }
    }, CHECKPOINT_INTERVAL_MS);

    return () => {
      clearInterval(checkpointTimer);
    };
  }, [phase, attempt]);

  // Window listeners for away tracking and beforeunload
  useEffect(() => {
    if (phase !== 'sitting' || !attempt) {
      return;
    }
    const curAtt = attempt;

    const handleVisibilityChange = () => {
      const now = Date.now();
      const elapsed = secondsElapsed(
        curAtt.startedAt,
        now,
        offsetRef.current,
        curAtt.paper.durationSeconds
      );

      if (document.hidden) {
        if (autosaveTimeoutRef.current) {
          clearTimeout(autosaveTimeoutRef.current);
          autosaveTimeoutRef.current = null;
        }
        saveLocalSheet(curAtt.attemptId, sheetStateRef.current.sheet);

        dispatch({ type: 'AWAY_START', t: elapsed, now });
        const curSheet = sheetStateRef.current.sheet;
        if (
          curSheet.clientUpdatedAt > lastCheckpointedRef.current &&
          keepaliveBodyFits(curAtt.attemptId, curSheet)
        ) {
          examApi
            .checkpoint(curAtt.attemptId, curSheet, { keepalive: true })
            .catch(() => {});
        }
      } else {
        dispatch({ type: 'AWAY_END', t: elapsed, now });
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [phase, attempt]);

  // Unmount effect
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
      if (inkHintTimeoutRef.current) {
        clearTimeout(inkHintTimeoutRef.current);
      }
      if (pensDownTimeoutRef.current) {
        clearTimeout(pensDownTimeoutRef.current);
      }
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
      if (
        (phaseRef.current === 'sitting' || phaseRef.current === 'pens-down') &&
        attemptRef.current
      ) {
        const attId = attemptRef.current.attemptId;
        const curSheet = sheetStateRef.current.sheet;
        saveLocalSheet(attId, curSheet);
        if (
          curSheet.clientUpdatedAt > lastCheckpointedRef.current &&
          keepaliveBodyFits(attId, curSheet)
        ) {
          examApi
            .checkpoint(attId, curSheet, { keepalive: true })
            .catch(() => {});
        }
      }
      if (sittingNotifiedRef.current) {
        sittingNotifiedRef.current = false;
        onSittingChangeRef.current?.(false);
      }
    };
  }, []);

  return {
    phase,
    error,
    catalog,
    prefs,
    updatePrefs,
    roll,
    paperChoice,
    series,
    startPaper,
    attempt,
    sheetState,
    command,
    secondsLeft,
    elapsedSeconds,
    hallTime,
    saveState,
    lastSavedAt,
    announcement,
    dismissAnnouncement,
    inkHint,
    graceQids,
    handIn,
    resumeInfo,
    resumePaper,
    handInSavedPaper,
    submitResponse,
    collectedWhileAway,
    retry,
  };
}
