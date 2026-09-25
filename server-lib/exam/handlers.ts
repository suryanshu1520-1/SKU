import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { assemblePaper, PaperUnavailableError } from './assemble.js';
import {
  findInProgressAttempt,
  getAttempt,
  getSeenQuestionIds,
  getUserIdFromToken,
  insertAttempt,
  insertQuestionAttemptsBestEffort,
  isUuid,
  listSubmittedAttempts,
  markSubmitted,
  saveCheckpoint,
  AttemptInProgressError,
  type AttemptRow,
  type QuestionAttemptRow,
} from './db.js';
import { gradeSheet } from './grading.js';
import {
  BLUEPRINTS,
  offeredSectionSubjects,
  PAPER_CODES,
  PAPER_SPECS,
  toPaperItem,
} from './papers.js';
import { getPool, getPoolItem, poolCountsBySubject } from './pool.js';
import { sanitizeSheet } from './sanitize.js';
import type {
  ActiveResponse,
  AttemptSummary,
  CatalogResponse,
  ExamResult,
  PaperCode,
  PaperItem,
  PaperSpec,
  PoolItem,
  ResponseSheet,
  RulesPreset,
  SectionSubject,
  Series,
  StartRequest,
  StartResponse,
  SubmitMode,
  SubmitResponse,
} from './types.js';

const GRACE_CHECKPOINT_MS = 30_000;
const GRACE_SUBMIT_MS = 90_000;

function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: code, message });
}

async function requireUserId(req: Request, res: Response): Promise<string | null> {
  const authHeader = req.headers['authorization'] || '';
  const token = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
  if (!token) {
    sendError(res, 401, 'UNAUTHORIZED', 'Sign in to use the exam hall.');
    return null;
  }
  const userId = await getUserIdFromToken(token);
  if (!userId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Sign in to use the exam hall.');
    return null;
  }
  return userId;
}

function resolveDuration(spec: PaperSpec): number {
  const envVal = process.env.EXAM_DEV_DURATION_SECONDS;
  if (
    envVal &&
    process.env.NODE_ENV !== 'production' &&
    !process.env.VERCEL
  ) {
    const n = Number.parseInt(envVal, 10);
    if (Number.isInteger(n) && n >= 30 && n <= spec.durationSeconds) {
      return n;
    }
  }
  return spec.durationSeconds;
}

function paperItemsFor(row: AttemptRow): PaperItem[] {
  return row.question_ids.map((id, i) => {
    const poolItem = getPoolItem(id);
    if (!poolItem) {
      throw new Error(`POOL_MISMATCH ${id}`);
    }
    return toPaperItem(poolItem, i + 1);
  });
}

function compositionFor(row: AttemptRow): Record<string, number> {
  const comp: Record<string, number> = {};
  for (const id of row.question_ids) {
    const poolItem = getPoolItem(id);
    if (poolItem) {
      comp[poolItem.subject] = (comp[poolItem.subject] ?? 0) + 1;
    }
  }
  return comp;
}

function buildStartResponse(row: AttemptRow): StartResponse {
  const spec = PAPER_SPECS[row.paper_code];
  return {
    attemptId: row.id,
    paper: {
      code: spec.code,
      title: spec.title,
      questionCount: spec.questionCount,
      durationSeconds: row.duration_seconds,
      series: row.series,
      rules: row.rules,
      subject: row.subject,
      composition: compositionFor(row),
      items: paperItemsFor(row),
    },
    startedAt: row.started_at,
    deadlineAt: row.deadline_at,
    serverNow: new Date().toISOString(),
  };
}

function buildSubmitResponse(result: ExamResult): SubmitResponse {
  const explanations: Record<string, string> = {};
  const paper: PaperItem[] = [];

  for (const item of result.items) {
    const poolItem = getPoolItem(item.qid);
    if (poolItem) {
      explanations[item.qid] = poolItem.explanation ?? '';
      paper.push(toPaperItem(poolItem, item.n));
    } else {
      explanations[item.qid] = '';
    }
  }

  return {
    result,
    explanations,
    paper,
  };
}

