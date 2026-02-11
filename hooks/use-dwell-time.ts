"use client";

import { useEffect, useRef } from "react";
import { addEvent } from "@/lib/events";

export const useDwellTime = (postId: number, score: number): void => {
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();

    return () => {
      const dwellMs = Date.now() - startRef.current;
      addEvent({
        type: "dwell",
        postId,
        timestamp: Date.now(),
        score,
        dwellMs,
      });
    };
  }, [postId, score]);
};
