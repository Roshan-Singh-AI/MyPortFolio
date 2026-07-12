import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import ProjectCard from "@/components/ProjectCard";
import { Reveal } from "@/components/RevealText";
import MagneticButton from "@/components/MagneticButton";
import { projects, site } from "@/content/site";

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
        intro="Three systems I designed and built end to end -- each with tests, benchmarks, and a working demo. Explore the code on GitHub."
      />

      <div className="mt-14 grid gap-4 lg:grid-cols-2">
        {projects.map((project, i) => (
          <ProjectCard key={project.slug} project={project} index={i} />
        ))}
      </div>

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
