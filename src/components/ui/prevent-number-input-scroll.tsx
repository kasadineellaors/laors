"use client";

import { useEffect } from "react";

/** Stop mouse-wheel from changing focused number inputs while scrolling the page. */
export function PreventNumberInputScroll() {
  useEffect(() => {
    function onWheel(event: WheelEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.type === "number" &&
        document.activeElement === target
      ) {
        event.preventDefault();
      }
    }

    document.addEventListener("wheel", onWheel, { passive: false });
    return () => document.removeEventListener("wheel", onWheel);
  }, []);

  return null;
}
