"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useKeyboardShortcutsDialog } from "@/hooks/use-keyboard-shortcuts-dialog";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { open: shortcutsOpen, setOpen: setShortcutsOpen } =
    useKeyboardShortcutsDialog();

  return (
    <SidebarProvider>
      <AppSidebar
        setShortcutsOpen={setShortcutsOpen}
        shortcutsOpen={shortcutsOpen}
      />
      <SidebarInset className="flex h-dvh flex-col overflow-hidden md:h-[calc(100dvh-16px)]">
        {children}
      </SidebarInset>
      <CommandMenu onOpenKeyboardShortcuts={() => setShortcutsOpen(true)} />
    </SidebarProvider>
  );
}
