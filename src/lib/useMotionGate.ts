"use client";
import { useReducedMotion } from "framer-motion";
import { useMounted } from "@/lib/useMounted";

/** SSR + first client render => reduce=true (render visible/static; no hidden
 *  initial in SSR HTML). After mount => reduce reflects real prefers-reduced-
 *  motion so intros can play. mounted is exposed for null-gate sites. */
export function useMotionGate() {
  const mounted = useMounted();
  const prefersReduced = useReducedMotion();
  return { mounted, reduce: !mounted || prefersReduced } as const;
}
