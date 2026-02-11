"use client";

import {
  ArrowLeft,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
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

  const [candidates, setCandidates] = useState<CandidateStory[]>([]);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [animatingLike, setAnimatingLike] = useState(false);
  const [animatingBookmark, setAnimatingBookmark] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (isCollectionMode) {
        setCandidates(initialCandidates);
      } else {
        const [seen, events] = await Promise.all([
          getSeenPostIds(),
          getEvents(),
        ]);
        const unseen = initialCandidates.filter((c) => !seen.has(c.id));
        setCandidates(rankCandidates(unseen, events));
      }

      const allEvents = await getEvents();
      setLikedIds(
        new Set(allEvents.filter((e) => e.type === "like").map((e) => e.postId))
      );
      setBookmarkedIds(
        new Set(
          allEvents.filter((e) => e.type === "bookmark").map((e) => e.postId)
        )
      );
      setIsInitialized(true);
    };
    init();
  }, [initialCandidates, isCollectionMode]);

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
    if (!(currentStoryId && isInitialized)) {
      return;
    }
    if (mode === "feed" && !hasNavigated.current) {
      return;
    }
    window.history.replaceState(null, "", `/post/${currentStoryId}`);
  }, [currentStoryId, isInitialized, mode]);

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

  if (!isInitialized) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="animate-spin">
          <Loader2 className="size-6 text-muted-foreground" />
        </div>
      </div>
    );
  }

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
        <div className="ml-auto flex items-center gap-2">
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
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-scroll">
        <div className="mx-auto max-w-[80ch] px-4 pt-4 pb-[60px]">
          <PostCard onLinkClick={handleLinkClick} story={currentStory} />
        </div>
      </main>
      <KeyboardShortcutsDialog
        onOpenChange={setShortcutsOpen}
        open={shortcutsOpen}
      />
    </>
  );
};
