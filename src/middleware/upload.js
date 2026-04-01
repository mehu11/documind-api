/**
 * upload.js  —  Multer middleware for file uploads
 *
 * Accepts: PDF (.pdf) and plain text (.txt)
 * Max size: 10 MB
 * Storage: Local disk under /uploads/
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = 'uploads';
const ALLOWED_EXTENSIONS = ['.pdf', '.txt'];
const MAX_FILE_SIZE_MB = 10;

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Prefix with timestamp to avoid name collisions
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Unsupported file type "${ext}". Only PDF and TXT are accepted.`),
      false
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});
