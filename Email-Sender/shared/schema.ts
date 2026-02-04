
import { pgTable, text, serial, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Store defined variables that can be used in templates (e.g. "job", "salary")
export const variables = pgTable("variables", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(), // The key used in {{name}} - unique per user
  label: text("label").notNull(),        // Display name
});

// Recipients with flexible dynamic data
export const recipients = pgTable("recipients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  // Stores all dynamic fields as key-value pairs
  dynamicData: jsonb("dynamic_data").$type<Record<string, string>>().default({}),
  isSubscribed: boolean("is_subscribed").default(true),
});

// Users for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Email drafts/templates for saving email builder state
export const emailDrafts = pgTable("email_drafts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(), // Draft name (e.g., "Welcome Email", "Newsletter")
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  footer: text("footer"),
  senderName: text("sender_name").default("Bulk Sender"), // Customizable sender name
  logoAttachmentId: integer("logo_attachment_id"), // Optional logo attachment ID
  recipientIds: jsonb("recipient_ids").$type<number[]>().default([]),
  attachmentIds: jsonb("attachment_ids").$type<number[]>().default([]),
  isDefault: boolean("is_default").default(false), // Whether this is the default draft for new users
  createdAt: text("created_at").default(new Date().toISOString()),
  updatedAt: text("updated_at").default(new Date().toISOString()),
});

// File attachments for emails
export const emailAttachments = pgTable("email_attachments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(), // Original filename
  originalName: text("original_name").notNull(), // Original name as uploaded
  mimeType: text("mime_type").notNull(), // MIME type (image/jpeg, application/pdf, etc.)
  size: integer("size").notNull(), // File size in bytes
  path: text("path").notNull(), // File path on disk
  uploadedAt: text("uploaded_at").default(new Date().toISOString()),
});

// === SCHEMAS ===

export const insertVariableSchema = createInsertSchema(variables).omit({ id: true });
export const insertRecipientSchema = createInsertSchema(recipients).omit({ id: true });

// Schema for manual recipient entry (validates dynamic data separately if needed)
export const manualRecipientSchema = insertRecipientSchema.extend({
  dynamicData: z.record(z.string()).optional(),
});

// Schema for bulk email sending
export const sendEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"), // HTML content
  footer: z.string().optional(),
  senderName: z.string().optional(),
  logoAttachmentId: z.number().nullable().optional(),
  recipientIds: z.array(z.number()).optional(), // If empty, send to all
  attachmentIds: z.array(z.number()).optional(), // IDs of attachments to include
});

// Schema for user authentication
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Schema for email drafts
export const insertEmailDraftSchema = createInsertSchema(emailDrafts).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  logoAttachmentId: z.number().nullable().optional(),
});
export const updateEmailDraftSchema = insertEmailDraftSchema.partial().extend({
  id: z.number(),
  logoAttachmentId: z.number().nullable().optional(),
});

// Schema for email attachments
export const insertEmailAttachmentSchema = createInsertSchema(emailAttachments).omit({ id: true, uploadedAt: true });

// === TYPES ===

export type Variable = typeof variables.$inferSelect;
export type InsertVariable = z.infer<typeof insertVariableSchema>;

export type Recipient = typeof recipients.$inferSelect;
export type InsertRecipient = z.infer<typeof insertRecipientSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type EmailDraft = typeof emailDrafts.$inferSelect;
export type InsertEmailDraft = z.infer<typeof insertEmailDraftSchema>;
export type UpdateEmailDraft = z.infer<typeof updateEmailDraftSchema>;

export type EmailAttachment = typeof emailAttachments.$inferSelect;
export type InsertEmailAttachment = z.infer<typeof insertEmailAttachmentSchema>;

export type SendEmailRequest = z.infer<typeof sendEmailSchema>;
