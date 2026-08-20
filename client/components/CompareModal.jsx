import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  RefreshCw,
  Zap,
  Info
} from 'lucide-react';

export default function CompareModal({ isOpen, onClose, documents = [], initialDocA = null, initialDocB = null, onAnalyzeDoc }) {
  const [docAId, setDocAId] = useState('');
  const [docBId, setDocBId] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (documents.length > 0) {
      const firstId = initialDocA?._id || initialDocA?.id || documents[0]?._id || documents[0]?.id || '';
      const secondDoc = initialDocB || documents.find(d => (d._id || d.id) !== firstId) || documents[1] || documents[0];
      const secondId = secondDoc?._id || secondDoc?.id || '';

      setDocAId(firstId);
      setDocBId(secondId);
      setComparisonResult(null);
      setErrorMsg('');

      if (firstId && secondId && firstId !== secondId) {
        runComparison(firstId, secondId);
      }
    }
  }, [isOpen, initialDocA, initialDocB, documents]);

  const runComparison = async (idA, idB) => {
    const targetA = idA || docAId;
    const targetB = idB || docBId;

    if (!targetA || !targetB) {
      setErrorMsg('Please select two distinct documents to perform side-by-side comparison.');
      return;
    }
    if (targetA === targetB) {
      setErrorMsg('Please select two different documents to compare.');
      return;
    }

    setErrorMsg('');
    setIsComparing(true);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docAId: targetA,
          docBId: targetB
        })
      });

      const data = await res.json();
      if (data.success) {
        setComparisonResult(data);
      } else {
        setErrorMsg(data.error || 'Failed to compare documents.');
      }
    } catch (err) {
      console.error('Error running comparison:', err);
      setErrorMsg('Network error while comparing contracts.');
    } finally {
      setIsComparing(false);
    }
  };

  if (!isOpen) return null;

  const docAObj = documents.find(d => (d._id || d.id) === docAId);
  const docBObj = documents.find(d => (d._id || d.id) === docBId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/30 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl bg-white rounded-xl p-6 border border-slate-200 shadow-xl max-h-[92vh] flex flex-col space-y-5 text-slate-900 relative">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900 text-lg sm:text-xl tracking-tight">Contract Comparison</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-teal-50 text-teal-700 rounded font-mono border border-teal-200">
                  AI Clause Matrix
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Side-by-side risk and clause comparison across selected legal agreements
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Selection Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
          {/* Doc A Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Document A (Base)
            </label>
            <select
              value={docAId}
              onChange={(e) => {
                setDocAId(e.target.value);
                if (e.target.value && docBId && e.target.value !== docBId) {
                  runComparison(e.target.value, docBId);
                }
              }}
              className="w-full p-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 shadow-2xs"
            >
              <option value="">Select Document A...</option>
              {documents.map(d => (
                <option key={d._id || d.id} value={d._id || d.id}>
                  {d.title} ({d.riskLevel} Risk - Score: {d.riskScore || 50})
                </option>
              ))}
            </select>
          </div>

          {/* Doc B Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Document B (Target)
            </label>
            <select
              value={docBId}
              onChange={(e) => {
                setDocBId(e.target.value);
                if (docAId && e.target.value && docAId !== e.target.value) {
                  runComparison(docAId, e.target.value);
                }
              }}
              className="w-full p-2 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 shadow-2xs"
            >
              <option value="">Select Document B...</option>
              {documents.map(d => (
                <option key={d._id || d.id} value={d._id || d.id}>
                  {d.title} ({d.riskLevel} Risk - Score: {d.riskScore || 50})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error state alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">

          {isComparing ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold text-slate-700">Analyzing clause differences & evaluating risk profiles with Gemini...</p>
            </div>
          ) : comparisonResult ? (
            <>
              {/* Safer Document Recommendation Card */}
              <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 space-y-2 relative shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-700" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      AI Legal Recommendation
                    </span>
                  </div>

                  <span className="px-3 py-1 bg-teal-400 text-white font-semibold text-xs rounded-full shadow-2xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Safer Option: {comparisonResult.saferDocument}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed font-normal pl-7">
                  {comparisonResult.reason}
                </p>
              </div>

              {/* Document Overview Badges */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Document A:</span>
                  <div className="font-bold text-slate-900 text-sm truncate">{comparisonResult.docA?.title || docAObj?.title}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      comparisonResult.docA?.riskLevel === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-teal-100 text-teal-800'
                    }`}>
                      {comparisonResult.docA?.riskLevel || docAObj?.riskLevel || 'Medium'} Risk
                    </span>
                    <span className="text-slate-500 font-medium">Score: {comparisonResult.docA?.riskScore || docAObj?.riskScore || 50}/100</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">Document B:</span>
                  <div className="font-bold text-slate-900 text-sm truncate">{comparisonResult.docB?.title || docBObj?.title}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      comparisonResult.docB?.riskLevel === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-teal-100 text-teal-800'
                    }`}>
                      {comparisonResult.docB?.riskLevel || docBObj?.riskLevel || 'Medium'} Risk
                    </span>
                    <span className="text-slate-500 font-medium">Score: {comparisonResult.docB?.riskScore || docBObj?.riskScore || 50}/100</span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparison Table Matrix */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
                      <th className="p-3 w-1/4 border-r border-slate-200">Category</th>
                      <th className="p-3 w-3/8 border-r border-slate-200 bg-slate-50/80">
                        {docAObj?.title || 'Document A'}
                      </th>
                      <th className="p-3 w-3/8 bg-teal-50/50">
                        {docBObj?.title || 'Document B'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {comparisonResult.comparison && comparisonResult.comparison.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 bg-slate-50/50 border-r border-slate-200">
                          {item.category}
                        </td>
                        <td className="p-3 font-mono leading-relaxed border-r border-slate-200">
                          {item.docA}
                        </td>
                        <td className="p-3 font-mono leading-relaxed bg-teal-50/20">
                          {item.docB}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500 space-y-2">
              <Info className="w-6 h-6 text-slate-400 mx-auto" />
              <p>Select two different contracts above and click compare to analyze risk differences.</p>
            </div>
          )}

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 shrink-0">
          <div className="flex items-center gap-2">
            {docAObj && (
              <button
                type="button"
                onClick={() => { onClose(); onAnalyzeDoc?.(docAObj); }}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-teal-600" />
                <span>Analyze Doc A</span>
              </button>
            )}
            {docBObj && (
              <button
                type="button"
                onClick={() => { onClose(); onAnalyzeDoc?.(docBObj); }}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-teal-600" />
                <span>Analyze Doc B</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-teal-400 hover:bg-teal-500 text-white font-medium text-xs transition-all shadow-xs"
          >
            Close Comparison
          </button>
        </div>

      </div>
    </div>
  );
}
