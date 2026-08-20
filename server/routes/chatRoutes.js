import express from 'express';
import { answerQuestionWithRAG } from '../rag/ragService.js';

const router = express.Router();

// POST /api/chat - RAG Question Answering Endpoint
router.post('/', async (req, res) => {
  try {
    const { question, documentId } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Question string is required'
      });
    }

    const docId = documentId || 'doc_1'; // Default to first doc if not specified

    const result = await answerQuestionWithRAG(docId, question);

    return res.json({
      success: true,
      answer: result.answer,
      sources: result.sources,
      documentId: docId
    });
  } catch (error) {
    console.error('RAG Chat endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process question via RAG system'
    });
  }
});

export default router;
