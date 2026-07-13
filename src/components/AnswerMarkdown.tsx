"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

/**
 * AnswerMarkdown -- the site's shared "light markdown -> real React" renderer.
 *
 * Extracted so every AI surface (Ask my work, the GitHub case-study agent, the
 * fit analyzer) renders the model's output the SAME way instead of each
 * reimplementing it. Handles: a bold lead line, **inline bold**, "- " bullets,
 * and [Source] citation chips. No dangerouslySetInnerHTML -- everything is real
 * React nodes, so it stays safe and on-brand.
 *
 * `animate` streams each WORD in with a blur->sharp + rise micro-animation (the
 * premium "materialize" look). Set it false for the settled state or reduced
 * motion so the text stays crisp and accessible.
 */

function stripStrayEmoji(s: string): string {
  // Drop emoji/pictographs the model may sprinkle in -- we want a clean,
  // engineer-y voice, not decoration. Keeps normal punctuation + text.
  return s.replace(
    /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu,
    "",
  );
}

function AnimatedWords({ text, animate }: { text: string; animate: boolean }) {
  const words = text.split(/(\s+)/); // keep whitespace tokens for spacing
  if (!animate) return <>{text}</>;
  return (
    <>
      {words.map((w, i) =>
        w.trim() === "" ? (
          <span key={`w-sp-${i}`}>{w}</span>
        ) : (
          <motion.span
            key={`w-${i}`}
            className="inline-block"
            initial={{ opacity: 0, y: "0.25em", filter: "blur(6px)" }}
            animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
            transition={{ duration: 0.42, ease: EASE_OUT }}
          >
            {w}
          </motion.span>
        ),
      )}
    </>
  );
}

/** Render inline **bold** and [Source] chips within one line of text. */
function renderInline(text: string, keyBase: string, animate = false) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-text">
          <AnimatedWords text={p.slice(2, -2)} animate={animate} />
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
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);

  // Group lines into ordered blocks so a bold "section head" can sit directly
  // above its bullets (the case-study shape: lead, **Key decisions**, bullets,
  // **Why it matters**).
  const blocks: { kind: "bullet" | "text"; text: string }[] = lines.map((l) =>
    /^[-*]\s+/.test(l)
      ? { kind: "bullet", text: l.replace(/^[-*]\s+/, "") }
      : { kind: "text", text: l },
  );

  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.kind === "bullet") {
      const group: string[] = [];
      while (i < blocks.length && blocks[i].kind === "bullet") {
        group.push(blocks[i].text);
        i += 1;
      }
      out.push(
        <ul key={`ul-${key++}`} className="flex flex-col gap-1.5">
          {group.map((g, gi) => (
            <motion.li
              key={`li-${gi}`}
              className="flex gap-2"
              initial={animate ? { opacity: 0, x: -6 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <span
                aria-hidden
                className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-gradient-to-r from-cyan to-violet"
              />
              <span>{renderInline(g, `li-${gi}`, animate)}</span>
            </motion.li>
          ))}
        </ul>,
      );
    } else {
      // A lead / section line. The first text block reads as the lead.
      const isLead = out.length === 0;
      out.push(
        <p key={`p-${key++}`} className={isLead ? "text-text" : "text-text-dim"}>
          {renderInline(b.text, `p-${key}`, animate)}
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
