/**
 * The four Backoffice Authentication endpoints.
 *
 * Thin wrappers on purpose: they own the paths, request shapes and response
 * types so that no caller has to remember, for instance, that logout wants
 * the *refresh* token rather than the access token.
 */

import { apiRequest, apiRequestData } from "@/lib/api/client";
import {
  toAuthUser,
  type AuthUser,
  type UserAuthTokenResponse,
  type UserSummaryResponse,
} from "@/lib/api/types";

/**
 * `POST /auth/user/login` — exchange staff credentials for a token pair.
 *
 * `identifier` accepts either a username or an email address.
 *
 * @throws {ApiError} 401 "Invalid credentials", or 400 "Validation failed"
 *   with per-field errors
 */
export function loginUser(
  identifier: string,
  password: string,
): Promise<UserAuthTokenResponse> {
  return apiRequestData<UserAuthTokenResponse>("/auth/user/login", {
    method: "POST",
    body: { identifier, password },
  });
}

/**
 * `POST /auth/user/refresh-token` — trade a refresh token for a new pair.
 *
 * The refresh token rotates, and the API revokes every active token for the
 * user if a retired one is presented again. The returned refresh token must
 * therefore replace the old one before any further request is made with it;
 * losing the new value means losing the session.
 *
 * @throws {ApiError} 401 "Invalid refresh token"
 */
export function refreshUserTokens(refreshToken: string): Promise<UserAuthTokenResponse> {
  return apiRequestData<UserAuthTokenResponse>("/auth/user/refresh-token", {
    method: "POST",
    body: { refreshToken },
  });
}

/**
 * `POST /auth/user/logout` — revoke a refresh token.
 *
 * Idempotent: the API answers 200 even for a token it has never seen, so
 * callers do not need to special-case an already-dead session.
 */
export async function logoutUser(refreshToken: string): Promise<void> {
  await apiRequest("/auth/user/logout", {
    method: "POST",
    body: { refreshToken },
  });
}

/**
 * `GET /auth/user/me` — the signed-in user with effective roles and
 * permissions.
 *
 * Requires the Bearer token despite the OpenAPI document omitting a `security`
 * requirement on this one operation; the server really does answer 401
 * without it.
 *
 * @throws {ApiError} 401 when the access token is missing, expired or rejected
 */
export async function fetchCurrentUser(accessToken: string): Promise<AuthUser | null> {
  const user = await apiRequestData<UserSummaryResponse>("/auth/user/me", {
    accessToken,
  });

  return toAuthUser(user);
}
