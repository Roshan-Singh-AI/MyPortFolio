"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_OUT, staggerParent, riseItem, viewportOnce } from "@/lib/motion";
import { useMounted } from "@/lib/useMounted";
import AnswerMarkdown from "./AnswerMarkdown";

/**
 * "Live from GitHub" -- an agentic, living case-study surface.
 *
 * On the CLIENT it fetches Roshan's PUBLIC GitHub repos (unauthenticated, no
 * key) via the same-origin /api/github proxy, shows the top ~6 by recent
 * activity, and lets the visitor generate an AI architecture case study for
 * any repo. The case study streams from /api/casestudy (NDJSON) with the SAME
 * agent-trace + token feel as the Ask-my-work demo, and is honestly labelled
 * as an interpretation of public metadata -- not ground truth.
 *
 * The GitHub call goes through /api/github (a same-origin serverless proxy)
 * rather than hitting api.github.com directly: that lets it work behind a
 * corporate proxy, avoids per-visitor rate limits, and means a blocked/offline
 * GitHub never raises a cross-origin network error in the browser console.
 *
 * Graceful degradation is the point:
 *   - GitHub down / rate-limited / offline -> the whole section quietly hides
 *     (or, once we have tried and failed, shows a soft "GitHub is quiet" note).
 *   - Groq down / no key -> /api/casestudy streams a tasteful templated study.
 *
 * Hydration-safe: relative "updated x ago" strings depend on the current time,
 * so they are gated behind useMounted -- the SSR + first client render show a
 * neutral placeholder, and the relative time fills in after mount. No
 * Math.random / Date.now in the initial render path; `disabled` is a real bool.
 */

const TOP_N = 6;

/** The subset of the GitHub repo shape we use. */
type Repo = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  fork: boolean;
  archived: boolean;
  updated_at: string;
  pushed_at: string;
  topics?: string[];
};

type FetchState = "loading" | "ready" | "empty" | "error";

/** Language dot colours -- a small, on-brand palette (no external data). */
const LANG_COLOR: Record<string, string> = {
  Python: "#7dd3fc",
  TypeScript: "#22d3ee",
  JavaScript: "#a78bfa",
  Jupyter: "#f0abfc",
  "Jupyter Notebook": "#f0abfc",
  HTML: "#67e8f9",
  CSS: "#c4b5fd",
  Shell: "#94a3b8",
};
function langColor(lang: string | null): string {
  if (!lang) return "#6b6f82";
  return LANG_COLOR[lang] ?? "#8b93a7";
}

/** Relative "x ago" -- CLIENT-ONLY (depends on now), never in SSR output. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  const month = Math.round(day / 30);
  const year = Math.round(day / 365);
  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 30) return `${day}d ago`;
  if (month < 12) return `${month}mo ago`;
  return `${year}y ago`;
}

/* ------------------------------------------------------------------ */
/*  Case-study stream types (kept in sync with /api/casestudy)         */
/* ------------------------------------------------------------------ */
type StepId = "read" | "interpret" | "write";
type StreamEvent =
  | { type: "step"; id: StepId; label: string; status: "running" | "done"; detail?: string }
  | { type: "token"; text: string }
  | { type: "done"; mode: "groq" | "fallback"; model: string | null; repo: string; note?: string };

type StudyState = {
  repo: string | null;
  steps: { id: StepId; label: string; status: "running" | "done"; detail?: string }[];
  text: string;
  streaming: boolean;
  phase: "idle" | "running" | "done";
  mode: "groq" | "fallback" | null;
  model: string | null;
};

const STUDY_INIT: StudyState = {
  repo: null,
  steps: [],
  text: "",
  streaming: false,
  phase: "idle",
  mode: null,
  model: null,
};

