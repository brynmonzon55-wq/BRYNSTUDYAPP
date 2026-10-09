import React, { useState, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  Brain,
  Layers,
  History,
  ChevronRight,
  Clock,
  Upload,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Loader2,
} from 'lucide-react';
import { Topic } from '../types';
import { parseDateString, getTodayString, isDue, REPETITION_INTERVALS } from '../utils/storage';
import { parseUploadedDocument } from '../utils/fileParser';

interface DayViewProps {
  selectedDate: string; // YYYY-MM-DD
  topics: Topic[];
  onAddTopic: (title: string, tags: string[], notes: string) => void;
  onUpdateTopic: (topic: Topic) => void;
  onDeleteTopic: (id: string) => void;
  onSelectTopicForStudy: (topic: Topic, initialTab?: 'lesson' | 'quiz' | 'flashcards' | 'history') => void;
}

export const DayView: React.FC<DayViewProps> = ({
  selectedDate,
  topics,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
  onSelectTopicForStudy,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // File Upload & Enrichment State
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEnrichingNotes, setIsEnrichingNotes] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isEnrichingEditNotes, setIsEnrichingEditNotes] = useState(false);
  const [editEnrichMessage, setEditEnrichMessage] = useState<string | null>(null);

  // Filter topics for the selected day
  const dayTopics = topics.filter((t) => t.date === selectedDate);

  // Format date display
  const dateObj = parseDateString(selectedDate);
  const todayStr = getTodayString();
  const isToday = selectedDate === todayStr;

  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Handle uploaded file (.pdf, .pptx, .docx, .md, .txt)
  const processUploadedFile = async (file: File) => {
    setIsParsingFile(true);
    setFileError(null);
    try {
      const parsed = await parseUploadedDocument(file);
      setUploadedFileName(`${parsed.fileName} (${(parsed.fileSize / 1024).toFixed(1)} KB)`);

      // Auto-populate Title if empty
      if (!newTitle.trim() && parsed.suggestedTitle) {
        setNewTitle(parsed.suggestedTitle);
      }

      // Auto-populate Tags if empty
      if (!newTags.trim() && parsed.suggestedTags.length > 0) {
        setNewTags(parsed.suggestedTags.join(', '));
      }

      // Populate or Append to Notes
      if (!newNotes.trim()) {
        setNewNotes(parsed.text);
      } else {
        setNewNotes((prev) => `${prev}\n\n---\nExtracted from ${parsed.fileName}:\n${parsed.text}`);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setFileError(err.message || 'Failed to read file. Please check format.');
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Smart Study Guide Enrichment ("Fill Missing Examples")
  const handleEnrichNotes = async (isEditMode = false) => {
    const targetTopic = isEditMode ? editTitle : newTitle;
    const targetNotes = isEditMode ? editNotes : newNotes;

    if (!targetNotes.trim()) {
      const msg = 'Please enter or upload study notes before enriching.';
      if (isEditMode) setEditEnrichMessage(msg);
      else setEnrichMessage(msg);
      return;
    }

    if (isEditMode) setIsEnrichingEditNotes(true);
    else setIsEnrichingNotes(true);

    try {
      const res = await fetch('/api/gemini/enrich-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic || 'Study Topic',
          notes: targetNotes,
        }),
      });

      if (!res.ok) throw new Error('Enrichment failed');
      const data = await res.json();

      if (data.enrichedNotes) {
        if (isEditMode) {
          setEditNotes(data.enrichedNotes);
          setEditEnrichMessage('Appended practical examples to your study guide!');
        } else {
          setNewNotes(data.enrichedNotes);
          setEnrichMessage('Appended practical examples to your study guide!');
        }
        setTimeout(() => {
          setEnrichMessage(null);
          setEditEnrichMessage(null);
        }, 4000);
      }
    } catch (err: any) {
      console.error('Enrich notes error:', err);
      const errMsg = 'Failed to enrich notes. Please try again.';
      if (isEditMode) setEditEnrichMessage(errMsg);
      else setEnrichMessage(errMsg);
    } finally {
      if (isEditMode) setIsEnrichingEditNotes(false);
      else setIsEnrichingNotes(false);
    }
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const parsedTags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onAddTopic(newTitle.trim(), parsedTags, newNotes.trim());
    setNewTitle('');
    setNewTags('');
    setNewNotes('');
    setUploadedFileName(null);
    setEnrichMessage(null);
    setFileError(null);
    setIsAdding(false);
  };

  const startEditing = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditTitle(topic.title);
    setEditTags(topic.tags.join(', '));
    setEditNotes(topic.notes || '');
    setEditEnrichMessage(null);
  };

  const saveEdit = (topic: Topic) => {
    const updatedTags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    onUpdateTopic({
      ...topic,
      title: editTitle.trim() || topic.title,
      tags: updatedTags,
      notes: editNotes.trim(),
    });
    setEditingTopicId(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-colors flex flex-col h-full">
      {/* Date Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {formattedDate}
            </h3>
            {isToday && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full">
                Today
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {dayTopics.length === 0
              ? 'No topics logged yet for this day'
              : `${dayTopics.length} topic${dayTopics.length > 1 ? 's' : ''} recorded`}
          </p>
        </div>

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Topic</span>
          </button>
        )}
      </div>

      {/* Add Topic Form Drawer */}
      {isAdding && (
        <form
          onSubmit={handleCreateTopic}
          className="my-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Log Topic & Study Notes</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setUploadedFileName(null);
                setFileError(null);
              }}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          {/* DRAG & DROP FILE INGESTION ZONE */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                : 'border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx,.docx,.md,.txt,text/plain,text/markdown"
              onChange={handleFileInputChange}
              className="hidden"
            />
            {isParsingFile ? (
              <div className="flex items-center justify-center gap-2 py-1 text-xs text-blue-600 dark:text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting lesson text from document...</span>
              </div>
            ) : uploadedFileName ? (
              <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 px-1">
                <span className="flex items-center gap-1.5 font-medium line-clamp-1">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  <span>{uploadedFileName}</span>
                </span>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold underline">
                  Replace File
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-0.5">
                <Upload className="w-4 h-4 text-slate-400" />
                <span>
                  Drop or click to attach <strong className="font-semibold text-slate-700 dark:text-slate-300">.pdf, .pptx, .docx, .md, .txt</strong>
                </span>
              </div>
            )}
          </div>

          {fileError && (
            <div className="text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{fileError}</span>
            </div>
          )}

          {/* Topic Title */}
          <div>
            <input
              type="text"
              placeholder="Topic Title (e.g. Ohm's Law & Circuit Fundamentals)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-medium"
              autoFocus
            />
          </div>

          {/* Tags */}
          <div>
            <input
              type="text"
              placeholder="Tags (comma-separated, e.g. Electronics, Physics)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              className="w-full px-3 py-2 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Study Notes Textarea */}
          <div className="space-y-1.5">
            <textarea
              rows={4}
              placeholder="Key notes, study guide, or slide takeaways to guide AI questions (or paste lesson text here)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full px-3 py-2 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 resize-y leading-relaxed"
            />

            {/* Smart Study Guide Enricher Button ("Add Missing Examples") */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleEnrichNotes(false)}
                disabled={isEnrichingNotes || !newNotes.trim()}
                title="Inspect notes and append practical examples or real-world walkthroughs without altering your original summary"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 disabled:opacity-50 transition-all shadow-2xs"
              >
                {isEnrichingNotes ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span>Analyzing & Adding Examples...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Enrich Notes (Add Missing Examples)</span>
                  </>
                )}
              </button>

              {enrichMessage && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{enrichMessage}</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setUploadedFileName(null);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              Save Topic
            </button>
          </div>
        </form>
      )}

      {/* Topics List */}
      <div className="flex-1 overflow-y-auto space-y-3 pt-3">
        {dayTopics.length === 0 && !isAdding && (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
              <Brain className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No topics logged for {formattedDate}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1 mb-4">
              Log whatever you read, coded, or studied today—or drop a PDF / slide deck to auto-extract the lesson.
            </p>
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log First Topic</span>
            </button>
          </div>
        )}

        {dayTopics.map((topic, index) => {
          const isReviewDue = isDue(topic.nextReviewDate, todayStr);
          const intervalDays = REPETITION_INTERVALS[topic.intervalStep] || 30;

          if (editingTopicId === topic.id) {
            return (
              <div
                key={topic.id}
                className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 space-y-2.5"
              >
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Editing Topic #{index + 1}
                </div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                />
                <input
                  type="text"
                  placeholder="Tags (comma-separated)"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3 py-1.5 text-base sm:text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                <textarea
                  rows={4}
                  placeholder="Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-base sm:text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-y leading-relaxed"
                />

                {/* Edit Enrichment Action */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleEnrichNotes(true)}
                    disabled={isEnrichingEditNotes || !editNotes.trim()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-all shadow-2xs"
                  >
                    {isEnrichingEditNotes ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        <span>Adding Missing Examples...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Enrich Notes (Add Missing Examples)</span>
                      </>
                    )}
                  </button>

                  {editEnrichMessage && (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      {editEnrichMessage}
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEditingTopicId(null)}
                    className="px-2.5 py-1 text-xs rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveEdit(topic)}
                    className="px-3 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={topic.id}
              className="group relative p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
            >
              {/* Top row: Number, Title & Actions */}
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => onSelectTopicForStudy(topic)}
                  className="flex-1 text-left flex items-start gap-2 focus:outline-none"
                >
                  <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">
                    {index + 1}.
                  </span>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {topic.title}
                    </h4>

                    {topic.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 whitespace-pre-line">
                        {topic.notes}
                      </p>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEditing(topic)}
                    title="Edit topic"
                    className="p-2 sm:p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center"
                    aria-label={`Edit ${topic.title}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteTopic(topic.id)}
                    title="Delete topic"
                    className="p-2 sm:p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center"
                    aria-label={`Delete ${topic.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tags & Metadata */}
              <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {topic.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/60 px-2 py-0.5 rounded-md"
                    >
                      {tag}
                    </span>
                  ))}

                  <span className="text-slate-400 dark:text-slate-600">·</span>
                  <span
                    className={`text-[11px] font-medium capitalize ${
                      topic.mastery === 'mastered'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : topic.mastery === 'learning'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {topic.mastery}
                  </span>

                  <span className="text-slate-400 dark:text-slate-600">·</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {intervalDays}d interval
                  </span>
                </div>

                {/* Review status */}
                {isReviewDue ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                    <Clock className="w-3.5 h-3.5" />
                    Review Due
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                    Next: {topic.nextReviewDate}
                  </span>
                )}
              </div>

              {/* Study Action Bar (Quiz, Flashcards, History) */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onSelectTopicForStudy(topic, 'quiz')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>AI Quiz</span>
                  </button>

                  <button
                    onClick={() => onSelectTopicForStudy(topic, 'flashcards')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Flashcards</span>
                  </button>

                  <button
                    onClick={() => onSelectTopicForStudy(topic, 'history')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">History</span>
                  </button>
                </div>

                <button
                  onClick={() => onSelectTopicForStudy(topic)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-0.5"
                >
                  <span>Open</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
