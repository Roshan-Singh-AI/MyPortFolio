import Link from "next/link";
import Hero from "@/components/Hero";
import GraphDivider from "@/components/GraphDivider";
import SectionHeading from "@/components/SectionHeading";
import { Reveal } from "@/components/RevealText";
import MagneticButton from "@/components/MagneticButton";
import AskMyWork from "@/components/AskMyWork";
import { capabilities, projects } from "@/content/site";

export default function Home() {
  return (
    <>
      <Hero />

      {/* What I do */}
      <section
        className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32"
        aria-labelledby="what-i-do"
      >
        <SectionHeading
          id="what-i-do"
          kicker="What I do"
          title="Three things, done well."
          intro="Not a generalist spreading thin -- a builder focused on the parts of an LLM system that decide whether it actually works in production."
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
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
        className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32"
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

      {/* Featured highlights */}
      <section
        className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32"
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

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
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
          <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-[linear-gradient(115deg,rgba(34,211,238,0.06),rgba(167,139,250,0.06))] p-8 sm:flex-row sm:items-center sm:p-10">
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
      </section>
    </>
  );
}
