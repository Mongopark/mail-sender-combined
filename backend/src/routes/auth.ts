import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { db } from '../models/db';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = express.Router();

const registerSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

router.post('/register', async (req, res) => {
  try {
    const { username, password } = registerSchema.parse(req.body);
    const hashedPassword = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({ username, password: hashedPassword }).returning();
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!);
    res.json({ token, user, ok: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid input or user exists' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!);
    res.json({ token, user, ok: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid input' });
  }
});

router.post('/logout', (req, res) => {
  // For JWT, logout is client-side, just return success
  res.json({ message: 'Logged out' });
});

export default router;