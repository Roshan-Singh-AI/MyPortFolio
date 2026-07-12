import type { Variants } from "framer-motion";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_INOUT = [0.65, 0, 0.35, 1] as const;

/** Container that staggers its children into view. */
export const staggerParent: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

/** A single element rising into view. */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
};

/** Simple fade for less prominent elements. */
export const fadeItem: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: EASE_OUT } },
};

export const viewportOnce = { once: true, amount: 0.3 } as const;
