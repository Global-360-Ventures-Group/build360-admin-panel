import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert a display name into a URL-safe slug. */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** First letters of the first two words, e.g. "Berger Paints" -> "BP". */
export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

/** True when the string is a valid http(s) URL. */
export function isValidUrl(value: string) {
  try {
    const u = new URL(value)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Parse a timestamp from the API.
 *
 * The API sends naive local date-times with no zone or offset
 * (`2026-07-26T14:44:56.445707`). `new Date(...)` reads that as the *local*
 * time, which is the behaviour we want here — the API and the office are in
 * the same zone — but it is worth being explicit, because appending "Z" (the
 * reflex fix) would silently shift every timestamp by the UTC offset.
 */
export function parseApiDateTime(value: string) {
  return new Date(value)
}

/** "12 Jan 2026" */
export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parseApiDateTime(iso))
}

/** "12 Jan 2026, 14:44" — for timestamps where the hour carries meaning. */
export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parseApiDateTime(iso))
}

/**
 * "৳1,250" — catalog prices are in BDT. Intl renders the BDT currency code
 * rather than the taka sign in most locales, so the symbol is prefixed here.
 */
export function formatCurrency(amount: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)
  return `৳${formatted}`
}

/** Short random id with a prefix, e.g. newId("cat") -> "cat_a1b2c3d4". */
export function newId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
