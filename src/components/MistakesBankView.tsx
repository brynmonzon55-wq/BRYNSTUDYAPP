import React, { useState } from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Search, Play } from 'lucide-react';
import { MistakeItem, QuizQuestion } from '../types';

interface MistakesBankViewProps {
  mistakes: MistakeItem[];
  onRemoveMistake: (id: string) => void;
  onPracticeMistakes: (questions: QuizQuestion[]) => void;
}

export const MistakesBankView: React.FC<MistakesBankViewProps> = ({
  mistakes,
  onRemoveMistake,
  onPracticeMistakes,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMistakes = mistakes.filter(
    (m) =>
      m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.topicTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLaunchPractice = () => {
    if (mistakes.length === 0) return;

    // Convert MistakeItems to QuizQuestions format
    const practiceQuestions: QuizQuestion[] = (filteredMistakes.length > 0 ? filteredMistakes : mistakes).map((m) => ({
      id: m.id,
      topicId: m.topicId,
      topicTitle: m.topicTitle,
      question: m.question,
      options: m.options,
      correctIndex: m.correctIndex,
      explanation: m.explanation,
      difficulty: 'medium',
    }));

    onPracticeMistakes(practiceQuestions);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Targeted Remediation</span>
        </div>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Weak Spots & Error Bank ({mistakes.length})
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Every question you miss during quizzes is logged here automatically. Practicing mistakes is scientifically proven to yield the highest retention gains.
            </p>
          </div>

          {mistakes.length > 0 && (
            <button
              onClick={handleLaunchPractice}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Practice My Mistakes ({filteredMistakes.length} Qs)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter / Search Bar */}
      {mistakes.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search mistakes by concept or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>
      )}

      {/* Mistake Items List */}
      {mistakes.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No Weak Spots Logged!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            As you take AI quizzes, any questions you get wrong will be saved here so you can re-test and master them.
          </p>
        </div>
      ) : filteredMistakes.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          No mistakes match your search query "{searchQuery}".
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMistakes.map((mistake, index) => (
            <div
              key={mistake.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-3 text-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Topic: {mistake.topicTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">Logged: {mistake.dateLogged}</span>
                    <button
                      onClick={() => onRemoveMistake(mistake.id)}
                      title="Remove from weak spots"
                      aria-label="Remove mistake"
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-2 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {mistake.question}
                </h4>

                {/* Answers Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-200">
                    <span className="font-bold text-[11px] block text-rose-700 dark:text-rose-400 mb-0.5">
                      Your Selected Answer:
                    </span>
                    <span>{mistake.userSelectedOption}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200">
                    <span className="font-bold text-[11px] block text-emerald-700 dark:text-emerald-400 mb-0.5">
                      Correct Answer:
                    </span>
                    <span>{mistake.options[mistake.correctIndex]}</span>
                  </div>
                </div>

                {/* Explanation */}
                <p className="text-slate-600 dark:text-slate-400 pt-1 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Key Takeaway: </span>
                  {mistake.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
