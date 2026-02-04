import { useAuth } from "@/hooks/use-auth";

export function useAuthenticatedFetch() {
  const { token, handleTokenExpired } = useAuth();

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      // Token expired or invalid, clear auth state and redirect to login
      handleTokenExpired();
      throw new Error('Authentication expired. Please login again.');
    }

    return response;
  };

  return authenticatedFetch;
}