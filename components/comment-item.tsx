"use client";

import DOMPurify from "dompurify";
import { Bookmark, Heart } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { Dot } from "@/components/dot";
import { Button } from "@/components/ui/button";
import {
  addEvent,
  hasEventForComment,
  removeEventsByTypeAndComment,
} from "@/lib/events";
import type { HNComment } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

interface CommentItemProps {
  user: string;
  time: number;
  content: string;
  level: number;
  comments: HNComment[];
  postUser: string;
  postId: number;
  postTitle: string;
  id?: string | number;
}

export const CommentItem = ({
  user,
  time,
  content,
  level,
  comments,
  postUser,
  postId,
  postTitle,
  id,
}: CommentItemProps) => {
  const [hidden, setHidden] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const commentId = typeof id === "string" ? Number.parseInt(id, 10) : id;

  useEffect(() => {
    if (commentId == null) {
      return;
    }
    hasEventForComment("comment_like", commentId).then(setLiked);
    hasEventForComment("comment_bookmark", commentId).then(setBookmarked);
  }, [commentId]);

  const toggleLike = async () => {
    if (commentId == null) {
      return;
    }
    if (liked) {
      await removeEventsByTypeAndComment("comment_like", commentId);
      setLiked(false);
    } else {
      await addEvent({
        type: "comment_like",
        postId,
        commentId,
        commentUser: user,
        commentContent: content,
        commentTime: time,
        timestamp: Date.now(),
        score: 0,
        title: postTitle,
      });
      setLiked(true);
    }
  };

  const toggleBookmark = async () => {
    if (commentId == null) {
      return;
    }
    if (bookmarked) {
      await removeEventsByTypeAndComment("comment_bookmark", commentId);
      setBookmarked(false);
    } else {
      await addEvent({
        type: "comment_bookmark",
        postId,
        commentId,
        commentUser: user,
        commentContent: content,
        commentTime: time,
        timestamp: Date.now(),
        score: 0,
        title: postTitle,
      });
      setBookmarked(true);
    }
  };

  const toggleHidden = () => {
    setHidden((current) => !current);
  };

  const onToggleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleHidden();
  };

  const onToggleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    toggleHidden();
  };

  let commentLoop: ReactElement | null = null;

  if (comments.length > 0) {
    commentLoop = (
      <ul className="comment-list">
        {comments.map((ele) => {
          return (
            <CommentItem
              comments={ele.comments}
              content={ele.content}
              id={ele.id}
              key={ele.id}
              level={ele.level}
              postId={postId}
              postTitle={postTitle}
              postUser={postUser}
              time={ele.time}
              user={ele.user}
            />
          );
        })}
      </ul>
    );
  }

  return (
    <li className={cn("comment-wrap", { toggled: hidden })}>
      <div className={cn("comment", { toggled: hidden })} data-level={level}>
        <div
          aria-expanded={!hidden}
          className={cn("comment-toggle", { toggled: hidden })}
          onClick={onToggleClick}
          onKeyDown={onToggleKeyDown}
          role="button"
          tabIndex={0}
        >
          <a
            className={cn("username", {
              "text-orange-500!": user === postUser,
            })}
            href={`https://news.ycombinator.com/user?id=${user}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {user}
          </a>
          {user === postUser && (
            <span className="ml-1 text-orange-500 text-xs">OP</span>
          )}
          <Dot />
          <span className="mr-1 inline-block text-muted-foreground">
            {relativeTime(time)}
          </span>
          <Button
            aria-label="Bookmark comment"
            className="ml-auto min-h-9 min-w-9 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark();
            }}
            size="icon-sm"
            variant="ghost"
          >
            <Bookmark
              className={cn(
                "size-4",
                bookmarked
                  ? "bookmark-pop text-foreground"
                  : "text-muted-foreground"
              )}
              fill={bookmarked ? "currentColor" : "none"}
            />
          </Button>
          <Button
            aria-label="Like comment"
            className="min-h-9 min-w-9 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toggleLike();
            }}
            size="icon-sm"
            variant="ghost"
          >
            <Heart
              className={cn(
                "size-4",
                liked ? "like-pop text-foreground" : "text-muted-foreground"
              )}
              fill={liked ? "currentColor" : "none"}
            />
          </Button>
        </div>

        {!hidden && (
          <div
            className="content"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(content),
            }}
          />
        )}
      </div>

      {commentLoop}
    </li>
  );
};
