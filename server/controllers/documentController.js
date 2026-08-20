import multer from 'multer';
import Document from '../models/Document.js';
import { dbConnect, getInMemoryStore, isUsingMemory } from '../utils/dbConnect.js';
import { indexDocumentForRAG } from '../rag/ragService.js';
import { extractPdfText } from '../utils/pdfExtractor.js';
import { chunkDocumentPages } from '../rag/chunk.js';
import { generateEmbeddingsForChunks } from '../rag/embed.js';

// Configure multer memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = file.originalname && file.originalname.toLowerCase().endsWith('.pdf');
  
  if (isPdfMime || isPdfExt) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE: Only PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter
});

// Middleware for parsing multipart/form-data upload
export const uploadMiddleware = (req, res, next) => {
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }

  upload.any()(req, res, (err) => {
    if (err) {
      if (err.message && err.message.includes('INVALID_FILE_TYPE')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file format. Only PDF files are allowed.'
        });
      }
      return res.status(400).json({
        success: false,
        error: err.message || 'Error processing uploaded file.'
      });
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

// Get all documents
export async function getDocuments(req, res) {
  try {
    await dbConnect();
    if (isUsingMemory()) {
      const store = getInMemoryStore();
      return res.json({ success: true, count: store.documents.length, data: store.documents });
    }

    const docs = await Document.find({}).sort({ createdAt: -1 });
    return res.json({ success: true, count: docs.length, data: docs });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
}

// Get single document by ID
export async function getDocumentById(req, res) {
  try {
    const { id } = req.params;
    await dbConnect();

    if (isUsingMemory()) {
      const store = getInMemoryStore();
      const doc = store.documents.find(d => d._id === id || d.id === id);
      if (!doc) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }
      return res.json({ success: true, data: doc });
    }

    const doc = await Document.findById(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch document' });
  }
}

// Upload & create document
export async function uploadDocument(req, res) {
  try {
    await dbConnect();

    const isMultipart = req.headers['content-type']?.includes('multipart/form-data');

    // If request claims to be multipart/form-data but contains no file
    if (isMultipart && !req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please select a PDF file to upload.'
      });
    }

    let fileName = req.body?.fileName;
    let fileType = req.body?.fileType || 'application/pdf';
    let fileSize = req.body?.fileSize;
    let extractedPages = [];
    let pageCount = 0;
    let textLength = 0;

    // Process uploaded file if present
    if (req.file) {
      const isPdfMime = req.file.mimetype === 'application/pdf';
      const isPdfExt = req.file.originalname && req.file.originalname.toLowerCase().endsWith('.pdf');

      if (!isPdfMime && !isPdfExt) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file format. Only PDF files are allowed.'
        });
      }

      fileName = req.file.originalname;
      fileType = req.file.mimetype || 'application/pdf';
      fileSize = req.file.size > 1024 * 1024
        ? `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(req.file.size / 1024)} KB`;

      // Perform page-by-page PDF text extraction
      try {
        const extraction = await extractPdfText(req.file.buffer);
        extractedPages = extraction.pages;
        pageCount = extraction.pageCount;
        textLength = extraction.textLength;
      } catch (extractErr) {
        const errMsg = extractErr.message || '';
        if (errMsg.includes('EMPTY_PDF')) {
          return res.status(400).json({
            success: false,
            error: 'Empty PDF file uploaded.'
          });
        }
        if (errMsg.includes('NO_TEXT_FOUND')) {
          return res.status(400).json({
            success: false,
            error: 'PDF contains no extractable text.'
          });
        }
        return res.status(400).json({
          success: false,
          error: 'Corrupted or unreadable PDF file.'
        });
      }
    }

    const { title, category, summary, riskLevel, clauses } = req.body || {};

    // Validate that either a file or a title/fileName exists
    if (!req.file && !fileName && !title) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF file.'
      });
    }

    const docTitle = title || (fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Untitled Legal Document');
    const docCat = category || 'General Legal';
    const docRisk = riskLevel || 'Low';
    
    // If no extracted pages (e.g. JSON simulation payload), create fallback page
    if (extractedPages.length === 0) {
      const fallbackText = customSummaryText(docTitle, summary, clauses);
      extractedPages = [{ page: 1, text: fallbackText }];
      pageCount = 1;
      textLength = fallbackText.length;
    }

    const docId = 'doc_' + Date.now();
    const docFileName = fileName || 'uploaded_document.pdf';

    // Prevent duplicate uploads from creating inconsistent or duplicate chunk records
    if (isUsingMemory()) {
      const store = getInMemoryStore();
      store.documents = store.documents.filter(d => d.fileName !== docFileName);
    } else {
      await Document.deleteMany({ fileName: docFileName });
    }

    // Perform document chunking on extracted page-wise text (~500 words, ~100 words overlap)
    const rawChunks = chunkDocumentPages(extractedPages, docId, docFileName, { chunkSize: 500, overlap: 100 });

    // Generate real 768-dim embedding vector for each chunk using Gemini API gemini-embedding-2-preview
    let chunks = [];
    try {
      chunks = await generateEmbeddingsForChunks(rawChunks);
    } catch (embedErr) {
      console.error('Embedding generation failed:', embedErr.message);
      return res.status(500).json({
        success: false,
        error: embedErr.message || 'EMBEDDING_FAILED: Real embedding vector generation failed.'
      });
    }

    const chunksCount = chunks.length;
    const docSummary = summary || `Legal document "${docTitle}" analyzed by LexAI engine (${pageCount} page${pageCount > 1 ? 's' : ''}, ${textLength} chars, ${chunksCount} chunks embedded).`;
    
    const parsedClauses = Array.isArray(clauses) && clauses.length > 0 ? clauses : [
      { title: 'Standard Confidentiality', risk: 'Low', text: 'Information shared shall remain strictly confidential during project engagement.' },
      { title: 'Governing Law', risk: 'Low', text: 'Governed and construed in accordance with Delaware state law.' },
      { title: 'Termination Clause', risk: 'Medium', text: 'Either party may terminate upon 30 days prior written notice.' }
    ];

    // Sanitize chunk response to omit raw 768-float arrays from HTTP response payload while retaining full vectors in database
    const clientResponseChunks = chunks.map(c => ({
      chunkId: c.chunkId,
      documentId: c.documentId,
      filename: c.filename,
      page: c.page,
      text: c.text,
      hasEmbedding: Boolean(Array.isArray(c.embedding) && c.embedding.length > 0),
      embeddingDimensions: Array.isArray(c.embedding) ? c.embedding.length : 0
    }));

    if (isUsingMemory()) {
      const store = getInMemoryStore();
      const newDoc = {
        _id: docId,
        title: docTitle,
        fileName: docFileName,
        fileType: fileType || 'application/pdf',
        fileSize: fileSize || '1.2 MB',
        category: docCat,
        summary: docSummary,
        riskLevel: docRisk,
        clausesCount: parsedClauses.length,
        clauses: parsedClauses,
        pageCount: pageCount,
        textLength: textLength,
        chunksCount: chunksCount,
        chunks: chunks, // Persistent storage of full chunks with real embeddings
        pages: extractedPages,
        createdAt: new Date().toISOString()
      };
      store.documents.unshift(newDoc);

      const clientDoc = { ...newDoc, chunks: clientResponseChunks };

      return res.status(201).json({
        success: true,
        filename: docFileName,
        pageCount,
        textLength,
        chunksCount,
        chunks: clientResponseChunks,
        pages: extractedPages,
        data: clientDoc,
        message: 'PDF document uploaded, text extracted, chunked, and embedded into persistent store successfully'
      });
    }

    // Save full document and chunks with real embeddings in MongoDB database
    const newDoc = await Document.create({
      title: docTitle,
      fileName: docFileName,
      fileType: fileType || 'application/pdf',
      fileSize: fileSize || '1.2 MB',
      category: docCat,
      summary: docSummary,
      riskLevel: docRisk,
      clausesCount: parsedClauses.length,
      clauses: parsedClauses,
      pageCount: pageCount,
      textLength: textLength,
      chunksCount: chunksCount,
      chunks: chunks, // Persistent storage of full chunks with real 768-dim embeddings in MongoDB
      pages: extractedPages
    });

    const clientDoc = newDoc.toObject();
    clientDoc.chunks = clientResponseChunks;

    return res.status(201).json({
      success: true,
      filename: docFileName,
      pageCount,
      textLength,
      chunksCount,
      chunks: clientResponseChunks,
      pages: extractedPages,
      data: clientDoc,
      message: 'PDF document uploaded, text extracted, chunked, and embedded into MongoDB vector store successfully'
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
}

function customSummaryText(title, summary, clauses) {
  const parts = [title];
  if (summary) parts.push(summary);
  if (Array.isArray(clauses)) {
    clauses.forEach(c => parts.push(`${c.title || 'Clause'}: ${c.text || ''}`));
  }
  return parts.join('\n\n');
}

// Delete document
export async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    await dbConnect();

    if (isUsingMemory()) {
      const store = getInMemoryStore();
      const idx = store.documents.findIndex(d => d._id === id);
      if (idx !== -1) {
        const deleted = store.documents.splice(idx, 1);
        return res.json({ success: true, message: 'Document deleted successfully', data: deleted[0] });
      }
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const doc = await Document.findByIdAndDelete(id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    return res.json({ success: true, message: 'Document deleted successfully', data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to delete document' });
  }
}

// Get dashboard statistics
export async function getDashboardStats(req, res) {
  try {
    await dbConnect();
    let docs = [];

    if (isUsingMemory()) {
      docs = getInMemoryStore().documents;
    } else {
      docs = await Document.find({});
    }

    const totalDocs = docs.length;
    const highRisk = docs.filter(d => d.riskLevel === 'High').length;
    const mediumRisk = docs.filter(d => d.riskLevel === 'Medium').length;
    const lowRisk = docs.filter(d => d.riskLevel === 'Low').length;
    const totalClauses = docs.reduce((acc, d) => acc + (d.clausesCount || d.clauses?.length || 0), 0);

    return res.json({
      success: true,
      stats: {
        totalDocuments: totalDocs,
        highRiskDocuments: highRisk,
        mediumRiskDocuments: mediumRisk,
        lowRiskDocuments: lowRisk,
        totalClausesExtracted: totalClauses,
        complianceScore: totalDocs > 0 ? Math.round(((lowRisk * 100) + (mediumRisk * 60) + (highRisk * 20)) / totalDocs) : 95
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to generate stats' });
  }
}
