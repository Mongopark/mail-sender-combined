import { useAuth } from "@/hooks/use-auth";
import { buildUrl } from "@/lib/queryClient";

export function useAuthenticatedFetch() {
  const { token, handleTokenExpired } = useAuth();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    const fullUrl = buildUrl(url);
    console.log("apiRequest →", fullUrl);

    const response = await fetch(fullUrl, { ...options, headers });

    if (response.status === 401) {
      // Token expired or invalid, clear auth state and redirect to login
      handleTokenExpired();
      throw new Error('Authentication expired. Please login again.');
    }

    return response;
  };

  return authenticatedFetch;
}