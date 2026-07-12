/**
 * POST /api/contact -- contact form submission handler.
 *
 * Free + no committed secret + always works:
 *   - Validates the payload server-side.
 *   - If CONTACT_WEBHOOK_URL is set (e.g. a Slack/Discord/Zapier incoming
 *     webhook), forwards the message there. No secret is hardcoded.
 *   - If no webhook is configured, or forwarding fails, the route STILL
 *     succeeds so the UI can show its success state. The client always also
 *     offers a mailto: fallback to roshan.16n@gmail.com, so the form works
 *     with zero backend configuration.
 *
 * Runs on the Node runtime and reads env at request time -> dynamic.
 */

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContactBody = {
  name?: unknown;
  from?: unknown;
  topic?: unknown;
  message?: unknown;
  email?: unknown;
};

type Cleaned = {
  name: string;
  from: string;
  topic: string;
  message: string;
  email: string;
};

const LIMITS = { name: 80, from: 120, topic: 120, message: 2000, email: 160 };

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Lightweight, permissive email check -- real validation is a bounce test. */
function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validate(body: ContactBody): { ok: true; data: Cleaned } | {
  ok: false;
  error: string;
} {
  const data: Cleaned = {
    name: str(body.name, LIMITS.name),
    from: str(body.from, LIMITS.from),
    topic: str(body.topic, LIMITS.topic),
    message: str(body.message, LIMITS.message),
    email: str(body.email, LIMITS.email),
  };

  if (!data.name) return { ok: false, error: "Please tell me your name." };
  if (!data.topic) return { ok: false, error: "Please add what it's about." };
  if (data.email && !isEmail(data.email)) {
    return { ok: false, error: "That email address looks off." };
  }
  if (!data.email && !data.message) {
    return {
      ok: false,
      error: "Add an email or a short message so I can reply.",
    };
  }
  return { ok: true, data };
}

/** Forward to the configured webhook. Never throws to the caller. */
async function forward(data: Cleaned, url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const summary =
      `New portfolio contact\n` +
      `From: ${data.name}${data.from ? ` (${data.from})` : ""}\n` +
      `About: ${data.topic}\n` +
      (data.email ? `Email: ${data.email}\n` : "") +
      (data.message ? `Message: ${data.message}` : "");

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // `text`/`content` cover Slack & Discord shapes; `data` carries the rest.
      body: JSON.stringify({ text: summary, content: summary, data }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: ContactBody;
  try {
    body = (await request.json()) as ContactBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const result = validate(body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  let delivered = false;
  let note = "No webhook configured -- use the email fallback to reach me.";

  if (webhook) {
    delivered = await forward(result.data, webhook);
    note = delivered
      ? "Message delivered."
      : "Delivery service was unavailable -- please use the email fallback.";
  }

  // Always succeed at the HTTP level so the UI shows a friendly state; the
  // `delivered` flag tells the client whether to nudge toward mailto.
  return NextResponse.json({ ok: true, delivered, note });
}
