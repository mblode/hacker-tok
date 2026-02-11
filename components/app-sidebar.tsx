"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

export const AppSidebar = () => {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="px-2 py-1 font-semibold text-lg">HackerTok</div>
      </SidebarHeader>
      <SidebarContent />
      <SidebarFooter>
        <div className="px-2 py-1 text-muted-foreground text-xs">
          <span className="font-mono">J</span> next{" "}
          <span className="font-mono">K</span> back{" "}
          <span className="font-mono">L</span> like
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
