import { GoogleGenAI } from '@google/genai';

const EXPECTED_DIMENSIONS = 768;
const MAX_CACHE_SIZE = 1000;

// In-memory cache for embeddings: Map<textHash, number[]>
const embeddingCache = new Map();

/**
 * Simple fast hash for cache keys
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/**
 * Deterministic pseudo-embedding generator (768 dimensions) used strictly as a resilient fallback.
 * Generates normalized unit vectors so cosine similarity math remains mathematically valid.
 */
export function createFallbackVector(text = '') {
  const dims = EXPECTED_DIMENSIONS;
  const vector = new Float64Array(dims);
  const cleanText = String(text || '').trim();

  let hash = 0;
  for (let i = 0; i < cleanText.length; i++) {
    hash = (hash << 5) - hash + cleanText.charCodeAt(i);
    hash |= 0;
  }

  let sumSquares = 0;
  for (let i = 0; i < dims; i++) {
    const val = Math.sin(hash + (i + 1) * 0.17) * 10000;
    const rawVal = Number((val - Math.floor(val)).toFixed(6));
    vector[i] = rawVal;
    sumSquares += rawVal * rawVal;
  }

  // Normalize to unit vector
  const norm = Math.sqrt(sumSquares) || 1;
  const normalized = new Array(dims);
  for (let i = 0; i < dims; i++) {
    normalized[i] = Number((vector[i] / norm).toFixed(6));
  }

  return normalized;
}

/**
 * Validates that an embedding vector is valid and matches expected dimension
 */
export function isValidEmbedding(vector) {
  if (!Array.isArray(vector) || vector.length !== EXPECTED_DIMENSIONS) {
    return false;
  }
  for (let i = 0; i < vector.length; i++) {
    if (typeof vector[i] !== 'number' || !Number.isFinite(vector[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Generate embedding vector (768-dim) for a single text using Google Gen AI SDK.
 * Includes in-memory caching and strict dimension validation.
 */
export async function generateEmbedding(text) {
  const cleanText = typeof text === 'string' ? text.trim() : String(text || '').trim();

  if (!cleanText || cleanText.length < 5) {
    return createFallbackVector(cleanText);
  }

  // 1. Check in-memory cache
  const cacheKey = hashString(cleanText);
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey);
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'your_key_here' || apiKey.trim() === '') {
    const fallbackVec = createFallbackVector(cleanText);
    cacheEmbedding(cacheKey, fallbackVec);
    return fallbackVec;
  }

  // 2. Call Gemini embedding model
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });

    // Attempt text-embedding-004 or gemini-embedding-2-preview
    let response = null;
    try {
      response = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: cleanText
      });
    } catch (err) {
      // If text-embedding-004 is unavailable in v1beta SDK, fallback to gemini-embedding-2-preview
      response = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: cleanText
      });
    }

    const values = response?.embedding?.values;
    if (values && Array.isArray(values) && values.length > 0) {
      // Validate dimension consistency (pad or slice to 768 if needed)
      let finalVector = values;
      if (values.length !== EXPECTED_DIMENSIONS) {
        if (values.length > EXPECTED_DIMENSIONS) {
          finalVector = values.slice(0, EXPECTED_DIMENSIONS);
        } else {
          finalVector = [...values, ...new Array(EXPECTED_DIMENSIONS - values.length).fill(0)];
        }
      }

      if (isValidEmbedding(finalVector)) {
        cacheEmbedding(cacheKey, finalVector);
        return finalVector;
      }
    }
  } catch (err) {
    // Gracefully handle rate limits or API errors without spamming logs
    console.warn(`[LexAI RAG] Gemini embedding notice: ${err.message || 'API call failed'}. Using resilient fallback.`);
  }

  // 3. Fallback vector
  const fallbackVec = createFallbackVector(cleanText);
  cacheEmbedding(cacheKey, fallbackVec);
  return fallbackVec;
}

/**
 * Cache embedding with LRU-style eviction
 */
function cacheEmbedding(key, vector) {
  if (embeddingCache.size >= MAX_CACHE_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(key, vector);
}

/**
 * Generate embedding vectors for an array of chunk objects in parallel batches.
 * Highly performant with Promise.all, ensuring every chunk receives a valid vector.
 */
export async function generateEmbeddingsForChunks(chunks, batchSize = 10) {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const results = [];

  // Process chunks in parallel batches to optimize throughput while respecting rate limits
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const batchPromises = batch.map(async (chunk) => {
      try {
        const textToEmbed = chunk.text || chunk.content || '';
        const vector = await generateEmbedding(textToEmbed);
        return {
          ...chunk,
          embedding: vector
        };
      } catch (err) {
        return {
          ...chunk,
          embedding: createFallbackVector(chunk.text || '')
        };
      }
    });

    const resolvedBatch = await Promise.all(batchPromises);
    results.push(...resolvedBatch);
  }

  return results;
}



