/**
 * Data access layer for the signed-in user.
 *
 * Every page, layout and Server Action that needs identity or a permission
 * check goes through here, so authorisation lives next to the data rather
 * than being spread across the UI. `proxy.ts` also redirects unauthenticated
 * visitors, but that is only an optimistic cookie check — these functions are
 * the ones that actually ask the API who the caller is.
 */

import { cache } from "react";
import { redirect } from "next/navigation";

import { ApiError } from "@/lib/api/errors";
import type { AuthUser } from "@/lib/api/types";

import { fetchCurrentUser } from "./api";
import { LOGIN_PATH } from "./routes";
import { readSessionTokens } from "./session";

/**
 * The signed-in user, or null if there is no usable session.
 *
 * Wrapped in React's `cache` so that a layout, a page and any number of
 * components can each call it during one render and only one `/auth/user/me`
 * request is actually made.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const tokens = await readSessionTokens();
  if (!tokens) return null;

  try {
    return await fetchCurrentUser(tokens.accessToken);
  } catch (error) {
    // A rejected token means "not signed in", which is a normal state and the
    // caller's business. Anything else — the API being down, a 500 — is a
    // genuine fault and must not be disguised as a logged-out user.
    if (error instanceof ApiError && error.isUnauthorized) return null;

    throw error;
  }
});

/**
 * The signed-in user, redirecting to the login page if there is not one.
 *
 * Use this in pages and Server Actions. Server Actions are reachable by direct
 * POST, so they must each verify the session themselves instead of trusting
 * that the proxy ran.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_PATH);

  return user;
}

/** Whether the user holds a specific permission from `/auth/user/me`. */
export function hasPermission(user: AuthUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

/** Whether the user holds any one of `permissions`. */
export function hasAnyPermission(user: AuthUser, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/** Whether the user holds a specific role from `/auth/user/me`. */
export function hasRole(user: AuthUser, role: string): boolean {
  return user.roles.includes(role);
}
