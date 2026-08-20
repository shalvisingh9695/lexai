import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  AlertTriangle,
  X,
  Sparkles,
  Layers,
  Zap,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Scale,
  MessageSquareText,
  FileSearch,
  Calendar,
  CheckSquare,
  Square
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import AnalysisModal from '../components/AnalysisModal';
import CompareModal from '../components/CompareModal';
import { motion } from 'motion/react';

export default function Dashboard({ setActivePage, onOpenRagChat }) {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    highRiskDocuments: 0,
    mediumRiskDocuments: 0,
    lowRiskDocuments: 0,
    complianceScore: 92
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('All');
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Analysis Modal state with target initial tab ('summary' | 'risk' | 'chat')
  const [analysisDoc, setAnalysisDoc] = useState(null);
  const [analysisInitialTab, setAnalysisInitialTab] = useState('summary');

  // Document Comparison state
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [compareInitialA, setCompareInitialA] = useState(null);
  const [compareInitialB, setCompareInitialB] = useState(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        fetch('/api/documents'),
        fetch('/api/documents/stats')
      ]);

      const docsData = await docsRes.json();
      const statsData = await statsRes.json();

      if (docsData.success) {
        setDocuments(docsData.data || []);
      }
      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.warn('Dashboard fetch fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDelete = async (e, docId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this document from LexAI?')) return;

    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d._id !== docId && d.id !== docId));
      setSelectedForCompare(prev => prev.filter(id => id !== docId));
      if (selectedDoc && (selectedDoc._id === docId || selectedDoc.id === docId)) {
        setSelectedDoc(null);
      }
      if (analysisDoc && (analysisDoc._id === docId || analysisDoc.id === docId)) {
        setAnalysisDoc(null);
      }
    } catch (err) {
      setDocuments(prev => prev.filter(d => d._id !== docId && d.id !== docId));
    }
  };

  const toggleSelectForCompare = (doc) => {
    const docId = doc._id || doc.id;
    setSelectedForCompare(prev => {
      if (prev.includes(docId)) {
        return prev.filter(id => id !== docId);
      } else {
        if (prev.length >= 2) {
          // Replace second selection
          return [prev[0], docId];
        }
        return [...prev, docId];
      }
    });
  };

  const openComparisonModal = (docA = null, docB = null) => {
    if (docA && docB) {
      setCompareInitialA(docA);
      setCompareInitialB(docB);
    } else if (selectedForCompare.length === 2) {
      const first = documents.find(d => (d._id || d.id) === selectedForCompare[0]);
      const second = documents.find(d => (d._id || d.id) === selectedForCompare[1]);
      setCompareInitialA(first || null);
      setCompareInitialB(second || null);
    } else if (selectedForCompare.length === 1) {
      const first = documents.find(d => (d._id || d.id) === selectedForCompare[0]);
      setCompareInitialA(first || null);
      setCompareInitialB(null);
    } else {
      setCompareInitialA(documents[0] || null);
      setCompareInitialB(documents[1] || null);
    }
    setIsCompareOpen(true);
  };

  const openAnalysisTab = (doc, tab = 'summary') => {
    setAnalysisDoc(doc);
    setAnalysisInitialTab(tab);
  };

  // Live Risk Metrics
  const totalDocsCount = documents.length;
  const highRiskCount = documents.filter(d => d.riskLevel === 'High').length;
  const mediumRiskCount = documents.filter(d => d.riskLevel === 'Medium').length;
  const lowRiskCount = documents.filter(d => d.riskLevel === 'Low').length;

  const highPct = totalDocsCount ? Math.round((highRiskCount / totalDocsCount) * 100) : 0;
  const mediumPct = totalDocsCount ? Math.round((mediumRiskCount / totalDocsCount) * 100) : 0;
  const lowPct = totalDocsCount ? Math.round((lowRiskCount / totalDocsCount) * 100) : 0;

  // Filtered documents list
  const filteredDocs = documents.filter(doc => {
    const matchesSearch =
      (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.summary || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk = filterRisk === 'All' || doc.riskLevel === filterRisk;

    return matchesSearch && matchesRisk;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Aug 11, 2026';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Aug 11, 2026';
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fadeIn">
      
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-500" />
            <span>AI Legal Repository & Contract Workspace</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Legal Document Dashboard
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 font-normal">
            Real-time vault showing indexed legal contracts, risk scores, clause analytics, and AI comparison
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Compare Documents Header Action Button */}
          <button
            id="dash-compare-btn"
            onClick={() => openComparisonModal()}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-2 transition-all shadow-xs active:scale-95"
            title="Compare 2 documents side-by-side"
          >
            <Scale className="w-4 h-4 text-teal-400" />
            <span>Compare Documents {selectedForCompare.length > 0 ? `(${selectedForCompare.length})` : ''}</span>
          </button>

          <button
            id="refresh-docs-btn"
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-white text-slate-700 hover:text-slate-900 hover:border-teal-300 transition-all border border-slate-200 active:scale-95 shadow-xs"
            title="Refresh Vault Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-500' : 'text-slate-600'}`} />
          </button>

          <button
            id="dash-upload-new-btn"
            onClick={() => setActivePage('upload')}
            className="px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-500 text-white text-xs font-medium shadow-xs flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Contract</span>
          </button>
        </div>
      </div>

      {/* Part 1 Requirement 3: Risk Overview Section (High, Medium, Low Risk counts) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard id="stat-total-card" hoverEffect={true} className="border-slate-200 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Documents</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3 font-mono">{totalDocsCount}</p>
          <p className="text-[11px] text-teal-700 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-teal-600" />
            <span>Indexed in Vector Vault</span>
          </p>
        </GlassCard>

        <GlassCard id="stat-high-risk-card" hoverEffect={true} className="border-slate-200 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">High Risk Count</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-rose-600 mt-3 font-mono">{highRiskCount}</p>
          <p className="text-[11px] text-rose-700 font-medium mt-1 flex items-center gap-1">
            <span>Requires Immediate Review</span>
          </p>
        </GlassCard>

        <GlassCard id="stat-medium-risk-card" hoverEffect={true} className="border-slate-200 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Medium Risk Count</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-700 mt-3 font-mono">{mediumRiskCount}</p>
          <p className="text-[11px] text-amber-800 font-medium mt-1">Monitored Clauses</p>
        </GlassCard>

        <GlassCard id="stat-low-risk-card" hoverEffect={true} className="border-slate-200 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Low Risk Count</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-teal-700 mt-3 font-mono">{lowRiskCount}</p>
          <p className="text-[11px] text-teal-700 font-medium mt-1">Standard Market Terms</p>
        </GlassCard>
      </div>

      {/* Portfolio Risk Distribution Breakdown Bar */}
      <GlassCard id="risk-distribution-panel" hoverEffect={false} className="p-5 border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-600" />
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">Risk Distribution & Compliance Index</h3>
          </div>
          <span className="text-xs text-slate-600 font-mono">
            Overall Portfolio Health: <span className="text-teal-700 font-bold">{stats.complianceScore || 92}%</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-3 rounded-full bg-slate-100 p-0.5 flex overflow-hidden border border-slate-200">
            {totalDocsCount > 0 ? (
              <>
                <div
                  style={{ width: `${highPct}%` }}
                  className="h-full bg-rose-500 rounded-l-full transition-all duration-700"
                  title={`High Risk: ${highPct}% (${highRiskCount} docs)`}
                />
                <div
                  style={{ width: `${mediumPct}%` }}
                  className="h-full bg-amber-400 transition-all duration-700"
                  title={`Medium Risk: ${mediumPct}% (${mediumRiskCount} docs)`}
                />
                <div
                  style={{ width: `${lowPct}%` }}
                  className="h-full bg-teal-400 rounded-r-full transition-all duration-700"
                  title={`Low Risk: ${lowPct}% (${lowRiskCount} docs)`}
                />
              </>
            ) : (
              <div className="w-full h-full bg-slate-200 rounded-full" />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-700 pt-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="font-medium text-slate-700">High Risk:</span>
                <span className="font-semibold text-rose-700">{highPct}% ({highRiskCount})</span>
              </span>

              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="font-medium text-slate-700">Medium Risk:</span>
                <span className="font-semibold text-amber-800">{mediumPct}% ({mediumRiskCount})</span>
              </span>

              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
                <span className="font-medium text-slate-700">Low Risk:</span>
                <span className="font-semibold text-teal-800">{lowPct}% ({lowRiskCount})</span>
              </span>
            </div>

            <span className="text-[11px] text-slate-500 italic">
              {totalDocsCount} Contracts Managed
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Search, Filter & Comparison Selection Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-teal-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="dash-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filenames, risk levels, clauses..."
            className="w-full glass-input pl-9 pr-8 py-2 rounded-xl text-xs focus:outline-none bg-white border-slate-300 text-slate-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Risk Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-600 mr-1 flex items-center gap-1 shrink-0 font-semibold">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>Filter Risk:</span>
          </span>
          {[
            { label: 'All', count: totalDocsCount },
            { label: 'High', count: highRiskCount },
            { label: 'Medium', count: mediumRiskCount },
            { label: 'Low', count: lowRiskCount }
          ].map(({ label, count }) => (
            <button
              key={label}
              id={`filter-risk-${label.toLowerCase()}`}
              onClick={() => setFilterRisk(label)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                filterRisk === label
                  ? 'bg-teal-400 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filterRisk === label ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* Part 1 Requirement 1 & 2: Document Grid Cards with filename, risk score, risk level, number of clauses, last analyzed date & 4 actions */}
      {isLoading ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-600">Loading document vault...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        
        <GlassCard id="empty-docs-card" hoverEffect={false} className="py-16 px-6 text-center space-y-5 border-emerald-200/80 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100/80 border border-emerald-300/80 flex items-center justify-center mx-auto text-emerald-700 shadow-xs">
            <Layers className="w-8 h-8 text-emerald-600" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">No Documents Found</h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {searchQuery || filterRisk !== 'All'
                ? 'No legal documents match your search or filter options.'
                : 'Your LexAI document repository is empty. Upload your first contract to generate instant summaries, risk analysis, and clause comparisons.'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            {searchQuery || filterRisk !== 'All' ? (
              <button
                onClick={() => { setSearchQuery(''); setFilterRisk('All'); }}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 transition-all border border-slate-300 shadow-xs"
              >
                Clear Search & Filters
              </button>
            ) : (
              <button
                id="empty-upload-btn"
                onClick={() => setActivePage('upload')}
                className="px-6 py-3 rounded-xl btn-mint-glow text-emerald-950 text-xs font-extrabold shadow-xl inline-flex items-center gap-2 hover:opacity-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Upload First Contract</span>
                <ArrowRight className="w-4 h-4 text-emerald-950" />
              </button>
            )}
          </div>
        </GlassCard>

      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => {
            const docId = doc._id || doc.id;
            const isSelectedForCompare = selectedForCompare.includes(docId);
            
            const riskScore = doc.riskScore || (
              doc.riskLevel === 'High' ? 82 : doc.riskLevel === 'Medium' ? 52 : 22
            );

            const clausesCount = doc.clausesCount || (Array.isArray(doc.clauses) ? doc.clauses.length : 6);
            const fileName = doc.fileName || `${doc.title || 'Contract'}.pdf`;
            const lastAnalyzed = formatDate(doc.lastAnalyzedAt || doc.updatedAt || doc.createdAt);

            const badgeColor =
              doc.riskLevel === 'High'
                ? 'red'
                : doc.riskLevel === 'Medium'
                ? 'orange'
                : 'green';

            return (
              <motion.div
                key={docId}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <GlassCard
                  id={`doc-card-${docId}`}
                  title={doc.title}
                  subtitle={doc.category || 'General Legal'}
                  icon={FileText}
                  badge={`${doc.riskLevel} Risk`}
                  badgeColor={badgeColor}
                  className={`flex flex-col justify-between border-slate-200 hover:border-teal-300 h-full relative transition-all ${
                    isSelectedForCompare ? 'ring-2 ring-teal-400 bg-teal-50/20' : ''
                  }`}
                >
                  {/* Select for Compare Checkbox Pill */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={() => toggleSelectForCompare(doc)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                        isSelectedForCompare
                          ? 'bg-teal-500 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title="Select document for comparison"
                    >
                      {isSelectedForCompare ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      <span>{isSelectedForCompare ? 'Selected for Compare' : 'Select to Compare'}</span>
                    </button>

                    <button
                      id={`delete-doc-btn-${docId}`}
                      onClick={(e) => handleDelete(e, docId)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-all"
                      title="Delete Document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Document Card Body */}
                  <div className="space-y-3 pt-3">
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                      {doc.summary || 'Uploaded legal document ready for summary and risk inspection.'}
                    </p>

                    {/* Part 1 Requirement 1: Document Metadata List (filename, risk score, risk level, clauses, last analyzed date) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-mono">
                      
                      {/* Filename */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Filename:</span>
                        <span className="font-semibold text-slate-900 truncate max-w-[170px]" title={fileName}>
                          {fileName}
                        </span>
                      </div>

                      {/* Risk Score */}
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[11px]">Risk Score:</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${
                            doc.riskLevel === 'High' ? 'text-rose-600' : doc.riskLevel === 'Medium' ? 'text-amber-700' : 'text-teal-700'
                          }`}>
                            {riskScore}/100
                          </span>
                        </div>
                      </div>

                      {/* Clauses & Last Analyzed Date */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <FileSearch className="w-3 h-3 text-teal-600" />
                          <span>{clausesCount} Clauses</span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{lastAnalyzed}</span>
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* Part 1 Requirement 2: Explicit Actions: Analyze, View Summary, View Risk, Ask LexAI */}
                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                    
                    {/* Primary Analyze Action Button */}
                    <button
                      id={`analyze-doc-btn-${docId}`}
                      onClick={() => openAnalysisTab(doc, 'summary')}
                      className="w-full py-2 px-3 rounded-xl bg-teal-400 hover:bg-teal-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5 text-white" />
                      <span>Analyze Document</span>
                    </button>

                    {/* Secondary Action Grid: View Summary, View Risk, Ask LexAI */}
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      <button
                        id={`view-summary-btn-${docId}`}
                        onClick={() => openAnalysisTab(doc, 'summary')}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-medium border border-slate-200 flex items-center justify-center gap-1 transition-all shadow-xs"
                        title="View Document Summary"
                      >
                        <FileText className="w-3 h-3 text-teal-600" />
                        <span>Summary</span>
                      </button>

                      <button
                        id={`view-risk-btn-${docId}`}
                        onClick={() => openAnalysisTab(doc, 'risk')}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-medium border border-slate-200 flex items-center justify-center gap-1 transition-all shadow-xs"
                        title="View Document Risk Analysis"
                      >
                        <ShieldAlert className="w-3 h-3 text-rose-600" />
                        <span>Risk</span>
                      </button>

                      <button
                        id={`ask-lexai-btn-${docId}`}
                        onClick={() => {
                          if (onOpenRagChat) {
                            onOpenRagChat(doc);
                          } else {
                            openAnalysisTab(doc, 'chat');
                          }
                        }}
                        className="py-1.5 px-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-medium border border-teal-200 flex items-center justify-center gap-1 transition-all shadow-xs"
                        title="Ask LexAI Q&A Assistant"
                      >
                        <MessageSquareText className="w-3 h-3 text-teal-600" />
                        <span>Ask AI</span>
                      </button>
                    </div>

                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Analysis Modal (Summary, Risk, Ask LexAI) */}
      <AnalysisModal
        isOpen={!!analysisDoc}
        onClose={() => setAnalysisDoc(null)}
        document={analysisDoc}
        initialTab={analysisInitialTab}
      />

      {/* Part 2: Document Comparison Modal */}
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        documents={documents}
        initialDocA={compareInitialA}
        initialDocB={compareInitialB}
        onAnalyzeDoc={(doc) => openAnalysisTab(doc, 'summary')}
      />

    </div>
  );
}
