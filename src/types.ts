export interface Question {
  id: string; // or number depending on db
  exam_origin_tag: string;
  subject_category: string;
  difficulty_level: string;
  question_text: string;
  options_matrix: Record<string, string>; // e.g. { "A": "...", "B": "..." }
  correct_option?: string;
  conceptual_explanation: string;
  ai_insights?: any;
  is_generated?: boolean;
  primary_operator?: ExaminerOperatorType;
  statement_dissection?: StatementDissectionItem[];
  statutory_anchor?: string;
  historical_twin_pyq_id?: string;
}

export interface ArenaSession {
  user_id: string;
  total_correct: number;
  total_incorrect: number;
  unattempted: number;
}

export interface QuizSession {
  id: string;
  user_id: string;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  total_time_seconds: number;
  subject_stats: Record<string, { correct: number; total: number; missedQuestions?: string[] }>;
  percentile: number;
  created_at: string;
}

export interface QuestionAttempt {
  id?: string;
  session_id?: string;
  user_id: string;
  question_id: string;
  selected_option: string | null;
  is_correct: boolean | null;
  time_spent_seconds: number;
  subject_category?: string;
}

export interface SavedInsight {
  id: string;
  user_id: string;
  question_id: string;
  question_text: string;
  insight_text: string;
  created_at: string;
}

export type MembershipTier = 'free' | 'premium';

export interface SubmitQuizPayload {
  userId: string;
  answers: Record<string, string>;
  timeouts: Record<string, boolean>;
  timeSpentMap: Record<string, number>;
  questions: Array<{
    id: string | number;
    subject_category?: string;
    correct_option?: string;
  }>;
  subjectStats: Record<string, { correct: number; total: number; missedQuestions?: string[] }>;
  totalTimeSeconds: number;
}

export interface SubmitQuizResponse {
  sessionId: string;
  percentile: number;
  stats: {
    correct: number;
    incorrect: number;
    unattempted: number;
    totalTimeSeconds: number;
    subjectStats: Record<string, { correct: number; total: number; missedQuestions?: string[] }>;
  };
}

export type TargetYear = '2025' | '2026' | '2027' | '2028' | 'state-psc';
export type AttemptStage = 'foundation' | 'intermediate' | 'veteran';
export type AspirantPersona = 'full_time' | 'working_pro' | 'undergrad';
export type OptionalSubjectId =
  | 'psir'
  | 'sociology'
  | 'geography'
  | 'pub_ad'
  | 'history'
  | 'anthropology'
  | 'economics'
  | 'philosophy'
  | 'law'
  | 'commerce'
  | 'mathematics'
  | 'literature'
  | 'other';

export type GsPillarId = 'gs1' | 'gs2' | 'gs3' | 'gs4' | 'csat';
export type DailyMcqTarget = 10 | 25 | 50;
export type DailyReadingMins = 4 | 7 | 15;

export interface CandidatePreferences {
  targetYear: TargetYear;
  attemptStage: AttemptStage;
  aspirantPersona?: AspirantPersona;
  optionalSubject: OptionalSubjectId;
  optionalCustomName?: string;
  optionalStage: 'exploring' | 'foundation' | 'notes_pyq' | 'answer_writing';
  focusPillars: GsPillarId[];
  dailyMcqTarget: DailyMcqTarget;
  dailyReadingMins: DailyReadingMins;
  difficultyPreference: 'standard' | 'crucible';
  onboardingCompleted: boolean;
  inductionPledged: boolean;
  updatedAt?: string;
}

export interface CandidateProfile {
  name: string;
  email?: string;
  userId?: string;
  membershipTier?: MembershipTier;
  preferences: CandidatePreferences;
}

export interface ArenaLaunchConfig {
  mode: 'full_mock' | 'daily_brief' | 'topic_drill' | 'subject_drill';
  title: string;
  subtitle?: string;
  targetId?: string;
  questionCount?: number;
  isRanked?: boolean;
  timePerQuestionSeconds?: number;
  autoStart?: boolean;
  contextTag?: string;
  originTab?: 'arena' | 'tracker' | 'syllabus' | 'observatory' | 'library';
}

