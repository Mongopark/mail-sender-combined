
import { db } from "./db";
import {
  recipients, variables, users, emailDrafts, emailAttachments,
  type Recipient, type InsertRecipient,
  type Variable, type InsertVariable,
  type User, type InsertUser,
  type EmailDraft, type InsertEmailDraft, type UpdateEmailDraft,
  type EmailAttachment, type InsertEmailAttachment
} from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";

export interface IStorage {
  // Recipients
  getRecipients(userId: number): Promise<Recipient[]>;
  getRecipient(id: number, userId: number): Promise<Recipient | undefined>;
  createRecipient(recipient: InsertRecipient): Promise<Recipient>;
  createRecipientsBulk(recipientsData: InsertRecipient[]): Promise<Recipient[]>;
  deleteRecipient(id: number, userId: number): Promise<void>;
  updateRecipient(recipient: Partial<InsertRecipient> & { id: number; userId: number }): Promise<Recipient | undefined>;
  deleteAllRecipients(userId: number): Promise<void>;

  // Variables
  getVariables(userId: number): Promise<Variable[]>;
  createVariable(variable: InsertVariable): Promise<Variable>;
  deleteVariable(id: number, userId: number): Promise<void>;
  
  // Email Drafts
  getEmailDrafts(userId: number): Promise<EmailDraft[]>;
  getEmailDraft(id: number, userId: number): Promise<EmailDraft | undefined>;
  createEmailDraft(draft: InsertEmailDraft): Promise<EmailDraft>;
  updateEmailDraft(draft: UpdateEmailDraft): Promise<EmailDraft>;
  deleteEmailDraft(id: number, userId: number): Promise<void>;
  getDefaultEmailDraft(userId: number): Promise<EmailDraft | undefined>;
  
  // Email Attachments
  getEmailAttachments(userId: number): Promise<EmailAttachment[]>;
  getEmailAttachment(id: number, userId: number): Promise<EmailAttachment | undefined>;
  createEmailAttachment(attachment: InsertEmailAttachment): Promise<EmailAttachment>;
  deleteEmailAttachment(id: number, userId: number): Promise<void>;
  
  // Users
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Helper to ensure variables exist from headers
  ensureVariablesExist(names: string[], userId: number): Promise<string[]>; // returns names of NEW variables created
}

export class DatabaseStorage implements IStorage {
  async getRecipients(userId: number): Promise<Recipient[]> {
    return await db.select().from(recipients).where(eq(recipients.userId, userId)).orderBy(recipients.id);
  }

  async getRecipient(id: number, userId: number): Promise<Recipient | undefined> {
    const [recipient] = await db.select().from(recipients).where(and(eq(recipients.id, id), eq(recipients.userId, userId)));
    return recipient;
  }

  async createRecipient(recipient: InsertRecipient): Promise<Recipient> {
    const [newRecipient] = await db.insert(recipients).values(recipient).returning();
    return newRecipient;
  }

  async createRecipientsBulk(recipientsData: InsertRecipient[]): Promise<Recipient[]> {
    if (recipientsData.length === 0) return [];
    return await db.insert(recipients).values(recipientsData).returning();
  }

  async deleteRecipient(id: number, userId: number): Promise<void> {
    await db.delete(recipients).where(and(eq(recipients.id, id), eq(recipients.userId, userId)));
  }

  async updateRecipient(recipient: Partial<InsertRecipient> & { id: number; userId: number }): Promise<Recipient | undefined> {
    const { id, userId, ...updateData } = recipient;
    const [updated] = await db.update(recipients)
      .set(updateData)
      .where(and(eq(recipients.id, id), eq(recipients.userId, userId)))
      .returning();
    return updated;
  }

  async deleteAllRecipients(userId: number): Promise<void> {
    await db.delete(recipients).where(eq(recipients.userId, userId));
  }

  async getVariables(userId: number): Promise<Variable[]> {
    return await db.select().from(variables).where(eq(variables.userId, userId)).orderBy(variables.id);
  }

  async createVariable(variable: InsertVariable): Promise<Variable> {
    const [newVar] = await db.insert(variables).values(variable).onConflictDoNothing().returning();
    if (!newVar) {
      // If it existed, fetch it
      const [existing] = await db.select().from(variables).where(and(eq(variables.name, variable.name), eq(variables.userId, variable.userId)));
      return existing;
    }
    return newVar;
  }

  async deleteVariable(id: number, userId: number): Promise<void> {
    await db.delete(variables).where(and(eq(variables.id, id), eq(variables.userId, userId)));
  }

  async ensureVariablesExist(names: string[], userId: number): Promise<string[]> {
    const newVars: string[] = [];
    for (const name of names) {
      // Skip standard fields
      if (['email', 'firstname', 'lastname', 'first_name', 'last_name'].includes(name.toLowerCase())) continue;

      const [existing] = await db.select().from(variables).where(and(eq(variables.name, name), eq(variables.userId, userId)));
      if (!existing) {
        await this.createVariable({ userId, name, label: name.charAt(0).toUpperCase() + name.slice(1) });
        newVars.push(name);
      }
    }
    return newVars;
  }

  async getEmailDrafts(userId: number): Promise<EmailDraft[]> {
    return await db.select().from(emailDrafts).where(eq(emailDrafts.userId, userId)).orderBy(emailDrafts.updatedAt);
  }

  async getEmailDraft(id: number, userId: number): Promise<EmailDraft | undefined> {
    const [draft] = await db.select().from(emailDrafts).where(and(eq(emailDrafts.id, id), eq(emailDrafts.userId, userId)));
    return draft;
  }

  async createEmailDraft(draft: InsertEmailDraft): Promise<EmailDraft> {
    const [newDraft] = await db.insert(emailDrafts).values({
      ...draft,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).returning();
    return newDraft;
  }

  async updateEmailDraft(draft: UpdateEmailDraft): Promise<EmailDraft> {
    const [updatedDraft] = await db.update(emailDrafts)
      .set({
        ...draft,
        updatedAt: new Date().toISOString()
      })
      .where(and(eq(emailDrafts.id, draft.id), eq(emailDrafts.userId, draft.userId!)))
      .returning();
    return updatedDraft;
  }

  async deleteEmailDraft(id: number, userId: number): Promise<void> {
    await db.delete(emailDrafts).where(and(eq(emailDrafts.id, id), eq(emailDrafts.userId, userId)));
  }

  async getDefaultEmailDraft(userId: number): Promise<EmailDraft | undefined> {
    const [draft] = await db.select().from(emailDrafts).where(and(eq(emailDrafts.userId, userId), eq(emailDrafts.isDefault, true)));
    return draft;
  }

  async getEmailAttachments(userId: number): Promise<EmailAttachment[]> {
    return await db.select().from(emailAttachments).where(eq(emailAttachments.userId, userId)).orderBy(emailAttachments.uploadedAt);
  }

  async getEmailAttachment(id: number, userId: number): Promise<EmailAttachment | undefined> {
    const [attachment] = await db.select().from(emailAttachments).where(and(eq(emailAttachments.id, id), eq(emailAttachments.userId, userId)));
    return attachment;
  }

  async createEmailAttachment(attachment: InsertEmailAttachment): Promise<EmailAttachment> {
    const [newAttachment] = await db.insert(emailAttachments).values({
      ...attachment,
      uploadedAt: new Date().toISOString()
    }).returning();
    return newAttachment;
  }

  async deleteEmailAttachment(id: number, userId: number): Promise<void> {
    await db.delete(emailAttachments).where(and(eq(emailAttachments.id, id), eq(emailAttachments.userId, userId)));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
}

export const storage = new DatabaseStorage();
