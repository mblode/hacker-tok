"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { useHnComment } from "@/hooks/use-hn-comment";

interface CommentReplyFormProps {
  parentId: number;
  postId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CommentReplyForm = ({
  parentId,
  postId,
  onSuccess,
  onCancel,
}: CommentReplyFormProps) => {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { submitComment, isSubmitting } = useHnComment(postId);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!text.trim() || isSubmitting) {
        return;
      }
      setError(null);

      try {
        const result = await submitComment(parentId, text.trim());
        if (result.success) {
          setText("");
          onSuccess();
        } else {
          setError(result.error ?? "Failed to post reply.");
        }
      } catch {
        setError("Network error. Please try again.");
      }
    },
    [text, isSubmitting, parentId, submitComment, onSuccess]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const stopProp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: stops event bubbling to parent post navigation
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: stops event bubbling to parent post navigation
    <div
      className="mt-3 mb-1 rounded-lg border border-border bg-background p-3"
      onClick={stopProp}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit} ref={formRef}>
        <textarea
          aria-label="Write a reply"
          autoFocus
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-ring/30 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a reply..."
          rows={3}
          value={text}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground text-xs tabular-nums">
            {text.length} characters
          </span>
          <div className="flex gap-2">
            <Button
              disabled={isSubmitting}
              onClick={onCancel}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!text.trim()}
              loading={isSubmitting}
              size="sm"
              type="submit"
            >
              Reply
            </Button>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
};
