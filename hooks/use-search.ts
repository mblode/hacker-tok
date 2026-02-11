"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { type SearchSort, searchStories } from "@/lib/hn-algolia";
import type { CandidateStory } from "@/lib/types";

interface UseSearchOptions {
  query: string;
  sort?: SearchSort;
  enabled?: boolean;
}

interface UseSearchResult {
  results: CandidateStory[];
  totalHits: number;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
}

export const useSearch = ({
  query,
  sort = "relevance",
  enabled = true,
}: UseSearchOptions): UseSearchResult => {
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["hn-search", query, sort],
      queryFn: ({ pageParam = 0 }) =>
        searchStories({ query, sort, page: pageParam }),
      getNextPageParam: (lastPage) =>
        lastPage.page + 1 < lastPage.nbPages ? lastPage.page + 1 : undefined,
      initialPageParam: 0,
      enabled: enabled && query.length > 0,
    });

  const results = data?.pages.flatMap((p) => p.hits) ?? [];
  const totalHits = data?.pages[0]?.nbHits ?? 0;

  return {
    results,
    totalHits,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
  };
};
