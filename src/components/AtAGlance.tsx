"use client";

import { motion, useReducedMotion } from "framer-motion";
import { glanceStats, coreSkills } from "@/content/site";
import { EASE_OUT, viewportOnce } from "@/lib/motion";

/**
 * "At a glance" -- the HR-scannable band, placed high on the home page so a
 * non-technical recruiter grasps the value in ~5 seconds.
 *
 * A compact bento/stat strip of HONEST, traceable numbers (see site.ts:
 * glanceStats, each documenting its real source) plus a tight row of core
 * skill chips. Reveal-on-scroll, reduced-motion aware, stacks on mobile.
 * No invented figures -- every value maps to real content.
 */
export default function AtAGlance() {
  const reduce = useReducedMotion();

  return (
    <section
      className="mx-auto max-w-6xl px-5 pt-4 sm:px-8"
      aria-labelledby="at-a-glance"
    >
      <h2 id="at-a-glance" className="sr-only">
        At a glance
      </h2>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: reduce ? 0 : 0.06 } },
        }}
        className="rounded-3xl border border-line bg-[linear-gradient(160deg,rgba(34,211,238,0.045),rgba(167,139,250,0.05))] p-5 backdrop-blur-sm sm:p-7"
      >
        {/* Stat strip */}
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {glanceStats.map((stat) => (
            <motion.li
              key={stat.label}
              variants={{
                hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
              }}
              className="flex flex-col gap-1"
            >
              <span className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-gradient sm:text-3xl">
                {stat.value}
              </span>
              <span className="text-[0.78rem] leading-snug text-text-dim">
                {stat.label}
              </span>
            </motion.li>
          ))}
        </ul>

        {/* Core skills row */}
        <motion.div
          variants={{
            hidden: reduce ? { opacity: 1 } : { opacity: 0 },
            show: { opacity: 1, transition: { duration: 0.4, ease: EASE_OUT } },
          }}
          className="mt-7 flex flex-wrap items-center gap-2 border-t border-line pt-6"
        >
          <span className="kicker mr-1 text-[0.58rem]">Core skills</span>
          {coreSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-line bg-white/[0.02] px-3 py-1 font-[family-name:var(--font-mono)] text-[0.7rem] text-text-dim transition-colors duration-300 hover:border-cyan/50 hover:text-text"
            >
              {skill}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
