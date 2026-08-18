"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SiteHeader() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4!" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem>
            {segments.length === 0 ? (
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            ) : (
              <BreadcrumbLink render={<Link href="/" />}>
                Dashboard
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {segments.map((seg, i) => {
            const href = "/" + segments.slice(0, i + 1).join("/");
            const isLast = i === segments.length - 1;
            return (
              <React.Fragment key={href}>
                <BreadcrumbSeparator className="hidden sm:block" />
                <BreadcrumbItem className="hidden sm:block">
                  {isLast ? (
                    <BreadcrumbPage className="truncate">
                      {titleCase(seg)}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink render={<Link href={href} />}>
                      {titleCase(seg)}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="h-8 w-48 pl-8 lg:w-64" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Notifications"
        >
          <Bell />
        </Button>
      </div>
    </header>
  );
}
