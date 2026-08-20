import { GoogleGenAI } from '@google/genai';
import { searchChunksForQuery } from './searchController.js';
import { DEFAULT_SIMILARITY_THRESHOLD } from '../rag/search.js';

/**
 * Grounded RAG Answer Endpoint Handler
 * POST /api/ask
 * 
 * Takes a user question:
 * 1. Generates query embedding & retrieves Top-K document chunks using Hybrid Vector + BM25 search.
 * 2. Formats strict context prompt with anti-hallucination guardrails and mandatory citations.
 * 3. Calls Gemini API with strict grounding instructions.
 * 4. Returns grounded answer + sources + confidence metadata.
 */
export async function handleAskQuestion(req, res) {
  try {
    const { query, topK, documentId, threshold } = req.body || {};

    // 1. Error handling: Empty query check
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_QUERY: "query" text string is required in request body.'
      });
    }

    const userQuery = query.trim();
    const k = Math.min(Math.max(parseInt(topK, 10) || 3, 1), 5); // Limit top 3-5 chunks
    const minThreshold = typeof threshold === 'number' ? threshold : DEFAULT_SIMILARITY_THRESHOLD;

    // 2. Retrieve Top-K chunks using hybrid similarity strictly above threshold
    let topChunks = [];
    try {
      topChunks = await searchChunksForQuery(userQuery, {
        topK: k,
        documentId,
        threshold: minThreshold
      });
    } catch (searchErr) {
      console.error('[LexAI RAG] Vector search error:', searchErr.message);
      return res.status(500).json({
        success: false,
        error: `VECTOR_SEARCH_FAILED: Could not retrieve relevant chunks. ${searchErr.message}`
      });
    }

    // Handle case where no relevant document chunks exceed similarity threshold
    if (!topChunks || topChunks.length === 0) {
      return res.status(200).json({
        success: true,
        answer: 'Not available in the provided document context.',
        sources: [],
        confidence: 0
      });
    }

    // Calculate grounding confidence score
    const topScore = topChunks[0]?.similarity || 0;
    const avgScore = topChunks.reduce((acc, c) => acc + (c.similarity || 0), 0) / topChunks.length;

    // 3. Combine query + retrieved chunks into strictly grounded context prompt
    const topKChunksText = topChunks
      .map((c, i) => `[Document Excerpt ${i + 1}] (Page ${c.page}, Section/Chunk: ${c.chunkId}, Source: ${c.filename}):\n"${c.text}"`)
      .join('\n\n');

    const systemPrompt = `You are LexAI / TenderIQ, a precision legal & procurement document intelligence engine.

STRICT GROUNDING & ANTI-HALLUCINATION RULES:
1. Ground your answer 100% EXCLUSIVELY on the factual statements written in the Document Excerpts below.
2. DO NOT assume, extrapolate, or bring in external legal generalities or background training knowledge.
3. If the answer cannot be directly proven by the provided excerpts, reply EXACTLY:
   "Not available in the provided document context."
4. Whenever stating a factual term, deadline, liability limit, or requirement, append its source citation (e.g. [Page X] or [Excerpt Y]).
5. Be concise, direct, professional, and audit-ready.

User Question:
"${userQuery}"

Document Excerpts:
${topKChunksText}

Grounded Response:`;

    // 4. Send to Gemini model
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'your_key_here' || apiKey.trim() === '') {
      // Clean fallback if API key is not configured
      const topSnippet = topChunks[0]?.text || '';
      return res.status(200).json({
        success: true,
        answer: `Document Reference (Grounded Excerpt):\n"${topSnippet.slice(0, 320)}..."\n\n[Note: Live AI synthesis requires GEMINI_API_KEY. Grounded context matched with ${(topScore * 100).toFixed(1)}% hybrid similarity.]`,
        sources: topChunks.map(c => ({
          chunkId: c.chunkId,
          page: c.page,
          text: c.text,
          similarity: c.similarity
        })),
        confidence: Number(topScore.toFixed(4))
      });
    }

    let answerText = '';
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: systemPrompt
      });

      if (response && response.text) {
        answerText = response.text.trim();
      } else {
        answerText = 'Not available in the provided document context.';
      }
    } catch (geminiErr) {
      console.warn('[LexAI RAG] Gemini answer generation notice:', geminiErr.message || geminiErr);
      return res.status(500).json({
        success: false,
        error: `GEMINI_API_FAILURE: ${geminiErr.message || 'Failed to generate grounded answer.'}`
      });
    }

    // 5. Clean sources payload (no raw embeddings exposed)
    const sources = topChunks.map(c => ({
      chunkId: c.chunkId,
      page: c.page,
      text: c.text,
      similarity: c.similarity,
      denseScore: c.denseScore,
      lexicalScore: c.lexicalScore
    }));

    return res.status(200).json({
      success: true,
      answer: answerText,
      confidence: Number(avgScore.toFixed(4)),
      topScore: Number(topScore.toFixed(4)),
      sources
    });
  } catch (err) {
    console.error('[LexAI RAG] Error during RAG ask handler:', err);
    return res.status(500).json({
      success: false,
      error: `RAG_FAILED: ${err.message || 'An unexpected error occurred during RAG answer generation.'}`
    });
  }
}

