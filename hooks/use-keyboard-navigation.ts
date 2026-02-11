"use client";

import { useEffect } from "react";

interface KeyboardHandlers {
  onNext: () => void;
  onPrevious: () => void;
  onLike: () => void;
  onBookmark: () => void;
  onFocusSearch?: () => void;
}

const IGNORED_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export const useKeyboardNavigation = (handlers: KeyboardHandlers): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const tag = document.activeElement?.tagName;
      if (tag && IGNORED_TAGS.has(tag)) {
        return;
      }

      switch (event.key) {
        case "j":
          event.preventDefault();
          handlers.onNext();
          break;
        case "k":
          event.preventDefault();
          handlers.onPrevious();
          break;
        case "l":
          event.preventDefault();
          handlers.onLike();
          break;
        case "b":
          event.preventDefault();
          handlers.onBookmark();
          break;
        case "/":
          event.preventDefault();
          handlers.onFocusSearch?.();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
};
