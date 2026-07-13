import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import MagneticButton from "@/components/MagneticButton";
import { Reveal } from "@/components/RevealText";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Roshan Singh -- Generative AI Engineer. View or download the latest resume (PDF): production LLM, RAG, and agentic AI at Bosch.",
  openGraph: {
    title: "Resume -- Roshan Singh",
    description:
      "Generative AI Engineer -- production LLM, RAG, and agents. View or download the latest PDF.",
  },
};

export default function ResumePage() {
  const { file, updated } = site.resume;

  return (
    <div className="mx-auto max-w-6xl px-5 pt-36 sm:px-8 sm:pt-44">
      <SectionHeading
        kicker="Resume"
        title="The one-page version."
        intro="For when you need the PDF. View it inline or download a copy -- always the latest."
      />

      <Reveal>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <MagneticButton href={file} external>
            View full screen
          </MagneticButton>
          {/* Native anchor with `download` so it saves the file instead of
              opening a tab -- MagneticButton (next/link) can't set `download`. */}
          <a
            href={file}
            download="Roshan_Singh_Resume.pdf"
            className="group relative inline-flex items-center justify-center gap-2 rounded-full border border-line-strong bg-white/[0.02] px-6 py-3 text-sm font-medium tracking-tight text-text transition-colors duration-300 hover:border-cyan/50 hover:bg-white/[0.06] focus-visible:outline-2"
          >
            Download PDF
          </a>
          <span className="ml-1 font-[family-name:var(--font-mono)] text-xs text-text-faint">
            Updated {updated}
          </span>
        </div>
      </Reveal>

      {/* Embedded preview. <object> renders the PDF inline where supported and
          falls back to the message + buttons above where it is not (e.g. some
          mobile browsers block inline PDF). */}
      <Reveal delay={0.08}>
        <div className="glow-ring mt-8 mb-12 overflow-hidden rounded-2xl border border-line bg-surface/40">
          <object
            data={`${file}#view=FitH`}
            type="application/pdf"
            aria-label="Roshan Singh resume PDF preview"
            className="h-[80vh] min-h-[520px] w-full"
          >
            {/* Fallback: shown only if inline PDF embedding is unavailable. */}
            <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
              <p className="text-sm text-text-dim">
                Your browser can&apos;t show the PDF inline. Open or download it
                with the buttons above.
              </p>
              <MagneticButton href={file} external>
                Open the resume
              </MagneticButton>
            </div>
          </object>
        </div>
      </Reveal>
    </div>
  );
}
