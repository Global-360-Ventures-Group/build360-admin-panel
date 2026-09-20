import type { Metadata } from "next";

import { buildSampleReport } from "@/features/reports/sample-data";
import { ReportsView } from "@/features/reports/reports-view";
import { parseReportRange } from "@/features/reports/types";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Reports · Build360 Admin",
};

/**
 * The reports screen.
 *
 * **Not permission-gated, on purpose.** There is no `REPORT_*` or `ANALYTICS_*`
 * code in the permission catalogue, because the API has no analytics endpoints
 * for one to guard — gating on an invented code would lock out every real
 * account, SUPER_ADMIN included. Sign-in is still required.
 *
 * No page redirect guard here, unlike the list routes: there is nothing to
 * page through, and an unrecognised `range` already falls back to the default
 * rather than producing an empty window.
 */
export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  await requireUser();

  const params = await searchParams;
  const range = parseReportRange(firstValue(params.range));

  return <ReportsView report={buildSampleReport(range)} range={range} />;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
