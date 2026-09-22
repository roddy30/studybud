'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PromptBox } from '@/components/prompt-box';
import { parseQuizText } from '@/lib/parser';
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
  FileQuestion,
  ArrowRight,
  BookMarked,
  Sparkles,
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
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [timerMinutes, setTimerMinutes] = useState<number | null>(10);
  const [savedQuizzes, setSavedQuizzes] = useState<QuizSet[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

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

    // Save to persistent storage and active session
    saveQuiz(quiz);
    setActiveQuiz(quiz);

    router.push('/quiz');
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

  // Group stats for live preview
  const countsByType = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const q of parsedQuestions) {
      stats[q.type] = (stats[q.type] || 0) + 1;
    }
    return stats;
  }, [parsedQuestions]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Intro Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create Study Quiz
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Copy Q&A answers from Gemini, paste them here, and start drilling offline.
        </p>
      </div>

      {/* Gemini Prompt Helper */}
      <PromptBox />

      {/* Main Studio Card */}
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
          <div className="relative">
            <textarea
              rows={8}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Q: What is the capital of France?&#10;A: Paris&#10;H: Known as the City of Light&#10;&#10;Q: Water boils at 100 degrees Celsius.&#10;A: True&#10;H: At standard atmospheric pressure"
              className="w-full p-3.5 text-sm font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 placeholder:text-zinc-400 leading-relaxed resize-y"
            />
          </div>

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

        {/* Options & Start Button */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Timer Selector */}
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

          {/* Start Button */}
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

      {/* Grid: Join with Code & Saved Quizzes */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Join shared quiz card */}
        <div className="md:col-span-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-medium text-sm">
            <Share2 className="w-4 h-4 text-blue-500" />
            <span>Join Classmate&apos;s Quiz</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Have a 6-character code from a classmate? Enter it below to test yourself.
          </p>

          <form onSubmit={handleJoinQuiz} className="space-y-2">
            <input
              type="text"
              placeholder="e.g. ABC123"
              maxLength={8}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-sm uppercase tracking-wider font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 text-center font-bold"
            />
            {joinError && (
              <p className="text-xs text-rose-500 font-medium">{joinError}</p>
            )}
            <button
              type="submit"
              disabled={!joinCode.trim() || joinLoading}
              className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors disabled:opacity-40"
            >
              {joinLoading ? 'Loading...' : 'Download & Take Quiz'}
            </button>
          </form>
        </div>

        {/* Saved Quizzes */}
        <div className="md:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-medium text-sm">
              <BookMarked className="w-4 h-4 text-emerald-500" />
              <span>Saved Sets ({savedQuizzes.length})</span>
            </div>
            <span className="text-xs text-zinc-400">Saved offline in browser</span>
          </div>

          {savedQuizzes.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-400">
              No saved quizzes yet. Create one above to review anytime.
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {savedQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  onClick={() => handleStartSaved(quiz)}
                  className="group flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-white dark:hover:bg-zinc-900 cursor-pointer transition-all"
                >
                  <div className="min-w-0 pr-3">
                    <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-zinc-950 dark:group-hover:text-white">
                      {quiz.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      <span>{quiz.questions.length} questions</span>
                      {quiz.shareCode && (
                        <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded text-[11px]">
                          Code: {quiz.shareCode}
                        </span>
                      )}
                      <span>· {new Date(quiz.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {quiz.shareCode && (
                      <Link
                        href={`/leaderboard/${quiz.shareCode}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                      >
                        Leaderboard
                      </Link>
                    )}
                    <button
                      onClick={(e) => handleDeleteSaved(quiz.id, e)}
                      title="Delete quiz"
                      className="p-1.5 text-zinc-400 hover:text-rose-500 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
