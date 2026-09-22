'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QuizSet, QuestionResult, QuizAttempt } from '@/types/quiz';
import { getActiveQuiz, setActiveQuiz, saveAttempt } from '@/lib/storage';
import { QuizView } from './quiz-view';
import { ReviewView } from './review-view';
import Link from 'next/link';

export default function QuizPage() {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizSet | null>(null);
  const [mode, setMode] = useState<'taking' | 'review'>('taking');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [timeUsedSeconds, setTimeUsedSeconds] = useState(0);

  useEffect(() => {
    const active = getActiveQuiz();
    if (!active || !active.questions || active.questions.length === 0) {
      // If no quiz in session, will show fallback
      return;
    }
    setQuiz(active);
  }, []);

  const handleComplete = (completedResults: QuestionResult[], timeUsed: number) => {
    if (!quiz) return;

    setResults(completedResults);
    setTimeUsedSeconds(timeUsed);
    setMode('review');

    // Save attempt to history
    const correctCount = completedResults.filter((r) => r.status === 'correct').length;
    const attempt: QuizAttempt = {
      id: `attempt-${Date.now().toString(36)}`,
      setId: quiz.id,
      title: quiz.title,
      results: completedResults,
      score: correctCount,
      total: completedResults.length,
      timeUsedSeconds: timeUsed,
      completedAt: new Date().toISOString(),
      shareCode: quiz.shareCode,
    };

    saveAttempt(attempt);
  };

  const handleDrillMistakes = (missedQuiz: QuizSet) => {
    setQuiz(missedQuiz);
    setActiveQuiz(missedQuiz);
    setResults([]);
    setMode('taking');
  };

  const handleRetakeAll = () => {
    setResults([]);
    setMode('taking');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (!quiz) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          No Active Quiz Found
        </h2>
        <p className="text-xs text-zinc-500">
          Please create a quiz from your notes or paste Gemini output first.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90"
        >
          Go to Quiz Creator
        </Link>
      </div>
    );
  }

  if (mode === 'review') {
    return (
      <ReviewView
        quiz={quiz}
        results={results}
        timeUsedSeconds={timeUsedSeconds}
        onDrillMistakes={handleDrillMistakes}
        onRetakeAll={handleRetakeAll}
        onGoHome={handleGoHome}
      />
    );
  }

  return (
    <QuizView
      key={quiz.id + results.length}
      quiz={quiz}
      onComplete={handleComplete}
      onExit={handleGoHome}
    />
  );
}
