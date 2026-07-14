"use client";

import type { MouseEvent } from "react";
import type { Project } from "@/content/site";
import ArchitectureDiagram from "./ArchitectureDiagram";

/** Rich "system card" for a project, with a glow-on-hover surface. */
export default function ProjectCard({
  project,
  index,
  matchPct = null,
}: {
  project: Project;
  index: number;
  /** When set (semantic search active), shows the real similarity match. */
  matchPct?: number | null;
}) {
  // Inside the semantic explorer (matchPct !== null) the parent handles layout
  // reorder motion, so the card must NOT also run its own scroll-reveal. Outside
  // the explorer it gets the pure-CSS `.reveal` (buttery fade-up, view()
  // timeline) -- no JS observer, no framer reveal state, visible by default.
  const inExplorer = matchPct !== null;

  function trackGlow(e: MouseEvent<HTMLElement>) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <article
      onMouseMove={trackGlow}
      style={{ "--reveal-i": index % 4 } as React.CSSProperties}
      className={`group relative h-full overflow-hidden rounded-2xl border border-line bg-surface/40 p-6 transition-colors duration-500 hover:border-line-strong sm:p-8 ${
        inExplorer ? "" : "reveal"
      }`}
    >
      {/* hover glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx,50%) var(--my,0%), rgba(127,183,154,0.12), transparent 40%)",
        }}
      />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2.5">
              <span className="kicker">
                {String(index + 1).padStart(2, "0")}
              </span>
              {matchPct !== null && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/[0.08] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[0.58rem] text-cyan">
                  <span
                    aria-hidden
                    className="inline-block h-1 w-8 overflow-hidden rounded-full bg-white/10"
                  >
                    <span
                      className="block h-full rounded-full bg-[linear-gradient(90deg,#7fb79a,#adc9b3)]"
                      style={{ width: `${matchPct}%` }}
                    />
                  </span>
                  {matchPct}% match
                </span>
              )}
            </span>
            <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-text sm:text-2xl">
              {project.name}
            </h3>
            <p className="text-sm text-cyan/90">{project.tagline}</p>
          </div>
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${project.name} on GitHub`}
            className="shrink-0 rounded-full border border-line-strong bg-white/[0.02] p-2.5 text-text-dim transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan/50 hover:text-text"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.03 10.03 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
            </svg>
          </a>
        </div>

        <p className="text-sm leading-relaxed text-text-dim">
          {project.description}
        </p>

        <ArchitectureDiagram
          nodes={project.diagram.nodes}
          caption={project.diagram.caption}
        />

        <ul className="flex flex-col gap-2 border-t border-line pt-5">
          {project.highlights.map((h) => (
            <li
              key={h}
              className="flex items-start gap-2.5 text-sm text-text-dim"
            >
              <span
                aria-hidden
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet"
              />
              {h}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {project.tech.map((t) => (
            <span
              key={t}
              className="rounded-md border border-line bg-white/[0.02] px-2 py-1 font-[family-name:var(--font-mono)] text-[0.68rem] text-text-faint"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
