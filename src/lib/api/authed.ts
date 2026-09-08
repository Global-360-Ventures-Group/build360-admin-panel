/**
 * The Build360 client, bound to the caller's session.
 *
 * Feature code should reach the API through these helpers rather than calling
 * `apiRequest` with a token it fetched itself — that keeps the "where does the
 * token come from" answer in one place, and guarantees a dead session lands on
 * the login page instead of surfacing as a raw 401 inside a page render.
 */

import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/lib/auth/routes";
import { readSessionTokens } from "@/lib/auth/session";

import { apiRequest, type ApiRequestOptions } from "./client";
import { ApiError } from "./errors";
import type { ApiResponse } from "./types";

type AuthedOptions = Omit<ApiRequestOptions, "accessToken">;

/**
 * Call the API as the signed-in user.
 *
 * Redirects to the login page when there is no session, or when the API
 * rejects the token. `proxy.ts` keeps the access token fresh, so a 401 here
 * means the session is genuinely over rather than merely stale.
 *
 * @throws {ApiError} for every rejection other than 401 — including 403, which
 *   the caller should handle rather than treat as "signed out"
 */
export async function authedRequest<T>(
  path: string,
  options: AuthedOptions = {},
): Promise<ApiResponse<T>> {
  const tokens = await readSessionTokens();
  if (!tokens) redirect(LOGIN_PATH);

  try {
    return await apiRequest<T>(path, { ...options, accessToken: tokens.accessToken });
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) redirect(LOGIN_PATH);

    throw error;
  }
}

/** As `authedRequest`, for endpoints that must return a payload. */
export async function authedRequestData<T>(
  path: string,
  options: AuthedOptions = {},
): Promise<T> {
  const envelope = await authedRequest<T>(path, options);

  if (envelope.data === undefined || envelope.data === null) {
    throw new ApiError(
      envelope.message ?? "The API returned a successful response with no data.",
      200,
    );
  }

  return envelope.data;
}