// ---------------------------------------------------------------------------
// Examiner's Psyche 7-Operator Engine Types (TASK_080)
// ---------------------------------------------------------------------------

export type ExaminerOperatorType =
  | 'PSY_01_INST_SWAP'
  | 'PSY_02_QUAL_POLARITY'
  | 'PSY_03_LEGAL_TIER'
  | 'PSY_04_CAUSAL_INV'
  | 'PSY_05_SCOPE_MUTATE'
  | 'PSY_06_PAIR_DECOY'
  | 'PSY_07_TRUE_NON_CAUSAL';

export interface StatementDissectionItem {
  stmt_num: number;
  is_true: boolean;
  operator: ExaminerOperatorType | null;
  marked_trap?: string;
  truth_key?: string;
  anchor?: string;
}

export interface ExaminerOperatorMeta {
  code: string;
  label: string;
  shortLabel: string;
  description: string;
}

export const EXAMINER_OPERATORS: Record<ExaminerOperatorType, ExaminerOperatorMeta> = {
  PSY_01_INST_SWAP: {
    code: 'PSY_01',
    label: 'Nodal / Authority Swap',
    shortLabel: 'Ministry / Nodal Swap',
    description: 'Swaps implementing Ministry, regulator, or appointing authority.',
  },
  PSY_02_QUAL_POLARITY: {
    code: 'PSY_02',
    label: 'Extreme Qualifier Trap',
    shortLabel: 'Extreme Qualifier',
    description: 'Injects absolute determiners (only, all, never, drastically) into conditional rules.',
  },
  PSY_03_LEGAL_TIER: {
    code: 'PSY_03',
    label: 'Legal Tier Shift',
    shortLabel: 'Legal Tier Shift',
    description: 'Misattributes legal origin across Constitutional, Statutory, Executive, or Judicial tiers.',
  },
  PSY_04_CAUSAL_INV: {
    code: 'PSY_04',
    label: 'Causal / Schedule Inversion',
    shortLabel: 'Schedule / Causal Inversion',
    description: 'Inverts schedule references, mechanisms, or proportional relationships.',
  },
  PSY_05_SCOPE_MUTATE: {
    code: 'PSY_05',
    label: 'Scope / Trend Mutation',
    shortLabel: 'Scope / Trend Mutation',
    description: 'Mutates numerical thresholds, tenures, eligibility bounds, or monotonic trends.',
  },
  PSY_06_PAIR_DECOY: {
    code: 'PSY_06',
    label: 'Pair-Matrix Neutralizer',
    shortLabel: 'Pair Matrix Decoy',
    description: 'Pair-matching structure (only one pair / two pairs) that neutralizes 50:50 elimination.',
  },
  PSY_07_TRUE_NON_CAUSAL: {
    code: 'PSY_07',
    label: 'True-Fact Non-Causal Decoy',
    shortLabel: 'Non-Causal Decoy',
    description: 'Both statements are factually true, but Statement-II is not the causal explanation.',
  },
};

export interface NodePsycheProfile {
  nodeId: string;
  totalQuestions: number;
  dominantOperator: ExaminerOperatorType | null;
  operatorDistribution: Record<string, number>;
  extremeQualifierFalseRate: number;
  historicalTwins: Array<{
    id: string;
    year: number;
    stem: string;
    primary_operator: ExaminerOperatorType | null;
    statutory_anchor?: string;
  }>;
}

export interface UserPsycheAutopsy {
  userId: string;
  totalAttempts: number;
  worstBleedOperator: {
    operator: ExaminerOperatorType;
    totalBleedMarks: number;
    missCount: number;
  } | null;
  fiftyFiftyLedgerByOperator: Record<
    ExaminerOperatorType,
    {
      calls: number;
      correct: number;
      wrong: number;
      netMarks: number;
      expectedValuePerQuestion: number;
    }
  >;
}

