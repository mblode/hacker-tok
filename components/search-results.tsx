"use client";

import { Loader2, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PostViewer } from "@/components/post-viewer";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearch } from "@/hooks/use-search";
import { useSearchHistory } from "@/hooks/use-search-history";
import type { SearchSort } from "@/lib/hn-algolia";
import type { CandidateStory } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { Dot } from "./dot";

const AUTO_LOAD_LIMIT = 3;

interface SearchResultsProps {
  query: string;
  sort: SearchSort;
}

export const SearchResults = ({ query, sort }: SearchResultsProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState(query);
  const { searches, addSearch, removeSearch, clearHistory } =
    useSearchHistory();

  const { results, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useSearch({ query, sort, enabled: query.length > 0 });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const previousSearchRef = useRef<{ query: string; sort: SearchSort } | null>(
    null
  );
  const [autoLoadCount, setAutoLoadCount] = useState(0);
  const showButton = autoLoadCount >= AUTO_LOAD_LIMIT;

  // Sync input with query prop
  useEffect(() => {
    setInputValue(query);
  }, [query]);

  // Record search in history when query arrives via URL
  useEffect(() => {
    if (query) {
      addSearch(query);
    }
  }, [query, addSearch]);

  // Reset auto-load counter when search changes
  useEffect(() => {
    const previous = previousSearchRef.current;
    const hasChanged =
      previous == null || previous.query !== query || previous.sort !== sort;

    previousSearchRef.current = { query, sort };

    if (hasChanged) {
      setAutoLoadCount(0);
      setSelectedIndex(null);
    }
  }, [query, sort]);

  // Infinite scroll observer (disabled after AUTO_LOAD_LIMIT auto-loads)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || showButton) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          setAutoLoadCount((c) => c + 1);
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, showButton]);

  const handleLoadMore = useCallback(() => {
    setAutoLoadCount(0);
    fetchNextPage();
  }, [fetchNextPage]);

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "relevance") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    router.push(`/search?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      addSearch(trimmed);
      const params = new URLSearchParams();
      params.set("q", trimmed);
      router.push(`/search?${params.toString()}`);
    }
  };

  const handleClear = () => {
    setInputValue("");
    router.push("/search");
  };

  const handleSelectRecent = (q: string) => {
    setInputValue(q);
    addSearch(q);
    const params = new URLSearchParams();
    params.set("q", q);
    router.push(`/search?${params.toString()}`);
  };

  const searchOriginPath = `/search?${new URLSearchParams({
    q: query,
    ...(sort !== "relevance" ? { sort } : {}),
  }).toString()}`;

  if (selectedIndex !== null && results.length > 0) {
    return (
      <PostViewer
        initialCandidates={results}
        key={`${query}-${sort}-${selectedIndex}`}
        mode="collection"
        onBack={() => setSelectedIndex(null)}
        originPath={searchOriginPath}
        startIndex={selectedIndex}
      />
    );
  }

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-border border-b px-4 py-2">
        <SidebarTrigger className="md:hidden" />
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={handleSubmit}
        >
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            className="h-8 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search stories..."
            type="text"
            value={inputValue}
          />
          {inputValue && (
            <button
              aria-label="Clear search"
              className="shrink-0 cursor-pointer rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              onClick={handleClear}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          )}
        </form>
      </header>
      {query && (
        <div className="shrink-0 border-border border-b px-4 py-2">
          <Tabs onValueChange={handleSortChange} value={sort}>
            <TabsList>
              <TabsTrigger value="relevance">Top</TabsTrigger>
              <TabsTrigger value="date">Latest</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      <main className="min-h-0 flex-1 overflow-y-scroll">
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin">
              <Loader2 className="size-6 text-muted-foreground" />
            </div>
          </div>
        )}
        {!isLoading && query && results.length === 0 && (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}
        {!(isLoading || query) && (
          <RecentSearches
            onClear={clearHistory}
            onRemove={removeSearch}
            onSelect={handleSelectRecent}
            searches={searches}
          />
        )}
        {results.length > 0 && (
          <div className="mx-auto max-w-[80ch] pb-8">
            {results.map((story, index) => (
              <SearchResultItem
                key={story.id}
                onSelect={() => setSelectedIndex(index)}
                story={story}
              />
            ))}
            {!showButton && <div ref={sentinelRef} />}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin">
                  <Loader2 className="size-5 text-muted-foreground" />
                </div>
              </div>
            )}
            {showButton && hasNextPage && !isFetchingNextPage && (
              <div className="flex items-center justify-center py-4">
                <Button
                  onClick={handleLoadMore}
                  type="button"
                  variant="outline"
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
};

interface RecentSearchesProps {
  searches: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}

const RecentSearches = ({
  searches,
  onSelect,
  onRemove,
  onClear,
}: RecentSearchesProps) => {
  if (searches.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">
          Enter a search query to find stories
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[80ch]">
      <div className="px-4 pt-4 pb-2">
        <h2 className="font-medium text-muted-foreground text-sm">
          Recent searches
        </h2>
      </div>
      {searches.map((query) => (
        <div className="group flex items-center gap-3 px-4 py-3" key={query}>
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <button
            className="flex-1 cursor-pointer text-left text-sm hover:underline"
            onClick={() => onSelect(query)}
            type="button"
          >
            {query}
          </button>
          <button
            aria-label={`Remove "${query}" from recent searches`}
            className="shrink-0 cursor-pointer rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            onClick={() => onRemove(query)}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <button
        className="flex cursor-pointer items-center gap-3 px-4 py-3 text-muted-foreground text-sm hover:text-foreground"
        onClick={onClear}
        type="button"
      >
        <X className="size-4" />
        Clear history
      </button>
    </div>
  );
};

interface SearchResultItemProps {
  story: CandidateStory;
  onSelect: () => void;
}

const SearchResultItem = ({ story, onSelect }: SearchResultItemProps) => {
  const domain = story.url
    ? new URL(story.url).hostname.replace("www.", "")
    : null;
  const timeAgo = relativeTime(story.time);

  return (
    <div className="flex items-start gap-3 border-border border-b px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1 text-muted-foreground text-xs">
          {domain && (
            <>
              <a
                className="hover:underline"
                href={story.url ?? undefined}
                onClick={(e) => e.stopPropagation()}
                rel="noopener noreferrer"
                target="_blank"
              >
                {domain}
              </a>
              <Dot />
            </>
          )}
          {story.by && (
            <>
              <a
                className="username hover:underline"
                href={`https://news.ycombinator.com/user?id=${story.by}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                {story.by}
              </a>
              <Dot />
            </>
          )}
          <span>{timeAgo}</span>
        </div>
        <button
          className="cursor-pointer text-left font-medium text-sm hover:underline"
          onClick={onSelect}
          type="button"
        >
          {story.title}
        </button>
        <button
          className="flex cursor-pointer items-center gap-x-3 pt-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
          onClick={onSelect}
          type="button"
        >
          {story.score > 0 && (
            <span>{story.score.toLocaleString()} points</span>
          )}
          {story.descendants > 0 && (
            <span>{story.descendants.toLocaleString()} comments</span>
          )}
        </button>
      </div>
    </div>
  );
};
