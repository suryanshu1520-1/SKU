import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ExamResult,
  PaperCode,
  ResponseSheet,
  RulesPreset,
  SectionSubject,
  Series,
  SubmitMode,
} from './types.js';

export class AttemptInProgressError extends Error {
  constructor(message = 'An attempt is already in progress') {
    super(message);
    this.name = 'AttemptInProgressError';
  }
}

export interface AttemptRow {
  id: string;
  user_id: string;
  paper_code: PaperCode;
  subject: SectionSubject | null;
  rules: RulesPreset;
  series: Series;
  seed: number;
  question_ids: string[];
  duration_seconds: number;
  started_at: string;
  deadline_at: string;
  status: 'in_progress' | 'submitted';
  submit_mode: SubmitMode | null;
  sheet: unknown;
  checkpoint_at: string | null;
  submitted_at: string | null;
  result: ExamResult | null;
  net_hundredths: number | null;
  created_at: string;
}

export type NewAttempt = Pick<
  AttemptRow,
  | 'user_id'
  | 'paper_code'
  | 'subject'
  | 'rules'
  | 'series'
  | 'seed'
  | 'question_ids'
  | 'duration_seconds'
  | 'started_at'
  | 'deadline_at'
>;

export interface QuestionAttemptRow {
  session_id: string;
  user_id: string;
  question_id: string;
  selected_option: string | null;
  is_correct: boolean | null;
  time_spent_seconds: number;
  subject_category: string;
}

const ATTEMPT_COLUMNS =
  'id, user_id, paper_code, subject, rules, series, seed, question_ids, duration_seconds, started_at, deadline_at, status, submit_mode, sheet, checkpoint_at, submitted_at, result, net_hundredths, created_at';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function cleanEnvValue(val: unknown): string {
  if (typeof val !== 'string') return '';
  let cleaned = val.trim();
  while (cleaned.startsWith('"') || cleaned.startsWith("'")) {
    cleaned = cleaned.substring(1);
  }
  while (cleaned.endsWith('"') || cleaned.endsWith("'")) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  return cleaned.trim();
}

let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!rawSupabaseUrl || !rawServiceRoleKey) {
      throw new Error('[exam-db] Supabase URL or SUPABASE_SERVICE_ROLE_KEY missing');
    }
    _supabaseAdmin = createClient(cleanEnvValue(rawSupabaseUrl), cleanEnvValue(rawServiceRoleKey));
  }
  return _supabaseAdmin;
}

export async function getUserIdFromToken(token: string): Promise<string | null> {
  if (!token || typeof token !== 'string') return null;
  const trimmed = token.replace(/^Bearer\s+/i, '').trim();
  if (!trimmed) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(trimmed);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export async function findInProgressAttempt(userId: string): Promise<AttemptRow | null> {
  if (!isUuid(userId)) {
    return null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('mock_attempts')
    .select(ATTEMPT_COLUMNS)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .maybeSingle();

  if (error) {
    throw new Error(`[exam-db] findInProgressAttempt: ${error.message}`);
  }
  return data as AttemptRow | null;
}

export async function insertAttempt(row: NewAttempt): Promise<AttemptRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('mock_attempts')
    .insert(row)
    .select(ATTEMPT_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AttemptInProgressError('An attempt is already in progress');
    }
    throw new Error(`[exam-db] insertAttempt: ${error.message}`);
  }
  return data as AttemptRow;
}

export async function getAttempt(attemptId: string, userId: string): Promise<AttemptRow | null> {
  if (!isUuid(attemptId) || !isUuid(userId)) {
    return null;
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('mock_attempts')
    .select(ATTEMPT_COLUMNS)
    .eq('id', attemptId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`[exam-db] getAttempt: ${error.message}`);
  }
  return data as AttemptRow | null;
}

export async function saveCheckpoint(
  attemptId: string,
  userId: string,
  sheet: ResponseSheet,
  atIso: string
): Promise<boolean> {
  if (!isUuid(attemptId) || !isUuid(userId)) return false;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('mock_attempts')
    .update({ sheet, checkpoint_at: atIso })
    .eq('id', attemptId)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .select('id');

  if (error) {
    throw new Error(`[exam-db] saveCheckpoint: ${error.message}`);
  }
  return Array.isArray(data) && data.length === 1;
}

export async function markSubmitted(
  attemptId: string,
  userId: string,
  fields: {
    submit_mode: SubmitMode;
    submitted_at: string;
    result: ExamResult;
    net_hundredths: number;
    sheet: ResponseSheet;
  }
): Promise<AttemptRow | null> {
  if (!isUuid(attemptId) || !isUuid(userId)) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('mock_attempts')
    .update({
      status: 'submitted',
      submit_mode: fields.submit_mode,
      submitted_at: fields.submitted_at,
      result: fields.result,
      net_hundredths: fields.net_hundredths,
      sheet: fields.sheet,
    })
    .eq('id', attemptId)
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .select(ATTEMPT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`[exam-db] markSubmitted: ${error.message}`);
  }
  return data as AttemptRow | null;
}

export async function listSubmittedAttempts(userId: string, limit: number): Promise<AttemptRow[]> {
  if (!isUuid(userId)) {
    return [];
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('mock_attempts')
    .select(ATTEMPT_COLUMNS)
    .eq('user_id', userId)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[exam-db] listSubmittedAttempts: ${error.message}`);
  }
  return (data ?? []) as AttemptRow[];
}

export async function getSeenQuestionIds(userId: string): Promise<Set<string>> {
  const seen = new Set<string>();
  if (!isUuid(userId)) {
    return seen;
  }
  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseAdmin();
  } catch (err) {
    console.warn('[exam-db] getSeenQuestionIds: Supabase client init failed', err);
    return seen;
  }

  // (a) question_attempts.question_id (latest 5000 by created_at, strip leading pyq_)
  try {
    const { data, error } = await supabase
      .from('question_attempts')
      .select('question_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      console.warn('[exam-db] getSeenQuestionIds: question_attempts query failed', error.message);
    } else if (Array.isArray(data)) {
      for (const row of data) {
        if (typeof row.question_id === 'string') {
          const cleaned = row.question_id.replace(/^pyq_/, '');
          if (cleaned) seen.add(cleaned);
        }
      }
    }
  } catch (err) {
    console.warn('[exam-db] getSeenQuestionIds: error querying question_attempts', err);
  }

  // (b) question_ids from user's latest 20 mock_attempts by started_at
  try {
    const { data, error } = await supabase
      .from('mock_attempts')
      .select('question_ids')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) {
      console.warn('[exam-db] getSeenQuestionIds: mock_attempts query failed', error.message);
    } else if (Array.isArray(data)) {
      for (const row of data) {
        if (Array.isArray(row.question_ids)) {
          for (const qid of row.question_ids) {
            if (typeof qid === 'string' && qid) {
              seen.add(qid);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[exam-db] getSeenQuestionIds: error querying mock_attempts', err);
  }

  return seen;
}

export async function insertQuestionAttemptsBestEffort(rows: QuestionAttemptRow[]): Promise<void> {
  if (!rows || rows.length === 0) return;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('question_attempts').insert(rows);
    if (error) {
      console.warn('[exam] question_attempts insert skipped:', error.message);
    }
  } catch (err: any) {
    console.warn('[exam] question_attempts insert skipped:', err?.message ?? String(err));
  }
}
