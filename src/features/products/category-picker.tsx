"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { CategoryOption } from "./product-options";

/**
 * A category picker that drills down one level at a time.
 *
 * The flat list this replaces showed every category at every depth as a full
 * path, which is unreadable once the tree has more than a handful of leaves.
 * Here the first select lists the base (top-level) categories, and a second
 * one appears only once the chosen base actually has children — so narrowing
 * further is always optional. Deeper trees keep adding a select per level.
 *
 * The value is still a single category id, exactly what the API takes; the
 * chain of selects is reconstructed from `parentId` on every render, so a
 * product already sitting three levels deep opens with its trail filled in.
 *
 * Archived categories are hidden behind a checkbox rather than mixed into the
 * lists, because assigning a product to one is the exception. The categories
 * already on the selected trail are the exception to the exception: they stay
 * listed whatever the checkbox says, since dropping the current selection
 * would blank the picker and silently reassign the product on save.
 */

/** Sentinel for the "step back up to this level's parent" choice. */
const CLEAR = "__clear__";

export function CategoryPicker({
  categories,
  value,
  onValueChange,
  id,
  disabled,
  invalid,
  placeholder = "Select a category",
  allLabel,
}: {
  categories: CategoryOption[];
  /** The selected category id, or "" for none. */
  value: string;
  onValueChange: (categoryId: string) => void;
  /** Applied to the first trigger so a `FieldLabel` can point at it. */
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  /**
   * Adds a clearing choice to the base select — the filter's "All categories".
   * Omitted where a category is required, as on the product form.
   */
  allLabel?: string;
}) {
  const toggleId = React.useId();
  const hasArchived = React.useMemo(
    () => categories.some((category) => !category.active),
    [categories],
  );
  // Opens checked when the product already sits on an archived branch, so the
  // archived entries in the selects are explained rather than surprising.
  const [includeArchived, setIncludeArchived] = React.useState(() =>
    onArchivedBranch(categories, value),
  );

  const { byId, childrenOf, roots } = React.useMemo(() => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const childrenOf = new Map<string, CategoryOption[]>();
    const roots: CategoryOption[] = [];

    for (const category of categories) {
      // A category whose parent is missing from the list is treated as a root,
      // otherwise it would be unreachable in the cascade.
      const parentId =
        category.parentId && byId.has(category.parentId)
          ? category.parentId
          : null;

      if (!parentId) {
        roots.push(category);
        continue;
      }

      const siblings = childrenOf.get(parentId);
      if (siblings) siblings.push(category);
      else childrenOf.set(parentId, [category]);
    }

    return { byId, childrenOf, roots };
  }, [categories]);

  // The selected category's ancestor trail, top level first.
  const chain = React.useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();

    let current = value ? byId.get(value) : undefined;
    while (current && !seen.has(current.id)) {
      seen.add(current.id); // guards against malformed cycles
      ids.unshift(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }

    return ids;
  }, [value, byId]);

  const chainIds = React.useMemo(() => new Set(chain), [chain]);

  const visibleOptions = React.useCallback(
    (options: CategoryOption[]) =>
      includeArchived
        ? options
        : options.filter(
            (option) => option.active || chainIds.has(option.id),
          ),
    [includeArchived, chainIds],
  );

  // One select per level of the trail, plus one for the level below the
  // deepest selection — that last one is what makes drilling down optional.
  const levels: {
    parent: CategoryOption | null;
    options: CategoryOption[];
    selected: string;
  }[] = [];

  let parent: CategoryOption | null = null;
  let options = visibleOptions(roots);
  let depth = 0;
  while (options.length > 0) {
    const selected = chain[depth] ?? "";
    levels.push({ parent, options, selected });

    if (!selected) break;

    parent = byId.get(selected) ?? null;
    options = visibleOptions(childrenOf.get(selected) ?? []);
    depth += 1;
  }

  function handleChange(levelIndex: number, next: unknown) {
    // Clearing a sub-level falls back to its parent, which stays selected;
    // clearing the base level selects nothing at all.
    if (typeof next !== "string" || next === CLEAR) {
      onValueChange(levels[levelIndex].parent?.id ?? "");
      return;
    }

    onValueChange(next);
  }

  return (
    <>
      {levels.length === 0 ? (
        // Either the catalog has no categories at all, or every base category
        // is archived — in which case the checkbox below brings them back.
        <Select value="" items={[]} disabled>
          <SelectTrigger id={id} className="w-full" aria-label="Category">
            <SelectValue
              placeholder={
                hasArchived ? "No active categories" : "No categories yet"
              }
            />
          </SelectTrigger>
          <SelectContent />
        </Select>
      ) : null}

      {levels.map((level, index) => {
        const items = [
          ...(level.parent
            ? [{ value: CLEAR, label: "No subcategory" }]
            : allLabel
              ? [{ value: CLEAR, label: allLabel }]
              : []),
          // Whatever survived `visibleOptions` — the active ones, plus any
          // archived entry the checkbox or the current selection keeps in.
          ...level.options.map((option) => ({
            value: option.id,
            label: option.active ? option.name : `${option.name} (archived)`,
          })),
        ];

        return (
          <Select
            key={level.parent?.id ?? "__root__"}
            value={
              level.selected || (!level.parent && allLabel ? CLEAR : "")
            }
            onValueChange={(next) => handleChange(index, next)}
            items={items}
            disabled={disabled}
          >
            <SelectTrigger
              id={index === 0 ? id : undefined}
              className="w-full"
              aria-label={
                level.parent ? `Subcategory of ${level.parent.name}` : "Category"
              }
              aria-invalid={(index === 0 && invalid) || undefined}
            >
              <SelectValue
                placeholder={level.parent ? "No subcategory" : placeholder}
              />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}

      {hasArchived ? (
        <div className="flex h-8 items-center gap-2">
          <Checkbox
            id={toggleId}
            checked={includeArchived}
            onCheckedChange={(checked) => setIncludeArchived(checked === true)}
            disabled={disabled}
          />
          <label
            htmlFor={toggleId}
            className="text-sm font-normal text-muted-foreground select-none"
          >
            Include archived
          </label>
        </div>
      ) : null}
    </>
  );
}

/** Whether `value` or any of its ancestors is archived. */
function onArchivedBranch(categories: CategoryOption[], value: string) {
  if (!value) return false;

  const byId = new Map(categories.map((category) => [category.id, category]));
  const seen = new Set<string>();

  let current = byId.get(value);
  while (current && !seen.has(current.id)) {
    if (!current.active) return true;

    seen.add(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return false;
}
