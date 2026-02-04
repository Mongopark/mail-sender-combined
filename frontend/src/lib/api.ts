import { z } from "zod";

// Define schemas
const recipientSchema = z.object({
  id: z.number(),
  email: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  dynamicData: z.record(z.string(), z.unknown()),
  isSubscribed: z.boolean(),
});

const variableSchema = z.object({
  id: z.number(),
  name: z.string(),
  label: z.string(),
});

const emailSendResponseSchema = z.object({
  message: z.string(),
});

const errorResponseSchema = z.object({
  error: z.string(),
});

// API definition
export const api = {
  recipients: {
    list: {
      path: "/api/recipients",
      method: "GET" as const,
      responses: {
        200: z.array(recipientSchema),
      },
    },
    create: {
      path: "/api/recipients",
      method: "POST" as const,
      responses: {
        201: recipientSchema,
        400: errorResponseSchema,
      },
    },
    upload: {
      path: "/api/recipients/upload",
      method: "POST" as const,
      responses: {
        200: z.object({ count: z.number() }),
        400: errorResponseSchema,
      },
    },
    delete: {
      path: "/api/recipients/:id",
      method: "DELETE" as const,
    },
    update: {
      path: "/api/recipients/:id",
      method: "PUT" as const,
      responses: {
        200: recipientSchema,
        400: errorResponseSchema,
      },
    },
    deleteAll: {
      path: "/api/recipients/delete-all",
      method: "DELETE" as const,
    },
  },
  variables: {
    list: {
      path: "/api/variables",
      method: "GET" as const,
      responses: {
        200: z.array(variableSchema),
      },
    },
    create: {
      path: "/api/variables",
      method: "POST" as const,
      responses: {
        201: variableSchema,
        400: errorResponseSchema,
      },
    },
    delete: {
      path: "/api/variables/:id",
      method: "DELETE" as const,
    },
  },
  email: {
    send: {
      path: "/api/email/send",
      method: "POST" as const,
      responses: {
        200: emailSendResponseSchema,
        500: errorResponseSchema,
      },
    },
  },
};

// Utility function to build URL with params
// export function buildUrl(path: string, params: Record<string, string | number>) {
//   let url = path;
//   for (const [key, value] of Object.entries(params)) {
//     url = url.replace(`:${key}`, String(value));
//   }
//   return url;
// }
