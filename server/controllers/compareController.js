import { GoogleGenAI } from '@google/genai';
import Document from '../models/Document.js';
import { getInMemoryStore, isUsingMemory } from '../utils/dbConnect.js';

/**
 * Fetch document details by ID from DB or Memory Store
 */
async function getDocumentDetails(docId) {
  if (!docId) return null;
  try {
    let doc = null;
    if (isUsingMemory()) {
      const store = getInMemoryStore();
      doc = store.documents.find(d => d._id === docId || d.id === docId);
    } else {
      doc = await Document.findById(docId).lean();
    }
    if (!doc) return null;

    let fullText = doc.text || doc.summary || '';
    if (Array.isArray(doc.chunks) && doc.chunks.length > 0) {
      fullText = doc.chunks.map(c => c.text).join('\n\n');
    } else if (Array.isArray(doc.extractedPages) && doc.extractedPages.length > 0) {
      fullText = doc.extractedPages.map(p => p.text).join('\n\n');
    } else if (Array.isArray(doc.clauses) && doc.clauses.length > 0) {
      fullText = doc.clauses.map(c => `[${c.title}]: ${c.text}`).join('\n\n');
    }

    return {
      id: doc._id || doc.id,
      fileName: doc.fileName || doc.title || 'Document.pdf',
      title: doc.title || doc.fileName || 'Contract',
      riskScore: doc.riskScore || 50,
      riskLevel: doc.riskLevel || 'Medium',
      fullText
    };
  } catch (err) {
    console.warn(`Error resolving document ${docId}:`, err.message);
    return null;
  }
}

/**
 * Rule-based fallback comparison engine
 */
function analyzeComparisonRuleBased(docA, docB) {
  const textA = (docA.fullText || '').toLowerCase();
  const textB = (docB.fullText || '').toLowerCase();

  const comparison = [];

  // 1. Termination Category
  const termA = textA.includes('30 days') ? '30 days written notice required'
    : textA.includes('60 days') ? '60 days written notice required'
    : textA.includes('immediate') ? 'Immediate termination at sole discretion'
    : 'Standard termination clause';

  const termB = textB.includes('30 days') ? '30 days written notice required'
    : textB.includes('60 days') ? '60 days written notice required'
    : textB.includes('immediate') ? 'Immediate termination at sole discretion'
    : 'Standard termination clause';

  comparison.push({
    category: 'Termination',
    docA: termA,
    docB: termB
  });

  // 2. Liability Category
  const liabA = textA.includes('unlimited liability') || (textA.includes('indemn') && !textA.includes('capped at'))
    ? 'Unlimited liability (uncapped indemnification)'
    : 'Capped aggregate liability';

  const liabB = textB.includes('unlimited liability') || (textB.includes('indemn') && !textB.includes('capped at'))
    ? 'Unlimited liability (uncapped indemnification)'
    : 'Capped aggregate liability';

  comparison.push({
    category: 'Liability',
    docA: liabA,
    docB: liabB
  });

  // 3. Renewal Category
  const renewA = textA.includes('automatically renew') || textA.includes('auto-renew')
    ? 'Auto-renewal for 12-month periods'
    : 'Manual renewal upon written consent';

  const renewB = textB.includes('automatically renew') || textB.includes('auto-renew')
    ? 'Auto-renewal for 12-month periods'
    : 'Manual renewal upon written consent';

  comparison.push({
    category: 'Renewal',
    docA: renewA,
    docB: renewB
  });

  // 4. Dispute Resolution
  const dispA = textA.includes('arbitration') ? 'Binding private arbitration'
    : textA.includes('governing law') ? 'Delaware State Courts'
    : 'Unspecified jurisdiction';

  const dispB = textB.includes('arbitration') ? 'Binding private arbitration'
    : textB.includes('governing law') ? 'Delaware State Courts'
    : 'Unspecified jurisdiction';

  comparison.push({
    category: 'Dispute Resolution',
    docA: dispA,
    docB: dispB
  });

  // Safer document decision
  let saferDoc = docA.title;
  let reason = `${docA.title} presents lower liability exposure and clearer terms.`;

  if (liabA.includes('Unlimited') && !liabB.includes('Unlimited')) {
    saferDoc = docB.title;
    reason = `${docB.title} is safer because it has capped liability whereas ${docA.title} contains uncapped indemnification.`;
  } else if (renewA.includes('Auto-renewal') && !renewB.includes('Auto-renewal')) {
    saferDoc = docB.title;
    reason = `${docB.title} is safer because it requires manual renewal and avoids automatic lock-in.`;
  } else if (docB.riskScore < docA.riskScore) {
    saferDoc = docB.title;
    reason = `${docB.title} has a lower overall risk score (${docB.riskScore} vs ${docA.riskScore}) and more balanced risk provisions.`;
  }

  return {
    comparison,
    saferDocument: saferDoc,
    reason
  };
}

