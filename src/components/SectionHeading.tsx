"use client";

import RevealText from "./RevealText";
import { Reveal } from "./RevealText";

type SectionHeadingProps = {
  kicker?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  id?: string;
  /**
   * Set on the FIRST heading of a page (above the fold). It then plays its
   * entrance on MOUNT (framer, Contact-style) instead of on scroll -- so the
   * top of every page animates in on load with no scroll needed, and never
   * goes through the scroll system that could double-render.
   */
  onMount?: boolean;
};

/** Editorial section header: mono kicker + masked reveal title + intro. */
export default function SectionHeading({
  kicker,
  title,
  intro,
  align = "left",
  id,
  onMount = false,
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start";
  return (
    <div className={`flex flex-col gap-4 ${alignClass}`}>
      {kicker && (
        <Reveal onMount={onMount}>
          <span className="kicker flex items-center gap-3">
            <span className="h-px w-8 bg-cyan/60" aria-hidden />
            {kicker}
          </span>
        </Reveal>
      )}
      <RevealText
        as="h2"
        id={id}
        text={title}
        animateOnMount={onMount}
        delay={onMount ? 0.08 : 0}
        className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-[1.05] tracking-tight text-text sm:text-4xl md:text-5xl balance"
      />
      {intro && (
        <Reveal delay={0.1} onMount={onMount}>
          <p
            className={`max-w-2xl text-base leading-relaxed text-text-dim sm:text-lg ${
              align === "center" ? "mx-auto" : ""
            }`}
          >
            {intro}
          </p>
        </Reveal>
      )}
    </div>
  );
}
