"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
      { label: "Open link", keys: ["O"] },
      { label: "Open on Hacker News", keys: ["C"] },
    ],
  },
  {
    section: "Actions",
    items: [
      { label: "Like post", keys: ["L"] },
      { label: "Bookmark post", keys: ["B"] },
    ],
  },
  {
    section: "Go to",
    items: [
      { label: "Home", keys: ["G", "then", "H"] },
      { label: "Likes", keys: ["G", "then", "L"] },
      { label: "Bookmarks", keys: ["G", "then", "B"] },
    ],
  },
  {
    section: "General",
    items: [
      { label: "Open search", keys: ["/"] },
      { label: "Command menu", keys: ["\u2318", "K"] },
      { label: "Keyboard shortcuts", keys: ["\u2318", "/"] },
      { label: "Toggle sidebar", keys: ["\u2318", "B"] },
      { label: "Go back", keys: ["Esc"] },
    ],
  },
];

export const KeyboardShortcutsDialog = ({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) => {
  const [search, setSearch] = useState("");

  const filtered = shortcuts
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.label.toLowerCase().includes(search.toLowerCase()) ||
          item.keys.some((key) =>
            key.toLowerCase().includes(search.toLowerCase())
          )
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <Dialog
      onOpenChange={(next) => {
        onOpenChange(next);
        setSearch("");
      }}
      open={open}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shortcuts"
              value={search}
            />
          </div>
          <div className="flex max-h-[60vh] flex-col gap-6 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-muted-foreground text-sm">
                No shortcuts found
              </p>
            )}
            {filtered.map((group) => (
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
                        {shortcut.keys.map((key) =>
                          key === "then" ? (
                            <span
                              className="text-muted-foreground text-xs"
                              key={`${shortcut.label}-then`}
                            >
                              then
                            </span>
                          ) : (
                            <Kbd key={`${shortcut.label}-${key}`}>{key}</Kbd>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-muted-foreground text-xs">
          Created by{" "}
          <a
            className="underline hover:text-foreground"
            href="https://matthewblode.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            Matthew Blode
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
};