function toAttemptRows(result: ExamResult, userId: string): QuestionAttemptRow[] {
  return result.items.map((item) => {
    let is_correct: boolean | null;
    if (item.verdict === 'correct') {
      is_correct = true;
    } else if (item.verdict === 'blank') {
      is_correct = null;
    } else {
      is_correct = false;
    }

    return {
      session_id: result.attemptId,
      user_id: userId,
      question_id: item.qid,
      selected_option: item.bubbled.length > 0 ? item.bubbled.join(',') : null,
      is_correct,
      time_spent_seconds: Math.min(32767, item.dwellSeconds),
      subject_category: item.subject,
    };
  });
}

async function finalize(
  row: AttemptRow,
  sheet: ResponseSheet,
  submitMode: SubmitMode,
  submittedAtMs: number
): Promise<SubmitResponse> {
  const items: PoolItem[] = [];
  for (const id of row.question_ids) {
    const poolItem = getPoolItem(id);
    if (!poolItem) {
      throw new Error(`POOL_MISMATCH ${id}`);
    }
    items.push(poolItem);
  }

  const result = gradeSheet(items, sheet, {
    attemptId: row.id,
    paperCode: row.paper_code,
    rules: row.rules,
    durationSeconds: row.duration_seconds,
    startedAtMs: Date.parse(row.started_at),
    submittedAtMs,
    submitMode,
  });

  const updated = await markSubmitted(row.id, row.user_id, {
    submit_mode: submitMode,
    submitted_at: new Date(submittedAtMs).toISOString(),
    result,
    net_hundredths: result.netHundredths,
    sheet,
  });

  if (!updated) {
    const existing = await getAttempt(row.id, row.user_id);
    if (existing?.status === 'submitted' && existing.result) {
      return buildSubmitResponse(existing.result);
    }
  }

  await insertQuestionAttemptsBestEffort(toAttemptRows(result, row.user_id));
  return buildSubmitResponse(result);
}

async function finalizeIfExpired(row: AttemptRow): Promise<SubmitResponse | null> {
  if (row.status === 'in_progress') {
    const deadlineMs = Date.parse(row.deadline_at);
    if (Date.now() > deadlineMs + GRACE_SUBMIT_MS) {
      const sanitized = sanitizeSheet(
        row.sheet,
        row.question_ids,
        row.rules,
        row.duration_seconds
      );
      return await finalize(row, sanitized, 'recovered', deadlineMs);
    }
  }
  return null;
}

export async function examCatalogHandler(_req: Request, res: Response): Promise<void> {
  try {
    const pool = getPool();
    const counts = poolCountsBySubject();
    const offered = offeredSectionSubjects(counts);

    const catalog: CatalogResponse = {
      papers: PAPER_CODES.map((code) => PAPER_SPECS[code]),
      sectionSubjects: offered.map((s) => ({
        subject: s,
        available: s === 'Mixed' ? pool.length : counts[s],
      })),
      blueprints: BLUEPRINTS,
      poolSize: pool.length,
      yearsCovered: '2011–2023 (2020 excluded)',
    };

    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json(catalog);
  } catch (err) {
    console.error('[exam]', err);
    sendError(res, 500, 'INTERNAL', 'Something went wrong on our side. Your answers are saved.');
  }
}

