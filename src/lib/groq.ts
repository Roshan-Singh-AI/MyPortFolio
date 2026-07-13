/**
 * Shared, server-only Groq helpers.
 *
 * Extracted from the original /api/ask/stream route so the newer AI routes
 * (/api/casestudy, /api/fit) reuse the SAME proxy-aware fetch + OpenAI-style
 * SSE stream parser instead of duplicating it. Keeping this in one place means
 * the corporate-proxy path (HTTPS_PROXY -> undici ProxyAgent) and the graceful
 * timeout behaviour stay identical everywhere.
 *
 * Secrets: GROQ_API_KEY / GROQ_MODEL are read by the caller from process.env
 * and passed in -- this module never reads env itself and is never imported by
 * client code (undici + Node fetch options are Node-only).
 */

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Parse a single OpenAI-compatible SSE line (`data: {json}`) and return its
 * content delta, or null for keep-alives / `[DONE]` / malformed lines. Shared
 * by the read loop and the final residual-buffer flush so a last `data:` chunk
 * with no trailing newline is not silently dropped.
 */
export function parseSseDelta(rawLine: string): string | null {
  const line = rawLine.trim();
  if (!line.startsWith("data:")) return null;
  const payload = line.slice(5).trim();
  if (payload === "[DONE]") return null;
  try {
    const json = JSON.parse(payload) as {
      choices?: { delta?: { content?: string } }[];
    };
    return json.choices?.[0]?.delta?.content ?? null;
  } catch {
    // ignore malformed keep-alive / partial lines
    return null;
  }
}

/**
 * undici ProxyAgent dispatcher for HTTPS_PROXY (local dev behind a proxy).
 * Returns undefined when no proxy is configured (the normal Vercel case).
 */
export async function getProxyDispatcher(): Promise<unknown | undefined> {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy) return undefined;
  try {
    // undici ships inside Node (>=18). Import via a computed specifier so the
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

/**
 * Non-streaming Groq chat completion. Throws on any non-OK response, empty
 * completion, or timeout so the caller can fall back to an offline path.
 */
export async function callGroq(opts: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<string> {
  const {
    apiKey,
    model,
    messages,
    temperature = 0.3,
    maxTokens = 600,
    timeoutMs = 15_000,
    signal,
  } = opts;

  const dispatcher = await getProxyDispatcher();
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, temperature, max_tokens: maxTokens, messages }),
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);

    if (!res.ok) throw new Error(`Groq responded ${res.status}`);

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Groq returned an empty completion");
    return content;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Streaming Groq chat completion (SSE, stream:true). Yields each token's text
 * delta as it arrives. Throws on any non-OK response, empty stream, or timeout
 * so the caller can fall back to an offline composed answer.
 */
export async function* streamGroq(opts: {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal: AbortSignal;
}): AsyncGenerator<string> {
  const {
    apiKey,
    model,
    messages,
    temperature = 0.3,
    maxTokens = 600,
    timeoutMs = 15_000,
    signal,
  } = opts;

  const dispatcher = await getProxyDispatcher();
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        messages,
      }),
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);

    if (!res.ok || !res.body) throw new Error(`Groq responded ${res.status}`);

    // Parse the OpenAI-compatible SSE stream: `data: {json}` lines and a
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
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        const delta = parseSseDelta(line);
        if (delta) {
          emitted = true;
          yield delta;
        }
      }
    }

    // Flush any residual complete line the stream ended on WITHOUT a trailing
    // newline (a proxy or abrupt close can deliver the last `data:` chunk this
    // way). Without this the final delta -- possibly the only one -- is lost.
    if (buffer.trim()) {
      const delta = parseSseDelta(buffer);
      if (delta) {
        emitted = true;
        yield delta;
      }
    }

    if (!emitted) throw new Error("Groq returned an empty stream");
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", onAbort);
  }
}
