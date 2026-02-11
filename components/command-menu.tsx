"use client";

import {
  Bookmark,
  Heart,
  House,
  Keyboard,
  PanelLeft,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSidebar } from "@/components/ui/sidebar";

interface CommandMenuProps {
  onOpenKeyboardShortcuts?: () => void;
}

export const CommandMenu = ({ onOpenKeyboardShortcuts }: CommandMenuProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { toggleSidebar } = useSidebar();

  useHotkeys("mod+k", () => setOpen((prev) => !prev), {
    preventDefault: true,
  });

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
    }
  };

  return (
    <CommandDialog onOpenChange={handleOpenChange} open={open}>
      <CommandInput
        onValueChange={setQuery}
        placeholder="Search posts or type a command..."
        value={query}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {query.length > 0 && (
          <>
            <CommandGroup heading="Search">
              <CommandItem
                onSelect={() =>
                  runCommand(() =>
                    router.push(`/search?q=${encodeURIComponent(query)}`)
                  )
                }
                value={`search-posts-${query}`}
              >
                <Search />
                Search for &ldquo;{query}&rdquo;
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <House />
            For you
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/likes"))}>
            <Heart />
            Likes
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/bookmarks"))}
          >
            <Bookmark />
            Bookmarks
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/search"))}
          >
            <Search />
            Search
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => toggleSidebar())}>
            <PanelLeft />
            Toggle sidebar
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => onOpenKeyboardShortcuts?.())}
          >
            <Keyboard />
            Keyboard shortcuts
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
