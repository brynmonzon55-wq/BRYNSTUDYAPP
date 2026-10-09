import React from 'react';
import {
  Moon,
  Sun,
  Download,
  BookOpen,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  BarChart2,
} from 'lucide-react';
import { UserSettings } from '../types';

interface HeaderProps {
  currentTab: 'calendar' | 'lessons' | 'review' | 'mistakes' | 'analytics';
  onSelectTab: (tab: 'calendar' | 'lessons' | 'review' | 'mistakes' | 'analytics') => void;
  dueCount: number;
  settings: UserSettings;
  onToggleDarkMode: () => void;
  onOpenExportImport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  dueCount,
  settings,
  onToggleDarkMode,
  onOpenExportImport,
}) => {
  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('calendar')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 block leading-tight">
                  Daily Learning
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Spaced Repetition & Recall
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Desktop Navigation Links (Hidden on mobile, uses bottom nav) */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => onSelectTab('calendar')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                currentTab === 'calendar'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Calendar</span>
            </button>

            <button
              onClick={() => onSelectTab('lessons')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                currentTab === 'lessons'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>All Lessons</span>
            </button>

            <button
              onClick={() => onSelectTab('review')}
              className={`relative px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                currentTab === 'review'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-semibold shadow-2xs border border-amber-200 dark:border-amber-800/60'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Today's Review</span>
              {dueCount > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white tabular-nums">
                  {dueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('mistakes')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                currentTab === 'mistakes'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Weak Spots</span>
            </button>

            <button
              onClick={() => onSelectTab('analytics')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                currentTab === 'analytics'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Progress</span>
            </button>
          </nav>

          {/* Zone 3: Actions & Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Export/Import JSON */}
            <button
              onClick={onOpenExportImport}
              title="Backup & Restore Data (JSON)"
              className="p-2 sm:p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Backup and Restore Data"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Dark/Light Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={settings.darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 sm:p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {settings.darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible only on < md screens) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)] transition-colors"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          {/* Calendar */}
          <button
            onClick={() => onSelectTab('calendar')}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors relative ${
              currentTab === 'calendar'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Calendar</span>
            {currentTab === 'calendar' && (
              <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>

          {/* All Lessons */}
          <button
            onClick={() => onSelectTab('lessons')}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors relative ${
              currentTab === 'lessons'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Lessons</span>
            {currentTab === 'lessons' && (
              <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>

          {/* Today's Review */}
          <button
            onClick={() => onSelectTab('review')}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors relative ${
              currentTab === 'review'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Clock className="w-5 h-5" />
              {dueCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {dueCount}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight">Review</span>
            {currentTab === 'review' && (
              <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          {/* Weak Spots */}
          <button
            onClick={() => onSelectTab('mistakes')}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors relative ${
              currentTab === 'mistakes'
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Weak Spots</span>
            {currentTab === 'mistakes' && (
              <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
            )}
          </button>

          {/* Progress */}
          <button
            onClick={() => onSelectTab('analytics')}
            className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors relative ${
              currentTab === 'analytics'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px] leading-tight">Progress</span>
            {currentTab === 'analytics' && (
              <span className="absolute top-1 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
