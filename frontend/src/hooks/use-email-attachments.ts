import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, buildUrl } from "@/lib/queryClient";

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
      const response = await apiRequest("GET", "/api/attachments");
      return response.json();
    },
  });
}

export function useCreateEmailAttachment() {

  return useMutation({
    mutationFn: async (formData: FormData): Promise<EmailAttachment> => {
      const token = localStorage.getItem("token");
      const fullUrl = buildUrl("/api/attachments/upload");
      
      // Use native fetch for FormData - don't set Content-Type header
      const response = await fetch(fullUrl, {
        method: "POST",
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to upload file');
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
      await apiRequest("DELETE", `/api/attachments/${id}`);
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-attachments"] });
    },
  });
}

// Hook to cleanup orphaned attachments
export function useCleanupAttachments() {
  return useMutation({
    mutationFn: async (keepAttachmentIds: number[]): Promise<{ message: string }> => {
      const response = await apiRequest("POST", "/api/attachments/cleanup", { keepAttachmentIds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-attachments"] });
    },
  });
}

// Helper to get authenticated download URL
export function getAttachmentDownloadUrl(id: number): string {
  return buildUrl(`/api/attachments/${id}/download`);
}