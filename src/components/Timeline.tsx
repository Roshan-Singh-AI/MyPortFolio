"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import type { Experience } from "@/content/site";
import { useMotionGate } from "@/lib/useMotionGate";

type Chapter = Experience["chapters"][number];

/**
 * Editorial timeline: a vertical spine whose fill tracks scroll progress,
 * with each chapter reading like a short story rather than resume bullets.
 */
export default function Timeline({ chapters }: { chapters: Chapter[] }) {
  // Gate on `mounted` (not raw useReducedMotion): the server + first client
  // render both treat reduce=true, so the SSR HTML and the hydrated tree are
  // byte-identical (no React #418 hydration mismatch). Motion elements that are
  // structurally conditional on `!reduce` therefore appear only after mount.
  const { reduce } = useMotionGate();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 65%", "end 60%"],
  });
  const fillHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={ref} className="relative mt-4">
      {/* spine */}
      <div
        aria-hidden
        className="absolute left-[7px] top-2 bottom-2 w-px bg-line md:left-[calc(8rem+7px)]"
      >
        {!reduce && (
          <motion.div
            className="absolute inset-x-0 top-0 w-px bg-[linear-gradient(180deg,#7fb79a,#adc9b3)]"
            style={{ height: fillHeight }}
          />
        )}
      </div>

      <ol className="flex flex-col gap-12">
        {chapters.map((ch, i) => (
          <li
            key={ch.title}
            className="reveal relative grid grid-cols-[auto_1fr] gap-x-5 md:grid-cols-[8rem_1fr] md:gap-x-8"
          >
            {/* index / marker column */}
            <div className="relative flex items-start md:justify-end">
              <span className="hidden font-[family-name:var(--font-mono)] text-xs text-text-faint md:block md:pt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                aria-hidden
                className="absolute left-0 top-1 grid h-3.5 w-3.5 place-items-center rounded-full border border-cyan/60 bg-bg md:left-auto md:right-[-2.05rem]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
              </span>
            </div>

            {/* content */}
            <div className="flex flex-col gap-3 pb-2">
              <span className="w-fit rounded-full border border-line bg-white/[0.03] px-3 py-1 font-[family-name:var(--font-mono)] text-[0.68rem] uppercase tracking-wider text-text-faint">
                {ch.tag}
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
                {ch.title}
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed text-text-dim sm:text-base">
                {ch.body}
              </p>
              {ch.stack && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {ch.stack.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-line bg-white/[0.02] px-2 py-1 font-[family-name:var(--font-mono)] text-[0.68rem] text-text-faint"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
