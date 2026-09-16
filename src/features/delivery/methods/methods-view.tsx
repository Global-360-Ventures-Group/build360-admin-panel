"use client";

import * as React from "react";
import { Loader2, MapPin, Pencil, Truck, Zap } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

import type { DeliveryActionResult } from "../action-result";
import { setDeliveryMethodActiveAction } from "./actions";
import { MethodFormDialog } from "./method-form-dialog";
import {
  deliveryMethodCodeLabels,
  type DeliveryMethod,
  type DeliveryMethodCode,
} from "./types";

const methodIcons: Record<DeliveryMethodCode, typeof Truck> = {
  STANDARD: Truck,
  EXPRESS: Zap,
  CLICK_AND_COLLECT: MapPin,
};

/**
 * The three delivery methods.
 *
 * Cards rather than a table: there are exactly three, fixed by the backend,
 * and each carries a description worth reading rather than scanning. Nothing
 * here creates or deletes one — the screen edits how a method presents and
 * switches it on or off.
 */
export function MethodsView({
  methods,
  canManage,
}: {
  methods: DeliveryMethod[];
  /** `DELIVERY_CONFIG_MANAGE`. Reading needs only the view grant. */
  canManage: boolean;
}) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();
  const [editing, setEditing] = React.useState<DeliveryMethod | null>(null);

  function runAction(
    method: DeliveryMethod,
    action: () => Promise<DeliveryActionResult>,
  ) {
    setPendingId(method.id);

    startTransition(async () => {
      try {
        const result = await action();
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Delivery</h1>
        <p className="text-sm text-muted-foreground">
          The three ways an order can reach a customer. Switch one off and it
          disappears from checkout; its calendar days are left untouched.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {methods.map((method) => {
          const Icon = methodIcons[method.code];
          const busy = pendingId === method.id;

          return (
            <Card key={method.id} className="min-w-0">
              <CardContent className="flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={
                      method.active
                        ? "flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                        : "flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                    }
                  >
                    <Icon className="size-4.5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {busy ? (
                      <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                    ) : null}
                    <Switch
                      checked={method.active}
                      onCheckedChange={(next) =>
                        runAction(method, () =>
                          setDeliveryMethodActiveAction(method.id, next),
                        )
                      }
                      disabled={!canManage || busy}
                      aria-label={`${method.active ? "Deactivate" : "Activate"} ${method.name}`}
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2 className="font-medium">{method.name}</h2>
                    {method.badge ? (
                      <Badge variant="secondary">{method.badge}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {method.code}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {method.description || "No description yet."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    Order {method.displayOrder}
                  </span>
                  <span>·</span>
                  <span>{method.active ? "On the storefront" : "Hidden"}</span>
                  {method.requiresPickupLocation ? (
                    <>
                      <span>·</span>
                      <span>Needs a pickup location</span>
                    </>
                  ) : null}
                </div>

                {canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setEditing(method)}
                  >
                    <Pencil /> Edit {deliveryMethodCodeLabels[method.code]}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <MethodFormDialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        method={editing}
      />
    </>
  );
}
