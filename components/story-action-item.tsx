"use client";

import { Bookmark, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { StoryListItem } from "@/components/story-list-item";
import { Button } from "@/components/ui/button";
import { addEvent, removeEventsByTypeAndPost } from "@/lib/events";
import type { CandidateStory } from "@/lib/types";

interface StoryActionItemProps {
  story: CandidateStory;
  onSelect: () => void;
  initialLiked?: boolean;
  initialBookmarked?: boolean;
}

export const StoryActionItem = ({
  story,
  onSelect,
  initialLiked = false,
  initialBookmarked = false,
}: StoryActionItemProps) => {
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  const toggleLike = async () => {
    if (liked) {
      await removeEventsByTypeAndPost("like", story.id);
    } else {
      await addEvent({
        type: "like",
        postId: story.id,
        timestamp: Date.now(),
        score: story.score,
        by: story.by,
        title: story.title,
        url: story.url,
        descendants: story.descendants,
      });
    }
    setLiked((prev) => !prev);
  };

  const toggleBookmark = async () => {
    if (bookmarked) {
      await removeEventsByTypeAndPost("bookmark", story.id);
    } else {
      await addEvent({
        type: "bookmark",
        postId: story.id,
        timestamp: Date.now(),
        score: story.score,
        by: story.by,
        title: story.title,
        url: story.url,
        descendants: story.descendants,
      });
    }
    setBookmarked((prev) => !prev);
  };

  return (
    <StoryListItem onSelect={onSelect} story={story}>
      <Button
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
        onClick={toggleBookmark}
        size="icon-sm"
        variant="ghost"
      >
        <Bookmark
          className="size-4"
          fill={bookmarked ? "currentColor" : "none"}
        />
      </Button>
      <Button
        aria-label={liked ? "Remove like" : "Like"}
        onClick={toggleLike}
        size="icon-sm"
        variant="ghost"
      >
        <Heart className="size-4" fill={liked ? "currentColor" : "none"} />
      </Button>
    </StoryListItem>
  );
};
