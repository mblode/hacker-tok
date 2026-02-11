"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  {
    section: "Navigation",
    items: [
      { label: "Next post", keys: ["J"] },
      { label: "Previous post", keys: ["K"] },
      { label: "Like post", keys: ["L"] },
      { label: "Bookmark post", keys: ["B"] },
      { label: "Focus search", keys: ["/"] },
      { label: "Toggle sidebar", keys: ["\u2318", "B"] },
    ],
  },
  {
    section: "General",
    items: [{ label: "Keyboard shortcuts", keys: ["\u2318", "/"] }],
  },
];

export const KeyboardShortcutsDialog = ({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) => {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          {shortcuts.map((group) => (
            <div key={group.section}>
              <h3 className="mb-3 font-medium text-muted-foreground text-sm">
                {group.section}
              </h3>
              <div className="flex flex-col gap-2">
                {group.items.map((shortcut) => (
                  <div
                    className="flex items-center justify-between"
                    key={shortcut.label}
                  >
                    <span className="text-sm">{shortcut.label}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
