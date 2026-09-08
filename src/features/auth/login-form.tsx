"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login, type LoginFormState } from "@/lib/auth/actions";
import { RETURN_TO_PARAM } from "@/lib/auth/routes";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, formAction, pending] = useActionState<
    LoginFormState | undefined,
    FormData
  >(login, undefined);

  const identifierError = state?.fieldErrors?.identifier;
  const passwordError = state?.fieldErrors?.password;

  return (
    <Card>
      <CardContent>
        {/*
          `noValidate` leaves validation to the server action, so the browser's
          own bubbles cannot pre-empt the messages we render below the inputs.
        */}
        <form action={formAction} noValidate>
          <input type="hidden" name={RETURN_TO_PARAM} value={returnTo} />

          {state?.message ? (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{state.message}</span>
            </div>
          ) : null}

          <FieldGroup>
            <Field data-invalid={Boolean(identifierError) || undefined}>
              <FieldLabel htmlFor="identifier">Username or email</FieldLabel>
              <Input
                id="identifier"
                name="identifier"
                // The API accepts either form, so no `type="email"`.
                autoComplete="username"
                placeholder="admin"
                defaultValue={state?.identifier}
                aria-invalid={Boolean(identifierError) || undefined}
                disabled={pending}
                autoFocus
              />
              <FieldError>{identifierError}</FieldError>
            </Field>

            <Field data-invalid={Boolean(passwordError) || undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(passwordError) || undefined}
                disabled={pending}
              />
              <FieldError>{passwordError}</FieldError>
            </Field>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
