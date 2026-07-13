"use client";

import { motion } from "framer-motion";
import type { Ref } from "react";
import { useMotionGate } from "@/lib/useMotionGate";
import { useRevealInView } from "@/lib/useRevealInView";

/**
 * A small animated architecture pipeline: labelled nodes connected by
 * edges that draw in on scroll, with a pulsing "data" dot travelling the
 * path. Purely illustrative of a project's flow.
 */
export default function ArchitectureDiagram({
  nodes,
  caption,
}: {
  nodes: string[];
  caption: string;
}) {
  // Gate on `mounted` (not raw useReducedMotion) so the SSR HTML matches the
  // first client render -- the structurally-conditional {!reduce && ...} dot
  // otherwise causes a React #418 hydration mismatch under reduced motion.
  const { reduce } = useMotionGate();
  // One container-level in-view trigger drives every node so an above-the-fold
  // diagram (nested in the top project card) reveals on mount, not on scroll.
  const { ref, inView } = useRevealInView();
  const count = nodes.length;

  return (
    <figure className="w-full">
      <div ref={ref as Ref<HTMLDivElement>} className="flex flex-wrap items-center gap-2">
        {nodes.map((node, i) => (
          <div key={node} className="flex items-center gap-2">
            <motion.span
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={
                reduce ? undefined : inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }
              }
              transition={{ delay: i * 0.09, duration: 0.4 }}
              className="rounded-lg border border-line-strong bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-text-dim"
            >
              {node}
            </motion.span>
            {i < count - 1 && (
              <span
                aria-hidden
                className="relative h-px w-6 overflow-hidden bg-line-strong sm:w-8"
              >
                {!reduce && (
                  <motion.span
                    className="absolute inset-y-0 left-0 w-2 bg-[linear-gradient(90deg,transparent,#7fb79a,transparent)]"
                    animate={{ x: ["-8px", "40px"] }}
                    transition={{
                      duration: 1.6,
                      delay: i * 0.25,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 0.6,
                    }}
                  />
                )}
              </span>
            )}
          </div>
        ))}
      </div>
      <figcaption className="mt-3 text-xs leading-relaxed text-text-faint">
        {caption}
      </figcaption>
    </figure>
  );
}
