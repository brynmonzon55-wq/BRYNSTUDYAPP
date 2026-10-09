import React from 'react';
import { Clock, Sparkles, Layers, Calendar } from 'lucide-react';
import { Topic } from '../types';
import { getTodayString, isDue, REPETITION_INTERVALS } from '../utils/storage';

interface TodaysReviewViewProps {
  topics: Topic[];
  onStartCombinedReview: (dueTopics: Topic[]) => void;
  onStudyTopic: (topic: Topic, tab: 'quiz' | 'flashcards') => void;
  onNavigateCalendar: () => void;
}

export const TodaysReviewView: React.FC<TodaysReviewViewProps> = ({
  topics,
  onStartCombinedReview,
  onStudyTopic,
  onNavigateCalendar,
}) => {
  const todayStr = getTodayString();
  const dueTopics = topics.filter((t) => isDue(t.nextReviewDate, todayStr));

  // Upcoming topics (not due today, sorted by nextReviewDate)
  const upcomingTopics = topics
    .filter((t) => !isDue(t.nextReviewDate, todayStr))
    .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 dark:border-amber-800/80 rounded-2xl p-6 relative overflow-hidden">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Clock className="w-4 h-4" />
            <span>Spaced Repetition Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {dueTopics.length > 0
              ? `${dueTopics.length} Topic${dueTopics.length > 1 ? 's' : ''} Due for Review Today`
              : 'All Caught Up for Today! 🎉'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 mb-5">
            {dueTopics.length > 0
              ? 'Reviewing at spaced intervals (1, 3, 7, 14, 30 days) locks knowledge into long-term memory. Launch a smart interleaved session or review topic by topic.'
              : 'You have completed all scheduled reviews for today. Great job keeping your memory curve sharp! You can see upcoming topics below or log new things learned today.'}
          </p>

          {dueTopics.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => onStartCombinedReview(dueTopics)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Combined Review ({dueTopics.length} Topics)</span>
              </button>
            </div>
          )}

          {dueTopics.length === 0 && (
            <button
              onClick={onNavigateCalendar}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Go to Calendar to Log Topics</span>
            </button>
          )}
        </div>
      </div>

      {/* Due Topics List */}
      {dueTopics.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Due For Review Today
            </h3>
            <span className="text-xs text-slate-500 tabular-nums">
              {dueTopics.length} topic{dueTopics.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dueTopics.map((topic) => {
              const intervalDays = REPETITION_INTERVALS[topic.intervalStep] || 30;
              return (
                <div
                  key={topic.id}
                  className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-300 dark:hover:border-amber-800 transition-all flex flex-col justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Due Today ({intervalDays}d stage)
                      </span>
                      <span className="capitalize">{topic.mastery}</span>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {topic.title}
                    </h4>

                    {topic.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                        {topic.notes}
                      </p>
                    )}

                    {topic.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {topic.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-end gap-2 flex-wrap">
                    <button
                      onClick={() => onStudyTopic(topic, 'flashcards')}
                      className="px-3.5 py-2 min-h-[36px] rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Flashcards</span>
                    </button>
                    <button
                      onClick={() => onStudyTopic(topic, 'quiz')}
                      className="px-3.5 py-2 min-h-[36px] rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Take Quiz</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Reviews Preview */}
      {upcomingTopics.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Upcoming Spaced Reviews
            </h3>
            <span className="text-xs text-slate-400 tabular-nums">
              {upcomingTopics.length} topics scheduled
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {upcomingTopics.slice(0, 6).map((topic) => (
              <div
                key={topic.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span>Due: {topic.nextReviewDate}</span>
                    <span className="capitalize text-slate-500 font-medium">{topic.mastery}</span>
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {topic.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                  <span className="tabular-nums">
                    {REPETITION_INTERVALS[topic.intervalStep]}d interval
                  </span>
                  <button
                    onClick={() => onStudyTopic(topic, 'quiz')}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Review Early
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
