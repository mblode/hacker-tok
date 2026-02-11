"use client";

import { ChevronDown, ChevronUp, Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { PostCard } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useDwellTime } from "@/hooks/use-dwell-time";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { addEvent, getEvents } from "@/lib/events";
import { rankCandidates } from "@/lib/ranking";
import type { CandidateStory, EventType } from "@/lib/types";

interface PostViewerProps {
  initialCandidates: CandidateStory[];
}

export const PostViewer = ({ initialCandidates }: PostViewerProps) => {
  const [candidates] = useState<CandidateStory[]>(() =>
    rankCandidates(initialCandidates, [])
  );
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

  const currentStory = candidates[currentIndex] as CandidateStory | undefined;

  useEffect(() => {
    if (!currentStory) {
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("post", String(currentStory.id));
    window.history.replaceState(null, "", url);
  }, [currentStory]);

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
    });
  };

  const handleNext = () => {
    if (currentStory) {
      recordEvent(currentStory.id, "skip");
      setCurrentIndex((prev) => Math.min(candidates.length - 1, prev + 1));
    }
  };

  const handleLike = () => {
    if (currentStory) {
      recordEvent(currentStory.id, "like");
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.add(currentStory.id);
        return next;
      });
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  useKeyboardNavigation({
    onNext: handleNext,
    onPrevious: handlePrevious,
    onLike: handleLike,
  });
  useDwellTime(currentStory?.id ?? 0, currentStory?.score ?? 0);

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
        <header className="flex shrink-0 items-center justify-between gap-2 border-border border-b px-4 py-2">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <output
              aria-live="polite"
              className="text-muted-foreground text-sm"
            >
              {currentIndex + 1} / {candidates.length}
            </output>
            <Button
              aria-label="Like post"
              onClick={handleLike}
              size="icon-sm"
              variant="ghost"
            >
              <Heart fill={liked ? "currentColor" : "none"} />
            </Button>
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
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-[80ch] px-4 pt-4 pb-[60px]">
            <PostCard story={currentStory} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
