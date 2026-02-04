import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authenticate';
import { db } from '../models/db';
import { recipients, variables } from '../models/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const router = express.Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage() });

// Helper function to ensure variables exist
const ensureVariablesExist = async (names: string[], userId: number): Promise<string[]> => {
  const newVars: string[] = [];
  for (const name of names) {
    // Skip standard fields
    if (['email', 'firstname', 'lastname', 'first_name', 'last_name'].includes(name.toLowerCase())) continue;

    const existing = await db.select().from(variables).where(and(eq(variables.name, name), eq(variables.userId, userId))).limit(1);
    if (existing.length === 0) {
      await db.insert(variables).values({ userId, name, label: name.charAt(0).toUpperCase() + name.slice(1) });
      newVars.push(name);
    }
  }
  return newVars;
};

const insertRecipientSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dynamicData: z.record(z.string()).optional(),
  isSubscribed: z.boolean().default(true),
});

const updateRecipientSchema = insertRecipientSchema.partial();

router.get('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const result = await db.select().from(recipients).where(eq(recipients.userId, userId)).orderBy(recipients.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recipients' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    console.log('Request content:', req.body, userId);
    const input = insertRecipientSchema.parse(req.body);
    const [result] = await db.insert(recipients).values({ ...input, userId }).returning();
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: err.errors[0].message,
        field: err.errors[0].path.join('.'),
      });
    }
    throw err;
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  const userId = (req.user as any).id;
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Parse with header: 1 to get array of arrays, or 'A' for header mapping
    // Let's use json to get array of objects keyed by header
    const data = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

    if (data.length === 0) {
      return res.status(400).json({ message: "File is empty" });
    }

    // Extract headers from the first row keys
    const headers = Object.keys(data[0]);

    // Ensure variables exist for dynamic columns
    const newVariables = await ensureVariablesExist(headers, userId);

    const recipientsToInsert = data.map(row => {
      // Extract standard fields
      const email = row['email'] || row['Email'] || row['EMAIL'];
      if (!email) return null; // Skip rows without email

      const firstName = row['firstname'] || row['firstName'] || row['First Name'] || row['FirstName'] || "";
      const lastName = row['lastname'] || row['lastName'] || row['Last Name'] || row['LastName'] || "";

      // Everything else goes into dynamicData
      const dynamicData: Record<string, string> = {};
      headers.forEach(header => {
        const lower = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!['email', 'firstname', 'lastname'].includes(lower)) {
           dynamicData[header] = String(row[header] || "");
        }
      });

      return {
        userId,
        email: String(email),
        firstName: String(firstName),
        lastName: String(lastName),
        dynamicData,
        isSubscribed: true
      };
    }).filter(Boolean) as any[];

    if (recipientsToInsert.length === 0) {
      return res.status(400).json({ message: "No valid recipients found (check for 'email' column)" });
    }

    const result = await db.insert(recipients).values(recipientsToInsert).returning();

    res.json({
      count: result.length,
      message: `Successfully imported ${result.length} recipients`,
      newVariables
    });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to process file" });
  }
});

router.delete('/delete-all', async (req, res) => {
  const userId = (req.user as any).id;
  await db.delete(recipients).where(eq(recipients.userId, userId));
  res.status(204).end();
});

router.delete('/:id', async (req, res) => {
  const userId = (req.user as any).id;
  const id = parseInt(req.params.id);
  await db.delete(recipients).where(and(eq(recipients.id, id), eq(recipients.userId, userId)));
  res.status(204).end();
});

router.put('/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const input = updateRecipientSchema.parse(req.body);
    const id = parseInt(req.params.id);
    const [result] = await db.update(recipients)
      .set(input)
      .where(and(eq(recipients.id, id), eq(recipients.userId, userId)))
      .returning();
    if (!result) return res.status(404).json({ message: 'Recipient not found' });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
    }
    throw err;
  }
});

export default router;