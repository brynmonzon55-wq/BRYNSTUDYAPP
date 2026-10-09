import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  isBatchAll?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  isBatchAll = false,
  onConfirm,
  onCancel,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon & Close */}
        <div className="flex items-start justify-between gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
            <Trash2 className="w-6 h-6" />
          </div>

          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {isBatchAll ? 'Clean Up All Lessons?' : 'Delete This Lesson?'}
          </h3>

          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            {isBatchAll ? (
              <>
                Are you sure you want to delete <span className="font-semibold text-rose-600 dark:text-rose-400">all previous lessons</span>? This will permanently remove all topics, notes, quiz scores, and spaced repetition review schedules.
              </>
            ) : (
              <>
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-slate-900 dark:text-white underline decoration-rose-400">
                  "{title}"
                </span>
                ? This will remove all associated notes, quiz history, and scheduled reviews.
              </>
            )}
          </p>

          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/40 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>This action cannot be undone.</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isBatchAll ? 'Clean Up & Delete All' : 'Delete Lesson'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
