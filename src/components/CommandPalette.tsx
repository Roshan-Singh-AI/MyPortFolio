"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { commandTargets, askStarters, type CommandTarget } from "@/content/site";
import { useAskStream } from "@/lib/useAskStream";
import { EASE_OUT } from "@/lib/motion";
import type { PaletteMode } from "./CommandPaletteProvider";

/**
 * Global command palette (Cmd/Ctrl-K), rendered once at the root.
 *
 * Two modes in one surface:
 *  - NAVIGATE: fuzzy-filter the routes + the "Ask my work" section, arrow to
 *    move, Enter to jump (real client-side navigation via next/navigation).
 *  - ASK: type a question and it streams a REAL answer from /api/ask/stream
 *    (Groq when a key is set, honest retrieval-grounded fallback otherwise) --
 *    the exact same engine the home "Ask my work" agent uses, via useAskStream.
 *    Source pills map to the real cited sources.
 *
 * A heuristic auto-picks the mode as you type (a question -> Ask; otherwise
 * Navigate), and a visible toggle lets you override it. Full keyboard support,
 * focus trap, aria dialog/combobox/listbox roles, and reduced-motion paths.
 * Hydration-safe: portals only after mount; initial server render is inert.
 */

/** Looks-like-a-question heuristic -- intuitive, never surprising. */
function looksLikeQuestion(q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return false;
  if (t.endsWith("?")) return true;
  if (t.split(/\s+/).length >= 4) return true;
  return /^(what|how|why|who|when|where|which|does|do|is|are|can|tell|explain|show)\b/.test(t);
}

/** Tiny subsequence fuzzy match -> boolean + a rough score for ranking. */
function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().replace(/\s+/g, "");
  const t = target.toLowerCase();
  if (!q) return 1;
  let qi = 0;
  let score = 0;
  let streak = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++;
      streak++;
      score += streak; // reward consecutive matches
    } else {
      streak = 0;
    }
  }
  return qi === q.length ? score : 0;
}

