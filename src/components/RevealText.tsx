"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { EASE_OUT, viewportOnce } from "@/lib/motion";
import { createElement, type ReactNode } from "react";

/** Tags this component can render as. Motion versions are declared once, at
 *  module scope, so no component is created during render. */
type Tag = "span" | "h1" | "h2" | "h3" | "p";

const MOTION_TAGS = {
  span: motion.span,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
} as const;

type RevealTextProps = {
  text: string;
  /** Split by "word" (default) or "char" for a tighter mask animation. */
  by?: "word" | "char";
  as?: Tag;
  className?: string;
  id?: string;
  /** Play immediately on mount instead of when scrolled into view. */
  animateOnMount?: boolean;
  delay?: number;
  stagger?: number;
};

/**
 * Masked reveal for headlines. Each unit rises out from behind a clip.
 * Respects prefers-reduced-motion by rendering plain text.
 */
export default function RevealText({
  text,
  by = "word",
  as = "span",
  className = "",
  id,
  animateOnMount = false,
  delay = 0,
  stagger = 0.06,
}: RevealTextProps) {
  const reduce = useReducedMotion();
  const units = by === "char" ? Array.from(text) : text.split(" ");

  if (reduce) {
    return createElement(as, { className, id }, text);
  }

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };

  const child: Variants = {
    hidden: { y: "115%" },
    show: {
      y: "0%",
      transition: { duration: 0.85, ease: EASE_OUT },
    },
  };

  const MotionTag = MOTION_TAGS[as];

  const trigger = animateOnMount
    ? ({ animate: "show" } as const)
    : ({ whileInView: "show", viewport: viewportOnce } as const);

  return (
    <MotionTag
      id={id}
      className={className}
      variants={container}
      initial="hidden"
      {...trigger}
      aria-label={text}
    >
      {units.map((unit, i) => (
        <span key={`${unit}-${i}`} aria-hidden>
          {/* The clip wraps ONLY the moving word; the space is a real,
              unclipped space rendered between clips so words never merge. */}
          <span
            className="inline-block overflow-hidden align-bottom"
            style={{ paddingBottom: "0.08em", marginBottom: "-0.08em" }}
          >
            <motion.span variants={child} className="inline-block">
              {unit}
            </motion.span>
          </span>
          {by === "word" && i < units.length - 1 ? " " : ""}
        </span>
      ))}
    </MotionTag>
  );
}

/** Convenience wrapper: fade+rise a block of children when it scrolls in. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
