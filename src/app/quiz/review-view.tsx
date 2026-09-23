'use client';

import { useState } from 'react';
import { QuizSet, QuestionResult } from '@/types/quiz';
import { useAuth } from '@/lib/auth-context';
import {
  RotateCcw,
  Home,
  Share2,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Lightbulb,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ReviewViewProps {
  quiz: QuizSet;
  results: QuestionResult[];
  timeUsedSeconds: number;
  onDrillMistakes: (wrongQuestions: QuizSet) => void;
  onRetakeAll: () => void;
  onGoHome: () => void;
}

export function ReviewView({
  quiz,
  results,
  timeUsedSeconds,
  onDrillMistakes,
  onRetakeAll,
  onGoHome,
}: ReviewViewProps) {
  const { user, isOnline, signInWithGoogle, isCreator } = useAuth();

  const [shareCode, setShareCode] = useState<string | null>(quiz.shareCode || null);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [correctOpen, setCorrectOpen] = useState(false);

  const correctResults = results.filter((r) => r.status === 'correct');
  const wrongResults = results.filter((r) => r.status === 'wrong');
  const unansweredResults = results.filter((r) => r.status === 'unanswered');

  const score = correctResults.length;
  const total = results.length;
  const percentage = Math.round((score / Math.max(1, total)) * 100);
  const hintsUsedCount = results.filter((r) => r.hintUsed).length;

  const minutes = Math.floor(timeUsedSeconds / 60);
  const seconds = timeUsedSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  // Score color
  const scoreColor =
    percentage >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : percentage >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  // Share quiz online
  const handleShareQuiz = async () => {
    if (!user && !isCreator) {
      signInWithGoogle();
      return;
    }

    setSharing(true);
    setShareError('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (isCreator) {
        headers['x-creator-pin'] =
          process.env.NEXT_PUBLIC_CREATOR_PIN || 'studybud2026';
      }

      const res = await fetch('/api/quiz/share', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: quiz.title,
          questions: quiz.questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to share quiz');

      setShareCode(data.shareCode);
      // Persist shareCode to storage
      try {
        const { saveQuiz } = await import('@/lib/storage');
        saveQuiz({ ...quiz, shareCode: data.shareCode });
      } catch {}
    } catch (err: any) {
      setShareError(err?.message || 'Error publishing quiz');
    } finally {
      setSharing(false);
    }
  };

  // Submit score to leaderboard
  const handleSubmitScore = async () => {
    if (!user) {
      signInWithGoogle();
      return;
    }

    if (!shareCode) {
      alert('Quiz must be shared first before submitting to the leaderboard.');
      return;
    }

    setSubmittingScore(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/quiz/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareCode,
          score,
          total,
          timeUsedSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post score');

      setScoreSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Error recording score');
    } finally {
      setSubmittingScore(false);
    }
  };

  // Copy code
  const handleCopyCode = async () => {
    if (!shareCode) return;
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  // Start drill for missed questions only
  const handleStartMistakesDrill = () => {
    const wrongIds = new Set(
      [...wrongResults, ...unansweredResults].map((r) => r.questionId)
    );
    const missedQuestions = quiz.questions.filter((q) => wrongIds.has(q.id));

    if (missedQuestions.length === 0) return;

    const drillQuiz: QuizSet = {
      ...quiz,
      id: `drill-${Date.now().toString(36)}`,
      title: `Review: ${quiz.title}`,
      questions: missedQuestions,
      timeLimitMinutes: null, // Drill mode is untimed
    };

    onDrillMistakes(drillQuiz);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Score Header Card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 text-center space-y-4 shadow-xs">
        <p className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
          Quiz Completed
        </p>

        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {quiz.title}
        </h1>

        <div className="py-2">
          <div className={`text-5xl sm:text-6xl font-extrabold tracking-tight ${scoreColor}`}>
            {percentage}%
          </div>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mt-1">
            {score} of {total} correct
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-6 text-xs text-zinc-500 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{timeFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>{hintsUsedCount} hint{hintsUsedCount !== 1 ? 's' : ''} used</span>
          </div>
        </div>

        {/* Primary Review Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          {wrongResults.length + unansweredResults.length > 0 && (
            <button
              onClick={handleStartMistakesDrill}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Drill Mistakes Only ({wrongResults.length + unansweredResults.length})</span>
            </button>
          )}

          <button
            onClick={onRetakeAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Retake All</span>
          </button>

          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Home className="w-3.5 h-3.5 text-zinc-400" />
            <span>Home</span>
          </button>
        </div>
      </div>

      {/* Online Sharing & Leaderboard Card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            <Share2 className="w-4 h-4 text-blue-500" />
            <span>Share & Leaderboard</span>
          </div>
          {shareCode && (
            <Link
              href={`/leaderboard/${shareCode}`}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Trophy className="w-3.5 h-3.5" />
              View Leaderboard
            </Link>
          )}
        </div>

        {/* Share Code Section */}
        {shareCode ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-xs text-zinc-400 block">Classmate Join Code:</span>
                <span className="text-lg font-mono font-bold tracking-widest text-zinc-900 dark:text-zinc-100">
                  {shareCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Score submission */}
            {scoreSubmitted ? (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Score posted to the class leaderboard!</span>
              </div>
            ) : (
              <div>
                {user ? (
                  <button
                    onClick={handleSubmitScore}
                    disabled={submittingScore}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                  >
                    {submittingScore ? 'Posting...' : '🏆 Submit My Score to Leaderboard'}
                  </button>
                ) : (
                  <button
                    onClick={() => signInWithGoogle()}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
                  >
                    Sign in with Google to post score to leaderboard
                  </button>
                )}
                {submitError && (
                  <p className="text-xs text-rose-500 mt-1">{submitError}</p>
                )}
              </div>
            )}
          </div>
        ) : isCreator ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Publish this quiz online so classmates can test themselves and compete on a live leaderboard.
            </p>
            {user ? (
              <button
                onClick={handleShareQuiz}
                disabled={sharing || !isOnline}
                className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {sharing ? 'Generating Share Code...' : 'Get Classmate Join Code'}
              </button>
            ) : (
              <button
                onClick={() => signInWithGoogle()}
                className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
              >
                Sign in with Google to share with class
              </button>
            )}
            {shareError && <p className="text-xs text-rose-500">{shareError}</p>}
          </div>
        ) : (
          <div className="text-xs text-zinc-500 py-1">
            This study session is saved offline in your browser.
          </div>
        )}
      </div>

      {/* Breakdown 1: Mistakes (Highest Priority Reflection) */}
      {wrongResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400">
            <XCircle className="w-4 h-4" />
            <span>Mistakes to Review ({wrongResults.length})</span>
          </div>

          <div className="space-y-2.5">
            {wrongResults.map((r, i) => (
              <div
                key={i}
                className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-zinc-900 p-4 space-y-2 text-sm"
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {r.question}
                </div>

                <div className="grid gap-1 text-xs">
                  <div className="flex items-start gap-1.5 text-rose-600 dark:text-rose-400">
                    <span className="font-semibold shrink-0">Your answer:</span>
                    <span className="line-through">{r.userAnswer}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <span className="font-semibold shrink-0">Correct answer:</span>
                    <span>{r.correctAnswer}</span>
                  </div>
                </div>

                {r.hintUsed && (
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-1">
                    <Lightbulb className="w-3 h-3" /> Hint was viewed
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown 2: Unanswered due to time limit */}
      {unansweredResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4" />
            <span>Unanswered ({unansweredResults.length})</span>
          </div>

          <div className="space-y-2">
            {unansweredResults.map((r, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-3 text-xs space-y-1"
              >
                <div className="font-medium text-zinc-800 dark:text-zinc-200">
                  {r.question}
                </div>
                <div className="text-emerald-600 dark:text-emerald-400">
                  Answer: {r.correctAnswer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown 3: Correct Answers (Collapsible) */}
      {correctResults.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <button
            onClick={() => setCorrectOpen(!correctOpen)}
            className="w-full p-4 flex items-center justify-between text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Correct Answers ({correctResults.length})</span>
            </div>
            {correctOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {correctOpen && (
            <div className="p-4 pt-0 space-y-2 border-t border-zinc-100 dark:border-zinc-800">
              {correctResults.map((r, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 text-xs space-y-1"
                >
                  <p className="font-medium text-zinc-800 dark:text-zinc-200">{r.question}</p>
                  <p className="text-emerald-600 dark:text-emerald-400">✓ {r.correctAnswer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
