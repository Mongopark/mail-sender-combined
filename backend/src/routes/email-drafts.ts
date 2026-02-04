import express from 'express';
import { authenticate } from '../middleware/authenticate';
import { db } from '../models/db';
import { emailDrafts } from '../models/schema';
import { eq, and } from 'drizzle-orm';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const userId = (req.user as any).userId;
  const drafts = await db.select().from(emailDrafts).where(eq(emailDrafts.userId, userId)).orderBy(emailDrafts.createdAt);
  res.json(drafts);
});

router.get('/:id', async (req, res) => {
  const userId = (req.user as any).userId;
  const draft = await db.select().from(emailDrafts).where(and(eq(emailDrafts.id, Number(req.params.id)), eq(emailDrafts.userId, userId))).limit(1);
  if (draft.length === 0) {
    return res.status(404).json({ message: "Email draft not found" });
  }
  res.json(draft[0]);
});

router.post('/', async (req, res) => {
  const userId = (req.user as any).userId;
  const { name, subject, body, footer, senderName, logoAttachmentId, recipientIds, attachmentIds, isDefault } = req.body;

  // If setting as default, unset other defaults
  if (isDefault) {
    await db.update(emailDrafts).set({ isDefault: false }).where(eq(emailDrafts.userId, userId));
  }

  const [newDraft] = await db.insert(emailDrafts).values({
    userId,
    name,
    subject,
    body,
    footer,
    senderName,
    logoAttachmentId,
    recipientIds,
    attachmentIds,
    isDefault,
  }).returning();

  res.status(201).json(newDraft);
});

router.put('/:id', async (req, res) => {
  const userId = (req.user as any).userId;
  const { name, subject, body, footer, senderName, logoAttachmentId, recipientIds, attachmentIds, isDefault } = req.body;

  // If setting as default, unset other defaults
  if (isDefault) {
    await db.update(emailDrafts).set({ isDefault: false }).where(eq(emailDrafts.userId, userId));
  }

  const [updatedDraft] = await db.update(emailDrafts)
    .set({
      name,
      subject,
      body,
      footer,
      senderName,
      logoAttachmentId,
      recipientIds,
      attachmentIds,
      isDefault,
      updatedAt: new Date(),
    })
    .where(and(eq(emailDrafts.id, Number(req.params.id)), eq(emailDrafts.userId, userId)))
    .returning();

  if (!updatedDraft) {
    return res.status(404).json({ message: "Email draft not found" });
  }

  res.json(updatedDraft);
});

router.delete('/:id', async (req, res) => {
  const userId = (req.user as any).userId;
  const deleted = await db.delete(emailDrafts).where(and(eq(emailDrafts.id, Number(req.params.id)), eq(emailDrafts.userId, userId)));
  if (deleted.changes === 0) {
    return res.status(404).json({ message: "Email draft not found" });
  }
  res.status(204).send();
});

export default router;