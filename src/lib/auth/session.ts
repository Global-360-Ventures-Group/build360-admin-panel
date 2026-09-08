/**
 * Reading and writing the session cookies from Server Components, Server
 * Actions and Route Handlers.
 *
 * Note the asymmetry, which is a Next.js constraint rather than a choice:
 * cookies can be *read* anywhere on the server but only *written* from a
 * Server Action or a Route Handler, because a Server Component render has
 * already begun streaming by the time it could set a header. This is exactly
 * why the token refresh lives in `proxy.ts` — see the comment there.
 */

import { cookies } from "next/headers";

import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_EXPIRY_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE_NAMES,
  parseSessionTokens,
  sessionCookiesFor,
  type SessionTokens,
} from "./session-cookies";

/** The current session's tokens, or null if the visitor is not signed in. */
export async function readSessionTokens(): Promise<SessionTokens | null> {
  const cookieStore = await cookies();

  return parseSessionTokens(
    cookieStore.get(ACCESS_TOKEN_COOKIE)?.value,
    cookieStore.get(REFRESH_TOKEN_COOKIE)?.value,
    cookieStore.get(ACCESS_TOKEN_EXPIRY_COOKIE)?.value,
  );
}

/**
 * Persist `tokens` as the current session.
 *
 * Only valid inside a Server Action or Route Handler.
 */
export async function writeSessionTokens(tokens: SessionTokens): Promise<void> {
  const cookieStore = await cookies();

  for (const cookie of sessionCookiesFor(tokens)) {
    cookieStore.set(cookie.name, cookie.value, cookie.options);
  }
}

/**
 * Drop the session cookies.
 *
 * Only valid inside a Server Action or Route Handler.
 */
export async function clearSessionTokens(): Promise<void> {
  const cookieStore = await cookies();

  for (const name of SESSION_COOKIE_NAMES) {
    cookieStore.delete(name);
  }
}
