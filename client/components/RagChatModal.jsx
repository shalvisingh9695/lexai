import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, X, FileText, User, ExternalLink, CheckCircle } from 'lucide-react';
import SourcesList from './SourceCard';

export default function RagChatModal({ isOpen, onClose, document, documents = [] }) {
  const [selectedDocId, setSelectedDocId] = useState(document?._id || document?.id || (documents[0]?._id || 'doc_1'));
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello! I am your LexAI RAG Assistant. Ask me any question about your contract clauses, notice periods, or compliance risks, and I will retrieve the exact relevant source snippets to answer accurately.`,
      sources: []
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewSource, setViewSource] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (document) {
      setSelectedDocId(document._id || document.id);
    } else if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0]._id || documents[0].id);
    }
  }, [document, documents]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputQuery.trim() || isLoading) return;

    const query = inputQuery.trim();
    setInputQuery('');

    // Add user message
    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 1. Try primary grounded RAG endpoint /api/ask
      let res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          documentId: selectedDocId
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
            documentId: selectedDocId
          })
        });
        data = await res.json();
      }

      if (data.success) {
        const aiMsg = {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: data.answer,
          sources: data.sources || []
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        setMessages(prev => [...prev, {
          id: `err_${Date.now()}`,
          sender: 'ai',
          text: `Error processing question: ${data.error || 'Server error'}`,
          sources: []
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: 'Network error communicating with LexAI RAG server.',
        sources: []
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentDoc = documents.find(d => (d._id || d.id) === selectedDocId) || document;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/30 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-white rounded-xl border border-slate-200 flex flex-col h-[85vh] overflow-hidden shadow-xl relative text-slate-900">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-base">LexAI RAG Assistant</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded border border-indigo-200 font-mono">
                  Grounded RAG Active
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Strict Grounded Q&A powered by Cosine Similarity & Gemini
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-500 transition-colors border border-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Document Selector Bar */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-600 flex items-center gap-1.5 font-semibold">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Target Contract:</span>
          </span>

          <select
            id="rag-doc-selector"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium focus:outline-none bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {documents.length > 0 ? (
              documents.map((doc) => (
                <option key={doc._id || doc.id} value={doc._id || doc.id} className="bg-white text-slate-900">
                  {doc.title} ({doc.riskLevel} Risk)
                </option>
              ))
            ) : (
              <option value="doc_1" className="bg-white text-slate-900">
                {currentDoc?.title || 'Selected Contract'}
              </option>
            )}
          </select>
        </div>

        {/* Chat Message Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* AI Avatar */}
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white shrink-0 shadow-xs flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[85%] p-4 rounded-xl text-xs leading-relaxed shadow-2xs ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white font-medium rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none font-normal'
                }`}
              >
                <div className={`whitespace-pre-wrap font-sans leading-relaxed ${msg.sender === 'user' ? 'text-white' : 'text-slate-900'}`}>{msg.text}</div>

                {/* Grounded Sources Used Section */}
                {msg.sender === 'ai' && msg.id !== 'welcome' && (
                  <SourcesList
                    sources={msg.sources}
                    onViewInDocument={(src) => setViewSource(src)}
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

          {/* Typing Bouncing Dot Indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 w-fit shadow-2xs">
              <div className="w-6 h-6 rounded bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 typing-dot-1"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 typing-dot-2"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 typing-dot-3"></span>
              </div>
              <span className="text-slate-600 font-medium text-xs pl-1">Searching vector embeddings...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Example Questions */}
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-slate-500 shrink-0 font-medium">Suggested Questions:</span>
          {[
            'What is termination clause?',
            'What is the notice period for termination?',
            'Are there annual price or rent escalations?',
            'What is the governing law jurisdiction?'
          ].map((prompt, pIdx) => (
            <button
              key={pIdx}
              onClick={() => setInputQuery(prompt)}
              className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium shrink-0 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Input Form */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            id="rag-chat-input"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask LexAI anything about this contract..."
            className="flex-1 px-3.5 py-2 rounded-lg text-xs focus:outline-none bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
          />

          <button
            type="submit"
            id="rag-send-btn"
            disabled={isLoading || !inputQuery.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors shrink-0"
          >
            <span>Ask RAG</span>
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </form>

      </div>

      {/* View in Document Excerpt Viewer Modal */}
      {viewSource && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-xl p-6 border border-slate-200 shadow-xl space-y-4 text-slate-800 relative">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h4 className="font-semibold text-slate-900 text-sm">Document Excerpt Viewer</h4>
              </div>
              <button
                onClick={() => setViewSource(null)}
                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span><strong>Document:</strong> {viewSource.filename || currentDoc?.fileName || 'Contract.pdf'}</span>
              <span><strong>Page:</strong> {viewSource.page || 1}</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Indexed Vector Excerpt Text:</span>
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono leading-relaxed text-slate-800 max-h-60 overflow-y-auto whitespace-pre-wrap">
                {viewSource.text || viewSource.fullText || viewSource.snippet}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-700 pt-2 border-t border-slate-200">
              <span className="flex items-center gap-1 font-medium">
                <CheckCircle className="w-4 h-4 text-teal-700" />
                <span>Vector Match: {viewSource.similarity ? `${Math.round(viewSource.similarity * 100)}%` : `${viewSource.relevanceScore || 85}%`}</span>
              </span>

              <button
                onClick={() => setViewSource(null)}
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