function filterTargets(query: string): CommandTarget[] {
  const q = query.trim();
  if (!q) return commandTargets;
  return commandTargets
    .map((t) => ({ t, s: fuzzyScore(q, `${t.label} ${t.keywords}`) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
}

export default function CommandPalette({
  open,
  mode,
  seed,
  onClose,
  onModeChange,
}: {
  open: boolean;
  mode: PaletteMode;
  seed: string;
  onClose: () => void;
  onModeChange: (m: PaletteMode) => void;
}) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const listId = useId();
  const inputId = useId();
  const answerId = useId();

  // Portal only after the client mounts so server + first client render match.
  // useSyncExternalStore gives a stable server snapshot (false) and a client
  // snapshot (true) without a setState-in-effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  /** Whether the user manually locked the mode (vs. the auto heuristic). */
  const [manualMode, setManualMode] = useState(false);

  const { state, ask, stop, reset } = useAskStream();

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // Auto mode from the query unless the user locked it.
  const effectiveMode: PaletteMode = manualMode
    ? mode
    : looksLikeQuestion(query)
      ? "ask"
      : "navigate";

  const results = useMemo(() => filterTargets(query), [query]);

  // Reset palette state on OPEN via the render-time "adjust state on change"
  // pattern (React's sanctioned alternative to setState-in-effect): compare the
  // current `open` to the last-seen value held in state.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery(seed);
      setActive(0);
      // When something explicitly requests Ask mode (the launcher, the nav
      // "Ask AI" pill), LOCK it so the empty-query heuristic doesn't flip it
      // back to Navigate. Cmd/K opens in Navigate unlocked, so typing a
      // question still auto-switches to Ask.
      setManualMode(mode === "ask");
      reset();
    }
  }

  // On open: capture the previously-focused element (before we steal focus),
  // then focus the input. DOM side-effects only -- no setState.
  useEffect(() => {
    if (!open) return;
    lastFocused.current = (document.activeElement as HTMLElement) ?? null;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Lock scroll + restore focus on close (DOM side-effects only).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      lastFocused.current?.focus?.();
    };
  }, [open]);

  // Document-level Escape, so it always works even if focus left the panel
  // (e.g. an active element was replaced when the ask answer streamed in).
  const running = state.phase === "running";
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (running) stop();
      else onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, running, stop, onClose]);

  // Keep the active index in range without a state write: derive a safe value.
  const safeActive = Math.min(active, Math.max(0, results.length - 1));

  const runNavigate = useCallback(
    (target: CommandTarget) => {
      onClose();
      // Hash links to the current page: let the browser resolve the anchor.
      if (target.href.startsWith("/#")) {
        router.push("/");
        // allow the route to settle, then scroll to the section
        requestAnimationFrame(() => {
          const el = document.getElementById(target.href.slice(2));
          el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
        });
      } else {
        router.push(target.href);
      }
    },
    [onClose, router, reduce],
  );

  const submit = useCallback(() => {
    if (effectiveMode === "ask") {
      const q = query.trim();
      if (q) void ask(q);
    } else {
      const target = results[safeActive] ?? results[0];
      if (target) runNavigate(target);
    }
  }, [effectiveMode, query, ask, results, safeActive, runNavigate]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Escape is handled at the document level (works even if focus leaves
      // the panel while the ask answer streams in and swaps the focused node).
      // Focus trap: keep Tab inside the panel.
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }
      if (effectiveMode !== "navigate") {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
        return;
      }
      // Navigate mode arrow handling.
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    },
    [effectiveMode, results.length, submit],
  );

  const setMode = useCallback(
    (m: PaletteMode) => {
      setManualMode(true);
      onModeChange(m);
    },
    [onModeChange],
  );

  if (!mounted) return null;

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[14vh] sm:pt-[16vh]"
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          {/* Scrim */}
          <button
            type="button"
            aria-label="Close command palette"
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(6,6,10,0.72)] backdrop-blur-md"
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: EASE_OUT }}
            onKeyDown={onKeyDown}
            className="relative z-10 flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-line-strong bg-[rgba(16,21,15,0.92)] shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            {/* Accent top edge */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(127,183,154,0.6),rgba(173,201,179,0.6),transparent)]"
            />

            {/* Mode toggle + input row */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <span aria-hidden className="text-cyan">
                {effectiveMode === "ask" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v2m0 14v2m9-9h-2M5 12H3m2.6-6.4 1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                )}
              </span>
              <label htmlFor={inputId} className="sr-only">
                {effectiveMode === "ask"
                  ? "Ask a question about Roshan's work"
                  : "Search pages or ask a question"}
              </label>
              <input
                id={inputId}
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={effectiveMode === "navigate"}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                  effectiveMode === "navigate" && results[safeActive]
                    ? `${listId}-${safeActive}`
                    : undefined
                }
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder={
                  effectiveMode === "ask"
                    ? "Ask my work -- e.g. how does he evaluate RAG?"
                    : "Jump to a page, or ask a question..."
                }
                maxLength={500}
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
              />

              {/* Segmented mode toggle */}
              <div
                role="tablist"
                aria-label="Palette mode"
                className="hidden shrink-0 items-center gap-0.5 rounded-lg border border-line bg-white/[0.02] p-0.5 sm:flex"
              >
                {(["navigate", "ask"] as const).map((m) => {
                  const on = effectiveMode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setMode(m)}
                      className={`rounded-md px-2.5 py-1 text-[0.7rem] font-medium capitalize transition-colors duration-200 ${
                        on ? "bg-cyan/15 text-cyan" : "text-text-faint hover:text-text-dim"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[52vh] overflow-y-auto p-2">
              {effectiveMode === "navigate" ? (
                <NavigateList
                  listId={listId}
                  results={results}
                  active={safeActive}
                  setActive={setActive}
                  onPick={runNavigate}
                  onSwitchToAsk={() => {
                    setMode("ask");
                    requestAnimationFrame(() => inputRef.current?.focus());
                  }}
                  query={query}
                />
              ) : (
                <AskPanel
                  answerId={answerId}
                  state={state}
                  onStarter={(q) => {
                    setQuery(q);
                    void ask(q);
                  }}
                  onFollowUp={(q) => {
                    setQuery(q);
                    void ask(q);
                  }}
                  onStop={stop}
                  reduce={reduce}
                />
              )}
            </div>

            {/* Footer hint bar */}
            <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 font-[family-name:var(--font-mono)] text-[0.6rem] text-text-faint">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {effectiveMode === "navigate" ? (
                  <>
                    <KeyHint keys={["Up", "Down"]} label="move" />
                    <KeyHint keys={["Enter"]} label="open" />
                  </>
                ) : (
                  <KeyHint keys={["Enter"]} label="ask" />
                )}
                <KeyHint keys={["Esc"]} label="close" />
              </span>
              <span className="hidden sm:inline">
                {effectiveMode === "ask"
                  ? "grounded on 18 facts about Roshan"
                  : "type a question to switch to Ask"}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}

/* ------------------------------------------------------------------ */
/*  Navigate mode list                                                 */
/* ------------------------------------------------------------------ */
function NavigateList({
  listId,
  results,
  active,
  setActive,
  onPick,
  onSwitchToAsk,
  query,
}: {
  listId: string;
  results: CommandTarget[];
  active: number;
  setActive: (i: number) => void;
  onPick: (t: CommandTarget) => void;
  onSwitchToAsk: () => void;
  query: string;
}) {
  if (results.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <p className="text-sm text-text-dim">No page matches &ldquo;{query}&rdquo;.</p>
        <button
          type="button"
          onClick={onSwitchToAsk}
          className="mt-3 rounded-full border border-cyan/40 bg-cyan/[0.08] px-3 py-1.5 text-[0.78rem] text-cyan transition-colors hover:bg-cyan/[0.14]"
        >
          Ask the AI about &ldquo;{query}&rdquo; instead
        </button>
      </div>
    );
  }

  return (
    <ul id={listId} role="listbox" aria-label="Pages and sections" className="flex flex-col gap-0.5">
      {results.map((t, i) => {
        const on = i === active;
        return (
          <li key={t.href} id={`${listId}-${i}`} role="option" aria-selected={on}>
            <button
              type="button"
              onMouseMove={() => setActive(i)}
              onClick={() => onPick(t)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
                on ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`grid h-7 w-7 place-items-center rounded-lg border text-[0.62rem] ${
                    on ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-text-faint"
                  }`}
                  aria-hidden
                >
                  {t.hint === "Section" ? "#" : t.label.charAt(0)}
                </span>
                <span className={`text-sm ${on ? "text-text" : "text-text-dim"}`}>{t.label}</span>
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[0.58rem] uppercase tracking-wider text-text-faint">
                {t.hint}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  Ask mode panel -- reuses the shared stream engine                  */
/* ------------------------------------------------------------------ */
function AskPanel({
  answerId,
  state,
  onStarter,
  onFollowUp,
  onStop,
  reduce,
}: {
  answerId: string;
  state: ReturnType<typeof useAskStream>["state"];
  onStarter: (q: string) => void;
  onFollowUp: (q: string) => void;
  onStop: () => void;
  reduce: boolean | null;
}) {
  const idle = state.phase === "idle";
  const running = state.phase === "running";

  return (
    <div className="px-2 py-1">
      {idle ? (
        <div className="px-1 py-2">
          <p className="mb-3 text-[0.78rem] leading-relaxed text-text-faint">
            Ask anything about Roshan&apos;s work. The answer streams from the same
            retrieval-augmented agent used on the home page -- grounded on real facts,
            with cited sources.
          </p>
          <div className="flex flex-wrap gap-2">
            {askStarters.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onStarter(q)}
                className="rounded-full border border-line bg-white/[0.02] px-3 py-1.5 text-left text-[0.76rem] text-text-dim transition-colors duration-200 hover:border-cyan/50 hover:text-text"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-1 py-1">
          {/* Live status line -- real step from the stream */}
          <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[0.62rem] text-text-faint">
            <span className="relative flex h-1.5 w-1.5">
              {running && !reduce && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-60" />
              )}
              <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${running ? "bg-cyan" : "bg-text-faint/50"}`} />
            </span>
            {running ? (
              <span>{state.step ? `${state.step}...` : "thinking..."}</span>
            ) : (
              <span>{state.mode === "groq" ? "generated" : "grounded (offline)"}</span>
            )}
            {running && (
              <button
                type="button"
                onClick={onStop}
                className="ml-auto rounded-md border border-line px-2 py-0.5 text-[0.6rem] text-text-dim transition-colors hover:border-cyan/50 hover:text-text"
              >
                Stop
              </button>
            )}
          </div>

          {/* Streamed answer */}
          <div
            id={answerId}
            aria-live="polite"
            className="rounded-xl border border-line bg-bg/50 p-3.5"
          >
            {state.answer.length === 0 && !state.streaming ? (
              <p className="text-sm text-text-faint">Retrieving and grading context...</p>
            ) : (
              <p className="text-sm leading-relaxed text-text">
                {state.answer}
                {state.streaming && (
                  <motion.span
                    aria-hidden
                    className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-cyan align-middle"
                    animate={reduce ? undefined : { opacity: [1, 0.15, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </p>
            )}

            {state.sources.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
                <span className="kicker text-[0.54rem]">Sources</span>
                {state.sources.map((src) => (
                  <span
                    key={src}
                    className="inline-flex items-center rounded-full border border-violet/40 bg-violet/[0.08] px-2 py-0.5 font-[family-name:var(--font-mono)] text-[0.6rem] text-violet"
                  >
                    {src}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Provenance + follow-up starters after a completed answer */}
          {state.phase === "done" && (
            <>
              <p className="flex items-center gap-2 text-[0.64rem] text-text-faint">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${state.mode === "groq" ? "bg-cyan" : "bg-violet"}`}
                />
                {state.mode === "groq"
                  ? `Generated by Groq ${state.model ?? ""} -- grounded on the retrieved chunks.`
                  : "Retrieval-grounded (offline) -- composed from the matched sources."}
              </p>
              <div className="flex flex-wrap gap-2">
                {askStarters
                  .filter((q) => q !== state.submitted)
                  .slice(0, 3)
                  .map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onFollowUp(q)}
                      className="rounded-full border border-line bg-white/[0.02] px-2.5 py-1 text-[0.72rem] text-text-dim transition-colors duration-200 hover:border-cyan/50 hover:text-text"
                    >
                      {q}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Keyboard hint chip                                                 */
/* ------------------------------------------------------------------ */
function KeyHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="rounded border border-line bg-white/[0.03] px-1.5 py-0.5 text-[0.58rem] text-text-dim"
        >
          {k}
        </kbd>
      ))}
      <span>{label}</span>
    </span>
  );
}
