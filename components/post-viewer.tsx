"use client";

import { ChevronDown, ChevronUp, Heart } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useDwellTime } from "@/hooks/use-dwell-time";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { addEvent, getEvents, getSeenPostIds } from "@/lib/events";
import { deduplicateStories, fetchFeed } from "@/lib/hn-live";
import { extractDomain, rankCandidates } from "@/lib/ranking";
import { classifyTopics } from "@/lib/topics";
import type { CandidateStory, EventType } from "@/lib/types";

const LOAD_MORE_THRESHOLD = 10;

interface PostViewerProps {
  initialCandidates: CandidateStory[];
}

export const PostViewer = ({ initialCandidates }: PostViewerProps) => {
  const [candidates, setCandidates] = useState<CandidateStory[]>(() => {
    const seen = getSeenPostIds();
    const events = getEvents();
    const unseen = initialCandidates.filter((c) => !seen.has(c.id));
    const stale = initialCandidates.filter((c) => seen.has(c.id));
    return [
      ...rankCandidates(unseen, events),
      ...rankCandidates(stale, events),
    ];
  });
  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<number>>(() => {
    const events = getEvents();
    return new Set(
      events.filter((e) => e.type === "like").map((e) => e.postId)
    );
  });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const nextPageRef = useRef(2);
  const loadingRef = useRef(false);

  const indexRef = useRef(currentIndex);
  indexRef.current = currentIndex;

  const currentStory = candidates[currentIndex] as CandidateStory | undefined;

  const loadMoreIfNeeded = useCallback(
    (index: number) => {
      if (loadingRef.current) {
        return;
      }
      if (index < candidates.length - LOAD_MORE_THRESHOLD) {
        return;
      }

      loadingRef.current = true;
      const page = nextPageRef.current;
      nextPageRef.current = page + 1;

      fetchFeed("news", page).then((stories) => {
        if (stories.length > 0) {
          setCandidates((prev) => {
            const merged = deduplicateStories([...prev, ...stories]);
            const newOnly = merged.slice(prev.length);
            if (newOnly.length === 0) {
              return prev;
            }
            const seen = getSeenPostIds();
            const events = getEvents();
            const fresh = newOnly.filter((s) => !seen.has(s.id));
            const stale = newOnly.filter((s) => seen.has(s.id));
            const ranked = [
              ...rankCandidates(fresh, events),
              ...rankCandidates(stale, events),
            ];
            if (ranked.length === 0) {
              return prev;
            }
            return [...prev, ...ranked];
          });
        }
        loadingRef.current = false;
      });
    },
    [candidates.length]
  );

  const rerankFrom = (fromIndex: number) => {
    setCandidates((prev) => {
      const seen = prev.slice(0, fromIndex);
      const unseen = prev.slice(fromIndex);
      return [...seen, ...rankCandidates(unseen, getEvents())];
    });
  };

  const recordEvent = (postId: number, eventType: EventType) => {
    const story = candidateMap.get(postId);
    if (!story) {
      return;
    }
    addEvent({
      type: eventType,
      postId: story.id,
      timestamp: Date.now(),
      score: story.score,
      by: story.by,
      domain: extractDomain(story.url),
      title: story.title,
      topics: classifyTopics(
        story.title,
        extractDomain(story.url) ?? undefined
      ),
    });
  };

  const dwellRef = useDwellTime(
    currentStory?.id ?? 0,
    currentStory?.score ?? 0,
    currentStory?.by ?? "",
    extractDomain(currentStory?.url ?? null),
    currentStory?.title,
    useCallback(() => {
      setCandidates((prev) => {
        const idx = indexRef.current + 1;
        const kept = prev.slice(0, idx);
        const rest = prev.slice(idx);
        return [...kept, ...rankCandidates(rest, getEvents())];
      });
    }, [])
  );

  const handleNext = () => {
    if (currentStory) {
      const elapsed = dwellRef.current;
      recordEvent(currentStory.id, elapsed < 2000 ? "skip" : "navigate");
      const nextIndex = Math.min(candidates.length - 1, currentIndex + 1);
      rerankFrom(nextIndex + 1);
      setCurrentIndex(nextIndex);
      loadMoreIfNeeded(nextIndex);
    }
  };

  const handleLike = () => {
    if (!currentStory) {
      return;
    }
    const id = currentStory.id;
    const alreadyLiked = likedIds.has(id);

    if (alreadyLiked) {
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      recordEvent(id, "like");
      rerankFrom(currentIndex + 1);
      setLikedIds((prev) => new Set(prev).add(id));
    }
  };

  const handleLinkClick = () => {
    if (currentStory) {
      recordEvent(currentStory.id, "click");
      rerankFrom(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  useKeyboardNavigation({
    onNext: handleNext,
    onPrevious: handlePrevious,
    onLike: handleLike,
    onToggleShortcuts: () => setShortcutsOpen((prev) => !prev),
  });

  if (!currentStory) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <p className="text-muted-foreground">
          No more stories to show. Check back later!
        </p>
      </div>
    );
  }

  const liked = likedIds.has(currentStory.id);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-[calc(100dvh-16px)] flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 border-border border-b px-4 py-2">
          <SidebarTrigger />
          <h1 className="sr-only">HackerTok — Hacker News Feed</h1>
          <div className="flex items-center">
            <Button
              aria-label="Like post"
              onClick={handleLike}
              size="icon-sm"
              variant="ghost"
            >
              <Heart
                className={liked ? "like-pop" : undefined}
                fill={liked ? "currentColor" : "none"}
              />
            </Button>
            <span className="text-muted-foreground text-sm tabular-nums">
              {currentStory.score.toLocaleString()}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <output
              aria-live="polite"
              className="text-muted-foreground text-sm"
            >
              {(currentIndex + 1).toLocaleString()} /{" "}
              {candidates.length.toLocaleString()}
            </output>
            <Button
              aria-label="Previous post"
              disabled={currentIndex === 0}
              onClick={handlePrevious}
              size="icon-sm"
              variant="ghost"
            >
              <ChevronUp />
            </Button>
            <Button
              aria-label="Next post"
              disabled={currentIndex + 1 >= candidates.length}
              onClick={handleNext}
              size="icon-sm"
              variant="ghost"
            >
              <ChevronDown />
            </Button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-scroll">
          <div className="mx-auto max-w-[80ch] px-4 pt-4 pb-[60px]">
            <PostCard onLinkClick={handleLinkClick} story={currentStory} />
          </div>
        </main>
      </SidebarInset>
      <KeyboardShortcutsDialog
        onOpenChange={setShortcutsOpen}
        open={shortcutsOpen}
      />
    </SidebarProvider>
  );
};
