/**
 * routes/query.js
 *
 * Handles RAG-powered Q&A against uploaded documents.
 *
 * POST  /api/query          →  Ask a question about a document
 * GET   /api/query/history  →  Get all past Q&A records
 */

import express from 'express';
import { documentStore } from '../services/documentStore.js';
import { queryDocument } from '../services/ragService.js';

const router = express.Router();

// In-memory query history (would be a DB table in production)
const queryHistory = [];

// ─── POST /api/query ──────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { documentId, question } = req.body;

    // Input validation
    if (!documentId || !question) {
      return res.status(400).json({
        success: false,
        error: 'Both "documentId" and "question" are required in the request body.',
      });
    }

    if (typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '"question" must be a non-empty string.',
      });
    }

    // Look up the document
    const doc = documentStore.get(documentId);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: `No document found with id "${documentId}". Upload a document first.`,
      });
    }

    console.log(`\n🔍 Query on "${doc.name}": ${question}`);

    // Run the RAG pipeline
    const { answer, sources } = await queryDocument(doc.vectorStore, question.trim());

    // Build the history record
    const record = {
      queryId: `q_${Date.now()}`,
      documentId,
      documentName: doc.name,
      question: question.trim(),
      answer,
      sources,
      timestamp: new Date().toISOString(),
    };

    queryHistory.push(record);
    console.log('✅ Answer generated\n');

    return res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/query/history ───────────────────────────────────────────────────
router.get('/history', (_req, res) => {
  res.json({
    success: true,
    count: queryHistory.length,
    data: queryHistory,
  });
});

export default router;
