import { sqliteTable, integer, text, blob } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
});

export const variables = sqliteTable('variables', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  name: text('name').notNull(),
  label: text('label').notNull(),
});

export const recipients = sqliteTable('recipients', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  email: text('email').notNull(),
  firstName: text('firstName'),
  lastName: text('lastName'),
  dynamicData: text('dynamicData', { mode: 'json' }).$type<Record<string, string>>().default({}),
  isSubscribed: integer('isSubscribed', { mode: 'boolean' }).default(true),
});

export const emailDrafts = sqliteTable('emailDrafts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  footer: text('footer'),
  senderName: text('senderName').default('Bulk Sender'),
  logoAttachmentId: integer('logoAttachmentId').references(() => emailAttachments.id),
  recipientIds: text('recipientIds', { mode: 'json' }).$type<number[]>().default([]),
  attachmentIds: text('attachmentIds', { mode: 'json' }).$type<number[]>().default([]),
  isDefault: integer('isDefault', { mode: 'boolean' }).default(false),
  createdAt: integer('createdAt', { mode: 'timestamp' }).$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).$default(() => new Date()),
});

export const emailAttachments = sqliteTable('emailAttachments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('userId').notNull().references(() => users.id),
  filename: text('filename').notNull(),
  originalName: text('originalName').notNull(),
  mimeType: text('mimeType').notNull(),
  size: integer('size').notNull(),
  path: text('path').notNull(),
  uploadedAt: integer('uploadedAt', { mode: 'timestamp' }).$default(() => new Date()),
});

// Note: Variables are unique per user, so name is not globally unique, but per user.