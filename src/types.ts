export interface Question {
  id: string; // or number depending on db
  exam_origin_tag: string;
  subject_category: string;
  difficulty_level: string;
  question_text: string;
  options_matrix: Record<string, string>; // e.g. { "A": "...", "B": "..." }
  correct_option: string;
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
  subject_stats: Record<string, { correct: number; total: number }>;
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
  subjectStats: Record<string, { correct: number; total: number }>;
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
    subjectStats: Record<string, { correct: number; total: number }>;
  };
}