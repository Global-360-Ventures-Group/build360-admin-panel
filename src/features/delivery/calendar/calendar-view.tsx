"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

import type { DeliveryMethod } from "../methods/types";
import type { PickupLocation } from "../pickup-locations/types";
import { addDays, formatIsoDate, formatTimeRange, todayIso } from "../shared";
import type { DeliverySlot } from "../slots/types";
import { loadCalendarSlotsAction } from "./actions";
import { BulkCalendarDialog } from "./bulk-calendar-dialog";
import { CalendarSlotFormDialog } from "./calendar-slot-form-dialog";
import { DayFormDialog } from "./day-form-dialog";
import {
  calendarSlotStatusLabels,
  deliveryDayStatusLabels,
  type CalendarDate,
  type CalendarSlot,
  type DeliveryDay,
  type DeliveryDayStatus,
} from "./types";

/** Badge tone per day status — only AVAILABLE is actually bookable. */
const dayStatusVariant: Record<
  DeliveryDayStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  AVAILABLE: "default",
  FULL: "secondary",
  BLOCKED: "destructive",
  HOLIDAY: "destructive",
};

/** What is known about one day's bookable slots. */
type DaySlots = {
  /** Null until the first successful load. */
  slots: CalendarSlot[] | null;
  error: string | null;
  loading: boolean;
};

export type CalendarViewProps = {
  /** Every date in the viewed range, opened or not. */
  dates: CalendarDate[];
  range: { from: string; to: string };
  /** True when the requested range was wider than the screen will render. */
  clamped: boolean;
  methods: DeliveryMethod[];
  slots: DeliverySlot[];
  locations: PickupLocation[];
  /** `DELIVERY_CALENDAR_MANAGE` — the calendar grant, not the config one. */
  canManage: boolean;
};

/**
 * The bookable calendar.
 *
 * Every date in the range gets a row, not just the ones the API returned:
 * `GET /admin/delivery/calendar` only knows about days that have been opened,
 * so listing its response alone would show a fortnight as "nothing here" when
 * the real answer is "nine of these fourteen dates were never opened".
 *
 * A day's bookable slots load when it is expanded. There is no endpoint that
 * returns slots for a range, so doing it eagerly would be one request per row
 * to fill a screen where most rows are never opened.
 *
 * Those slots are cached **here** rather than inside each row, because this is
 * the component that knows when they have gone stale: adding or editing a slot
 * does not change the day record, so `revalidatePath` re-renders the page with
 * identical props and a row holding its own copy would keep showing the old
 * list until a full reload.
 */