export async function examStartHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const body = (req.body ?? {}) as Partial<StartRequest>;
    const { paperCode, rules, series, subject } = body;

    if (!paperCode || !PAPER_CODES.includes(paperCode)) {
      sendError(res, 400, 'INVALID_REQUEST', 'Invalid or missing paperCode.');
      return;
    }
    if (!rules || (rules !== 'exam_day' && rules !== 'practice')) {
      sendError(res, 400, 'INVALID_REQUEST', 'Invalid or missing rules preset.');
      return;
    }
    if (!series || !['A', 'B', 'C', 'D'].includes(series)) {
      sendError(res, 400, 'INVALID_REQUEST', 'Invalid or missing test booklet series.');
      return;
    }

    const counts = poolCountsBySubject();
    const offered = offeredSectionSubjects(counts);

    if (paperCode === 'GS1_SECTION') {
      if (subject !== undefined && subject !== 'Mixed' && !offered.includes(subject)) {
        sendError(res, 400, 'INVALID_REQUEST', `Subject '${subject}' is not available for sectional paper.`);
        return;
      }
    } else if (subject !== undefined && subject !== null) {
      sendError(res, 400, 'INVALID_REQUEST', 'Subject selection is only allowed for sectional papers.');
      return;
    }

    const existing = await findInProgressAttempt(userId);
    if (existing) {
      const expiredFinalized = await finalizeIfExpired(existing);
      if (!expiredFinalized) {
        res.status(409).json({
          error: 'ATTEMPT_IN_PROGRESS',
          message: 'You have a paper in progress.',
          attemptId: existing.id,
        });
        return;
      }
    }

    const seenIds = await getSeenQuestionIds(userId);
    const seed = crypto.randomBytes(4).readUInt32BE(0);

    let items: PoolItem[];
    try {
      items = assemblePaper(getPool(), {
        paperCode,
        subject,
        seenIds,
        seed,
      });
    } catch (assembleErr) {
      if (assembleErr instanceof PaperUnavailableError) {
        sendError(res, 422, 'PAPER_UNAVAILABLE', assembleErr.message);
        return;
      }
      throw assembleErr;
    }

    const duration = resolveDuration(PAPER_SPECS[paperCode]);
    const startedAt = new Date();
    const deadlineAt = new Date(startedAt.getTime() + duration * 1000);

    let row: AttemptRow;
    try {
      row = await insertAttempt({
        user_id: userId,
        paper_code: paperCode,
        subject: paperCode === 'GS1_SECTION' ? (subject ?? 'Mixed') : null,
        rules,
        series,
        seed,
        question_ids: items.map((i) => i.id),
        pool_version: 1,
        duration_seconds: duration,
        started_at: startedAt.toISOString(),
        deadline_at: deadlineAt.toISOString(),
      });
    } catch (insertErr) {
      if (insertErr instanceof AttemptInProgressError) {
        const current = await findInProgressAttempt(userId);
        res.status(409).json({
          error: 'ATTEMPT_IN_PROGRESS',
          message: 'You have a paper in progress.',
          attemptId: current?.id,
        });
        return;
      }
      throw insertErr;
    }

    res.status(200).json(buildStartResponse(row));
  } catch (err) {
    console.error('[exam]', err);
    sendError(res, 500, 'INTERNAL', 'Something went wrong on our side. Your answers are saved.');
  }
}

export async function examActiveHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const row = await findInProgressAttempt(userId);
    if (!row) {
      const resp: ActiveResponse = { active: null, finalized: null };
      res.status(200).json(resp);
      return;
    }

    const expiredFinalized = await finalizeIfExpired(row);
    if (expiredFinalized) {
      const resp: ActiveResponse = { active: null, finalized: expiredFinalized };
      res.status(200).json(resp);
      return;
    }

    const sanitizedSheet = sanitizeSheet(
      row.sheet,
      row.question_ids,
      row.rules,
      row.duration_seconds
    );

    const hasAnswers =
      Object.keys(sanitizedSheet.bubbles).length > 0 ||
      Object.keys(sanitizedSheet.circled).length > 0 ||
      Object.keys(sanitizedSheet.struck).length > 0 ||
      Object.keys(sanitizedSheet.confidence).length > 0 ||
      Object.keys(sanitizedSheet.flagged).length > 0 ||
      sanitizedSheet.events.length > 0;

    const startResp = buildStartResponse(row);
    const resp: ActiveResponse = {
      active: {
        ...startResp,
        sheet: hasAnswers ? sanitizedSheet : null,
        checkpointAt: row.checkpoint_at,
      },
      finalized: null,
    };

    res.status(200).json(resp);
  } catch (err) {
    console.error('[exam]', err);
    sendError(res, 500, 'INTERNAL', 'Something went wrong on our side. Your answers are saved.');
  }
}

