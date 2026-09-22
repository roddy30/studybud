import { QuizSet, QuizAttempt } from '@/types/quiz';

const STORAGE_KEYS = {
  SAVED_QUIZZES: 'quiz_sets_v1',
  ACTIVE_QUIZ: 'active_quiz_v1',
  ATTEMPTS: 'quiz_attempts_v1',
  DRAFT_TEXT: 'quiz_draft_text_v1',
};

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function getSavedQuizzes(): QuizSet[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_QUIZZES);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to load saved quizzes', err);
    return [];
  }
}

export function saveQuiz(quiz: QuizSet): void {
  if (!isClient()) return;
  try {
    const existing = getSavedQuizzes();
    const filtered = existing.filter((q) => q.id !== quiz.id);
    localStorage.setItem(
      STORAGE_KEYS.SAVED_QUIZZES,
      JSON.stringify([quiz, ...filtered])
    );
  } catch (err) {
    console.error('Failed to save quiz', err);
  }
}

export function deleteQuiz(id: string): void {
  if (!isClient()) return;
  try {
    const existing = getSavedQuizzes();
    const updated = existing.filter((q) => q.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_QUIZZES, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete quiz', err);
  }
}

export function getQuizById(id: string): QuizSet | null {
  const existing = getSavedQuizzes();
  return existing.find((q) => q.id === id) || null;
}

export function setActiveQuiz(quiz: QuizSet): void {
  if (!isClient()) return;
  try {
    sessionStorage.setItem(STORAGE_KEYS.ACTIVE_QUIZ, JSON.stringify(quiz));
  } catch (err) {
    console.error('Failed to set active quiz', err);
  }
}

export function getActiveQuiz(): QuizSet | null {
  if (!isClient()) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_QUIZ);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to get active quiz', err);
    return null;
  }
}

export function saveAttempt(attempt: QuizAttempt): void {
  if (!isClient()) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    const existing: QuizAttempt[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(
      STORAGE_KEYS.ATTEMPTS,
      JSON.stringify([attempt, ...existing].slice(0, 50))
    );
  } catch (err) {
    console.error('Failed to save attempt', err);
  }
}

export function getAttempts(): QuizAttempt[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to get attempts', err);
    return [];
  }
}

export function saveDraftText(text: string): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFT_TEXT, text);
  } catch {}
}

export function getDraftText(): string {
  if (!isClient()) return '';
  try {
    return localStorage.getItem(STORAGE_KEYS.DRAFT_TEXT) || '';
  } catch {
    return '';
  }
}
