import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useAuthenticatedFetch } from "./use-authenticated-fetch";
import { api, buildUrl } from "@/lib/api";

type InsertRecipient = any;

export function useRecipients() {
  const { token, user } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  return useQuery({
    queryKey: [api.recipients.list.path, user?.id],
    queryFn: async () => {
      const res = await authenticatedFetch(api.recipients.list.path);
      if (!res.ok) throw new Error("Failed to fetch recipients");
      return api.recipients.list.responses[200].parse(await res.json());
    },
    enabled: !!token && !!user, // Only run query if token and user exist
  });
}

export function useCreateRecipient() {
  const queryClient = useQueryClient();
  const authenticatedFetch = useAuthenticatedFetch();
  return useMutation({
    mutationFn: async (data: InsertRecipient & { dynamicData?: Record<string, string> }) => {
      const res = await authenticatedFetch(api.recipients.create.path, {
        method: api.recipients.create.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.recipients.create.responses[400].parse(await res.json());
           throw new Error(error.error);
        }
        throw new Error("Failed to create recipient");
      }
      return api.recipients.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recipients.list.path] });
    },
  });
}

export function useUploadRecipients() {
  const queryClient = useQueryClient();
  const authenticatedFetch = useAuthenticatedFetch();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await authenticatedFetch(api.recipients.upload.path, {
        method: api.recipients.upload.method,
        body: formData, // Let browser set Content-Type for multipart/form-data
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.recipients.upload.responses[400].parse(await res.json());
          throw new Error(error.error);
        }
        throw new Error("Failed to upload recipients");
      }
      return api.recipients.upload.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recipients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.variables.list.path] }); // New variables might be added
    },
  });
}

export function useDeleteRecipient() {
  const queryClient = useQueryClient();
  const authenticatedFetch = useAuthenticatedFetch();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.recipients.delete.path, { id });
      const res = await authenticatedFetch(url, {
        method: api.recipients.delete.method,
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Recipient not found");
        throw new Error("Failed to delete recipient");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recipients.list.path] });
    },
  });
}

export function useUpdateRecipient() {
  const queryClient = useQueryClient();
  const authenticatedFetch = useAuthenticatedFetch();
  return useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const url = buildUrl(api.recipients.update.path, { id });
      const res = await authenticatedFetch(url, {
        method: api.recipients.update.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.recipients.update.responses[400].parse(await res.json());
          throw new Error(error.error);
        }
        if (res.status === 404) throw new Error('Recipient not found');
        throw new Error('Failed to update recipient');
      }
      return api.recipients.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recipients.list.path] });
    },
  });
}

export function useDeleteAllRecipients() {
  const queryClient = useQueryClient();
  const authenticatedFetch = useAuthenticatedFetch();
  return useMutation({
    mutationFn: async () => {
      const res = await authenticatedFetch(api.recipients.deleteAll.path, {
        method: api.recipients.deleteAll.method,
      });
      if (!res.ok) {
        throw new Error("Failed to delete all recipients");
      }
    },
    onSuccess: () => {
      // console.log("Hook: Invalidating recipients query");
      queryClient.invalidateQueries({ queryKey: [api.recipients.list.path] });
      // Also try to refetch explicitly
      queryClient.refetchQueries({ queryKey: [api.recipients.list.path] });
    },
  });
}
