import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type SendEmailRequest } from "@shared/schema";
import { useAuth } from "./use-auth";
import { useAuthenticatedFetch } from "./use-authenticated-fetch";

export function useSendEmail() {
  const authenticatedFetch = useAuthenticatedFetch();
  return useMutation({
    mutationFn: async (data: SendEmailRequest) => {
      const res = await authenticatedFetch(api.email.send.path, {
        method: api.email.send.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 500) {
           // Try to parse structured error first
           try {
             const error = api.email.send.responses[500].parse(await res.json());
             throw new Error(error.message);
           } catch {
             throw new Error("Server error while sending emails");
           }
        }
        throw new Error("Failed to send emails");
      }
      return api.email.send.responses[200].parse(await res.json());
    },
  });
}
