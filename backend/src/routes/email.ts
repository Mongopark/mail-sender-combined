import express from 'express';
import { authenticate } from '../middleware/authenticate';
import { db } from '../models/db';
import { recipients, emailAttachments, emailDrafts } from '../models/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

const router = express.Router();
router.use(authenticate);

const sendSchema = z.object({
  subject: z.string(),
  body: z.string(),
  footer: z.string().optional(),
  senderName: z.string().optional(),
  logoAttachmentId: z.number().optional(),
  recipientIds: z.array(z.number()).optional(),
  attachmentIds: z.array(z.number()).optional(),
});

const draftSchema = z.object({
  name: z.string(),
  subject: z.string(),
  body: z.string(),
  footer: z.string().optional(),
  senderName: z.string().optional(),
  logoAttachmentId: z.number().optional(),
  recipientIds: z.array(z.number()).default([]),
  attachmentIds: z.array(z.number()).default([]),
  isDefault: z.boolean().default(false),
});

router.post('/send', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const data = sendSchema.parse(req.body);

    const recipientIds = data.recipientIds || [];
    const recips = recipientIds.length > 0
      ? await db.select().from(recipients).where(and(eq(recipients.userId, userId), inArray(recipients.id, recipientIds)))
      : await db.select().from(recipients).where(and(eq(recipients.userId, userId), eq(recipients.isSubscribed, true)));

    const attachments = data.attachmentIds ? await db.select().from(emailAttachments).where(and(eq(emailAttachments.userId, userId), inArray(emailAttachments.id, data.attachmentIds))) : [];
    const logo = data.logoAttachmentId ? await db.select().from(emailAttachments).where(and(eq(emailAttachments.id, data.logoAttachmentId), eq(emailAttachments.userId, userId))).then(r => r[0]) : null;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT!),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    for (const recip of recips) {
      const templateData = {
        email: recip.email,
        firstName: recip.firstName || '',
        lastName: recip.lastName || '',
        name: `${recip.firstName || ''} ${recip.lastName || ''}`.trim(),
        ...recip.dynamicData,
      };

      const subject = handlebars.compile(data.subject)(templateData);
      const body = handlebars.compile(data.body)(templateData);
      const footer = data.footer ? handlebars.compile(data.footer)(templateData) : '';

      const mailOptions: any = {
        from: `${data.senderName || 'Bulk Sender'} <${process.env.SMTP_USER}>`,
        to: recip.email,
        subject,
        html: body + footer,
        attachments: attachments.map(att => ({
          filename: att.originalName,
          path: att.path,
        })),
      };

      if (logo) {
        mailOptions.attachments.push({
          filename: logo.originalName,
          path: logo.path,
          cid: 'logo@bulk.sender', // for embedding
        });
        // To embed, use <img src="cid:logo@bulk.sender"> in body
      }

      await transporter.sendMail(mailOptions);
    }

    res.json({ message: 'Emails sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});

router.post('/drafts', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const data = draftSchema.parse(req.body);

    const [draft] = await db.insert(emailDrafts).values({
      userId,
      name: data.name,
      subject: data.subject,
      body: data.body,
      footer: data.footer,
      senderName: data.senderName,
      logoAttachmentId: data.logoAttachmentId,
      recipientIds: data.recipientIds,
      attachmentIds: data.attachmentIds,
      isDefault: data.isDefault,
    }).returning();

    res.json(draft);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

router.get('/drafts', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const drafts = await db.select().from(emailDrafts).where(eq(emailDrafts.userId, userId));
    res.json(drafts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get drafts' });
  }
});

router.get('/drafts/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const draftId = parseInt(req.params.id);

    const [draft] = await db.select().from(emailDrafts)
      .where(and(eq(emailDrafts.id, draftId), eq(emailDrafts.userId, userId)))
      .limit(1);

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(draft);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get draft' });
  }
});

router.put('/drafts/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const draftId = parseInt(req.params.id);
    const data = draftSchema.parse(req.body);

    const [updatedDraft] = await db.update(emailDrafts)
      .set({
        name: data.name,
        subject: data.subject,
        body: data.body,
        footer: data.footer,
        senderName: data.senderName,
        logoAttachmentId: data.logoAttachmentId,
        recipientIds: data.recipientIds,
        attachmentIds: data.attachmentIds,
        isDefault: data.isDefault,
      })
      .where(and(eq(emailDrafts.id, draftId), eq(emailDrafts.userId, userId)))
      .returning();

    if (!updatedDraft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(updatedDraft);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update draft' });
  }
});

router.delete('/drafts/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const draftId = parseInt(req.params.id);

    const [deletedDraft] = await db.delete(emailDrafts)
      .where(and(eq(emailDrafts.id, draftId), eq(emailDrafts.userId, userId)))
      .returning();

    if (!deletedDraft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
});

export default router;