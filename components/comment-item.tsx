"use client";

import DOMPurify from "dompurify";
import { type ReactElement, useState } from "react";
import { Dot } from "@/components/dot";
import type { HNComment } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

interface CommentItemProps {
  comment: HNComment;
  postUser: string;
}

export const CommentItem = ({ comment, postUser }: CommentItemProps) => {
  const [hidden, setHidden] = useState(false);

  const onToggleClick = () => {
    setHidden((prev) => !prev);
  };

  let commentLoop: ReactElement | null = null;

  if (comment.comments.length > 0) {
    commentLoop = (
      <ul className="comment-list">
        {comment.comments.map((child) => (
          <CommentItem comment={child} key={child.id} postUser={postUser} />
        ))}
      </ul>
    );
  }

  return (
    <li className={cn("comment-wrap", { toggled: hidden })}>
      <div
        className={cn("comment", { toggled: hidden })}
        data-level={comment.level}
      >
        <div className={cn("comment-toggle", { toggled: hidden })}>
          <button
            aria-expanded={!hidden}
            aria-label={hidden ? "Expand comment" : "Collapse comment"}
            className="mr-1 inline-block text-muted-foreground text-xs"
            onClick={onToggleClick}
            type="button"
          >
            {hidden ? "[+]" : "[-]"}
          </button>
          <a
            className={cn("username", {
              "text-orange-500!": comment.user === postUser,
            })}
            href={`https://news.ycombinator.com/user?id=${comment.user}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {comment.user}
          </a>
          <Dot />
          <span className="mr-1 inline-block text-muted-foreground">
            {relativeTime(comment.time)}
          </span>
        </div>

        {!hidden && (
          <div
            className="content"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(comment.content),
            }}
          />
        )}
      </div>

      {commentLoop}
    </li>
  );
};
