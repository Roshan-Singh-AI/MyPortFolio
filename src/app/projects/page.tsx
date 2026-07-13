import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import ProjectsExplorer from "@/components/ProjectsExplorer";
import LiveFromGitHub from "@/components/LiveFromGitHub";
import { Reveal } from "@/components/RevealText";
import MagneticButton from "@/components/MagneticButton";
import { numberWord, projects, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "GraphRAG hybrid retrieval, long-term agent memory, and cost-aware model routing -- open-source LLM systems by Roshan Singh.",
  openGraph: {
    title: "Projects -- Roshan Singh",
    description:
      "GraphRAG, agent memory, and cost-aware model routing -- open-source LLM systems.",
  },
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-36 sm:px-8 sm:pt-44">
      <SectionHeading
        kicker="Projects"
        title="Retrieval and agents, built to be measured."
        intro={`${numberWord(projects.length)} systems I designed and built end to end -- each with tests, benchmarks, and a working demo. Search semantically below, or explore the code on GitHub.`}
      />

      <div className="mt-14">
        <ProjectsExplorer projects={projects} />
      </div>

      {/* Living portfolio -- live, client-fetched GitHub repos + an agent that
          writes an architecture case study for any one of them. */}
      <LiveFromGitHub />

      <Reveal delay={0.1}>
        <div className="mt-16 mb-8 flex flex-col items-start gap-4 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg text-text-dim">
            More on GitHub -- and always something new in progress.
          </p>
          <MagneticButton href={site.links.github} external variant="ghost">
            View GitHub profile
          </MagneticButton>
        </div>
      </Reveal>
    </div>
  );
}
