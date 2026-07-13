"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useMotionGate } from "@/lib/useMotionGate";

/**
 * A soft radial glow that trails the cursor. Desktop only (pointer: fine),
 * disabled for reduced-motion users. Purely decorative -> aria-hidden.
 *
 * The element always mounts but starts far offscreen, so it stays invisible
 * until a fine pointer actually moves -- no render-triggering state needed.
 */
export default function CursorGlow() {
  // Gate on `mounted` (not raw useReducedMotion): the server + first client
  // render both treat reduce=true and return null, so the SSR HTML matches the
  // hydrated tree (no React #418 mismatch on this layout-level component). The
  // real reduced-motion preference applies only after mount.
  const { reduce } = useMotionGate();
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const sx = useSpring(x, { stiffness: 120, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 120, damping: 22, mass: 0.6 });

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduce, x, y]);

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-30 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-[80px]"
      style={{
        left: sx,
        top: sy,
        background:
          "radial-gradient(circle, rgba(127,183,154,0.16), rgba(173,201,179,0.10) 45%, transparent 70%)",
      }}
    />
  );
}
