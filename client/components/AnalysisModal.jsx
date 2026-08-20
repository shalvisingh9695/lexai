import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bot,
  Sparkles,
  ShieldAlert,
  Send,
  CheckCircle2,
  ListChecks,
  AlertOctagon,
  Copy,
  Check,
  Zap,
  Target,
  User,
  Shield,
  FileSearch,
  Scale,
  FileText,
  CheckCircle
} from 'lucide-react';
import SourcesList from './SourceCard';

export default function AnalysisModal({ isOpen, onClose, document, initialTab = 'summary' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'summary');
    }
  }, [isOpen, initialTab, document]);
  
  // Summary state
  const [summaryData, setSummaryData] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  // Risk state
  const [riskData, setRiskData] = useState(null);
  const [isRiskLoading, setIsRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState('');

  // RAG Chat state
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [viewSourceModal, setViewSourceModal] = useState(null);
  const messagesEndRef = useRef(null);

  const docId = document?._id || document?.id;

  // Initialize and reset modal state on open
  useEffect(() => {
    if (!isOpen || !document) return;

    setActiveTab('summary');
    setSummaryError('');
    setRiskError('');
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: `Hello! I am your LexAI Assistant. I have indexed "${document.title}" into vector memory. Ask me anything about termination notice, SLAs, liability caps, or specific indemnity clauses!`,
        sources: []
      }
    ]);

    // Fetch Summary
    fetchSummary();
    // Fetch Risk Analysis
    fetchRiskAnalysis();
  }, [isOpen, document]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isChatLoading]);

  const fetchSummary = async () => {
    if (!docId) return;
    setIsSummaryLoading(true);
    setSummaryError('');
    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docId,
          documentTitle: document.title,
          category: document.category,
          documentText: document.summary
        })
      });
      const data = await res.json();
      if (data.success && data.summary) {
        setSummaryData(data.summary);
      } else {
        setSummaryError('Something went wrong generating contract summary.');
      }
    } catch (err) {
      setSummaryError('Something went wrong. Network error or server not responding.');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const fetchRiskAnalysis = async () => {
    if (!docId) return;
    setIsRiskLoading(true);
    setRiskError('');
    try {
      const res = await fetch('/api/ai/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: docId,
          documentTitle: document.title,
          category: document.category,
          documentText: document.summary
        })
      });
      const data = await res.json();
      if (data.success) {
        setRiskData({
          riskLevel: data.riskLevel,
          riskScore: data.riskScore,
          reasons: data.reasons || [],
          flaggedClauses: data.flaggedClauses || data.risks || [],
          risks: data.risks || []
        });
      } else {
        setRiskError('Something went wrong evaluating contract risk.');
      }
    } catch (err) {
      setRiskError('Something went wrong. Network error or server not responding.');
    } finally {
      setIsRiskLoading(false);
    }
  };

  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!inputQuery.trim() || isChatLoading) return;

    const query = inputQuery.trim();
    setInputQuery('');

    const userMsg = { id: `user_${Date.now()}`, sender: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      // 1. Try primary grounded RAG endpoint /api/ask
      let res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          documentId: docId
        })
      });

      let data = await res.json();

      // 2. Fallback to /api/chat if /api/ask fails
      if (!data.success) {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: query,
            documentId: docId
          })
        });
        data = await res.json();
      }

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            sender: 'ai',
            text: data.answer,
            sources: data.sources || []
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: 'ai',
            text: `Error processing question: ${data.error || 'Server error'}`,
            sources: []
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'ai',
          text: 'Network error communicating with LexAI RAG server.',
          sources: []
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!isOpen || !document) return null;

  const docRisk = riskData?.riskLevel || document.riskLevel || 'Low';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/30 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl bg-white rounded-xl border border-slate-200 flex flex-col h-[90vh] overflow-hidden shadow-xl relative text-slate-900">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                docRisk === 'High'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : docRisk === 'Medium'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-teal-50 text-teal-700 border-teal-200'
              }`}>
                {docRisk} Risk Level
              </span>
              <span className="text-xs text-slate-500 font-mono font-medium">{document.category}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{document.title}</h2>
            <p className="text-xs text-slate-500 font-mono">{document.fileName} • Vector Indexed Repository</p>
          </div>

          <button
            onClick={onClose}
            id="close-analysis-modal-btn"
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 transition-colors border border-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          <button
            id="modal-tab-summary"
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'summary'
                ? 'bg-teal-400 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 bg-white border border-slate-300'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Structured Summary</span>
          </button>

          <button
            id="modal-tab-risk"
            onClick={() => setActiveTab('risk')}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'risk'
                ? 'bg-teal-400 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 bg-white border border-slate-300'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Risk Detection</span>
          </button>

          <button
            id="modal-tab-chat"
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'chat'
                ? 'bg-teal-400 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 bg-white border border-slate-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>RAG Chat Assistant</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: STRUCTURED SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-6 animate-fadeIn">
              {isSummaryLoading ? (
                /* Clean Centered Loading State for Summary */
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-900">Analyzing document...</h4>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Parsing commercial terms, contractual obligations, and penalties with LexAI Legal Engine...
                    </p>
                  </div>
                </div>
              ) : summaryError ? (
                /* Error State */
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-slate-900 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Something went wrong</span>
                  </div>
                  <p className="text-xs text-rose-900 font-normal leading-relaxed">{summaryError}</p>
                  <button
                    onClick={fetchSummary}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
                  >
                    Retry Summary
                  </button>
                </div>
              ) : summaryData ? (
                <div className="grid md:grid-cols-2 gap-4">
                  
                  {/* Purpose Card */}
                  <div className="md:col-span-2 p-5 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-2 relative group shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-indigo-600" />
                        <span>Core Agreement Purpose</span>
                      </span>
                      <button
                        onClick={() => copyToClipboard(summaryData.purpose, 'purpose')}
                        className="text-slate-500 hover:text-slate-800 transition-colors text-[11px] flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-300 font-medium"
                      >
                        {copiedSection === 'purpose' ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSection === 'purpose' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">{summaryData.purpose}</p>
                  </div>

                  {/* Key Terms */}
                  <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                    <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Key Commercial Terms</span>
                    </span>
                    <ul className="space-y-2">
                      {summaryData.keyTerms?.map((term, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2 font-normal">
                          <span className="text-indigo-600 font-bold">•</span>
                          <span>{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Obligations */}
                  <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                    <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Key Contractual Obligations</span>
                    </span>
                    <ul className="space-y-2">
                      {summaryData.obligations?.map((ob, i) => (
                        <li key={i} className="text-xs text-slate-700 flex items-start gap-2 font-normal">
                          <span className="text-indigo-600 font-bold">•</span>
                          <span>{ob}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Penalties & Default Remedies */}
                  <div className="md:col-span-2 p-4 sm:p-5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
                    <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-700" />
                      <span>Penalties, Late Fees & Default Remedies</span>
                    </span>
                    <ul className="grid sm:grid-cols-2 gap-2.5">
                      {summaryData.penalties?.map((pen, i) => (
                        <li key={i} className="p-3 rounded-lg bg-white border border-amber-200 text-xs text-slate-800 flex items-start gap-2 font-normal shadow-2xs">
                          <span className="text-amber-700 font-bold shrink-0">⚠️</span>
                          <span>{pen}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              ) : (
                <div className="text-center text-xs text-slate-500 py-8">
                  No summary available for this contract.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RISK DETECTION */}
          {activeTab === 'risk' && (
            <div className="space-y-6 animate-fadeIn">
              {isRiskLoading ? (
                /* Clean Centered Loading State for Risk */
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-900">Evaluating risks...</h4>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Evaluating liability exposure, indemnification, and risk triggers...
                    </p>
                  </div>
                </div>
              ) : riskError ? (
                /* Error State */
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-slate-900 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Something went wrong</span>
                  </div>
                  <p className="text-xs text-rose-900 font-normal leading-relaxed">{riskError}</p>
                  <button
                    onClick={fetchRiskAnalysis}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
                  >
                    Retry Risk Analysis
                  </button>
                </div>
              ) : riskData ? (
                <div className="space-y-6">
                  
                  {/* Risk Score Meter Card */}
                  <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-xs font-medium text-slate-600">Evaluated Contract Risk Assessment</span>
                      <div className="flex items-center justify-center sm:justify-start gap-3 mt-1">
                        <span className={`text-2xl font-bold ${
                          riskData.riskLevel === 'High' ? 'text-rose-700' : riskData.riskLevel === 'Medium' ? 'text-amber-700' : 'text-indigo-700'
                        }`}>
                          {riskData.riskLevel} Risk
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white text-slate-800 border border-slate-300 font-mono">
                          Score: {riskData.riskScore || 65}/100
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 max-w-md leading-relaxed font-normal">
                        Evaluated against liability caps, termination notice, auto-renewal locks, and indemnification exposure.
                      </p>
                    </div>

                    {/* Progress Circle Gauge Visual */}
                    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="38" stroke="currentColor" strokeWidth="8" className="text-slate-200" fill="transparent" />
                        <circle
                          cx="48"
                          cy="48"
                          r="38"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeDasharray={238}
                          strokeDashoffset={238 - (238 * (riskData.riskScore || 65)) / 100}
                          className={`${
                            riskData.riskLevel === 'High' ? 'text-rose-600' : riskData.riskLevel === 'Medium' ? 'text-amber-500' : 'text-indigo-600'
                          } transition-all duration-700`}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-sm font-bold text-slate-900 font-mono block">
                          {riskData.riskScore || 65}%
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-medium">Exposure</span>
                      </div>
                    </div>
                  </div>

                  {/* Detected Reasons */}
                  {riskData.reasons && riskData.reasons.length > 0 && (
                    <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-3">
                      <h4 className="text-xs font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        <span>Key Risk Triggers Detected ({riskData.reasons.length})</span>
                      </h4>
                      <ul className="space-y-2">
                        {riskData.reasons.map((reason, rIdx) => (
                          <li key={rIdx} className="text-xs text-slate-800 flex items-start gap-2 font-normal">
                            <span className="text-rose-600 font-bold shrink-0">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Flagged Clauses Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                      Flagged Clause Exceptions & Detailed Analysis ({riskData.flaggedClauses?.length || 0})
                    </h4>

                    <div className="space-y-3">
                      {riskData.flaggedClauses?.map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-xl border space-y-2 transition-all ${
                            item.risk === 'High'
                              ? 'bg-rose-50/50 border-rose-200'
                              : item.risk === 'Medium'
                              ? 'bg-amber-50/50 border-amber-200'
                              : 'bg-teal-50/50 border-teal-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-900">{item.title || item.type}</span>
                              {item.page && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium bg-white text-slate-700 rounded border border-slate-200">
                                  Page {item.page}
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                              (item.risk || item.severity) === 'High'
                                ? 'bg-rose-100 text-rose-800'
                                : (item.risk || item.severity) === 'Medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}>
                              {item.risk || item.severity} Risk
                            </span>
                          </div>

                          <p className="text-xs text-slate-800 font-mono italic bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                            "{item.text}"
                          </p>

                          <p className="text-xs text-slate-800 flex items-center gap-1.5 pt-1 font-normal">
                            <span className="text-teal-700 font-semibold shrink-0">Advisory:</span>
                            <span>{item.reason}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center text-xs text-slate-500 py-8">
                  No risk profile evaluated yet.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RAG CHAT */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[55vh] animate-fadeIn space-y-3">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* AI Avatar */}
                    {msg.sender === 'ai' && (
                      <div className="w-8 h-8 rounded-lg bg-teal-500 text-white shrink-0 shadow-xs flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] p-4 rounded-xl text-xs leading-relaxed shadow-xs ${
                        msg.sender === 'user'
                          ? 'bg-teal-500 text-white font-medium rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none font-normal'
                      }`}
                    >
                      <div className={`whitespace-pre-wrap ${msg.sender === 'user' ? 'text-white' : 'text-slate-900'}`}>{msg.text}</div>

                      {/* Grounded Sources Used Section */}
                      {msg.sender === 'ai' && msg.id !== 'welcome' && (
                        <SourcesList
                          sources={msg.sources}
                          onViewInDocument={(src) => setViewSourceModal(src)}
                        />
                      )}
                    </div>

                    {/* User Avatar */}
                    {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Animated Typing Indicator */}
                {isChatLoading && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 w-fit shadow-xs">
                    <div className="w-6 h-6 rounded bg-teal-50 border border-teal-200 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 typing-dot-1"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 typing-dot-2"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 typing-dot-3"></span>
                    </div>
                    <span className="text-slate-600 font-medium text-xs pl-1">Analyzing document & querying vector chunks...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendChat} className="pt-3 flex items-center gap-2 border-t border-slate-200">
                <input
                  type="text"
                  id="modal-chat-input"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask a question about this contract (e.g. notice period, liability cap, SLAs)..."
                  className="flex-1 px-3.5 py-2 rounded-lg text-xs focus:outline-none bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  id="modal-chat-send-btn"
                  disabled={isChatLoading || !inputQuery.trim()}
                  className="px-4 py-2 rounded-lg bg-teal-400 hover:bg-teal-500 text-white text-xs font-medium shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0 transition-colors"
                >
                  <span>Ask</span>
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

      {/* View in Document Excerpt Viewer Modal */}
      {viewSourceModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-xl p-6 border border-slate-200 shadow-xl space-y-4 text-slate-800 relative">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-600" />
                <h4 className="font-semibold text-slate-900 text-sm">Document Excerpt Viewer</h4>
              </div>
              <button
                onClick={() => setViewSourceModal(null)}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span><strong>Document:</strong> {viewSourceModal.filename || document?.fileName || 'Contract.pdf'}</span>
              <span><strong>Page:</strong> {viewSourceModal.page || 1}</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Indexed Vector Excerpt Text:</span>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono leading-relaxed text-slate-800 max-h-60 overflow-y-auto whitespace-pre-wrap">
                {viewSourceModal.text || viewSourceModal.fullText || viewSourceModal.snippet}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-700 pt-2 border-t border-slate-200">
              <span className="flex items-center gap-1 font-medium">
                <CheckCircle className="w-4 h-4 text-teal-700" />
                <span>Vector Match: {viewSourceModal.similarity ? `${Math.round(viewSourceModal.similarity * 100)}%` : `${viewSourceModal.relevanceScore || 85}%`}</span>
              </span>

              <button
                onClick={() => setViewSourceModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

