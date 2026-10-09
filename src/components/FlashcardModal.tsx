import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, RotateCw, Layers, Trophy } from 'lucide-react';
import { Topic, FlashcardItem, FlashcardRating } from '../types';
import { getCachedFlashcards, setCachedFlashcards, updateTopicAfterFlashcards } from '../utils/storage';
import { fireConfetti } from '../utils/confetti';

interface FlashcardModalProps {
  topic: Topic;
  onClose: () => void;
  onSessionComplete?: () => void;
}

export const FlashcardModal: React.FC<FlashcardModalProps> = ({
  topic,
  onClose,
  onSessionComplete,
}) => {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [activeQueue, setActiveQueue] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Ratings tally
  const [ratingsTally, setRatingsTally] = useState<{
    again: number;
    hard: number;
    good: number;
    easy: number;
  }>({ again: 0, hard: 0, good: 0, easy: 0 });

  const [intervalFeedback, setIntervalFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadOrGenerateFlashcards(false);
  }, [topic.id]);

  const loadOrGenerateFlashcards = async (forceNew: boolean) => {
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setRatingsTally({ again: 0, hard: 0, good: 0, easy: 0 });
    setIntervalFeedback(null);

    // 1. Check cache
    if (!forceNew) {
      const cached = getCachedFlashcards(topic.id);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setCards(cached);
        setActiveQueue(cached);
        setLoading(false);
        return;
      }
    }

    // 2. Fetch from Gemini API
    try {
      const res = await fetch('/api/gemini/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.title,
          notes: topic.notes,
          count: 10,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      if (!data.flashcards || data.flashcards.length === 0) {
        throw new Error('No flashcards generated.');
      }

      setCards(data.flashcards);
      setActiveQueue(data.flashcards);
      setCachedFlashcards(topic.id, data.flashcards);
    } catch (err: any) {
      console.error('Flashcard fetch failed:', err);
      setError(err.message || 'Failed to generate flashcards.');
    } finally {
      setLoading(false);
    }
  };

  const handleRateCard = (rating: FlashcardRating) => {
    const currentCard = activeQueue[currentIndex];
    setIsFlipped(false);

    // Update tally
    setRatingsTally((prev) => ({
      ...prev,
      [rating]: prev[rating] + 1,
    }));

    // If rating is 'again', re-append this card to the end of the session queue!
    let nextQueue = [...activeQueue];
    if (rating === 'again') {
      nextQueue.push({ ...currentCard, id: `repeat_${currentCard.id}_${Date.now()}` });
      setActiveQueue(nextQueue);
    }

    if (currentIndex + 1 < nextQueue.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Completed all cards including repeated ones!
      finishSession();
    }
  };

  const finishSession = () => {
    setIsFinished(true);
    fireConfetti();

    const { intervalChange } = updateTopicAfterFlashcards(topic.id, ratingsTally);
    setIntervalFeedback(intervalChange);

    if (onSessionComplete) {
      onSessionComplete();
    }
  };

  const restartDeck = () => {
    setActiveQueue(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setRatingsTally({ again: 0, hard: 0, good: 0, easy: 0 });
    setIntervalFeedback(null);
  };

  const currentCard = activeQueue[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                {topic.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isFinished
                  ? 'Deck Completed'
                  : `Card ${currentIndex + 1} of ${activeQueue.length}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!loading && !isFinished && (
              <button
                onClick={() => loadOrGenerateFlashcards(true)}
                title="Generate fresh deck"
                className="p-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Set</span>
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

        {/* Progress bar */}
        {!loading && !error && !isFinished && activeQueue.length > 0 && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
            <div
              className="bg-amber-500 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / activeQueue.length) * 100}%` }}
            />
          </div>
        )}

        {/* Main Area */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col justify-center">
          {loading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full border-3 border-amber-200 border-t-amber-600 animate-spin" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Generating active recall flashcards...
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Distilling core terms and memorable explanations for "{topic.title}".
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Flashcard Error
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {error}
              </p>
              <button
                onClick={() => loadOrGenerateFlashcards(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Deck</span>
              </button>
            </div>
          )}

          {/* ACTIVE FLIP CARD VIEW */}
          {!loading && !error && !isFinished && currentCard && (
            <div className="space-y-6 flex flex-col items-center">
              {/* Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setIsFlipped(!isFlipped);
                  }
                }}
                className="w-full min-h-[260px] cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-linear-to-b from-slate-50/50 to-white dark:from-slate-800/40 dark:to-slate-900 p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all select-none group focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span className="font-semibold uppercase tracking-wider text-[11px] text-amber-600 dark:text-amber-400">
                    {isFlipped ? 'Answer & Explanation' : 'Term / Prompt'}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] group-hover:text-slate-600 dark:group-hover:text-slate-300">
                    <RotateCw className="w-3 h-3" />
                    <span>Tap to flip</span>
                  </span>
                </div>

                <div className="my-auto py-4 text-center">
                  {!isFlipped ? (
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {currentCard.front}
                    </h3>
                  ) : (
                    <div className="animate-in fade-in zoom-in-95 duration-150">
                      <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                        {currentCard.back}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                  {isFlipped
                    ? 'Rate how well you recalled this card below'
                    : 'Try to recall the definition before tapping to reveal'}
                </div>
              </div>

              {/* RATING BUTTONS (Shown after flipping) */}
              <div className="w-full">
                {isFlipped ? (
                  <div className="grid grid-cols-4 gap-2 animate-in fade-in duration-150">
                    <button
                      onClick={() => handleRateCard('again')}
                      className="p-2.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <span>Again</span>
                      <span className="text-[10px] text-rose-500 font-normal">Loops back</span>
                    </button>

                    <button
                      onClick={() => handleRateCard('hard')}
                      className="p-2.5 rounded-xl border border-orange-300 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/60 font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <span>Hard</span>
                      <span className="text-[10px] text-orange-500 font-normal">Difficult</span>
                    </button>

                    <button
                      onClick={() => handleRateCard('good')}
                      className="p-2.5 rounded-xl border border-blue-300 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <span>Good</span>
                      <span className="text-[10px] text-blue-500 font-normal">Recalled</span>
                    </button>

                    <button
                      onClick={() => handleRateCard('easy')}
                      className="p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all"
                    >
                      <span>Easy</span>
                      <span className="text-[10px] text-emerald-500 font-normal">Instant</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="w-full py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs hover:bg-slate-800 dark:hover:bg-white shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Flip to Reveal Answer</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* COMPLETED SESSION VIEW */}
          {isFinished && (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Deck Completed!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You reviewed all flashcards for this topic.
                </p>
              </div>

              {/* Ratings Summary */}
              <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto text-center text-xs">
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300">
                  <div className="font-extrabold text-sm tabular-nums">{ratingsTally.again}</div>
                  <div className="text-[10px]">Again</div>
                </div>
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300">
                  <div className="font-extrabold text-sm tabular-nums">{ratingsTally.hard}</div>
                  <div className="text-[10px]">Hard</div>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
                  <div className="font-extrabold text-sm tabular-nums">{ratingsTally.good}</div>
                  <div className="text-[10px]">Good</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                  <div className="font-extrabold text-sm tabular-nums">{ratingsTally.easy}</div>
                  <div className="text-[10px]">Easy</div>
                </div>
              </div>

              {intervalFeedback && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-w-sm mx-auto text-xs text-slate-700 dark:text-slate-300">
                  {intervalFeedback}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  onClick={restartDeck}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Review Deck Again
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
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
