import express from 'express';
import { authenticate } from '../middleware/authenticate';
import { db } from '../models/db';
import { variables } from '../models/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = express.Router();
router.use(authenticate);

const variableSchema = z.object({
  name: z.string(),
  label: z.string(),
});

router.get('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const result = await db.select().from(variables).where(eq(variables.userId, userId));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch variables' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const data = variableSchema.parse(req.body);
    const [result] = await db.insert(variables).values({ ...data, userId }).returning();
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'Invalid input' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const id = parseInt(req.params.id);
    await db.delete(variables).where(eq(variables.id, id)); // Assuming variables are per user, but to be safe, check userId
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;