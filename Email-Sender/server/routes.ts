
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";
import Handlebars from "handlebars";
import jwt from "jsonwebtoken";
import fs from "fs";


const upload = multer({ storage: multer.memoryStorage() });

// Helper functions
const isImageFile = (mimeType: string): boolean => {
  return mimeType?.startsWith('image/');
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === RECIPIENTS ===

  app.get(api.recipients.list.path, async (req, res) => {
    const userId = (req as any).user.userId;
    const recipients = await storage.getRecipients(userId);
    res.json(recipients);
  });

  app.post(api.recipients.create.path, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      // Normalize incoming body: accept `active` from CSV as synonym for `isSubscribed`
      const normalizedBody: any = { ...req.body };
      if (Object.prototype.hasOwnProperty.call(normalizedBody, 'active')) {
        const v = normalizedBody.active;
        if (typeof v === 'string') {
          const lower = v.trim().toLowerCase();
          normalizedBody.isSubscribed = (lower === 'yes' || lower === 'true' || lower === '1');
        } else if (typeof v === 'number') {
          normalizedBody.isSubscribed = v === 1;
        } else if (typeof v === 'boolean') {
          normalizedBody.isSubscribed = v;
        }
        delete normalizedBody.active;
      }
      console.log('Server: POST', api.recipients.create.path, 'normalized body:', normalizedBody);
      let input;
      try {
        input = api.recipients.create.input.parse(normalizedBody);
      } catch (err) {
        if (err instanceof z.ZodError) console.error('Zod create errors:', err.errors);
        throw err;
      }
      const recipient = await storage.createRecipient({ ...input, userId });
      res.status(201).json(recipient);
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

  app.post(api.recipients.upload.path, upload.single('file'), async (req, res) => {
    const userId = (req as any).user.userId;
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
      const newVariables = await storage.ensureVariablesExist(headers, userId);

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

      await storage.createRecipientsBulk(recipientsToInsert);

      res.json({
        count: recipientsToInsert.length,
        message: `Successfully imported ${recipientsToInsert.length} recipients`,
        newVariables
      });

    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Failed to process file" });
    }
  });

  app.delete(api.recipients.deleteAll.path, async (req, res) => {
    // console.log("Deleting all recipients...");
    const userId = (req as any).user.userId;
    await storage.deleteAllRecipients(userId);
    // console.log("All recipients deleted successfully");
    res.status(204).end();
  });

  app.delete(api.recipients.delete.path, async (req, res) => {
    const userId = (req as any).user.userId;
    await storage.deleteRecipient(Number(req.params.id), userId);
    res.status(204).end();
  });

  app.put(api.recipients.update.path, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      // Normalize incoming body: accept `active` as synonym for `isSubscribed`
      const normalizedBody: any = { ...req.body };
      if (Object.prototype.hasOwnProperty.call(normalizedBody, 'active')) {
        const v = normalizedBody.active;
        if (typeof v === 'string') {
          const lower = v.trim().toLowerCase();
          normalizedBody.isSubscribed = (lower === 'yes' || lower === 'true' || lower === '1');
        } else if (typeof v === 'number') {
          normalizedBody.isSubscribed = v === 1;
        } else if (typeof v === 'boolean') {
          normalizedBody.isSubscribed = v;
        }
        delete normalizedBody.active;
      }
      console.log('Server: PUT', api.recipients.update.path, 'params:', req.params, 'normalized body:', normalizedBody);
      let input;
      try {
        input = api.recipients.update.input.parse(normalizedBody);
      } catch (err) {
        if (err instanceof z.ZodError) console.error('Zod update errors:', err.errors);
        throw err;
      }
      const updated = await storage.updateRecipient({ ...input, id: Number(req.params.id), userId });
      if (!updated) return res.status(404).json({ message: 'Recipient not found' });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  // === VARIABLES ===

  app.get(api.variables.list.path, async (req, res) => {
    const userId = (req as any).user.userId;
    const variables = await storage.getVariables(userId);
    res.json(variables);
  });

  app.post(api.variables.create.path, async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const input = api.variables.create.input.parse(req.body);
      const variable = await storage.createVariable({ ...input, userId });
      res.status(201).json(variable);
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

  app.delete(api.variables.delete.path, async (req, res) => {
    const userId = (req as any).user.userId;
    await storage.deleteVariable(Number(req.params.id), userId);
    res.status(204).end();
  });

  // === EMAIL DRAFTS ===

  app.get('/api/email-drafts', async (req, res) => {
    const userId = (req as any).user.userId;
    const drafts = await storage.getEmailDrafts(userId);
    res.json(drafts);
  });

  app.get('/api/email-drafts/:id', async (req, res) => {
    const userId = (req as any).user.userId;
    const draft = await storage.getEmailDraft(Number(req.params.id), userId);
    if (!draft) {
      return res.status(404).json({ message: "Email draft not found" });
    }
    res.json(draft);
  });

  app.post('/api/email-drafts', async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const input = req.body;
      
      // Validate required fields
      if (!input.name || !input.subject || !input.body) {
        return res.status(400).json({ message: "Name, subject, and body are required" });
      }
      
      const draft = await storage.createEmailDraft({ ...input, userId });
      res.status(201).json(draft);
    } catch (err) {
      console.error("Create draft error:", err);
      res.status(500).json({ message: "Failed to create email draft" });
    }
  });

  app.put('/api/email-drafts/:id', async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const input = req.body;
      
      // Validate required fields
      if (!input.subject || !input.body) {
        return res.status(400).json({ message: "Subject and body are required" });
      }
      
      const draft = await storage.updateEmailDraft({ ...input, id: Number(req.params.id), userId });
      if (!draft) {
        return res.status(404).json({ message: "Email draft not found" });
      }
      res.json(draft);
    } catch (err) {
      console.error("Update draft error:", err);
      res.status(500).json({ message: "Failed to update email draft" });
    }
  });

  app.delete('/api/email-drafts/:id', async (req, res) => {
    const userId = (req as any).user.userId;
    await storage.deleteEmailDraft(Number(req.params.id), userId);
    res.status(204).end();
  });

  // === EMAIL ATTACHMENTS ===

  app.get('/api/email-attachments', async (req, res) => {
    const userId = (req as any).user.userId;
    const attachments = await storage.getEmailAttachments(userId);
    res.json(attachments);
  });

  app.get('/api/email-attachments/:id', async (req, res) => {
    const userId = (req as any).user.userId;
    const attachment = await storage.getEmailAttachment(Number(req.params.id), userId);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }
    res.json(attachment);
  });

