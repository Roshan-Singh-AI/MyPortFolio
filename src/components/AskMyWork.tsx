"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { knowledge } from "@/content/knowledge";
import { buildIndex, scoreAll } from "@/lib/retrieval";
import { composeAnswer } from "@/lib/compose";
import { EASE_OUT } from "@/lib/motion";

/** Seed questions a recruiter can try with one click. */
const SUGGESTED = [
  "What has Roshan built with agents?",
  "How does he evaluate RAG?",
  "What's his strongest project?",
  "Does he know MCP?",
  "Tell me about his GraphRAG work",
  "How does he control LLM cost?",
] as const;

/** Pipeline stages, shown as a left-to-right stepper. */
const STAGES = ["Query", "Retrieve", "Ground", "Answer"] as const;
type Stage = 0 | 1 | 2 | 3;

/** Shape returned by /api/ask (kept in sync with the route handler). */
type ApiChunk = {
  id: string;
  source: string;
  text: string;
  score: number;
};
type ApiResponse = {
  answer: string;
  sources: string[];
  chunks: ApiChunk[];
  mode: "groq" | "fallback";
  model: string | null;
  note?: string;
};

type Phase = "idle" | "retrieving" | "generating" | "done" | "error";

const TOP_K = 4;

export default function AskMyWork() {
  const reduce = useReducedMotion();
  const inputId = useId();
  const liveId = useId();

  // Build the TF-IDF index once on the client for the instant retrieval
  // preview (the "money shot" bars) before the server answer returns.
  const index = useMemo(() => buildIndex(knowledge), []);

  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState<Stage>(0);
  const [chunks, setChunks] = useState<ApiChunk[]>([]);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [mode, setMode] = useState<"groq" | "fallback" | null>(null);
  const [model, setModel] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      abortRef.current?.abort();
    },
    [clearTimers],
  );

  const run = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question) return;

      // Reset any in-flight run.
      abortRef.current?.abort();
      clearTimers();
      const controller = new AbortController();
      abortRef.current = controller;

      setSubmitted(question);
      setAnswer("");
      setSources([]);
      setMode(null);
      setModel(null);
      setPhase("retrieving");
      setStage(1);

      // Instant client-side retrieval preview -- deterministic, offline.
      const localTop = scoreAll(index, question).slice(0, TOP_K);
      const localChunks: ApiChunk[] = localTop.map((s) => ({
        id: s.chunk.id,
        source: s.chunk.source,
        text: s.chunk.text,
        score: Math.round(s.score * 1000) / 1000,
      }));
      setChunks(localChunks);

      // Fire the server request in parallel with the retrieval animation.
      const request = fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      })
        .then(async (res): Promise<ApiResponse> => {
          if (!res.ok) throw new Error(`ask failed: ${res.status}`);
          return (await res.json()) as ApiResponse;
        })
        .catch((): ApiResponse | null => null);

      // Let the retrieval bars breathe, then move to grounding/generating.
      const dwell = reduce ? 0 : 900;
      timersRef.current.push(
        setTimeout(() => {
          setStage(2);
          setPhase("generating");
        }, dwell),
      );

      const [res] = await Promise.all([
        request,
        new Promise((r) => timersRef.current.push(setTimeout(r, dwell))),
      ]);

      if (controller.signal.aborted) return;

      if (res) {
        setChunks(res.chunks);
        setAnswer(res.answer);
        setSources(res.sources);
        setMode(res.mode);
        setModel(res.model);
      } else {
        // Network failed entirely (e.g. offline export) -> compose locally so
        // the widget still works. Honest fallback, no fabrication.
        const composed = composeAnswer(localTop);
        setAnswer(composed.text);
        setSources(composed.citations);
        setMode("fallback");
        setModel(null);
      }
      setStage(3);
      setPhase("done");
    },
    [index, reduce, clearTimers],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(query);
  };

  const maxScore = useMemo(
    () => Math.max(0.0001, ...chunks.map((c) => c.score)),
    [chunks],
  );

  const busy = phase === "retrieving" || phase === "generating";

  return (
    <div className="mt-12 overflow-hidden rounded-3xl border border-line bg-[linear-gradient(160deg,rgba(34,211,238,0.04),rgba(167,139,250,0.05))]">
      {/* Pipeline stepper header */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-b border-line px-6 py-4 sm:px-8">
        <span className="kicker mr-2 text-[0.62rem]">Pipeline</span>
        {STAGES.map((label, i) => {
          const active = i <= stage && (submitted || i === 0);
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-[family-name:var(--font-mono)] text-[0.64rem] transition-colors duration-500 ${
                  active
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-line bg-white/[0.02] text-text-faint"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    active ? "bg-cyan" : "bg-text-faint/40"
                  }`}
                  aria-hidden
                />
                {label}
              </span>
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden
                  className={`h-px w-4 transition-colors duration-500 sm:w-6 ${
                    i < stage ? "bg-cyan/50" : "bg-line"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="p-6 sm:p-8">
        {/* Query input */}
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label htmlFor={inputId} className="sr-only">
            Ask a question about Roshan&apos;s work
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-[family-name:var(--font-mono)] text-sm text-cyan"
              >
                &gt;
              </span>
              <input
                id={inputId}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask my work -- e.g. how does he evaluate RAG?"
                maxLength={500}
                autoComplete="off"
                aria-describedby={liveId}
                className="w-full rounded-xl border border-line bg-bg/60 py-3.5 pl-9 pr-4 text-sm text-text placeholder:text-text-faint transition-colors duration-300 focus:border-cyan/60 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !query.trim()}
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(115deg,#22d3ee,#a78bfa)] px-6 py-3.5 text-sm font-medium text-[#08080c] transition-all duration-300 hover:shadow-[0_14px_40px_-12px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Retrieving..." : "Ask"}
              {!busy && (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  <path
                    d="M5 12h14m-6-6 6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Suggested-question chips */}
          <div className="flex flex-wrap gap-2" role="list" aria-label="Suggested questions">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                type="button"
                role="listitem"
                onClick={() => {
                  setQuery(q);
                  void run(q);
                }}
                className="rounded-full border border-line bg-white/[0.02] px-3 py-1.5 text-[0.78rem] text-text-dim transition-colors duration-300 hover:border-cyan/50 hover:text-text"
              >
                {q}
              </button>
            ))}
          </div>
        </form>

        {/* Retrieval visualization + answer */}
        <AnimatePresence mode="wait">
          {submitted && (
            <motion.div
              key="results"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1fr]"
            >
              {/* Retrieval column -- the money shot */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="kicker text-[0.62rem]">
                    Retrieval &middot; cosine similarity
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-[0.62rem] text-text-faint">
                    {knowledge.length} chunks scored
                  </span>
                </div>

                <ul className="flex flex-col gap-2">
                  {chunks.map((c, i) => {
                    const pct = Math.round((c.score / maxScore) * 100);
                    const isTop = i === 0 && c.score > 0;
                    return (
                      <li
                        key={c.id}
                        className={`rounded-xl border p-3 transition-colors duration-500 ${
                          isTop
                            ? "border-cyan/40 bg-cyan/[0.06]"
                            : "border-line bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate font-[family-name:var(--font-mono)] text-[0.7rem] text-text-dim">
                            [{c.source}]
                          </span>
                          <span className="shrink-0 font-[family-name:var(--font-mono)] text-[0.7rem] text-cyan">
                            {c.score.toFixed(3)}
                          </span>
                        </div>
                        <div
                          className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]"
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${c.source} similarity ${pct} percent`}
                        >
                          <motion.div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#a78bfa)]"
                            initial={reduce ? false : { width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{
                              duration: reduce ? 0 : 0.7,
                              ease: EASE_OUT,
                              delay: reduce ? 0 : i * 0.08,
                            }}
                          />
                        </div>
                        <p className="mt-2 line-clamp-2 text-[0.74rem] leading-relaxed text-text-faint">
                          {c.text}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Answer column */}
              <div className="flex flex-col">
                <div className="mb-3 flex items-center gap-2">
                  <span className="kicker text-[0.62rem]">Grounded answer</span>
                  {busy && (
                    <span className="flex items-center gap-1" aria-hidden>
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="h-1 w-1 rounded-full bg-cyan"
                          animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: d * 0.18,
                          }}
                        />
                      ))}
                    </span>
                  )}
                </div>

                <div
                  id={liveId}
                  aria-live="polite"
                  aria-atomic="true"
                  className="flex-1 rounded-xl border border-line bg-bg/50 p-4"
                >
                  {phase === "generating" && !answer ? (
                    <p className="text-sm text-text-faint">
                      {model === null
                        ? "Composing a grounded answer from the top matches..."
                        : "Generating..."}
                    </p>
                  ) : (
                    <motion.p
                      key={answer}
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-sm leading-relaxed text-text"
                    >
                      {answer}
                    </motion.p>
                  )}

                  {sources.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      <span className="kicker text-[0.58rem]">Sources</span>
                      {sources.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-violet/40 bg-violet/[0.08] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[0.64rem] text-violet"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Honest provenance label */}
                {phase === "done" && (
                  <motion.p
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="mt-3 flex items-center gap-2 text-[0.68rem] text-text-faint"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        mode === "groq" ? "bg-cyan" : "bg-violet"
                      }`}
                      aria-hidden
                    />
                    {mode === "groq"
                      ? `Answer generated by Groq (${model}) grounded on the retrieved chunks.`
                      : "Retrieval-grounded (offline) -- composed from the matched sources, no live LLM."}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