export async function examCheckpointHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const attemptId = req.body?.attemptId;
    if (!attemptId || !isUuid(attemptId)) {
      sendError(res, 404, 'NOT_FOUND', 'Attempt not found.');
      return;
    }

    const row = await getAttempt(attemptId, userId);
    if (!row) {
      sendError(res, 404, 'NOT_FOUND', 'Attempt not found.');
      return;
    }

    if (row.status !== 'in_progress') {
      sendError(res, 409, 'ATTEMPT_CLOSED', 'Attempt is closed.');
      return;
    }

    const deadlineMs = Date.parse(row.deadline_at);
    if (Date.now() > deadlineMs + GRACE_CHECKPOINT_MS) {
      sendError(res, 409, 'DEADLINE_PASSED', 'Deadline has passed.');
      return;
    }

    const sanitized = sanitizeSheet(
      req.body?.sheet,
      row.question_ids,
      row.rules,
      row.duration_seconds
    );
    const nowIso = new Date().toISOString();
    const ok = await saveCheckpoint(row.id, userId, sanitized, nowIso);
    if (!ok) {
      sendError(res, 409, 'ATTEMPT_CLOSED', 'Attempt is closed.');
      return;
    }

    res.status(200).json({ ok: true, savedAt: nowIso });
  } catch (err) {
    console.error('[exam]', err);
    sendError(res, 500, 'INTERNAL', 'Something went wrong on our side. Your answers are saved.');
  }
}

export async function examSubmitHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const attemptId = req.body?.attemptId;
    if (!attemptId || !isUuid(attemptId)) {
      sendError(res, 404, 'NOT_FOUND', 'Attempt not found.');
      return;
    }

    const row = await getAttempt(attemptId, userId);
    if (!row) {
      sendError(res, 404, 'NOT_FOUND', 'Attempt not found.');
      return;
    }

    if (row.status === 'submitted' && row.result) {
      res.status(200).json(buildSubmitResponse(row.result));
      return;
    }

    const deadlineMs = Date.parse(row.deadline_at);
    const mode = req.body?.mode;

    if (Date.now() <= deadlineMs + GRACE_SUBMIT_MS) {
      const sanitized = sanitizeSheet(
        req.body?.sheet,
        row.question_ids,
        row.rules,
        row.duration_seconds
      );
      const submitMode: SubmitMode = mode === 'timeout' ? 'timeout' : 'manual';
      const submitTime = Math.min(Date.now(), deadlineMs);
      const response = await finalize(row, sanitized, submitMode, submitTime);
      res.status(200).json(response);
    } else {
      const sanitized = sanitizeSheet(
        row.sheet,
        row.question_ids,
        row.rules,
        row.duration_seconds
      );
      const response = await finalize(row, sanitized, 'recovered', deadlineMs);
      res.status(200).json(response);
    }
  } catch (err) {
    console.error('[exam]', err);
    sendError(res, 500, 'INTERNAL', 'Something went wrong on our side. Your answers are saved.');
  }
}

export async function examAttemptsHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const inProgress = await findInProgressAttempt(userId);
    if (inProgress) {
      await finalizeIfExpired(inProgress);
    }

    const submitted = await listSubmittedAttempts(userId, 10);
    const attempts: AttemptSummary[] = [];

    for (const r of submitted) {
      if (!r.result) continue;
      attempts.push({
        attemptId: r.id,
        paperCode: r.paper_code,
        subject: r.subject,
        submittedAt: r.submitted_at ?? r.result.submittedAt,
        submitMode: r.submit_mode ?? r.result.submitMode,
        questionCount: r.result.questionCount,
        correct: r.result.correct,
        wrong: r.result.wrong + r.result.invalid,
        blank: r.result.blank,
        netHundredths: r.result.netHundredths,
        maxHundredths: r.result.maxHundredths,
      });
    }

    res.status(200).json({ attempts });
  } catch (err) {
    console.error('[exam]', err);
    sendError(res, 500, 'INTERNAL', 'Something went wrong on our side. Your answers are saved.');
  }
}

export async function examResultHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = await requireUserId(req, res);
    if (!userId) return;

    const attemptId = req.query?.attemptId;
    if (!attemptId || typeof attemptId !== 'string' || !isUuid(attemptId)) {
      sendError(res, 404, 'NOT_FOUND', 'Attempt not found.');
      return;
    }

    const row = await getAttempt(attemptId, userId);
    if (!row) {
      sendError(res, 404, 'NOT_FOUND', 'Attempt not found.');
      return;
    }

    if (row.status !== 'submitted' || !row.result) {
      sendError(res, 409, 'NOT_SUBMITTED', 'Attempt is not submitted.');
      return;
    }

    res.status(200).json(buildSubmitResponse(row.result));
  } catch (err) {
    console.error('[exam]', err);
    sendError(res, 500, 'INTERNAL', 'Something went wrong on our side. Your answers are saved.');
  }
}