// Custom middleware to authenticate before multer
const authenticateUpload = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

  app.post('/api/email-attachments/upload', authenticateUpload, upload.single('file'), async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Create uploads directory if it doesn't exist
      const fs = await import('fs');
      const path = await import('path');
      const uploadsDir = path.join(process.cwd(), 'uploads', userId.toString());
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const uniqueFilename = `${Date.now()}-${req.file.originalname}`;
      const filePath = path.join(uploadsDir, uniqueFilename);

      // Write file buffer to disk
      fs.writeFileSync(filePath, req.file.buffer);

      // Save attachment metadata to database
      const attachment = await storage.createEmailAttachment({
        userId,
        filename: uniqueFilename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: filePath,
      });

      res.status(201).json(attachment);
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get('/api/email-attachments/:id/download', async (req, res) => {
    try {
      // Check for token in Authorization header or query parameter
      let token = req.headers.authorization;
      if (!token && req.query.token) {
        token = `Bearer ${req.query.token}`;
      }

      if (!token || !token.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
      }

      const jwtToken = token.substring(7);
      const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET || 'your-secret-key') as any;
      const userId = decoded.userId;

      const attachment = await storage.getEmailAttachment(Number(req.params.id), userId);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      const fs = await import('fs');
      if (!fs.existsSync(attachment.path)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader('Content-Type', attachment.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
      res.sendFile(attachment.path);
    } catch (err) {
      console.error("Download error:", err);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.delete('/api/email-attachments/:id', async (req, res) => {
    try {
      const userId = (req as any).user.userId;
      const attachment = await storage.getEmailAttachment(Number(req.params.id), userId);
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }

      // Delete file from disk
      const fs = await import('fs');
      if (fs.existsSync(attachment.path)) {
        fs.unlinkSync(attachment.path);
      }

      // Delete from database
      await storage.deleteEmailAttachment(Number(req.params.id), userId);
      res.status(204).end();
    } catch (err) {
      console.error("Delete attachment error:", err);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // === EMAIL SENDING ===

  app.post(api.email.send.path, async (req, res) => {
    try {
      const { subject, body, footer, senderName,  logoAttachmentId, recipientIds, attachmentIds } = api.email.send.input.parse(req.body);

      // 1. Setup Transporter
      // NOTE: For a real app, we should use environment variables for SMTP config.
      // For this demo, we'll try to look for them, or use a test account (Ethereal) if not provided.
      
      let transporter: nodemailer.Transporter;

      if (process.env.SMTP_HOST) {
        const transporterConfig: any = {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD,
          },
        };

        // Add service if specified (like 'gmail')
        if (process.env.SMTP_SERVICE) {
          transporterConfig.service = process.env.SMTP_SERVICE;
        }

        transporter = nodemailer.createTransport(transporterConfig);
        // console.log(`Using SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} (${process.env.SMTP_SERVICE || 'custom'})`);
      } else {
        // Generate test SMTP service account from ethereal.email
        // Only needed if you don't have a real mail account for testing
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: testAccount.user, // generated ethereal user
            pass: testAccount.pass, // generated ethereal password
          },
        });
        // console.log("Using Ethereal Mail (Test Mode) - Messages won't actually send to real addresses.");
        // console.log(`Preview URL base: https://ethereal.email/messages`);
      }

      // 2. Fetch Recipients
      const userId = (req as any).user.userId;
      let recipientsList = await storage.getRecipients(userId);
      if (recipientIds && recipientIds.length > 0) {
        recipientsList = recipientsList.filter(r => recipientIds.includes(r.id));
      }

      // 3. Initialize attachments array
      let attachments: any[] = [];

      // 4. Fetch Logo if provided
      let logoHtml = '';
      if (logoAttachmentId) {
        const logoAttachment = await storage.getEmailAttachment(logoAttachmentId, userId);
        if (logoAttachment && logoAttachment.userId === userId && fs.existsSync(logoAttachment.path)) {
          // Add logo as inline attachment for HTML email
          attachments.push({
            filename: logoAttachment.originalName,
            path: logoAttachment.path,
            cid: 'logo@company.com' // Content ID for inline embedding
          });
          // logoHtml = `<div style="text-align: center; margin: 20px 0;"><img src="cid:logo@company.com" alt="Company Logo" style="max-width: 50px; height: auto; border-radius: 4px; align: flex-start" /></div>`;

          logoHtml = `
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="left" style="padding: 20px 0;">
                <img
                  src="cid:logo@company.com"
                  alt="Company Logo"
                  width="50"
                  style="display: block; height: auto;"
                />
              </td>
            </tr>
          </table>
        `;
        }
      }

      // 5. Fetch Attachments for inline display
      let attachmentsHtml = '';
      if (attachmentIds && attachmentIds.length > 0) {
        const userAttachments = await storage.getEmailAttachments(userId);
        const emailAttachments = userAttachments.filter(a => attachmentIds.includes(a.id));
        
        if (emailAttachments.length > 0) {
          attachmentsHtml = '<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">';
          attachmentsHtml += '<p style="font-size: 14px; font-weight: bold; margin-bottom: 10px; color: #333;">Attachments:</p>';
          
          emailAttachments.forEach(attachment => {
            if (isImageFile(attachment.mimeType) && fs.existsSync(attachment.path)) {
              // Add image as inline attachment
              attachments.push({
                filename: attachment.originalName,
                path: attachment.path,
                cid: `attachment-${attachment.id}@company.com`
              });
              attachmentsHtml += `<div style="margin-bottom: 15px;"><img src="cid:attachment-${attachment.id}@company.com" alt="${attachment.originalName}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" /></div>`;
            } else if (fs.existsSync(attachment.path)) {
              // For non-image files, just show download link
              attachments.push({
                filename: attachment.originalName,
                path: attachment.path,
              });
              attachmentsHtml += `<div style="margin-bottom: 10px;"><a href="#" style="color: #0066cc; text-decoration: none;">📎 ${attachment.originalName}</a></div>`;
            }
          });
          
          attachmentsHtml += '</div>';
        }
      }

      // 6. Compile Templates
      const subjectTemplate = Handlebars.compile(subject);
      
      // Build HTML body with logo, content, attachments, and formatted footer
      let htmlBody = logoHtml;
      htmlBody += body.replace(/\n/g, '<br>');

      // ✅ attachments FIRST
      // htmlBody += attachmentsHtml;

      // ✅ footer LAST
      if (footer) {
        htmlBody += `
          <div style="margin-top: 30px; padding-top: 20px; color: #666; font-size: 12px; line-height: 1.4;"><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><br><div style="border-top: 1px solid #e5e5e5;" />
            ${footer.replace(/\n/g, '<br>')}
          </div>
        `;
      }
      
      const bodyTemplate = Handlebars.compile(htmlBody);

      // 5. Send Emails (Sequentially to be safe)
      let sentCount = 0;
      
      for (const recipient of recipientsList) {
        // Flatten context: { firstName, lastName, ...dynamicData }
        const context = {
          email: recipient.email || '',
          firstname: recipient.firstName || '',
          lastname: recipient.lastName || '',
          ...Object.fromEntries(
            Object.entries(recipient.dynamicData || {}).map(([key, value]) => [key, value || ''])
          ),
        };

        const finalSubject = subjectTemplate(context);
        const finalBody = bodyTemplate(context); // HTML body

        try {
          const info = await transporter.sendMail({
            from: `${senderName} <${process.env.SMTP_USERNAME}>`, // sender address
            sender: process.env.SMTP_USERNAME,
            to: recipient.email, // list of receivers
            subject: finalSubject, // Subject line
            html: finalBody, // html body
            attachments: attachments, // file attachments
          });
          
          sentCount++;
          // console.log(`Message sent to ${recipient.email}: ${info.messageId}`);
          if (process.env.SMTP_HOST === undefined) {
             console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
          }

        } catch (sendError) {
          console.error(`Failed to send to ${recipient.email}:`, sendError);
          // Continue to next recipient
        }
      }

      res.json({
        success: true,
        sentCount,
        message: `Successfully processed ${sentCount} emails.`
      });

    } catch (err) {
       console.error("Email send error:", err);
       res.status(500).json({ message: "Internal server error during sending" });
    }
  });

  // === AUTHENTICATION ===

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password } = req.body;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Create new user
      const newUser = await storage.createUser({ username, password });

      // Seed initial data for new user
      await storage.createVariable({ userId: newUser.id, name: "job", label: "Job Title" });
      await storage.createVariable({ userId: newUser.id, name: "company", label: "Company" });
      await storage.createVariable({ userId: newUser.id, name: "location", label: "Location" });

      await storage.createRecipient({
        userId: newUser.id,
        email: `${username}@example.com`,
        firstName: username.charAt(0).toUpperCase() + username.slice(1),
        lastName: "User",
        dynamicData: { job: "Employee", company: "Example Corp", location: "Remote" },
        isSubscribed: true
      });

      // Create default email draft
      await storage.createEmailDraft({
        userId: newUser.id,
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
          <strong>The Team</strong>
        </p>
      </div>
      `,
        footer: "This email was sent to {{email}}",
        isDefault: true
      });


      // Create JWT token
      const token = jwt.sign(
        { userId: newUser.id, username: newUser.username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '2m' }
      );

      res.status(201).json({
        token,
        user: { id: newUser.id, username: newUser.username }
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username, password } = api.auth.login.input.parse(req.body);

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create JWT token (expires in 2 minutes for testing)
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: { id: user.id, username: user.username }
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Login error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.logout.path, async (req, res) => {
    // For JWT, logout is handled client-side by removing the token
    res.json({ message: "Logged out successfully" });
  });

  // === SEED DATA ===
  (async () => {
    try {
      // Seed default user
      let adminUser = await storage.getUserByUsername('admin');
      if (!adminUser) {
        // console.log("Seeding default user...");
        adminUser = await storage.createUser({ username: 'admin', password: 'admin123' });
        // console.log("Default user created: admin / admin123");
      }

      const existingVars = await storage.getVariables(adminUser.id);
      if (existingVars.length === 0) {
        // console.log("Seeding initial variables...");
        await storage.createVariable({ userId: adminUser.id, name: "job", label: "Job Title" });
        await storage.createVariable({ userId: adminUser.id, name: "salary", label: "Salary" });
        await storage.createVariable({ userId: adminUser.id, name: "department", label: "Department" });
      }

      const existingRecipients = await storage.getRecipients(adminUser.id);
      if (existingRecipients.length === 0) {
        // console.log("Seeding initial recipients...");
        await storage.createRecipient({
          userId: adminUser.id,
          email: "alice@example.com",
          firstName: "Alice",
          lastName: "Johnson",
          dynamicData: { job: "Engineer", salary: "$100,000", department: "Engineering" },
          isSubscribed: true
        });
        await storage.createRecipient({
          userId: adminUser.id,
          email: "bob@example.com",
          firstName: "Bob",
          lastName: "Smith",
          dynamicData: { job: "Designer", salary: "$90,000", department: "Product" },
          isSubscribed: true
        });
      }

      const existingDrafts = await storage.getEmailDrafts(adminUser.id);
      if (existingDrafts.length === 0) {
        // console.log("Seeding default email draft...");
        await storage.createEmailDraft({
          userId: adminUser.id,
          name: "Welcome Email",
          subject: "Hello {{firstname}} {{lastname}}!",
          body: `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.6; color: #222;">
          <p><strong>Dear {{firstname}},</strong></p>
          <p>
            We are pleased to officially confirm your position at
            <strong><u>{{company}}</u></strong>.
          </p>
          <p>
            Your role as <strong><u>{{job}}</u></strong> has been finalized, and we are confident
            in the value you will bring to the organization.
          </p>
          <p>
            <em>We look forward to a successful working relationship.</em>
          </p>
          <br />
          <p>
            <strong>Best regards,</strong><br />
            <strong>The Team</strong>
          </p>
        </div>
        `,
          footer: "This email was sent to {{email}}",
          isDefault: true
        });
      }
    } catch (error) {
      console.error("Seeding error:", error);
    }
  })();

  return httpServer;
}
