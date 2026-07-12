"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Project } from "@/content/site";
import { buildIndex, scoreAll } from "@/lib/retrieval";
import ProjectCard from "./ProjectCard";
import { EASE_OUT } from "@/lib/motion";

/**
 * Projects page semantic search.
 *
 * As the visitor types, every project card LIVE re-ranks by REAL cosine
 * similarity to the query. We build a TF-IDF index (src/lib/retrieval.ts) over
 * a document per project assembled from its real name, tagline, description,
 * highlights, and tech from site.ts -- the exact same retriever the RAG demo
 * uses, just over the projects corpus. The percentage shown on each card is
 * the real relative cosine score. Empty query restores the default order.
 *
 * framer-motion `layout` animates the reorder; results are announced via an
 * aria-live region; the input is labelled. Hydration-safe: deterministic,
 * empty-query initial render matches the server.
 */

/** Flatten a project into one retrievable document (real content only). */
function projectDoc(p: Project): string {
  return [
    p.name,
    p.tagline,
    p.description,
    p.highlights.join(" "),
    p.tech.join(" "),
    p.diagram.caption,
  ].join(" ");
}

export default function ProjectsExplorer({ projects }: { projects: Project[] }) {
  const reduce = useReducedMotion();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);

  // Build the index once over the project docs.
  const index = useMemo(
    () =>
      buildIndex(
        projects.map((p) => ({ id: p.slug, source: p.name, text: projectDoc(p) })),
      ),
    [projects],
  );

  const bySlug = useMemo(() => {
    const m = new Map<string, Project>();
    for (const p of projects) m.set(p.slug, p);
    return m;
  }, [projects]);

  // Ordered list of { project, pct } -- real scores, real order.
  const ranked = useMemo(() => {
    const q = deferred.trim();
    if (!q) {
      return projects.map((p, i) => ({ project: p, pct: null as number | null, rank: i }));
    }
    const scored = scoreAll(index, q);
    const max = Math.max(0.0001, ...scored.map((s) => s.score));
    return scored.map((s, i) => {
      const project = bySlug.get(s.chunk.id)!;
      const pct = s.score > 0 ? Math.round((s.score / max) * 100) : 0;
      return { project, pct, rank: i };
    });
  }, [deferred, index, projects, bySlug]);

  const active = deferred.trim().length > 0;
  const matchCount = active ? ranked.filter((r) => (r.pct ?? 0) > 0).length : projects.length;

  return (
    <div>
      {/* Search field */}
      <div className="mb-10 flex flex-col gap-3">
        <label htmlFor={inputId} className="sr-only">
          Semantic search across projects
        </label>
        <div className="relative max-w-xl">
          <span
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Semantic search -- e.g. graph retrieval, cost, memory, reranking"
            maxLength={120}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-line bg-bg/60 py-3 pl-11 pr-10 text-sm text-text placeholder:text-text-faint transition-colors duration-300 focus:border-cyan/60 focus:outline-none"
          />
          {active && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-faint transition-colors hover:text-text"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </div>

        {/* Hint / live announcement */}
        <p className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[0.68rem] text-text-faint" aria-live="polite">
          {active ? (
            <>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan" aria-hidden />
              Re-ranked by cosine similarity -- {matchCount} match
              {matchCount === 1 ? "" : "es"} for &ldquo;{deferred.trim()}&rdquo;
            </>
          ) : (
            <>
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-text-faint/50" aria-hidden />
              Type to re-rank projects by TF-IDF similarity to your query.
            </>
          )}
        </p>
      </div>

      {/* Re-ranking grid */}
      <motion.div layout={!reduce} className="grid gap-4 lg:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {ranked.map(({ project, pct, rank }) => (
            <motion.div
              key={project.slug}
              layout={!reduce}
              transition={{ duration: reduce ? 0 : 0.45, ease: EASE_OUT }}
              className={active && pct === 0 ? "opacity-45" : "opacity-100"}
            >
              <ProjectCard project={project} index={rank} matchPct={active ? pct : null} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
