/**
 * app.js  —  DocuMind API entry point
 *
 * Sets up the Express server, mounts all routes,
 * and registers global middleware.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config/index.js';
import documentRoutes from './routes/documents.js';
import queryRoutes from './routes/query.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

// ─── Validate required environment variables ───────────────────────────────────
if (!config.googleApiKey) {
  console.error('❌ GOOGLE_API_KEY is not set. Please create a .env file.');
  process.exit(1);
}

// ─── App setup ─────────────────────────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DocuMind API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/documents', documentRoutes);
app.use('/api/query', queryRoutes);

// ─── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ─── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start server ──────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║           DocuMind API  v1.0.0           ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n🚀  Server     → http://localhost:${config.port}`);
  console.log(`🤖  LLM        → ${config.claudeModel}`);
  console.log(`📐  Embeddings → ${config.embeddingModel}`);
  console.log(`📦  Chunk size → ${config.chunkSize} chars (overlap: ${config.chunkOverlap})`);
  console.log('\n📖  Endpoints:');
  console.log(`    GET  /health`);
  console.log(`    POST /api/documents/upload`);
  console.log(`    GET  /api/documents`);
  console.log(`    DEL  /api/documents/:id`);
  console.log(`    POST /api/query`);
  console.log(`    GET  /api/query/history\n`);
});

export default app;
