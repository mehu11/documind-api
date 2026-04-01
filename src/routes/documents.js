/**
 * routes/documents.js
 *
 * Handles document ingestion and management.
 *
 * POST   /api/documents/upload  →  Upload + process a document
 * GET    /api/documents          →  List all uploaded documents
 * DELETE /api/documents/:id      →  Remove a document
 */

import express from 'express';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { upload } from '../middleware/upload.js';
import { documentStore } from '../services/documentStore.js';
import { processDocument } from '../services/ragService.js';

const router = express.Router();

// ─── POST /api/documents/upload ───────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided.' });
    }

    const { originalname, mimetype, path: filePath, size } = req.file;
    const docId = uuidv4();

    console.log(`\n📄 Processing: ${originalname}`);

    const { vectorStore, chunkCount } = await processDocument(filePath, mimetype);

    documentStore.add(
      docId,
      { name: originalname, type: mimetype, size, chunkCount, filePath },
      vectorStore
    );

    console.log(`✅ Ready — ${chunkCount} chunks indexed (id: ${docId})\n`);

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and indexed successfully.',
      data: {
        documentId: docId,
        name: originalname,
        type: mimetype,
        sizeBytes: size,
        chunkCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/documents ───────────────────────────────────────────────────────
router.get('/', (_req, res) => {
  const docs = documentStore.getAll();
  res.json({
    success: true,
    count: docs.length,
    data: docs,
  });
});

// ─── DELETE /api/documents/:id ────────────────────────────────────────────────
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = documentStore.get(id);

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found.' });
    }

    // Clean up disk file
    if (doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    documentStore.delete(id);

    return res.json({
      success: true,
      message: `Document "${doc.name}" deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
