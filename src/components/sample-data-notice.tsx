import { FlaskConical } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Says out loud that a screen is not real.
 *
 * Orders, refunds and customers are all designs running on fixtures, because
 * the API has no admin surface for any of them — no order list across
 * customers, no refund resource at all, and nothing that reads a customer
 * account from the back office. Without this bar those screens are
 * indistinguishable from working ones, which is the sort of thing that gets
 * demoed to a customer.
 *
 * `detail` is required on purpose: a generic "this is sample data" tells a
 * reviewer nothing about *which* part is missing.
 */
export function SampleDataNotice({
  detail,
  className,
}: {
  detail: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning",
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-medium">Sample data.</span> {detail}
      </p>
    </div>
  );
}
