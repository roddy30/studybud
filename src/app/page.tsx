'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PromptBox } from '@/components/prompt-box';
import { parseQuizText } from '@/lib/parser';
import { useAuth } from '@/lib/auth-context';
import {
  saveQuiz,
  getSavedQuizzes,
  deleteQuiz,
  setActiveQuiz,
  saveDraftText,
  getDraftText,
} from '@/lib/storage';
import { QuizSet } from '@/types/quiz';
import {
  Play,
  Clock,
  Trash2,
  Share2,
  ArrowRight,
  BookMarked,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Copy,
  Check,
  X,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';

const SAMPLE_TEXT = `Q: What is the powerhouse of the cell?
A: Mitochondria
H: It generates most of the chemical energy needed to power the cell's biochemical reactions.

Q: Photosynthesis occurs in the animal cell.
A: False
H: Photosynthesis occurs in plant cells containing chloroplasts.

Q: The process by which water moves through a semipermeable membrane is called _____.
A: Osmosis
H: Movement of water molecules from lower solute concentration to higher.

Q: What is the primary gas found in Earth's atmosphere?
A: Nitrogen
H: It makes up approximately 78% of the atmosphere.

Q: DNA replication is conservative.
A: False
H: DNA replication is semi-conservative; each strand serves as a template for a new strand.

Q: The fundamental unit of heredity is the _____.
A: Gene
H: A sequence of nucleotides in DNA or RNA that encodes the synthesis of a gene product.`;

export default function HomePage() {
  const router = useRouter();
  const { isCreator } = useAuth();

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [timerMinutes, setTimerMinutes] = useState<number | null>(10);
  const [savedQuizzes, setSavedQuizzes] = useState<QuizSet[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Share modal state
  const [sharingLoading, setSharingLoading] = useState(false);
  const [shareResult, setShareResult] = useState<{
    code: string;
    title: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load saved quizzes & draft on mount
  useEffect(() => {
    setSavedQuizzes(getSavedQuizzes());
    const draft = getDraftText();
    if (draft) setText(draft);
  }, []);

  // Parse questions live
  const parsedQuestions = useMemo(() => {
    return parseQuizText(text);
  }, [text]);

  const handleTextChange = (val: string) => {
    setText(val);
    saveDraftText(val);
  };

  const handleLoadSample = () => {
    setTitle('Biology 101 Quick Review');
    handleTextChange(SAMPLE_TEXT);
  };

  const handleStartQuiz = () => {
    if (parsedQuestions.length === 0) return;

    const quizTitle = title.trim() || `Quiz (${new Date().toLocaleDateString()})`;
    const quiz: QuizSet = {
      id: `quiz-${Date.now().toString(36)}`,
      title: quizTitle,
      questions: parsedQuestions,
      createdAt: new Date().toISOString(),
      timeLimitMinutes: timerMinutes,
    };

    saveQuiz(quiz);
    setActiveQuiz(quiz);
    router.push('/quiz');
  };

  // Direct share from Studio without taking the quiz
  const handlePublishDirect = async () => {
    if (parsedQuestions.length === 0) return;

    setSharingLoading(true);
    const quizTitle = title.trim() || `Quiz (${new Date().toLocaleDateString()})`;

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
          title: quizTitle,
          questions: parsedQuestions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to share quiz');

      const quiz: QuizSet = {
        id: `quiz-${Date.now().toString(36)}`,
        title: quizTitle,
        questions: parsedQuestions,
        createdAt: new Date().toISOString(),
        timeLimitMinutes: timerMinutes,
        shareCode: data.shareCode,
      };

      saveQuiz(quiz);
      setSavedQuizzes(getSavedQuizzes());
      setShareResult({ code: data.shareCode, title: quizTitle });
    } catch (err: any) {
      alert(`Could not share quiz: ${err?.message}`);
    } finally {
      setSharingLoading(false);
    }
  };

  // Share existing saved quiz
  const handleShareExisting = async (quiz: QuizSet, e: React.MouseEvent) => {
    e.stopPropagation();
    setSharingLoading(true);

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

      const updated = { ...quiz, shareCode: data.shareCode };
      saveQuiz(updated);
      setSavedQuizzes(getSavedQuizzes());
      setShareResult({ code: data.shareCode, title: quiz.title });
    } catch (err: any) {
      alert(`Could not share quiz: ${err?.message}`);
    } finally {
      setSharingLoading(false);
    }
  };

  const handleStartSaved = (quiz: QuizSet) => {
    setActiveQuiz(quiz);
    router.push('/quiz');
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteQuiz(id);
    setSavedQuizzes(getSavedQuizzes());
  };

  const handleJoinQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    setJoinLoading(true);
    setJoinError('');

    try {
      const res = await fetch(`/api/quiz/share?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || !data.quiz) {
        throw new Error(data.error || 'Quiz not found');
      }

      const remoteQuiz: QuizSet = {
        id: data.quiz.id,
        title: data.quiz.title,
        questions: data.quiz.questions,
        createdAt: data.quiz.createdAt,
        shareCode: data.quiz.shareCode,
        timeLimitMinutes: 10,
      };

      saveQuiz(remoteQuiz);
      setActiveQuiz(remoteQuiz);
      router.push('/quiz');
    } catch (err: any) {
      setJoinError(err?.message || 'Could not load quiz');
    } finally {
      setJoinLoading(false);
    }
  };

  const countsByType = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const q of parsedQuestions) {
      stats[q.type] = (stats[q.type] || 0) + 1;
    }
    return stats;
  }, [parsedQuestions]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ── Student Mode Header (when not creator) ── */}
      {!isCreator ? (
        <div className="space-y-6">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 mb-2">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Study Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome to StudyQuiz
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xl">
              Enter your quiz code to start practicing offline, or choose from your saved quizzes below.
            </p>
          </div>

          {/* Large, Prominent Join Box for Students */}
          <div className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-base">
              <Share2 className="w-5 h-5 text-blue-500" />
              <span>Enter Quiz Join Code</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Paste the 6-character code provided by your instructor or classmate to begin your quiz.
            </p>

            <form onSubmit={handleJoinQuiz} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. ABC123"
                maxLength={8}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 text-base uppercase tracking-widest font-mono rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-center font-bold"
              />
              <button
                type="submit"
                disabled={!joinCode.trim() || joinLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold transition-all disabled:opacity-40 shadow-xs"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{joinLoading ? 'Downloading Quiz...' : 'Start Quiz'}</span>
              </button>
            </form>
            {joinError && (
              <p className="text-xs text-rose-500 font-medium">{joinError}</p>
            )}
          </div>
        </div>
      ) : (
        /* ── Creator Mode Active Banner ── */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Creator Mode Active — You can create, paste, and publish new quizzes for your class.</span>
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 opacity-80">
              Prototype Admin
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Quiz Creator Studio
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Copy Q&A answers from Gemini, paste them here, and start drilling offline or publish to your class.
            </p>
          </div>

          {/* Gemini Prompt Helper */}
          <PromptBox />

          {/* Creator Studio Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs p-6 space-y-5">
            {/* Title & Sample button */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="w-full sm:max-w-md">
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Quiz Title (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. World History Chapter 4"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                />
              </div>

              <button
                onClick={handleLoadSample}
                type="button"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 self-end sm:self-auto py-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Try with sample questions
              </button>
            </div>

            {/* Text Area */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Paste Q&A Content
              </label>
              <textarea
                rows={8}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Q: What is the capital of France?&#10;A: Paris&#10;H: Known as the City of Light&#10;&#10;Q: Water boils at 100 degrees Celsius.&#10;A: True&#10;H: At standard atmospheric pressure"
                className="w-full p-3.5 text-sm font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 placeholder:text-zinc-400 leading-relaxed resize-y"
              />

              {/* Live Parsing Preview Bar */}
              <div className="flex flex-wrap items-center justify-between text-xs pt-1 text-zinc-500 dark:text-zinc-400 gap-2">
                <div>
                  {parsedQuestions.length > 0 ? (
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      Ready: {parsedQuestions.length} question{parsedQuestions.length !== 1 ? 's' : ''} detected
                      {countsByType.multiple_choice ? ` (${countsByType.multiple_choice} multiple choice` : ''}
                      {countsByType.true_false ? `, ${countsByType.true_false} T/F` : ''}
                      {countsByType.fill_blank ? `, ${countsByType.fill_blank} fill-blank` : ''}
                      {countsByType.type_answer ? `, ${countsByType.type_answer} typed` : ''}
                      {countsByType.flashcard ? `, ${countsByType.flashcard} flashcard` : ''})
                    </span>
                  ) : (
                    <span>Paste at least one Q: and A: pair to begin.</span>
                  )}
                </div>

                {text && (
                  <button
                    type="button"
                    onClick={() => handleTextChange('')}
                    className="hover:text-rose-600 transition-colors"
                  >
                    Clear text
                  </button>
                )}
              </div>
            </div>

            {/* Options & Action Buttons */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                  Timer:
                </span>
                <select
                  value={timerMinutes === null ? 'none' : timerMinutes}
                  onChange={(e) =>
                    setTimerMinutes(e.target.value === 'none' ? null : Number(e.target.value))
                  }
                  className="px-2.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 font-medium text-zinc-800 dark:text-zinc-200"
                >
                  <option value="none">Untimed (Practice)</option>
                  <option value="5">5 Minutes</option>
                  <option value="10">10 Minutes</option>
                  <option value="15">15 Minutes</option>
                  <option value="25">25 Minutes</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {/* Direct Share Button */}
                <button
                  type="button"
                  onClick={handlePublishDirect}
                  disabled={parsedQuestions.length === 0 || sharingLoading}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  <Share2 className="w-4 h-4 text-blue-500" />
                  <span>{sharingLoading ? 'Publishing...' : 'Share & Get Code'}</span>
                </button>

                {/* Start Quiz Button */}
                <button
                  onClick={handleStartQuiz}
                  disabled={parsedQuestions.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    Start Quiz {parsedQuestions.length > 0 ? `(${parsedQuestions.length})` : ''}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Saved Quizzes List (Always Visible) ── */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold text-sm">
            <BookMarked className="w-4 h-4 text-emerald-500" />
            <span>Available Study Sets ({savedQuizzes.length})</span>
          </div>
          <span className="text-xs text-zinc-400">Works 100% offline</span>
        </div>

        {savedQuizzes.length === 0 ? (
          <div className="text-center py-10 text-xs text-zinc-400 space-y-1">
            <p>No study sets saved yet.</p>
            <p className="text-[11px] text-zinc-400">
              Enter a 6-character code above to download a quiz from your classmate.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {savedQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                onClick={() => handleStartSaved(quiz)}
                className="group flex items-center justify-between p-3.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-white dark:hover:bg-zinc-900 cursor-pointer transition-all"
              >
                <div className="min-w-0 pr-3">
                  <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-zinc-950 dark:group-hover:text-white">
                    {quiz.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span>{quiz.questions.length} questions</span>
                    {quiz.shareCode ? (
                      <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded text-[11px] text-zinc-800 dark:text-zinc-200 font-semibold">
                        Code: {quiz.shareCode}
                      </span>
                    ) : null}
                    <span>· {new Date(quiz.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {quiz.shareCode ? (
                    <Link
                      href={`/leaderboard/${quiz.shareCode}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors flex items-center gap-1"
                    >
                      <Trophy className="w-3 h-3" />
                      <span>Leaderboard</span>
                    </Link>
                  ) : isCreator ? (
                    <button
                      onClick={(e) => handleShareExisting(quiz, e)}
                      title="Share and get code"
                      className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors flex items-center gap-1"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </button>
                  ) : null}

                  {isCreator && (
                    <button
                      onClick={(e) => handleDeleteSaved(quiz.id, e)}
                      title="Delete quiz"
                      className="p-1.5 text-zinc-400 hover:text-rose-500 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Success Modal */}
      {shareResult && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Share2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Quiz Shared Successfully!
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Give this 6-character code to your classmates:
              </p>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-2xl font-mono font-extrabold tracking-widest text-zinc-900 dark:text-zinc-100">
                {shareResult.code}
              </span>
              <button
                onClick={() => handleCopyCode(shareResult.code)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 flex items-center gap-1 transition-opacity"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/leaderboard/${shareResult.code}`}
                onClick={() => setShareResult(null)}
                className="flex-1 py-2 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                View Leaderboard
              </Link>
              <button
                onClick={() => setShareResult(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
