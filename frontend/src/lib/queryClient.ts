import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * 🔒 HARD-CODED BASE URL
 * Change this when deploying
 */
const BASE_URL = "http://localhost:3001";
// example prod:
// const BASE_URL = "https://mail-sender-combined-production-aaa3.up.railway.app";

/**
 * Ensures all relative URLs use BASE_URL
 */
export function buildUrl(url: string, params?: Record<string, string | number>) {
  let baseUrl = url;
  if(params) {
  for (const [key, value] of Object.entries(params)) {
    baseUrl = baseUrl.replace(`:${key}`, String(value));
  }
  }
  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    return baseUrl;
  }
  return `${BASE_URL}${baseUrl.startsWith("/") ? "" : "/"}${baseUrl}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/* =========================
   MUTATIONS / MANUAL CALLS
   ========================= */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {};
  const isFormData = data instanceof FormData;
  
  if (data && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const fullUrl = buildUrl(url);
  console.log("apiRequest →", fullUrl);

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
  });

  await throwIfResNotOk(res);
  return res;
}

/* =========================
   REACT QUERY FETCHER
   ========================= */
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("token");

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const path = queryKey.join("/");
    const fullUrl = buildUrl(path);

    console.log("queryFn →", fullUrl);

    const res = await fetch(fullUrl, { headers });

    if (on401 === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return res.json();
  };

/* =========================
   QUERY CLIENT
   ========================= */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
