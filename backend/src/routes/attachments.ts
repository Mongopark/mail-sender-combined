import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate';
import { db } from '../models/db';
import { emailAttachments } from '../models/schema';
import path from 'path';
import fs from 'fs';

const router = express.Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });

    const [result] = await db.insert(emailAttachments).values({
      userId,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    }).returning();

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;