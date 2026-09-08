import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { LoginForm } from "@/features/auth/login-form";
import { RETURN_TO_PARAM, safeReturnTo } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Sign in · Build360 Admin",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const requestedReturnTo = params[RETURN_TO_PARAM];

  // Validated here rather than in the form so a crafted `?next=` can never
  // reach the browser as a usable redirect target.
  const returnTo = safeReturnTo(
    Array.isArray(requestedReturnTo) ? requestedReturnTo[0] : requestedReturnTo,
  );

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">Build360 Admin</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your backoffice account to continue.
        </p>
      </div>

      <LoginForm returnTo={returnTo} />
    </div>
  );
}
