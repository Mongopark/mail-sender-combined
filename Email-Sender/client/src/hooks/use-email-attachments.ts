import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { apiRequest } from "@/lib/queryClient";

export interface EmailAttachment {
  id: number;
  userId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: string;
}

export function useEmailAttachments() {
  return useQuery({
    queryKey: ["email-attachments"],
    queryFn: async (): Promise<EmailAttachment[]> => {
      const response = await apiRequest("GET", "/api/email-attachments");
      return response.json();
    },
  });
}

export function useCreateEmailAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData): Promise<EmailAttachment> => {
      const response = await fetch("/api/email-attachments/upload", {
        method: "POST",
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-attachments"] });
    },
  });
}

export function useDeleteEmailAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      return apiRequest(`/api/email-attachments/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-attachments"] });
    },
  });
}