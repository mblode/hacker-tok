"use client";

import { useHotkeys } from "react-hotkeys-hook";
import { isChordActive } from "@/hooks/use-global-shortcuts";

interface KeyboardHandlers {
  onNext: () => void;
  onPrevious: () => void;
  onLike: () => void;
  onBookmark: () => void;
  onOpenLink?: () => void;
  onOpenHN?: () => void;
  onReply?: () => void;
  onFocusSearch?: () => void;
}

export const useKeyboardNavigation = (handlers: KeyboardHandlers): void => {
  const options = { preventDefault: true };

  useHotkeys(
    "j",
    () => {
      if (!isChordActive()) {
        handlers.onNext();
      }
    },
    options
  );
  useHotkeys(
    "k",
    () => {
      if (!isChordActive()) {
        handlers.onPrevious();
      }
    },
    options
  );
  useHotkeys(
    "l",
    () => {
      if (!isChordActive()) {
        handlers.onLike();
      }
    },
    options
  );
  useHotkeys(
    "b",
    () => {
      if (!isChordActive()) {
        handlers.onBookmark();
      }
    },
    options
  );
  useHotkeys(
    "o",
    () => {
      if (!isChordActive()) {
        handlers.onOpenLink?.();
      }
    },
    options
  );
  useHotkeys(
    "c",
    () => {
      if (!isChordActive()) {
        handlers.onOpenHN?.();
      }
    },
    options
  );
  useHotkeys(
    "r",
    () => {
      if (!isChordActive()) {
        handlers.onReply?.();
      }
    },
    options
  );
  useHotkeys(
    "slash",
    () => {
      if (!isChordActive()) {
        handlers.onFocusSearch?.();
      }
    },
    options
  );
};
