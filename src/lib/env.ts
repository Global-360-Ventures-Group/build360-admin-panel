/**
 * Server-side environment configuration.
 *
 * Always read config through these helpers instead of touching `process.env`
 * directly: a missing variable then fails with a clear message at the call
 * site, rather than silently becoming a `fetch("undefined/auth/user/login")`
 * much further down the stack.
 *
 * These are functions, not module-level constants, so an unset variable does
 * not blow up at import time (and therefore during `next build`).
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Base URL of the Build360 API, normalised to have no trailing slash. */
export function apiBaseUrl(): string {
  return required("BUILD360_API_URL").replace(/\/+$/, "");
}
