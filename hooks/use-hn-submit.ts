"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useHnSubmit() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: {
      title: string;
      url?: string;
      text?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      const res = await fetch("/api/hn/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 401) {
        queryClient.setQueryData(["hn-me"], { authenticated: false });
      }
      return res.json();
    },
  });

  return {
    submit: (data: { title: string; url?: string; text?: string }) =>
      mutation.mutateAsync(data),
    isSubmitting: mutation.isPending,
  };
}
