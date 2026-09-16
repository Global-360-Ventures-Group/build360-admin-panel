/**
 * Delivery restrictions, mirroring `AdminDeliveryRestrictionResponse`.
 *
 * A restriction is a block: for a date range, for one method or all of them,
 * covering the whole day or only named time slots. The public availability
 * endpoint skips anything a restriction covers, and the calendar's bulk
 * builder refuses to create slots there in the first place.
 *
 * Two shapes worth knowing before designing around them:
 *
 * - **There is no update.** Only create and delete. Changing a restriction
 *   means deleting it and adding a new one, which the screen says plainly
 *   rather than offering an edit that cannot exist.
 * - **Delete is a real delete.** The one hard delete in this whole API —
 *   everywhere else "delete" means archive or deactivate. Nothing restores a
 *   restriction; you re-create it.
 *
 * Two fields mean "everything" when empty, which is the opposite of how the
 * rest of the API reads, so they are never rendered as blanks:
 *
 * - `deliveryMethodId` unset blocks **every** method.
 * - `slotIds` empty blocks the **whole day**, not no slots at all.
 */

export type RestrictionType =
  | "HOLIDAY"
  | "EID"
  | "STRIKE"
  | "SYSTEM_MAINTENANCE"
  | "MANUAL_BLOCK";

export type DeliveryRestriction = {
  id: string;
  name: string;
  restrictionType: RestrictionType;
  /** `YYYY-MM-DD`, inclusive at both ends. */
  startDate: string;
  endDate: string;
  /** "" means every delivery method. */
  deliveryMethodId: string;
  remarks: string;
  /** Empty means the whole day, not "no slots". */
  slotIds: string[];
  createdAt: string;
  updatedAt: string;
};

/** What the create form collects. */
export type RestrictionFormValues = {
  name: string;
  restrictionType: RestrictionType;
  startDate: string;
  endDate: string;
  /** "" means every method. */
  deliveryMethodId: string;
  remarks: string;
  /** Empty means the whole day. */
  slotIds: string[];
};

export const emptyRestrictionForm: RestrictionFormValues = {
  name: "",
  restrictionType: "HOLIDAY",
  startDate: "",
  endDate: "",
  deliveryMethodId: "",
  remarks: "",
  slotIds: [],
};

/** Field limits taken from `DeliveryRestrictionCreateRequest`. */
export const RESTRICTION_LIMITS = {
  name: 200,
  remarks: 2000,
} as const;

/** Sentinel for "every method", which a select cannot carry as "". */
export const ALL_METHODS = "all";

export const RESTRICTION_TYPES: RestrictionType[] = [
  "HOLIDAY",
  "EID",
  "STRIKE",
  "SYSTEM_MAINTENANCE",
  "MANUAL_BLOCK",
];

export const restrictionTypeLabels: Record<RestrictionType, string> = {
  HOLIDAY: "Holiday",
  EID: "Eid",
  STRIKE: "Strike",
  SYSTEM_MAINTENANCE: "System maintenance",
  MANUAL_BLOCK: "Manual block",
};

/** Anything that is not one of the API's five falls back to a manual block. */
export function parseRestrictionType(value: string | undefined): RestrictionType {
  return RESTRICTION_TYPES.includes(value as RestrictionType)
    ? (value as RestrictionType)
    : "MANUAL_BLOCK";
}

/** Soonest first, so what is about to bite is at the top. */
export function sortRestrictions(
  restrictions: DeliveryRestriction[],
): DeliveryRestriction[] {
  return [...restrictions].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      a.endDate.localeCompare(b.endDate) ||
      a.name.localeCompare(b.name),
  );
}

/** Whether a restriction covers today, has passed, or is still ahead. */
export type RestrictionPhase = "active" | "upcoming" | "past";

export function restrictionPhase(
  restriction: DeliveryRestriction,
  todayIso: string,
): RestrictionPhase {
  if (restriction.endDate < todayIso) return "past";
  if (restriction.startDate > todayIso) return "upcoming";

  return "active";
}
