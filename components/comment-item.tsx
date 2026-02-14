"use client";

import { Bookmark, Heart, MessageSquare } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { CommentReplyForm } from "@/components/comment-reply-form";
import { Dot } from "@/components/dot";
import { Button } from "@/components/ui/button";
import { useHnAuth } from "@/hooks/use-hn-auth";
import { useHnVote } from "@/hooks/use-hn-vote";
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
  const [sanitizedHtml, setSanitizedHtml] = useState("");
  const [replying, setReplying] = useState(false);
  const { isAuthenticated, username } = useHnAuth();
  const { vote } = useHnVote();

  const commentId = typeof id === "string" ? Number.parseInt(id, 10) : id;

  useEffect(() => {
    if (hidden) {
      return;
    }
    import("dompurify").then(({ default: DOMPurify }) => {
      setSanitizedHtml(DOMPurify.sanitize(content));
    });
  }, [content, hidden]);

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

      if (isAuthenticated) {
        vote(commentId);
      }
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

  const isCurrentUser = isAuthenticated && username === user;

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
        {/* biome-ignore lint/a11y/useSemanticElements: Header wraps a link; avoid nesting interactive elements. */}
        <header
          aria-expanded={!hidden}
          className={cn("comment-toggle", { toggled: hidden })}
          onClick={onToggleClick}
          onKeyDown={onToggleKeyDown}
          role="button"
          tabIndex={0}
        >
          <div>
            <a
              className={cn("username", {
                "text-orange-500!": user === postUser,
                "text-blue-500!": isCurrentUser && user !== postUser,
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
            {isCurrentUser && user !== postUser && (
              <span className="ml-1 text-blue-500 text-xs">You</span>
            )}
            <Dot />
            <span className="mr-1 inline-block text-muted-foreground">
              {relativeTime(time)}
            </span>
          </div>

          <div className="relative -right-1.5">
            {isAuthenticated && commentId != null && (
              <Button
                aria-label="Reply to comment"
                className="cursor-pointer p-1.5!"
                onClick={(e) => {
                  e.stopPropagation();
                  setReplying((prev) => !prev);
                }}
                size="icon-sm"
                variant="ghost"
              >
                <MessageSquare
                  className={cn(
                    "size-4",
                    replying ? "text-foreground" : "text-muted-foreground"
                  )}
                />
              </Button>
            )}
            <Button
              aria-label="Bookmark comment"
              className="cursor-pointer p-1.5!"
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
              className="cursor-pointer p-1.5!"
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
        </header>

        {!hidden && sanitizedHtml && (
          <div
            className="content"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        )}

        {!hidden && replying && commentId != null && (
          <CommentReplyForm
            onCancel={() => setReplying(false)}
            onSuccess={() => setReplying(false)}
            parentId={commentId}
            postId={postId}
          />
        )}
      </div>

      {commentLoop}
    </li>
  );
};
