"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { deduplicateStories, fetchFeed } from "@/lib/hn-live";
import type { CandidateStory } from "@/lib/types";

export type FeedType = "news" | "newest" | "show" | "ask" | "jobs";

interface UseNewsFeedOptions {
  type: FeedType;
}

interface UseNewsFeedResult {
  stories: CandidateStory[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

export const useNewsFeed = ({
  type,
}: UseNewsFeedOptions): UseNewsFeedResult => {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["hn-feed", type],
      queryFn: ({ pageParam = 1 }) => fetchFeed(type, pageParam),
      getNextPageParam: (lastPage, _allPages, lastPageParam) =>
        lastPage.length > 0 ? lastPageParam + 1 : undefined,
      initialPageParam: 1,
    });

  const stories = deduplicateStories(data?.pages.flat() ?? []);

  return {
    stories,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
  };
};
