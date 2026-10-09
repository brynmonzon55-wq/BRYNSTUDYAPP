import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { DayView } from './components/DayView';
import { AllLessonsView } from './components/AllLessonsView';
import { TopicModal } from './components/TopicModal';
import { QuizModal } from './components/QuizModal';
import { FlashcardModal } from './components/FlashcardModal';
import { TodaysReviewView } from './components/TodaysReviewView';
import { MistakesBankView } from './components/MistakesBankView';
import { AnalyticsView } from './components/AnalyticsView';
import { ExportImportModal } from './components/ExportImportModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import {
  Topic,
  MistakeItem,
  UserSettings,
  QuizDepth,
  QuizQuestion,
} from './types';
import {
  getStoredTopics,
  saveStoredTopics,
  getStoredMistakes,
  saveStoredMistakes,
  removeMistake,
  getStoredSettings,
  saveStoredSettings,
  getTodayString,
  addDays,
  isDue,
  recordActivityStreak,
} from './utils/storage';
import { Search, X, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'calendar' | 'lessons' | 'review' | 'mistakes' | 'analytics'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [topics, setTopics] = useState<Topic[]>([]);
  const [mistakes, setMistakes] = useState<MistakeItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings());

  // Search & Tag Filter
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Modals state
  const [selectedTopicForHub, setSelectedTopicForHub] = useState<{
    topic: Topic;
    initialTab: 'lesson' | 'quiz' | 'flashcards' | 'history';
  } | null>(null);

  const [activeQuizState, setActiveQuizState] = useState<{
    topic?: Topic;
    customQuestions?: QuizQuestion[];
    depth: QuizDepth;
    count?: number;
  } | null>(null);

  const [activeFlashcardTopic, setActiveFlashcardTopic] = useState<Topic | null>(null);
  const [isExportImportOpen, setIsExportImportOpen] = useState<boolean>(false);

  // In-app Delete & Clean up modal state (replaces broken window.confirm)
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    topicId?: string;
    topicTitle?: string;
    isBatchAll?: boolean;
  }>({ isOpen: false });

  // Transient Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Initial load
  useEffect(() => {
    const loadedTopics = getStoredTopics();
    const loadedMistakes = getStoredMistakes();
    const loadedSettings = getStoredSettings();
    setTopics(loadedTopics);
    setMistakes(loadedMistakes);
    setSettings(loadedSettings);

    // Apply dark mode on initial load
    if (loadedSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    recordActivityStreak();
  }, []);

  // Sync dark mode class
  const handleToggleDarkMode = () => {
    const updated = { ...settings, darkMode: !settings.darkMode };
    setSettings(updated);
    saveStoredSettings(updated);
    if (updated.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Due topics calculation
  const todayStr = getTodayString();
  const dueTopics = topics.filter((t) => isDue(t.nextReviewDate, todayStr));

  // Reload topics and mistakes from storage
  const reloadData = () => {
    setTopics(getStoredTopics());
    setMistakes(getStoredMistakes());
    setSettings(getStoredSettings());
  };

  // Add Topic with specified Date (from AllLessonsView or DayView)
  const handleAddTopicWithDate = (
    title: string,
    tags: string[],
    notes: string,
    date: string = selectedDate
  ) => {
    const newTopic: Topic = {
      id: `topic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date,
      title,
      tags,
      notes,
      mastery: 'new',
      intervalStep: 0,
      nextReviewDate: addDays(date, 1), // 1 day interval initially
      reviewCount: 0,
      quizScores: [],
      createdAt: new Date().toISOString(),
    };

    const updated = [newTopic, ...topics];
    setTopics(updated);
    saveStoredTopics(updated);
    recordActivityStreak();
  };

  // Add Topic (defaults to selected calendar date)
  const handleAddTopic = (title: string, tags: string[], notes: string) => {
    handleAddTopicWithDate(title, tags, notes, selectedDate);
  };

  // Update Topic
  const handleUpdateTopic = (updatedTopic: Topic) => {
    const updated = topics.map((t) => (t.id === updatedTopic.id ? updatedTopic : t));
    setTopics(updated);
    saveStoredTopics(updated);
  };

  // Delete Topic (Triggers clean In-App Confirmation Modal, no window.confirm)
  const handleDeleteTopic = (id: string) => {
    const target = topics.find((t) => t.id === id);
    setDeleteModalState({
      isOpen: true,
      topicId: id,
      topicTitle: target ? target.title : 'this lesson',
      isBatchAll: false,
    });
  };

  // Clean Up All Topics (Triggers batch clean-up confirmation)
  const handleCleanUpAllTopics = () => {
    if (topics.length === 0) {
      showToast('There are no lessons to clean up.');
      return;
    }
    setDeleteModalState({
      isOpen: true,
      isBatchAll: true,
      topicTitle: `${topics.length} Lessons`,
    });
  };

  // Execute Confirmed Deletion
  const handleConfirmDelete = () => {
    if (deleteModalState.isBatchAll) {
      // 1. Wipe all topics
      setTopics([]);
      saveStoredTopics([]);

      // 2. Wipe associated mistakes
      setMistakes([]);
      saveStoredMistakes([]);

      // 3. Clear cache entries from storage
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('quiz_cache_') || key.startsWith('fc_cache_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn('Storage purge error:', e);
      }

      // 4. Close any open study hub or quiz modals
      setSelectedTopicForHub(null);
      setActiveQuizState(null);
      setActiveFlashcardTopic(null);
      setDeleteModalState({ isOpen: false });
      showToast('All previous lessons have been completely wiped and cleaned up.');
      return;
    }

    if (deleteModalState.topicId) {
      const id = deleteModalState.topicId;
      const target = topics.find((t) => t.id === id);
      const title = target ? target.title : 'Lesson';

      // 1. Remove from topics
      const updatedTopics = topics.filter((t) => t.id !== id);
      setTopics(updatedTopics);
      saveStoredTopics(updatedTopics);

      // 2. Clean up any mistakes for this deleted topic
      const updatedMistakes = mistakes.filter((m) => m.topicId !== id);
      setMistakes(updatedMistakes);
      saveStoredMistakes(updatedMistakes);

      // 3. Clean up cached quizzes & flashcards for this topic
      try {
        localStorage.removeItem(`fc_cache_${id}`);
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`quiz_cache_${id}`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn('Topic cache cleanup error:', e);
      }

      // 4. Close active modals if they belong to this deleted topic
      if (selectedTopicForHub?.topic.id === id) {
        setSelectedTopicForHub(null);
      }
      if (activeFlashcardTopic?.id === id) {
        setActiveFlashcardTopic(null);
      }
      if (activeQuizState?.topic?.id === id) {
        setActiveQuizState(null);
      }

      setDeleteModalState({ isOpen: false });
      showToast(`"${title}" was permanently deleted.`);
    }
  };

  // Open Topic Study Hub
  const handleSelectTopicForStudy = (
    topic: Topic,
    initialTab: 'lesson' | 'quiz' | 'flashcards' | 'history' = 'lesson'
  ) => {
    setSelectedTopicForHub({ topic, initialTab });
  };

  // Start Quiz from Topic Hub or directly
  const handleStartQuiz = (topic: Topic, depth: QuizDepth = 'balanced', count: number = 15) => {
    setSelectedTopicForHub(null);
    setActiveQuizState({ topic, depth, count });
  };

  // Start Flashcards
  const handleStartFlashcards = (topic: Topic) => {
    setSelectedTopicForHub(null);
    setActiveFlashcardTopic(topic);
  };

  // Start Combined Review Session across all due topics
  const handleStartCombinedReview = async (dueItems: Topic[]) => {
    if (dueItems.length === 0) return;

    try {
      const res = await fetch('/api/gemini/combined-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: dueItems.map((t) => ({ id: t.id, title: t.title, notes: t.notes })),
          count: 10,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setActiveQuizState({
            customQuestions: data.questions,
            depth: 'balanced',
          });
          return;
        }
      }
    } catch (e) {
      console.warn('Combined quiz generation failed, opening first topic:', e);
    }

    // Fallback: start first due topic
    setActiveQuizState({ topic: dueItems[0], depth: 'balanced' });
  };

  // Practice Mistakes Quiz
  const handlePracticeMistakes = (mistakeQuestions: QuizQuestion[]) => {
    setActiveQuizState({
      customQuestions: mistakeQuestions,
      depth: 'balanced',
    });
  };

  // Remove mistake
  const handleRemoveMistake = (id: string) => {
    removeMistake(id);
    setMistakes(getStoredMistakes());
  };

  // Unique list of all tags for filter bar
  const allTags = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of topics) {
      for (const tag of t.tags) {
        set.add(tag);
      }
    }
    return Array.from(set).sort();
  }, [topics]);

  // Filter topics for calendar if search/tag filter is active
  const filteredTopics = React.useMemo(() => {
    return topics.filter((t) => {
      const matchesSearch =
        !searchFilter.trim() ||
        t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(searchFilter.toLowerCase()));
      const matchesTag = !activeTagFilter || t.tags.includes(activeTagFilter);
      return matchesSearch && matchesTag;
    });
  }, [topics, searchFilter, activeTagFilter]);

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        dueCount={dueTopics.length}
        settings={settings}
        onToggleDarkMode={handleToggleDarkMode}
        onOpenExportImport={() => setIsExportImportOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-10 space-y-6">
        {/* Global Search & Tag Filter Bar (Visible in Calendar view) */}
        {currentTab === 'calendar' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search all learned topics, formulas, concepts..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tag Filter Pills (clean unboxed segmented buttons) */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pl-1 hidden md:inline">
                  Filter:
                </span>
                <button
                  onClick={() => setActiveTagFilter(null)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    !activeTagFilter
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All Tags
                </button>
                {allTags.slice(0, 6).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      activeTagFilter === tag
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 1: CALENDAR & DAY VIEW (Core Flow) */}
        {currentTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Zone: Monthly Calendar */}
            <div className="lg:col-span-7 xl:col-span-8">
              <CalendarView
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                topics={filteredTopics}
              />
            </div>

            {/* Right Zone: Selected Day Learned Topics */}
            <div className="lg:col-span-5 xl:col-span-4">
              <DayView
                selectedDate={selectedDate}
                topics={filteredTopics}
                onAddTopic={handleAddTopic}
                onUpdateTopic={handleUpdateTopic}
                onDeleteTopic={handleDeleteTopic}
                onSelectTopicForStudy={handleSelectTopicForStudy}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: ALL LESSONS CURRICULUM */}
        {currentTab === 'lessons' && (
          <AllLessonsView
            topics={topics}
            onAddTopicWithDate={handleAddTopicWithDate}
            onUpdateTopic={handleUpdateTopic}
            onDeleteTopic={handleDeleteTopic}
            onCleanUpAllTopics={handleCleanUpAllTopics}
            onSelectTopicForStudy={handleSelectTopicForStudy}
            onStartQuiz={handleStartQuiz}
            onStartFlashcards={handleStartFlashcards}
            onNavigateToCalendarDate={(d) => {
              setSelectedDate(d);
              setCurrentTab('calendar');
            }}
          />
        )}

        {/* VIEW 3: TODAY'S REVIEW (Spaced Repetition) */}
        {currentTab === 'review' && (
          <TodaysReviewView
            topics={topics}
            onStartCombinedReview={handleStartCombinedReview}
            onStudyTopic={(topic, tab) => handleSelectTopicForStudy(topic, tab)}
            onNavigateCalendar={() => setCurrentTab('calendar')}
          />
        )}

        {/* VIEW 3: WEAK SPOTS (Mistakes Bank) */}
        {currentTab === 'mistakes' && (
          <MistakesBankView
            mistakes={mistakes}
            onRemoveMistake={handleRemoveMistake}
            onPracticeMistakes={handlePracticeMistakes}
          />
        )}

        {/* VIEW 4: PROGRESS & ANALYTICS */}
        {currentTab === 'analytics' && (
          <AnalyticsView topics={topics} settings={settings} />
        )}
      </main>

      {/* MODAL 1: TOPIC HUB (Quiz / Flashcards / Review History) */}
      {selectedTopicForHub && (
        <TopicModal
          topic={selectedTopicForHub.topic}
          initialTab={selectedTopicForHub.initialTab}
          onClose={() => setSelectedTopicForHub(null)}
          onStartQuiz={(topic, depth, count) => handleStartQuiz(topic, depth, count)}
          onStartFlashcards={(topic) => handleStartFlashcards(topic)}
          onUpdateTopic={(updated) => {
            handleUpdateTopic(updated);
            setSelectedTopicForHub((prev) => (prev ? { ...prev, topic: updated } : null));
          }}
          onDeleteTopic={handleDeleteTopic}
        />
      )}

      {/* MODAL 2: ACTIVE AI QUIZ */}
      {activeQuizState && (
        <QuizModal
          topic={activeQuizState.topic}
          customQuestions={activeQuizState.customQuestions}
          initialDepth={activeQuizState.depth}
          count={activeQuizState.count}
          onClose={() => {
            setActiveQuizState(null);
            reloadData();
          }}
          onQuizCompleted={() => {
            reloadData();
          }}
          onPracticeMistakes={() => {
            setActiveQuizState(null);
            setCurrentTab('mistakes');
          }}
        />
      )}

      {/* MODAL 3: ACTIVE AI FLASHCARDS */}
      {activeFlashcardTopic && (
        <FlashcardModal
          topic={activeFlashcardTopic}
          onClose={() => {
            setActiveFlashcardTopic(null);
            reloadData();
          }}
          onSessionComplete={() => {
            reloadData();
          }}
        />
      )}

      {/* MODAL 4: EXPORT / IMPORT JSON */}
      {isExportImportOpen && (
        <ExportImportModal
          onClose={() => setIsExportImportOpen(false)}
          onDataImported={() => {
            reloadData();
          }}
        />
      )}

      {/* MODAL 5: DELETE / CLEAN-UP CONFIRMATION */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.topicTitle || ''}
        isBatchAll={deleteModalState.isBatchAll}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalState({ isOpen: false })}
      />

      {/* Transient Action Feedback Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm sm:max-w-md w-auto px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl border border-slate-700/80 dark:border-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
