"use client";

import {
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  createElement,
  type ReactNode,
  useCallback,
  useContext,
} from "react";

interface HnAuthState {
  isAuthenticated: boolean;
  username: string | null;
  karma: number | null;
  isLoading: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loginMutation: UseMutationResult<
    { success: boolean; error?: string },
    Error,
    { username: string; password: string }
  >;
}

const HnAuthContext = createContext<HnAuthState | null>(null);

async function fetchMe(): Promise<{
  authenticated: boolean;
  username?: string;
  karma?: number;
}> {
  const res = await fetch("/api/hn/me");
  if (!res.ok) {
    return { authenticated: false };
  }
  return res.json();
}

export function HnAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["hn-me"],
    queryFn: fetchMe,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: {
      username: string;
      password: string;
    }): Promise<{ success: boolean; error?: string }> => {
      const res = await fetch("/api/hn/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["hn-me"] });
      }
    },
  });

  const login = useCallback(
    (
      username: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      return loginMutation.mutateAsync({ username, password });
    },
    [loginMutation]
  );

  const logout = useCallback(async () => {
    await fetch("/api/hn/logout", { method: "POST" });
    queryClient.setQueryData(["hn-me"], { authenticated: false });
  }, [queryClient]);

  const value: HnAuthState = {
    isAuthenticated: data?.authenticated ?? false,
    username: data?.authenticated ? (data.username ?? null) : null,
    karma: data?.authenticated ? (data.karma ?? null) : null,
    isLoading,
    login,
    logout,
    loginMutation,
  };

  return createElement(HnAuthContext.Provider, { value }, children);
}

export function useHnAuth(): HnAuthState {
  const ctx = useContext(HnAuthContext);
  if (!ctx) {
    throw new Error("useHnAuth must be used within HnAuthProvider");
  }
  return ctx;
}
