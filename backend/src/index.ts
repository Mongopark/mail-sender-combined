import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { db } from './models/db';
import { users, variables, recipients, emailDrafts, emailAttachments } from './models/schema';
import { eq } from 'drizzle-orm';
import { localStrategy, getJwtStrategy } from './middleware/auth';
import authRoutes from './routes/auth';
import recipientRoutes from './routes/recipients';
import variableRoutes from './routes/variables';
import emailRoutes from './routes/email';
import emailDraftsRoutes from './routes/email-drafts';
import attachmentRoutes from './routes/attachments';
import logger from './utils/logger';

dotenv.config();
console.log('JWT_SECRET:', process.env.JWT_SECRET);

const app = express();
const PORT = process.env.PORT || 3001;

// HTTP request logging
// app.use(morgan('combined'));
// if (["development", "production"].includes(process.env.NODE_ENV || "development" || "production")) {
//   app.use(morgan("dev", { stream: logger.stream }));
// }

app.use(morgan("dev", { stream: logger.stream }));
app.use(cors());
app.use(express.json());
app.use(passport.initialize());

passport.use(localStrategy);
passport.use(getJwtStrategy());

app.use('/api/auth', authRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api/variables', variableRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/email-drafts', emailDraftsRoutes);
app.use('/api/attachments', attachmentRoutes);

// Seed default admin user and initial data
const seedData = async () => {
  try {
    // Seed default user
    let adminUser = await db.select().from(users).where(eq(users.username, 'emma')).limit(1);
    if (adminUser.length === 0) {
      const hashedPassword = await bcrypt.hash('emma123', 10);
      adminUser = await db.insert(users).values({
        username: 'emma',
        password: hashedPassword
      }).returning();
      console.log('Default user created: emma / emma123');
    } else {
      console.log('user Emma already exists');
    }

    const userId = adminUser[0].id;

    // Seed initial variables
    const existingVars = await db.select().from(variables).where(eq(variables.userId, userId));
    if (existingVars.length === 0) {
      await db.insert(variables).values([
        { userId, name: "job", label: "Job Title" },
        { userId, name: "company", label: "Company" },
        { userId, name: "location", label: "Location" }
      ]);
      console.log('Initial variables seeded');
    }

    // Seed initial recipients
    const existingRecipients = await db.select().from(recipients).where(eq(recipients.userId, userId));
    if (existingRecipients.length === 0) {
      await db.insert(recipients).values([
        {
          userId,
          email: "alice@example.com",
          firstName: "Alice",
          lastName: "Johnson",
          dynamicData: { job: "Engineer", company: "Example Corp", location: "Remote" },
          isSubscribed: true
        },
        {
          userId,
          email: "bob@example.com",
          firstName: "Bob",
          lastName: "Smith",
          dynamicData: { job: "Designer", company: "Example Corp", location: "Remote" },
          isSubscribed: true
        }
      ]);
      console.log('Initial recipients seeded');
    }

    // Seed default email draft
    const existingDrafts = await db.select().from(emailDrafts).where(eq(emailDrafts.userId, userId));
    if (existingDrafts.length === 0) {
      await db.insert(emailDrafts).values({
        userId,
        name: "Welcome Email",
        subject: "Hello {{firstname}}!",
        body: `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #222;">
  <p><strong>Dear {{firstname}} {{lastname}},</strong></p>
  <p>
    Welcome to <strong><u>{{company}}</u></strong>.
  </p>
  <p>
    We are excited to confirm your role as <strong><u>{{job}}</u></strong>.
    Your position comes with a compensation package aligned with our standards and expectations.
  </p>
  <p>
    <em>We look forward to your valuable contributions and continued growth with us.</em>
  </p>
  <br />
  <p>
    <strong>Best regards,</strong><br />
    HR Team<br />
    {{company}}<br />
    {{location}}
  </p>
</div>`,
        footer: "",
        senderName: "Bulk Sender",
        recipientIds: [],
        attachmentIds: [],
        isDefault: true,
      });
      console.log('Default email draft seeded');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedData();
});