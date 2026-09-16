"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Sub-navigation for the delivery section.
 *
 * Five screens behind one sidebar entry, because they are one job: what you
 * can book, when, and where from. Splitting them into five sidebar rows would
 * bury the rest of the panel under delivery config.
 */
const tabs = [
  { href: "/delivery", label: "Methods" },
  { href: "/delivery/slots", label: "Time slots" },
  { href: "/delivery/pickup-locations", label: "Pickup locations" },
  { href: "/delivery/calendar", label: "Calendar" },
  { href: "/delivery/restrictions", label: "Restrictions" },
] as const;

export function DeliveryNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Delivery settings"
      // Scrolls rather than wraps: five tabs do not fit a phone, and a second
      // row of tabs reads as a second, unrelated navigation.
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
    >
      {tabs.map((tab) => {
        // `/delivery` is the section root, so it only matches exactly —
        // otherwise every child route would light up two tabs.
        const active =
          tab.href === "/delivery"
            ? pathname === "/delivery"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
