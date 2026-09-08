"use client";

import { useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/auth/actions";

/**
 * Log-out entry for a dropdown menu.
 *
 * The server action is invoked directly inside a transition rather than by
 * wrapping the menu item in a `<form>`: the action finishes with a redirect,
 * which React applies from the transition, and this leaves the menu's own
 * click and keyboard handling untouched.
 *
 * The menu is held open (`closeOnClick={false}`) while the request is in
 * flight, otherwise the pending state would unmount before it is ever seen.
 */
export function LogoutMenuItem() {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      variant="destructive"
      disabled={pending}
      closeOnClick={false}
      onClick={() =>
        startTransition(async () => {
          await logout();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
      {pending ? "Signing out..." : "Log out"}
    </DropdownMenuItem>
  );
}
