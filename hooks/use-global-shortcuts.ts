"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

let _chordActive = false;
export const isChordActive = () => _chordActive;

export const useGlobalShortcuts = () => {
  const router = useRouter();
  const chordTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const clearChordTimeout = () => {
      if (chordTimeoutRef.current) {
        clearTimeout(chordTimeoutRef.current);
      }
    };

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (_chordActive) {
        clearChordTimeout();
        // Defer clearing so react-hotkeys-hook listeners in this tick see chord as active
        setTimeout(() => {
          _chordActive = false;
        }, 0);

        switch (e.key) {
          case "h":
            e.preventDefault();
            router.push("/");
            break;
          case "l":
            e.preventDefault();
            router.push("/likes");
            break;
          case "b":
            e.preventDefault();
            router.push("/bookmarks");
            break;
          case "n":
            e.preventDefault();
            router.push("/news");
            break;
          default:
            break;
        }
        return;
      }

      if (
        e.key === "g" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        _chordActive = true;
        chordTimeoutRef.current = setTimeout(() => {
          _chordActive = false;
        }, 1500);
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      clearChordTimeout();
      _chordActive = false;
    };
  }, [router]);
};
