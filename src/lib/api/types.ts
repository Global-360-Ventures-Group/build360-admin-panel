/**
 * Wire types for the Build360 API, transcribed from its OpenAPI document at
 * `GET {BUILD360_API_URL}/v3/api-docs`.
 *
 * Response fields are optional here because the spec marks them so — it
 * declares no `required` array on any response schema. Rather than lie about
 * that, the raw shapes stay loose and `toAuthUser` narrows them once, at the
 * boundary, so the rest of the app works with fully-populated objects.
 */

/** Envelope wrapping every Build360 response, success or failure alike. */
export type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

/**
 * Shape of `data` when the API rejects a request with "Validation failed" —
 * the envelope's `data` becomes an array of per-field errors instead of the
 * endpoint's normal payload.
 */
export type ApiFieldError = {
  field?: string;
  message?: string;
};

/** `UserSummaryResponse` — the backoffice user profile, as sent by the API. */
export type UserSummaryResponse = {
  id?: string;
  username?: string;
  email?: string;
  fullName?: string;
  roles?: string[];
  permissions?: string[];
};

/** `UserAuthTokenResponse` — returned by both login and refresh-token. */
export type UserAuthTokenResponse = {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  /**
   * Access-token lifetime. The spec types this as int64 with no example and
   * no documented unit, so never use it raw — see `resolveExpiry` in
   * `@/lib/auth/tokens`.
   */
  expiresIn?: number;
  user?: UserSummaryResponse;
};

/**
 * A backoffice user after validation — every field is present, so UI code can
 * render it without a chain of `?.` and `??` fallbacks.
 */
export type AuthUser = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
};

/**
 * Narrow a raw `UserSummaryResponse` into an `AuthUser`, or return null if it
 * lacks the one field we genuinely cannot invent.
 */
export function toAuthUser(raw: UserSummaryResponse | undefined): AuthUser | null {
  if (!raw?.id) return null;

  return {
    id: raw.id,
    username: raw.username ?? "",
    email: raw.email ?? "",
    fullName: raw.fullName ?? "",
    roles: raw.roles ?? [],
    permissions: raw.permissions ?? [],
  };
}

/** Best available human label for a user, falling back down the fields we have. */
export function displayName(user: AuthUser): string {
  return user.fullName || user.username || user.email || "Unknown user";
}

/** Up-to-two-letter avatar fallback derived from the user's best label. */
export function initials(user: AuthUser): string {
  const source = displayName(user);
  const words = source.split(/[\s._-]+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
