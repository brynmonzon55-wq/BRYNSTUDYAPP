import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Layers,
  History,
  ArrowRight,
  FileText,
  Code,
  Edit3,
  Trash2,
  Save,
  Wand2,
  Loader2,
} from 'lucide-react';
import { Topic, QuizDepth } from '../types';
import { REPETITION_INTERVALS, isDue, getTodayString } from '../utils/storage';
import { MarkdownRenderer } from './MarkdownRenderer';

interface TopicModalProps {
  topic: Topic;
  initialTab?: 'lesson' | 'quiz' | 'flashcards' | 'history';
  onClose: () => void;
  onStartQuiz: (topic: Topic, depth: QuizDepth, count: number) => void;
  onStartFlashcards: (topic: Topic) => void;
  onUpdateTopic?: (updatedTopic: Topic) => void;
  onDeleteTopic?: (id: string) => void;
}

export const TopicModal: React.FC<TopicModalProps> = ({
  topic,
  initialTab = 'quiz',
  onClose,
  onStartQuiz,
  onStartFlashcards,
  onUpdateTopic,
  onDeleteTopic,
}) => {
  const [activeTab, setActiveTab] = useState<'lesson' | 'quiz' | 'flashcards' | 'history'>(initialTab);
  const [lessonSize, setLessonSize] = useState<0 | 1 | 2>(() => {
    try {
      const v = parseInt(localStorage.getItem('lesson_text_size') || '1', 10);
      return v === 0 || v === 2 ? v : 1;
    } catch {
      return 1;
    }
  });
  const changeLessonSize = (delta: number) => {
    const next = Math.max(0, Math.min(2, lessonSize + delta)) as 0 | 1 | 2;
    setLessonSize(next);
    try { localStorage.setItem('lesson_text_size', String(next)); } catch {}
  };
  const [selectedDepth, setSelectedDepth] = useState<QuizDepth>('balanced');
  const [selectedCountMode, setSelectedCountMode] = useState<'auto' | 15 | 25 | 50>('auto');
  const [showRawNotes, setShowRawNotes] = useState(false);

  // In-modal Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(topic.title);
  const [editTags, setEditTags] = useState(topic.tags.join(', '));
  const [editNotes, setEditNotes] = useState(topic.notes || '');
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);

  // Sync state if topic changes externally
  useEffect(() => {
    setEditTitle(topic.title);
    setEditTags(topic.tags.join(', '));
    setEditNotes(topic.notes || '');
  }, [topic]);

  const todayStr = getTodayString();
  const isReviewDue = isDue(topic.nextReviewDate, todayStr);

  // Save edits
  const handleSaveLesson = () => {
    const updatedTags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const updated: Topic = {
      ...topic,
      title: editTitle.trim() || topic.title,
      tags: updatedTags,
      notes: editNotes.trim(),
    };

    // Purge cached quiz questions for this topic so updated notes take effect
    ['foundation', 'balanced', 'deep'].forEach((d) => {
      [15, 25, 50].forEach((c) => {
        localStorage.removeItem(`quiz_cache_${topic.id}_${d}_${c}`);
      });
      localStorage.removeItem(`quiz_cache_${topic.id}_${d}`);
    });

    onUpdateTopic?.(updated);
    setIsEditing(false);
  };

  // Enrich notes inside modal
  const handleEnrichInModal = async () => {
    if (!editNotes.trim()) return;
    setIsEnriching(true);
    setEnrichMessage(null);
    try {
      const res = await fetch('/api/gemini/enrich-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: editTitle || topic.title,
          notes: editNotes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enrichedNotes) {
          setEditNotes(data.enrichedNotes);
          setEnrichMessage('Added practical examples to notes!');
          setTimeout(() => setEnrichMessage(null), 3500);
        }
      }
    } catch (e) {
      console.error(e);
      setEnrichMessage('Failed to enrich notes.');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-3xl bg-white dark:bg-slate-900 sm:border border-slate-200 dark:border-slate-800 sm:rounded-2xl shadow-xl overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Learned on {topic.date}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  topic.mastery === 'mastered'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : topic.mastery === 'learning'
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {topic.mastery}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {topic.title}
            </h2>
            {topic.tags.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {topic.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Lesson Button */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isEditing
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                  : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancel Edit' : 'Edit Lesson'}</span>
            </button>

            {/* Delete Lesson Button */}
            {onDeleteTopic && (
              <button
                onClick={() => {
                  onDeleteTopic(topic.id);
                  onClose();
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Delete Lesson"
                aria-label="Delete Lesson"
              >
                <Trash2 className="w-4 h-4" />
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

        {/* IN-MODAL EDITING DRAWER */}
        {isEditing ? (
          <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Edit Lesson Details & Notes</span>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Topic Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Subject Tags (comma-separated)
              </label>
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Study Guide & Lesson Notes (Supports Markdown Tables, Headers, & Code)
                </label>
                <button
                  type="button"
                  onClick={handleEnrichInModal}
                  disabled={isEnriching || !editNotes.trim()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 disabled:opacity-50"
                >
                  {isEnriching ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Adding Examples...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 text-amber-600" />
                      <span>Add Missing Examples</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={10}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-y leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Paste or edit your study notes in Markdown..."
              />

              {enrichMessage && (
                <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {enrichMessage}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEditTitle(topic.title);
                  setEditTags(topic.tags.join(', '));
                  setEditNotes(topic.notes || '');
                  setIsEditing(false);
                }}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLesson}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Navigation (Lesson, Quiz, Flashcards, History) */}
            <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-800 px-2 sm:px-5 bg-slate-50/60 dark:bg-slate-900/60">
              {([
                { id: 'lesson', label: 'Lesson', Icon: FileText },
                { id: 'quiz', label: 'Quiz', Icon: Sparkles },
                { id: 'flashcards', label: 'Flashcards', Icon: Layers },
                { id: 'history', label: 'History', Icon: History },
              ] as const).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`shrink-0 whitespace-nowrap py-3 px-3 sm:px-4 text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
                    activeTab === id
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div key={activeTab} className={`${activeTab === 'lesson' ? 'px-4 py-4 sm:p-6' : 'p-6'} overflow-y-auto flex-1 space-y-6`}>
              {activeTab === 'lesson' && topic.notes && (
                <div className="text-slate-700 dark:text-slate-300 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Study Guide</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => changeLessonSize(-1)}
                        disabled={lessonSize === 0}
                        aria-label="Smaller text"
                        className="px-2 py-0.5 rounded text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 disabled:opacity-30"
                      >
                        A−
                      </button>
                      <button
                        type="button"
                        onClick={() => changeLessonSize(1)}
                        disabled={lessonSize === 2}
                        aria-label="Larger text"
                        className="px-2 py-0.5 rounded text-base font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 disabled:opacity-30"
                      >
                        A+
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRawNotes(!showRawNotes)}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-1"
                      >
                        <Code className="w-3 h-3" />
                        <span className="hidden sm:inline">{showRawNotes ? 'Preview' : 'Raw'}</span>
                      </button>
                    </div>
                  </div>
                  {showRawNotes ? (
                    <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 dark:text-slate-300 p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 overflow-x-auto">
                      {topic.notes}
                    </pre>
                  ) : (
                    <MarkdownRenderer content={topic.notes} scale={lessonSize} />
                  )}
                </div>
              )}

              {activeTab === 'lesson' && !topic.notes && (
                <div className="text-center py-10 space-y-3 text-sm text-slate-500 dark:text-slate-400">
                  <p>This lesson has no notes yet.</p>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                  >
                    Add notes
                  </button>
                </div>
              )}

              {/* TAB 1: AI QUIZ CONFIGURATION */}
              {activeTab === 'quiz' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                      Choose Quiz Depth & Style
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      Tailor question difficulty based on whether you want to relearn core basics or test real-world depth.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Option 1: Foundation */}
                      <button
                        type="button"
                        onClick={() => setSelectedDepth('foundation')}
                        className={`p-3.5 rounded-xl border text-left transition-all relative ${
                          selectedDepth === 'foundation'
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Foundation
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Relearn
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Core definitions, clear foundational rules, and gentle active recall.
                        </p>
                      </button>

                      {/* Option 2: Balanced */}
                      <button
                        type="button"
                        onClick={() => setSelectedDepth('balanced')}
                        className={`p-3.5 rounded-xl border text-left transition-all relative ${
                          selectedDepth === 'balanced'
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Balanced
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            Standard
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Healthy mix of factual recall, calculations, and conceptual application.
                        </p>
                      </button>

                      {/* Option 3: Deep Application */}
                      <button
                        type="button"
                        onClick={() => setSelectedDepth('deep')}
                        className={`p-3.5 rounded-xl border text-left transition-all relative ${
                          selectedDepth === 'deep'
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            Deep Application
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            Mastery
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                          Challenging edge cases, numerical calculations, and practical debugging.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Quiz Length Selector */}
                  {(() => {
                    const wordCount = (topic.notes || '').trim().split(/\s+/).filter(Boolean).length;
                    const autoCalculatedCount = Math.min(Math.max(15, Math.ceil(wordCount / 25)), 50);
                    const resolvedCount = selectedCountMode === 'auto' ? autoCalculatedCount : selectedCountMode;

                    return (
                      <>
                        <div className="pt-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                              Quiz Length ({resolvedCount} Questions)
                            </h4>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {selectedCountMode === 'auto' ? `Auto-sized based on ${wordCount} words` : 'Fixed size'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCountMode('auto')}
                              className={`p-2.5 rounded-xl text-left border transition-all ${
                                selectedCountMode === 'auto'
                                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span>Auto</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 font-semibold text-blue-700 dark:text-blue-300">
                                  ~{autoCalculatedCount} Qs
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">By lesson length</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCountMode(15)}
                              className={`p-2.5 rounded-xl text-left border transition-all ${
                                selectedCountMode === 15
                                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="text-xs font-bold">15 Questions</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Quick active recall</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCountMode(25)}
                              className={`p-2.5 rounded-xl text-left border transition-all ${
                                selectedCountMode === 25
                                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="text-xs font-bold">25 Questions</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Full topic test</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedCountMode(50)}
                              className={`p-2.5 rounded-xl text-left border transition-all ${
                                selectedCountMode === 50
                                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="text-xs font-bold">50 Questions</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Exhaustive mock exam</div>
                            </button>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                              {resolvedCount} active-recall questions
                            </span>
                          </div>

                          <button
                            onClick={() => onStartQuiz(topic, selectedDepth, resolvedCount)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>Start {selectedDepth.toUpperCase()} Quiz ({resolvedCount} Qs)</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: FLASHCARDS */}
              {activeTab === 'flashcards' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Interactive Flashcard Deck
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                        Active-recall flip cards with self-scoring (Again, Hard, Good, Easy) adjusting spaced repetition intervals.
                      </p>
                    </div>

                    <button
                      onClick={() => onStartFlashcards(topic)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-sm transition-all"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Launch Flashcard Session</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: REVIEW HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-semibold">Review Progress & Intervals</span>
                    <span>Interval: {REPETITION_INTERVALS[topic.intervalStep]} days</span>
                  </div>

                  {(!topic.quizScores || topic.quizScores.length === 0) ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No completed quiz attempts recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topic.quizScores.map((scoreItem, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400">#{idx + 1}</span>
                            <span className="text-slate-700 dark:text-slate-300">{scoreItem.date}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {scoreItem.depth || 'balanced'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold tabular-nums ${
                                (scoreItem.score / scoreItem.total) >= 0.8
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : (scoreItem.score / scoreItem.total) >= 0.6
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {scoreItem.score} / {scoreItem.total} ({Math.round((scoreItem.score / scoreItem.total) * 100)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
