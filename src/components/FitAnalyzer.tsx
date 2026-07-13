"use client";

import { useCallback, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { useMounted } from "@/lib/useMounted";

/**
 * "Fit analyzer" -- paste a job description, get an honest, grounded read.
 *
 * A recruiter pastes a JD; on submit we POST to /api/fit, which retrieves
 * Roshan's most relevant REAL knowledge chunks with the site's TF-IDF
 * retriever and asks Groq for a structured fit analysis:
 *   - a short qualitative verdict (NOT a fake precise %)
 *   - 3-4 concrete STRENGTHS, each grounded in a real chunk + source label
 *   - rampUp[]: adjacent skills framed as fast pickups (never weaknesses)
 *   - a tailored 2-sentence note in a copyable block
 *
 * It is grounded ONLY in real context and never fabricates experience. If Groq
 * is unavailable the route returns a retrieval-only structured summary, so this
 * always renders something honest and useful (never 500s, never blank).
 *
 * Accessibility: labelled textarea, aria-live result region, a copy button
 * with a polite status. Hydration-safe: motion is gated behind useMounted so
 * the first client render matches SSR, and `disabled` is always a real boolean.
 */

type Strength = { point: string; source: string };

type FitResult = {
  verdict: string;
  strengths: Strength[];
  rampUp: string[];
  pitch: string;
  sources: string[];
  mode: "groq" | "fallback";
  model: string | null;
  note?: string;
};

type Phase = "idle" | "running" | "done" | "error";

const JD_MAX = 6000;

/** One-click sample roles a recruiter can drop in immediately. Each is a real,
 *  plausible JD -- the first is the flagship, the rest broaden the surface. */
const SAMPLE_JDS: { label: string; jd: string }[] = [
  {
    label: "LLM Applications Engineer",
    jd: `Senior AI Engineer -- LLM Applications. You will design and ship production RAG and agent systems: retrieval pipelines, tool-using agents, and the evaluation that proves they work. Experience with LangChain/LangGraph, vector and graph databases, reranking, and cost-aware model routing is a plus. You care about latency, cost, and measurable quality, not just demos.`,
  },
  {
    label: "RAG / Retrieval Engineer",
    jd: `RAG Engineer. Build and optimize retrieval pipelines over enterprise knowledge: ingestion, chunking, embeddings, hybrid vector + keyword + graph search, and cited answers. You will own retrieval quality with metrics like recall@k and RAGAS, add guardrails and PII redaction, and ship the pipeline to production.`,
  },
  {
    label: "Agent / Orchestration Engineer",
    jd: `AI Agent Engineer. Design multi-step agents that plan, call tools, self-validate, and recover from failures. Experience with LangGraph orchestration, ReAct and delegation patterns, MCP tool integrations, and building reusable agent platform components. You care about reliability and observability of agentic systems.`,
  },
];

export default function FitAnalyzer() {
  const mounted = useMounted();
  const prefersReduced = useReducedMotion();
  const reduce = !mounted || prefersReduced;

  const jdId = useId();
  const resultId = useId();
  const copyStatusId = useId();

  const [jd, setJd] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<FitResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const analyze = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("running");
    setResult(null);
    setErrorMsg("");
    setCopied(false);

    try {
      const res = await fetch("/api/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd: trimmed }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`fit failed: ${res.status}`);
      const data = (await res.json()) as FitResult;
      if (controller.signal.aborted) return;
      setResult(data);
      setPhase("done");
    } catch {
      if (controller.signal.aborted) return;
      // The route itself never 500s; this only trips on a total network drop.
      setPhase("error");
      setErrorMsg(
        "Could not reach the analyzer just now. The rest of the page still works -- feel free to send the JD directly using the form below.",
      );
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void analyze(jd);
  };

  const runSample = useCallback(
    (sample: string) => {
      setJd(sample);
      void analyze(sample);
    },
    [analyze],
  );

  const copyPitch = useCallback(async () => {
    if (!result?.pitch) return;
    try {
      await navigator.clipboard.writeText(result.pitch);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard blocked -- the text is still selectable in the block.
      setCopied(false);
    }
  }, [result]);

  const busy = phase === "running";

  return (
    <div className="relative isolate overflow-x-clip">
      {/* Aurora glow behind the panel -- intensifies while analyzing. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 -top-8 -bottom-8 -z-10 rounded-[40px] blur-3xl"
        style={{
          background:
            "radial-gradient(60% 60% at 30% 20%, rgba(127,183,154,0.20), transparent 70%), radial-gradient(55% 55% at 75% 80%, rgba(224,207,160,0.16), transparent 70%)",
        }}
        animate={
          reduce
            ? { opacity: 0.3 }
            : { opacity: busy ? [0.35, 0.6, 0.35] : 0.24, scale: busy ? [1, 1.02, 1] : 1 }
        }
        transition={
          reduce
            ? { duration: 0 }
            : { duration: busy ? 3.2 : 0.8, repeat: busy ? Infinity : 0, ease: "easeInOut" }
        }
      />

      <div className="overflow-hidden rounded-3xl border border-line bg-[linear-gradient(160deg,rgba(127,183,154,0.06),rgba(224,207,160,0.05))] backdrop-blur-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              {busy && !reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-60" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${busy ? "bg-cyan" : "bg-text-faint/50"}`} />
            </span>
            <span className="kicker text-[0.62rem]">Fit analyzer</span>
            <span className="font-[family-name:var(--font-mono)] text-[0.66rem] text-text-dim">
              retrieval-backed
            </span>
          </div>
          <span className="font-[family-name:var(--font-mono)] text-[0.62rem] text-text-faint">
            {phase === "done" && result
              ? result.mode === "groq"
                ? "analyzed"
                : "retrieval-only"
              : busy
                ? "analyzing..."
                : "idle"}
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label htmlFor={jdId} className="kicker text-[0.62rem]">
                Paste the JD
              </label>
              <span
                className={`font-[family-name:var(--font-mono)] text-[0.62rem] ${
                  jd.length > JD_MAX * 0.9 ? "text-gold" : "text-text-faint"
                }`}
              >
                {jd.length}/{JD_MAX}
              </span>
            </div>
            <textarea
              id={jdId}
              value={jd}
              maxLength={JD_MAX}
              onChange={(e) => setJd(e.target.value)}
              rows={5}
              placeholder="Paste the role's responsibilities and requirements. The analyzer matches them against Roshan's real, documented experience and drafts a note you can send."
              className="w-full resize-y rounded-xl border border-line bg-bg/60 px-4 py-3 text-sm leading-relaxed text-text placeholder:text-text-faint transition-colors duration-300 focus:border-cyan/60 focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={Boolean(busy || jd.trim().length === 0)}
                className="group inline-flex items-center gap-2 rounded-full bg-[linear-gradient(115deg,#e6d5ad,#d8c9a3,#cbb98a)] px-6 py-3 text-sm font-medium text-[#241d09] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] transition-all duration-300 hover:shadow-[0_16px_44px_-12px_rgba(224,207,160,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Analyzing..." : "Analyze fit"}
                {!busy && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5">
                    <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          {/* One-click sample JDs -- visible immediately so a recruiter can see
              the feature work without pasting anything. */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="kicker mr-1 text-[0.56rem]">Or try one</span>
            {SAMPLE_JDS.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={busy}
                onClick={() => runSample(s.jd)}
                className="rounded-full border border-line bg-white/[0.02] px-3.5 py-1.5 text-[0.72rem] text-text-dim transition-colors duration-300 hover:border-cyan/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
            {/* Kept for the legacy one-click path + a familiar affordance. */}
            <button
              type="button"
              disabled={busy}
              onClick={() => runSample(SAMPLE_JDS[0].jd)}
              className="rounded-full border border-line bg-white/[0.02] px-3.5 py-1.5 text-[0.72rem] text-text-dim transition-colors duration-300 hover:border-cyan/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              Try a sample JD
            </button>
          </div>

          {/* Result */}
          <div id={resultId} aria-live="polite" aria-atomic="false">
            <AnimatePresence mode="wait">
              {busy && (
                <motion.div
                  key="loading"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE_OUT }}
                  className="mt-8 flex flex-col gap-3"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      aria-hidden
                      className="h-14 rounded-xl border border-line bg-white/[0.02]"
                      animate={reduce ? { opacity: 0.5 } : { opacity: [0.35, 0.7, 0.35] }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }
                      }
                    />
                  ))}
                  <span className="sr-only">Analyzing the job description</span>
                </motion.div>
              )}

              {phase === "error" && (
                <motion.p
                  key="error"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="mt-6 rounded-xl border border-line bg-surface/40 px-4 py-3 text-sm text-text-dim"
                >
                  {errorMsg}
                </motion.p>
              )}

              {phase === "done" && result && (
                <motion.div
                  key="result"
                  initial={reduce ? false : "hidden"}
                  animate="show"
                  exit={{ opacity: 0 }}
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: reduce ? 0 : 0.09, delayChildren: reduce ? 0 : 0.04 } },
                  }}
                  className="mt-8 flex flex-col gap-6"
                >
                  {/* VERDICT -- the confident headline read, visually dominant. */}
                  <motion.div
                    variants={{
                      hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
                    }}
                    className="relative overflow-hidden rounded-2xl border border-gold/30 bg-[linear-gradient(135deg,rgba(224,207,160,0.10),rgba(127,183,154,0.06))] p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/[0.08] px-3 py-1 text-[0.7rem] font-medium text-gold">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="m5 12 5 5 9-11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Overall read
                      </span>
                    </div>
                    <p className="mt-3 text-lg font-medium leading-snug tracking-tight text-text sm:text-xl balance">
                      {result.verdict}
                    </p>
                  </motion.div>

                  {/* STRENGTHS -- the strongest signal, dominant cards + source chips. */}
                  {result.strengths.length > 0 && (
                    <motion.div
                      variants={{
                        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
                      }}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="kicker text-[0.6rem]">Where Roshan matches</span>
                        <span className="font-[family-name:var(--font-mono)] text-[0.6rem] text-text-faint">
                          {result.strengths.length} grounded
                        </span>
                      </div>
                      <ul className="mt-3 grid gap-2.5">
                        {result.strengths.map((s, i) => (
                          <motion.li
                            key={`s-${i}`}
                            initial={reduce ? false : { opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, ease: EASE_OUT, delay: reduce ? 0 : 0.1 + i * 0.06 }}
                            className="group flex items-start gap-3 rounded-xl border border-line bg-bg/40 p-4 transition-colors duration-300 hover:border-cyan/40"
                          >
                            <span
                              aria-hidden
                              className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-cyan/50 bg-cyan/10 text-cyan"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                <path d="m5 12 5 5 9-11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-relaxed text-text">{s.point}</p>
                              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/[0.07] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[0.6rem] text-cyan">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <path d="M9 17H7A5 5 0 0 1 7 7h2m6 0h2a5 5 0 0 1 0 10h-2m-7-5h8" />
                                </svg>
                                {s.source}
                              </span>
                            </div>
                          </motion.li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* WHERE I'D RAMP FAST -- de-emphasized, positive, secondary.
                      Adjacent skills framed as momentum, never deficits. */}
                  {result.rampUp.length > 0 && (
                    <motion.div
                      variants={{
                        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
                      }}
                      className="rounded-xl border border-line bg-white/[0.02] px-4 py-3.5"
                    >
                      <span className="kicker text-[0.58rem] text-text-faint">Where I&apos;d ramp fast</span>
                      <ul className="mt-2.5 flex flex-col gap-2">
                        {result.rampUp.map((g, i) => (
                          <li
                            key={`r-${i}`}
                            className="flex items-start gap-2.5 text-[0.82rem] leading-relaxed text-text-dim"
                          >
                            <span aria-hidden className="mt-[0.5rem] h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-cyan to-gold" />
                            {g}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* DRAFTED NOTE -- copyable, in Roshan's voice. */}
                  {result.pitch && (
                    <motion.div
                      variants={{
                        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
                      }}
                      className="rounded-2xl border border-cyan/25 bg-cyan/[0.05] p-4 sm:p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="kicker text-[0.6rem]">A note Roshan could send</span>
                        <button
                          type="button"
                          onClick={() => void copyPitch()}
                          aria-describedby={copyStatusId}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg/40 px-3 py-1.5 text-[0.7rem] text-text-dim transition-colors duration-300 hover:border-cyan/50 hover:text-text"
                        >
                          {copied ? (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="m5 12 5 5 9-11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <rect x="9" y="9" width="11" height="11" rx="2" />
                                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <blockquote className="mt-3 border-l-2 border-cyan/40 pl-4 text-sm leading-relaxed text-text">
                        {result.pitch}
                      </blockquote>
                      <span id={copyStatusId} role="status" aria-live="polite" className="sr-only">
                        {copied ? "Note copied to clipboard" : ""}
                      </span>
                    </motion.div>
                  )}

                  {/* Provenance -- honest, one line, not over-explained. */}
                  <p className="flex items-center gap-2 text-[0.68rem] leading-relaxed text-text-faint">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${result.mode === "groq" ? "bg-cyan" : "bg-gold"}`}
                      aria-hidden
                    />
                    {result.mode === "groq"
                      ? `Analyzed by Groq${result.model ? ` (${result.model})` : ""}, grounded only on Roshan's documented work${result.sources.length ? ` -- ${result.sources.join(", ")}` : ""}.`
                      : `Retrieval-only read (live model offline), grounded only on Roshan's documented work${result.sources.length ? ` -- ${result.sources.join(", ")}` : ""}.`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
