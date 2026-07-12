"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import GraphBackground from "./GraphBackground";
import RevealText from "./RevealText";
import MagneticButton from "./MagneticButton";
import { site } from "@/content/site";
import { EASE_OUT } from "@/lib/motion";

export default function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // subtle parallax: graph drifts up + fades, text lifts slightly
  const graphY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const graphOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden"
      aria-label="Introduction"
    >
      {/* living retrieval graph */}
      <motion.div
        aria-hidden
        style={reduce ? undefined : { y: graphY, opacity: graphOpacity }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0">
          <GraphBackground density={26} variant="hero" />
        </div>
        {/* readability vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,transparent,rgba(10,10,15,0.65))]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />
      </motion.div>

      <motion.div
        style={reduce ? undefined : { y: textY }}
        className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-28 sm:px-8"
      >
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-line bg-white/[0.03] px-4 py-1.5"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan" />
          </span>
          <span className="text-xs text-text-dim">
            Available for AI engineering roles
          </span>
        </motion.div>

        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.75rem,9vw,7rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
          <RevealText
            text={site.name}
            animateOnMount
            className="block"
            stagger={0.08}
          />
          <RevealText
            text={site.title}
            animateOnMount
            delay={0.25}
            className="block text-gradient"
            stagger={0.08}
          />
        </h1>

        <motion.p
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.6 }}
          className="mt-7 max-w-xl text-base leading-relaxed text-text-dim sm:text-lg"
        >
          {site.positioning}
        </motion.p>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.72 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <MagneticButton href="/projects">
            View projects
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </MagneticButton>
          <MagneticButton href="/work" variant="ghost">
            Experience
          </MagneticButton>
        </motion.div>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="kicker mt-10"
        >
          {site.location} &nbsp;/&nbsp; {site.relocation}
        </motion.p>
      </motion.div>

      {/* scroll cue */}
      {!reduce && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 sm:flex"
        >
          <span className="kicker text-[0.6rem]">Scroll</span>
          <span className="relative h-9 w-5 rounded-full border border-line-strong">
            <motion.span
              className="absolute left-1/2 top-1.5 h-1.5 w-1 -translate-x-1/2 rounded-full bg-cyan"
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
        </motion.div>
      )}
    </section>
  );
}
