"use client";

import { Home } from "lucide-react";
import Link from "next/link";
import { Kbd } from "@/components/ui/kbd";
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
} from "@/components/ui/sidebar";

export const AppSidebar = () => {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link className="px-2 py-1 font-semibold text-lg" href="/">
          HackerTok
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive>
                  <Link href="/">
                    <Home />
                    For You
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-1.5 px-2 py-1 text-muted-foreground text-xs">
          <div className="flex items-center gap-2">
            <Kbd>J</Kbd> Next
          </div>
          <div className="flex items-center gap-2">
            <Kbd>K</Kbd> Back
          </div>
          <div className="flex items-center gap-2">
            <Kbd>L</Kbd> Like
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
