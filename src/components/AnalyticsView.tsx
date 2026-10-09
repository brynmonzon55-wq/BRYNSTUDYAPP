import React from 'react';
import { Award, BookOpen, TrendingUp, Layers, Tag } from 'lucide-react';
import { Topic, UserSettings } from '../types';

interface AnalyticsViewProps {
  topics: Topic[];
  settings: UserSettings;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ topics, settings }) => {
  // Mastery counts
  const newCount = topics.filter((t) => t.mastery === 'new').length;
  const learningCount = topics.filter((t) => t.mastery === 'learning').length;
  const masteredCount = topics.filter((t) => t.mastery === 'mastered').length;
  const totalTopics = topics.length;

  const newPct = totalTopics > 0 ? Math.round((newCount / totalTopics) * 100) : 0;
  const learningPct = totalTopics > 0 ? Math.round((learningCount / totalTopics) * 100) : 0;
  const masteredPct = totalTopics > 0 ? Math.round((masteredCount / totalTopics) * 100) : 0;

  // Flatten all quiz scores
  const allScores = topics.flatMap((t) =>
    (t.quizScores || []).map((s) => ({
      ...s,
      topicTitle: t.title,
      pct: Math.round((s.score / s.total) * 100),
    }))
  );

  const avgAccuracy =
    allScores.length > 0
      ? Math.round(allScores.reduce((acc, curr) => acc + curr.pct, 0) / allScores.length)
      : 0;

  // Tag frequency
  const tagCounts = new Map<string, number>();
  for (const t of topics) {
    for (const tag of t.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const topTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Total Topics</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
            {totalTopics}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Logged across calendar</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Total Reviews Done</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
            {topics.reduce((acc, t) => acc + (t.reviewCount || 0), 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Spaced interval sessions</div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Avg Quiz Score</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
            {avgAccuracy}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {allScores.length} quiz sessions
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Mastered Topics</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
            {masteredCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Reaching 30d stage</div>
        </div>
      </div>

      {/* Mastery Breakdown */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Per-Topic Mastery Progress
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Topics graduate from New to Learning, and finally Mastered as spaced interval reviews are completed.
          </p>
        </div>

        {/* Stacked Progress Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
          <div
            title={`Mastered: ${masteredCount} (${masteredPct}%)`}
            className="bg-emerald-500 h-full transition-all"
            style={{ width: `${masteredPct}%` }}
          />
          <div
            title={`Learning: ${learningCount} (${learningPct}%)`}
            className="bg-blue-500 h-full transition-all"
            style={{ width: `${learningPct}%` }}
          />
          <div
            title={`New: ${newCount} (${newPct}%)`}
            className="bg-slate-400 h-full transition-all"
            style={{ width: `${newPct}%` }}
          />
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-emerald-500" />
            <div>
              <span className="font-bold block text-slate-800 dark:text-slate-200">
                Mastered: {masteredCount}
              </span>
              <span className="text-[11px] text-slate-400">{masteredPct}% of total</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-blue-500" />
            <div>
              <span className="font-bold block text-slate-800 dark:text-slate-200">
                Learning: {learningCount}
              </span>
              <span className="text-[11px] text-slate-400">{learningPct}% of total</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-slate-400" />
            <div>
              <span className="font-bold block text-slate-800 dark:text-slate-200">
                New: {newCount}
              </span>
              <span className="text-[11px] text-slate-400">{newPct}% of total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Scores Performance Log */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Recent Quiz Score History
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chronological quiz results and accuracy trends across all tested topics.
          </p>
        </div>

        {allScores.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No quiz records yet. Take your first AI quiz from any day to generate stats!
          </p>
        ) : (
          <div className="space-y-2">
            {allScores.slice(-8).reverse().map((scoreItem, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 max-w-xs">
                    {scoreItem.topicTitle}
                  </span>
                  <span className="text-slate-400 capitalize">· {scoreItem.depth}</span>
                  <span className="text-slate-400">· {scoreItem.date}</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Visual gauge */}
                  <div className="w-24 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className={`h-full ${
                        scoreItem.pct >= 80
                          ? 'bg-emerald-500'
                          : scoreItem.pct < 60
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${scoreItem.pct}%` }}
                    />
                  </div>

                  <span
                    className={`font-bold tabular-nums w-12 text-right ${
                      scoreItem.pct >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : scoreItem.pct < 60
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {scoreItem.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Learning Tags */}
      {topTags.length > 0 && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Top Subject Tags
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {topTags.map(([tag, count]) => (
              <div
                key={tag}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300"
              >
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-semibold">{tag}</span>
                <span className="text-slate-400 tabular-nums">({count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
