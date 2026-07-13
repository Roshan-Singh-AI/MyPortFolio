/**
 * POST /api/casestudy -- the "Live case study" agent.
 *
 * Takes PUBLIC metadata for one of Roshan's GitHub repos (fetched client-side,
 * unauthenticated) and streams back a short, senior-engineer architecture
 * case study written IN ROSHAN'S VOICE: what the project likely does, the key
 * technical decisions, and why they matter. It is honestly labelled as an
 * "AI-generated interpretation from public repo metadata" -- it is inference
 * from name/description/language/topics, not ground truth from the source.
 *
 * It emits newline-delimited JSON (NDJSON), the same wire style as
 * /api/ask/stream, so the client renders an agent trace + token stream:
 *   {"type":"step",  "id":"read",  "status":"done", detail:"..."}
 *   {"type":"token", "text":"..."}                 // repeated, in order
 *   {"type":"done",  "mode":"groq"|"fallback", model:..., note?:...}
 *
 * It NEVER 500s to the visitor: if GROQ_API_KEY is missing or Groq is down, it
 * streams a tasteful, deterministic templated case study composed from the
 * same metadata, with a simulated token cadence so the experience is identical.
 *
 * Secrets: GROQ_API_KEY is server-only. Behind a corporate proxy in local dev,
 * set HTTPS_PROXY and the Groq call is routed through undici's ProxyAgent (see
 * src/lib/groq.ts). Streaming follows the Next.js 16 Route Handler guidance:
 * build a Web ReadableStream and return `new Response(stream)`.
 */

import type { NextRequest } from "next/server";
import { DEFAULT_MODEL, streamGroq, type ChatMessage } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cleaned, bounded repo metadata we are willing to reason over. */
type RepoMeta = {
  repo: string;
  description: string;
  language: string;
  topics: string[];
};

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function parseBody(body: Record<string, unknown>): RepoMeta {
  const topicsRaw = Array.isArray(body.topics) ? body.topics : [];
  const topics = topicsRaw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);
  return {
    repo: str(body.repo, 120),
    description: str(body.description, 400),
    language: str(body.language, 40),
    topics,
  };
}

