import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import documentRoutes from './routes/documentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import askRoutes from './routes/askRoutes.js';
import { dbConnect, getInMemoryStore } from './utils/dbConnect.js';
import { ensureDocumentIndexed } from './rag/ragService.js';

async function startServer() {
  const app = express();
  
  // Dynamic port resolution:
  // - In production (Render, Heroku, etc.), uses process.env.PORT (e.g. 10000)
  // - In local dev (where Vite dev server binds to 3000 and proxies to 5000), binds Express to 5000
  const PORT = (process.env.PORT && process.env.PORT !== '3000')
    ? process.env.PORT
    : (process.env.SERVER_PORT || 5000);

  // Global middlewares
  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // API Routes
  app.use('/api/documents', documentRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/ask', askRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/summary', aiRoutes);
  app.use('/api/risk', aiRoutes);
  app.use('/api/compare', aiRoutes);
  app.use('/api/chat', chatRoutes);

  // Health check endpoint for Render health checks
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'LexAI RAG Platform Backend',
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });

  // Serve frontend static build if dist/ directory exists
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler to catch unexpected exceptions without crashing the process
  app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  });

  // Bind server to 0.0.0.0
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LexAI RAG Platform Backend running on http://0.0.0.0:${PORT}`);

    // Asynchronously connect database with graceful fallback & pre-seed RAG vector store
    dbConnect().then(() => {
      try {
        const store = getInMemoryStore();
        if (store && store.documents) {
          for (const doc of store.documents) {
            ensureDocumentIndexed(doc._id || doc.id).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('RAG pre-seed notice:', e.message);
      }
    }).catch(err => {
      console.warn('Database initialization notice:', err.message);
    });
  });

  // Handle process termination signals gracefully
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      process.exit(0);
    });
  });
}

startServer().catch(err => {
  console.error('Fatal error starting LexAI backend server:', err);
});

