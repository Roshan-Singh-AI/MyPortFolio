"use client";

import { motion, useReducedMotion } from "framer-motion";
import { viewportOnce } from "@/lib/motion";

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
  const reduce = useReducedMotion();
  const count = nodes.length;

  return (
    <figure className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        {nodes.map((node, i) => (
          <div key={node} className="flex items-center gap-2">
            <motion.span
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
              viewport={viewportOnce}
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
                    className="absolute inset-y-0 left-0 w-2 bg-[linear-gradient(90deg,transparent,#22d3ee,transparent)]"
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
