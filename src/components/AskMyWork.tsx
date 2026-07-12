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

/**
 * "Ask my work" -- a visible AI AGENT that shows its work.
 *
 * The widget renders the agent loop as an animated trace timeline
 * (Plan -> Retrieve -> Grade context -> [Refine] -> Answer), with an inline
 * tool-call card for retrieval (similarity bars + a small GraphRAG node view),
 * a confidence read, then a token-by-token streamed answer with citations and
 * an honest provenance label.
 *
 * It consumes /api/ask/stream (NDJSON): agent-trace events, retrieved chunks,
 * a grade, streamed tokens, and a terminal `done`. If the network is entirely
 * unavailable (e.g. static preview), it composes and "types" a grounded answer
 * locally so the experience still works. Never fabricates facts.
 *
 * Accessibility: keyboard-operable input, chips, and Stop; aria-live regions
 * for the step status and the streaming answer; role/labels on the trace; and
 * a reduced-motion path with no fake streaming delay.
 *
 * Hydration-safe: the initial render is identical on server and client (no
 * Math.random / Date.now in render), and `disabled` is always a real boolean.
 */

/** Seed questions a recruiter can try with one click. */
const SUGGESTED = [
  "What has Roshan built with agents?",
  "How does he evaluate RAG?",
  "What's his strongest project?",
  "Does he know MCP?",
  "Tell me about his GraphRAG work",
  "How does he control LLM cost?",
] as const;

const TOP_K = 4;

/* ------------------------------------------------------------------ */
/*  Wire types (kept in sync with /api/ask/stream)                     */
/* ------------------------------------------------------------------ */
type WireChunk = { id: string; source: string; text: string; score: number };
type StepId = "plan" | "retrieve" | "grade" | "refine" | "answer";
type StepStatus = "running" | "done";

type StreamEvent =
  | { type: "step"; id: StepId; label: string; status: StepStatus; detail?: string }
  | { type: "chunks"; chunks: WireChunk[]; topK: number; scored: number }
  | { type: "grade"; confidence: number; label: "high" | "medium" | "low"; lowConfidence: boolean }
  | { type: "token"; text: string }
  | {
      type: "done";
      mode: "groq" | "fallback";
      model: string | null;
      sources: string[];
      chunks: WireChunk[];
      confidence: number;
      confidenceLabel: "high" | "medium" | "low";
      note?: string;
    };

/** A step as tracked in local UI state. */
type TraceStep = {
  id: StepId;
  label: string;
  status: "pending" | "running" | "done";
  detail?: string;
};

type Phase = "idle" | "running" | "done";

