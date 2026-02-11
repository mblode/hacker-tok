"use client";

import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export const useKeyboardShortcutsDialog = () => {
  const [open, setOpen] = useState(false);

  useHotkeys("mod+slash", () => setOpen((prev) => !prev), {
    preventDefault: true,
  });

  return { open, setOpen };
};
