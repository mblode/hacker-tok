"use client";

import { useEffect, useState } from "react";
import { EVENTS_CHANGED_EVENT, getPostEventIdsByType } from "@/lib/events";

interface UseStoryEventsResult {
  likedPostIds: Set<number>;
  bookmarkedPostIds: Set<number>;
}

const filterVisibleIds = (
  source: Set<number>,
  visible: Set<number>
): Set<number> => {
  const next = new Set<number>();
  for (const id of source) {
    if (visible.has(id)) {
      next.add(id);
    }
  }
  return next;
};

export const useStoryEvents = (storyIds: number[]): UseStoryEventsResult => {
  const [likedPostIds, setLikedPostIds] = useState<Set<number>>(new Set());
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<number>>(
    new Set()
  );
  const storyIdsKey = storyIds.join(",");

  useEffect(() => {
    if (!storyIdsKey) {
      setLikedPostIds(new Set());
      setBookmarkedPostIds(new Set());
      return;
    }

    const visibleIds = new Set(
      storyIdsKey
        .split(",")
        .map((id) => Number.parseInt(id, 10))
        .filter((id) => Number.isFinite(id))
    );
    let cancelled = false;

    const loadStoryEvents = async () => {
      const [liked, bookmarked] = await Promise.all([
        getPostEventIdsByType("like"),
        getPostEventIdsByType("bookmark"),
      ]);
      if (cancelled) {
        return;
      }
      setLikedPostIds(filterVisibleIds(liked, visibleIds));
      setBookmarkedPostIds(filterVisibleIds(bookmarked, visibleIds));
    };

    loadStoryEvents().catch(() => {
      if (cancelled) {
        return;
      }
      setLikedPostIds(new Set());
      setBookmarkedPostIds(new Set());
    });

    const handleEventsChanged = () => {
      loadStoryEvents().catch(() => {
        if (cancelled) {
          return;
        }
        setLikedPostIds(new Set());
        setBookmarkedPostIds(new Set());
      });
    };

    window.addEventListener(EVENTS_CHANGED_EVENT, handleEventsChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(EVENTS_CHANGED_EVENT, handleEventsChanged);
    };
  }, [storyIdsKey]);

  return { likedPostIds, bookmarkedPostIds };
};
