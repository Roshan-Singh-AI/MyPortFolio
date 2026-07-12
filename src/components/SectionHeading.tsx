"use client";

import RevealText from "./RevealText";
import { Reveal } from "./RevealText";

type SectionHeadingProps = {
  kicker?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  id?: string;
};

/** Editorial section header: mono kicker + masked reveal title + intro. */
export default function SectionHeading({
  kicker,
  title,
  intro,
  align = "left",
  id,
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start";
  return (
    <div className={`flex flex-col gap-4 ${alignClass}`}>
      {kicker && (
        <Reveal>
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
        className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-[1.05] tracking-tight text-text sm:text-4xl md:text-5xl balance"
      />
      {intro && (
        <Reveal delay={0.1}>
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