export default function LiveFromGitHub() {
  const mounted = useMounted();
  const prefersReduced = useReducedMotion();
  const reduce = !mounted || prefersReduced;

  const [repos, setRepos] = useState<Repo[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>("loading");

  const [study, setStudy] = useState<StudyState>(STUDY_INIT);
  const abortRef = useRef<AbortController | null>(null);

  // --- fetch public repos on the client ------------------------------
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9_000);

    (async () => {
      try {
        // Same-origin proxy: always 200 with { ok, repos } -- no cross-origin
        // network error ever reaches the browser console.
        const res = await fetch("/api/github", {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!res.ok) {
          if (!cancelled) setFetchState("error");
          return;
        }
        const body = (await res.json()) as { ok: boolean; repos: Repo[] };
        if (cancelled) return;
        const data = Array.isArray(body.repos) ? body.repos : [];
        if (!body.ok) {
          setFetchState("error");
          return;
        }
        if (data.length === 0) {
          setFetchState("empty");
          return;
        }
        // Keep real, non-fork, non-archived repos; sort by most recent push.
        const cleaned = data
          .filter((r) => r && !r.fork && !r.archived)
          .sort(
            (a, b) =>
              new Date(b.pushed_at || b.updated_at).getTime() -
              new Date(a.pushed_at || a.updated_at).getTime(),
          )
          .slice(0, TOP_N);
        setRepos(cleaned);
        setFetchState(cleaned.length ? "ready" : "empty");
      } catch {
        if (!cancelled) setFetchState("error");
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  // Clean up any in-flight case-study stream on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const upsertStep = useCallback(
    (incoming: { id: StepId; label: string; status: "running" | "done"; detail?: string }) => {
      setStudy((s) => {
        const idx = s.steps.findIndex((st) => st.id === incoming.id);
        const steps = idx === -1 ? [...s.steps, incoming] : s.steps.slice();
        if (idx !== -1) steps[idx] = { ...steps[idx], ...incoming };
        return { ...s, steps };
      });
    },
    [],
  );

  const generate = useCallback(
    async (repo: Repo) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStudy({
        repo: repo.name,
        steps: [],
        text: "",
        streaming: false,
        phase: "running",
        mode: null,
        model: null,
      });

      let res: Response;
      try {
        res = await fetch("/api/casestudy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repo: repo.name,
            description: repo.description ?? "",
            language: repo.language ?? "",
            topics: repo.topics ?? [],
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`case study failed: ${res.status}`);
      } catch {
        if (controller.signal.aborted) return;
        // Total network failure: show an honest inline note rather than nothing.
        setStudy((s) => ({
          ...s,
          phase: "done",
          streaming: false,
          mode: "fallback",
          text: `**A live case study needs the server.** I could not reach the case-study endpoint just now -- the repo card above still links to the real source on GitHub.`,
        }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handle = (ev: StreamEvent) => {
        switch (ev.type) {
          case "step":
            upsertStep({ id: ev.id, label: ev.label, status: ev.status, detail: ev.detail });
            break;
          case "token":
            setStudy((s) => ({ ...s, streaming: true, text: s.text + ev.text }));
            break;
          case "done":
            setStudy((s) => ({
              ...s,
              streaming: false,
              phase: "done",
              mode: ev.mode,
              model: ev.model,
            }));
            break;
        }
      };

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (controller.signal.aborted) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            try {
              handle(JSON.parse(line) as StreamEvent);
            } catch {
              // ignore a partial / malformed line
            }
          }
        }
      } catch {
        // stream dropped -- settle gracefully
      }

      if (!controller.signal.aborted) {
        setStudy((s) => ({ ...s, streaming: false, phase: s.phase === "running" ? "done" : s.phase }));
      }
    },
    [upsertStep],
  );

  // The section hides entirely while loading or on hard failure so it never
  // renders a broken/empty block. A soft note is shown on error AFTER a mount
  // so a recruiter understands why it is quiet, without a layout jump on SSR.
  const showSoftNote = mounted && (fetchState === "error" || fetchState === "empty");

  // While still loading (or before mount) render nothing to avoid a flash.
  if (!mounted || fetchState === "loading") {
    return null;
  }

  return (
    <section
      aria-labelledby="live-github-heading"
      className="mt-20 border-t border-line pt-14 sm:mt-24"
    >
      <div className="flex flex-col gap-3">
        <span className="kicker flex items-center gap-3">
          <span className="h-px w-8 bg-cyan/60" aria-hidden />
          Live from GitHub
        </span>
        <h2
          id="live-github-heading"
          className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-text sm:text-3xl"
        >
          A living portfolio, pulled straight from the source.
        </h2>
        <p className="max-w-2xl text-base leading-relaxed text-text-dim">
          Fetched live from Roshan&apos;s public GitHub, client-side and
          unauthenticated. Pick a repo and an agent will read its metadata and
          write a senior-engineer architecture case study on the spot.
        </p>
      </div>

      {showSoftNote ? (
        <p className="mt-8 flex items-center gap-2.5 rounded-xl border border-line bg-surface/40 px-4 py-3 text-sm text-text-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-text-faint/50" aria-hidden />
          GitHub is quiet right now (the public API may be rate-limited).
          Roshan&apos;s repos are always live at{" "}
          <a
            href="https://github.com/Roshan-Singh-AI"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan underline-offset-4 hover:underline"
          >
            github.com/Roshan-Singh-AI
          </a>
          .
        </p>
      ) : (
        <>
          {/* Repo grid */}
          <motion.ul
            variants={reduce ? undefined : staggerParent}
            initial={reduce ? false : "hidden"}
            whileInView={reduce ? undefined : "show"}
            viewport={viewportOnce}
            className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {repos.map((repo) => {
              const active = study.repo === repo.name;
              return (
                <motion.li
                  key={repo.id}
                  variants={reduce ? undefined : riseItem}
                  className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-surface/40 p-5 transition-colors duration-500 hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 font-[family-name:var(--font-mono)] text-sm font-medium text-text underline-offset-4 hover:text-cyan hover:underline"
                    >
                      <span className="truncate">{repo.name}</span>
                    </a>
                    <span
                      className="inline-flex shrink-0 items-center gap-1 font-[family-name:var(--font-mono)] text-[0.66rem] text-text-faint"
                      aria-label={`${repo.stargazers_count} stars`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-violet/80">
                        <path d="m12 2 2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.6 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2Z" />
                      </svg>
                      {repo.stargazers_count}
                    </span>
                  </div>

                  <p className="line-clamp-2 min-h-[2.5rem] text-[0.82rem] leading-relaxed text-text-dim">
                    {repo.description || "No description on GitHub yet."}
                  </p>

                  <div className="mt-auto flex items-center justify-between gap-2 pt-1 font-[family-name:var(--font-mono)] text-[0.64rem] text-text-faint">
                    <span className="inline-flex items-center gap-1.5">
                      {repo.language && (
                        <span
                          aria-hidden
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: langColor(repo.language) }}
                        />
                      )}
                      {repo.language || "—"}
                    </span>
                    {/* relative time is client-only -> safe because this whole
                        component only renders after mount (guarded above). */}
                    <span>updated {relativeTime(repo.pushed_at || repo.updated_at)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void generate(repo)}
                    disabled={active && study.phase === "running"}
                    className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-[0.78rem] font-medium text-text-dim transition-all duration-300 hover:border-cyan/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {active && study.phase === "running" ? (
                      <>
                        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan" aria-hidden />
                        Reading the repo...
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.5-6.5-2 2m-9 9-2 2m0-13 2 2m9 9 2 2" />
                        </svg>
                        Generate case study
                      </>
                    )}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>

          {/* Streamed case study */}
          <AnimatePresence mode="wait">
            {study.repo && (
              <motion.div
                key={study.repo}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className="mt-6 overflow-hidden rounded-2xl border border-line bg-[linear-gradient(160deg,rgba(34,211,238,0.04),rgba(167,139,250,0.05))]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                      {study.phase === "running" && !reduce && (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-60" />
                      )}
                      <span
                        className={`relative inline-flex h-2 w-2 rounded-full ${
                          study.phase === "running" ? "bg-cyan" : "bg-text-faint/50"
                        }`}
                      />
                    </span>
                    <span className="kicker text-[0.6rem]">Case study</span>
                    <span className="font-[family-name:var(--font-mono)] text-[0.66rem] text-text-dim">
                      {study.repo}
                    </span>
                  </div>
                  {/* live agent-trace ticker */}
                  <span
                    className="font-[family-name:var(--font-mono)] text-[0.6rem] text-text-faint"
                    aria-live="polite"
                  >
                    {study.phase === "running"
                      ? study.steps.find((s) => s.status === "running")?.label ?? "thinking..."
                      : study.mode === "groq"
                        ? "generated"
                        : study.mode === "fallback"
                          ? "templated (offline)"
                          : "idle"}
                  </span>
                </div>

                <div className="p-5 sm:p-6">
                  <div
                    aria-live="polite"
                    aria-atomic="false"
                    className="rounded-xl border border-line bg-bg/50 p-4"
                  >
                    {study.text.length === 0 ? (
                      <p className="text-sm text-text-faint">
                        Reading the repo metadata and interpreting the architecture...
                      </p>
                    ) : (
                      <div className="text-sm">
                        <AnswerMarkdown text={study.text} animate={study.streaming} />
                        {study.streaming && (
                          <motion.span
                            aria-hidden
                            className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-cyan align-middle"
                            animate={reduce ? undefined : { opacity: [1, 0.15, 1] }}
                            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Honest provenance label */}
                  {study.phase === "done" && study.mode && (
                    <p className="mt-3 flex items-center gap-2 text-[0.68rem] leading-relaxed text-text-faint">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          study.mode === "groq" ? "bg-cyan" : "bg-violet"
                        }`}
                        aria-hidden
                      />
                      {study.mode === "groq"
                        ? `AI-generated interpretation from public repo metadata (Groq ${study.model ?? ""}). Inference, not a source audit.`
                        : "AI-generated interpretation from public repo metadata (templated, offline). Inference, not a source audit."}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </section>
  );
}
