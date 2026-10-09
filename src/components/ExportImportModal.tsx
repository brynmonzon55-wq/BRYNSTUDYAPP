import React, { useState } from 'react';
import { X, Download, Upload, Copy, Check, AlertCircle, FileText } from 'lucide-react';
import { exportAllData, importAllData } from '../utils/storage';

interface ExportImportModalProps {
  onClose: () => void;
  onDataImported: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  onClose,
  onDataImported,
}) => {
  const [copied, setCopied] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  const jsonData = exportAllData();

  const handleDownload = () => {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning_calendar_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!importJson.trim()) {
      setImportStatus({ success: false, message: 'Please paste valid JSON data to import.' });
      return;
    }

    const success = importAllData(importJson.trim());
    if (success) {
      setImportStatus({ success: true, message: 'Data imported successfully!' });
      setTimeout(() => {
        onDataImported();
        onClose();
      }, 1200);
    } else {
      setImportStatus({ success: false, message: 'Invalid JSON format or corrupted data schema.' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportJson(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Backup & Restore Data (JSON)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Section 1: Export */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export Your Learning Data</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download your full database (all calendar days, learned topics, spaced intervals, quiz history, and weak spots) as a standard JSON file.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-800 dark:hover:bg-white transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .JSON File</span>
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Section 2: Import */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Import Data from Backup</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Restore previously saved data by pasting JSON or selecting a backup file.
            </p>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Choose File (.json)</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <textarea
              rows={4}
              placeholder="Or paste your raw backup JSON string here..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {importStatus && (
              <div
                className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
                  importStatus.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {importStatus.success ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleImport}
                disabled={!importJson.trim()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors shadow-xs"
              >
                Restore Backup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
