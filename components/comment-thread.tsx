"use client";

import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { CommentItem } from "@/components/comment-item";
import { CommentReplyForm } from "@/components/comment-reply-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useComments } from "@/hooks/use-comments";
import { useHnAuth } from "@/hooks/use-hn-auth";

interface CommentThreadProps {
  postId: number;
  postUser: string;
  postTitle: string;
}

const SKELETON_DELAY_MS = 200;

export const CommentThread = ({
  postId,
  postUser,
  postTitle,
}: CommentThreadProps) => {
  const { comments, isLoading, error, retry } = useComments(postId);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showTopReply, setShowTopReply] = useState(false);
  const { isAuthenticated } = useHnAuth();

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
      <div>
        <div className="text-muted-foreground text-sm" role="alert">
          {error}.{" "}
          <Button onClick={retry} size="xs" variant="ghost">
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isAuthenticated && (
        <div className="mb-4">
          {showTopReply ? (
            <CommentReplyForm
              onCancel={() => setShowTopReply(false)}
              onSuccess={() => setShowTopReply(false)}
              parentId={postId}
              postId={postId}
            />
          ) : (
            <Button
              data-reply-button
              onClick={() => setShowTopReply(true)}
              size="sm"
              variant="outline"
            >
              <MessageSquare className="size-4" />
              Add a comment
            </Button>
          )}
        </div>
      )}

      {comments.length === 0 ? (
        <div className="text-muted-foreground text-sm">No comments yet.</div>
      ) : (
        <ul className="m-0 p-0">
          {comments.map((comment) => (
            <CommentItem
              comments={comment.comments}
              content={comment.content}
              id={comment.id}
              key={comment.id}
              level={comment.level}
              postId={postId}
              postTitle={postTitle}
              postUser={postUser}
              time={comment.time}
              user={comment.user}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
