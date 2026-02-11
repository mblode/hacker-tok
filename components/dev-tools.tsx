"use client";

import dynamic from "next/dynamic";

const Agentation = dynamic(
  () => import("agentation").then((m) => m.Agentation),
  { ssr: false }
);

export const DevTools = () => {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }
  return <Agentation />;
};