/** The grounded prompt: Roshan's voice, honest about being inference. */
function buildMessages(meta: RepoMeta): ChatMessage[] {
  const facts = [
    `Repository name: ${meta.repo}`,
    meta.description ? `Description: ${meta.description}` : "Description: (none provided)",
    meta.language ? `Primary language: ${meta.language}` : "",
    meta.topics.length ? `Topics/tags: ${meta.topics.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const system = [
    // Persona
    "You are Roshan Singh, an AI engineer, narrating a quick architecture read of one of your own public GitHub repositories in the FIRST person.",
    "Voice: sharp, senior, a little playful; you enjoy explaining good engineering. Confident but never hype, never corporate.",
    // Truth grounding
    "You are given ONLY the repo's public metadata (name, description, language, topics). You do NOT have the source. So REASON from the metadata and your engineering judgement, and be explicit that this is an educated interpretation, not a line-by-line audit.",
    "Do NOT invent specific numbers, benchmarks, stars, dates, or claims that the metadata does not support. It is fine to say 'likely', 'probably', 'the shape suggests'.",
    // Format
    "FORMAT as GitHub-flavored markdown, tight and scannable, TOTAL under ~150 words:",
    "1) Open with ONE bold lead line: what this project most likely is, in plain terms.",
    "2) A short section led by a bold '**Key decisions**' line, then 2-3 '- ' bullets naming the concrete technical choices the stack/topics imply and WHY each matters.",
    "3) End with ONE bold '**Why it matters**' line: the engineering judgement it demonstrates.",
    "Use sparing bold for key terms. Do NOT use any emoji. Contractions are good.",
  ].join(" ");

  return [
    { role: "system", content: system },
    {
      role: "user",
      content: `Write the case study for this repo based on its public metadata:\n${facts}`,
    },
  ];
}

/**
 * Deterministic, tasteful templated case study for the offline / no-key path.
 * Grounded strictly in the metadata -- reads as an honest inference, not a
 * fabricated audit. Same markdown shape as the LLM path so the UI renders it
 * identically.
 */
function templatedCaseStudy(meta: RepoMeta): string {
  const pretty = meta.repo.replace(/[-_]+/g, " ").trim() || "this project";
  const lang = meta.language;
  const topics = meta.topics;
  const desc = meta.description;

  const lead = desc
    ? `**${pretty} looks like ${lowerFirst(trimPeriod(desc))}.**`
    : `**${pretty} is a focused${lang ? ` ${lang}` : ""} project whose scope I can only infer from its metadata.**`;

  const decisions: string[] = [];
  if (lang) {
    decisions.push(
      `- Built primarily in **${lang}** -- a deliberate fit for this kind of work, trading some ceremony for iteration speed and a strong ecosystem.`,
    );
  }
  if (topics.length) {
    const shown = topics.slice(0, 4).join(", ");
    decisions.push(
      `- The topics (**${shown}**) point at the core building blocks; each is a real design commitment, not decoration.`,
    );
  }
  if (desc) {
    decisions.push(
      `- The description frames the problem tightly, which usually means the API surface stays small and the failure modes stay explicit.`,
    );
  }
  if (decisions.length === 0) {
    decisions.push(
      `- With only a name to go on, the honest read is limited -- but the naming suggests a single, well-scoped responsibility.`,
    );
  }

  const why = topics.length || lang
    ? `**Why it matters:** it shows I pick a clear problem, commit to a coherent stack, and keep the surface small enough to test and reason about.`
    : `**Why it matters:** even from sparse metadata, the instinct is to keep scope tight -- which is what makes a system testable.`;

  return [lead, "", "**Key decisions**", ...decisions, "", why].join("\n");
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
function trimPeriod(s: string): string {
  return s.replace(/[.\s]+$/, "");
}

/** Split text into token-like pieces for a consistent fallback cadence. */
function pseudoTokens(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [text];
}
/**
 * Sleep that resolves the moment `signal` aborts, clearing its own timer, so a
 * client disconnect tears the stream down immediately instead of waiting out
 * the full cadence (and never leaves a pending setTimeout behind).
 */
function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  let meta: RepoMeta = { repo: "", description: "", language: "", topics: [] };
  try {
    const body = (await request.json()) as Record<string, unknown>;
    meta = parseBody(body);
  } catch {
    // keep the empty default
  }

  if (!meta.repo) {
    return new Response(
      JSON.stringify({ error: "Please provide a 'repo' name." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  const clientSignal = request.signal;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };
      // Abort-aware so an in-flight beat cancels immediately on client
      // disconnect rather than running out the cadence.
      const beat = (ms: number) => abortableSleep(ms, clientSignal);

      try {
        // --- STEP 1: read the metadata ----------------------------------
        send({ type: "step", id: "read", label: "Read metadata", status: "running" });
        await beat(260);
        send({
          type: "step",
          id: "read",
          label: "Read metadata",
          status: "done",
          detail: `${meta.language || "unknown lang"} · ${meta.topics.length} topics`,
        });

        // --- STEP 2: interpret ------------------------------------------
        send({ type: "step", id: "interpret", label: "Interpret architecture", status: "running" });

        const apiKey = process.env.GROQ_API_KEY;
        const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
        let mode: "groq" | "fallback" = "fallback";
        let usedModel: string | null = null;
        let note: string | undefined;
        let streamedAny = false;
        // Set ONLY on a clean Groq loop exit. Distinguishes "Groq finished" from
        // "Groq streamed some tokens then failed" so a mid-stream failure still
        // delivers a COMPLETE case study instead of a truncated half-answer.
        let completed = false;

        if (apiKey) {
          try {
            for await (const tok of streamGroq({
              apiKey,
              model,
              messages: buildMessages(meta),
              temperature: 0.4,
              maxTokens: 400,
              signal: clientSignal,
            })) {
              if (clientSignal.aborted) break;
              if (!streamedAny) {
                // First real token: close the interpret step, open the write step.
                send({ type: "step", id: "interpret", label: "Interpret architecture", status: "done", detail: "Reasoned from the public metadata." });
                send({ type: "step", id: "write", label: "Write case study", status: "running" });
              }
              streamedAny = true;
              send({ type: "token", text: tok });
            }
            completed = true;
            if (streamedAny) {
              mode = "groq";
              usedModel = model;
            } else {
              throw new Error("empty completion");
            }
          } catch (err) {
            note =
              err instanceof Error
                ? `Groq unavailable (${err.message}); wrote a templated interpretation.`
                : "Groq unavailable; wrote a templated interpretation.";
            // Groq failed PART-WAY through (tokens already emitted, clean exit
            // never reached): recover with the complete templated case study
            // after a visual break so the visitor gets a full answer, not a
            // truncated fragment.
            if (streamedAny && !completed) {
              mode = "fallback";
              usedModel = null;
              if (!clientSignal.aborted) send({ type: "token", text: "\n\n" });
              for (const tok of pseudoTokens(templatedCaseStudy(meta))) {
                if (clientSignal.aborted) break;
                send({ type: "token", text: tok });
                await beat(20);
              }
            }
          }
        } else {
          note = "No GROQ_API_KEY configured; wrote a templated interpretation (offline).";
        }

        // No tokens streamed at all (no key or an immediate Groq failure):
        // stream the templated case study from scratch with a cadence.
        if (!streamedAny) {
          send({ type: "step", id: "interpret", label: "Interpret architecture", status: "done", detail: "Composed from the public metadata." });
          send({ type: "step", id: "write", label: "Write case study", status: "running" });
          const text = templatedCaseStudy(meta);
          for (const tok of pseudoTokens(text)) {
            if (clientSignal.aborted) break;
            send({ type: "token", text: tok });
            await beat(20);
          }
        }

        send({ type: "step", id: "write", label: "Write case study", status: "done" });
        send({
          type: "done",
          mode,
          model: usedModel,
          repo: meta.repo,
          ...(note ? { note } : {}),
        });
      } catch (err) {
        // Last-resort guard: still emit a terminal event so the client never
        // hangs, and never surface a 500 to the visitor.
        try {
          const text = templatedCaseStudy(meta);
          for (const tok of pseudoTokens(text)) {
            if (clientSignal.aborted) break;
            send({ type: "token", text: tok });
          }
        } catch {
          // ignore
        }
        send({
          type: "done",
          mode: "fallback",
          model: null,
          repo: meta.repo,
          note:
            err instanceof Error
              ? `Stream error (${err.message}); ended gracefully with a templated interpretation.`
              : "Stream error; ended gracefully with a templated interpretation.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    },
  });
}
