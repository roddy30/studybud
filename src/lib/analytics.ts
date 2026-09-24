import { QuizAttempt } from '@/types/quiz';

export interface MissedQuestion {
  question: string;
  correctAnswer: string;
  missCount: number;
  attemptCount: number;
  missRate: number;
}

export function getMostMissedQuestions(attempts: QuizAttempt[]): MissedQuestion[] {
  const stats: Record<string, { missCount: number; attemptCount: number; correctAnswer: string }> = {};

  attempts.forEach((attempt) => {
    attempt.results.forEach((result) => {
      const qText = result.question;
      if (!stats[qText]) {
        stats[qText] = { missCount: 0, attemptCount: 0, correctAnswer: result.correctAnswer };
      }
      stats[qText].attemptCount += 1;
      if (result.status === 'wrong' || result.status === 'unanswered') {
        stats[qText].missCount += 1;
      }
    });
  });

  const missedQuestions: MissedQuestion[] = [];
  
  for (const qText in stats) {
    const { missCount, attemptCount, correctAnswer } = stats[qText];
    if (attemptCount >= 2 && missCount > 0) {
      missedQuestions.push({
        question: qText,
        correctAnswer,
        missCount,
        attemptCount,
        missRate: missCount / attemptCount,
      });
    }
  }

  // Sort by missRate descending, then missCount descending
  missedQuestions.sort((a, b) => {
    if (b.missRate !== a.missRate) {
      return b.missRate - a.missRate;
    }
    return b.missCount - a.missCount;
  });

  return missedQuestions;
}
