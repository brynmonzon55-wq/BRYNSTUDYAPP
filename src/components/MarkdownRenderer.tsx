import React, { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  scale?: 0 | 1 | 2; // 0 = compact (default), 1 = comfortable, 2 = large
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', scale = 0 }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    const T = [
      { h1: 'text-base sm:text-lg', h2: 'text-sm sm:text-base', h3: 'text-xs sm:text-sm', code: 'text-[11px] sm:text-xs', pre: 'text-xs', table: 'text-xs sm:text-sm' },
      { h1: 'text-2xl', h2: 'text-xl', h3: 'text-lg', code: 'text-[0.85em]', pre: 'text-sm', table: 'text-sm' },
      { h1: 'text-3xl', h2: 'text-2xl', h3: 'text-xl', code: 'text-[0.85em]', pre: 'text-base', table: 'text-base' },
    ][scale];

    try {
      // Configure marked for GitHub Flavored Markdown (tables, autolinks, line breaks)
      marked.setOptions({
        gfm: true,
        breaks: true,
      });

      const rawHtml = marked.parse(content) as string;

      // Enhance HTML tags with Tailwind styling classes
      const styledHtml = rawHtml
        // Tables container & elements
        .replace(/<table>/g, `<div class="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs"><table class="min-w-full text-left ${T.table} border-collapse">`)
        .replace(/<\/table>/g, '</table></div>')
        .replace(/<thead>/g, '<thead class="bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 font-semibold border-b border-slate-200 dark:border-slate-700">')
        .replace(/<th>/g, '<th class="px-3.5 py-2.5 font-bold tracking-tight">')
        .replace(/<tbody>/g, '<tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/60">')
        .replace(/<tr>/g, '<tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">')
        .replace(/<td>/g, '<td class="px-3.5 py-2 text-slate-700 dark:text-slate-300">')
        // Headings
        .replace(/<h1>/g, `<h1 class="${T.h1} font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2 tracking-tight">`)
        .replace(/<h2>/g, `<h2 class="${T.h2} font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-200/80 dark:border-slate-800 tracking-tight">`)
        .replace(/<h3>/g, `<h3 class="${T.h3} font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1.5">`)
        // Lists
        .replace(/<ul>/g, '<ul class="list-disc list-outside pl-5 space-y-1 mb-3 text-slate-700 dark:text-slate-300">')
        .replace(/<ol>/g, '<ol class="list-decimal list-outside pl-5 space-y-1 mb-3 text-slate-700 dark:text-slate-300">')
        .replace(/<li>/g, '<li class="leading-relaxed">')
        // Paragraphs
        .replace(/<p>/g, '<p class="mb-2.5 leading-relaxed text-slate-700 dark:text-slate-300">')
        // Code
        .replace(/<code>/g, `<code class="px-1.5 py-0.5 ${T.code} font-mono font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200/60 dark:border-slate-700/60">`)
        .replace(/<pre>/g, `<pre class="p-3 my-3 rounded-xl bg-slate-900 text-slate-100 overflow-x-auto ${T.pre} font-mono">`)
        // Horizontal Rules
        .replace(/<hr>/g, '<hr class="my-4 border-slate-200 dark:border-slate-800">')
        // Strong & Emphasis
        .replace(/<strong>/g, '<strong class="font-bold text-slate-900 dark:text-slate-100">');

      return styledHtml;
    } catch (e) {
      console.error('Error rendering markdown:', e);
      return `<pre class="whitespace-pre-line text-xs">${content}</pre>`;
    }
  }, [content, scale]);

  return (
    <div
      className={`markdown-content ${scale === 0 ? 'text-xs sm:text-sm' : scale === 1 ? 'text-base' : 'text-lg'} leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};
