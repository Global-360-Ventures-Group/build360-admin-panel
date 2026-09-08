"use server";

import { redirect } from "next/navigation";

import { ApiError, ApiUnreachableError } from "@/lib/api/errors";

import { loginUser, logoutUser } from "./api";
import { RETURN_TO_PARAM, LOGIN_PATH, safeReturnTo } from "./routes";
import { clearSessionTokens, readSessionTokens, writeSessionTokens } from "./session";
import { sessionTokensFromAuthResponse } from "./session-cookies";

export type LoginFormState = {
  /** Error to show above the form. */
  message?: string;
  /** Errors to show against individual inputs. */
  fieldErrors?: {
    identifier?: string;
    password?: string;
  };
  /**
   * The submitted identifier, echoed back so a failed attempt does not clear
   * what the user typed. The password is deliberately not echoed.
   */
  identifier?: string;
};

/**
 * Sign in a backoffice user and start a session.
 *
 * On success this redirects and never returns; on failure it returns the state
 * the form renders. Note that `redirect()` works by throwing, so it has to be
 * called outside the `try` block — inside, our own `catch` would swallow it
 * and the user would sit on the login page with no error and no navigation.
 */
export async function login(
  _state: LoginFormState | undefined,
  formData: FormData,
): Promise<LoginFormState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnTo = safeReturnTo(String(formData.get(RETURN_TO_PARAM) ?? ""));

  const fieldErrors: LoginFormState["fieldErrors"] = {};
  if (!identifier) fieldErrors.identifier = "Username or email is required.";
  if (!password) fieldErrors.password = "Password is required.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, identifier };
  }

  try {
    const auth = await loginUser(identifier, password);
    const tokens = sessionTokensFromAuthResponse(auth);

    if (!tokens) {
      return {
        message: "The server accepted the login but returned no tokens.",
        identifier,
      };
    }

    await writeSessionTokens(tokens);
  } catch (error) {
    return loginErrorState(error, identifier);
  }

  redirect(returnTo);
}

/**
 * End the session and return to the login page.
 *
 * The local cookies are cleared whatever happens at the API. A failed revoke
 * leaves a refresh token alive server-side until it expires, which is worth a
 * log line, but refusing to sign the user out of their own browser because
 * the network hiccuped would be worse.
 */
export async function logout(): Promise<void> {
  const tokens = await readSessionTokens();

  if (tokens) {
    try {
      await logoutUser(tokens.refreshToken);
    } catch (error) {
      console.error("Failed to revoke the refresh token during logout.", error);
    }
  }

  await clearSessionTokens();

  redirect(LOGIN_PATH);
}

/** Translate a failed login into something the form can display. */
function loginErrorState(error: unknown, identifier: string): LoginFormState {
  if (error instanceof ApiUnreachableError) {
    return {
      message: "Could not reach the Build360 API. Check that the server is running.",
      identifier,
    };
  }

  if (error instanceof ApiError) {
    // A 400 carries per-field messages in the envelope's `data`; a 401 carries
    // only "Invalid credentials", which belongs above the form because we are
    // not told which of the two fields was wrong.
    const fieldErrors = error.fieldErrorMap();

    if (Object.keys(fieldErrors).length > 0) {
      return {
        fieldErrors: {
          identifier: fieldErrors.identifier,
          password: fieldErrors.password,
        },
        identifier,
      };
    }

    return { message: error.message, identifier };
  }

  console.error("Unexpected error during login.", error);

  return { message: "Something went wrong. Please try again.", identifier };
}
