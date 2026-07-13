import Link from "next/link";
import Hero from "@/components/Hero";
import AtAGlance from "@/components/AtAGlance";
import GraphDivider from "@/components/GraphDivider";
import SectionHeading from "@/components/SectionHeading";
import { Reveal } from "@/components/RevealText";
import MagneticButton from "@/components/MagneticButton";
import AskMyWork from "@/components/AskMyWork";
import { capabilities, numberWord, projects } from "@/content/site";

export default function Home() {
  return (
    <>
      <Hero />

      {/* HR-friendly "at a glance" band -- high on the page, scannable */}
      <AtAGlance />

      {/* What I do */}
      <section
        className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20"
        aria-labelledby="what-i-do"
      >
        <SectionHeading
          id="what-i-do"
          kicker="What I do"
          title={`${numberWord(capabilities.length)} things, done well.`}
          intro="Not a generalist spreading thin -- a builder focused on the parts of an LLM system that decide whether it actually works in production."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {capabilities.map((cap, i) => (
            <Reveal key={cap.title} delay={i * 0.08}>
              <div className="group flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface/40 p-6 transition-colors duration-500 hover:border-line-strong">
                <span className="font-[family-name:var(--font-mono)] text-sm text-cyan">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                  {cap.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-dim">
                  {cap.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <GraphDivider />

      {/* Ask my work -- interactive RAG demo */}
      <section
        className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20"
        aria-labelledby="ask-my-work"
      >
        <SectionHeading
          id="ask-my-work"
          kicker="Ask my work"
          title="This page is a tiny RAG system."
          intro="Ask a question below. It retrieves the most relevant facts about my work with TF-IDF + cosine similarity -- you can watch the chunks get scored -- then grounds a cited answer with Groq, falling back to a retrieval-only answer with no key. Same pattern I ship in production RAG, just small enough to see."
        />

        <Reveal>
          <AskMyWork />
        </Reveal>
      </section>

      <GraphDivider />

      {/* Featured highlights -- last section; the footer's own top margin
          supplies the closing breathing room, so no extra bottom pad here. */}
      <section
        className="mx-auto max-w-6xl px-5 pt-16 pb-4 sm:px-8 sm:pt-20 sm:pb-6"
        aria-labelledby="featured"
      >
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            id="featured"
            kicker="Selected work"
            title="Systems, not screenshots."
            intro="A snapshot of what I have built and shipped -- explore the full story in Work and Projects."
          />
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <Reveal>
            <Link
              href="/work"
              className="group relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface/40 p-7 transition-colors duration-500 hover:border-cyan/40"
            >
              <div className="flex flex-col gap-2">
                <span className="kicker">Experience</span>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                  Bosch Global Software Technologies
                </h3>
                <p className="text-sm text-text-dim">
                  GenAI Engineer on the Applied AI team -- from a two-person PoC
                  to an org-wide app builder now in pilot.
                </p>
              </div>
              <span className="mt-6 inline-flex items-center gap-2 text-sm text-cyan transition-transform duration-300 group-hover:translate-x-1">
                Read the story
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 12h14m-6-6 6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          </Reveal>

          <Reveal delay={0.08}>
            <Link
              href="/projects"
              className="group relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface/40 p-7 transition-colors duration-500 hover:border-violet/40"
            >
              <div className="flex flex-col gap-2">
                <span className="kicker">Projects</span>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
                  Retrieval &amp; agent systems
                </h3>
                <p className="text-sm text-text-dim">
                  GraphRAG, long-term agent memory, and cost-aware model routing
                  -- each open on GitHub.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {projects.map((p) => (
                  <span
                    key={p.slug}
                    className="rounded-md border border-line bg-white/[0.02] px-2 py-1 font-[family-name:var(--font-mono)] text-[0.68rem] text-text-faint"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </Link>
          </Reveal>
        </div>

        <Reveal delay={0.16}>
          <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-[linear-gradient(115deg,rgba(127,183,154,0.07),rgba(224,207,160,0.06))] p-8 sm:flex-row sm:items-center sm:p-10">
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl balance">
                Building something that needs an AI engineer?
              </h3>
              <p className="mt-2 max-w-lg text-sm text-text-dim">
                I am open to roles and collaborations across LLM applications,
                RAG, and agents.
              </p>
            </div>
            <MagneticButton href="/contact">Get in touch</MagneticButton>
          </div>
        </Reveal>

        {/* Recruiter fast-path -- a can't-miss entry into the Fit Analyzer. */}
        <Reveal delay={0.2}>
          <Link
            href="/contact#fit"
            className="group mt-4 flex flex-col items-start justify-between gap-5 overflow-hidden rounded-2xl border border-gold/25 bg-[linear-gradient(115deg,rgba(224,207,160,0.08),rgba(127,183,154,0.05))] p-8 transition-colors duration-500 hover:border-gold/45 sm:flex-row sm:items-center sm:p-10"
          >
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gold/[0.08] text-gold"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3 4 7v5c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V7z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <div>
                <span className="kicker text-gold text-[0.6rem]">For recruiters</span>
                <h3 className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl balance">
                  Have a job description? See the fit in seconds.
                </h3>
                <p className="mt-2 max-w-lg text-sm text-text-dim">
                  Paste a JD into the Fit Analyzer -- it matches the role to my
                  real work, sources every claim, and drafts a note you can send.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-gold transition-transform duration-300 group-hover:translate-x-1">
              Try the Fit Analyzer
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        </Reveal>
      </section>
    </>
  );
}
