"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

/**
 * Applies the `.dark` class the theme is built around.
 *
 * `globals.css` defines a complete, separately-validated dark palette — its
 * own re-stepped chart hues, its own success/warning tokens, a lifted
 * `--primary` because white on the light brand step only reaches 3.77:1 — and
 * `@custom-variant dark (&:is(.dark *))` to switch on it. Until this provider
 * existed nothing ever put that class on the document, so every one of those
 * tokens was dead code and the panel was light-only.
 *
 * `next-themes` was already a dependency: the Sonner wrapper calls `useTheme`
 * to colour toasts, and without a provider it silently fell back to "system"
 * forever.
 *
 * The provider writes the class before paint, which the server cannot predict
 * — hence `suppressHydrationWarning` on `<html>` in the root layout. That
 * attribute is load-bearing, not a papered-over warning.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="class"
      // Light is what a first-time visitor gets, rather than whatever the OS
      // happens to prefer. "System" is still selectable on the settings
      // screen, and a stored choice always wins over this default.
      defaultTheme="light"
      enableSystem
      // The colour transition on a whole-page repaint reads as a flash rather
      // than as a transition.
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}
