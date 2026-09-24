export type QuestionType =
  | 'multiple_choice'
  | 'type_answer'
  | 'true_false'
  | 'fill_blank'
  | 'flashcard';

export interface ParsedQuestion {
  id: string;
  question: string;
  answer: string;
  hint: string;
  type: QuestionType;
  options?: string[]; // for multiple choice
}

export interface QuizSet {
  id: string;
  title: string;
  category?: string;
  questions: ParsedQuestion[];
  createdAt: string;
  shareCode?: string;
  timeLimitMinutes?: number | null; // null = untimed
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
}

export const QUIZ_CATEGORIES = [
  'General',
  'Math',
  'Science',
  'History',
  'English',
  'Filipino',
  'Social Studies',
  'Technology',
  'Arts',
  'Health',
  'Other',
] as const;
export type QuizCategory = typeof QUIZ_CATEGORIES[number];

export type AnswerStatus = 'correct' | 'wrong' | 'unanswered';

export interface QuestionResult {
  questionId: string;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  status: AnswerStatus;
  hintUsed: boolean;
  type: QuestionType;
}

export interface QuizAttempt {
  id: string;
  setId: string;
  title: string;
  results: QuestionResult[];
  score: number;
  total: number;
  timeUsedSeconds: number;
  completedAt: string;
  shareCode?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string | null;
  score: number;
  total: number;
  percentage: number;
  timeUsedSeconds: number;
  completedAt: string;
}
