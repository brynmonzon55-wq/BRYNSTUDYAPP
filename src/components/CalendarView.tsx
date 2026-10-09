import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Topic } from '../types';
import { toDateString, isDue } from '../utils/storage';

interface CalendarViewProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  topics: Topic[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  onSelectDate,
  topics,
}) => {
  // Current view month & year (initialized from user's device date)
  const today = new Date();
  const todayStr = toDateString(today);

  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  // Month name formatting
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Days in month calculation
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Map of dateStr -> { hasEntries: boolean, count: number, hasDueReviews: boolean, dueCount: number }
  const dateMetadata = React.useMemo(() => {
    const map = new Map<string, { entriesCount: number; dueCount: number }>();

    for (const t of topics) {
      // Entry logged date
      const entryKey = t.date;
      const current = map.get(entryKey) || { entriesCount: 0, dueCount: 0 };
      current.entriesCount += 1;
      map.set(entryKey, current);

      // Next review due date
      if (t.nextReviewDate) {
        const dueKey = t.nextReviewDate;
        const dueCurrent = map.get(dueKey) || { entriesCount: 0, dueCount: 0 };
        // If next review is on this date, flag it
        dueCurrent.dueCount += 1;
        map.set(dueKey, dueCurrent);
      }
    }

    return map;
  }, [topics]);

  // Generate calendar grid cells
  const calendarCells = [];
  // Leading blank days
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(null);
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(currentYear, currentMonth, day);
    calendarCells.push({
      dayNumber: day,
      dateString: toDateString(d),
    });
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-5 shadow-xs transition-colors">
      {/* Month Header & Controls */}
      <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any day to view or log what you learned
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleJumpToToday}
            className="px-2.5 py-1.5 min-h-[34px] text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <button
              onClick={handlePrevMonth}
              title="Previous month"
              className="p-2 sm:p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              title="Next month"
              className="p-2 sm:p-1.5 min-h-[34px] min-w-[34px] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors border-l border-slate-200 dark:border-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {dayNames.map((d, index) => (
          <div
            key={d}
            className={`text-xs font-semibold py-1 ${
              index === 0 || index === 6
                ? 'text-slate-400 dark:text-slate-500'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {calendarCells.map((cell, idx) => {
          if (!cell) {
            return (
              <div
                key={`empty-${idx}`}
                className="aspect-square rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-transparent"
              />
            );
          }

          const { dayNumber, dateString } = cell;
          const isSelected = selectedDate === dateString;
          const isCurrentToday = todayStr === dateString;
          const meta = dateMetadata.get(dateString);
          const hasEntries = meta && meta.entriesCount > 0;
          const hasDueReviews = meta && meta.dueCount > 0;

          return (
            <button
              key={dateString}
              onClick={() => onSelectDate(dateString)}
              className={`aspect-square relative rounded-xl p-1 sm:p-2 flex flex-col items-center justify-between transition-all group ${
                isSelected
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold shadow-md scale-[1.02]'
                  : isCurrentToday
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-700 font-semibold hover:bg-blue-100/70 dark:hover:bg-blue-900/50'
                  : 'bg-slate-50/70 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/80'
              }`}
            >
              {/* Day Number */}
              <div className="w-full flex items-center justify-between text-[11px] sm:text-xs">
                <span className="tabular-nums">{dayNumber}</span>
                {isCurrentToday && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </div>

              {/* Status Indicators / Dots */}
              <div className="flex items-center gap-1 mt-auto pb-0.5">
                {hasEntries && (
                  <span
                    title={`${meta.entriesCount} topic${meta.entriesCount > 1 ? 's' : ''} learned`}
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-transform group-hover:scale-125 ${
                      isSelected ? 'bg-emerald-300 dark:bg-emerald-600' : 'bg-emerald-500'
                    }`}
                  />
                )}
                {hasDueReviews && (
                  <span
                    title={`${meta.dueCount} spaced review${meta.dueCount > 1 ? 's' : ''} due`}
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-transform group-hover:scale-125 ${
                      isSelected ? 'bg-amber-300 dark:bg-amber-600' : 'bg-amber-500'
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Learned Topic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Review Due</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500">
          Device date: {todayStr}
        </div>
      </div>
    </div>
  );
};
