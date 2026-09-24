'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAttempts, getSavedQuizzes, setActiveQuiz } from '@/lib/storage';
import { QuizAttempt } from '@/types/quiz';
import { getMostMissedQuestions, MissedQuestion } from '@/lib/analytics';
import { Clock, RotateCcw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';

type SortOption = 'Newest' | 'Oldest' | 'Best Score' | 'Worst Score';

export default function HistoryPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [missed, setMissed] = useState<MissedQuestion[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('Newest');
  const [missedOpen, setMissedOpen] = useState(true);

  useEffect(() => {
    const loadedAttempts = getAttempts();
    setAttempts(loadedAttempts);
    setMissed(getMostMissedQuestions(loadedAttempts).slice(0, 5));
  }, []);

  const sortedAttempts = [...attempts].sort((a, b) => {
    const dateA = new Date(a.completedAt).getTime();
    const dateB = new Date(b.completedAt).getTime();
    const percentA = a.score / Math.max(1, a.total);
    const percentB = b.score / Math.max(1, b.total);

    switch (sortOption) {
      case 'Newest': return dateB - dateA;
      case 'Oldest': return dateA - dateB;
      case 'Best Score': return percentB - percentA;
      case 'Worst Score': return percentA - percentB;
      default: return dateB - dateA;
    }
  });

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const getFormatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const getScoreColor = (score: number, total: number) => {
    const percent = score / Math.max(1, total);
    if (percent >= 0.8) return 'text-emerald-600 dark:text-emerald-400';
    if (percent >= 0.6) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  const getMissRateColor = (rate: number) => {
    if (rate >= 0.75) return 'text-rose-600 dark:text-rose-400';
    if (rate >= 0.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-zinc-600 dark:text-zinc-400';
  };

  const handleRetake = (attempt: QuizAttempt) => {
    const quizzes = getSavedQuizzes();
    const quiz = quizzes.find(q => q.id === attempt.setId);
    
    // If the quiz is not in saved quizzes, we might need to recreate a generic one or fail gracefully
    if (quiz) {
      setActiveQuiz(quiz);
      router.push('/quiz');
    } else {
      alert('The original quiz has been deleted. Cannot retake.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Quiz History</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Review your past attempts and track improvement.</p>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center space-y-3 shadow-xs">
            <Clock className="w-8 h-8 text-zinc-400 mx-auto" />
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">No quiz attempts yet</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Take a quiz to see your history here.</p>
            <Link href="/" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold">
              Go to Home
            </Link>
          </div>
        ) : (
          <>
            {missed.length > 0 && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
                <button
                  onClick={() => setMissedOpen(!missedOpen)}
                  className="w-full p-4 flex items-center justify-between text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Most Missed Questions</span>
                  </div>
                  {missedOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                </button>
                
                {missedOpen && (
                  <div className="p-4 pt-0 space-y-3 border-t border-zinc-100 dark:border-zinc-800">
                    {missed.map((m, i) => (
                      <div key={i} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm space-y-1">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{m.question}</div>
                        <div className="flex justify-between items-end text-xs">
                          <div className="text-emerald-700 dark:text-emerald-400 mt-1">
                            Answer: {m.correctAnswer}
                          </div>
                          <div className={`font-semibold ${getMissRateColor(m.missRate)}`}>
                            {m.missCount}/{m.attemptCount} = {Math.round(m.missRate * 100)}% miss rate
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">All Attempts ({attempts.length})</h2>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-zinc-500"
              >
                <option value="Newest">Newest First</option>
                <option value="Oldest">Oldest First</option>
                <option value="Best Score">Best Score</option>
                <option value="Worst Score">Worst Score</option>
              </select>
            </div>

            <div className="space-y-4">
              {sortedAttempts.map((attempt) => {
                const percent = Math.round((attempt.score / Math.max(1, attempt.total)) * 100);
                return (
                  <div key={attempt.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{attempt.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{getRelativeTime(attempt.completedAt)}</span>
                        <span>•</span>
                        <span>{getFormatTime(attempt.timeUsedSeconds)}</span>
                        {attempt.shareCode && (
                          <>
                            <span>•</span>
                            <span>Code: {attempt.shareCode}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getScoreColor(attempt.score, attempt.total)}`}>
                          {percent}%
                        </div>
                        <div className="text-xs text-zinc-500">
                          {attempt.score}/{attempt.total}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRetake(attempt)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-medium transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retake</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
