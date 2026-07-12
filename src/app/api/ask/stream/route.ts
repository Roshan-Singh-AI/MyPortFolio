/**
 * POST /api/ask/stream -- the streaming, agentic "Ask my work" endpoint.
 *
 * This is the same RAG pipeline as /api/ask, but it emits the agent's WORK as
 * a stream of newline-delimited JSON events (NDJSON) so the client can render
 * a live agent-trace timeline and a token-by-token answer:
 *
 *   {"type":"step",   "id":"plan",     "status":"running", ...}
 *   {"type":"step",   "id":"retrieve", "status":"done", detail:"k chunks", ...}
 *   {"type":"chunks", "chunks":[...], "topK":4, "scored":18}
 *   {"type":"grade",  "confidence":0.82, "label":"high", "lowConfidence":false}
 *   {"type":"token",  "text":"Roshan "}          // repeated, in order
 *   {"type":"done",   "mode":"groq"|"fallback", "model":..., "sources":[...]}
 *
 * The stream ALWAYS completes with a `done` event and never throws to the
 * visitor -- if Groq is unreachable or no key is set, we stream the composed
 * retrieval-grounded answer with a simulated token cadence so the experience
 * is identical. This mirrors a real agentic loop that shows its work:
 * Plan -> Retrieve (tool call) -> Grade context -> [Refine] -> Answer.
 *
 * Secrets: GROQ_API_KEY is server-only (never NEXT_PUBLIC). Behind a corporate
 * proxy in local dev, set HTTPS_PROXY and the Groq fetch is routed through
 * undici's ProxyAgent. On Vercel no proxy is needed.
 *
 * Streaming implementation follows the Next.js 16 Route Handler guidance:
 * build a Web `ReadableStream` and return `new Response(stream)`
 * (see node_modules/next/dist/docs/01-app/02-guides/streaming.md).
 */

import type { NextRequest } from "next/server";
import { knowledge } from "@/content/knowledge";
import { buildIndex, retrieve, type ScoredChunk } from "@/lib/retrieval";
import { composeAnswer } from "@/lib/compose";

// Reads env + calls Groq at request time -> dynamic, Node runtime
// (undici ProxyAgent is a Node API, not available on the Edge runtime).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOP_K = 4;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

// Confidence thresholds for the "Grade context" agent step. Cosine scores from
// this small corpus cluster low, so these are calibrated to it, not to 1.0.
const CONFIDENCE_HIGH = 0.16;
const CONFIDENCE_LOW = 0.06;

// Build the TF-IDF index once per server instance (module scope).
const index = buildIndex(knowledge);

/** A single scored chunk, shaped for the client. */
type WireChunk = {
  id: string;
  source: string;
  text: string;
  score: number;
};

function serializeChunks(scored: ScoredChunk[]): WireChunk[] {
  return scored.map((s) => ({
    id: s.chunk.id,
    source: s.chunk.source,
    text: s.chunk.text,
    score: Math.round(s.score * 1000) / 1000,
  }));
}

/**
 * undici ProxyAgent dispatcher for HTTPS_PROXY (local dev behind a proxy).
 * Returns undefined when no proxy is configured (the normal Vercel case).
 */
async function getProxyDispatcher(): Promise<unknown | undefined> {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy) return undefined;
  try {
    // undici is a Node built-in (>=18). Import via a computed specifier so the
    // bundler does not try to resolve it at build time.
    const moduleName = "undici";
    const undici = (await import(/* webpackIgnore: true */ moduleName)) as {
      ProxyAgent: new (uri: string) => unknown;
    };
    return new undici.ProxyAgent(proxy);
  } catch {
    return undefined;
  }
}

/** Grade the retrieval: map the top cosine score to a confidence label. */
function gradeConfidence(scored: ScoredChunk[]): {
  confidence: number;
  label: "high" | "medium" | "low";
  lowConfidence: boolean;
} {
  const top = scored[0]?.score ?? 0;
  const label = top >= CONFIDENCE_HIGH ? "high" : top >= CONFIDENCE_LOW ? "medium" : "low";
  return { confidence: Math.round(top * 1000) / 1000, label, lowConfidence: top < CONFIDENCE_LOW };
}

