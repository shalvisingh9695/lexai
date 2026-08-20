import express from 'express';
import { handleAskQuestion } from '../controllers/askController.js';

const router = express.Router();

/**
 * POST /api/ask
 * Request body: { "query": "What is termination clause?" }
 */
router.post('/', handleAskQuestion);

export default router;
