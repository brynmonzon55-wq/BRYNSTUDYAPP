import React, { useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Sparkles,
  Brain,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  Calendar,
  Tag,
  ArrowUpDown,
  LayoutGrid,
  List,
  Upload,
  FileText,
  Paperclip,
  Wand2,
  Loader2,
  X,
  Award,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Topic, QuizDepth } from '../types';
import {
  getTodayString,
  isDue,
  parseDateString,
  REPETITION_INTERVALS,
  addDays,
} from '../utils/storage';
import { parseUploadedDocument } from '../utils/fileParser';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AllLessonsViewProps {
  topics: Topic[];
  onAddTopicWithDate: (title: string, tags: string[], notes: string, date: string) => void;
  onUpdateTopic: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
  onCleanUpAllTopics?: () => void;
  onSelectTopicForStudy: (topic: Topic, initialTab?: 'lesson' | 'quiz' | 'flashcards' | 'history') => void;
  onStartQuiz: (topic: Topic, depth?: QuizDepth, count?: number) => void;
  onStartFlashcards: (topic: Topic) => void;
  onNavigateToCalendarDate?: (dateStr: string) => void;
}

export const AllLessonsView: React.FC<AllLessonsViewProps> = ({
  topics,
  onAddTopicWithDate,
  onUpdateTopic,
  onDeleteTopic,
  onCleanUpAllTopics,
  onSelectTopicForStudy,
  onStartQuiz,
  onStartFlashcards,
  onNavigateToCalendarDate,
}) => {
  const todayStr = getTodayString();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [masteryFilter, setMasteryFilter] = useState<'all' | 'new' | 'learning' | 'mastered'>('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'due' | 'upcoming'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'review-soonest' | 'title-az' | 'title-za' | 'score-high'>('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Add Lesson Modal / Drawer
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(todayStr);
  const [newTags, setNewTags] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isEnrichingNotes, setIsEnrichingNotes] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Lesson Inline Modal
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editMastery, setEditMastery] = useState<'new' | 'learning' | 'mastered'>('new');
  const [isEnrichingEdit, setIsEnrichingEdit] = useState(false);

  // Unique tags across all topics
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    topics.forEach((t) => t.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [topics]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = topics.length;
    const mastered = topics.filter((t) => t.mastery === 'mastered').length;
    const learning = topics.filter((t) => t.mastery === 'learning').length;
    const newItems = topics.filter((t) => t.mastery === 'new').length;
    const dueCount = topics.filter((t) => isDue(t.nextReviewDate, todayStr)).length;

    // Quiz performance
    const scores = topics.flatMap((t) => t.quizScores);
    const avgScore =
      scores.length > 0
        ? Math.round(
            scores.reduce((acc, s) => acc + (s.score / Math.max(1, s.total)) * 100, 0) /
              scores.length
          )
        : null;

    return { total, mastered, learning, newItems, dueCount, avgScore };
  }, [topics, todayStr]);

  // Filtered & Sorted Topics
  const filteredTopics = useMemo(() => {
    return topics
      .filter((t) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = t.title.toLowerCase().includes(q);
          const matchesNotes = t.notes ? t.notes.toLowerCase().includes(q) : false;
          const matchesTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
          if (!matchesTitle && !matchesNotes && !matchesTags) return false;
        }

        // Mastery filter
        if (masteryFilter !== 'all' && t.mastery !== masteryFilter) {
          return false;
        }

        // Review filter
        if (reviewFilter === 'due' && !isDue(t.nextReviewDate, todayStr)) {
          return false;
        }
        if (reviewFilter === 'upcoming' && isDue(t.nextReviewDate, todayStr)) {
          return false;
        }

        // Tag filter
        if (selectedTag !== 'all' && !t.tags.includes(selectedTag)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date-desc':
            return b.date.localeCompare(a.date);
          case 'date-asc':
            return a.date.localeCompare(b.date);
          case 'review-soonest':
            return a.nextReviewDate.localeCompare(b.nextReviewDate);
          case 'title-az':
            return a.title.localeCompare(b.title);
          case 'title-za':
            return b.title.localeCompare(a.title);
          case 'score-high': {
            const getBestScore = (t: Topic) => {
              if (t.quizScores.length === 0) return -1;
              return Math.max(...t.quizScores.map((s) => (s.score / Math.max(1, s.total)) * 100));
            };
            return getBestScore(b) - getBestScore(a);
          }
          default:
            return b.date.localeCompare(a.date);
        }
      });
  }, [topics, searchQuery, masteryFilter, reviewFilter, selectedTag, sortBy, todayStr]);

  // Handle file upload
  const processUploadedFile = async (file: File) => {
    setIsParsingFile(true);
    setFileError(null);
    try {
      const parsed = await parseUploadedDocument(file);
      setUploadedFileName(`${parsed.fileName} (${(parsed.fileSize / 1024).toFixed(1)} KB)`);
      if (!newTitle.trim() && parsed.suggestedTitle) {
        setNewTitle(parsed.suggestedTitle);
      }
      if (!newTags.trim() && parsed.suggestedTags && parsed.suggestedTags.length > 0) {
        setNewTags(parsed.suggestedTags.join(', '));
      }
      setNewNotes((prev) => (prev ? `${prev}\n\n${parsed.text}` : parsed.text));
    } catch (err: any) {
      setFileError(err.message || 'Failed to parse file.');
    } finally {
      setIsParsingFile(false);
    }
  };

  // AI Notes Enrichment
  const handleEnrichNotes = async () => {
    if (!newNotes.trim() && !newTitle.trim()) return;
    setIsEnrichingNotes(true);
    setEnrichMessage(null);
    try {
      const res = await fetch('/api/gemini/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: newTitle || 'Daily Lesson',
          notes: newNotes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enrichedNotes) {
          setNewNotes(data.enrichedNotes);
          setEnrichMessage('Enhanced notes with key takeaways & examples!');
          setTimeout(() => setEnrichMessage(null), 3500);
        }
      }
    } catch (e) {
      console.error(e);
      setEnrichMessage('AI enrichment failed. Check network.');
    } finally {
      setIsEnrichingNotes(false);
    }
  };

  // Submit New Topic
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tagsArray = newTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    onAddTopicWithDate(newTitle.trim(), tagsArray, newNotes.trim(), newDate || todayStr);

    // Reset Form
    setNewTitle('');
    setNewTags('');
    setNewNotes('');
    setUploadedFileName(null);
    setFileError(null);
    setIsAddModalOpen(false);
  };

  // Start Edit Modal
  const openEditModal = (t: Topic) => {
    setEditingTopic(t);
    setEditTitle(t.title);
    setEditDate(t.date);
    setEditTags(t.tags.join(', '));
    setEditNotes(t.notes || '');
    setEditMastery(t.mastery);
  };

  const handleSaveEdit = () => {
    if (!editingTopic || !editTitle.trim()) return;
    const updatedTags = editTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const updated: Topic = {
      ...editingTopic,
      title: editTitle.trim(),
      date: editDate || editingTopic.date,
      tags: updatedTags,
      notes: editNotes.trim(),
      mastery: editMastery,
    };
    onUpdateTopic(updated);
    setEditingTopic(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Complete Curriculum & Knowledge Base</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              All Lessons ({stats.total})
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Browse, search, and manage every lesson you've logged across your entire study journey. Launch AI quizzes, flip flashcards, and review spaced repetition progress.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
            {topics.length > 0 && onCleanUpAllTopics && (
              <button
                onClick={onCleanUpAllTopics}
                className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-400 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
                title="Permanently remove all previous lessons"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clean Up All</span>
              </button>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Lesson</span>
            </button>
          </div>
        </div>

        {/* Stats Pill Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div
            onClick={() => setMasteryFilter('all')}
            className="cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Lessons</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
              {stats.total}
            </div>
          </div>

          <div
            onClick={() => setMasteryFilter('mastered')}
            className="cursor-pointer p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/40 transition-colors"
          >
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mastered</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-200 mt-0.5 tabular-nums">
              {stats.mastered}
            </div>
          </div>

          <div
            onClick={() => setMasteryFilter('learning')}
            className="cursor-pointer p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-950/60 border border-blue-100 dark:border-blue-800/40 transition-colors"
          >
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              <span>In Learning</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-900 dark:text-blue-200 mt-0.5 tabular-nums">
              {stats.learning}
            </div>
          </div>

          <div
            onClick={() => setReviewFilter('due')}
            className="cursor-pointer p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100/70 dark:hover:bg-amber-950/60 border border-amber-100 dark:border-amber-800/40 transition-colors"
          >
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Due for Review</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-200 mt-0.5 tabular-nums">
              {stats.dueCount}
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter & Layout Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by lesson title, concepts, or formulas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Sort & Layout Mode */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 px-3 py-1.5 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="date-desc">Newest Date Learned</option>
                <option value="date-asc">Oldest Date Learned</option>
                <option value="review-soonest">Next Review Soonest</option>
                <option value="title-az">Title (A → Z)</option>
                <option value="title-za">Title (Z → A)</option>
                <option value="score-high">Highest Quiz Score</option>
              </select>
            </div>

            {/* Layout Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills: Mastery & Review & Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Mastery Filters */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Status:
            </span>
            <button
              onClick={() => setMasteryFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                masteryFilter === 'all'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setMasteryFilter('mastered')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                masteryFilter === 'mastered'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Mastered
            </button>
            <button
              onClick={() => setMasteryFilter('learning')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                masteryFilter === 'learning'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Learning
            </button>
            <button
              onClick={() => setMasteryFilter('new')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                masteryFilter === 'new'
                  ? 'bg-slate-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              New
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1" />

          {/* Due Review Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Review:
            </span>
            <button
              onClick={() => setReviewFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                reviewFilter === 'all'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setReviewFilter('due')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                reviewFilter === 'due'
                  ? 'bg-amber-500 text-white font-semibold'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Due Today</span>
              {stats.dueCount > 0 && (
                <span className="ml-0.5 px-1 rounded-full bg-white/20 text-[10px]">
                  {stats.dueCount}
                </span>
              )}
            </button>
          </div>

          {/* Tag Dropdown if tags exist */}
          {allTags.length > 0 && (
            <>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1" />
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg font-medium text-xs focus:outline-none cursor-pointer"
                >
                  <option value="all">All Tags ({allTags.length})</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      #{tag}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Reset Filters CTA if active */}
          {(searchQuery || masteryFilter !== 'all' || reviewFilter !== 'all' || selectedTag !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setMasteryFilter('all');
                setReviewFilter('all');
                setSelectedTag('all');
              }}
              className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing <strong className="text-slate-900 dark:text-slate-100">{filteredTopics.length}</strong> of{' '}
          {topics.length} lessons
        </span>
      </div>

      {/* EMPTY STATE */}
      {filteredTopics.length === 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {topics.length === 0 ? 'No lessons recorded yet' : 'No lessons matched your filters'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {topics.length === 0
                ? 'Start by adding your first topic or upload lesson slides/notes to build your knowledge base!'
                : 'Try adjusting your search keywords, clearing status filters, or resetting the tag selector.'}
            </p>
          </div>
          <div className="pt-2">
            {topics.length === 0 ? (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl inline-flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Lesson</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setMasteryFilter('all');
                  setReviewFilter('all');
                  setSelectedTag('all');
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-medium text-xs sm:text-sm rounded-xl inline-flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Clear All Filters</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: GRID MODE */}
      {filteredTopics.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTopics.map((topic) => {
            const isDueToday = isDue(topic.nextReviewDate, todayStr);
            const latestScore =
              topic.quizScores.length > 0
                ? topic.quizScores[topic.quizScores.length - 1]
                : null;
            const scorePercent = latestScore
              ? Math.round((latestScore.score / Math.max(1, latestScore.total)) * 100)
              : null;

            return (
              <div
                key={topic.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs hover:shadow-sm group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {/* Mastery Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        topic.mastery === 'mastered'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                          : topic.mastery === 'learning'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {topic.mastery === 'mastered' ? (
                        <Sparkles className="w-3 h-3" />
                      ) : topic.mastery === 'learning' ? (
                        <Brain className="w-3 h-3" />
                      ) : (
                        <BookOpen className="w-3 h-3" />
                      )}
                      <span>{topic.mastery}</span>
                    </span>

                    {/* Due / Next Review Badge */}
                    {isDueToday ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 animate-pulse">
                        <Clock className="w-3 h-3" />
                        <span>Due Today</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Next: {topic.nextReviewDate}</span>
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => onSelectTopicForStudy(topic, 'quiz')}
                    className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors leading-snug"
                  >
                    {topic.title}
                  </h3>

                  {/* Learned Date & Interval */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 mb-3">
                    <span>Learned: {topic.date}</span>
                    <span>·</span>
                    <span>
                      Stage {topic.intervalStep + 1} ({REPETITION_INTERVALS[topic.intervalStep] || 30}d)
                    </span>
                  </div>

                  {/* Tags */}
                  {topic.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {topic.tags.map((t) => (
                        <span
                          key={t}
                          onClick={() => setSelectedTag(t)}
                          className="text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes Snippet */}
                  {topic.notes && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 bg-slate-50/80 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 mb-3 font-normal leading-relaxed">
                      {topic.notes.slice(0, 160)}
                      {topic.notes.length > 160 ? '...' : ''}
                    </div>
                  )}

                  {/* Quiz performance indicator */}
                  {scorePercent !== null && (
                    <div className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-blue-500" />
                        <span>Last Quiz Score:</span>
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          scorePercent >= 80
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : scorePercent >= 60
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {scorePercent}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onStartQuiz(topic)}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center gap-1 transition-colors"
                      title="Launch AI Quiz"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Quiz</span>
                    </button>

                    <button
                      onClick={() => onStartFlashcards(topic)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1 transition-colors"
                      title="Review Flashcards"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </button>

                    <button
                      onClick={() => onSelectTopicForStudy(topic, 'quiz')}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Open Full Study Hub"
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditModal(topic)}
                      className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center"
                      title="Edit Lesson"
                      aria-label={`Edit ${topic.title}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteTopic(topic.id)}
                      className="p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center"
                      title="Delete Lesson"
                      aria-label={`Delete ${topic.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: TABLE / LIST MODE */}
      {filteredTopics.length > 0 && viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Lesson Title</th>
                  <th className="py-3 px-4">Learned</th>
                  <th className="py-3 px-4">Next Review</th>
                  <th className="py-3 px-4">Mastery</th>
                  <th className="py-3 px-4">Last Score</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTopics.map((topic) => {
                  const isDueToday = isDue(topic.nextReviewDate, todayStr);
                  const latestScore =
                    topic.quizScores.length > 0
                      ? topic.quizScores[topic.quizScores.length - 1]
                      : null;
                  const scorePercent = latestScore
                    ? Math.round((latestScore.score / Math.max(1, latestScore.total)) * 100)
                    : null;

                  return (
                    <tr
                      key={topic.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Title & Tags */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <div
                          onClick={() => onSelectTopicForStudy(topic, 'quiz')}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer truncate"
                        >
                          {topic.title}
                        </div>
                        {topic.tags.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {topic.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Learned Date */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {topic.date}
                      </td>

                      {/* Next Review */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isDueToday ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                            <Clock className="w-3 h-3" />
                            <span>Due Today</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400 text-xs">
                            {topic.nextReviewDate}
                          </span>
                        )}
                      </td>

                      {/* Mastery */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            topic.mastery === 'mastered'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : topic.mastery === 'learning'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {topic.mastery}
                        </span>
                      </td>

                      {/* Last Quiz Score */}
                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                        {scorePercent !== null ? (
                          <span
                            className={`font-semibold text-xs ${
                              scorePercent >= 80
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : scorePercent >= 60
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {scorePercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onStartQuiz(topic)}
                            className="px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-semibold text-xs transition-colors"
                          >
                            Quiz
                          </button>
                          <button
                            onClick={() => onStartFlashcards(topic)}
                            className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                          >
                            Cards
                          </button>
                          <button
                            onClick={() => openEditModal(topic)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                            title="Edit Lesson"
                            aria-label={`Edit ${topic.title}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTopic(topic.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                            title="Delete Lesson"
                            aria-label={`Delete ${topic.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD LESSON MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Add New Lesson
                  </h3>
                  <p className="text-xs text-slate-500">Log a topic to track and quiz with spaced repetition</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lesson / Concept Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Photosynthesis Calvin Cycle, Dijkstra's Algorithm, Newton's 2nd Law"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Date & Tags Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date Learned
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="biology, plants, exam-prep"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* File Attachment Support */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                    <span>Upload Notes / Slides (.pdf, .pptx, .docx, .md, .txt)</span>
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.pptx,.docx,.txt,.md"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processUploadedFile(e.target.files[0]);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsingFile}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1"
                  >
                    {isParsingFile ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Parsing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" />
                        <span>Browse File</span>
                      </>
                    )}
                  </button>
                </div>
                {uploadedFileName && (
                  <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Loaded: {uploadedFileName}</span>
                  </div>
                )}
                {fileError && (
                  <div className="mt-2 text-xs text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{fileError}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Notes & Core Concepts
                  </label>
                  <button
                    type="button"
                    onClick={handleEnrichNotes}
                    disabled={isEnrichingNotes || (!newNotes.trim() && !newTitle.trim())}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    {isEnrichingNotes ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>AI Enhancing...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3" />
                        <span>AI Enrich Notes</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  placeholder="Paste formulas, key terms, definitions, step-by-step logic..."
                  rows={4}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-[13px]"
                />
                {enrichMessage && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    {enrichMessage}
                  </p>
                )}
              </div>

              {/* Footer CTA */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition-colors"
                >
                  Save Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LESSON MODAL */}
      {editingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Edit Lesson
                  </h3>
                  <p className="text-xs text-slate-500">Update title, mastery status, tags, and notes</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTopic(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lesson Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Learned Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mastery Status
                  </label>
                  <select
                    value={editMastery}
                    onChange={(e) => setEditMastery(e.target.value as any)}
                    className="w-full px-3 py-2 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="new">New</option>
                    <option value="learning">Learning</option>
                    <option value="mastered">Mastered</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes & Details
                </label>
                <textarea
                  rows={5}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTopic(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editTitle.trim()}
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
