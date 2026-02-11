"use client";

import DOMPurify from "dompurify";
import { Heart } from "lucide-react";
import { type ReactElement, useState } from "react";
import { Dot } from "@/components/dot";
import { Button } from "@/components/ui/button";
import type { HNComment } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

interface CommentItemProps {
  user: string;
  time: number;
  content: string;
  level: number;
  comments: HNComment[];
  postUser: string;
  id?: string | number;
}

export const CommentItem = ({
  user,
  time,
  content,
  level,
  comments,
  postUser,
}: CommentItemProps) => {
  const [hidden, setHidden] = useState(false);
  const [liked, setLiked] = useState(false);

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
            aria-label="Like comment"
            className="ml-auto min-h-9 min-w-9 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setLiked((prev) => !prev);
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
