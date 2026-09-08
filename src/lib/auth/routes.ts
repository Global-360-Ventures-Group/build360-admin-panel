/** Route constants and redirect helpers shared by the proxy, the DAL and the login page. */

export const LOGIN_PATH = "/login";
export const DASHBOARD_PATH = "/";

/** Query parameter carrying the page the visitor was trying to reach. */
export const RETURN_TO_PARAM = "next";

/**
 * Validate a `?next=` value before redirecting to it.
 *
 * Only same-origin absolute paths are allowed. Anything else — an absolute
 * URL, a protocol-relative `//evil.example.com`, a backslash variant some
 * browsers normalise to `//` — is discarded in favour of the dashboard, so
 * the login flow cannot be turned into an open redirect.
 */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value) return DASHBOARD_PATH;
  if (!value.startsWith("/")) return DASHBOARD_PATH;
  if (value.startsWith("//") || value.startsWith("/\\")) return DASHBOARD_PATH;
  if (value.startsWith(LOGIN_PATH)) return DASHBOARD_PATH;

  return value;
}

/** The login URL, remembering where the visitor was headed. */
export function loginPathWithReturnTo(pathname: string, search = ""): string {
  const returnTo = `${pathname}${search}`;
  if (returnTo === DASHBOARD_PATH) return LOGIN_PATH;

  return `${LOGIN_PATH}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`;
}
