"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useHnVote() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      itemId,
      direction,
    }: {
      itemId: number;
      direction: "up" | "down";
    }): Promise<{ success: boolean; error?: string }> => {
      const res = await fetch("/api/hn/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, direction }),
      });
      if (res.status === 401) {
        queryClient.setQueryData(["hn-me"], { authenticated: false });
      }
      return res.json();
    },
  });

  return {
    vote: (itemId: number, direction: "up" | "down" = "up") =>
      mutation.mutate({ itemId, direction }),
    isVoting: mutation.isPending,
  };
}
