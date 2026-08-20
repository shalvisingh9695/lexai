/**
 * Vector Storage & Similarity Search Engine (Production RAG)
 * High-performance hybrid search combining:
 * 1. Dense Semantic Vector Cosine Similarity (with pre-computed L2 norms)
 * 2. Lexical BM25-style Term Frequency & Exact Clause Match Boosting
 * 3. Maximal Marginal Relevance (MMR) for diverse, non-redundant chunk selection
 */

// In-memory vector store: Map<documentId, Array<{ chunkId, page, text, filename, embedding, norm }>>
const vectorStore = new Map();

export const DEFAULT_SIMILARITY_THRESHOLD = 0.65;
export const HYBRID_ALPHA = 0.70; // 70% dense semantic, 30% lexical keyword

/**
 * Precompute L2 norm of a vector for fast zero-overhead cosine similarity
 */
export function computeVectorNorm(vec) {
  if (!Array.isArray(vec) && !(vec instanceof Float64Array) && !(vec instanceof Float32Array)) return 1;
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    const val = vec[i];
    sumSq += val * val;
  }
  return Math.sqrt(sumSq) || 1;
}

/**
 * Fast Cosine Similarity between query vector and pre-normalized / pre-computed chunk vector.
 */
export function cosineSimilarity(vecA, vecB, normA = null, normB = null) {
  if (!vecA || !vecB) return 0;
  const len = Math.min(vecA.length, vecB.length);
  if (len === 0) return 0;

  let dotProduct = 0;
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
  }

  const nA = normA !== null ? normA : computeVectorNorm(vecA);
  const nB = normB !== null ? normB : computeVectorNorm(vecB);

  const denom = nA * nB;
  if (denom <= 0) return 0;
  const score = dotProduct / denom;
  return Number.isFinite(score) ? Math.max(-1, Math.min(1, score)) : 0;
}

/**
 * Lexical BM25-style score & exact keyword boost for legal and tender terms
 */
export function calculateLexicalScore(queryText, chunkText) {
  if (!queryText || !chunkText) return 0;

  const qTokens = queryText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  if (qTokens.length === 0) return 0;

  const cTextLower = chunkText.toLowerCase();
  const cWords = cTextLower.split(/\s+/);
  const cWordSet = new Set(cWords);

  let matchCount = 0;
  for (const token of qTokens) {
    if (cWordSet.has(token)) {
      matchCount += 1.5;
    } else if (cTextLower.includes(token)) {
      matchCount += 1.0;
    }
  }

  // Exact phrase match bonus (e.g. "liquidated damages", "clause 12.4")
  const qClean = queryText.toLowerCase().trim();
  let phraseBonus = 0;
  if (qClean.length > 5 && cTextLower.includes(qClean)) {
    phraseBonus = 0.3;
  }

  const baseScore = Math.min(1.0, (matchCount / qTokens.length) * 0.7 + phraseBonus);
  return Number(baseScore.toFixed(4));
}

/**
 * Save chunks and embeddings for a specific document with pre-computed norms
 */
export function storeDocumentChunks(documentId, chunksWithEmbeddings) {
  if (!documentId) return;
  const enriched = (chunksWithEmbeddings || []).map(chunk => ({
    ...chunk,
    norm: chunk.norm || computeVectorNorm(chunk.embedding)
  }));
  vectorStore.set(String(documentId), enriched);
}

/**
 * Check if a document is present in RAG vector store
 */
export function hasDocument(documentId) {
  return vectorStore.has(String(documentId));
}

/**
 * Get all chunks for a document
 */
export function getDocumentChunks(documentId) {
  return vectorStore.get(String(documentId)) || [];
}

/**
 * Remove document chunks from vector store
 */
export function deleteDocumentChunks(documentId) {
  vectorStore.delete(String(documentId));
}

/**
 * Retrieve top-K relevant chunks using Hybrid Search (Dense Vector + Lexical Match)
 * with diversity re-ranking.
 * 
 * @param {string} documentId 
 * @param {Array<number>} questionEmbedding 
 * @param {string} rawQueryText
 * @param {number} topK 
 * @param {number} threshold 
 * @returns {Array<object>} Top-K matched chunks
 */
export function searchRelevantChunks(
  documentId,
  questionEmbedding,
  rawQueryText = '',
  topK = 3,
  threshold = DEFAULT_SIMILARITY_THRESHOLD
) {
  if (!Array.isArray(questionEmbedding) || questionEmbedding.length === 0) {
    return [];
  }

  const queryNorm = computeVectorNorm(questionEmbedding);
  let chunks = vectorStore.get(String(documentId));

  if (!chunks || chunks.length === 0) {
    const allChunks = [];
    for (const [docId, docChunks] of vectorStore.entries()) {
      if (Array.isArray(docChunks)) {
        allChunks.push(...docChunks.map(c => ({ ...c, documentId: c.documentId || docId })));
      }
    }
    chunks = allChunks;
  }

  if (!chunks || chunks.length === 0) {
    return [];
  }

  const candidates = [];

  for (const chunk of chunks) {
    if (!chunk || !chunk.text || !Array.isArray(chunk.embedding)) continue;

    const chunkNorm = chunk.norm || computeVectorNorm(chunk.embedding);
    const denseSim = cosineSimilarity(questionEmbedding, chunk.embedding, queryNorm, chunkNorm);
    const lexicalSim = rawQueryText ? calculateLexicalScore(rawQueryText, chunk.text) : 0;

    // Hybrid combined score: 70% semantic vector + 30% lexical match
    const hybridScore = rawQueryText 
      ? Number(((denseSim * HYBRID_ALPHA) + (lexicalSim * (1 - HYBRID_ALPHA))).toFixed(4))
      : Number(denseSim.toFixed(4));

    if (hybridScore >= threshold || denseSim >= threshold) {
      candidates.push({
        ...chunk,
        denseScore: Number(denseSim.toFixed(4)),
        lexicalScore: lexicalSim,
        similarityScore: Math.max(hybridScore, Number(denseSim.toFixed(4)))
      });
    }
  }

  // Sort descending by highest composite relevance score
  candidates.sort((a, b) => b.similarityScore - a.similarityScore);

  // Maximal Marginal Relevance (MMR) diversity selection to prevent redundant identical paragraphs
  const selected = [];
  const selectedIds = new Set();

  for (const cand of candidates) {
    if (selected.length >= topK) break;

    // Check redundancy against already selected chunks
    let isRedundant = false;
    for (const s of selected) {
      const interChunkSim = cosineSimilarity(cand.embedding, s.embedding, cand.norm, s.norm);
      if (interChunkSim > 0.88 && cand.page === s.page) {
        isRedundant = true;
        break;
      }
    }

    if (!isRedundant || selected.length === 0) {
      selected.push(cand);
      selectedIds.add(cand.chunkId);
    }
  }

  // If diversity filter left slots open, fill with next best remaining candidates
  if (selected.length < topK) {
    for (const cand of candidates) {
      if (selected.length >= topK) break;
      if (!selectedIds.has(cand.chunkId)) {
        selected.push(cand);
        selectedIds.add(cand.chunkId);
      }
    }
  }

  return selected;
}

