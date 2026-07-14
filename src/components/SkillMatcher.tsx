"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { SkillGroup } from "@/content/site";
import { buildIndex, scoreAll } from "@/lib/retrieval";
import { EASE_OUT } from "@/lib/motion";

/**
 * Semantic skill match -- an AI-driven recruiter tool on the About page.
 *
 * A recruiter pastes a JD keyword or phrase; every skill is scored by REAL
 * TF-IDF cosine similarity (src/lib/retrieval.ts) against that query and the
 * best matches light up, ranked, with their real relative score. This is the
 * same retriever the RAG demo uses, run over the skills corpus -- no fake
 * highlighting. Each skill's document is its own text plus its group label for
 * a little context (e.g. "FastAPI Backend").
 *
 * With no query it renders exactly the original grouped chips (identical to the
 * prior SkillChips), so nothing is lost and the initial render is stable.
 * Reduced-motion aware; input labelled; results announced via aria-live.
 */

type SkillDoc = { skill: string; group: string };

export default function SkillMatcher({ groups }: { groups: SkillGroup[] }) {
  const reduce = useReducedMotion();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);

  // Flatten to per-skill docs (deduped) and build the index once.
  const { docs, index } = useMemo(() => {
    const seen = new Set<string>();
    const docs: SkillDoc[] = [];
    for (const g of groups) {
      for (const s of g.items) {
        if (seen.has(s)) continue;
        seen.add(s);
        docs.push({ skill: s, group: g.label });
      }
    }
    const idx = buildIndex(
      docs.map((d) => ({ id: d.skill, source: d.group, text: `${d.skill} ${d.group}` })),
    );
    return { docs, index: idx };
  }, [groups]);

  const active = deferred.trim().length > 0;

  // Map of skill -> relative match percentage (real cosine), when searching.
  const { scores, ranked, matchCount } = useMemo(() => {
    if (!active) {
      return { scores: new Map<string, number>(), ranked: [] as SkillDoc[], matchCount: 0 };
    }
    const scored = scoreAll(index, deferred);
    const max = Math.max(0.0001, ...scored.map((s) => s.score));
    const scores = new Map<string, number>();
    const bySkill = new Map(docs.map((d) => [d.skill, d]));
    const ranked: SkillDoc[] = [];
    let matchCount = 0;
    for (const s of scored) {
      const pct = s.score > 0 ? Math.round((s.score / max) * 100) : 0;
      scores.set(s.chunk.id, pct);
      if (pct > 0) {
        matchCount++;
        const doc = bySkill.get(s.chunk.id);
        if (doc) ranked.push(doc);
      }
    }
    return { scores, ranked: ranked.slice(0, 8), matchCount };
  }, [active, deferred, index, docs]);

  return (
    <div>
      {/* JD search field */}
      <div className="mb-8 flex flex-col gap-3">
        <label htmlFor={inputId} className="sr-only">
          Match skills against a job description keyword or phrase
        </label>
        <div className="relative max-w-xl">
          <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m2.6-6.4 1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" />
            </svg>
          </span>
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Paste a JD phrase -- e.g. build retrieval pipelines and evaluate them"
            maxLength={160}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-line bg-bg/60 py-3 pl-11 pr-10 text-sm text-text placeholder:text-text-faint transition-colors duration-300 focus:border-cyan/60 focus:outline-none"
          />
          {active && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear match"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-text-faint transition-colors hover:text-text"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </div>
        <p className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[0.68rem] text-text-faint" aria-live="polite">
          <span
            aria-hidden
            className={`inline-flex h-1.5 w-1.5 rounded-full ${active ? "bg-cyan" : "bg-text-faint/50"}`}
          />
          {active
            ? `${matchCount} skill${matchCount === 1 ? "" : "s"} match by cosine similarity -- strongest highlighted`
            : "Type a job requirement to rank matching skills by real TF-IDF similarity."}
        </p>
      </div>

      {/* Top matches summary (only while searching) */}
      {active && ranked.length > 0 && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="mb-8 rounded-2xl border border-cyan/25 bg-cyan/[0.05] p-5"
        >
          <span className="kicker text-[0.58rem]">Top matches</span>
          <ul className="mt-3 flex flex-col gap-2.5">
            {ranked.map((d) => {
              const pct = scores.get(d.skill) ?? 0;
              return (
                <li key={d.skill} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-text">{d.skill}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]" role="presentation">
                    <motion.span
                      className="block h-full rounded-full bg-[linear-gradient(90deg,#7fb79a,#adc9b3)]"
                      initial={reduce ? false : { width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: reduce ? 0 : 0.5, ease: EASE_OUT }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right font-[family-name:var(--font-mono)] text-[0.62rem] text-text-faint">
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}

      {/* Grouped chips -- dim non-matches and brighten matches while searching */}
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <div
            key={group.label}
            className="grid gap-3 border-t border-line pt-6 md:grid-cols-[10rem_1fr]"
          >
            <h3 className="font-[family-name:var(--font-mono)] text-sm uppercase tracking-wider text-cyan">
              {group.label}
            </h3>
            <ul className="reveal-stagger flex flex-wrap gap-2">
              {group.items.map((item, ii) => {
                const pct = scores.get(item) ?? 0;
                const isMatch = active && pct > 0;
                const dimmed = active && pct === 0;
                return (
                  <li
                    key={item}
                    style={{ "--reveal-i": Math.min(ii, 8) } as React.CSSProperties}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all duration-300 ${
                      isMatch
                        ? "border-cyan/60 bg-cyan/[0.1] text-text"
                        : dimmed
                          ? "border-line bg-white/[0.02] text-text-faint opacity-50"
                          : "border-line bg-white/[0.02] text-text-dim hover:border-cyan/50 hover:text-text"
                    }`}
                  >
                    {item}
                    {isMatch && (
                      <span className="font-[family-name:var(--font-mono)] text-[0.6rem] text-cyan">
                        {pct}%
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
