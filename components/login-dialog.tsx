"use client";

import { type FormEvent, useRef, useState } from "react";
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

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LoginDialog = ({ open, onOpenChange }: LoginDialogProps) => {
  const { login, loginMutation } = useHnAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!(username.trim() && password)) {
      setError("Username and password are required.");
      usernameRef.current?.focus();
      return;
    }

    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        setUsername("");
        setPassword("");
        setError(null);
        onOpenChange(false);
      } else {
        setError(result.error ?? "Login failed.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setError(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Log in to Hacker News</DialogTitle>
          <DialogDescription>
            Use your news.ycombinator.com credentials.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            aria-label="Username"
            autoComplete="username"
            autoFocus
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            ref={usernameRef}
            value={username}
          />
          <Input
            aria-label="Password"
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            value={password}
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
            <Button loading={loginMutation.isPending} type="submit">
              Log in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
