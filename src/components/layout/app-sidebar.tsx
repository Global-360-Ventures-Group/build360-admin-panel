"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  FolderTree,
  House,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TicketPercent,
  Undo2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

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

type NavItem = { title: string; url: string; icon: LucideIcon };

/**
 * One flat list, no group headings — the trail from "what happened today" to
 * "who did it" reads top to bottom. Categories and Brands sit next to Products
 * because all three edit the same catalogue.
 */
const navItems: NavItem[] = [
  { title: "Dashboard", url: "/", icon: House },
  { title: "Orders", url: "/orders", icon: ShoppingCart },
  { title: "Refunds", url: "/refunds", icon: Undo2 },
  { title: "Customers", url: "/users", icon: Users },
  { title: "Products", url: "/products", icon: Package },
  { title: "Categories", url: "/categories", icon: FolderTree },
  { title: "Brands", url: "/brands", icon: Tags },
  { title: "Inventory", url: "/inventory", icon: Boxes },
  { title: "Coupons", url: "/coupons", icon: TicketPercent },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Staff", url: "/staff", icon: UserRound },
  { title: "Roles", url: "/roles", icon: ShieldCheck },
  { title: "Settings", url: "/settings", icon: Settings },
];

/**
 * The primitive's default active state is the soft `sidebar-accent` tint; the
 * brand wants a solid red pill. tailwind-merge drops the resting tint on its
 * own, but `hover:` and `active:` carry different modifiers so they survive
 * the merge — without repainting them too, clicking the current page would
 * flash pink. Both overrides are emitted later in the sheet at equal
 * specificity, so they win.
 */
const activeItemClass =
  "h-9 rounded-lg data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground data-active:active:bg-sidebar-primary data-active:active:text-sidebar-primary-foreground";

/** Hexagon mark with a building cut out of it — the logo's red badge. */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M12 1.2 21.8 6.8v11.4L12 22.8 2.2 18.2V6.8z" className="fill-primary" />
      <path
        d="M7.8 17.2V10l4.2-2.6 4.2 2.6v7.2h-2.7v-3.5h-3v3.5z"
        className="fill-sidebar"
      />
    </svg>
  );
}

/** Faint skyline behind the footer card; decorative only. */
function Skyline({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 40" fill="currentColor" aria-hidden className={className}>
      <rect x="2" y="18" width="18" height="22" rx="1.5" />
      <rect x="24" y="6" width="16" height="34" rx="1.5" />
      <rect x="44" y="21" width="14" height="19" rx="1.5" />
      <rect x="62" y="12" width="18" height="28" rx="1.5" />
      <rect x="84" y="25" width="10" height="15" rx="1.5" />
    </svg>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    // The variant prefix is repeated so tailwind-merge actually drops the
    // primitive's `group-data-[side=left]:border-r`; a bare `border-r-0`
    // would sit alongside it instead of replacing it. Nothing is lost: the
    // page canvas behind it is tinted, so the edge still reads.
    <Sidebar
      collapsible="icon"
      className="group-data-[side=left]:border-r-0"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              // The lockup is a link, not a control — it should not light up
              // like a nav row on hover.
              className="gap-2.5 hover:bg-transparent active:bg-transparent"
              render={<Link href="/" />}
            >
              {/* `size-8!` beats the menu button's own `[&_svg]:size-4`. */}
              <BrandMark className="size-8! shrink-0" />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-base font-bold tracking-tight">
                  BUILD <span className="text-primary">360</span>
                </span>
                <span className="truncate text-[9px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Build today, a better tomorrow
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.url === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className={activeItemClass}
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
      </SidebarContent>

      {/* No account block here on purpose — the header's user menu already
          carries the identity, roles and log-out. */}
      <SidebarFooter>
        <div className="relative overflow-hidden rounded-lg bg-muted/70 px-3 pt-11 pb-3 group-data-[collapsible=icon]:hidden">
          <Skyline className="pointer-events-none absolute -top-1 left-1/2 h-14 w-28 -translate-x-1/2 text-foreground/10" />
          <p className="relative text-xs leading-snug font-medium">
            Quality Products
          </p>
          <p className="relative text-xs leading-snug font-medium">
            Stronger Communities
          </p>
          <p className="relative mt-1.5 text-xs font-bold tracking-tight">
            BUILD <span className="text-primary">360</span>
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
