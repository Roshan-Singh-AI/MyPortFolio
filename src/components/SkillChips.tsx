"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { SkillGroup } from "@/content/site";
import { EASE_OUT, viewportOnce } from "@/lib/motion";

/** Grouped skills as chips that stagger in on scroll. */
export default function SkillChips({ groups }: { groups: SkillGroup[] }) {
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group, gi) => (
        <div
          key={group.label}
          className="grid gap-3 border-t border-line pt-6 md:grid-cols-[10rem_1fr]"
        >
          <h3 className="font-[family-name:var(--font-mono)] text-sm uppercase tracking-wider text-cyan">
            {group.label}
          </h3>
          <motion.ul
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.03, delayChildren: gi * 0.02 },
              },
            }}
            className="flex flex-wrap gap-2"
          >
            {group.items.map((item) => (
              <motion.li
                key={item}
                variants={{
                  hidden: reduce
                    ? { opacity: 1 }
                    : { opacity: 0, y: 10, scale: 0.96 },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.4, ease: EASE_OUT },
                  },
                }}
                className="cursor-default rounded-lg border border-line bg-white/[0.02] px-3 py-1.5 text-sm text-text-dim transition-colors duration-300 hover:border-cyan/50 hover:text-text"
              >
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>
      ))}
    </div>
  );
}
