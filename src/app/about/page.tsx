import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import SkillMatcher from "@/components/SkillMatcher";
import { Reveal } from "@/components/RevealText";
import GraphDivider from "@/components/GraphDivider";
import { awards, education, site, skillGroups } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "AI Engineer focused on production LLM systems -- agents, retrieval, and evaluation. Skills, education, and recognition.",
  openGraph: {
    title: "About -- Roshan Singh",
    description:
      "AI Engineer focused on production LLM systems -- agents, retrieval, and evaluation.",
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-36 sm:px-8 sm:pt-44">
      <SectionHeading
        kicker="About"
        title="Engineer first, hype last."
      />

      <div className="mt-10 grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <div className="flex flex-col gap-5 text-base leading-relaxed text-text-dim">
            <p>
              I am an AI engineer who likes the unglamorous parts of GenAI --
              the retrieval that actually finds the right context, the agent
              that recovers when a tool fails, and the evaluation that tells you
              whether any of it is working.
            </p>
            <p>
              At Bosch I have gone from owning a two-person proof of concept to
              contributing to org-wide platforms now in pilot. Along the way I
              have built RAG and GraphRAG pipelines, LangGraph agents, MCP tool
              integrations, and the guardrails and evaluation that make them
              safe to ship.
            </p>
            <p>
              Outside of work I build in the open -- hybrid graph retrieval,
              long-term agent memory, and cost-aware model routing -- because
              the best way to understand a system is to build it end to end.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-line bg-surface/40 p-6">
              <span className="kicker">Education</span>
              <p className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                {education.degree}
              </p>
              <p className="text-sm text-text-dim">{education.school}</p>
              <p className="mt-1 font-[family-name:var(--font-mono)] text-xs text-text-faint">
                {education.period} &middot; {education.detail}
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-surface/40 p-6">
              <span className="kicker">Recognition</span>
              <ul className="mt-3 flex flex-col gap-2">
                {awards.map((a) => (
                  <li
                    key={a}
                    className="flex items-center gap-2.5 text-sm text-text"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-[linear-gradient(115deg,#7fb79a,#adc9b3)]"
                    />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-line bg-surface/40 p-6">
              <span className="kicker">Based in</span>
              <p className="mt-3 text-sm text-text">{site.location}</p>
              <p className="mt-1 text-xs text-text-faint">{site.relocation}</p>
            </div>
          </div>
        </Reveal>
      </div>

      <GraphDivider />

      <div className="mt-8">
        <SectionHeading
          kicker="Toolkit"
          title="Skills, grouped by how I use them."
          intro="Hiring for something specific? Paste a line from the job description and the skills re-rank by real semantic similarity."
        />
        <div className="mt-12 mb-8">
          <SkillMatcher groups={skillGroups} />
        </div>
      </div>
    </div>
  );
}
