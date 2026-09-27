"use client";

import { useEffect, useState, type RefObject } from "react";

export type Padding = { top: number; right: number; bottom: number; left: number };
const ZERO: Padding = { top: 0, right: 0, bottom: 0, left: 0 };
const GAP = 24;

/**
 * Works out how much of the map each floating panel hides, from the panel's
 * actual on-screen box. Tall side panels pad left or right; wide sheets pad the
 * bottom (or top). Recomputes on any resize of the panels or the window, so the
 * map re-centres as the layout reflows between desktop and phone.
 */
export function useMapPadding(panels: RefObject<HTMLElement | null>[], deps: unknown[] = []) {
  const [padding, setPadding] = useState<Padding>(ZERO);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const next = { ...ZERO };
        for (const ref of panels) {
          const el = ref.current;
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;

          if (r.width >= vw * 0.7) {
            if (r.top + r.height / 2 > vh / 2) next.bottom = Math.max(next.bottom, vh - r.top + GAP);
            else next.top = Math.max(next.top, r.bottom + GAP);
          } else if (r.left + r.width / 2 < vw / 2) {
            next.left = Math.max(next.left, r.right + GAP);
          } else {
            next.right = Math.max(next.right, vw - r.left + GAP);
          }
        }
        // A panel covering nearly everything (a phone-sized chat) should not crush
        // the map to nothing; leave at least a usable window.
        const minSize = 160;
        if (next.left + next.right > vw - minSize) next.left = next.right = 0;
        if (next.top + next.bottom > vh - minSize) next.top = next.bottom = 0;

        setPadding((prev) =>
          prev.top === next.top &&
          prev.right === next.right &&
          prev.bottom === next.bottom &&
          prev.left === next.left
            ? prev
            : next,
        );
      });
    };

    const observer = new ResizeObserver(measure);
    for (const ref of panels) if (ref.current) observer.observe(ref.current);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- panels mount and unmount with deps
  }, deps);

  return padding;
}
