"use client";

/**
 * useAskStream -- the shared client hook that drives the streaming "Ask my
 * work" agent from /api/ask/stream. It is the SINGLE stream engine reused by
 * the global command palette (Ask mode) and the launcher, so we never build a
 * second chat implementation.
 *
 * It consumes the same NDJSON contract as AskMyWork (step / chunks / grade /
 * token / done) but exposes a compact, palette-friendly surface: the streamed
 * answer text, the cited sources, a provenance mode, and a phase. If the
 * network or endpoint is unavailable it composes a grounded answer locally
 * from the client-side TF-IDF retriever so the experience never dead-ends.
 *
 * Never throws to the UI; never fabricates facts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { knowledge } from "@/content/knowledge";
import { buildIndex, scoreAll } from "@/lib/retrieval";
import { composeAnswer } from "@/lib/compose";
import { gradeConfidence, type ConfidenceLabel } from "@/lib/confidence";

const TOP_K = 4;

export type AskPhase = "idle" | "running" | "done";
export type AskMode = "groq" | "fallback" | null;

type StepId = "plan" | "retrieve" | "grade" | "refine" | "answer";
type WireChunk = { id: string; source: string; text: string; score: number };

type StreamEvent =
  | { type: "step"; id: StepId; label: string; status: "running" | "done"; detail?: string }
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

export type AskState = {
  /** The question currently being answered (empty until first ask). */
  submitted: string;
  phase: AskPhase;
  /** Live step label, e.g. "Retrieve" -- lets the UI show a tiny status. */
  step: string | null;
  answer: string;
  streaming: boolean;
  sources: string[];
  mode: AskMode;
  model: string | null;
  /** Top cosine score, graded with the SHARED thresholds (online + offline). */
  confidence: number | null;
  confidenceLabel: ConfidenceLabel | null;
};

const INITIAL: AskState = {
  submitted: "",
  phase: "idle",
  step: null,
  answer: "",
  streaming: false,
  sources: [],
  mode: null,
  model: null,
  confidence: null,
  confidenceLabel: null,
};

export function useAskStream() {
  const reduce = useReducedMotion();
  const index = useMemo(() => buildIndex(knowledge), []);
  const [state, setState] = useState<AskState>(INITIAL);

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

  const reset = useCallback(() => {
    abortRef.current?.abort();
    clearTimers();
    setState(INITIAL);
  }, [clearTimers]);

  /** Offline compose fallback -- typed out with a consistent cadence. */
  const runOffline = useCallback(
    async (question: string, signal: AbortSignal) => {
      const top = scoreAll(index, question).slice(0, TOP_K);
      const composed = composeAnswer(top);
      // Grade with the SAME shared thresholds the server uses, so an identical
      // top score buckets the same online and offline.
      const graded = gradeConfidence(top[0]?.score ?? 0);

      setState((s) => ({
        ...s,
        step: "Answer",
        sources: composed.citations,
        mode: "fallback",
        model: null,
        streaming: true,
        confidence: graded.confidence,
        confidenceLabel: graded.label,
      }));

      if (reduce) {
        setState((s) => ({ ...s, answer: composed.text }));
      } else {
        const toks = composed.text.match(/\S+\s*/g) ?? [composed.text];
        for (const t of toks) {
          if (signal.aborted) break;
          setState((s) => ({ ...s, answer: s.answer + t }));
          await new Promise<void>((r) => {
            timersRef.current.push(setTimeout(r, 20));
          });
        }
      }
      setState((s) => ({ ...s, streaming: false, phase: "done", step: null }));
    },
    [index, reduce],
  );

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question) return;

      abortRef.current?.abort();
      clearTimers();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        submitted: question,
        phase: "running",
        step: "Plan",
        answer: "",
        streaming: false,
        sources: [],
        mode: null,
        model: null,
        confidence: null,
        confidenceLabel: null,
      });

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

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawDone = false;

      const handle = (ev: StreamEvent) => {
        switch (ev.type) {
          case "step":
            setState((s) => ({ ...s, step: ev.label }));
            break;
          case "grade":
            // Server already graded with the shared thresholds; mirror it so
            // the online + offline buckets stay consistent.
            setState((s) => ({
              ...s,
              confidence: ev.confidence,
              confidenceLabel: ev.label,
            }));
            break;
          case "token":
            setState((s) => ({ ...s, streaming: true, answer: s.answer + ev.text }));
            break;
          case "done":
            sawDone = true;
            setState((s) => ({
              ...s,
              sources: ev.sources,
              mode: ev.mode,
              model: ev.model,
              streaming: false,
              phase: "done",
              step: null,
              confidence: ev.confidence,
              confidenceLabel: ev.confidenceLabel,
            }));
            break;
          default:
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
        if (!controller.signal.aborted && !sawDone) {
          await runOffline(question, controller.signal);
          return;
        }
      }

      if (!controller.signal.aborted) {
        setState((s) => ({ ...s, streaming: false, phase: "done", step: null }));
      }
    },
    [clearTimers, runOffline],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    clearTimers();
    setState((s) => ({
      ...s,
      streaming: false,
      step: null,
      phase: s.phase === "running" ? "done" : s.phase,
    }));
  }, [clearTimers]);

  return { state, ask, stop, reset };
}
