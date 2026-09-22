'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { LeaderboardEntry } from '@/types/quiz';
import { saveQuiz, setActiveQuiz } from '@/lib/storage';
import {
  Trophy,
  Medal,
  Clock,
  ArrowLeft,
  Play,
  RotateCw,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';

export default function LeaderboardPage({
  params,
}: {
  params: Promise<{ shareCode: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const shareCode = resolvedParams.shareCode.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [takeLoading, setTakeLoading] = useState(false);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/quiz/leaderboard?code=${shareCode}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load leaderboard');

      setQuizTitle(data.quizTitle || 'Shared Quiz');
      setEntries(data.entries || []);
    } catch (err: any) {
      setError(err?.message || 'Could not load leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [shareCode]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleTakeQuiz = async () => {
    setTakeLoading(true);
    try {
      const res = await fetch(`/api/quiz/share?code=${shareCode}`);
      const data = await res.json();
      if (!res.ok || !data.quiz) throw new Error(data.error || 'Quiz not found');

      const quiz = {
        id: data.quiz.id,
        title: data.quiz.title,
        questions: data.quiz.questions,
        createdAt: data.quiz.createdAt,
        shareCode: data.quiz.shareCode,
        timeLimitMinutes: 10,
      };

      saveQuiz(quiz);
      setActiveQuiz(quiz);
      router.push('/quiz');
    } catch (err: any) {
      alert(`Could not start quiz: ${err?.message}`);
    } finally {
      setTakeLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>

        <button
          onClick={fetchLeaderboard}
          title="Refresh scores"
          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Header Card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Class Leaderboard</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {quizTitle}
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
            <span>Code:</span>
            <button
              onClick={handleCopyCode}
              className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded flex items-center gap-1"
            >
              <span>{shareCode}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-zinc-400" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleTakeQuiz}
          disabled={takeLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold transition-opacity disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{takeLoading ? 'Loading...' : 'Take This Quiz'}</span>
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-400">
            Loading leaderboard standings...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-500 font-medium">
            {error}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
            <p>No scores submitted yet for this quiz.</p>
            <p className="text-[11px] text-zinc-400">Be the first on the scoreboard!</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {entries.map((entry) => {
              const isPodium = entry.rank <= 3;
              const medalEmoji =
                entry.rank === 1
                  ? '🥇'
                  : entry.rank === 2
                  ? '🥈'
                  : entry.rank === 3
                  ? '🥉'
                  : null;

              return (
                <div
                  key={entry.userId}
                  className={`p-4 flex items-center justify-between text-sm transition-colors ${
                    entry.rank === 1
                      ? 'bg-amber-50/40 dark:bg-amber-950/20'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank */}
                    <div className="w-7 text-center font-bold text-sm shrink-0">
                      {medalEmoji || (
                        <span className="text-zinc-400 font-mono text-xs">
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    {entry.userAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.userAvatar}
                        alt={entry.userName}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-xs font-semibold shrink-0">
                        {entry.userName[0]?.toUpperCase()}
                      </div>
                    )}

                    {/* Name */}
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {entry.userName}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(entry.timeUsedSeconds)}</span>
                        <span>· {new Date(entry.completedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                      {entry.percentage}%
                    </div>
                    <div className="text-xs text-zinc-500">
                      {entry.score} / {entry.total}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
