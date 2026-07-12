/**
 * POST /api/ask -- the "Ask my work" retrieval + generation endpoint.
 *
 * Flow (RAG, end to end):
 *   1. Take { question } from the request body.
 *   2. Retrieve: score the client-safe knowledge base with the SAME TF-IDF +
 *      cosine retriever the UI visualizes, and take the top-k chunks.
 *   3. Generate: call Groq's chat completions with those chunks as grounded
 *      context and a strict "answer only from context, cite sources" prompt.
 *   4. Fall back gracefully: if GROQ_API_KEY is missing or the Groq call
 *      fails for any reason, return the retrieval-only composed answer so the
 *      demo ALWAYS works and NEVER 500s to the visitor.
 *
 * Secrets: GROQ_API_KEY is server-only (never NEXT_PUBLIC). In local dev
 * behind a corporate proxy, set HTTPS_PROXY and the Groq call is routed
 * through it via undici's ProxyAgent (built into Node 25). On Vercel no
 * proxy is needed.
 */

import { NextResponse, type NextRequest } from "next/server";
import { knowledge } from "@/content/knowledge";
import { buildIndex, retrieve, type ScoredChunk } from "@/lib/retrieval";
import { composeAnswer } from "@/lib/compose";

// This route calls out to Groq and reads env at request time -> dynamic,
// Node runtime (undici ProxyAgent is a Node API, not Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOP_K = 4;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

// Build the TF-IDF index once per server instance (module scope).
const index = buildIndex(knowledge);

type AskResponse = {
  answer: string;
  sources: string[];
  chunks: { id: string; source: string; text: string; score: number }[];
  mode: "groq" | "fallback";
  model: string | null;
  /** Present when we fell back off the LLM path, for honest debugging. */
  note?: string;
};

/** Shape the scored chunks for the client (rounded scores, no internals). */
function serializeChunks(scored: ScoredChunk[]) {
  return scored.map((s) => ({
    id: s.chunk.id,
    source: s.chunk.source,
    text: s.chunk.text,
    score: Math.round(s.score * 1000) / 1000,
  }));
}

/**
 * Get an undici dispatcher for HTTPS_PROXY if set, so the Groq fetch works
 * behind a corporate proxy in local dev. Returns undefined when no proxy is
 * configured (the normal Vercel case).
 */
async function getProxyDispatcher(): Promise<unknown | undefined> {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy) return undefined;
  try {
    // undici ships inside Node (>=18). We import it via a computed specifier so
    // the bundler does not try to resolve it at build time -- it is a runtime
    // Node built-in, not a project dependency.
    const moduleName = "undici";
    const undici = (await import(/* webpackIgnore: true */ moduleName)) as {
      ProxyAgent: new (uri: string) => unknown;
    };
    return new undici.ProxyAgent(proxy);
  } catch {
    // undici unavailable -> just skip the proxy rather than failing.
    return undefined;
  }
}

/**
 * Call Groq with the retrieved context. Throws on any non-OK response so the
 * caller can fall back. Times out so a hung network never blocks the user.
 */
async function callGroq(
  question: string,
  scored: ScoredChunk[],
  apiKey: string,
  model: string,
): Promise<string> {
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

  const dispatcher = await getProxyDispatcher();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

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
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Context:\n${context}\n\nQuestion: ${question}`,
          },
        ],
      }),
      signal: controller.signal,
      // undici-specific option; harmless when dispatcher is undefined.
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);

    if (!res.ok) {
      throw new Error(`Groq responded ${res.status}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Groq returned an empty completion");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Parse + validate the body without ever throwing to the client.
  let question = "";
  try {
    const body = (await request.json()) as { question?: unknown };
    if (typeof body.question === "string") question = body.question.trim();
  } catch {
    question = "";
  }

  if (!question) {
    return NextResponse.json(
      { error: "Please provide a non-empty 'question'." },
      { status: 400 },
    );
  }
  if (question.length > 500) question = question.slice(0, 500);

  // 1 + 2: retrieve top-k chunks (deterministic, offline).
  const scored = retrieve(index, question, TOP_K);
  const chunks = serializeChunks(scored);
  const fallback = composeAnswer(scored);
  const sources = fallback.citations;

  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  // 3: try Groq generation grounded on the retrieved chunks.
  if (apiKey && !fallback.lowConfidence) {
    try {
      const answer = await callGroq(question, scored, apiKey, model);
      const payload: AskResponse = {
        answer,
        sources,
        chunks,
        mode: "groq",
        model,
      };
      return NextResponse.json(payload);
    } catch (err) {
      // 4: degrade cleanly to the retrieval-only answer.
      const payload: AskResponse = {
        answer: fallback.text,
        sources,
        chunks,
        mode: "fallback",
        model: null,
        note:
          err instanceof Error
            ? `Groq unavailable (${err.message}); served retrieval-grounded answer.`
            : "Groq unavailable; served retrieval-grounded answer.",
      };
      return NextResponse.json(payload);
    }
  }

  // No key (or low-confidence retrieval): honest retrieval-only answer.
  const payload: AskResponse = {
    answer: fallback.text,
    sources,
    chunks,
    mode: "fallback",
    model: null,
    note: apiKey
      ? "No confident match; served retrieval-grounded answer."
      : "No GROQ_API_KEY configured; served retrieval-grounded answer (offline).",
  };
  return NextResponse.json(payload);
}
