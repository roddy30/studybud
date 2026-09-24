'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { QuizSet, QuestionResult } from '@/types/quiz';
import { QuizView } from '@/app/quiz/quiz-view';
import { Trophy, Users, AlertCircle, Play, Loader2 } from 'lucide-react';

export default function LiveQuizPage() {
  const params = useParams();
  const router = useRouter();
  const sessionCode = params.sessionCode as string;
  const { user, isCreator } = useAuth();
  
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizSet | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [myScore, setMyScore] = useState({ score: 0, total: 0 });

  // Generate a consistent guest ID for this session if not logged in
  const localUserId = useRef(user?.uid || `guest-${Math.random().toString(36).substring(2, 9)}`);
  const userName = user?.displayName || `Student ${localUserId.current.substring(6, 10)}`;

  useEffect(() => {
    let mounted = true;
    let pollInterval: NodeJS.Timeout;

    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/quiz/live?sessionCode=${sessionCode}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to load session');
        
        if (mounted) {
          setSession(data.session);
          setParticipants(data.participants || []);
          
          if (!quiz && data.session.share_code) {
            // Fetch the quiz
            const qRes = await fetch(`/api/quiz/share?code=${data.session.share_code}`);
            const qData = await qRes.json();
            if (qRes.ok && qData.quiz) {
              setQuiz(qData.quiz);
            }
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    fetchSession();
    
    // Join session if not creator
    if (!isCreator && !loading) {
      fetch('/api/quiz/live/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode,
          userId: localUserId.current,
          userName: userName,
          userAvatar: user?.photoURL
        })
      }).catch(console.error);
    }

    pollInterval = setInterval(fetchSession, 3000);
    
    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [sessionCode, user, isCreator, userName, loading, quiz]);

  const handleStart = async () => {
    try {
      await fetch('/api/quiz/live', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode, action: 'start' })
      });
    } catch (err) {
      console.error('Failed to start session', err);
    }
  };

  const handleFinishSession = async () => {
    try {
      await fetch('/api/quiz/live', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionCode, action: 'finish' })
      });
    } catch (err) {
      console.error('Failed to finish session', err);
    }
  };

  const handleQuizComplete = async (results: QuestionResult[]) => {
    const score = results.filter(r => r.status === 'correct').length;
    const total = results.length;
    setMyScore({ score, total });
    setQuizFinished(true);

    try {
      await fetch('/api/quiz/live/join', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode,
          userId: localUserId.current,
          score,
          total,
          finished: true
        })
      });
    } catch (err) {
      console.error('Failed to update score', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm text-zinc-500">Loading live session...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {error || 'Session not found'}
        </h2>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold"
        >
          Go Home
        </button>
      </div>
    );
  }

  // WAITING ROOM
  if (session.status === 'waiting') {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 space-y-8 animate-in fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Live Quiz Waiting Room</h1>
          <p className="text-sm text-zinc-500">Join at <span className="font-semibold text-indigo-500">{window.location.origin}/live/{sessionCode}</span></p>
          <div className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl inline-block border border-zinc-200 dark:border-zinc-700">
            <span className="text-4xl font-mono font-black tracking-widest">{sessionCode}</span>
          </div>
        </div>

        {isCreator && (
          <div className="flex justify-center pt-4">
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Start Quiz Now
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Participants ({participants.length})
            </h3>
            {!isCreator && (
              <span className="text-xs px-2 py-1 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-md font-medium animate-pulse">
                Waiting for host...
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {participants.length === 0 ? (
              <div className="col-span-full py-8 text-center text-sm text-zinc-400">
                No one has joined yet.
              </div>
            ) : (
              participants.map((p) => (
                <div key={p.user_id} className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50">
                  {p.user_avatar ? (
                    <img src={p.user_avatar} alt={p.user_name} className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                      {p.user_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium truncate">{p.user_name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE QUIZ (Students taking it)
  if (session.status === 'active' && !isCreator && !quizFinished && quiz) {
    return (
      <QuizView
        quiz={quiz}
        onComplete={handleQuizComplete}
        onExit={() => router.push('/')}
      />
    );
  }

  // RESULTS / LEADERBOARD
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-in slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Live Leaderboard
        </h1>
        <p className="text-sm text-zinc-500">
          {session.status === 'active' ? 'Quiz in progress...' : 'Session finished'}
        </p>
      </div>

      {!isCreator && quizFinished && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-xl text-center">
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
            You scored {myScore.score} out of {myScore.total}!
          </p>
          <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">Waiting for others to finish...</p>
        </div>
      )}

      {isCreator && session.status === 'active' && (
        <div className="flex justify-center pb-4">
          <button
            onClick={handleFinishSession}
            className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            End Session Early
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-zinc-500">Rank</th>
              <th className="px-4 py-3 text-left font-semibold text-zinc-500">Student</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-500">Score</th>
              <th className="px-4 py-3 text-right font-semibold text-zinc-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {participants.map((p, i) => (
              <tr key={p.user_id} className={p.user_id === localUserId.current ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}>
                <td className="px-4 py-3 text-left font-medium">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </td>
                <td className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    {p.user_avatar ? (
                      <img src={p.user_avatar} alt={p.user_name} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                        {p.user_name[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium truncate max-w-[120px] sm:max-w-[200px]">{p.user_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  {p.score} <span className="text-zinc-400 font-normal">/ {p.total || '-'}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  {p.finished ? (
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Finished"></span>
                  ) : (
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="In progress"></span>
                  )}
                </td>
              </tr>
            ))}
            {participants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No participants yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