/** Icons per step -- small, monoline, currentColor. */
function StepIcon({ id }: { id: StepId }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (id) {
    case "plan":
      return (
        <svg {...common}>
          <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.5-6.5-2 2m-9 9-2 2m0-13 2 2m9 9 2 2" />
        </svg>
      );
    case "retrieve":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "grade":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" />
          <path d="M12 12V7m0 5 3.5 2" />
        </svg>
      );
    case "refine":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16m0 5v-5h5" />
        </svg>
      );
    case "answer":
      return (
        <svg {...common}>
          <path d="M12 2 3 7v10l9 5 9-5V7l-9-5z" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Retrieval graph -- small "nodes light up and connect to the query" */
/* ------------------------------------------------------------------ */
function RetrievalGraph({
  chunks,
  maxScore,
  reduce,
}: {
  chunks: WireChunk[];
  maxScore: number;
  reduce: boolean | null;
}) {
  // Deterministic layout: query node on the left, chunk nodes fanned on the
  // right. No randomness -> hydration-safe and stable across renders.
  const W = 260;
  const H = 150;
  const qx = 30;
  const qy = H / 2;
  const n = Math.max(1, chunks.length);
  const nodes = chunks.map((c, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    return { x: W - 40, y: 26 + t * (H - 52), c };
  });

  // Hover reveals the REAL source + score of the node under the cursor.
  const [hover, setHover] = useState<number | null>(null);
  const hovered = hover !== null ? nodes[hover] : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[150px] w-full"
      role="img"
      aria-label="Retrieval graph connecting the query to the matched knowledge chunks. Node size and edge weight encode real cosine similarity."
    >
      <defs>
        <linearGradient id="amw-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>

      {/* edges query -> chunk, weighted by REAL similarity */}
      {nodes.map(({ x, y, c }, i) => {
        const rel = c.score / maxScore;
        const mx = (qx + x) / 2;
        const isHover = hover === i;
        return (
          <motion.path
            key={`e-${c.id}`}
            d={`M ${qx} ${qy} C ${mx} ${qy}, ${mx} ${y}, ${x} ${y}`}
            fill="none"
            stroke="url(#amw-edge)"
            strokeWidth={0.6 + rel * 2.4}
            strokeOpacity={isHover ? 0.95 : 0.18 + rel * 0.55}
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT, delay: reduce ? 0 : i * 0.1 }}
          />
        );
      })}

      {/* chunk nodes -- brighter + larger the higher they REALLY scored.
          Each node is hoverable and carries its real source + score. */}
      {nodes.map(({ x, y, c }, i) => {
        const rel = c.score / maxScore;
        const r = 3 + rel * 4;
        return (
          <motion.g
            key={`n-${c.id}`}
            initial={reduce ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.4, ease: EASE_OUT, delay: reduce ? 0 : 0.1 + i * 0.1 }}
            style={{ transformOrigin: `${x}px ${y}px`, cursor: "pointer" }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            onFocus={() => setHover(i)}
            onBlur={() => setHover((h) => (h === i ? null : h))}
            tabIndex={0}
            role="listitem"
            aria-label={`${c.source}, similarity ${c.score.toFixed(3)}`}
          >
            <title>{`${c.source} -- similarity ${c.score.toFixed(3)}`}</title>
            {i === 0 && rel > 0 && !reduce && (
              <motion.circle
                cx={x}
                cy={y}
                r={r}
                fill="none"
                stroke="#22d3ee"
                strokeWidth={1}
                animate={{ r: [r, r + 6], opacity: [0.6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            {/* generous transparent hit area for easy hover/focus */}
            <circle cx={x} cy={y} r={11} fill="transparent" />
            <circle
              cx={x}
              cy={y}
              r={hover === i ? r + 1.5 : r}
              fill={i === 0 ? "#22d3ee" : "#a78bfa"}
              opacity={hover === i ? 1 : 0.35 + rel * 0.55}
            />
          </motion.g>
        );
      })}

      {/* query node */}
      <circle cx={qx} cy={qy} r={5} fill="#7dd3fc" />
      <circle cx={qx} cy={qy} r={9} fill="none" stroke="#7dd3fc" strokeWidth={1} strokeOpacity={0.4} />
      <text
        x={qx}
        y={qy + 24}
        textAnchor="middle"
        className="font-[family-name:var(--font-mono)]"
        fontSize="8"
        fill="#6b6f82"
      >
        query
      </text>

      {/* Live readout of the hovered node's REAL source + score */}
      <text
        x={W - 40}
        y={12}
        textAnchor="end"
        className="font-[family-name:var(--font-mono)]"
        fontSize="8"
        fill={hovered ? "#22d3ee" : "#6b6f82"}
      >
        {hovered
          ? `${hovered.c.source} · ${hovered.c.score.toFixed(3)}`
          : "hover a node"}
      </text>
    </svg>
  );
}

export default function AskMyWork() {
  const reduce = useReducedMotion();
  const inputId = useId();
  const answerId = useId();
  const traceId = useId();

  // Client-side TF-IDF index for the offline compose fallback (no network).
  const index = useMemo(() => buildIndex(knowledge), []);

  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");

  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [chunks, setChunks] = useState<WireChunk[]>([]);
  const [scoredCount, setScoredCount] = useState(knowledge.length);
  const [grade, setGrade] =
    useState<{ confidence: number; label: "high" | "medium" | "low" } | null>(null);
  const [answer, setAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
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

  /** Merge a step event into the ordered step list, upgrading status/detail. */
  const upsertStep = useCallback((incoming: TraceStep) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === incoming.id);
      if (idx === -1) return [...prev, incoming];
      const next = prev.slice();
      next[idx] = { ...next[idx], ...incoming };
      return next;
    });
  }, []);

  /** Local, offline compose fallback -- typed out for a consistent feel. */
  const runOffline = useCallback(
    async (question: string, signal: AbortSignal) => {
      const localTop = scoreAll(index, question).slice(0, TOP_K);
      const localChunks: WireChunk[] = localTop.map((s) => ({
        id: s.chunk.id,
        source: s.chunk.source,
        text: s.chunk.text,
        score: Math.round(s.score * 1000) / 1000,
      }));
      setChunks(localChunks);
      setScoredCount(knowledge.length);

      const top = localTop[0]?.score ?? 0;
      const label = top >= 0.16 ? "high" : top >= 0.06 ? "medium" : "low";
      setGrade({ confidence: Math.round(top * 1000) / 1000, label });

      upsertStep({ id: "plan", label: "Plan", status: "done", detail: "Interpreted the question as a retrieval query." });
      upsertStep({ id: "retrieve", label: "Retrieve", status: "done", detail: `searched ${knowledge.length} chunks -> top ${localChunks.length}` });
      upsertStep({ id: "grade", label: "Grade context", status: "done" });
      upsertStep({ id: "answer", label: "Answer", status: "running" });

      const composed = composeAnswer(localTop);
      setSources(composed.citations);
      setMode("fallback");
      setModel(null);
      setStreaming(true);

      if (reduce) {
        setAnswer(composed.text);
      } else {
        const toks = composed.text.match(/\S+\s*/g) ?? [composed.text];
        for (const t of toks) {
          if (signal.aborted) break;
          setAnswer((a) => a + t);
          await new Promise<void>((r) => {
            timersRef.current.push(setTimeout(r, 22));
          });
        }
      }
      upsertStep({ id: "answer", label: "Answer", status: "done" });
      setStreaming(false);
      setPhase("done");
    },
    [index, reduce, upsertStep],
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
      setSteps([]);
      setChunks([]);
      setGrade(null);
      setAnswer("");
      setSources([]);
      setMode(null);
      setModel(null);
      setStreaming(false);
      setPhase("running");

      let res: Response;
      try {
        res = await fetch("/api/ask/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);
      } catch {
        if (controller.signal.aborted) return;
        await runOffline(question, controller.signal);
        return;
      }

      // Consume the NDJSON stream line by line.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawDone = false;

      const handle = (ev: StreamEvent) => {
        switch (ev.type) {
          case "step":
            upsertStep({
              id: ev.id,
              label: ev.label,
              status: ev.status === "done" ? "done" : "running",
              detail: ev.detail,
            });
            break;
          case "chunks":
            setChunks(ev.chunks);
            setScoredCount(ev.scored);
            break;
          case "grade":
            setGrade({ confidence: ev.confidence, label: ev.label });
            break;
          case "token":
            setStreaming(true);
            setAnswer((a) => a + ev.text);
            break;
          case "done":
            sawDone = true;
            setSources(ev.sources);
            setMode(ev.mode);
            setModel(ev.model);
            setGrade({ confidence: ev.confidence, label: ev.confidenceLabel });
            if (ev.chunks.length) setChunks(ev.chunks);
            setStreaming(false);
            setPhase("done");
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
        // Network dropped mid-stream. If we never got a terminal event and
        // have no answer yet, compose one locally so the widget still works.
        if (!controller.signal.aborted && !sawDone) {
          await runOffline(question, controller.signal);
          return;
        }
      }

      if (!controller.signal.aborted) {
        setStreaming(false);
        setPhase("done");
      }
    },
    [clearTimers, runOffline, upsertStep],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    clearTimers();
    setStreaming(false);
    // Keep whatever streamed so far; mark the run as finished.
    setPhase((p) => (p === "running" ? "done" : p));
  }, [clearTimers]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(query);
  };

  const maxScore = useMemo(
    () => Math.max(0.0001, ...chunks.map((c) => c.score)),
    [chunks],
  );

  const busy = phase === "running";
  const gradePct = grade ? Math.min(100, Math.round((grade.confidence / 0.35) * 100)) : 0;

  const gradeTone =
    grade?.label === "high"
      ? "text-cyan"
      : grade?.label === "medium"
        ? "text-violet"
        : "text-text-faint";

  return (
    // Outer wrapper clips the aurora's horizontal bleed so its blur + scale
    // animation can never widen the document (no mobile horizontal overflow).
    <div className="relative isolate mt-12 overflow-x-clip">
      {/* Aurora glow behind the agent panel -- intensifies while thinking.
          Vertical bleed only; horizontal is clipped by the wrapper. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 -top-10 -bottom-8 -z-10 rounded-[40px] blur-3xl"
        style={{
          background:
            "radial-gradient(60% 60% at 30% 20%, rgba(34,211,238,0.20), transparent 70%), radial-gradient(55% 55% at 75% 80%, rgba(167,139,250,0.20), transparent 70%)",
        }}
        animate={
          reduce
            ? { opacity: 0.35 }
            : { opacity: busy ? [0.4, 0.7, 0.4] : 0.28, scale: busy ? [1, 1.03, 1] : 1 }
        }
        transition={
          reduce
            ? { duration: 0 }
            : { duration: busy ? 3.2 : 0.8, repeat: busy ? Infinity : 0, ease: "easeInOut" }
        }
      />

      <div className="overflow-hidden rounded-3xl border border-line bg-[linear-gradient(160deg,rgba(34,211,238,0.04),rgba(167,139,250,0.05))] backdrop-blur-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              {busy && !reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-60" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${busy ? "bg-cyan" : "bg-text-faint/50"}`} />
            </span>
            <span className="kicker text-[0.62rem]">Agent</span>
            <span className="font-[family-name:var(--font-mono)] text-[0.66rem] text-text-dim">
              retrieval-augmented &middot; shows its work
            </span>
          </div>
          <span className="font-[family-name:var(--font-mono)] text-[0.62rem] text-text-faint">
            {phase === "done" && mode
              ? mode === "groq"
                ? "generated"
                : "grounded (offline)"
              : busy
                ? "thinking..."
                : "idle"}
          </span>
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
                  aria-describedby={answerId}
                  className="w-full rounded-xl border border-line bg-bg/60 py-3.5 pl-9 pr-4 text-sm text-text placeholder:text-text-faint transition-colors duration-300 focus:border-cyan/60 focus:outline-none"
                />
              </div>
              {busy ? (
                <button
                  type="button"
                  onClick={stop}
                  className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-text-dim transition-all duration-300 hover:border-cyan/50 hover:text-text"
                >
                  <span className="h-2.5 w-2.5 rounded-[2px] bg-cyan" aria-hidden />
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={query.trim().length === 0}
                  className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(115deg,#22d3ee,#a78bfa)] px-6 py-3.5 text-sm font-medium text-[#08080c] transition-all duration-300 hover:shadow-[0_14px_40px_-12px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ask
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
                </button>
              )}
            </div>

            {/* Suggested-question chips. Real <button>s inside a list so they
                announce as buttons AND are grouped for screen readers. */}
            <ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
              {SUGGESTED.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setQuery(q);
                      void run(q);
                    }}
                    className="rounded-full border border-line bg-white/[0.02] px-3 py-1.5 text-[0.78rem] text-text-dim transition-colors duration-300 hover:border-cyan/50 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </form>

          {/* Empty state -- inviting prompt before the first question */}
          {phase === "idle" && (
            <motion.p
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mt-6 max-w-md text-[0.82rem] leading-relaxed text-text-faint"
            >
              Pick a question or type your own. You will watch the agent{" "}
              <span className="text-text-dim">plan</span>,{" "}
              <span className="text-text-dim">retrieve</span> from a{" "}
              {knowledge.length}-fact knowledge base,{" "}
              <span className="text-text-dim">grade</span> the context, then{" "}
              <span className="text-text-dim">stream</span> a cited answer.
            </motion.p>
          )}

          {/* The agent at work */}
          <AnimatePresence mode="wait">
            {submitted && (
              <motion.div
                key="run"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className="mt-8 grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
              >
                {/* -------- Left: agent trace timeline -------- */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="kicker text-[0.62rem]">Agent trace</span>
                    <span className="font-[family-name:var(--font-mono)] text-[0.62rem] text-text-faint">
                      {steps.filter((s) => s.status === "done").length}/{steps.length || "-"} steps
                    </span>
                  </div>

                  <ol
                    id={traceId}
                    className="relative flex flex-col gap-3"
                    aria-label="Agent reasoning steps"
                    aria-live="polite"
                  >
                    {/* connecting spine */}
                    <span
                      aria-hidden
                      className="absolute bottom-3 left-[13px] top-3 w-px bg-line"
                    />
                    <AnimatePresence initial={false}>
                      {steps.map((s) => {
                        const running = s.status === "running";
                        const done = s.status === "done";
                        return (
                          <motion.li
                            key={s.id}
                            layout={!reduce}
                            initial={reduce ? false : { opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.35, ease: EASE_OUT }}
                            className="relative flex gap-3"
                          >
                            {/* node */}
                            <span className="relative z-10 mt-0.5 flex h-[27px] w-[27px] shrink-0 items-center justify-center">
                              {running && !reduce && (
                                <motion.span
                                  className="absolute inset-0 rounded-full border border-cyan/50"
                                  animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                                />
                              )}
                              <span
                                className={`flex h-[27px] w-[27px] items-center justify-center rounded-full border transition-colors duration-300 ${
                                  done
                                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                                    : running
                                      ? "border-cyan/60 bg-cyan/[0.14] text-cyan"
                                      : "border-line bg-white/[0.02] text-text-faint"
                                }`}
                              >
                                {done ? (
                                  <motion.svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden
                                    initial={reduce ? false : { scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: reduce ? "tween" : "spring", stiffness: 400, damping: 16 }}
                                  >
                                    <path
                                      d="m5 12 5 5 9-11"
                                      stroke="currentColor"
                                      strokeWidth="2.4"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </motion.svg>
                                ) : (
                                  <StepIcon id={s.id} />
                                )}
                              </span>
                            </span>

                            {/* label + detail */}
                            <div className="min-w-0 flex-1 pb-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-medium transition-colors duration-300 ${
                                    done || running ? "text-text" : "text-text-faint"
                                  }`}
                                >
                                  {s.label}
                                </span>
                                {running && (
                                  <span className="relative overflow-hidden rounded-full bg-cyan/10 px-2 py-0.5 font-[family-name:var(--font-mono)] text-[0.56rem] uppercase tracking-wider text-cyan">
                                    {!reduce && (
                                      <motion.span
                                        aria-hidden
                                        className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.35),transparent)]"
                                        animate={{ x: ["-100%", "200%"] }}
                                        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                                      />
                                    )}
                                    <span className="relative">running</span>
                                  </span>
                                )}
                              </div>
                              {s.detail && (
                                <p className="mt-0.5 font-[family-name:var(--font-mono)] text-[0.66rem] leading-relaxed text-text-faint">
                                  {s.detail}
                                </p>
                              )}

                              {/* Inline tool-call card on the Retrieve step */}
                              {s.id === "retrieve" && chunks.length > 0 && (
                                <motion.div
                                  initial={reduce ? false : { opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  transition={{ duration: 0.4, ease: EASE_OUT }}
                                  className="mt-3 overflow-hidden rounded-xl border border-line bg-bg/50 p-3"
                                >
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="font-[family-name:var(--font-mono)] text-[0.6rem] text-cyan">
                                      tool: search_knowledge_base()
                                    </span>
                                    <span className="font-[family-name:var(--font-mono)] text-[0.6rem] text-text-faint">
                                      {scoredCount} scored &rarr; {chunks.length}
                                    </span>
                                  </div>

                                  {/* GraphRAG-flavoured node view */}
                                  <div className="mb-2 rounded-lg border border-line/60 bg-white/[0.02]">
                                    <RetrievalGraph chunks={chunks} maxScore={maxScore} reduce={reduce} />
                                  </div>

                                  {/* similarity bars -- the money shot */}
                                  <ul className="flex flex-col gap-1.5">
                                    {chunks.map((c, i) => {
                                      const pct = Math.round((c.score / maxScore) * 100);
                                      const isTop = i === 0 && c.score > 0;
                                      return (
                                        <li key={c.id} className="flex items-center gap-2">
                                          <span
                                            className={`w-28 shrink-0 truncate font-[family-name:var(--font-mono)] text-[0.62rem] ${
                                              isTop ? "text-cyan" : "text-text-dim"
                                            }`}
                                          >
                                            [{c.source}]
                                          </span>
                                          <div
                                            className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]"
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
                                              transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT, delay: reduce ? 0 : i * 0.08 }}
                                            />
                                          </div>
                                          <span className="w-10 shrink-0 text-right font-[family-name:var(--font-mono)] text-[0.62rem] text-text-faint">
                                            {c.score.toFixed(3)}
                                          </span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </motion.div>
                              )}

                              {/* Confidence read on the Grade step */}
                              {s.id === "grade" && grade && (
                                <motion.div
                                  initial={reduce ? false : { opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.35 }}
                                  className="mt-2 flex items-center gap-2"
                                >
                                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.05]">
                                    <motion.div
                                      className={`h-full rounded-full ${
                                        grade.label === "high"
                                          ? "bg-cyan"
                                          : grade.label === "medium"
                                            ? "bg-violet"
                                            : "bg-text-faint"
                                      }`}
                                      initial={reduce ? false : { width: 0 }}
                                      animate={{ width: `${gradePct}%` }}
                                      transition={{ duration: reduce ? 0 : 0.5, ease: EASE_OUT }}
                                    />
                                  </div>
                                  <span className={`font-[family-name:var(--font-mono)] text-[0.62rem] uppercase tracking-wider ${gradeTone}`}>
                                    {grade.label} confidence
                                  </span>
                                </motion.div>
                              )}
                            </div>
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ol>
                </div>

                {/* -------- Right: streamed answer -------- */}
                <div className="flex flex-col">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="kicker text-[0.62rem]">Grounded answer</span>
                  </div>

                  <div
                    id={answerId}
                    aria-live="polite"
                    aria-atomic="false"
                    className="flex-1 rounded-xl border border-line bg-bg/50 p-4"
                  >
                    {answer.length === 0 && !streaming ? (
                      <p className="text-sm text-text-faint">
                        Waiting for the agent to retrieve and grade context...
                      </p>
                    ) : (
                      <p className="text-sm leading-relaxed text-text">
                        {answer}
                        {streaming && (
                          <motion.span
                            aria-hidden
                            className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-cyan align-middle"
                            animate={reduce ? undefined : { opacity: [1, 0.15, 1] }}
                            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}
                      </p>
                    )}

                    {sources.length > 0 && (
                      <div className="mt-4 border-t border-line pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="kicker text-[0.58rem]">Sources</span>
                          {sources.map((src) => {
                            const hit = chunks.find((c) => c.source === src);
                            const pct = hit
                              ? Math.round((hit.score / maxScore) * 100)
                              : null;
                            return (
                              <span
                                key={src}
                                className="inline-flex items-center gap-1.5 rounded-full border border-violet/40 bg-violet/[0.08] px-2.5 py-1 font-[family-name:var(--font-mono)] text-[0.64rem] text-violet"
                              >
                                {src}
                                {pct !== null && (
                                  <span className="text-violet/60">{pct}%</span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                        <p className="mt-2 font-[family-name:var(--font-mono)] text-[0.6rem] text-text-faint">
                          grounded on {sources.length} source{sources.length === 1 ? "" : "s"}
                          {grade ? ` · top similarity ${grade.confidence.toFixed(3)}` : ""}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Honest provenance label */}
                  {phase === "done" && mode && (
                    <motion.p
                      initial={reduce ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="mt-3 flex items-center gap-2 text-[0.68rem] text-text-faint"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${mode === "groq" ? "bg-cyan" : "bg-violet"}`}
                        aria-hidden
                      />
                      {mode === "groq"
                        ? `Generated by Groq ${model ?? ""} — grounded on the retrieved chunks.`
                        : "Retrieval-grounded (offline) — composed from the matched sources, no live LLM."}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
