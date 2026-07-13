/**
 * POST /api/fit -- the "Fit analyzer" for a pasted job description.
 *
 * A recruiter pastes a JD; this route produces an honest, GROUNDED fit read:
 *   1. Retrieve: run the SAME TF-IDF + cosine retriever (src/lib/retrieval.ts)
 *      over Roshan's real knowledge base to find the chunks most relevant to
 *      the JD. These carry source labels and are the ONLY evidence used.
 *   2. Analyze: ask Groq to return a STRUCTURED fit analysis as JSON --
 *        - verdict: a short qualitative read (NOT a fake precise %)
 *        - strengths[]: 3-4 concrete matches, each grounded in a real chunk
 *          and tagged with its source label
 *        - gaps[]: things the JD asks for that are NOT in Roshan's context,
 *          framed constructively and honestly
 *        - pitch: a tailored 2-sentence note Roshan could send
 *   3. Fall back gracefully: with no key or a Groq failure, return a
 *      retrieval-only structured summary built from the top chunks. Never 500s.
 *
 * The model is instructed to ground strengths ONLY in the provided chunks and
 * to NEVER fabricate experience to match the JD -- honesty is the product.
 *
 * Secrets: GROQ_API_KEY / GROQ_MODEL are server-only; the Groq call is routed
 * through undici's ProxyAgent when HTTPS_PROXY is set (see src/lib/groq.ts).
 */

import { NextResponse, type NextRequest } from "next/server";
import { knowledge } from "@/content/knowledge";
import { buildIndex, retrieve, type ScoredChunk } from "@/lib/retrieval";
import { callGroq, DEFAULT_MODEL, type ChatMessage } from "@/lib/groq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOP_K = 6;
const JD_MAX = 6000;

// Build the TF-IDF index once per server instance (module scope).
const index = buildIndex(knowledge);

type Strength = { point: string; source: string };

type FitAnalysis = {
  verdict: string;
  strengths: Strength[];
  gaps: string[];
  pitch: string;
  /** Source labels of the chunks the analysis was grounded on. */
  sources: string[];
  mode: "groq" | "fallback";
  model: string | null;
  /** Present when we fell back off the LLM path, for honest debugging. */
  note?: string;
};

type WireChunk = { id: string; source: string; text: string; score: number };

function serializeChunks(scored: ScoredChunk[]): WireChunk[] {
  return scored.map((s) => ({
    id: s.chunk.id,
    source: s.chunk.source,
    text: s.chunk.text,
    score: Math.round(s.score * 1000) / 1000,
  }));
}

/** The distinct source labels present in the grounding chunks, in order. */
function distinctSources(chunks: WireChunk[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of chunks) {
    if (!seen.has(c.source)) {
      seen.add(c.source);
      out.push(c.source);
    }
  }
  return out;
}

/** Grounded prompt: honest, structured JSON, no fabricated experience. */
function buildMessages(jd: string, chunks: WireChunk[]): ChatMessage[] {
  const context = chunks
    .map((c, i) => `[${i + 1}] (${c.source}) ${c.text}`)
    .join("\n");
  const validSources = distinctSources(chunks).join(", ");

  const system = [
    "You are a precise, honest hiring analyst evaluating how the engineer Roshan Singh fits a job description.",
    "You are given (a) the job description and (b) numbered CONTEXT chunks -- the ONLY facts you know about Roshan, each with a source label.",
    "Ground every strength in those chunks. NEVER invent experience, tools, employers, numbers, or projects that are not in the context, even if the JD asks for them. Honesty is the whole point.",
    "If the JD requires something the context does not show, that is a GAP -- list it constructively, not as a dealbreaker.",
    "Do NOT output a fake precise percentage or score. Give a short qualitative verdict instead.",
    "Refer to the engineer as 'Roshan'. Write the pitch in Roshan's own first-person voice.",
    "",
    "Respond with ONLY a JSON object (no markdown fence, no prose) of exactly this shape:",
    '{"verdict": string, "strengths": [{"point": string, "source": string}], "gaps": [string], "pitch": string}',
    "- verdict: 1-2 sentences, a qualitative read of the overall fit (e.g. 'Strong fit for ...', 'Partial fit -- ...').",
    "- strengths: 3-4 items. `point` is one concrete sentence tying Roshan's real experience to a JD requirement. `source` MUST be one of these exact labels: " + validSources + ".",
    "- gaps: 0-3 short, honest, constructive notes about JD asks not evidenced in the context. Empty array if none.",
    "- pitch: exactly 2 sentences Roshan could send to the recruiter, specific and grounded, no fluff.",
    "No emoji. Keep every field tight.",
  ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: `CONTEXT:\n${context}\n\nJOB DESCRIPTION:\n${jd}` },
  ];
}

