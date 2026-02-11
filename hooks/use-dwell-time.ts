"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { addEvent } from "@/lib/events";

export const useDwellTime = (
  postId: number,
  score: number,
  by: string,
  domain?: string,
  title?: string,
  onDwell?: (dwellMs: number) => void
): React.RefObject<number> => {
  const startRef = useRef(Date.now());
  const elapsedRef = useRef(0);

  elapsedRef.current = Date.now() - startRef.current;

  useEffect(() => {
    startRef.current = Date.now();
    elapsedRef.current = 0;

    return () => {
      const dwellMs = Date.now() - startRef.current;
      if (dwellMs < 500) {
        return;
      }
      addEvent({
        type: "dwell",
        postId,
        timestamp: Date.now(),
        score,
        dwellMs,
        by,
        domain,
        title,
      }).catch(() => {});
      onDwell?.(dwellMs);
    };
  }, [postId, score, by, domain, title, onDwell]);

  return elapsedRef;
};
