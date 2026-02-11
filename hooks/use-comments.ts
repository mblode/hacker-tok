"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchItem } from "@/lib/hn-api";
import type { HNComment } from "@/lib/types";

interface UseCommentsResult {
  comments: HNComment[];
  commentsCount: number;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export const useComments = (postId: number): UseCommentsResult => {
  const {
    data: item,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["hn-item", postId],
    queryFn: () => fetchItem(postId),
    enabled: postId > 0,
  });

  return {
    comments: item?.comments ?? [],
    commentsCount: item?.comments_count ?? 0,
    isLoading,
    error: error ? "Failed to load comments" : null,
    retry: () => {
      refetch();
    },
  };
};
