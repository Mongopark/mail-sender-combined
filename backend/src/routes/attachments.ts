import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate';
import { db } from '../models/db';
import { emailAttachments } from '../models/schema';
import { eq, and } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';

const router = express.Router();
router.use(authenticate);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req.user as any)?.id;
    const userDir = path.join(uploadsDir, String(userId || 'unknown'));
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
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

// GET all attachments for user
router.get('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const attachments = await db.select().from(emailAttachments).where(eq(emailAttachments.userId, userId));
    res.json(attachments);
  } catch (err) {
    console.error('Get attachments error:', err);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
});

// GET single attachment metadata
router.get('/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);
    const [attachment] = await db.select().from(emailAttachments).where(and(eq(emailAttachments.id, id), eq(emailAttachments.userId, userId)));
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    res.json(attachment);
  } catch (err) {
    console.error('Get attachment error:', err);
    res.status(500).json({ error: 'Failed to fetch attachment' });
  }
});

// GET download attachment file
// Supports both Authorization header and ?token= query param for image src usage
router.get('/:id/download', async (req, res) => {
  try {
    // Get userId from req.user (set by authenticate middleware) 
    // The authenticate middleware already ran via router.use(authenticate)
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);
    const [attachment] = await db.select().from(emailAttachments).where(and(eq(emailAttachments.id, id), eq(emailAttachments.userId, userId)));
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    if (!fs.existsSync(attachment.path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    res.sendFile(path.resolve(attachment.path));
  } catch (err) {
    console.error('Download attachment error:', err);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// POST upload new attachment
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

    res.status(201).json(result);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// DELETE attachment
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);
    
    const [attachment] = await db.select().from(emailAttachments).where(and(eq(emailAttachments.id, id), eq(emailAttachments.userId, userId)));
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    // Delete file from disk
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }
    
    // Delete from database
    await db.delete(emailAttachments).where(and(eq(emailAttachments.id, id), eq(emailAttachments.userId, userId)));
    
    res.status(204).end();
  } catch (err) {
    console.error('Delete attachment error:', err);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

// POST cleanup orphaned attachments - keeps only the specified attachment IDs
// This should be called when saving a draft to remove unused uploads
router.post('/cleanup', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { keepAttachmentIds } = req.body as { keepAttachmentIds: number[] };
    
    if (!Array.isArray(keepAttachmentIds)) {
      return res.status(400).json({ error: 'keepAttachmentIds must be an array' });
    }
    
    // Get all attachments for this user
    const allAttachments = await db.select().from(emailAttachments).where(eq(emailAttachments.userId, userId));
    
    // Find attachments to delete (ones not in keepAttachmentIds)
    const attachmentsToDelete = allAttachments.filter(a => !keepAttachmentIds.includes(a.id));
    
    let deletedCount = 0;
    for (const attachment of attachmentsToDelete) {
      // Delete file from disk
      if (fs.existsSync(attachment.path)) {
        fs.unlinkSync(attachment.path);
      }
      
      // Delete from database
      await db.delete(emailAttachments).where(and(eq(emailAttachments.id, attachment.id), eq(emailAttachments.userId, userId)));
      deletedCount++;
    }
    
    res.json({ message: `Cleaned up ${deletedCount} orphaned attachments` });
  } catch (err) {
    console.error('Cleanup attachments error:', err);
    res.status(500).json({ error: 'Failed to cleanup attachments' });
  }
});

export default router;