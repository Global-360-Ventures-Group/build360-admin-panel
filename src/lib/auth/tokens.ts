/**
 * Working out when a backoffice access token expires.
 *
 * This is fiddlier than it should be. The API returns `expiresIn` as an int64
 * with no documented unit and no example, so taking it at face value risks
 * being wrong by a factor of 1000 in either direction. The access token is
 * declared as a JWT though, and a JWT's `exp` claim is unambiguous (seconds
 * since the epoch, per RFC 7519), so we prefer the claim and treat
 * `expiresIn` as a fallback.
 */

/**
 * Refresh this many seconds before the token actually expires, so a request
 * that is already in flight cannot arrive after expiry.
 */
export const REFRESH_SKEW_SECONDS = 60;

/**
 * Assumed lifetime when the token is not a readable JWT *and* `expiresIn` is
 * missing. Deliberately short: refreshing too eagerly costs one extra call,
 * whereas assuming too long hands the user a dead session.
 */
const FALLBACK_LIFETIME_SECONDS = 300;

/**
 * Above this, `expiresIn` cannot plausibly be seconds — that would be a
 * 27-hour access token — so it is read as milliseconds instead.
 */
const MILLISECONDS_THRESHOLD = 100_000;

/** Current time as unix seconds, matching the units of a JWT `exp` claim. */
export function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Read the `exp` claim out of a JWT without verifying its signature.
 *
 * Not verifying is fine here: we are not making a trust decision, only
 * scheduling a refresh. The API remains the authority on whether a token is
 * actually valid, and it rejects anything it does not like with a 401.
 *
 * @returns expiry as unix seconds, or null if the token is not a JWT with a
 *   numeric `exp`
 */
export function decodeJwtExpiry(token: string): number | null {
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  try {
    const payload: unknown = JSON.parse(
      Buffer.from(segments[1], "base64url").toString("utf8"),
    );

    if (typeof payload !== "object" || payload === null) return null;

    const exp = (payload as { exp?: unknown }).exp;

    return typeof exp === "number" && Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

/**
 * Absolute expiry (unix seconds) for a freshly issued access token, from the
 * token's own `exp` claim where possible and `expiresIn` otherwise.
 */
export function resolveAccessTokenExpiry(
  accessToken: string,
  expiresIn: number | undefined,
): number {
  const claimedExpiry = decodeJwtExpiry(accessToken);
  if (claimedExpiry !== null) return claimedExpiry;

  return nowInSeconds() + normaliseExpiresIn(expiresIn);
}

/** Whether a token at `expiresAt` should be refreshed now. */
export function isExpiringSoon(expiresAt: number): boolean {
  return expiresAt - REFRESH_SKEW_SECONDS <= nowInSeconds();
}

/** Coerce the API's unit-less `expiresIn` into seconds. */
function normaliseExpiresIn(expiresIn: number | undefined): number {
  if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return FALLBACK_LIFETIME_SECONDS;
  }

  return expiresIn > MILLISECONDS_THRESHOLD
    ? Math.floor(expiresIn / 1000)
    : Math.floor(expiresIn);
}
