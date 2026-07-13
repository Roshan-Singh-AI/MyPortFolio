"use client";

import { useRef } from "react";
import { useInView } from "framer-motion";

/**
 * Robust scroll-reveal trigger. Unlike bare `whileInView` (which relies on
 * framer's internal viewport observer and can leave ALREADY-in-view content
 * stuck at its hidden `initial` state until a scroll nudge), this drives an
 * explicit `animate` target from framer's `useInView`.
 *
 * `useInView` attaches its IntersectionObserver in an effect after layout, and
 * the observer fires an initial callback for any element already intersecting
 * the viewport -- so an above-the-fold reveal flips to visible on mount without
 * needing a scroll, while genuinely below-the-fold content still reveals on
 * scroll as intended. `once` keeps the reveal permanent.
 *
 * Anti-flash invariant is preserved by the caller: when the motion gate reports
 * `reduce` (SSR + first client render, or prefers-reduced-motion) the caller
 * renders the visible/static branch, so content is never hidden without JS.
 */
export function useRevealInView(amount: number = 0.1) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount });
  return { ref, inView } as const;
}
