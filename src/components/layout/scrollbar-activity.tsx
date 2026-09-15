"use client";

import * as React from "react";

/** How long the pointer has to stay still before the thumbs fade back out. */
const IDLE_MS = 1100;

const ATTRIBUTE = "data-scrolling";

/**
 * Drives the overlay scrollbars defined in `globals.css`.
 *
 * Renders nothing. While the pointer moves, something scrolls, or a drag is in
 * progress, `data-scrolling` sits on `<html>` and every thumb on the page
 * fades in; once everything goes quiet for `IDLE_MS` the attribute comes off
 * and they fade away again.
 *
 * Mounted once at the root so a single pair of listeners covers every scroll
 * container in the app rather than one per view.
 */
export function ScrollbarActivity() {
  React.useEffect(() => {
    const root = document.documentElement;

    let timer: number | undefined;
    let shown = false;
    /** True between pointerdown and pointerup — i.e. while dragging a thumb. */
    let held = false;

    const hide = () => {
      // A drag that pauses mid-gesture must not fade the thumb out from under
      // the cursor, so holding the button pins it open.
      if (held || !shown) return;
      root.removeAttribute(ATTRIBUTE);
      shown = false;
    };

    const show = () => {
      // `pointermove` fires on the order of 100×/s; skipping the write when
      // the attribute is already set keeps that off the style recalc path.
      if (!shown) {
        root.setAttribute(ATTRIBUTE, "");
        shown = true;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(hide, IDLE_MS);
    };

    const onPointerDown = () => {
      held = true;
      show();
    };

    const onPointerUp = () => {
      held = false;
      show();
    };

    // Leaving the window ends any drag the tab will never see finish.
    const onBlur = () => {
      held = false;
      hide();
    };

    // `scroll` does not bubble, so it is caught on the way down — that way a
    // nested container (a table, the sidebar, a popup) counts as activity too,
    // not just the document.
    document.addEventListener("scroll", show, { capture: true, passive: true });
    document.addEventListener("pointermove", show, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointercancel", onPointerUp, { passive: true });
    window.addEventListener("blur", onBlur);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("scroll", show, { capture: true });
      document.removeEventListener("pointermove", show);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", onBlur);
      root.removeAttribute(ATTRIBUTE);
    };
  }, []);

  return null;
}
