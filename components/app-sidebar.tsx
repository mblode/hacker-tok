"use client";

import { Bookmark, Heart, House, Newspaper, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";

interface AppSidebarProps {
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}

export const AppSidebar = ({
  shortcutsOpen,
  setShortcutsOpen,
}: AppSidebarProps) => {
  const pathname = usePathname();
  useGlobalShortcuts();

  const isHome = pathname === "/";
  const isNews = pathname === "/news";
  const isLikes = pathname === "/likes";
  const isBookmarks = pathname === "/bookmarks";

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center justify-between py-1 pr-1 pl-2">
          <Link className="font-semibold text-lg" href="/">
            HackerTok
          </Link>
          <Button asChild size="icon-sm" variant="ghost">
            <Link href="/search">
              <Search className="size-4" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isHome}>
                  <Link href="/">
                    <House strokeWidth={isHome ? 2.5 : 1.5} />
                    For you
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isNews}>
                  <Link href="/news">
                    <Newspaper strokeWidth={isNews ? 2.5 : 1.5} />
                    News
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isLikes}>
                  <Link href="/likes">
                    <Heart strokeWidth={isLikes ? 2.5 : 1.5} />
                    Likes
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isBookmarks}>
                  <Link href="/bookmarks">
                    <Bookmark strokeWidth={isBookmarks ? 2.5 : 1.5} />
                    Bookmarks
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <button
          aria-label="Keyboard shortcuts"
          className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-sidebar-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          onClick={() => setShortcutsOpen(true)}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="size-4"
            fill="currentColor"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M7.569 9.75c-.332 0-.614-.27-.578-.6.021-.188.061-.372.136-.62q.158-.51.447-.82a3.4 3.4 0 0 1 .703-.577q.284-.182.507-.396.229-.219.358-.486a1.4 1.4 0 0 0 .13-.606 1.2 1.2 0 0 0-.171-.653 1.2 1.2 0 0 0-.466-.429 1.36 1.36 0 0 0-.647-.152q-.33 0-.628.148a1.23 1.23 0 0 0-.587.622c-.123.295-.367.555-.686.555h-.472c-.337 0-.616-.28-.55-.611q.103-.513.363-.905a2.55 2.55 0 0 1 1.08-.915A3.6 3.6 0 0 1 7.998 3q.888 0 1.563.32.68.319 1.057.91.382.586.382 1.392 0 .543-.172.972a2.4 2.4 0 0 1-.48.763 3.5 3.5 0 0 1-.74.595 3.2 3.2 0 0 0-.62.496 1.7 1.7 0 0 0-.353.605l-.034.106c-.1.316-.35.591-.682.591zM8.75 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0" />
          </svg>
        </button>
        <KeyboardShortcutsDialog
          onOpenChange={setShortcutsOpen}
          open={shortcutsOpen}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
