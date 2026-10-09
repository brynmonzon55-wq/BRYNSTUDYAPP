import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Trophy,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Topic, QuizQuestion, QuizDepth } from '../types';
import { getCachedQuiz, setCachedQuiz, updateTopicAfterQuiz, addMistake } from '../utils/storage';
import { fireConfetti } from '../utils/confetti';

interface QuizModalProps {
  topic?: Topic; // If undefined, combined review or custom set
  customQuestions?: QuizQuestion[];
  initialDepth?: QuizDepth;
  count?: number;
  onClose: () => void;
  onQuizCompleted?: (score: number, total: number) => void;
  onPracticeMistakes?: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  topic,
  customQuestions,
  initialDepth = 'balanced',
  count = 15,
  onClose,
  onQuizCompleted,
  onPracticeMistakes,
}) => {
  const [depth] = useState<QuizDepth>(initialDepth);
  const [questions, setQuestions] = useState<QuizQuestion[]>(customQuestions || []);
  const [loading, setLoading] = useState<boolean>(!customQuestions);
  const [error, setError] = useState<string | null>(null);

  // Active quiz state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Map of question index -> answer record
  const [answersMap, setAnswersMap] = useState<
    Record<number, { selectedOption: number; isCorrect: boolean }>
  >({});

  // Timer tracking
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Interval adjustment message
  const [intervalFeedback, setIntervalFeedback] = useState<string | null>(null);

  // "Explain it simpler" state
  const [simplifying, setSimplifying] = useState<boolean>(false);
  const [simplifiedData, setSimplifiedData] = useState<{ simplified: string; analogy: string } | null>(null);
  const [showSimplifyBox, setShowSimplifyBox] = useState<boolean>(false);

  // Wrong answers tracked in current run
  const [wrongQuestionsCount, setWrongQuestionsCount] = useState<number>(0);

  // Timer effect
  useEffect(() => {
    if (loading || error || isFinished) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, error, isFinished]);

  // Load questions on mount or count change
  useEffect(() => {
    if (customQuestions && customQuestions.length > 0) {
      setQuestions(customQuestions);
      setLoading(false);
      return;
    }

    if (!topic) return;

    loadOrGenerateQuiz(false);
  }, [topic?.id, depth, count]);

  const loadOrGenerateQuiz = async (forceNew: boolean) => {
    if (!topic) return;

    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
    setIntervalFeedback(null);
    setShowSimplifyBox(false);
    setSimplifiedData(null);
    setWrongQuestionsCount(0);
    setAnswersMap({});
    setElapsedSeconds(0);

    const cacheKey = `${depth}_${count}`;

    // 1. Check cache first
    if (!forceNew) {
      const cached = getCachedQuiz(topic.id, cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setQuestions(cached);
        setLoading(false);
        return;
      }
    }

    // 2. Fetch from Gemini API
    try {
      const res = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.title,
          notes: topic.notes,
          depth,
          count,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions returned by Gemini');
      }

      setQuestions(data.questions);
      setCachedQuiz(topic.id, cacheKey, data.questions);
    } catch (err: any) {
      console.error('Quiz fetch failed:', err);
      setError(
        !navigator.onLine
          ? "You're offline. This quiz hasn't been generated yet. Open a quiz you've already created, or reconnect to generate a new one."
          : err.message || 'Failed to generate quiz. Please check your connection and retry.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (isAnswered) return;

    const currentQ = questions[currentIndex];
    const isCorrect = optionIndex === currentQ.correctIndex;

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    setAnswersMap((prev) => ({
      ...prev,
      [currentIndex]: { selectedOption: optionIndex, isCorrect },
    }));

    if (isCorrect) {
      setScore((prev) => prev + 1);
    } else {
      setWrongQuestionsCount((prev) => prev + 1);
      // Automatically add to Weak Spots mistake bank
      if (topic) {
        addMistake({
          topicId: topic.id,
          topicTitle: topic.title,
          question: currentQ.question,
          options: currentQ.options,
          correctIndex: currentQ.correctIndex,
          userSelectedOption: currentQ.options[optionIndex],
          explanation: currentQ.explanation,
        });
      }
    }
  };

  const jumpToQuestion = (targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    setCurrentIndex(targetIdx);
    setShowSimplifyBox(false);
    setSimplifiedData(null);

    const saved = answersMap[targetIdx];
    if (saved) {
      setSelectedOption(saved.selectedOption);
      setIsAnswered(true);
    } else {
      setSelectedOption(null);
      setIsAnswered(false);
    }
  };

  const handleNextQuestion = () => {
    setShowSimplifyBox(false);
    setSimplifiedData(null);

    // If next question exists, navigate to it
    if (currentIndex + 1 < questions.length) {
      jumpToQuestion(currentIndex + 1);
    } else {
      // Finished all questions!
      finishQuiz();
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      jumpToQuestion(currentIndex - 1);
    }
  };

  const finishQuiz = () => {
    setIsFinished(true);
    const finalScore = score + (selectedOption === questions[currentIndex]?.correctIndex && !answersMap[currentIndex] ? 1 : 0);
    const total = questions.length;
    const pct = total > 0 ? (finalScore / total) * 100 : 0;

    if (pct >= 80) {
      fireConfetti();
    }

    if (topic) {
      const { intervalChange } = updateTopicAfterQuiz(topic.id, finalScore, total, depth);
      setIntervalFeedback(intervalChange);
    }

    if (onQuizCompleted) {
      onQuizCompleted(finalScore, total);
    }
  };

  // "Explain it simpler" handler
  const handleSimplifyExplanation = async () => {
    if (simplifiedData) {
      setShowSimplifyBox(true);
      return;
    }

    const currentQ = questions[currentIndex];
    setSimplifying(true);
    setShowSimplifyBox(true);

    try {
      const res = await fetch('/api/gemini/simplify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic?.title || currentQ.topicTitle || 'General',
          concept: currentQ.question,
          explanation: currentQ.explanation,
        }),
      });

      if (!res.ok) throw new Error('Failed to simplify');
      const data = await res.json();
      setSimplifiedData(data);
    } catch (err) {
      console.error('Simplify request failed:', err);
      setSimplifiedData({
        simplified: 'Unable to connect to AI for a simpler analogy at this moment.',
        analogy: 'Think of it as breaking a complex problem into familiar everyday terms.',
      });
    } finally {
      setSimplifying(false);
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
    setShowSimplifyBox(false);
    setSimplifiedData(null);
    setWrongQuestionsCount(0);
    setAnswersMap({});
    setElapsedSeconds(0);
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answersMap).length;
  const progressPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  // Compute missed question items for final review
  const missedQuestionsList = questions
    .map((q, idx) => ({ q, idx, ans: answersMap[idx] }))
    .filter((item) => item.ans && !item.ans.isCorrect);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                {topic ? topic.title : 'Interleaved Review Quiz'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="capitalize font-semibold text-blue-600 dark:text-blue-400">
                  {depth} Depth
                </span>
                <span>·</span>
                <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                  {questions.length} Questions
                </span>
                {!isFinished && questions.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="tabular-nums text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatDuration(elapsedSeconds)}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isFinished && questions.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{score}</span>
                <span className="text-slate-400">/</span>
                <span>{answeredCount}</span>
                {answeredCount > 0 && (
                  <span className="text-[11px] text-slate-400">
                    ({Math.round((score / answeredCount) * 100)}%)
                  </span>
                )}
              </div>
            )}

            {topic && !isFinished && !loading && (
              <button
                onClick={() => loadOrGenerateQuiz(true)}
                title="Generate fresh question set"
                className="p-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Regenerate</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-Time Progress Bar */}
        {!loading && !error && !isFinished && questions.length > 0 && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 overflow-hidden">
            <div
              className="bg-linear-to-r from-blue-600 via-indigo-500 to-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Quick Question Navigator Tray for Scalable Quizzes (15, 25, 50 questions) */}
        {!loading && !error && !isFinished && questions.length > 1 && (
          <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 select-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pr-1 shrink-0">
              Tray:
            </span>
            {questions.map((_, idx) => {
              const ans = answersMap[idx];
              const isCurrent = idx === currentIndex;

              let pillStyle =
                'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700';

              if (ans) {
                pillStyle = ans.isCorrect
                  ? 'bg-emerald-500 text-white font-bold'
                  : 'bg-rose-500 text-white font-bold';
              } else if (isCurrent) {
                pillStyle =
                  'bg-blue-600 text-white font-bold ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-slate-900';
              }

              return (
                <button
                  key={idx}
                  onClick={() => jumpToQuestion(idx)}
                  className={`w-7 h-6 rounded-md text-[11px] font-semibold tabular-nums flex items-center justify-center shrink-0 transition-all ${pillStyle} ${
                    isCurrent && !ans ? 'scale-105' : ''
                  }`}
                  title={`Question ${idx + 1}${
                    ans ? (ans.isCorrect ? ' (Correct)' : ' (Incorrect)') : ''
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        )}

        {/* Main Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {/* Loading State */}
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Gemini is crafting active-recall questions...
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Calibrating {count} high-yield questions, plausible distractors, and educational explanations for "{topic?.title || 'this topic'}".
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="py-12 text-center space-y-3.5 max-w-md mx-auto">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Quiz Generation Error
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {error}
              </p>
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                ⚠️ Placeholder and generic questions are strictly disabled to protect study quality.
              </div>
              <button
                onClick={() => loadOrGenerateQuiz(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Generation</span>
              </button>
            </div>
          )}

          {/* ACTIVE QUIZ QUESTION VIEW */}
          {!loading && !error && !isFinished && currentQ && (
            <div className="space-y-6">
              {/* Question Context & Prompt */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-2">
                  <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                    {currentQ.difficulty || 'Medium'} Difficulty
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="text-slate-400">
                      ({questions.length - answeredCount} remaining)
                    </span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {currentQ.question}
                </h3>
              </div>

              {/* 4 Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentQ.correctIndex;

                  let optionStyle =
                    'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200';

                  if (isAnswered) {
                    if (isCorrect) {
                      // Correct option: always green
                      optionStyle =
                        'border-emerald-500 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-medium ring-2 ring-emerald-500/20';
                    } else if (isSelected && !isCorrect) {
                      // Wrong selected option: red
                      optionStyle =
                        'border-rose-500 dark:border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100 font-medium ring-2 ring-rose-500/20';
                    } else {
                      optionStyle = 'opacity-50 border-slate-200 dark:border-slate-800';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswered}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isAnswered && isCorrect
                              ? 'bg-emerald-600 text-white'
                              : isAnswered && isSelected && !isCorrect
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-xs sm:text-sm leading-relaxed">{option}</span>
                      </div>

                      {isAnswered && isCorrect && (
                        <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      {isAnswered && isSelected && !isCorrect && (
                        <X className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Immediate Feedback Card */}
              {isAnswered && (
                <div
                  className={`p-4 rounded-xl border animate-in fade-in duration-200 ${
                    selectedOption === currentQ.correctIndex
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-100'
                      : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80 text-rose-950 dark:text-rose-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      {selectedOption === currentQ.correctIndex ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Correct!</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-rose-600" />
                          <span>Incorrect (Logged to Weak Spots)</span>
                        </>
                      )}
                    </span>

                    {/* "Explain it simpler" button */}
                    <button
                      onClick={handleSimplifyExplanation}
                      disabled={simplifying}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>{simplifying ? 'Simplifying...' : 'Explain it simpler'}</span>
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentQ.explanation}
                  </p>

                  {/* Simplified Analogy Drawer */}
                  {showSimplifyBox && (
                    <div className="mt-3 p-3 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-amber-200 dark:border-amber-800/80 text-xs text-slate-800 dark:text-slate-200 space-y-1.5">
                      <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>Everyday Analogy:</span>
                      </div>
                      {simplifying ? (
                        <p className="text-slate-500 animate-pulse">
                          Generating intuitive mental model...
                        </p>
                      ) : (
                        <>
                          <p className="italic text-slate-700 dark:text-slate-300">
                            "{simplifiedData?.analogy}"
                          </p>
                          <p className="text-slate-600 dark:text-slate-400 pt-1">
                            {simplifiedData?.simplified}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handlePrevQuestion}
                  disabled={currentIndex === 0}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {isAnswered && (
                  <button
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs sm:text-sm flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-white shadow-xs transition-colors"
                  >
                    <span>
                      {currentIndex + 1 < questions.length ? 'Next Question' : 'View Results'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* QUIZ FINISHED / SCORE SUMMARY VIEW */}
          {isFinished && (
            <div className="py-4 space-y-6">
              {/* Top Hero Banner */}
              <div className="p-6 rounded-2xl bg-linear-to-b from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-200 dark:border-blue-800/60 text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Trophy className="w-8 h-8" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {Math.round((score / questions.length) * 100) >= 80
                        ? 'Mastery Level Achieved'
                        : 'Session Completed'}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                    Quiz Completed!
                  </h3>

                  <div className="text-4xl sm:text-5xl font-black text-blue-600 dark:text-blue-400 my-2 tabular-nums">
                    {score} / {questions.length}
                  </div>

                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {Math.round((score / questions.length) * 100)}% Accuracy Score across {questions.length} questions
                  </p>
                </div>
              </div>

              {/* Session Analytics Dashboard Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Exam Size</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                    {questions.length} Qs
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Correct</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                    {score}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Review Time</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                    {formatDuration(elapsedSeconds)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Pace</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
                    {questions.length > 0 ? (elapsedSeconds / questions.length).toFixed(1) : 0}s / Q
                  </div>
                </div>
              </div>

              {/* Spaced repetition interval impact */}
              {intervalFeedback && (
                <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs text-slate-800 dark:text-slate-200">
                  <span className="font-bold block text-amber-900 dark:text-amber-300 mb-0.5">
                    Spaced Repetition Schedule Updated
                  </span>
                  {intervalFeedback}
                </div>
              )}

              {/* Missed Questions Breakdown Table */}
              {missedQuestionsList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span>Missed Questions Breakdown ({missedQuestionsList.length})</span>
                    </span>
                    {onPracticeMistakes && (
                      <button
                        onClick={onPracticeMistakes}
                        className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                      >
                        Practice in Weak Spots →
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {missedQuestionsList.map(({ q, idx, ans }) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 text-xs space-y-1.5"
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          Q{idx + 1}. {q.question}
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">
                          <span className="text-rose-600 font-medium">Your answer: </span>
                          {ans ? q.options[ans.selectedOption] : 'None'} ·{' '}
                          <span className="text-emerald-600 font-medium">Correct: </span>
                          {q.options[q.correctIndex]}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          💡 {q.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                <button
                  onClick={restartQuiz}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Same {questions.length} Questions</span>
                </button>

                {topic && (
                  <button
                    onClick={() => loadOrGenerateQuiz(true)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate Fresh Set</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
