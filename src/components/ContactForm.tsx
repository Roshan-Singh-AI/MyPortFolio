"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { site } from "@/content/site";
import { EASE_OUT } from "@/lib/motion";

/**
 * A conversational "fill-in-the-blanks sentence" contact form. Instead of a
 * generic name/email/message grid, the visitor completes a sentence:
 *
 *   "Hi Roshan, I'm [name] from [company] and I'd like to talk about [topic].
 *    Reach me at [email]. [optional message]"
 *
 * It POSTs to /api/contact, which forwards to a webhook if configured and
 * always succeeds so the UI can show a friendly success state. A mailto:
 * fallback to Roshan is always offered, so it works with zero backend.
 */

type Status = "idle" | "sending" | "success" | "error";

const MESSAGE_MAX = 2000;

/** Inline field that grows with its content and underlines on focus. */
function Blank({
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  width = "12ch",
  required,
  reduce,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  width?: string;
  required?: boolean;
  reduce: boolean;
}) {
  const filled = value.trim().length > 0;
  return (
    <span className="relative inline-flex flex-col">
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        // width tracks content via a CSS variable so the sentence stays fluid.
        style={{ width: `max(${width}, ${Math.max(value.length, placeholder.length)}ch)` }}
        className="peer max-w-full bg-transparent px-1 pb-0.5 text-text placeholder:text-text-faint/70 focus:outline-none"
      />
      <span
        aria-hidden
        className={`h-px w-full origin-left transition-colors duration-300 ${
          filled ? "bg-cyan/60" : "bg-line-strong"
        }`}
      >
        <motion.span
          className="block h-px w-full origin-left bg-[linear-gradient(90deg,#22d3ee,#a78bfa)]"
          initial={false}
          animate={{ scaleX: 0 }}
          variants={{ focus: { scaleX: 1 }, blur: { scaleX: 0 } }}
          transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}
        />
      </span>
    </span>
  );
}

export default function ContactForm() {
  const reduce = useReducedMotion();
  const nameId = useId();
  const fromId = useId();
  const topicId = useId();
  const emailId = useId();
  const msgId = useId();
  const statusId = useId();

  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [topic, setTopic] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const mailto = () => {
    const subject = encodeURIComponent(
      topic ? `Portfolio: ${topic}` : "Hello from your portfolio",
    );
    const body = encodeURIComponent(
      `Hi Roshan,\n\nI'm ${name || "..."}${from ? ` from ${from}` : ""}.\n` +
        `I'd like to talk about ${topic || "..."}.\n\n${message}`.trim(),
    );
    return `mailto:${site.email}?subject=${subject}&body=${body}`;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setFeedback("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, from, topic, email, message }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        delivered?: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        setStatus("error");
        setFeedback(data.error || "Something went wrong. Try the email link below.");
        return;
      }
      setStatus("success");
      setFeedback(
        data.delivered
          ? "Message sent -- I'll be in touch. You can also email me directly."
          : "Got it. The quickest way to reach me is the email link below.",
      );
    } catch {
      setStatus("error");
      setFeedback("Network hiccup. Please use the email link below.");
    }
  };

  const reset = () => {
    setStatus("idle");
    setFeedback("");
    setName("");
    setFrom("");
    setTopic("");
    setEmail("");
    setMessage("");
    formRef.current?.querySelector("input")?.focus();
  };

  return (
    <div className="rounded-3xl border border-line bg-[linear-gradient(160deg,rgba(34,211,238,0.04),rgba(167,139,250,0.05))] p-6 sm:p-9">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="flex flex-col items-start gap-4 py-6"
          >
            <motion.span
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="grid h-12 w-12 place-items-center rounded-full border border-cyan/50 bg-cyan/10"
              aria-hidden
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <motion.path
                  d="M5 13l4 4L19 7"
                  stroke="#22d3ee"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.1 }}
                />
              </svg>
            </motion.span>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                Thanks{name ? `, ${name.split(" ")[0]}` : ""}.
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-text-dim">
                {feedback}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              <a
                href={mailto()}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(115deg,#22d3ee,#a78bfa)] px-5 py-2.5 text-sm font-medium text-[#08080c]"
              >
                Email me directly
              </a>
              <button
                type="button"
                onClick={reset}
                className="rounded-full border border-line-strong bg-white/[0.02] px-5 py-2.5 text-sm text-text-dim transition-colors hover:text-text"
              >
                Send another
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            ref={formRef}
            onSubmit={onSubmit}
            initial={false}
            exit={reduce ? undefined : { opacity: 0 }}
            className="flex flex-col gap-6"
            aria-describedby={statusId}
          >
            <p className="text-lg leading-loose text-text-dim sm:text-xl">
              <span className="text-text">Hi Roshan, I&apos;m </span>
              <label htmlFor={nameId} className="sr-only">
                Your name
              </label>
              <Blank
                id={nameId}
                value={name}
                onChange={setName}
                placeholder="your name"
                width="10ch"
                required
                reduce={reduce ?? false}
              />
              <span className="text-text"> from </span>
              <label htmlFor={fromId} className="sr-only">
                Your company or team (optional)
              </label>
              <Blank
                id={fromId}
                value={from}
                onChange={setFrom}
                placeholder="company / team"
                width="12ch"
                reduce={reduce ?? false}
              />
              <span className="text-text"> and I&apos;d love to talk about </span>
              <label htmlFor={topicId} className="sr-only">
                What you would like to talk about
              </label>
              <Blank
                id={topicId}
                value={topic}
                onChange={setTopic}
                placeholder="a role / a RAG project / an idea"
                width="16ch"
                required
                reduce={reduce ?? false}
              />
              <span className="text-text">. Reach me at </span>
              <label htmlFor={emailId} className="sr-only">
                Your email address
              </label>
              <Blank
                id={emailId}
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                type="email"
                width="16ch"
                reduce={reduce ?? false}
              />
              <span className="text-text">.</span>
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={msgId}
                  className="kicker text-[0.62rem]"
                >
                  Anything else (optional)
                </label>
                <span
                  className={`font-[family-name:var(--font-mono)] text-[0.62rem] ${
                    message.length > MESSAGE_MAX * 0.9
                      ? "text-violet"
                      : "text-text-faint"
                  }`}
                >
                  {message.length}/{MESSAGE_MAX}
                </span>
              </div>
              <textarea
                id={msgId}
                value={message}
                maxLength={MESSAGE_MAX}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="A sentence or two of context helps me reply well."
                className="w-full resize-none rounded-xl border border-line bg-bg/60 px-4 py-3 text-sm text-text placeholder:text-text-faint transition-colors duration-300 focus:border-cyan/60 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={status === "sending"}
                className="group inline-flex items-center gap-2 rounded-full bg-[linear-gradient(115deg,#22d3ee,#a78bfa)] px-7 py-3.5 text-sm font-medium text-[#08080c] transition-all duration-300 hover:shadow-[0_16px_44px_-12px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "sending" ? "Sending..." : "Send message"}
                {status !== "sending" && (
                  <svg
                    width="16"
                    height="16"
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
                )}
              </button>
              <a
                href={mailto()}
                className="text-sm text-text-dim underline-offset-4 transition-colors hover:text-cyan hover:underline"
              >
                or email me directly
              </a>
            </div>

            <p
              id={statusId}
              role="status"
              aria-live="polite"
              className={`min-h-[1.25rem] text-sm ${
                status === "error" ? "text-violet" : "text-text-faint"
              }`}
            >
              {feedback}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
