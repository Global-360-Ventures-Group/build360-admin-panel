/**
 * Route protection and access-token renewal.
 *
 * (In Next.js 16 this file convention is `proxy.ts`; it was called
 * `middleware.ts` in earlier versions.)
 *
 * Two jobs, and it is worth being explicit about why they are both here.
 *
 * **Renewal.** Next.js only allows cookies to be written from a Server Action
 * or a Route Handler, never during a Server Component render. The Build360
 * refresh token also *rotates*, and the API revokes every active token for the
 * user if a retired one is ever presented again. Put together, refreshing
 * during a page render is not an option: we would receive a new refresh token
 * with no way to persist it, and the next request would replay the retired one
 * and destroy the session. The proxy is the one place that runs before the
 * render and can still set cookies, so it is the only safe home for this.
 *
 * Being here keeps the parallel data fetches inside a single render from each
 * starting their own refresh — but it does *not* make renewal single-flight,
 * because the proxy runs once per request and one navigation arrives as
 * several requests, prefetches included. Deduplicating those is the job of
 * `renewSession`, and skipping it costs the user their session; see the
 * comment in `@/lib/auth/refresh`.
 *
 * **Protection.** This is an optimistic check only — it reads the cookie and
 * redirects, and never asks the API whether the user is authorised. Real
 * checks live next to the data, in `@/lib/auth/dal`, which every page and
 * Server Action goes through.
 */

import { NextResponse, type NextRequest } from "next/server";

import { renewSession } from "@/lib/auth/refresh";
import {
  DASHBOARD_PATH,
  LOGIN_PATH,
  loginPathWithReturnTo,
} from "@/lib/auth/routes";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_EXPIRY_COOKIE,
  REFRESH_TOKEN_COOKIE,
  expiredSessionCookies,
  parseSessionTokens,
  sessionCookiesFor,
  type SessionTokens,
} from "@/lib/auth/session-cookies";
import { isExpiringSoon } from "@/lib/auth/tokens";

export async function proxy(request: NextRequest) {
  const isLoginRoute = request.nextUrl.pathname === LOGIN_PATH;

  const tokens = parseSessionTokens(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value,
    request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
    request.cookies.get(ACCESS_TOKEN_EXPIRY_COOKIE)?.value,
  );

  if (!tokens) {
    return isLoginRoute ? NextResponse.next() : rejectUnauthenticated(request);
  }

  if (!isExpiringSoon(tokens.accessTokenExpiresAt)) {
    return isLoginRoute ? redirectToDashboard(request) : NextResponse.next();
  }

  const renewal = await renewSession(tokens.refreshToken);

  // A transient outage is not the same as a rejected session. If the API could
  // not answer, leave the cookies alone and let the request through — the
  // page's own data fetch will surface the failure — rather than signing the
  // user out over a blip.
  if (renewal.status === "unavailable") return NextResponse.next();

  // The API refused the refresh token, so the session is genuinely over.
  if (renewal.status === "rejected") return endSession(request, isLoginRoute);

  return applyRenewedSession(request, renewal.tokens, isLoginRoute);
}

/**
 * Store the rotated tokens and continue.
 *
 * The request cookies are updated *before* the response is created, because
 * `NextResponse.next({ request })` snapshots the request headers at that
 * moment. Without this the current render would still read the previous
 * access token and get a 401 from the API.
 */
function applyRenewedSession(
  request: NextRequest,
  tokens: SessionTokens,
  isLoginRoute: boolean,
) {
  const cookies = sessionCookiesFor(tokens);

  for (const cookie of cookies) {
    request.cookies.set(cookie.name, cookie.value);
  }

  const response = isLoginRoute
    ? redirectToDashboard(request)
    : NextResponse.next({ request });

  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

/**
 * Clear the dead session, then send the visitor to the login page.
 *
 * Logged because reaching here should be rare and is otherwise invisible: with
 * renewals deduplicated it means the API genuinely refused the refresh token,
 * not that two requests raced each other. A run of these is the signal that
 * something is ending sessions early.
 */
function endSession(request: NextRequest, isLoginRoute: boolean) {
  console.warn(
    `[auth] Session ended: the API rejected the refresh token (${request.nextUrl.pathname}).`,
  );

  const response = isLoginRoute
    ? NextResponse.next()
    : rejectUnauthenticated(request);

  for (const cookie of expiredSessionCookies()) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

/**
 * Turn away an unauthenticated request.
 *
 * Route Handlers get a JSON 401 in the API's own envelope shape — redirecting
 * a `fetch()` to an HTML login page would hand the caller a confusing 200 with
 * a page body instead of a usable error.
 */
function rejectUnauthenticated(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  return NextResponse.redirect(
    new URL(loginPathWithReturnTo(pathname, search), request.url),
  );
}

function redirectToDashboard(request: NextRequest) {
  return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
}

export const config = {
  // Everything except static assets and uploaded media, which are public and
  // must not be redirected — an auth redirect on a stylesheet or an image
  // breaks the login page it is trying to show.
  matcher: [
    "/((?!_next/static|_next/image|uploads/|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
