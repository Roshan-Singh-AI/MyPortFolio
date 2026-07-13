/**
 * GET /api/github -- same-origin proxy for Roshan's PUBLIC GitHub repos.
 *
 * Why a server proxy instead of fetching api.github.com straight from the
 * browser:
 *   - It works behind a corporate proxy in local dev (server-side undici
 *     ProxyAgent via HTTPS_PROXY) -- the browser has no such escape hatch.
 *   - GitHub's unauthenticated rate limit is per-IP; from one server IP with a
 *     short cache this is far more robust than per-visitor browser calls.
 *   - The browser only ever makes a SAME-ORIGIN request, so a blocked/offline
 *     GitHub never surfaces a cross-origin `net::ERR_*` console error on the
 *     page. This endpoint ALWAYS returns 200 with a JSON body; on any failure
 *     it returns `{ repos: [], ok: false }` and the client hides the section.
 *
 * Still UNAUTHENTICATED -- no token, no secret. Public data only.
 */

import { NextResponse } from "next/server";
import { getProxyDispatcher } from "@/lib/groq";

export const runtime = "nodejs";
// Cache the response briefly at the framework level to stay well under
// GitHub's unauthenticated rate limit while keeping the list fresh.
export const revalidate = 600;

const GITHUB_URL =
  "https://api.github.com/users/Roshan-Singh-AI/repos?sort=updated&per_page=100";

/** The trimmed repo shape we expose to the client (public fields only). */
type PublicRepo = {
  id: number;
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  html_url: string;
  fork: boolean;
  archived: boolean;
  updated_at: string;
  pushed_at: string;
  topics: string[];
};

function shape(raw: unknown): PublicRepo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "number" || typeof r.name !== "string") return null;
  return {
    id: r.id,
    name: r.name,
    description: typeof r.description === "string" ? r.description : null,
    language: typeof r.language === "string" ? r.language : null,
    stargazers_count: typeof r.stargazers_count === "number" ? r.stargazers_count : 0,
    forks_count: typeof r.forks_count === "number" ? r.forks_count : 0,
    html_url: typeof r.html_url === "string" ? r.html_url : "https://github.com/Roshan-Singh-AI",
    fork: r.fork === true,
    archived: r.archived === true,
    updated_at: typeof r.updated_at === "string" ? r.updated_at : "",
    pushed_at: typeof r.pushed_at === "string" ? r.pushed_at : "",
    topics: Array.isArray(r.topics)
      ? (r.topics as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 12)
      : [],
  };
}

export async function GET(): Promise<NextResponse> {
  const dispatcher = await getProxyDispatcher();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);

  try {
    const res = await fetch(GITHUB_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "roshan-portfolio",
      },
      signal: controller.signal,
      ...(dispatcher ? { dispatcher } : {}),
    } as RequestInit);

    // Rate-limited (403/429) or any non-OK -> soft, honest empty result.
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, repos: [], note: `GitHub responded ${res.status}` },
        { status: 200 },
      );
    }

    const data = (await res.json()) as unknown;
    const repos = Array.isArray(data)
      ? data.map(shape).filter((r): r is PublicRepo => r !== null)
      : [];
    return NextResponse.json({ ok: true, repos }, { status: 200 });
  } catch (err) {
    // Offline / DNS blocked / timeout -> never 500; client hides the section.
    return NextResponse.json(
      {
        ok: false,
        repos: [],
        note: err instanceof Error ? `GitHub unreachable (${err.message})` : "GitHub unreachable",
      },
      { status: 200 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