/**
 * Handle POST /api/ai/compare and POST /api/compare
 */
export async function handleCompareDocuments(req, res) {
  try {
    const { docAId, docBId, documentIdA, documentIdB } = req.body;
    const idA = docAId || documentIdA;
    const idB = docBId || documentIdB;

    if (!idA || !idB) {
      return res.status(400).json({
        success: false,
        error: 'Please select two valid documents to perform comparison.'
      });
    }

    const docA = await getDocumentDetails(idA);
    const docB = await getDocumentDetails(idB);

    if (!docA || !docB) {
      return res.status(404).json({
        success: false,
        error: 'One or both requested documents could not be located in the repository.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });

        const prompt = `You are LexAI, a senior legal risk analyst.

Compare two legal contracts side-by-side:

Document A Title: "${docA.title}" (${docA.fileName})
Document A Content Excerpt:
${(docA.fullText || '').slice(0, 1500)}

Document B Title: "${docB.title}" (${docB.fileName})
Document B Content Excerpt:
${(docB.fullText || '').slice(0, 1500)}

Instructions:
Compare both documents across key legal categories:
1. Termination (notice period, cure window, convenience terms)
2. Liability & Indemnity (capped vs unlimited liability)
3. Renewal Terms (auto-renewal vs manual renewal)
4. Dispute Resolution & Jurisdiction (arbitration, court location)
5. Penalties & Rate Escalations (late fees, percentage increases)

Determine which document is safer for a business client ("saferDocument") and provide a clear 1-sentence legal reason ("reason").

Return ONLY a raw JSON object with NO markdown formatting:
{
  "comparison": [
    {
      "category": "Termination",
      "docA": "30 days written notice",
      "docB": "60 days written notice"
    },
    {
      "category": "Liability",
      "docA": "Unlimited indemnification",
      "docB": "Capped at 12x monthly fees"
    },
    {
      "category": "Renewal",
      "docA": "Auto-renewal",
      "docB": "Manual"
    }
  ],
  "saferDocument": "${docB.title}",
  "reason": "${docB.title} has capped liability and avoids auto-renewal lock-in."
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        const rawText = (response?.text || '').trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(rawText);

        if (parsed && Array.isArray(parsed.comparison)) {
          return res.status(200).json({
            success: true,
            docA: { id: docA.id, title: docA.title, fileName: docA.fileName, riskScore: docA.riskScore, riskLevel: docA.riskLevel },
            docB: { id: docB.id, title: docB.title, fileName: docB.fileName, riskScore: docB.riskScore, riskLevel: docB.riskLevel },
            comparison: parsed.comparison,
            saferDocument: parsed.saferDocument || docB.title,
            reason: parsed.reason || `${parsed.saferDocument || docB.title} exhibits more favorable terms and lower risk exposure.`,
            aiModel: 'gemini-2.5-flash'
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini comparison failed, executing rule-based comparison engine:', geminiErr.message);
      }
    }

    // Fallback Rule-Based Comparison
    const fallback = analyzeComparisonRuleBased(docA, docB);

    return res.status(200).json({
      success: true,
      docA: { id: docA.id, title: docA.title, fileName: docA.fileName, riskScore: docA.riskScore, riskLevel: docA.riskLevel },
      docB: { id: docB.id, title: docB.title, fileName: docB.fileName, riskScore: docB.riskScore, riskLevel: docB.riskLevel },
      comparison: fallback.comparison,
      saferDocument: fallback.saferDocument,
      reason: fallback.reason,
      aiModel: 'LexAI Explainable Rule-Based Comparison Engine'
    });

  } catch (err) {
    console.error('Document comparison error:', err);
    return res.status(500).json({
      success: false,
      error: `COMPARISON_FAILED: ${err.message || 'Error occurred while comparing documents.'}`
    });
  }
}
