"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-[calc(100dvh-16px)] flex-col overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
