export type QuizDepth = 'foundation' | 'balanced' | 'deep';

export interface QuizScoreRecord {
  date: string;
  score: number;
  total: number;
  depth: QuizDepth;
}

export interface Topic {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  tags: string[];
  notes?: string;
  mastery: 'new' | 'learning' | 'mastered';
  intervalStep: number; // 0: 1d, 1: 3d, 2: 7d, 3: 14d, 4: 30d
  nextReviewDate: string; // YYYY-MM-DD
  lastReviewedDate?: string; // YYYY-MM-DD
  reviewCount: number;
  quizScores: QuizScoreRecord[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  topicId?: string;
  topicTitle?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
}

export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';

export interface MistakeItem {
  id: string;
  topicId: string;
  topicTitle: string;
  question: string;
  options: string[];
  correctIndex: number;
  userSelectedOption: string;
  explanation: string;
  dateLogged: string;
}

export interface UserSettings {
  darkMode: boolean;
  streak: number;
  lastActiveDate: string;
  reviewsCompletedToday: string[];
}
