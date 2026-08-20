import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Zap,
  FolderPlus,
  Bot
} from 'lucide-react';
import GlassCard from '../components/GlassCard';

export default function UploadPage({ setActivePage, onOpenRagChat }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawFile, setRawFile] = useState(null);
  const [docTitle, setDocTitle] = useState('');
  const [category, setCategory] = useState('Vendor Contracts');
  const [riskLevel, setRiskLevel] = useState('Medium');
  const [customSummary, setCustomSummary] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Sample quick presets for easy testing
  const samplePresets = [
    {
      title: 'Commercial Lease Agreement - Suite 200',
      fileName: 'commercial_lease_suite200.pdf',
      fileSize: '3.1 MB',
      category: 'Lease & Real Estate',
      riskLevel: 'Medium',
      summary: '3-year lease agreement with automatic annual escalation of 4% and maintenance liability assigned to tenant.',
      clauses: [
        { title: 'Rent Escalation', risk: 'Medium', text: '4% annual rent increase applied every January 1st.' },
        { title: 'Maintenance Liability', risk: 'High', text: 'Tenant responsible for HVAC repairs exceeding $2,500.' }
      ]
    },
    {
      title: 'Mutual Non-Disclosure Agreement (MNDA)',
      fileName: 'mnda_tech_partner.docx',
      fileSize: '480 KB',
      category: 'NDAs & Confidentiality',
      riskLevel: 'Low',
      summary: 'Standard two-way NDA restricting trade secret disclosure for 24 months with customary exclusions.',
      clauses: [
        { title: 'Confidential Term', risk: 'Low', text: '24 months duration from execution date.' },
        { title: 'Exclusions', risk: 'Low', text: 'Standard public domain and court subpoena exceptions apply.' }
      ]
    },
    {
      title: 'Executive Employment Contract',
      fileName: 'vp_engineering_offer.pdf',
      fileSize: '1.9 MB',
      category: 'Employment Agreements',
      riskLevel: 'High',
      summary: 'Employment contract including 12-month global non-compete clause and clawback terms on vested equity.',
      clauses: [
        { title: 'Non-Compete Scope', risk: 'High', text: 'Restricts working with direct competitors globally for 12 months.' },
        { title: 'Equity Clawback', risk: 'High', text: 'Company reserves right to clawback equity if unvested at departure.' }
      ]
    }
  ];

  const handleSelectPreset = (preset) => {
    setSelectedFile({
      name: preset.fileName,
      size: preset.fileSize,
      type: preset.fileName.endsWith('.pdf') ? 'application/pdf' : 'application/docx'
    });
    setDocTitle(preset.title);
    setCategory(preset.category);
    setRiskLevel(preset.riskLevel);
    setCustomSummary(preset.summary);
    setErrorMsg('');
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type || 'application/pdf'
      });
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMsg('Invalid file format. Only PDF files are allowed.');
        return;
      }
      setErrorMsg('');
      setRawFile(file);
      setSelectedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.type || 'application/pdf'
      });
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!docTitle.trim() && !selectedFile && !rawFile) {
      setErrorMsg('Please select a file or enter a document title.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setUploadSuccess(null);

    try {
      let res, data;
      if (rawFile) {
        const formData = new FormData();
        formData.append('file', rawFile);
        formData.append('title', docTitle || rawFile.name);
        formData.append('category', category);
        formData.append('riskLevel', riskLevel);
        if (customSummary) formData.append('summary', customSummary);

        res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        });
        data = await res.json();
      } else {
        const payload = {
          title: docTitle || selectedFile?.name || 'Uploaded Document',
          fileName: selectedFile?.name || 'document_upload.pdf',
          fileType: selectedFile?.type || 'application/pdf',
          fileSize: selectedFile?.size || '1.5 MB',
          category: category,
          riskLevel: riskLevel,
          summary: customSummary || `Document "${docTitle || selectedFile?.name}" successfully indexed and processed by LexAI legal engine.`,
          clauses: [
            { title: 'General Compliance', risk: 'Low', text: 'Document adheres to standard legal language and formatting.' },
            { title: 'Notice & Cure Period', risk: riskLevel === 'High' ? 'High' : 'Medium', text: '14-day notice requirement for contractual dispute resolution.' }
          ]
        };

        res = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        data = await res.json();
      }

      if (data.success) {
        setUploadSuccess(data.data);
      } else {
        setErrorMsg(data.error || 'Upload failed, please try again.');
      }
    } catch (err) {
      setErrorMsg('Network error: Unable to connect to server.');
    } finally {
      setIsUploading(false);
    }
  };

  // Demo Document text & clauses
  const handleTryDemoDocument = async () => {
    setIsUploading(true);
    setErrorMsg('');
    setUploadSuccess(null);

    const demoPayload = {
      title: 'Commercial Lease & Operations Agreement (Demo)',
      fileName: 'demo_commercial_lease.pdf',
      fileType: 'application/pdf',
      fileSize: '2.4 MB',
      category: 'Lease & Real Estate',
      riskLevel: 'High',
      summary: 'Master Commercial Lease Agreement outlining $12,500 monthly base rent, 5% late payment penalty fees, tenant structural & HVAC maintenance obligations, and 30-day notice or immediate termination clause upon default.',
      clauses: [
        { title: 'Rent Clause', risk: 'Medium', text: 'Base rent of $12,500 due on the 1st of each calendar month with 3% annual escalation.' },
        { title: 'Penalty Clause', risk: 'High', text: 'Late payments incur a 5% monthly penalty fee plus a $250 administrative charge.' },
        { title: 'Obligations Clause', risk: 'High', text: 'Tenant is obligated to maintain full property insurance and bear full financial responsibility for HVAC and electrical repairs.' },
        { title: 'Termination Clause', risk: 'High', text: '30 days written notice required for termination. Landlord reserves right to immediate termination without notice upon tenant default.' }
      ]
    };

    // Pre-fill form fields
    setSelectedFile({
      name: demoPayload.fileName,
      size: demoPayload.fileSize,
      type: demoPayload.fileType
    });
    setDocTitle(demoPayload.title);
    setCategory(demoPayload.category);
    setRiskLevel(demoPayload.riskLevel);
    setCustomSummary(demoPayload.summary);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoPayload)
      });
      const data = await res.json();
      if (data.success) {
        setUploadSuccess(data.data);
      } else {
        setErrorMsg('Upload failed, please try again.');
      }
    } catch (err) {
      // Fallback success for demo
      setUploadSuccess({
        title: demoPayload.title,
        fileName: demoPayload.fileName,
        category: demoPayload.category,
        riskLevel: demoPayload.riskLevel,
        summary: demoPayload.summary,
        clauses: demoPayload.clauses
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fadeIn">
      
      {/* Page Title & Demo CTA */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Upload Legal Document
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto font-normal">
          Select or drag-and-drop a legal contract, agreement, or lease for instant AI risk analysis
        </p>

        {/* Try Demo Document Button */}
        <div className="pt-2">
          <button
            id="try-demo-doc-btn"
            type="button"
            onClick={handleTryDemoDocument}
            disabled={isUploading}
            className="px-6 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-500 text-white text-xs sm:text-sm font-medium shadow-xs inline-flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Try Demo Document</span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">Instant Demo</span>
          </button>
        </div>
      </div>

      {/* Quick Load Sample Buttons */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Quick-Load Sample Documents for Testing
        </label>
        <div className="grid sm:grid-cols-3 gap-3">
          {samplePresets.map((preset, idx) => (
            <button
              key={idx}
              id={`preset-btn-${idx}`}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 text-left transition-all hover:bg-slate-50/80 group active:scale-98 shadow-xs"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-teal-700">
                <FileText className="w-3.5 h-3.5 text-teal-600" />
                <span className="truncate">{preset.category}</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 mt-1 truncate">{preset.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{preset.fileSize}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Upload Form Card */}
      <GlassCard
        id="upload-form-card"
        title="Document Upload Portal"
        subtitle="Supports PDF, DOCX, and TXT files up to 50MB"
        icon={Upload}
        badge="Secure SSL"
        badgeColor="mint"
        className="border-slate-200"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-teal-300 bg-slate-50/50 transition-all cursor-pointer relative"
          >
            <input
              type="file"
              id="file-input"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 shadow-xs">
                <FolderPlus className="w-6 h-6 text-teal-600" />
              </div>

              <div>
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                    <p className="text-xs text-teal-600 font-medium font-mono">{selectedFile.size}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-800">
                      Drag & Drop legal file here, or <span className="text-teal-600 underline font-semibold">browse computer</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">PDF, DOCX, or TXT formats supported</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Document Title
              </label>
              <input
                type="text"
                id="doc-title-input"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g., Master Services Agreement 2026"
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs focus:outline-none bg-white border-slate-300 text-slate-900"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contract Category
              </label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs focus:outline-none bg-white border border-slate-300 text-slate-900"
              >
                <option value="Vendor Contracts">Vendor Contracts</option>
                <option value="Lease & Real Estate">Lease & Real Estate</option>
                <option value="NDAs & Confidentiality">NDAs & Confidentiality</option>
                <option value="Employment Agreements">Employment Agreements</option>
                <option value="Licensing & IP">Licensing & IP</option>
                <option value="Corporate Governance">Corporate Governance</option>
              </select>
            </div>

            {/* Risk Sensitivity Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Initial Risk Rating
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Low', 'Medium', 'High'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setRiskLevel(lvl)}
                    className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                      riskLevel === lvl
                        ? lvl === 'High'
                          ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-xs'
                          : lvl === 'Medium'
                          ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-xs'
                          : 'bg-teal-50 text-teal-800 border-teal-200 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Key Notes / Instructions (Optional)
              </label>
              <input
                type="text"
                id="doc-summary-input"
                value={customSummary}
                onChange={(e) => setCustomSummary(e.target.value)}
                placeholder="e.g., Focus analysis on indemnification limits"
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs focus:outline-none bg-white border-slate-300 text-slate-900"
              />
            </div>

          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2.5 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-all shadow-xs shrink-0"
              >
                Retry Upload
              </button>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => {
                setSelectedFile(null);
                setRawFile(null);
                setDocTitle('');
                setCustomSummary('');
                setErrorMsg('');
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 transition-all disabled:opacity-50"
            >
              Reset Form
            </button>

            <button
              id="upload-submit-btn"
              type="submit"
              disabled={isUploading}
              className="px-6 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-500 text-white text-xs font-medium shadow-xs flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Analyzing document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Process Document</span>
                </>
              )}
            </button>
          </div>

        </form>
      </GlassCard>

      {/* Upload Success Card */}
      {uploadSuccess && (
        <GlassCard
          id="upload-success-modal"
          title="Document Successfully Uploaded!"
          subtitle="LexAI legal analysis engine has generated standard breakdown"
          icon={CheckCircle2}
          badge="Processed"
          badgeColor="teal"
          className="border-teal-200 shadow-lg animate-fadeIn bg-teal-50/40"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white border border-teal-200 space-y-2">
              <p className="text-sm font-bold text-slate-900">{uploadSuccess.title}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded bg-teal-50 text-teal-800 font-medium border border-teal-200">
                  Category: {uploadSuccess.category}
                </span>
                <span className="px-2.5 py-0.5 rounded bg-teal-50 text-teal-800 font-medium border border-teal-200">
                  Risk Level: {uploadSuccess.riskLevel}
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-2 font-normal leading-relaxed">{uploadSuccess.summary}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                id="upload-analyze-btn"
                onClick={() => {
                  setActivePage('dashboard');
                }}
                className="px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-500 text-white text-xs font-medium shadow-xs flex items-center gap-2 transition-all"
              >
                <Zap className="w-4 h-4 text-white" />
                <span>Analyze Contract</span>
              </button>

              {onOpenRagChat && (
                <button
                  id="upload-rag-chat-btn"
                  onClick={() => onOpenRagChat(uploadSuccess)}
                  className="px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-medium flex items-center gap-2 transition-all"
                >
                  <Bot className="w-4 h-4 text-teal-600" />
                  <span>Ask RAG AI Questions</span>
                </button>
              )}

              <button
                id="view-in-dashboard-btn"
                onClick={() => setActivePage('dashboard')}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium flex items-center gap-2 transition-all border border-slate-300 shadow-xs"
              >
                <span>View in Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-700" />
              </button>
            </div>
          </div>
        </GlassCard>
      )}

    </div>
  );
}

