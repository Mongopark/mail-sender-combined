import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";

export interface EmailDraft {
  id: number;
  userId: number;
  name: string;
  subject: string;
  body: string;
  footer?: string;
  senderName?: string;
  logoAttachmentId?: number;
  recipientIds: number[];
  attachmentIds: number[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailDraftRequest {
  name: string;
  subject: string;
  body: string;
  footer?: string;
  senderName?: string;
  logoAttachmentId?: number;
  recipientIds?: number[];
  attachmentIds?: number[];
  isDefault?: boolean;
}

export interface UpdateEmailDraftRequest {
  id: number;
  name?: string;
  subject?: string;
  body?: string;
  footer?: string;
  senderName?: string;
  logoAttachmentId?: number;
  recipientIds?: number[];
  attachmentIds?: number[];
  isDefault?: boolean;
}

export function useEmailDrafts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email-drafts", user?.id],
    queryFn: async (): Promise<EmailDraft[]> => {
      const response = await apiRequest("GET", "/api/email-drafts");
      return response.json();
    },
    enabled: !!user,
  });
}

export function useEmailDraft(id: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["email-drafts", user?.id, id],
    queryFn: async (): Promise<EmailDraft> => {
      const response = await apiRequest("GET", `/api/email-drafts/${id}`);
      return response.json();
    },
    enabled: !!user && !!id,
  });
}

export function useCreateEmailDraft() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (draft: CreateEmailDraftRequest): Promise<EmailDraft> => {
      const response = await apiRequest("POST", "/api/email-drafts", draft);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-drafts", user?.id] });
    },
  });
}

export function useUpdateEmailDraft() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (draft: UpdateEmailDraftRequest): Promise<EmailDraft> => {
      const response = await apiRequest("PUT", `/api/email-drafts/${draft.id}`, draft);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-drafts", user?.id] });
    },
  });
}

export function useDeleteEmailDraft() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiRequest("DELETE", `/api/email-drafts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-drafts", user?.id] });
    },
  });
}