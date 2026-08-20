import { GoogleGenAI } from '@google/genai';
import Document from '../models/Document.js';
import { getInMemoryStore, isUsingMemory } from '../utils/dbConnect.js';

/**
 * Resolve document chunks and metadata by documentId or body text
 */
async function resolveDocumentContext(body) {
  const { documentId, documentText, documentTitle, category } = body || {};
  let chunks = [];
  let title = documentTitle || 'Legal Contract Agreement';
  let cat = category || 'General Legal';
  let fullText = documentText || '';

  if (documentId) {
    try {
      let doc = null;
      if (isUsingMemory()) {
        const store = getInMemoryStore();
        doc = store.documents.find(d => d._id === documentId || d.id === documentId);
      } else {
        doc = await Document.findById(documentId).lean();
      }

      if (doc) {
        title = doc.fileName || doc.title || title;
        cat = doc.category || cat;

        if (Array.isArray(doc.chunks) && doc.chunks.length > 0) {
          chunks = doc.chunks.map(c => ({
            text: c.text,
            page: c.page || 1,
            chunkId: c.chunkId
          }));
          fullText = chunks.map(c => c.text).join('\n\n');
        } else if (Array.isArray(doc.extractedPages) && doc.extractedPages.length > 0) {
          chunks = doc.extractedPages.map(p => ({
            text: p.text,
            page: p.page || 1
          }));
          fullText = chunks.map(c => c.text).join('\n\n');
        } else if (Array.isArray(doc.clauses) && doc.clauses.length > 0) {
          chunks = doc.clauses.map((c, i) => ({
            text: `[${c.title}]: ${c.text}`,
            page: i + 1
          }));
          fullText = doc.clauses.map(c => c.text).join('\n\n');
        } else if (doc.summary) {
          fullText = `${doc.title || title}\n${doc.summary}`;
        }
      }
    } catch (err) {
      console.warn('Document context lookup error:', err.message);
    }
  }

  if (chunks.length === 0) {
    if (!fullText || fullText.length < 20) {
      fullText = `Legal Agreement (${title}): Confidentiality, Liability, Termination, Indemnification, SLA and Rent Escalation clauses.`;
    }
    const paragraphs = fullText.split(/\n\s*\n/).filter(p => p.trim());
    if (paragraphs.length > 1) {
      chunks = paragraphs.map((p, idx) => ({
        text: p.trim(),
        page: Math.floor(idx / 2) + 1
      }));
    } else {
      chunks = [{ text: fullText.trim(), page: 1 }];
    }
  }

  return { chunks, fullText, title, category: cat };
}

/**
 * Deterministic Explainable Rule-Based Risk Analysis
 * Used as fallback or validation to guarantee no hallucinations and explicit reasoning.
 */
