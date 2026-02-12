"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { PostViewer } from "@/components/post-viewer";
import { StoryActionItem } from "@/components/story-action-item";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isChordActive } from "@/hooks/use-global-shortcuts";
import { type FeedType, useNewsFeed } from "@/hooks/use-news-feed";

const FEED_TABS: { label: string; value: FeedType }[] = [
  { label: "Top", value: "news" },
  { label: "New", value: "newest" },
  { label: "Show", value: "show" },
  { label: "Ask", value: "ask" },
  { label: "Jobs", value: "jobs" },
];

interface NewsFeedProps {
  type: FeedType;
}

export const NewsFeed = ({ type }: NewsFeedProps) => {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { stories, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useNewsFeed({ type });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const previousTypeRef = useRef<FeedType | null>(null);

  // Tab switching shortcuts (1-5) — only active in list view
  const listVisible = selectedIndex === null;
  const hotkeyOptions = { preventDefault: true, enabled: listVisible };
  useHotkeys(
    "1",
    () => {
      if (!isChordActive()) {
        router.push("/news");
      }
    },
    hotkeyOptions
  );
  useHotkeys(
    "2",
    () => {
      if (!isChordActive()) {
        router.push("/news?type=newest");
      }
    },
    hotkeyOptions
  );
  useHotkeys(
    "3",
    () => {
      if (!isChordActive()) {
        router.push("/news?type=show");
      }
    },
    hotkeyOptions
  );
  useHotkeys(
    "4",
    () => {
      if (!isChordActive()) {
        router.push("/news?type=ask");
      }
    },
    hotkeyOptions
  );
  useHotkeys(
    "5",
    () => {
      if (!isChordActive()) {
        router.push("/news?type=jobs");
      }
    },
    hotkeyOptions
  );

  // Reset state when feed type changes
  useEffect(() => {
    if (previousTypeRef.current !== null && previousTypeRef.current !== type) {
      setSelectedIndex(null);
    }
    previousTypeRef.current = type;
  }, [type]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleTabChange = (value: string) => {
    if (value === "news") {
      router.push("/news");
    } else {
      router.push(`/news?type=${value}`);
    }
  };

  const originPath = type === "news" ? "/news" : `/news?type=${type}`;

  if (selectedIndex !== null && stories.length > 0) {
    return (
      <PostViewer
        initialCandidates={stories}
        key={`${type}-${selectedIndex}`}
        mode="collection"
        onBack={() => setSelectedIndex(null)}
        onLoadMore={() => fetchNextPage()}
        originPath={originPath}
        startIndex={selectedIndex}
      />
    );
  }

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-border border-b px-4 py-2">
        <SidebarTrigger className="md:hidden" />
        <h1 className="font-medium text-sm">News</h1>
      </header>
      <div className="shrink-0 border-border border-b px-4 py-2">
        <Tabs onValueChange={handleTabChange} value={type}>
          <TabsList>
            {FEED_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <main className="min-h-0 flex-1 overflow-y-scroll">
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin">
              <Loader2 className="size-6 text-muted-foreground" />
            </div>
          </div>
        )}
        {!isLoading && stories.length === 0 && (
          <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">No stories found</p>
          </div>
        )}
        {stories.length > 0 && (
          <div className="mx-auto max-w-[80ch] pb-8">
            {stories.map((story, index) => (
              <StoryActionItem
                key={story.id}
                onSelect={() => setSelectedIndex(index)}
                story={story}
              />
            ))}
            <div ref={sentinelRef} />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin">
                  <Loader2 className="size-5 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
};
