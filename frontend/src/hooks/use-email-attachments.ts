import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await apiRequest("DELETE", `/api/email-attachments/${id}`);
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-attachments"] });
    },
  });
}