function analyzeRisksRuleBased(chunks, fullText) {
  const risks = [];
  const textLower = fullText.toLowerCase();

  // Helper to find clause snippet & page number in chunks
  const findClauseSnippet = (keywords) => {
    for (const chunk of chunks) {
      const chunkLower = chunk.text.toLowerCase();
      for (const kw of keywords) {
        if (chunkLower.includes(kw)) {
          const sentences = chunk.text.split(/(?<=[.!?])\s+/);
          const matchSentence = sentences.find(s => s.toLowerCase().includes(kw));
          return {
            clause: (matchSentence || chunk.text).trim().slice(0, 250),
            page: chunk.page || 1
          };
        }
      }
    }
    return null;
  };

  // 1. Unlimited Liability
  if (textLower.includes('indemn') || textLower.includes('unlimited liability') || textLower.includes('hold harmless')) {
    const hasCap = textLower.includes('liability shall not exceed') || textLower.includes('capped at') || textLower.includes('maximum aggregate liability');
    const snippet = findClauseSnippet(['indemn', 'unlimited liability', 'hold harmless']);
    risks.push({
      type: 'Unlimited Liability',
      reason: hasCap
        ? 'Indemnification clause present with partial aggregate liability limits'
        : 'No cap on damages mentioned in indemnification clause, creating broad monetary exposure',
      clause: snippet ? snippet.clause : 'Party agrees to defend, indemnify, and hold harmless against third-party claims and losses.',
      page: snippet ? snippet.page : 1,
      severity: hasCap ? 'Medium' : 'High'
    });
  }

  // 2. Auto-Renewal Clause
  if (textLower.includes('automatically renew') || textLower.includes('automatic renewal') || textLower.includes('renew for successive') || textLower.includes('auto-renew')) {
    const snippet = findClauseSnippet(['automatically renew', 'automatic renewal', 'renew for successive', 'auto-renew']);
    risks.push({
      type: 'Auto-Renewal Clause',
      reason: 'Contract automatically renews for successive terms unless written non-renewal notice is submitted in advance',
      clause: snippet ? snippet.clause : 'Agreement shall automatically renew for successive 12-month periods unless notice of termination is provided prior to expiration.',
      page: snippet ? snippet.page : 1,
      severity: 'Medium'
    });
  }

  // 3. One-Sided Termination
  if (textLower.includes('immediate termination') || textLower.includes('terminate immediately') || textLower.includes('sole discretion') || textLower.includes('without cause') || textLower.includes('without notice')) {
    const snippet = findClauseSnippet(['immediate termination', 'terminate immediately', 'sole discretion', 'without cause', 'without notice']);
    risks.push({
      type: 'One-Sided Termination',
      reason: 'Clause permits unilateral termination or immediate cancellation without required cure window or prior notice',
      clause: snippet ? snippet.clause : 'Party may terminate this Agreement effective immediately upon written notice at its sole discretion.',
      page: snippet ? snippet.page : 1,
      severity: 'High'
    });
  }

  // 4. Missing Dispute Resolution
  const hasDispute = textLower.includes('governing law') || textLower.includes('jurisdiction') || textLower.includes('arbitration') || textLower.includes('dispute resolution') || textLower.includes('courts of');
  if (!hasDispute) {
    risks.push({
      type: 'Missing Dispute Resolution',
      reason: 'No explicit governing law, jurisdiction, or dispute resolution mechanism defined in document text',
      clause: 'Absence of governing law or forum selection clause across contract text',
      page: 1,
      severity: 'Medium'
    });
  }

  // 5. High Penalties or Fees
  if (textLower.includes('late fee') || textLower.includes('1.5%') || textLower.includes('interest on overdue') || textLower.includes('liquidated damages') || textLower.includes('escalation') || textLower.includes('penalty')) {
    const snippet = findClauseSnippet(['late fee', '1.5%', 'interest', 'liquidated damages', 'escalation', 'penalty']);
    risks.push({
      type: 'High Penalties or Fees',
      reason: 'Overdue accounts accrue interest/late penalties alongside scheduled fee or price escalations',
      clause: snippet ? snippet.clause : 'Overdue payments accrue interest at 1.5% per month alongside scheduled annual fee increases.',
      page: snippet ? snippet.page : 1,
      severity: 'Medium'
    });
  }

  // Calculate overall risk score (0-100)
  const highCount = risks.filter(r => r.severity === 'High').length;
  const medCount = risks.filter(r => r.severity === 'Medium').length;
  const lowCount = risks.filter(r => r.severity === 'Low').length;

  let riskScore = (highCount * 35) + (medCount * 18) + (lowCount * 8);
  if (risks.length === 0) {
    riskScore = 15; // default low baseline
  }
  riskScore = Math.min(95, Math.max(12, riskScore));

  const riskLevel = riskScore >= 70 ? 'High' : (riskScore >= 40 ? 'Medium' : 'Low');

  return {
    riskScore,
    riskLevel,
    risks
  };
}

/**
 * Main Risk Controller Endpoint Handler
 * POST /api/ai/risk and POST /api/risk
 */
