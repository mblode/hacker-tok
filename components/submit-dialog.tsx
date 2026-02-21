"use client";

import { CheckCircle2 } from "lucide-react";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useHnAuth } from "@/hooks/use-hn-auth";
import { useHnSubmit } from "@/hooks/use-hn-submit";

interface SubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SubmitDialog = ({ open, onOpenChange }: SubmitDialogProps) => {
  const { isAuthenticated } = useHnAuth();
  const { submit, isSubmitting } = useHnSubmit();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      titleRef.current?.focus();
      return;
    }

    if (!(url.trim() || text.trim())) {
      setError("Either a URL or text is required.");
      return;
    }

    try {
      const result = await submit({
        title: title.trim(),
        url: url.trim() || undefined,
        text: text.trim() || undefined,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error ?? "Submission failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTitle("");
      setUrl("");
      setText("");
      setError(null);
      setSuccess(false);
    }
    onOpenChange(next);
  };

  const handleTextKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="size-8 text-green-500" />
            <p className="font-medium">Story submitted!</p>
            <Button onClick={() => handleOpenChange(false)} variant="outline">
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Submit to Hacker News</DialogTitle>
              <DialogDescription>
                Share a link or start a discussion.
              </DialogDescription>
            </DialogHeader>
            <form className="grid gap-4" onSubmit={handleSubmit} ref={formRef}>
              <Input
                aria-label="Title"
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                ref={titleRef}
                required
                value={title}
              />
              <Input
                aria-label="URL (optional)"
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URL (optional)"
                type="url"
                value={url}
              />
              <p className="text-muted-foreground text-xs">
                Leave URL blank for Ask HN or text posts. If URL is provided,
                text is ignored.
              </p>
              <textarea
                aria-label="Text (for Ask HN / Show HN posts)"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-ring/30 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                disabled={!!url.trim()}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleTextKeyDown}
                placeholder="Text (for Ask HN / Show HN posts)"
                rows={4}
                value={text}
              />
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  onClick={() => handleOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button loading={isSubmitting} type="submit">
                  Submit
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
