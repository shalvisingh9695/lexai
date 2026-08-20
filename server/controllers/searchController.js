import Document from '../models/Document.js';
import { getInMemoryStore, isUsingMemory } from '../utils/dbConnect.js';
import { generateEmbedding, isValidEmbedding } from '../rag/embed.js';
import { 
  cosineSimilarity, 
  computeVectorNorm, 
  calculateLexicalScore, 
  DEFAULT_SIMILARITY_THRESHOLD, 
  HYBRID_ALPHA 
} from '../rag/search.js';

/**
 * Perform vector search over stored document chunks for a given query text.
 * Uses Hybrid Search (Dense Semantic Vector + Lexical Exact Match) with pre-computed norms.
 */
export async function searchChunksForQuery(query, options = {}) {
  const { topK = 3, documentId, threshold = DEFAULT_SIMILARITY_THRESHOLD } = options;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const rawQuery = query.trim();

  // 1. Convert user query -> embedding vector with caching
  const queryEmbedding = await generateEmbedding(rawQuery);
  const queryNorm = computeVectorNorm(queryEmbedding);

  // 2. Fetch all document chunks from MongoDB or in-memory fallback store
  let allChunks = [];

  if (isUsingMemory()) {
    const store = getInMemoryStore();
    const docs = store.documents || [];
    for (const doc of docs) {
      if (documentId && String(doc._id) !== String(documentId) && String(doc.id) !== String(documentId)) {
        continue;
      }
      if (Array.isArray(doc.chunks)) {
        for (const chunk of doc.chunks) {
          allChunks.push({
            chunkId: chunk.chunkId,
            documentId: chunk.documentId || doc._id,
            page: chunk.page,
            text: chunk.text,
            filename: chunk.filename || doc.fileName || 'document.pdf',
            embedding: chunk.embedding,
            norm: chunk.norm || computeVectorNorm(chunk.embedding)
          });
        }
      }
    }
  } else {
    const filter = documentId ? { _id: documentId } : {};
    const docs = await Document.find(filter, { chunks: 1, fileName: 1, _id: 1 }).lean();
    for (const doc of docs) {
      if (Array.isArray(doc.chunks)) {
        for (const chunk of doc.chunks) {
          allChunks.push({
            chunkId: chunk.chunkId,
            documentId: chunk.documentId || doc._id.toString(),
            page: chunk.page,
            text: chunk.text,
            filename: chunk.filename || doc.fileName || 'document.pdf',
            embedding: chunk.embedding,
            norm: chunk.norm || computeVectorNorm(chunk.embedding)
          });
        }
      }
    }
  }

  if (allChunks.length === 0) {
    return [];
  }

  // 3. Compute hybrid scores (Dense Cosine Similarity + Lexical Match)
  const scoredChunks = [];

  for (const chunk of allChunks) {
    if (!Array.isArray(chunk.embedding) || chunk.embedding.length === 0) {
      continue;
    }

    const chunkNorm = chunk.norm || computeVectorNorm(chunk.embedding);
    const denseScore = cosineSimilarity(queryEmbedding, chunk.embedding, queryNorm, chunkNorm);
    const lexicalScore = calculateLexicalScore(rawQuery, chunk.text);

    // Hybrid combined score: 70% dense + 30% lexical with keyword bonus
    const hybridScore = Number(((denseScore * HYBRID_ALPHA) + (lexicalScore * (1 - HYBRID_ALPHA))).toFixed(4));
    const effectiveScore = Math.max(hybridScore, Number(denseScore.toFixed(4)));

    // Only accept chunks meeting threshold
    if (effectiveScore >= threshold || denseScore >= threshold) {
      scoredChunks.push({
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        page: chunk.page || 1,
        text: chunk.text,
        denseScore: Number(denseScore.toFixed(4)),
        lexicalScore: lexicalScore,
        similarity: effectiveScore,
        filename: chunk.filename
      });
    }
  }

  // 4. Sort by similarity score descending (highest first)
  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  // 5. Select Top-K results
  return scoredChunks.slice(0, topK);
}

/**
 * Semantic Vector Search Endpoint Handler
 * POST /api/search
 */
export async function handleSemanticSearch(req, res) {
  try {
    const { query, topK, documentId, threshold } = req.body || {};

    // Error Handling: Empty query check
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_QUERY: "query" text string is required in request body.'
      });
    }

    const k = Math.min(Math.max(parseInt(topK, 10) || 3, 1), 10);
    const minScore = typeof threshold === 'number' ? threshold : DEFAULT_SIMILARITY_THRESHOLD;

    const topResults = await searchChunksForQuery(query, { topK: k, documentId, threshold: minScore });

    return res.status(200).json({
      success: true,
      count: topResults.length,
      results: topResults
    });
  } catch (err) {
    console.error('Error during vector search:', err);
    return res.status(500).json({
      success: false,
      error: `SEARCH_FAILED: ${err.message || 'An unexpected error occurred during vector search.'}`
    });
  }
}

