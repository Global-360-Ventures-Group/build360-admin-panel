"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const OPTIONS: { value: string; label: string; icon: LucideIcon; hint: string }[] =
  [
    {
      value: "system",
      label: "System",
      icon: Monitor,
      hint: "Follow the operating system",
    },
    { value: "light", label: "Light", icon: Sun, hint: "Always light" },
    { value: "dark", label: "Dark", icon: Moon, hint: "Always dark" },
  ];

/** Nothing to subscribe to — the store is "has this hydrated yet". */
const noSubscribe = () => () => {};

/**
 * False during the server render and the first client pass, true after.
 *
 * The usual `useState` + `useEffect` mounted flag does the same job, but
 * setting state inside an effect triggers a cascading render and this project
 * lints against it. `useSyncExternalStore` expresses the same idea as what it
 * actually is: one value on the server, another once hydrated.
 */
function useHydrated(): boolean {
  return React.useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

/**
 * The one setting on this page that actually saves.
 *
 * It is client-side, so the missing settings API costs it nothing — the choice
 * lives in `localStorage` and is applied as a class on `<html>` before paint.
 *
 * `next-themes` cannot know the resolved theme on the server, so the control
 * renders in a neutral, un-selected state until mounted. Marking the selection
 * before then would guarantee a hydration mismatch on exactly the element
 * whose whole job is to be correct.
 */
export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useHydrated();

  return (
    <div className="flex flex-col gap-3">
      <div
        role="radiogroup"
        aria-label="Colour theme"
        className="flex flex-wrap gap-2"
      >
        {OPTIONS.map((option) => {
          const selected = mounted && theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.hint}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "ring-1 ring-foreground/10 hover:bg-muted",
              )}
            >
              <option.icon className="size-4" />
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {mounted && theme === "system"
          ? `Following the system, which is currently ${resolvedTheme ?? "light"}.`
          : mounted
            ? "Saved in this browser."
            : " "}
      </p>
    </div>
  );
}
