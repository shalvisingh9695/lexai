import express from 'express';
import {
  getDocuments,
  getDocumentById,
  uploadDocument,
  deleteDocument,
  getDashboardStats,
  uploadMiddleware
} from '../controllers/documentController.js';

const router = express.Router();

router.get('/', getDocuments);
router.get('/stats', getDashboardStats);
router.get('/:id', getDocumentById);
router.post('/upload', uploadMiddleware, uploadDocument);
router.delete('/:id', deleteDocument);

export default router;
