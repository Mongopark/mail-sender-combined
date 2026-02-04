import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { useAuthenticatedFetch } from "./use-authenticated-fetch";
import { api, buildUrl } from "@/lib/api";

type InsertVariable = any;

export function useVariables() {
  const { token, user } = useAuth();
  const authenticatedFetch = useAuthenticatedFetch();
  return useQuery({
    queryKey: [api.variables.list.path, user?.id],
    queryFn: async () => {
      const res = await authenticatedFetch(api.variables.list.path);
      if (!res.ok) throw new Error("Failed to fetch variables");
      return api.variables.list.responses[200].parse(await res.json());
    },
    enabled: !!token && !!user,
  });
}

export function useCreateVariable() {
  const queryClient = useQueryClient();
  const authenticatedFetch = useAuthenticatedFetch();
  return useMutation({
    mutationFn: async (data: InsertVariable) => {
      const res = await authenticatedFetch(api.variables.create.path, {
        method: api.variables.create.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.variables.create.responses[400].parse(await res.json());
           throw new Error(error.error);
        }
        throw new Error("Failed to create variable");
      }
      return api.variables.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.variables.list.path] });
    },
  });
}

export function useDeleteVariable() {
  const queryClient = useQueryClient();
  const authenticatedFetch = useAuthenticatedFetch();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.variables.delete.path, { id });
      const res = await authenticatedFetch(url, {
        method: api.variables.delete.method,
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Variable not found");
        throw new Error("Failed to delete variable");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.variables.list.path] });
    },
  });
}
