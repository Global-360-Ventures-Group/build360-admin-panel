import type { Metadata } from "next";

import { SettingsView } from "@/features/settings/settings-view";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Settings · Build360 Admin",
};

/**
 * Settings.
 *
 * **Not permission-gated, and here that is not a compromise.** The page's live
 * half is the signed-in user's *own* account and their own theme — there is
 * nothing to guard, because everyone may read themselves. The links to the
 * sections that really do configure something carry their own permission and
 * grey out when the user lacks it, which is the check that matters.
 *
 * The user object comes from `requireUser`, which the dashboard layout has
 * already called this request — React's `cache` means that is one call to
 * `/auth/user/me`, not two.
 */
export default async function SettingsPage() {
  const user = await requireUser();

  return <SettingsView user={user} />;
}
