import { apiBaseUrl } from "@/lib/env";

import { ApiError, ApiUnreachableError } from "./errors";
import type { ApiFieldError, ApiResponse } from "./types";

/** Abort a request rather than let a hung API stall a page render. */
const DEFAULT_TIMEOUT_MS = 15_000;

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Serialised as JSON. Omit for GET. */
  body?: unknown;
  /** Bearer token to send. Omit for the public auth endpoints. */
  accessToken?: string;
  timeoutMs?: number;
};

/**
 * Call the Build360 API and unwrap its response envelope.
 *
 * Every Build360 endpoint answers with `{ success, message, data }` on both
 * success and failure, so failures are detected from `success === false` as
 * well as from the HTTP status — the two do not always agree, and trusting
 * only `res.ok` would let a `success: false` body through.
 *
 * Responses are never cached: this is an admin panel, where showing a stale
 * list after a mutation is a bug.
 *
 * @throws {ApiError} the API rejected the request
 * @throws {ApiUnreachableError} the API could not be reached
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, accessToken, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    throw new ApiUnreachableError(cause);
  }

  const envelope = await readEnvelope<T>(response);

  if (!response.ok || envelope.success === false) {
    throw new ApiError(
      envelope.message ?? `Request failed with status ${response.status}.`,
      response.status,
      extractFieldErrors(envelope),
    );
  }

  return envelope;
}

/**
 * Same as `apiRequest`, for endpoints that must return a payload.
 *
 * @throws {ApiError} if the call succeeded but `data` is absent
 */
export async function apiRequestData<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const envelope = await apiRequest<T>(path, options);

  if (envelope.data === undefined || envelope.data === null) {
    throw new ApiError(
      envelope.message ?? "The API returned a successful response with no data.",
      200,
    );
  }

  return envelope.data;
}

/**
 * Parse the response body as an envelope.
 *
 * A non-JSON body (a proxy error page, an unhandled 500) is not fatal here —
 * it degrades into an empty envelope so the caller still reports the HTTP
 * status instead of a JSON parse error.
 */
async function readEnvelope<T>(response: Response): Promise<ApiResponse<T>> {
  const text = await response.text().catch(() => "");
  if (!text) return {};

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return {};
  }
}

/**
 * Pull out per-field errors, which the API delivers by replacing the
 * envelope's `data` with an array instead of the endpoint's normal payload.
 */
function extractFieldErrors<T>(envelope: ApiResponse<T>): ApiFieldError[] {
  return Array.isArray(envelope.data) ? (envelope.data as ApiFieldError[]) : [];
}
