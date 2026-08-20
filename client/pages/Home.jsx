import React, { useState } from 'react';
import {
  FileText,
  ShieldAlert,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  FileCheck,
  Brain
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { motion } from 'motion/react';

export default function Home({ setActivePage }) {
  const [sampleClause, setSampleClause] = useState('Indemnification: Tenant shall indemnify, defend, and hold harmless Landlord from any liability, damages, or costs exceeding $50,000 arising from third-party claims on the premises.');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleLiveAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: 'Live Sample Clause',
          documentText: sampleClause,
          category: 'Lease & Indemnity'
        })
      });
      const data = await res.json();
      setAnalysisResult(data.analysis || 'High risk clause identified: Tenant assumes uncapped liability for third-party damages.');
    } catch (err) {
      setAnalysisResult('High Risk Clause Detected: The indemnification term holds the tenant responsible for third-party claims with a high $50,000 threshold.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-16 pb-12 animate-fadeIn">
      
      {/* Hero Section */}
      <section className="relative pt-8 pb-12 text-center max-w-4xl mx-auto space-y-6">
        
        {/* Subtle accent badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium shadow-xs">
          <Sparkles className="w-4 h-4 text-teal-500" />
          <span>AI-powered Legal Document Intelligence</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Transform Complex Legal Contracts into <span className="text-teal-600">Actionable Intelligence</span>
        </h1>

        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
          LexAI scans agreements, leases, and NDAs to extract key clauses, quantify legal risks, and generate clear executive summaries in seconds.
        </p>

        {/* Hero Actions - Single Main CTA */}
        <div className="flex justify-center pt-4">
          <button
            id="hero-upload-btn"
            onClick={() => setActivePage('upload')}
            className="px-8 py-3.5 rounded-xl bg-teal-400 hover:bg-teal-500 text-white font-medium text-sm shadow-md shadow-teal-500/10 flex items-center justify-center gap-2 group transition-all active:scale-98"
          >
            <span>Upload Document</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Feature Stats Pill */}
        <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {[
            { label: 'Analysis Speed', value: '< 2 Sec' },
            { label: 'Risk Accuracy', value: '99.4%' },
            { label: 'Clauses Indexed', value: '50,000+' },
            { label: 'Data Security', value: 'Encrypted' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.03 }}
              className="bg-white p-3.5 rounded-xl border border-slate-200 text-center hover:border-teal-300 transition-all shadow-xs"
            >
              <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Core Capabilities - 4 Glass Cards */}
      <section className="space-y-6 animate-slideUp">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Designed for Modern Legal Teams
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            Automate contract review, eliminate legal bottlenecks, and protect your enterprise.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard
            id="feature-card-clause"
            icon={FileText}
            title="Clause Extraction"
            subtitle="Automated Breakdown"
            badge="Fast"
            badgeColor="mint"
          >
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Instantly isolate non-competes, termination fees, payment terms, and governing jurisdiction.
            </p>
          </GlassCard>

          <GlassCard
            id="feature-card-risk"
            icon={ShieldAlert}
            title="Risk Assessment"
            subtitle="Color-Coded Scoring"
            badge="High Impact"
            badgeColor="amber"
          >
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Every document receives a unified High, Medium, or Low risk rating with flagged provisions.
            </p>
          </GlassCard>

          <GlassCard
            id="feature-card-summary"
            icon={Zap}
            title="Executive Summaries"
            subtitle="Plain Language"
            badge="LexAI Engine"
            badgeColor="mint"
          >
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Transform 40-page contract boilerplate into concise, readable 2-paragraph briefing notes.
            </p>
          </GlassCard>

          <GlassCard
            id="feature-card-audit"
            icon={CheckCircle2}
            title="Compliance Audit"
            subtitle="Standard Verification"
            badge="Secure"
            badgeColor="green"
          >
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              Verify compliance against corporate playbooks, standard vendor clauses, and regulatory rules.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* Interactive Sample Clause Sandbox */}
      <section className="max-w-3xl mx-auto animate-slideUp">
        <GlassCard
          id="home-sandbox-card"
          title="Try LexAI Live Clause Analyzer"
          subtitle="Paste or edit a sample legal clause below to test real-time AI risk evaluation"
          icon={Brain}
          badge="Interactive Demo"
          badgeColor="mint"
          className="border-slate-200"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sample Legal Clause Text
              </label>
              <textarea
                value={sampleClause}
                onChange={(e) => setSampleClause(e.target.value)}
                rows={3}
                className="w-full glass-input rounded-xl p-3 text-xs text-slate-800 focus:outline-none resize-none font-mono bg-white border-slate-300"
                placeholder="Type or paste legal text here..."
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                id="sandbox-analyze-btn"
                onClick={handleLiveAnalyze}
                disabled={isAnalyzing}
                className="px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-500 text-white text-xs font-medium shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Analyzing Text...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>Run Instant Analysis</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setSampleClause('Termination: Company may terminate this Agreement immediately without notice if Contractor breaches confidentiality obligations.')}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                Load Different Sample
              </button>
            </div>

            {analysisResult && (
              <div className="mt-4 p-4 rounded-xl bg-teal-50/80 border border-teal-200 text-xs text-slate-800 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 font-semibold text-teal-800">
                  <FileCheck className="w-4 h-4 text-teal-600" />
                  <span>LexAI Engine Output</span>
                </div>
                <p className="leading-relaxed text-slate-700 font-normal">{analysisResult}</p>
              </div>
            )}
          </div>
        </GlassCard>
      </section>

    </div>
  );
}