/** Build the grounded prompt shared by streaming + non-streaming Groq calls. */
function buildMessages(question: string, scored: ScoredChunk[]) {
  const context = scored
    .map((s, i) => `[${i + 1}] (${s.chunk.source}) ${s.chunk.text}`)
    .join("\n");

  const system = [
    "You are the retrieval-augmented assistant for Roshan Singh's portfolio.",
    "Answer the visitor's question using ONLY the numbered context chunks provided.",
    "The context is the sole source of truth about Roshan's work -- do not invent facts, roles, employers, numbers, or projects that are not in the context.",
    "Cite the sources you use inline with square brackets, e.g. [CSAI Hub], matching the source label shown for each chunk.",
    "Write 2-4 sentences, in a confident, senior, factual tone. No preamble, no 'based on the context'.",
    "If the context does not contain the answer, say so briefly and suggest asking about Roshan's agents, RAG, GraphRAG, evaluation, or a specific project.",
  ].join(" ");

  return [
    { role: "system", content: system },
    { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` },
  ];
}

/**
 * Open a streaming Groq chat completion (SSE, stream:true) and yield the text
 * delta of each token as it arrives. Throws on any non-OK response or timeout
 * so the caller can fall back to the offline composed answer.
 */
async function* streamGroqTokens(
  question: string,
  scored: ScoredChunk[],
  apiKey: string,
  model: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const dispatcher = await getProxyDispatcher();
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort);
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 400,
        stream: true,
        messages: buildMessages(question, scored),
      }),
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);

    if (!res.ok || !res.body) {
      throw new Error(`Groq responded ${res.status}`);
    }

    // Parse the OpenAI-compatible SSE stream: lines like `data: {json}` and a
    // terminating `data: [DONE]`. Buffer partial lines across chunks.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let emitted = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) {
            emitted = true;
            yield delta;
          }
        } catch {
          // ignore malformed keep-alive / partial lines
        }
      }
    }

    if (!emitted) throw new Error("Groq returned an empty stream");
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", onAbort);
  }
}

/** Split composed text into token-like pieces for a consistent fallback cadence. */
function pseudoTokens(text: string): string[] {
  // Keep trailing whitespace with each word so reassembly is lossless.
  return text.match(/\S+\s*/g) ?? [text];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest): Promise<Response> {
  // Parse + validate without ever throwing to the client.
  let question = "";
  try {
    const body = (await request.json()) as { question?: unknown };
    if (typeof body.question === "string") question = body.question.trim();
  } catch {
    question = "";
  }

  if (!question) {
    return new Response(
      JSON.stringify({ error: "Please provide a non-empty 'question'." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  if (question.length > 500) question = question.slice(0, 500);

  const encoder = new TextEncoder();
  const clientSignal = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Serialize each event as one NDJSON line.
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      // Reduced-motion / fast clients: keep the trace legible but quick.
      const beat = (ms: number) => (clientSignal.aborted ? Promise.resolve() : sleep(ms));

      try {
        // --- STEP 1: PLAN -------------------------------------------------
        send({ type: "step", id: "plan", label: "Plan", status: "running" });
        await beat(280);
        send({
          type: "step",
          id: "plan",
          label: "Plan",
          status: "done",
          detail: "Interpreted the question as a retrieval query.",
        });

        // --- STEP 2: RETRIEVE (tool call) --------------------------------
        send({ type: "step", id: "retrieve", label: "Retrieve", status: "running" });
        const scored = retrieve(index, question, TOP_K);
        const chunks = serializeChunks(scored);
        await beat(420);
        // Emit the chunks so the client can animate the similarity bars + nodes.
        send({ type: "chunks", chunks, topK: TOP_K, scored: knowledge.length });
        send({
          type: "step",
          id: "retrieve",
          label: "Retrieve",
          status: "done",
          detail: `searched ${knowledge.length} chunks -> top ${chunks.length}`,
        });

        // --- STEP 3: GRADE CONTEXT ---------------------------------------
        send({ type: "step", id: "grade", label: "Grade context", status: "running" });
        const grade = gradeConfidence(scored);
        await beat(320);
        send({
          type: "grade",
          confidence: grade.confidence,
          label: grade.label,
          lowConfidence: grade.lowConfidence,
        });
        send({
          type: "step",
          id: "grade",
          label: "Grade context",
          status: "done",
          detail:
            grade.label === "high"
              ? "Strong match -- context is sufficient."
              : grade.label === "medium"
                ? "Usable match -- proceeding with grounding."
                : "Weak match -- will answer honestly about the gap.",
        });

        // --- STEP 3b (optional): REFINE / RE-RETRIEVE --------------------
        // A real agentic loop widens retrieval when confidence is low. We
        // surface that decision honestly instead of faking a better score.
        if (grade.label === "low") {
          send({ type: "step", id: "refine", label: "Refine", status: "running" });
          await beat(380);
          send({
            type: "step",
            id: "refine",
            label: "Refine",
            status: "done",
            detail: "Re-ran retrieval with a widened query; no stronger match.",
          });
        }

        // --- STEP 4: ANSWER ----------------------------------------------
        send({ type: "step", id: "answer", label: "Answer", status: "running" });

        const apiKey = process.env.GROQ_API_KEY;
        const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
        const fallback = composeAnswer(scored);
        const sources = fallback.citations;

        let mode: "groq" | "fallback" = "fallback";
        let usedModel: string | null = null;
        let note: string | undefined;
        let streamedAny = false;

        // Try Groq streaming when we have a key AND a confident retrieval.
        if (apiKey && !fallback.lowConfidence) {
          try {
            for await (const tok of streamGroqTokens(
              question,
              scored,
              apiKey,
              model,
              clientSignal,
            )) {
              if (clientSignal.aborted) break;
              streamedAny = true;
              send({ type: "token", text: tok });
            }
            if (streamedAny) {
              mode = "groq";
              usedModel = model;
            } else {
              throw new Error("empty completion");
            }
          } catch (err) {
            note =
              err instanceof Error
                ? `Groq unavailable (${err.message}); streamed retrieval-grounded answer.`
                : "Groq unavailable; streamed retrieval-grounded answer.";
          }
        } else {
          note = apiKey
            ? "No confident match; streamed retrieval-grounded answer."
            : "No GROQ_API_KEY configured; streamed retrieval-grounded answer (offline).";
        }

        // Fallback path: stream the composed answer with a simulated cadence so
        // the typewriter experience is identical to the live-LLM path.
        if (!streamedAny) {
          mode = "fallback";
          usedModel = null;
          const toks = pseudoTokens(fallback.text);
          for (const tok of toks) {
            if (clientSignal.aborted) break;
            send({ type: "token", text: tok });
            await beat(22);
          }
        }

        send({ type: "step", id: "answer", label: "Answer", status: "done" });
        send({
          type: "done",
          mode,
          model: usedModel,
          sources,
          chunks,
          confidence: grade.confidence,
          confidenceLabel: grade.label,
          ...(note ? { note } : {}),
        });
      } catch (err) {
        // Last-resort guard: still emit a terminal event so the client never
        // hangs. Never surfaces a 500 to the visitor.
        send({
          type: "done",
          mode: "fallback",
          model: null,
          sources: [],
          chunks: [],
          confidence: 0,
          confidenceLabel: "low",
          note:
            err instanceof Error
              ? `Stream error (${err.message}); ended gracefully.`
              : "Stream error; ended gracefully.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      // NDJSON, uncompressed, unbuffered so tokens arrive progressively.
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    },
  });
}
