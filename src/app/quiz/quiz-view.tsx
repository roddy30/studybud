'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QuizSet, ParsedQuestion, QuestionResult } from '@/types/quiz';
import { isAnswerCorrect } from '@/lib/parser';
import {
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCw,
  Clock,
  HelpCircle,
} from 'lucide-react';

interface QuizViewProps {
  quiz: QuizSet;
  onComplete: (results: QuestionResult[], timeUsedSeconds: number) => void;
  onExit: () => void;
}

export function QuizView({ quiz, onComplete, onExit }: QuizViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintUsedThisQuestion, setHintUsedThisQuestion] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Results accumulator
  const [results, setResults] = useState<QuestionResult[]>([]);

  // Real-time score counters
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);

  // Timer
  const totalSeconds = quiz.timeLimitMinutes ? quiz.timeLimitMinutes * 60 : null;
  const [timeLeft, setTimeLeft] = useState<number | null>(totalSeconds);
  const startTimeRef = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQ: ParsedQuestion = quiz.questions[currentIndex];
  const totalQuestions = quiz.questions.length;
  const remainingCount = totalQuestions - results.length;

  // Auto-focus input for typing questions
  useEffect(() => {
    if (
      !isAnswered &&
      (currentQ?.type === 'type_answer' || currentQ?.type === 'fill_blank')
    ) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [currentIndex, isAnswered, currentQ?.type]);

  // Finish quiz helper
  const handleFinish = useCallback(
    (currentResults: QuestionResult[]) => {
      const timeUsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      onComplete(currentResults, timeUsed);
    },
    [onComplete]
  );

  // Timer countdown
  useEffect(() => {
    if (totalSeconds === null) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          // Time expired! Mark uncompleted questions as unanswered
          const completedIds = new Set(results.map((r) => r.questionId));
          const uncompleted = quiz.questions
            .filter((q) => !completedIds.has(q.id))
            .map((q) => ({
              questionId: q.id,
              question: q.question,
              correctAnswer: q.answer,
              userAnswer: '(Time expired)',
              status: 'unanswered' as const,
              hintUsed: false,
              type: q.type,
            }));

          handleFinish([...results, ...uncompleted]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [totalSeconds, results, quiz.questions, handleFinish]);

  // Submit answer
  const submitAnswer = useCallback(
    (ans: string) => {
      if (isAnswered) return;

      const trimmedAns = ans.trim();
      const correct = isAnswerCorrect(trimmedAns, currentQ.answer);

      setIsAnswered(true);
      setIsCorrect(correct);
      setUserAnswer(trimmedAns);

      if (correct) {
        setCorrectCount((c) => c + 1);
      } else {
        setWrongCount((w) => w + 1);
      }

      const res: QuestionResult = {
        questionId: currentQ.id,
        question: currentQ.question,
        correctAnswer: currentQ.answer,
        userAnswer: trimmedAns || '(No answer)',
        status: correct ? 'correct' : 'wrong',
        hintUsed: hintUsedThisQuestion,
        type: currentQ.type,
      };

      setResults((prev) => [...prev, res]);
    },
    [isAnswered, currentQ, hintUsedThisQuestion]
  );

  // Next Question
  const nextQuestion = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsAnswered(false);
      setIsCorrect(false);
      setUserAnswer('');
      setShowHint(false);
      setHintUsedThisQuestion(false);
      setCardFlipped(false);
    } else {
      handleFinish(results);
    }
  }, [currentIndex, totalQuestions, results, handleFinish]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input, ignore number keys for options
      const inInput = document.activeElement === inputRef.current;

      // Hint shortcut: H
      if ((e.key === 'h' || e.key === 'H') && !inInput && !isAnswered) {
        setShowHint(true);
        setHintUsedThisQuestion(true);
        return;
      }

      // Enter to advance when answered
      if (e.key === 'Enter') {
        if (isAnswered) {
          e.preventDefault();
          nextQuestion();
          return;
        } else if (
          currentQ?.type === 'type_answer' ||
          currentQ?.type === 'fill_blank'
        ) {
          e.preventDefault();
          submitAnswer(userAnswer);
          return;
        }
      }

      // Space to flip flashcard
      if (e.key === ' ' && currentQ?.type === 'flashcard' && !isAnswered) {
        e.preventDefault();
        setCardFlipped((f) => !f);
        return;
      }

      // 1-4 for multiple choice
      if (
        !inInput &&
        !isAnswered &&
        currentQ?.type === 'multiple_choice' &&
        currentQ.options
      ) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= currentQ.options.length) {
          e.preventDefault();
          submitAnswer(currentQ.options[num - 1]);
          return;
        }
      }

      // T / F for True/False
      if (!inInput && !isAnswered && currentQ?.type === 'true_false') {
        if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          submitAnswer('True');
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          submitAnswer('False');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAnswered,
    currentQ,
    userAnswer,
    submitAnswer,
    nextQuestion,
  ]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timerWarning =
    timeLeft !== null && totalSeconds
      ? timeLeft < totalSeconds * 0.1
        ? 'text-rose-600 dark:text-rose-400 font-bold animate-pulse'
        : timeLeft < totalSeconds * 0.25
        ? 'text-amber-600 dark:text-amber-400 font-semibold'
        : 'text-zinc-700 dark:text-zinc-300'
      : '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header: Progress, Timer, Live Counters */}
      <div className="space-y-3">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <button
            onClick={onExit}
            className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors py-1 shrink-0"
          >
            ← Exit
          </button>

          {/* Real-time Tally */}
          <div className="flex items-center gap-2 sm:gap-3 font-medium order-3 sm:order-2 w-full sm:w-auto justify-center sm:justify-start pt-1.5 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/60">
            <span className="text-emerald-600 dark:text-emerald-400">
              ✓ {correctCount}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span className="text-rose-500 dark:text-rose-400">
              ✗ {wrongCount}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span className="text-zinc-400">
              {remainingCount} left
            </span>
          </div>

          {/* Countdown Clock */}
          {timeLeft !== null ? (
            <div className={`flex items-center gap-1 font-mono text-sm shrink-0 order-2 sm:order-3 ${timerWarning}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
          ) : (
            <span className="shrink-0 order-2 sm:order-3 text-zinc-400">Untimed</span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-zinc-900 dark:bg-zinc-100 h-full transition-all duration-300 ease-out"
            style={{
              width: `${((currentIndex + (isAnswered ? 1 : 0)) / totalQuestions) * 100}%`,
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <span className="capitalize">{currentQ.type.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-xs space-y-6">
        {/* Flashcard Style */}
        {currentQ.type === 'flashcard' ? (
          <div
            onClick={() => !isAnswered && setCardFlipped(!cardFlipped)}
            className="min-h-[180px] flex flex-col justify-center items-center text-center cursor-pointer p-4 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 select-none transition-all"
          >
            {!cardFlipped ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                  Prompt
                </p>
                <h2 className="text-lg sm:text-xl font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
                  {currentQ.question}
                </h2>
                <p className="text-xs text-zinc-400 pt-2 flex items-center justify-center gap-1">
                  <RotateCw className="w-3 h-3" /> Click or press Space to reveal answer
                </p>
              </div>
            ) : (
              <div className="space-y-3 animate-in fade-in zoom-in-95">
                <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                  Answer
                </p>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {currentQ.answer}
                </h3>
              </div>
            )}
          </div>
        ) : (
          /* Standard Question Prompt */
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
              {currentQ.question}
            </h2>
          </div>
        )}

        {/* Question Interactive Options */}
        <div className="space-y-3">
          {/* 1. Multiple Choice */}
          {currentQ.type === 'multiple_choice' && currentQ.options && (
            <div className="grid gap-2.5">
              {currentQ.options.map((opt, i) => {
                const isSelected = userAnswer === opt;
                let btnStyle =
                  'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-800 dark:text-zinc-200';

                if (isAnswered) {
                  if (opt === currentQ.answer) {
                    btnStyle =
                      'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium';
                  } else if (isSelected && !isCorrect) {
                    btnStyle =
                      'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200';
                  } else {
                    btnStyle = 'opacity-40 border-zinc-200 dark:border-zinc-800 text-zinc-400';
                  }
                }

                return (
                  <button
                    key={i}
                    disabled={isAnswered}
                    onClick={() => submitAnswer(opt)}
                    className={`w-full text-left p-3.5 min-h-[48px] rounded-lg border text-sm flex items-start gap-3 transition-all active:scale-[0.99] touch-manipulation ${btnStyle}`}
                  >
                    <span className="w-5 h-5 rounded-sm bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-mono shrink-0 font-semibold text-zinc-500 dark:text-zinc-400">
                      {i + 1}
                    </span>
                    <span className="flex-1 pt-0.5">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 2. True / False */}
          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3">
              {['True', 'False'].map((val) => {
                const isSelected = userAnswer.toLowerCase() === val.toLowerCase();
                let btnStyle =
                  'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200';

                if (isAnswered) {
                  const correctIsVal = isAnswerCorrect(val, currentQ.answer);
                  if (correctIsVal) {
                    btnStyle =
                      'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                  } else if (isSelected && !isCorrect) {
                    btnStyle =
                      'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200';
                  } else {
                    btnStyle = 'opacity-40 border-zinc-200 dark:border-zinc-800 text-zinc-400';
                  }
                }

                return (
                  <button
                    key={val}
                    disabled={isAnswered}
                    onClick={() => submitAnswer(val)}
                    className={`py-4 min-h-[52px] rounded-lg border text-sm font-medium transition-all active:scale-[0.98] touch-manipulation ${btnStyle}`}
                  >
                    <span>{val}</span>
                    <span className="text-xs text-zinc-400 block mt-0.5 font-mono">
                      (Press {val[0]})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3. Type the Answer & Fill in the Blank */}
          {(currentQ.type === 'type_answer' || currentQ.type === 'fill_blank') && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  disabled={isAnswered}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder={
                    currentQ.type === 'fill_blank'
                      ? 'Type the missing word(s)...'
                      : 'Type your answer here...'
                  }
                  className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 disabled:opacity-75"
                />
                {!isAnswered && (
                  <button
                    onClick={() => submitAnswer(userAnswer)}
                    disabled={!userAnswer.trim()}
                    className="px-4 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 disabled:opacity-30 transition-opacity"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4. Flashcard Self-Rating (once flipped) */}
          {currentQ.type === 'flashcard' && cardFlipped && !isAnswered && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => submitAnswer('Wrong')}
                className="flex-1 py-2.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 transition-colors"
              >
                ✗ Still Learning (1)
              </button>
              <button
                onClick={() => submitAnswer(currentQ.answer)}
                className="flex-1 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors"
              >
                ✓ I Knew It (2)
              </button>
            </div>
          )}
        </div>

        {/* Hint Accordion */}
        <div className="pt-2">
          {!showHint ? (
            <button
              onClick={() => {
                setShowHint(true);
                setHintUsedThisQuestion(true);
              }}
              disabled={isAnswered}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 inline-flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Need a hint? (Press H)</span>
            </button>
          ) : (
            <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 animate-in fade-in">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Hint: </span>
                <span>{currentQ.hint}</span>
              </div>
            </div>
          )}
        </div>

        {/* Immediate Feedback Card & Next Button */}
        {isAnswered && (
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4 animate-in fade-in slide-in-from-bottom-1">
            <div
              className={`p-3.5 rounded-lg text-sm flex items-start gap-2.5 ${
                isCorrect
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900'
                  : 'bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-900'
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-semibold">
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </div>
                {!isCorrect && (
                  <div className="text-xs">
                    Correct answer: <span className="font-semibold">{currentQ.answer}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={nextQuestion}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold transition-all shadow-xs"
              >
                <span>{currentIndex < totalQuestions - 1 ? 'Next Question' : 'View Full Review'}</span>
                <ArrowRight className="w-4 h-4" />
                <span className="text-[10px] text-zinc-400 font-mono opacity-80">(Enter)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
