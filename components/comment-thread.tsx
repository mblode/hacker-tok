"use client";

import { useEffect, useState } from "react";
import { CommentItem } from "@/components/comment-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useComments } from "@/hooks/use-comments";

interface CommentThreadProps {
  postId: number;
  postUser: string;
}

const SKELETON_DELAY_MS = 200;

export const CommentThread = ({ postId, postUser }: CommentThreadProps) => {
  const { comments, commentsCount, isLoading, error, retry } =
    useComments(postId);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), SKELETON_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading) {
    if (!showSkeleton) {
      return null;
    }
    return (
      <ul className="m-0 p-0">
        {["a", "b", "c", "d"].map((id) => (
          <li className="comment-wrap" key={id}>
            <div className="comment">
              <div className="comment-toggle">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-14" />
                </div>
              </div>
              <div className="content">
                <Skeleton className="mb-2 h-6 w-full" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <div className="text-muted-foreground text-sm" role="alert">
        {error}.{" "}
        <Button onClick={retry} size="xs" variant="ghost">
          Try again
        </Button>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">No comments yet.</div>
    );
  }

  return (
    <>
      <ul className="m-0 p-0">
        {comments.map((comment) => (
          <CommentItem
            comments={comment.comments}
            content={comment.content}
            id={comment.id}
            key={comment.id}
            level={comment.level}
            postUser={postUser}
            time={comment.time}
            user={comment.user}
          />
        ))}
      </ul>
    </>
  );
};