export function CalendarView({
  dates,
  range,
  clamped,
  methods,
  slots,
  locations,
  canManage,
}: CalendarViewProps) {
  const router = useRouter();

  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [slotsByDay, setSlotsByDay] = React.useState<Record<string, DaySlots>>(
    {},
  );

  const [dayDialog, setDayDialog] = React.useState<{
    day: DeliveryDay | null;
    date: string;
  } | null>(null);
  const [slotDialog, setSlotDialog] = React.useState<{
    dayId: string;
    dayDate: string;
    slot: CalendarSlot | null;
  } | null>(null);

  const loadSlots = React.useCallback(async (dayId: string) => {
    setSlotsByDay((current) => ({
      ...current,
      [dayId]: {
        slots: current[dayId]?.slots ?? null,
        error: null,
        loading: true,
      },
    }));

    const result = await loadCalendarSlotsAction(dayId);

    setSlotsByDay((current) => ({
      ...current,
      [dayId]: result.ok
        ? { slots: result.slots, error: null, loading: false }
        : {
            slots: current[dayId]?.slots ?? null,
            error: result.message,
            loading: false,
          },
    }));

    if (!result.ok) toast.error(result.message);
  }, []);

  function toggleDay(dayId: string) {
    const isOpen = expanded.has(dayId);
    const next = new Set(expanded);

    if (isOpen) next.delete(dayId);
    else next.add(dayId);

    setExpanded(next);

    const known = slotsByDay[dayId];
    if (!isOpen && !known?.slots && !known?.loading) void loadSlots(dayId);
  }

  function go(nextFrom: string, nextTo: string) {
    router.push(
      `/delivery/calendar?from=${encodeURIComponent(nextFrom)}&to=${encodeURIComponent(nextTo)}`,
    );
  }

  const today = todayIso();
  const openedCount = dates.filter((entry) => entry.day !== null).length;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Which dates are open, and what can be booked on them.{" "}
            <span className="tabular-nums">
              {openedCount} of {dates.length} dates opened
            </span>
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setBulkOpen(true)} className="w-full sm:w-auto">
            <Sparkles /> Build calendar
          </Button>
        ) : null}
      </div>

      <Card className="min-w-0 py-0">
        <CardHeader className="border-b py-4">
          {/* Keyed on the range so the inputs re-initialise from the URL after
              a navigation. The alternative — an effect writing the props into
              state — is a cascading render for no gain. */}
          <RangePicker
            key={`${range.from}:${range.to}`}
            range={range}
            today={today}
            onShow={go}
          />

          {clamped ? (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                That range was wider than this screen renders, so it was cut
                short at {formatIsoDate(range.to)}. Narrow the dates to see the
                rest.
              </span>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="p-0">
          {dates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <CalendarDays className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Pick a date range to show.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {dates.map((entry) => {
                const dayId = entry.day?.id ?? "";

                return (
                  <DateRow
                    key={entry.date}
                    entry={entry}
                    today={today}
                    expanded={expanded.has(dayId)}
                    state={slotsByDay[dayId]}
                    methods={methods}
                    slots={slots}
                    locations={locations}
                    canManage={canManage}
                    onToggle={() => toggleDay(dayId)}
                    onRetry={() => void loadSlots(dayId)}
                    onOpenDay={() =>
                      setDayDialog({ day: null, date: entry.date })
                    }
                    onEditDay={(day) => setDayDialog({ day, date: entry.date })}
                    onAddSlot={() =>
                      setSlotDialog({ dayId, dayDate: entry.date, slot: null })
                    }
                    onEditSlot={(slot) =>
                      setSlotDialog({ dayId, dayDate: entry.date, slot })
                    }
                  />
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <DayFormDialog
        open={dayDialog !== null}
        onOpenChange={(open) => {
          if (!open) setDayDialog(null);
        }}
        day={dayDialog?.day ?? null}
        date={dayDialog?.date ?? ""}
      />
      <CalendarSlotFormDialog
        open={slotDialog !== null}
        onOpenChange={(open) => {
          if (!open) setSlotDialog(null);
        }}
        dayId={slotDialog?.dayId ?? ""}
        dayDate={slotDialog?.dayDate ?? ""}
        slot={slotDialog?.slot ?? null}
        methods={methods}
        slots={slots}
        locations={locations}
        // The day record does not change when its slots do, so the re-render
        // `revalidatePath` triggers carries identical props. This is the only
        // signal that the cached list is out of date.
        onSaved={(dayId) => void loadSlots(dayId)}
      />
      <BulkCalendarDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        methods={methods}
        slots={slots}
        locations={locations}
        // A bulk run can add slots to any day in its range, so every list
        // currently on screen is suspect.
        onBuilt={() => {
          for (const dayId of expanded) void loadSlots(dayId);
        }}
      />
    </>
  );
}

function RangePicker({
  range,
  today,
  onShow,
}: {
  range: { from: string; to: string };
  today: string;
  onShow: (from: string, to: string) => void;
}) {
  const [from, setFrom] = React.useState(range.from);
  const [to, setTo] = React.useState(range.to);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <div className="grid flex-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="calendar-from" className="text-sm font-medium">
            From
          </label>
          <Input
            id="calendar-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="calendar-to" className="text-sm font-medium">
            To
          </label>
          <Input
            id="calendar-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => onShow(from, to)}>
          Show range
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShow(today, addDays(today, 13))}
        >
          Next 2 weeks
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShow(today, addDays(today, 29))}
        >
          Next 30 days
        </Button>
      </div>
    </div>
  );
}

function DateRow({
  entry,
  today,
  expanded,
  state,
  methods,
  slots,
  locations,
  canManage,
  onToggle,
  onRetry,
  onOpenDay,
  onEditDay,
  onAddSlot,
  onEditSlot,
}: {
  entry: CalendarDate;
  today: string;
  expanded: boolean;
  /** Undefined until the day has been expanded at least once. */
  state: DaySlots | undefined;
  methods: DeliveryMethod[];
  slots: DeliverySlot[];
  locations: PickupLocation[];
  canManage: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onOpenDay: () => void;
  onEditDay: (day: DeliveryDay) => void;
  onAddSlot: () => void;
  onEditSlot: (slot: CalendarSlot) => void;
}) {
  const isPast = entry.date < today;
  const isToday = entry.date === today;
  const bookable = state?.slots;

  return (
    <li className={cn(isPast && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        {entry.day ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`${expanded ? "Hide" : "Show"} slots for ${entry.date}`}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">{formatIsoDate(entry.date)}</span>
            {isToday ? <Badge variant="outline">Today</Badge> : null}
            {entry.day ? (
              <Badge variant={dayStatusVariant[entry.day.status]}>
                {deliveryDayStatusLabels[entry.day.status]}
              </Badge>
            ) : (
              <Badge variant="secondary">Not opened</Badge>
            )}
            {entry.restrictions.map((restriction) => (
              <Badge key={restriction.id} variant="destructive">
                {restriction.name}
              </Badge>
            ))}
          </div>
          {entry.day?.remarks ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {entry.day.remarks}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex shrink-0 items-center gap-1">
            {entry.day ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditDay(entry.day as DeliveryDay)}
                >
                  <Pencil /> <span className="hidden sm:inline">Edit day</span>
                </Button>
                <Button variant="outline" size="sm" onClick={onAddSlot}>
                  <Plus /> <span className="hidden sm:inline">Slot</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={onOpenDay}>
                <CalendarPlus /> Open day
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {expanded && entry.day ? (
        <div className="border-t bg-muted/30 px-4 py-3 pl-13">
          {state?.loading && !bookable ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : state?.error && !bookable ? (
            <div className="flex items-center justify-between gap-3 text-sm text-destructive">
              <span>{state.error}</span>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            </div>
          ) : bookable && bookable.length > 0 ? (
            <ul
              className={cn(
                "flex flex-col gap-2",
                // A reload keeps the old rows on screen rather than flashing
                // skeletons over a list that is about to look almost the same.
                state?.loading && "opacity-60",
              )}
            >
              {bookable.map((slot) => {
                const method = methods.find(
                  (candidate) => candidate.id === slot.deliveryMethodId,
                );
                const window = slots.find(
                  (candidate) => candidate.id === slot.deliverySlotId,
                );
                const location = locations.find(
                  (candidate) => candidate.id === slot.pickupLocationId,
                );

                return (
                  <li
                    key={slot.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {method?.name ?? "Unknown method"}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {window
                        ? formatTimeRange(window.startTime, window.endTime)
                        : "Unknown window"}
                    </span>
                    {location ? (
                      <span className="text-muted-foreground">
                        {location.name}
                      </span>
                    ) : null}
                    <span className="tabular-nums">
                      {formatCurrency(slot.price)}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {slot.bookedCount}/{slot.capacity} booked
                    </span>
                    {slot.bestValue ? (
                      <Badge variant="outline">Best value</Badge>
                    ) : null}
                    <Badge
                      variant={
                        slot.status === "AVAILABLE"
                          ? "default"
                          : slot.status === "FULL"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {calendarSlotStatusLabels[slot.status]}
                    </Badge>
                    {canManage ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="ml-auto"
                        onClick={() => onEditSlot(slot)}
                      >
                        <Pencil /> Edit
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                This day is open but has no bookable slots, so nothing can be
                ordered for it.
              </span>
              {canManage ? (
                <Button variant="outline" size="sm" onClick={onAddSlot}>
                  <Plus /> Add the first slot
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </li>
  );
}
