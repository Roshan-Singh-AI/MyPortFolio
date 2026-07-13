"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import Link from "next/link";
import { useRef, type ReactNode, type MouseEvent } from "react";

type CommonProps = {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "ghost";
  /** magnetic pull strength in px */
  strength?: number;
};

type AsLink = CommonProps & { href: string; external?: boolean };

const base =
  "group relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium tracking-tight transition-colors duration-300 focus-visible:outline-2";

const variants = {
  // Champagne/gold primary -- the one warm metallic, reserved for real CTAs.
  primary:
    "text-[#241d09] bg-[linear-gradient(115deg,#e6d5ad,#d8c9a3,#cbb98a)] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] hover:shadow-[0_18px_50px_-12px_rgba(224,207,160,0.55)]",
  ghost:
    "text-text border border-line-strong bg-white/[0.02] hover:bg-white/[0.06] hover:border-cyan/50",
} as const;

/**
 * A button/link that softly follows the cursor (magnetic) and glows on hover.
 * Falls back to a static element when prefers-reduced-motion is set.
 */
export default function MagneticButton({
  children,
  className = "",
  variant = "primary",
  strength = 14,
  href,
  external,
}: AsLink) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

  function handleMove(e: MouseEvent<HTMLAnchorElement>) {
    if (reduce || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set((relX / rect.width) * strength * 2);
    y.set((relY / rect.height) * strength * 2);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  const classes = `${base} ${variants[variant]} ${className}`;
  const externalProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <motion.div
      style={{ x: reduce ? 0 : springX, y: reduce ? 0 : springY }}
      className="inline-flex"
    >
      <Link
        ref={ref}
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        className={classes}
        {...externalProps}
      >
        {children}
      </Link>
    </motion.div>
  );
}
