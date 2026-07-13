"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/motion";
import { useMotionGate } from "@/lib/useMotionGate";

/**
 * Fades + lifts each route on navigation. `mode="wait"` avoids overlap,
 * and reduced-motion users get an instant swap.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mounted, reduce } = useMotionGate();

  if (reduce || !mounted) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
