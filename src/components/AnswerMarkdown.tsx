"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

/**
 * AnswerMarkdown -- the site's SINGLE "light markdown -> real React" renderer.
 *
 * The only implementation: every AI surface (Ask my work, the GitHub case-study
 * agent, the fit analyzer) imports THIS module instead of reimplementing it, so
 * a fix here (bold parsing, empty-bullet handling, streaming keys) benefits all
 * of them at once. Handles: a bold lead line, **inline bold**, "- " bullets, and
 * [Source] citation chips. No dangerouslySetInnerHTML -- everything is real
 * React nodes, so it stays safe and on-brand.
 *
 * `animate` streams each WORD in with a blur->sharp + rise micro-animation (the
 * premium "materialize" look). Set it false for the settled state or reduced
 * motion so the text stays crisp and accessible.
 */

export function stripStrayEmoji(s: string): string {
  // Drop emoji/pictographs the model may sprinkle in -- we want a clean,
  // engineer-y voice, not decoration. Keeps normal punctuation + text.
  return s.replace(
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu,
    "",
  );
}

/**
 * Split text into word + whitespace tokens and animate each word in. Words are
 * keyed by their RUNNING CHARACTER OFFSET in the text (not their positional
 * index): when streaming appends to the string, already-rendered words keep the
 * same offset key, so React preserves the mounted (already-animated) node
 * instead of re-firing the materialize transition on unrelated words.
 */
function AnimatedWords({ text, animate }: { text: string; animate: boolean }) {
  const words = text.split(/(\s+)/); // keep whitespace tokens for spacing
  if (!animate) return <>{text}</>;
  // Precompute each token's running character offset (a prefix sum) so the key
  // is a stable content-position identity across streaming re-renders. Built
  // via reduce so no render-scope variable is reassigned.
  const offsets = words.reduce<number[]>((acc, w, idx) => {
    acc.push(idx === 0 ? 0 : acc[idx - 1] + words[idx - 1].length);
    return acc;
  }, []);
  return (
    <>
      {words.map((w, idx) => {
        const at = offsets[idx];
        return w.trim() === "" ? (
          <span key={`w-sp-${at}`}>{w}</span>
        ) : (
          <motion.span
            key={`w-${at}`}
            className="inline-block"
            initial={{ opacity: 0, y: "0.25em", filter: "blur(6px)" }}
            animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
            transition={{ duration: 0.42, ease: EASE_OUT }}
          >
            {w}
          </motion.span>
        );
      })}
    </>
  );
}

/**
 * Render inline **bold** and [Source] chips within one line of text.
 *
 * The bold pattern is lazy over ANY character (`[\s\S]+?`) so it also matches
 * interior asterisks (e.g. `**a*b**`), and a trailing UNTERMINATED `**...` (a
 * common mid-stream state, before the closing `**` arrives) is treated as
 * bold-in-progress instead of rendering literal asterisks.
 */
export function renderInline(text: string, keyBase: string, animate = false) {
  const parts = text
    .split(/(\*\*[\s\S]+?\*\*|\*\*[\s\S]*$|\[[^\]]+\])/g)
    .filter(Boolean);
  return parts.map((p, i) => {
    // Closed bold: **...**
    if (p.startsWith("**") && p.endsWith("**") && p.length >= 4) {
      return (
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-text">
          <AnimatedWords text={p.slice(2, -2)} animate={animate} />
        </strong>
      );
    }
    // Unterminated bold streaming in: **... (no closing yet) -- render as bold
    // so the visitor never sees dangling literal asterisks.
    if (p.startsWith("**")) {
      return (
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-text">
          <AnimatedWords text={p.slice(2)} animate={animate} />
        </strong>
      );
    }
    if (p.startsWith("[") && p.endsWith("]")) {
      return (
        <motion.span
          key={`${keyBase}-c${i}`}
          className="mx-0.5 inline-flex items-center rounded-full border border-violet/40 bg-violet/[0.08] px-1.5 py-0.5 align-baseline font-[family-name:var(--font-mono)] text-[0.62rem] text-violet"
          initial={animate ? { opacity: 0, scale: 0.8 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          {p.slice(1, -1)}
        </motion.span>
      );
    }
    return (
      <span key={`${keyBase}-t${i}`}>
        <AnimatedWords text={p} animate={animate} />
      </span>
    );
  });
}

export default function AnswerMarkdown({
  text,
  animate = false,
}: {
  text: string;
  animate?: boolean;
}) {
  const clean = stripStrayEmoji(text);
  // Trim, drop blank lines AND lone bullet markers ("- ", "*") that trim to a
  // bare marker -- otherwise a marker whose text has not streamed in yet renders
  // as a stray literal dash/asterisk paragraph.
  const lines = clean
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^[-*]\s*$/.test(l));

  // Group lines into ordered blocks so a bold "section head" can sit directly
  // above its bullets (the case-study shape: lead, **Key decisions**, bullets,
  // **Why it matters**). `bi` is the ABSOLUTE block index -- used for stable
  // keys so appending a bullet does not re-animate earlier ones.
  const blocks: { kind: "bullet" | "text"; text: string; bi: number }[] =
    lines.map((l, bi) =>
      /^[-*]\s+/.test(l)
        ? { kind: "bullet", text: l.replace(/^[-*]\s+/, ""), bi }
        : { kind: "text", text: l, bi },
    );

  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.kind === "bullet") {
      const start = i;
      const group: { text: string; bi: number }[] = [];
      while (i < blocks.length && blocks[i].kind === "bullet") {
        group.push({ text: blocks[i].text, bi: blocks[i].bi });
        i += 1;
      }
      out.push(
        // Key the <ul> on the group's starting absolute block index so the list
        // identity is stable as bullets stream in.
        <ul key={`ul-${blocks[start].bi}`} className="flex flex-col gap-1.5">
          {group
            // Guard against an empty <li> if a bullet's text is still empty.
            .filter((g) => g.text.length > 0)
            .map((g) => (
              <motion.li
                key={`li-${g.bi}`}
                className="flex gap-2"
                initial={animate ? { opacity: 0, x: -6 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
              >
                <span
                  aria-hidden
                  className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-gradient-to-r from-cyan to-violet"
                />
                <span>{renderInline(g.text, `li-${g.bi}`, animate)}</span>
              </motion.li>
            ))}
        </ul>,
      );
    } else {
      // A lead / section line. The first text block reads as the lead.
      const isLead = out.length === 0;
      out.push(
        <p
          key={`p-${b.bi}`}
          className={isLead ? "text-text" : "text-text-dim"}
        >
          {renderInline(b.text, `p-${b.bi}`, animate)}
        </p>,
      );
      i += 1;
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed text-text-dim">
      {out}
    </div>
  );
}
