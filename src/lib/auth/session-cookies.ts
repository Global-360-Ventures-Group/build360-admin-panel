/**
 * Definitions for the session cookies, kept free of any `next/headers` or
 * `next/server` imports.
 *
 * Two places write these cookies and they have different APIs available:
 * Server Actions and Route Handlers go through `cookies()`, while `proxy.ts`
 * writes to a `NextResponse`. Both consume the plain descriptors below, so the
 * names and options cannot drift apart between the two paths.
 *
 * The API does not send `Access-Control-Allow-Credentials`, so the browser can
 * never talk to it with cookies directly. That is why the tokens live in
 * first-party httpOnly cookies on *this* app and only ever reach the API from
 * the server, in an `Authorization` header — the browser never holds a token
 * where a cross-site script could read it.
 */

import type { UserAuthTokenResponse } from "@/lib/api/types";

import { resolveAccessTokenExpiry } from "./tokens";

export const ACCESS_TOKEN_COOKIE = "b360_at";
export const REFRESH_TOKEN_COOKIE = "b360_rt";
export const ACCESS_TOKEN_EXPIRY_COOKIE = "b360_at_exp";

export const SESSION_COOKIE_NAMES = [
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_EXPIRY_COOKIE,
] as const;

/**
 * How long the browser keeps the cookies. This is a ceiling, not the session
 * length — the API decides when the refresh token dies, and we clear the
 * cookies as soon as it tells us so.
 */
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  /** Access-token expiry as unix seconds. */
  accessTokenExpiresAt: number;
};

export type SessionCookieOptions = {
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};

export type SessionCookie = {
  name: string;
  value: string;
  options: SessionCookieOptions;
};

function cookieOptions(): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    // The panel is served over plain HTTP on the LAN in development; marking
    // the cookies Secure there would stop them being stored at all.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * Turn a login or refresh response into the tokens we persist, or null if the
 * API did not return the pair we need.
 */
export function sessionTokensFromAuthResponse(
  auth: UserAuthTokenResponse,
): SessionTokens | null {
  if (!auth.accessToken || !auth.refreshToken) return null;

  return {
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    accessTokenExpiresAt: resolveAccessTokenExpiry(auth.accessToken, auth.expiresIn),
  };
}

/** Cookie descriptors that persist `tokens`. */
export function sessionCookiesFor(tokens: SessionTokens): SessionCookie[] {
  const options = cookieOptions();

  return [
    { name: ACCESS_TOKEN_COOKIE, value: tokens.accessToken, options },
    { name: REFRESH_TOKEN_COOKIE, value: tokens.refreshToken, options },
    {
      name: ACCESS_TOKEN_EXPIRY_COOKIE,
      value: String(tokens.accessTokenExpiresAt),
      options,
    },
  ];
}

/**
 * Cookie descriptors that clear the session.
 *
 * These are empty-valued `maxAge: 0` cookies rather than deletions, because a
 * `NextResponse` has to send an explicit expiry to overwrite what the browser
 * already holds.
 */
export function expiredSessionCookies(): SessionCookie[] {
  const options = { ...cookieOptions(), maxAge: 0 };

  return SESSION_COOKIE_NAMES.map((name) => ({ name, value: "", options }));
}

/**
 * Assemble tokens from raw cookie values, or null if the session is
 * incomplete. A missing or unparseable expiry is reported as already expired
 * so the caller refreshes rather than trusting an unknown token.
 */
export function parseSessionTokens(
  accessToken: string | undefined,
  refreshToken: string | undefined,
  accessTokenExpiresAt: string | undefined,
): SessionTokens | null {
  if (!accessToken || !refreshToken) return null;

  const parsedExpiry = Number(accessTokenExpiresAt);

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: Number.isFinite(parsedExpiry) ? parsedExpiry : 0,
  };
}
