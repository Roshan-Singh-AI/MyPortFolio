"use client";

import { motion } from "framer-motion";
import { useMotionGate } from "@/lib/useMotionGate";

/**
 * A small architecture pipeline: labelled nodes connected by edges, with a
 * pulsing "data" dot travelling the path. Node entrance is pure CSS
 * (`.reveal-stagger`, view() timeline -- no JS, visible by default). The
 * travelling dot is a gated, always-on decorative loop (never a scroll reveal).
 */
export default function ArchitectureDiagram({
  nodes,
  caption,
}: {
  nodes: string[];
  caption: string;
}) {
  // Gate the infinite dot loop so SSR + first client render match (no #418).
  const { reduce } = useMotionGate();
  const count = nodes.length;

  return (
    <figure className="w-full">
      <div className="reveal-stagger flex flex-wrap items-center gap-2">
        {nodes.map((node, i) => (
          <div key={node} className="flex items-center gap-2">
            <span
              style={{ "--reveal-i": i } as React.CSSProperties}
              className="rounded-lg border border-line-strong bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-text-dim"
            >
              {node}
            </span>
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
