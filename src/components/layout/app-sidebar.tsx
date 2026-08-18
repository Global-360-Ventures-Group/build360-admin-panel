"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  FolderTree,
  ChevronRight,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  items?: { title: string; url: string }[];
};

const navMain: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
    items: [
      { title: "All Projects", url: "/projects" },
      { title: "Active", url: "/projects/active" },
      { title: "Archived", url: "/projects/archived" },
    ],
  },
  { title: "Products", url: "/products", icon: Package },
  { title: "Categories", url: "/categories", icon: FolderTree },
  { title: "Brands", url: "/brands", icon: Tags },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Users", url: "/users", icon: Users },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const navSettings: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Settings },
];

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.url === "/"
                ? pathname === "/"
                : pathname.startsWith(item.url);

            if (item.items?.length) {
              return (
                <Collapsible
                  key={item.title}
                  defaultOpen={isActive}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isActive}
                        />
                      }
                    >
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[panel-open]/collapsible:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((sub) => (
                          <SidebarMenuSubItem key={sub.title}>
                            <SidebarMenuSubButton
                              isActive={pathname === sub.url}
                              render={<Link href={sub.url} />}
                            >
                              <span>{sub.title}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={isActive}
                  render={<Link href={item.url} />}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function NavUser() {
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg">AD</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">Admin</span>
              <span className="truncate text-xs text-muted-foreground">
                admin@build360.com
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--anchor-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuItem>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Build360</span>
                <span className="truncate text-xs text-muted-foreground">
                  Admin Panel
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Main" items={navMain} />
        <NavGroup label="System" items={navSettings} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
