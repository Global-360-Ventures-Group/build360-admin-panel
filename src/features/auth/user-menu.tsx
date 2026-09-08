"use client";

import Link from "next/link";
import { ChevronDown, Settings } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { displayName, initials, type AuthUser } from "@/lib/api/types";

import { LogoutMenuItem } from "./logout-menu-item";

/**
 * Signed-in user control for the top bar: avatar and name, opening a menu with
 * the full identity, the user's roles and the log-out action.
 */
export function UserMenu({ user }: { user: AuthUser }) {
  const name = displayName(user);
  const roles = user.roles.join(", ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-8 items-center gap-2 rounded-md px-1.5 text-sm outline-hidden hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-accent"
            aria-label={`Account menu for ${name}`}
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback>{initials(user)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate font-medium sm:inline">
          {name}
        </span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-56" align="end" sideOffset={8}>
        <div className="flex items-center gap-2 px-1.5 py-1.5">
          <Avatar>
            <AvatarFallback>{initials(user)}</AvatarFallback>
          </Avatar>
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{name}</span>
            {user.email ? (
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            ) : null}
          </div>
        </div>

        {roles ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-1.5 py-1">
              <p className="text-xs text-muted-foreground">
                {user.roles.length === 1 ? "Role" : "Roles"}
              </p>
              <p className="truncate text-sm">{roles}</p>
            </div>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <LogoutMenuItem />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