/** Parse the model's JSON defensively (it may wrap it in a code fence). */
function parseAnalysis(raw: string, validSources: string[]): {
  verdict: string;
  strengths: Strength[];
  gaps: string[];
  pitch: string;
} | null {
  let text = raw.trim();
  // Strip a ```json ... ``` fence if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Otherwise slice to the outermost braces.
  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    text = text.slice(start, end + 1);
  }

  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;

  const verdict = typeof o.verdict === "string" ? o.verdict.trim().slice(0, 400) : "";
  const pitch = typeof o.pitch === "string" ? o.pitch.trim().slice(0, 600) : "";

  const sourceSet = new Set(validSources);
  const strengths: Strength[] = Array.isArray(o.strengths)
    ? o.strengths
        .map((s) => {
          if (!s || typeof s !== "object") return null;
          const so = s as Record<string, unknown>;
          const point = typeof so.point === "string" ? so.point.trim().slice(0, 400) : "";
          let source = typeof so.source === "string" ? so.source.trim() : "";
          // Guard against a hallucinated source label -- only allow real ones.
          if (!sourceSet.has(source)) source = validSources[0] ?? "Context";
          return point ? { point, source } : null;
        })
        .filter((x): x is Strength => x !== null)
        .slice(0, 5)
    : [];

  const gaps: string[] = Array.isArray(o.gaps)
    ? o.gaps
        .filter((g): g is string => typeof g === "string")
        .map((g) => g.trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  if (!verdict || strengths.length === 0) return null;
  return { verdict, strengths, gaps, pitch };
}

/**
 * Retrieval-only structured fallback -- honest and grounded, no LLM. Turns the
 * top chunks into strengths and derives a qualitative verdict from the top
 * cosine score. Reads as "here is the real evidence", not a fabricated match.
 */
function fallbackAnalysis(chunks: WireChunk[]): {
  verdict: string;
  strengths: Strength[];
  gaps: string[];
  pitch: string;
} {
  const usable = chunks.filter((c) => c.score > 0);
  const top = usable[0]?.score ?? 0;

  const verdict =
    usable.length === 0
      ? "Not enough overlap to call it from the knowledge base alone -- worth a direct conversation about the specifics."
      : top >= 0.14
        ? "Strong overlap with Roshan's grounded experience below. A live model read is offline right now, so this is retrieval-only."
        : top >= 0.05
          ? "Partial, real overlap with Roshan's experience below. This is a retrieval-only read (live model offline)."
          : "Light overlap in the knowledge base -- the strongest real matches are listed below (retrieval-only, live model offline).";

  const strengths: Strength[] = usable.slice(0, 4).map((c) => {
    const sentence = (c.text.match(/[^.!?]+[.!?]+/) ?? [c.text])[0].trim();
    return { point: sentence, source: c.source };
  });

  const gaps =
    usable.length === 0
      ? ["Nothing in the knowledge base clearly matched this JD -- ask Roshan directly about the specific requirements."]
      : [
          "This is a retrieval-only read: it surfaces the closest real evidence but cannot judge JD requirements that fall outside Roshan's documented context.",
        ];

  const pitch = strengths.length
    ? `I have hands-on, shipped experience in ${strengths[0].source} that maps directly to this role. Happy to walk through the architecture and the trade-offs on a quick call.`
    : "I would love to learn more about this role and share where my production LLM work lines up. The fastest way to go deep is a short call.";

  return { verdict, strengths, gaps, pitch };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let jd = "";
  try {
    const body = (await request.json()) as { jd?: unknown; description?: unknown };
    const raw = typeof body.jd === "string" ? body.jd : body.description;
    if (typeof raw === "string") jd = raw.trim();
  } catch {
    jd = "";
  }

  if (!jd) {
    return NextResponse.json(
      { error: "Please paste a job description in 'jd'." },
      { status: 400 },
    );
  }
  if (jd.length > JD_MAX) jd = jd.slice(0, JD_MAX);

  // 1. Retrieve grounding chunks (deterministic, offline-capable).
  const scored = retrieve(index, jd, TOP_K);
  const chunks = serializeChunks(scored);
  const sources = distinctSources(chunks.filter((c) => c.score > 0));
  const validSources = sources.length ? sources : distinctSources(chunks);

  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  // 2. Try Groq structured analysis grounded on the retrieved chunks.
  if (apiKey) {
    try {
      const raw = await callGroq({
        apiKey,
        model,
        messages: buildMessages(jd, chunks),
        temperature: 0.2,
        maxTokens: 700,
        timeoutMs: 15_000,
        signal: request.signal,
      });
      const parsed = parseAnalysis(raw, validSources);
      if (!parsed) throw new Error("Could not parse a structured analysis");
      const payload: FitAnalysis = {
        ...parsed,
        sources: validSources,
        mode: "groq",
        model,
      };
      return NextResponse.json(payload);
    } catch (err) {
      const fb = fallbackAnalysis(chunks);
      const payload: FitAnalysis = {
        ...fb,
        sources: validSources,
        mode: "fallback",
        model: null,
        note:
          err instanceof Error
            ? `Groq unavailable (${err.message}); returned a retrieval-only analysis.`
            : "Groq unavailable; returned a retrieval-only analysis.",
      };
      return NextResponse.json(payload);
    }
  }

  // No key: honest retrieval-only structured analysis.
  const fb = fallbackAnalysis(chunks);
  const payload: FitAnalysis = {
    ...fb,
    sources: validSources,
    mode: "fallback",
    model: null,
    note: "No GROQ_API_KEY configured; returned a retrieval-only analysis (offline).",
  };
  return NextResponse.json(payload);
}
