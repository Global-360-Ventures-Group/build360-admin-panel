import Link from "next/link";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Rendered wherever a page calls `forbidden()` — the visitor is signed in, but
 * lacks the permission that screen requires.
 *
 * Deliberately not a redirect to the dashboard: silently moving someone
 * elsewhere reads as a broken link. Saying "ask an administrator" names the
 * fix, because permissions are granted through roles and nothing on this side
 * of the panel can grant one to yourself.
 */
export default function Forbidden() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldX className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          You do not have access to this
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Your account is signed in, but your roles do not carry the permission
          this screen needs. Ask an administrator to grant it.
        </p>
      </div>
      <Button render={<Link href="/" />}>Back to dashboard</Button>
    </div>
  );
}
