"use client";

import { motion, type Variants } from "framer-motion";
import { EASE_REVEAL } from "@/lib/motion";
import { useMotionGate } from "@/lib/useMotionGate";
import { createElement, type ReactNode } from "react";

/** Tags this component can render as. */
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
  /** Split by "word" (default) or "char". */
  by?: "word" | "char";
  as?: Tag;
  className?: string;
  id?: string;
  /**
   * Play the word-rise immediately on mount (the hero). When false (the
   * default) the heading reveals on SCROLL via a pure-CSS view() timeline --
   * no JS observer, no framer state, so it can't flicker/stick/jank.
   */
  animateOnMount?: boolean;
  delay?: number;
  stagger?: number;
};

/**
 * Masked word-rise for headlines -- the site's signature motion.
 *
 *  - animateOnMount (the hero only): framer plays the rise once on mount. This
 *    path never had the scroll bugs, so it's kept as-is.
 *  - default (every other heading): a JS-free CSS scroll-driven reveal. The
 *    words are visible by default and rise from behind a clip as the heading
 *    enters view, driven by `animation-timeline: view()` on the compositor
 *    thread. Reduced-motion / unsupported browsers render plain visible text.
 */
export default function RevealText({
  text,
  by = "word",
  as = "span",
  className = "",
  id,
  animateOnMount = false,
  delay = 0,
  stagger = 0.035,
}: RevealTextProps) {
  const { reduce } = useMotionGate();
  const units = by === "char" ? Array.from(text) : text.split(" ");

  // Reduced motion (and SSR/first paint via the gate): plain, visible text.
  if (reduce) {
    return createElement(as, { className, id }, text);
  }

  // ---- HERO PATH: framer on-mount word-rise (unchanged, proven) ----------
  if (animateOnMount) {
    const container: Variants = {
      hidden: {},
      show: { transition: { staggerChildren: stagger, delayChildren: delay } },
    };
    const child: Variants = {
      hidden: { y: "115%" },
      show: { y: "0%", transition: { duration: 0.6, ease: EASE_REVEAL } },
    };
    const MotionTag = MOTION_TAGS[as];
    return (
      <MotionTag
        id={id}
        className={className}
        variants={container}
        initial="hidden"
        animate="show"
        aria-label={text}
      >
        {units.map((unit, i) => (
          <span key={`${unit}-${i}`} aria-hidden>
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

  // ---- SCROLL PATH: pure-CSS view() word-rise (fresh, jank-proof) ---------
  // `.reveal-words` sets the named view timeline; each `.reveal-word-clip > span`
  // rises on scroll with a per-word --reveal-i cascade (see globals.css).
  return createElement(
    as,
    { id, className: `reveal-words ${className}`.trim(), "aria-label": text },
    units.map((unit, i) => (
      <span key={`${unit}-${i}`} aria-hidden>
        <span className="reveal-word-clip">
          <span style={{ "--reveal-i": i } as React.CSSProperties}>{unit}</span>
        </span>
        {by === "word" && i < units.length - 1 ? " " : ""}
      </span>
    )),
  );
}

/**
 * Content-block reveal, two modes:
 *
 *  - onMount (the FIRST section of a page -- above the fold): a framer fade+rise
 *    that plays immediately on mount, layered cleanly with PageTransition. This
 *    is the Contact-style entrance, and because it never uses the scroll system
 *    it CANNOT double-render / fight the page transition.
 *  - default (lower sections): emits the `.reveal` class; the root observer
 *    (useScrollReveal) reveals it as it scrolls into view. That observer only
 *    ever arms genuinely below-the-fold content and waits for the page
 *    transition to settle, so it never touches the first section.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  onMount = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  onMount?: boolean;
}) {
  const { reduce } = useMotionGate();

  if (onMount) {
    return (
      <motion.div
        className={className}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_REVEAL, delay }}
      >
        {children}
      </motion.div>
    );
  }

  // Lower sections: scroll reveal via the `.reveal` class + root observer.
  const i = Math.min(6, Math.round(delay / 0.1));
  return (
    <div
      className={`reveal ${className}`.trim()}
      style={{ "--reveal-i": i } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
