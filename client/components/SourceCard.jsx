import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink, Sparkles } from 'lucide-react';

/**
 * Individual Source Card Component for RAG Excerpts
 */
export function SourceCard({ source, index, onViewInDocument }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const page = source.page || 1;
  const similarityPct = source.similarity !== undefined
    ? Math.round(source.similarity * 100)
    : (source.relevanceScore || 85);
  
  const fullText = source.text || source.fullText || source.snippet || '';
  const isLong = fullText.length > 180;
  const displayText = (!isExpanded && isLong) ? fullText.slice(0, 180) + '...' : fullText;

  return (
    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 transition-all duration-200 space-y-2.5 shadow-xs relative">
      {/* Header metadata bar */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-800 border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-white text-slate-700 rounded font-mono text-[11px] font-medium border border-slate-200">
            Source {index + 1}
          </span>
          <span className="text-slate-500 font-mono text-[11px]">
            Page {page}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 font-medium">
            Similarity: {similarityPct}%
          </span>
        </div>
      </div>

      {/* Excerpt text */}
      <div className="text-xs text-slate-700 font-mono leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
        "{displayText}"
      </div>

      {/* Card Footer Actions */}
      <div className="flex items-center justify-between pt-1 text-[11px]">
        {isLong ? (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 transition-colors"
          >
            <span>{isExpanded ? 'Show less' : 'Read more'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        ) : <div />}

        <button
          type="button"
          onClick={() => onViewInDocument?.(source)}
          className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium flex items-center gap-1 transition-all shadow-xs active:scale-95 ml-auto text-[11px]"
        >
          <FileText className="w-3 h-3 text-teal-600" />
          <span>View in Document</span>
          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}

/**
 * Container component for "Sources Used" section
 */
export function SourcesList({ sources = [], onViewInDocument }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 italic font-normal">
        No supporting clauses found
      </div>
    );
  }

  // Display max 3–5 sources
  const displaySources = sources.slice(0, 5);

  return (
    <div className="mt-4 pt-3.5 border-t border-slate-200 space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-800">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-500" />
          <span>Sources Used</span>
        </span>
        <span className="text-[10px] text-slate-500 font-normal font-mono">
          {displaySources.length} Grounded Excerpt{displaySources.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2.5">
        {displaySources.map((source, idx) => (
          <SourceCard
            key={source.chunkId || source.id || idx}
            source={source}
            index={idx}
            onViewInDocument={onViewInDocument}
          />
        ))}
      </div>
    </div>
  );
}

export default SourcesList;
