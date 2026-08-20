import express from 'express';
import { handleSemanticSearch } from '../controllers/searchController.js';

const router = express.Router();

/**
 * POST /api/search
 * Body: { "query": "What is termination clause?", "topK": 3 }
 */
router.post('/', handleSemanticSearch);

export default router;