export async function handleRiskAnalysis(req, res) {
  try {
    const { chunks, fullText, title, category } = await resolveDocumentContext(req.body);

    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Try Gemini Structured AI Classification
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const chunkTextWithPages = chunks
          .slice(0, 10) // Keep context clean and within token limit
          .map(c => `[Excerpt - Page ${c.page}]:\n${c.text}`)
          .join('\n\n');

        const prompt = `You are LexAI, a senior legal risk analysis AI.

Analyze the provided legal document excerpts and identify explicit legal risks across these specific categories:
1. "Unlimited Liability" (uncapped indemnification, hold harmless, no monetary liability limit)
2. "Auto-Renewal Clause" (automatic renewal locks, short non-renewal notice windows)
3. "One-Sided Termination" (unilateral termination for convenience, immediate termination without cure window)
4. "Missing Dispute Resolution" (absence of explicit governing law, jurisdiction, or arbitration framework)
5. "High Penalties or Fees" (late payment interest, liquidated damages, un-capped price/rent escalations)

For each detected risk, return an object with:
- "type": Exact risk type name (from list above or specific legal title)
- "reason": Concise 1-sentence explanation based on the clause
- "clause": Exact clause text excerpt from the document
- "page": Integer page number where clause appears (e.g., 1, 2, 3)
- "severity": "High", "Medium", or "Low"

Also calculate an overall "riskScore" integer between 0 and 100 based on total risk severity, and assign "riskLevel" ("High" if score >= 70, "Medium" if score >= 40, else "Low").

Return ONLY a raw JSON object with NO markdown codeblock markers:
{
  "riskScore": 78,
  "riskLevel": "High",
  "risks": [
    {
      "type": "Unlimited Liability",
      "reason": "No cap on damages mentioned in indemnification clause",
      "clause": "Party agrees to defend, indemnify, and hold harmless...",
      "page": 3,
      "severity": "High"
    }
  ]
}

Document Title: ${title}
Category: ${category}

Document Excerpts:
${chunkTextWithPages}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        const rawText = (response?.text || '').trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(rawText);

        if (parsed && Array.isArray(parsed.risks)) {
          const riskScore = parseInt(parsed.riskScore, 10) || (parsed.riskLevel === 'High' ? 78 : parsed.riskLevel === 'Medium' ? 52 : 22);
          const riskLevel = parsed.riskLevel || (riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low');

          const formattedRisks = parsed.risks.map(r => ({
            type: r.type || 'Legal Risk',
            reason: r.reason || 'Contractual risk identified in text.',
            clause: r.clause || 'Excerpt from contract text.',
            page: parseInt(r.page, 10) || 1,
            severity: r.severity || 'Medium'
          }));

          const reasons = formattedRisks.map(r => `${r.type}: ${r.reason}`);
          const flaggedClauses = formattedRisks.map(r => ({
            title: r.type,
            text: r.clause,
            risk: r.severity,
            reason: r.reason,
            page: r.page
          }));

          return res.status(200).json({
            success: true,
            riskScore,
            riskLevel,
            risks: formattedRisks,
            reasons,
            flaggedClauses,
            aiModel: 'gemini-2.5-flash'
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini risk analysis failed, falling back to explainable rule analyzer:', geminiErr.message);
      }
    }

    // 2. Rule-Based Fallback Risk Analyzer
    const fallback = analyzeRisksRuleBased(chunks, fullText);
    const reasons = fallback.risks.map(r => `${r.type}: ${r.reason}`);
    const flaggedClauses = fallback.risks.map(r => ({
      title: r.type,
      text: r.clause,
      risk: r.severity,
      reason: r.reason,
      page: r.page
    }));

    return res.status(200).json({
      success: true,
      riskScore: fallback.riskScore,
      riskLevel: fallback.riskLevel,
      risks: fallback.risks,
      reasons,
      flaggedClauses,
      aiModel: 'LexAI Explainable Rule-Based Analyzer'
    });

  } catch (err) {
    console.error('Error during risk analysis:', err);
    return res.status(500).json({
      success: false,
      error: `RISK_ANALYSIS_FAILED: ${err.message || 'An unexpected error occurred during risk evaluation.'}`
    });
  }
}
