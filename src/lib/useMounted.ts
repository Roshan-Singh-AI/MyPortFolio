"use client";

import { useSyncExternalStore } from "react";

/**
 * Returns false during SSR and the first client render, then true after the
 * component has mounted on the client.
 *
 * Why: framer-motion's `useReducedMotion()` and motion `initial/animate` props
 * resolve differently before vs. after hydration, which triggers React
 * "hydrated tree didn't match" warnings. Gating motion/interactive attributes
 * behind this flag makes the FIRST client render byte-identical to the server
 * (static, no motion), eliminating the mismatch. We use useSyncExternalStore
 * (not setState-in-an-effect) so it also satisfies the React-compiler lint.
 */
const emptySubscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client snapshot
    () => false, // server snapshot
  );
}
