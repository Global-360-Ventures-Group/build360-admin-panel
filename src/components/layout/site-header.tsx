"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserMenu } from "@/features/auth/user-menu";
import type { AuthUser } from "@/lib/api/types";

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type Crumb = { label: string; href: string };

/**
 * Split the path into the ancestor trail and the current page.
 *
 * The current page is shown as the header's title and the ancestors sit
 * beneath it, so the two are separated here rather than rendered as one flat
 * breadcrumb.
 */
function useCrumbs(): { title: string; trail: Crumb[] } {
  const pathname = usePathname();

  return React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 0) return { title: "Dashboard", trail: [] };

    const trail: Crumb[] = [{ label: "Dashboard", href: "/" }];
    for (let i = 0; i < segments.length - 1; i++) {
      trail.push({
        label: titleCase(segments[i]),
        href: "/" + segments.slice(0, i + 1).join("/"),
      });
    }

    return { title: titleCase(segments[segments.length - 1]), trail };
  }, [pathname]);
}

export function SiteHeader({ user }: { user: AuthUser }) {
  const { title, trail } = useCrumbs();

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h1 className="truncate text-sm leading-tight font-semibold">
          {title}
        </h1>
        {trail.length > 0 ? (
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList className="flex-nowrap gap-1 text-xs sm:gap-1">
              {trail.map((crumb) => (
                <React.Fragment key={crumb.href}>
                  <BreadcrumbItem>
                    <BreadcrumbLink render={<Link href={crumb.href} />}>
                      {crumb.label}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </React.Fragment>
              ))}
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label="Notifications"
        >
          <Bell />
          {/* Placeholder unread marker until notifications are wired up. */}
          <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6!" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
