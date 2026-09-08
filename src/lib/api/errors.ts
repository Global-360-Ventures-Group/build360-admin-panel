import type { ApiFieldError } from "./types";

/**
 * The API answered, but rejected the request.
 *
 * `status` is the HTTP status and `message` is the envelope's `message`, which
 * the API populates on every failure ("Invalid credentials", "Validation
 * failed", "Authentication required", ...).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: ApiFieldError[];

  constructor(message: string, status: number, fieldErrors: ApiFieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** The token is missing, expired or rejected. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Authenticated, but the user lacks the required permission. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Field errors keyed by field name, ready to merge into a form's error
   * state. Entries missing a field or message are dropped.
   */
  fieldErrorMap(): Record<string, string> {
    const map: Record<string, string> = {};

    for (const error of this.fieldErrors) {
      if (error.field && error.message) map[error.field] = error.message;
    }

    return map;
  }
}

/**
 * The API could not be reached at all — connection refused, DNS failure, or
 * our own request timeout. Distinct from `ApiError` because the user-facing
 * advice is different: this one is "the server is down", not "you did
 * something wrong".
 */
export class ApiUnreachableError extends Error {
  constructor(cause?: unknown) {
    super("Could not reach the Build360 API.");
    this.name = "ApiUnreachableError";
    this.cause = cause;
  }
}
