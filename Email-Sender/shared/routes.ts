
import { z } from 'zod';
import { insertRecipientSchema, manualRecipientSchema, insertVariableSchema, sendEmailSchema, loginSchema, recipients, variables } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  recipients: {
    list: {
      method: 'GET' as const,
      path: '/api/recipients',
      responses: {
        200: z.array(z.custom<typeof recipients.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/recipients/manual',
      input: insertRecipientSchema.omit({ userId: true }),
      responses: {
        201: z.custom<typeof recipients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/recipients/upload',
      // Input is multipart/form-data, handled specially
      responses: {
        200: z.object({
          count: z.number(),
          message: z.string(),
          newVariables: z.array(z.string()), // Returns list of new variables detected
        }),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/recipients/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/recipients/:id',
      input: manualRecipientSchema.omit({ userId: true }),
      responses: {
        200: z.custom<typeof recipients.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    deleteAll: {
      method: 'DELETE' as const,
      path: '/api/recipients/delete-all',
      responses: {
        204: z.void(),
      },
    },
  },
  variables: {
    list: {
      method: 'GET' as const,
      path: '/api/variables',
      responses: {
        200: z.array(z.custom<typeof variables.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/variables',
      input: insertVariableSchema,
      responses: {
        201: z.custom<typeof variables.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/variables/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  email: {
    send: {
      method: 'POST' as const,
      path: '/api/email/send',
      input: sendEmailSchema,
      responses: {
        200: z.object({
          success: z.boolean(),
          sentCount: z.number(),
          message: z.string(),
        }),
        500: errorSchemas.internal,
      },
    },
  },
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: loginSchema,
      responses: {
        200: z.object({
          token: z.string(),
          user: z.object({
            id: z.number(),
            username: z.string(),
          }),
        }),
        401: z.object({
          message: z.string(),
        }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({
          message: z.string(),
        }),
      },
    },
  },
};

// ============================================
// URL HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
