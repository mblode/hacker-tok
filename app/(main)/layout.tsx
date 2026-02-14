"use client";

import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";
import { LoginDialog } from "@/components/login-dialog";
import { SubmitDialog } from "@/components/submit-dialog";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { HnAuthProvider } from "@/hooks/use-hn-auth";
import { useKeyboardShortcutsDialog } from "@/hooks/use-keyboard-shortcuts-dialog";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { open: shortcutsOpen, setOpen: setShortcutsOpen } =
    useKeyboardShortcutsDialog();
  const [loginOpen, setLoginOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  return (
    <HnAuthProvider>
      <SidebarProvider>
        <AppSidebar
          onOpenLogin={() => setLoginOpen(true)}
          onOpenSubmit={() => setSubmitOpen(true)}
          setShortcutsOpen={setShortcutsOpen}
          shortcutsOpen={shortcutsOpen}
        />
        <SidebarInset className="flex h-dvh flex-col overflow-hidden md:h-[calc(100dvh-16px)]">
          {children}
        </SidebarInset>
        <CommandMenu
          onOpenKeyboardShortcuts={() => setShortcutsOpen(true)}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenSubmit={() => setSubmitOpen(true)}
        />
      </SidebarProvider>
      <LoginDialog onOpenChange={setLoginOpen} open={loginOpen} />
      <SubmitDialog onOpenChange={setSubmitOpen} open={submitOpen} />
    </HnAuthProvider>
  );
}
