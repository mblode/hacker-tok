"use client";

import {
  ArrowLeft,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Heart,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useDwellTime } from "@/hooks/use-dwell-time";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import {
  addEvent,
  getEvents,
  getSeenPostIds,
  removeEventsByTypeAndPost,
} from "@/lib/events";
import { deduplicateStories, fetchFeed } from "@/lib/hn-live";
import { extractDomain, rankCandidates } from "@/lib/ranking";
import { classifyTopics } from "@/lib/topics";
import type { CandidateStory, EventType } from "@/lib/types";

const LOAD_MORE_THRESHOLD = 10;
const MAX_BACKGROUND_PAGES = 4;

interface PostViewerProps {
  initialCandidates: CandidateStory[];
  mode?: "feed" | "collection";
  startIndex?: number;
  onBack?: () => void;
  originPath?: string;
}

export const PostViewer = ({
  initialCandidates,
  mode = "feed",
  startIndex = 0,
  onBack,
  originPath,
}: PostViewerProps) => {
  const isCollectionMode = mode === "collection";

  const [candidates, setCandidates] =
    useState<CandidateStory[]>(initialCandidates);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [animatingLike, setAnimatingLike] = useState(false);
  const [animatingBookmark, setAnimatingBookmark] = useState(false);

  useEffect(() => {
    const init = async () => {
      const [seen, events] = await Promise.all([getSeenPostIds(), getEvents()]);

      if (!isCollectionMode) {
        const unseen = initialCandidates.filter((c) => !seen.has(c.id));
        setCandidates(rankCandidates(unseen, events));
      }

      setLikedIds(
        new Set(events.filter((e) => e.type === "like").map((e) => e.postId))
      );
      setBookmarkedIds(
        new Set(
          events.filter((e) => e.type === "bookmark").map((e) => e.postId)
        )
      );
    };
    init();
  }, [initialCandidates, isCollectionMode]);

  useEffect(() => {
    if (isCollectionMode) {
      return;
    }

    let cancelled = false;

    const loadBackground = async () => {
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;

      const seen = await getSeenPostIds();
      const events = await getEvents();

      for (let page = 2; page <= MAX_BACKGROUND_PAGES; page++) {
        if (cancelled) {
          break;
        }

        const stories = await fetchFeed("news", page);
        if (stories.length === 0) {
          break;
        }

        nextPageRef.current = page + 1;

        setCandidates((prev) => {
          const merged = deduplicateStories([...prev, ...stories]);
          const newOnly = merged.slice(prev.length);
          if (newOnly.length === 0) {
            return prev;
          }

          const fresh = newOnly.filter((s) => !seen.has(s.id));
          const ranked = rankCandidates(fresh, events);
          if (ranked.length === 0) {
            return prev;
          }

          const currentIdx = indexRef.current;
          const kept = prev.slice(0, currentIdx + 1);
          const rest = [...prev.slice(currentIdx + 1), ...ranked];
          return [...kept, ...rankCandidates(rest, events)];
        });
      }

      loadingRef.current = false;
    };

    loadBackground();

    return () => {
      cancelled = true;
    };
  }, [isCollectionMode]);

  const candidateMap = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates]
  );
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const hasNavigated = useRef(false);
  const nextPageRef = useRef(2);
  const loadingRef = useRef(false);

  const indexRef = useRef(currentIndex);
  indexRef.current = currentIndex;

  const currentStory = candidates[currentIndex] as CandidateStory | undefined;

  const loadMoreIfNeeded = useCallback(
    (index: number) => {
      if (isCollectionMode) {
        return;
      }

      if (index < candidates.length - LOAD_MORE_THRESHOLD) {
        return;
      }

      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;
      const page = nextPageRef.current;
      nextPageRef.current = page + 1;

      fetchFeed("news", page).then(async (stories) => {
        if (stories.length > 0) {
          const seen = await getSeenPostIds();
          const events = await getEvents();
          setCandidates((prev) => {
            const merged = deduplicateStories([...prev, ...stories]);
            const newOnly = merged.slice(prev.length);
            if (newOnly.length === 0) {
              return prev;
            }
            const fresh = newOnly.filter((s) => !seen.has(s.id));
            const ranked = rankCandidates(fresh, events);
            if (ranked.length === 0) {
              return prev;
            }
            return [...prev, ...ranked];
          });
        }
        loadingRef.current = false;
      });
    },
    [candidates.length, isCollectionMode]
  );

  const rerankFrom = async (fromIndex: number) => {
    if (isCollectionMode) {
      return;
    }
    const events = await getEvents();
    setCandidates((prev) => {
      const seen = prev.slice(0, fromIndex);
      const unseen = prev.slice(fromIndex);
      return [...seen, ...rankCandidates(unseen, events)];
    });
  };

  const recordEvent = async (postId: number, eventType: EventType) => {
    const story = candidateMap.get(postId);
    if (!story) {
      return;
    }
    const domain = extractDomain(story.url);
    await addEvent({
      type: eventType,
      postId: story.id,
      timestamp: Date.now(),
      score: story.score,
      by: story.by,
      domain,
      title: story.title,
      url: story.url,
      descendants: story.descendants,
      topics: classifyTopics(story.title, domain ?? undefined),
    });
  };

  const dwellRef = useDwellTime(
    currentStory?.id ?? 0,
    currentStory?.score ?? 0,
    currentStory?.by ?? "",
    extractDomain(currentStory?.url ?? null),
    currentStory?.title,
    useCallback(async () => {
      if (isCollectionMode) {
        return;
      }
      const events = await getEvents();
      setCandidates((prev) => {
        const idx = indexRef.current + 1;
        const kept = prev.slice(0, idx);
        const rest = prev.slice(idx);
        return [...kept, ...rankCandidates(rest, events)];
      });
    }, [isCollectionMode])
  );

  const handleNext = () => {
    if (currentStory) {
      hasNavigated.current = true;
      if (!isCollectionMode) {
        const elapsed = dwellRef.current;
        recordEvent(currentStory.id, elapsed < 2000 ? "skip" : "navigate");
        rerankFrom(currentIndex + 2);
      }
      setAnimatingLike(false);
      setAnimatingBookmark(false);
      const nextIndex = Math.min(candidates.length - 1, currentIndex + 1);
      setCurrentIndex(nextIndex);
      loadMoreIfNeeded(nextIndex);
    }
  };

  const toggleEvent = async (
    type: "like" | "bookmark",
    ids: Set<number>,
    setIds: React.Dispatch<React.SetStateAction<Set<number>>>,
    setAnimating: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!currentStory) {
      return;
    }
    const id = currentStory.id;

    if (ids.has(id)) {
      setAnimating(false);
      await removeEventsByTypeAndPost(type, id);
      setIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      setAnimating(true);
      await recordEvent(id, type);
      rerankFrom(currentIndex + 1);
      setIds((prev) => new Set(prev).add(id));
    }
  };

  const handleLike = () =>
    toggleEvent("like", likedIds, setLikedIds, setAnimatingLike);
  const handleBookmark = () =>
    toggleEvent(
      "bookmark",
      bookmarkedIds,
      setBookmarkedIds,
      setAnimatingBookmark
    );

  const handleLinkClick = () => {
    if (currentStory) {
      recordEvent(currentStory.id, "click");
      rerankFrom(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    hasNavigated.current = true;
    setAnimatingLike(false);
    setAnimatingBookmark(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleBack = useCallback(() => {
    if (originPath) {
      window.history.replaceState(null, "", originPath);
    }
    onBack?.();
  }, [onBack, originPath]);

  const currentStoryId = currentStory?.id;
  useEffect(() => {
    if (!currentStoryId) {
      return;
    }
    if (mode === "feed" && !hasNavigated.current) {
      return;
    }
    window.history.replaceState(null, "", `/post/${currentStoryId}`);
  }, [currentStoryId, mode]);

  useKeyboardNavigation({
    onNext: handleNext,
    onPrevious: handlePrevious,
    onLike: handleLike,
    onBookmark: handleBookmark,
    onToggleShortcuts: () => setShortcutsOpen((prev) => !prev),
    onFocusSearch: () => {
      const input = document.querySelector<HTMLInputElement>(
        'input[type="search"]'
      );
      if (input) {
        input.focus();
      } else {
        window.location.href = "/search";
      }
    },
  });

  useEffect(() => {
    if (!onBack) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        handleBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack, handleBack]);

  if (!currentStory) {
    return (
      <>
        <header className="flex shrink-0 items-center gap-2 border-border border-b px-4 py-2">
          <SidebarTrigger className="md:hidden" />
          {onBack && (
            <Button
              aria-label="Back to list"
              onClick={handleBack}
              size="icon-sm"
              variant="ghost"
            >
              <ArrowLeft />
            </Button>
          )}
        </header>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">
            No more stories to show. Check back later.
          </p>
        </div>
      </>
    );
  }

  const bookmarked = bookmarkedIds.has(currentStory.id);
  const liked = likedIds.has(currentStory.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex + 1 < candidates.length;

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-border border-b px-4 py-2">
        <SidebarTrigger className="md:hidden" />
        {onBack && (
          <Button
            aria-label="Back to list"
            onClick={handleBack}
            size="icon-sm"
            variant="ghost"
          >
            <ArrowLeft />
          </Button>
        )}
        <h1 className="sr-only">HackerTok</h1>
        <div className="flex items-center">
          <Button
            aria-label="Bookmark post"
            onClick={handleBookmark}
            size="icon-sm"
            variant="ghost"
          >
            <Bookmark
              className={animatingBookmark ? "bookmark-pop" : undefined}
              fill={bookmarked ? "currentColor" : "none"}
            />
          </Button>
          <Button
            aria-label="Like post"
            onClick={handleLike}
            size="icon-sm"
            variant="ghost"
          >
            <Heart
              className={animatingLike ? "like-pop" : undefined}
              fill={liked ? "currentColor" : "none"}
            />
          </Button>
          <span className="text-muted-foreground text-sm tabular-nums">
            {currentStory.score.toLocaleString()}
          </span>
        </div>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <output aria-live="polite" className="text-sm">
            <span className="text-foreground">
              {(currentIndex + 1).toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              {" "}
              / {candidates.length.toLocaleString()}
            </span>
          </output>
          <div>
            <Button
              aria-label="Previous post"
              disabled={!hasPrevious}
              onClick={handlePrevious}
              size="icon-sm"
              variant="ghost"
            >
              <ChevronUp />
            </Button>
            <Button
              aria-label="Next post"
              disabled={!hasNext}
              onClick={handleNext}
              size="icon-sm"
              variant="ghost"
            >
              <ChevronDown />
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-scroll">
        <div className="mx-auto max-w-[80ch] px-4 pt-4 pb-24 md:pb-6">
          <PostCard
            hasNextPost={hasNext}
            onLinkClick={handleLinkClick}
            onNextPost={handleNext}
            story={currentStory}
          />
        </div>
      </main>
      <div
        className="slide-nav fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 p-1.5 font-medium md:hidden"
        data-slide-nav
      >
        <Button
          aria-label="Previous post"
          className="touch-manipulation rounded-full"
          disabled={!hasPrevious}
          onClick={handlePrevious}
          size="icon-sm"
          variant="ghost"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Button>
        <span
          aria-live="polite"
          className="min-w-14 text-center text-foreground/70 text-xs tabular-nums"
        >
          <span className="sr-only">Post </span>
          {currentIndex + 1}
          <span className="sr-only"> of </span>
          <span aria-hidden="true"> / </span>
          {candidates.length}
        </span>
        <Button
          aria-label="Next post"
          className="touch-manipulation rounded-full"
          disabled={!hasNext}
          onClick={handleNext}
          size="icon-sm"
          variant="ghost"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <KeyboardShortcutsDialog
        onOpenChange={setShortcutsOpen}
        open={shortcutsOpen}
      />
    </>
  );
};
