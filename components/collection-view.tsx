"use client";

import { Bookmark, Heart, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PostViewer } from "@/components/post-viewer";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addEvent,
  getEventsByType,
  hasEventForComment,
  hasEventForPost,
  removeEventsByTypeAndComment,
  removeEventsByTypeAndPost,
} from "@/lib/events";
import type { CandidateStory, EventType, UserEvent } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { Dot } from "./dot";

const toCandidateStory = (e: UserEvent): CandidateStory => ({
  id: e.postId,
  title: e.title ?? "",
  url: e.url ?? null,
  by: e.by ?? "",
  time: Math.floor(e.timestamp / 1000),
  score: e.score,
  descendants: e.descendants ?? 0,
});

interface LikedComment {
  commentId: number;
  commentUser: string;
  commentContent: string;
  commentTime: number;
  postTitle: string;
  postId: number;
  timestamp: number;
}

const stripHtml = (html: string): string => {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? "";
};

interface CollectionViewProps {
  type: EventType;
  title: string;
  emptyMessage: string;
}

export const CollectionView = ({
  type,
  title,
  emptyMessage,
}: CollectionViewProps) => {
  const [candidates, setCandidates] = useState<CandidateStory[]>([]);
  const [likedComments, setLikedComments] = useState<LikedComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const showTabs = type === "like" || type === "bookmark";
  const commentEventType: EventType =
    type === "like" ? "comment_like" : "comment_bookmark";

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    const events = await getEventsByType(type);

    const seen = new Set<number>();
    const unique = events.filter((e) => {
      if (seen.has(e.postId)) {
        return false;
      }
      seen.add(e.postId);
      return true;
    });

    setCandidates(unique.map(toCandidateStory));

    if (showTabs) {
      const commentEvents = await getEventsByType(commentEventType);

      const seenComments = new Set<number>();
      const uniqueComments = commentEvents.filter((e) => {
        if (e.commentId == null || seenComments.has(e.commentId)) {
          return false;
        }
        seenComments.add(e.commentId);
        return true;
      });

      setLikedComments(
        uniqueComments.map((e) => ({
          commentId: e.commentId!,
          commentUser: e.commentUser ?? "",
          commentContent: e.commentContent ?? "",
          commentTime: e.commentTime ?? 0,
          postTitle: e.title ?? "",
          postId: e.postId,
          timestamp: e.timestamp,
        }))
      );
    }

    setIsLoading(false);
  }, [type, showTabs, commentEventType]);

  useEffect(() => {
    if (selectedIndex === null) {
      loadCandidates();
    }
  }, [selectedIndex, loadCandidates]);

  const handleRemove = async (postId: number) => {
    await removeEventsByTypeAndPost(type, postId);
    setCandidates((prev) => prev.filter((c) => c.id !== postId));
  };

  const handleRemoveComment = async (commentId: number) => {
    await removeEventsByTypeAndComment(commentEventType, commentId);
    setLikedComments((prev) => prev.filter((c) => c.commentId !== commentId));
  };

  const originPath = type === "bookmark" ? "/bookmarks" : "/likes";

  if (selectedIndex !== null) {
    return (
      <PostViewer
        initialCandidates={candidates}
        key={selectedIndex}
        mode="collection"
        onBack={() => setSelectedIndex(null)}
        originPath={originPath}
        startIndex={selectedIndex}
      />
    );
  }

  const postList = (
    <>
      {isLoading && <LoadingSpinner />}
      {!isLoading && candidates.length === 0 && (
        <EmptyState message={emptyMessage} />
      )}
      {!isLoading && candidates.length > 0 && (
        <div className="mx-auto max-w-[80ch] divide-y divide-border">
          {candidates.map((story, index) => (
            <CollectionItem
              collectionType={type}
              key={story.id}
              onRemove={handleRemove}
              onSelect={() => setSelectedIndex(index)}
              story={story}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-border border-b px-4 py-2">
        <SidebarTrigger className="md:hidden" />
        <h1 className="font-medium">{title}</h1>
      </header>
      {showTabs ? (
        <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="posts">
          <div className="shrink-0 border-border border-b px-4 py-1.5">
            <TabsList>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            className="min-h-0 flex-1 overflow-y-scroll"
            value="posts"
          >
            {postList}
          </TabsContent>
          <TabsContent
            className="min-h-0 flex-1 overflow-y-scroll"
            value="comments"
          >
            {isLoading && <LoadingSpinner />}
            {!isLoading && likedComments.length === 0 && (
              <EmptyState
                message={
                  type === "like"
                    ? "No liked comments yet. Like a comment by pressing the heart icon."
                    : "No bookmarked comments yet. Bookmark a comment by pressing the bookmark icon."
                }
              />
            )}
            {!isLoading && likedComments.length > 0 && (
              <div className="mx-auto max-w-[80ch] divide-y divide-border">
                {likedComments.map((comment) => (
                  <CommentCollectionItem
                    collectionType={type}
                    comment={comment}
                    key={comment.commentId}
                    onRemove={handleRemoveComment}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <main className="min-h-0 flex-1 overflow-y-scroll">{postList}</main>
      )}
    </>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin">
      <Loader2 className="size-6 text-muted-foreground" />
    </div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-1 items-center justify-center p-8">
    <p className="text-muted-foreground">{message}</p>
  </div>
);

interface CollectionItemProps {
  story: CandidateStory;
  collectionType: EventType;
  onSelect: () => void;
  onRemove: (postId: number) => void;
}

const CollectionItem = ({
  story,
  collectionType,
  onSelect,
  onRemove,
}: CollectionItemProps) => {
  const [otherActive, setOtherActive] = useState(false);

  const otherType: EventType = collectionType === "like" ? "bookmark" : "like";

  useEffect(() => {
    hasEventForPost(otherType, story.id).then(setOtherActive);
  }, [otherType, story.id]);

  const toggleOther = async () => {
    if (otherActive) {
      await removeEventsByTypeAndPost(otherType, story.id);
    } else {
      await addEvent({
        type: otherType,
        postId: story.id,
        timestamp: Date.now(),
        score: story.score,
        by: story.by,
        title: story.title,
        url: story.url,
        descendants: story.descendants,
      });
    }
    setOtherActive((prev) => !prev);
  };

  const isBookmarked = collectionType === "bookmark" ? true : otherActive;
  const isLiked = collectionType === "like" ? true : otherActive;

  const domain = story.url
    ? new URL(story.url).hostname.replace("www.", "")
    : null;
  const timeAgo = relativeTime(story.time);

  return (
    <div className="flex items-start gap-3 px-4 py-3">
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
      <Button
        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
        onClick={
          collectionType === "bookmark" ? () => onRemove(story.id) : toggleOther
        }
        size="icon-sm"
        variant="ghost"
      >
        <Bookmark
          className="size-4"
          fill={isBookmarked ? "currentColor" : "none"}
        />
      </Button>
      <Button
        aria-label={isLiked ? "Remove like" : "Like"}
        onClick={
          collectionType === "like" ? () => onRemove(story.id) : toggleOther
        }
        size="icon-sm"
        variant="ghost"
      >
        <Heart className="size-4" fill={isLiked ? "currentColor" : "none"} />
      </Button>
    </div>
  );
};

interface CommentCollectionItemProps {
  comment: LikedComment;
  collectionType: EventType;
  onRemove: (commentId: number) => void;
}

const CommentCollectionItem = ({
  comment,
  collectionType,
  onRemove,
}: CommentCollectionItemProps) => {
  const [otherActive, setOtherActive] = useState(false);

  const otherCommentType: EventType =
    collectionType === "like" ? "comment_bookmark" : "comment_like";

  useEffect(() => {
    hasEventForComment(otherCommentType, comment.commentId).then(
      setOtherActive
    );
  }, [otherCommentType, comment.commentId]);

  const toggleOther = async () => {
    if (otherActive) {
      await removeEventsByTypeAndComment(otherCommentType, comment.commentId);
    } else {
      await addEvent({
        type: otherCommentType,
        postId: comment.postId,
        timestamp: Date.now(),
        score: 0,
        commentId: comment.commentId,
        commentUser: comment.commentUser,
        commentContent: comment.commentContent,
        commentTime: comment.commentTime,
        title: comment.postTitle,
      });
    }
    setOtherActive((prev) => !prev);
  };

  const isBookmarked = collectionType === "bookmark" ? true : otherActive;
  const isLiked = collectionType === "like" ? true : otherActive;

  const timeAgo = comment.commentTime ? relativeTime(comment.commentTime) : "";
  const plainText = stripHtml(comment.commentContent);
  const truncated =
    plainText.length > 200 ? `${plainText.slice(0, 200)}…` : plainText;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1 text-muted-foreground text-xs">
          <a
            className="username hover:underline"
            href={`https://news.ycombinator.com/user?id=${comment.commentUser}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {comment.commentUser}
          </a>
          {timeAgo && (
            <>
              <Dot />
              <span>{timeAgo}</span>
            </>
          )}
          {comment.postTitle && (
            <>
              <Dot />
              <span>
                on:{" "}
                <a className="hover:underline" href={`/post/${comment.postId}`}>
                  {comment.postTitle}
                </a>
              </span>
            </>
          )}
        </div>
        <p className="pt-1 text-foreground text-sm">{truncated}</p>
      </div>
      <Button
        aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
        onClick={
          collectionType === "bookmark"
            ? () => onRemove(comment.commentId)
            : toggleOther
        }
        size="icon-sm"
        variant="ghost"
      >
        <Bookmark
          className="size-4"
          fill={isBookmarked ? "currentColor" : "none"}
        />
      </Button>
      <Button
        aria-label={isLiked ? "Remove like" : "Like"}
        onClick={
          collectionType === "like"
            ? () => onRemove(comment.commentId)
            : toggleOther
        }
        size="icon-sm"
        variant="ghost"
      >
        <Heart className="size-4" fill={isLiked ? "currentColor" : "none"} />
      </Button>
    </div>
  );
};
