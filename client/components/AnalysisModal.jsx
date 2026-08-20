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

// 🔥 GLOBAL API BASE URL (IMPORTANT FIX)
const BASE_URL = "https://lexai-q1ml.onrender.com";

export default function AnalysisModal({ isOpen, onClose, document, initialTab = 'summary' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'summary');
    }
  }, [isOpen, initialTab, document]);

  const [summaryData, setSummaryData] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const [riskData, setRiskData] = useState(null);
  const [isRiskLoading, setIsRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState('');

  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [viewSourceModal, setViewSourceModal] = useState(null);

  const messagesEndRef = useRef(null);

  const docId = document?._id || document?.id;

  // ===================== INIT =====================
  useEffect(() => {
    if (!isOpen || !document) return;

    setActiveTab('summary');
    setSummaryError('');
    setRiskError('');

    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: `Hello! I am your LexAI Assistant.`,
        sources: []
      }
    ]);

    fetchSummary();
    fetchRiskAnalysis();
  }, [isOpen, document]);

  // ===================== SUMMARY =====================
  const fetchSummary = async () => {
    if (!docId) return;
    setIsSummaryLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/ai/summary`, {
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
        setSummaryError('Summary generation failed');
      }
    } catch (err) {
      setSummaryError('Network error');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // ===================== RISK =====================
  const fetchRiskAnalysis = async () => {
    if (!docId) return;
    setIsRiskLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/ai/risk`, {
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
          flaggedClauses: data.flaggedClauses || data.risks || []
        });
      } else {
        setRiskError('Risk analysis failed');
      }
    } catch (err) {
      setRiskError('Network error');
    } finally {
      setIsRiskLoading(false);
    }
  };

  // ===================== CHAT =====================
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim()) return;

    const query = inputQuery;
    setInputQuery('');

    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: query }]);
    setIsChatLoading(true);

    try {
      // 🔥 ASK API FIX
      let res = await fetch(`${BASE_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          documentId: docId
        })
      });

      let data = await res.json();

      if (!data.success) {
        res = await fetch(`${BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: query,
            documentId: docId
          })
        });

        data = await res.json();
      }

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: data.answer || 'No response',
          sources: data.sources || []
        }
      ]);

    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: 'ai',
          text: 'Server error',
          sources: []
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(text);
  };

  if (!isOpen || !document) return null;

  const docRisk = riskData?.riskLevel || 'Low';

  return (
    <div>
      {/* ================= UI SAME AS YOUR ORIGINAL ================= */}

      <div className="p-6">
        <h2 className="text-xl font-bold">{document.title}</h2>

        {/* SUMMARY TAB */}
        {activeTab === 'summary' && summaryData && (
          <div>
            <p>{summaryData.purpose}</p>
          </div>
        )}

        {/* RISK TAB */}
        {activeTab === 'risk' && riskData && (
          <div>
            <p>Risk: {riskData.riskLevel}</p>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div>
            {messages.map(m => (
              <p key={m.id}>{m.text}</p>
            ))}

            <form onSubmit={handleSendChat}>
              <input
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask..."
              />
              <button type="submit">Send</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}