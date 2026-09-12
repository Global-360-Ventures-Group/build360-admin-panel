/**
 * Replay-safe access-token renewal.
 *
 * The Build360 refresh token rotates, and the API treats a *retired* token
 * being presented again as a stolen-token signal: it revokes the whole chain,
 * including the freshly issued token that replaced it. Measured against the
 * live server:
 *
 *   refresh(RT0) -> ok, issues RT1
 *   refresh(RT0) -> 401 "Refresh token has been revoked"
 *   refresh(RT1) -> 401 "Refresh token has been revoked"   <- RT1 died too
 *
 * That makes an accidental replay fatal to the session, and the proxy has no
 * shortage of chances to cause one. It runs on every request — including the
 * prefetches Next.js fires for every `<Link>` in view — so a single navigation
 * can reach the server as several requests at once. They all carry the cookie
 * the browser held when they were *sent*, so once one of them rotates the
 * token, every request still in flight is carrying a retired one.
 *
 * Renewals are therefore keyed by the token presented, and the result is kept
 * for a grace window after it settles. A latecomer arriving with a token that
 * has already been rotated is handed the same replacement pair instead of
 * replaying it at the API, so the chain is never broken.
 *
 * Two limits worth knowing:
 *
 * - The cache is per server process. A deployment running several instances
 *   can still race across them, just far less often. The complete fix is a
 *   grace window on the API's own reuse detection, where a replay within a few
 *   seconds of rotation returns the current pair rather than revoking it.
 * - Nothing here keeps the *browser's* cookie in step. Whichever response
 *   lands last wins; they all carry the same pair, so that is harmless.
 */

import { ApiError, ApiUnreachableError } from "@/lib/api/errors";

import { refreshUserTokens } from "./api";
import { sessionTokensFromAuthResponse, type SessionTokens } from "./session-cookies";

export type RenewalOutcome =
  /** New tokens; persist them. */
  | { status: "renewed"; tokens: SessionTokens }
  /** The API rejected the token. The session is over. */
  | { status: "rejected" }
  /** The API could not answer. Says nothing about the session — keep it. */
  | { status: "unavailable" };

/**
 * How long a settled renewal answers for the token that produced it.
 *
 * It only has to outlive the requests that were already in flight when the
 * rotation happened, which is a matter of milliseconds. A minute is generous
 * on purpose, and costs nothing: the entry is bounded and the tokens inside it
 * are the ones the browser is about to be given anyway.
 */
const GRACE_MS = 60_000;

/** Ceiling on retained entries, so a burst of dead tokens cannot accumulate. */
const MAX_ENTRIES = 256;

type Renewal = {
  outcome: Promise<RenewalOutcome>;
  expiresAt: number;
};

const renewals = new Map<string, Renewal>();

/**
 * Renew the session behind `refreshToken`, at most once per token.
 *
 * Concurrent callers presenting the same token share one call to the API, and
 * callers arriving within the grace window afterwards get that same result.
 */
export async function renewSession(refreshToken: string): Promise<RenewalOutcome> {
  evictStale();

  const existing = renewals.get(refreshToken);
  if (existing) return existing.outcome;

  const outcome = performRenewal(refreshToken);
  // Recorded before the call is awaited, so a request arriving while it is
  // still in flight joins this one rather than starting a second.
  renewals.set(refreshToken, { outcome, expiresAt: Date.now() + GRACE_MS });

  const settled = await outcome;

  // A renewal or a rejection is a fact about this token and worth remembering.
  // "Unavailable" is not — it describes the API's mood a moment ago, and the
  // next request should be free to try again immediately.
  if (settled.status === "unavailable") renewals.delete(refreshToken);

  return settled;
}

async function performRenewal(refreshToken: string): Promise<RenewalOutcome> {
  try {
    const tokens = sessionTokensFromAuthResponse(await refreshUserTokens(refreshToken));

    // A 200 carrying no token pair leaves nothing to continue the session with.
    return tokens ? { status: "renewed", tokens } : { status: "rejected" };
  } catch (error) {
    if (error instanceof ApiUnreachableError) return { status: "unavailable" };

    // 401 for "Invalid refresh token" and "Refresh token has been revoked",
    // 400 for one that fails validation. None of the three can ever succeed on
    // a retry, so the session really is finished.
    if (error instanceof ApiError && (error.status === 401 || error.status === 400)) {
      return { status: "rejected" };
    }

    // A 500 or a gateway error says nothing about whether the session is
    // valid. Signing the user out over one would be the bug this file exists
    // to prevent.
    return { status: "unavailable" };
  }
}

/** Drop entries past their grace window, then any excess oldest-first. */
function evictStale() {
  const now = Date.now();

  for (const [token, renewal] of renewals) {
    if (renewal.expiresAt <= now) renewals.delete(token);
  }

  // A Map iterates in insertion order, so the front is the oldest.
  while (renewals.size > MAX_ENTRIES) {
    const oldest = renewals.keys().next();
    if (oldest.done) break;

    renewals.delete(oldest.value);
  }
}
