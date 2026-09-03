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
