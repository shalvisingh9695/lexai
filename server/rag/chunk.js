/**
 * Text Chunking Utility for Production RAG (TenderIQ / LexAI)
 * Splits page-wise extracted text into coherent, meaningful chunks (~500 words, ~100 words overlap)
 * with strict filtering for low-quality content and preservation of legal clause boundaries.
 */

const DEFAULT_CHUNK_SIZE = 500; // ~500 words per chunk
const DEFAULT_OVERLAP = 100;     // ~100 words overlap
const MIN_CHUNK_CHAR_LENGTH = 50; // Skip noisy/insignificant chunks (<50 chars)

/**
 * Clean and normalize text to prevent token fragmentation
 */
function cleanSegmentText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\r\t\f]+/g, ' ')
    .replace(/[ \u00A0]+/g, ' ')
    .trim();
}

/**
 * Page-aware Document Chunker for RAG.
 * Takes page-wise text array [{ page: 1, text: "..." }] and chunks each page
 * preserving paragraph/clause structure, word boundaries, and attached page numbers.
 *
 * @param {Array<{page: number, text: string}>} pages 
 * @param {string} documentId 
 * @param {string} filename 
 * @param {object} options 
 * @returns {Array<{chunkId: string, page: number, text: string, documentId: string, filename: string}>}
 */
export function chunkDocumentPages(pages, documentId = 'doc_1', filename = 'document.pdf', options = {}) {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap || DEFAULT_OVERLAP;

  if (!Array.isArray(pages) || pages.length === 0) {
    return [];
  }

  const chunks = [];

  for (const pageObj of pages) {
    const pageNum = pageObj.page || 1;
    const rawText = cleanSegmentText(pageObj.text || '');

    // Skip empty or trivial pages
    if (!rawText || rawText.length < MIN_CHUNK_CHAR_LENGTH) continue;

    // Split page text into natural paragraph/section boundaries
    const paragraphs = rawText
      .split(/\n{2,}|\.\s+(?=[A-Z0-9])/)
      .map(p => cleanSegmentText(p))
      .filter(p => p.length > 0);

    let currentWords = [];
    let chunkIndex = 1;

    for (const para of paragraphs) {
      const paraWords = para.split(/\s+/).filter(Boolean);
      if (paraWords.length === 0) continue;

      // If adding this paragraph exceeds chunkSize and we already have accumulated words
      if (currentWords.length > 0 && (currentWords.length + paraWords.length) > chunkSize) {
        const chunkText = currentWords.join(' ');
        
        // Filter out low-quality/short fragments
        if (chunkText.length >= MIN_CHUNK_CHAR_LENGTH) {
          const chunkId = `chunk_${documentId}_p${pageNum}_${chunkIndex}`;
          chunks.push({
            chunkId,
            page: pageNum,
            text: chunkText,
            documentId,
            filename
          });
          chunkIndex++;
        }

        // Keep last 'overlap' words for context continuity
        const overlapStart = Math.max(0, currentWords.length - overlap);
        currentWords = currentWords.slice(overlapStart);
      }

      // If a single paragraph itself exceeds chunkSize, split it by sliding window
      if (paraWords.length > chunkSize) {
        let pStart = 0;
        while (pStart < paraWords.length) {
          const pEnd = Math.min(pStart + chunkSize, paraWords.length);
          const sliceWords = paraWords.slice(pStart, pEnd);

          const combinedWords = pStart === 0 ? [...currentWords, ...sliceWords] : sliceWords;
          const chunkText = combinedWords.join(' ');

          if (chunkText.length >= MIN_CHUNK_CHAR_LENGTH) {
            const chunkId = `chunk_${documentId}_p${pageNum}_${chunkIndex}`;
            chunks.push({
              chunkId,
              page: pageNum,
              text: chunkText,
              documentId,
              filename
            });
            chunkIndex++;
          }

          pStart += (chunkSize - overlap);
          currentWords = paraWords.slice(Math.max(0, pEnd - overlap));

          if (chunkSize <= overlap) break;
        }
      } else {
        currentWords.push(...paraWords);
      }
    }

    // Flush any remaining accumulated words for this page
    if (currentWords.length > 0) {
      const chunkText = currentWords.join(' ');
      if (chunkText.length >= MIN_CHUNK_CHAR_LENGTH) {
        const chunkId = `chunk_${documentId}_p${pageNum}_${chunkIndex}`;
        chunks.push({
          chunkId,
          page: pageNum,
          text: chunkText,
          documentId,
          filename
        });
      }
    }
  }

  // Final safety filter: remove duplicates or noise
  return chunks.filter(c => c && c.text && c.text.length >= MIN_CHUNK_CHAR_LENGTH);
}

/**
 * Basic word-based chunker fallback for plain strings
 */
export function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = options.overlap || DEFAULT_OVERLAP;

  if (!text || typeof text !== 'string') {
    return [];
  }

  const clean = cleanSegmentText(text);
  if (clean.length < MIN_CHUNK_CHAR_LENGTH) return [];

  const pages = [{ page: 1, text: clean }];
  return chunkDocumentPages(pages, options.documentId || 'doc_1', options.filename || 'document.pdf', { chunkSize, overlap });
}

