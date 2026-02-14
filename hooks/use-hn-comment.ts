"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useHnComment(postId: number) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      parentId,
      text,
    }: {
      parentId: number;
      text: string;
    }): Promise<{ success: boolean; error?: string }> => {
      const res = await fetch("/api/hn/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, text }),
      });
      if (res.status === 401) {
        queryClient.setQueryData(["hn-me"], { authenticated: false });
      }
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["hn-item", postId] });
      }
    },
  });

  return {
    submitComment: (parentId: number, text: string) =>
      mutation.mutateAsync({ parentId, text }),
    isSubmitting: mutation.isPending,
  };
}
