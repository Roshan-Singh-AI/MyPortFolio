import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import { Reveal } from "@/components/RevealText";
import Timeline from "@/components/Timeline";
import GraphDivider from "@/components/GraphDivider";
import MagneticButton from "@/components/MagneticButton";
import { experience, tenureText } from "@/content/site";

export const metadata: Metadata = {
  title: "Work",
  description: `${experience.role} at ${experience.company}. ${experience.intro}`,
  openGraph: {
    title: "Work -- Roshan Singh",
    description: `${experience.role} at ${experience.company}.`,
  },
};

export default function WorkPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-36 sm:px-8 sm:pt-44">
      <SectionHeading
        kicker="Experience"
        title={`${tenureText("years")}, one clear thread.`}
        intro={experience.intro}
      />

      <Reveal delay={0.1}>
        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-line bg-surface/40 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
              {experience.company}{" "}
              <span className="text-text-faint">({experience.companyShort})</span>
            </p>
            <p className="mt-1 text-sm text-text-dim">
              {experience.role} &middot; {experience.location}
            </p>
          </div>
          <div className="flex flex-col sm:items-end">
            <span className="font-[family-name:var(--font-mono)] text-sm text-cyan">
              {experience.period}
            </span>
            <span className="text-xs text-text-faint">{experience.duration}</span>
          </div>
        </div>
      </Reveal>

      <GraphDivider />

      <Timeline chapters={experience.chapters} />

      <Reveal>
        <div className="mt-12 rounded-2xl border border-line bg-[linear-gradient(115deg,rgba(127,183,154,0.07),rgba(224,207,160,0.06))] p-8">
          <span className="kicker">Recognition</span>
          <p className="mt-3 font-[family-name:var(--font-display)] text-xl font-medium leading-snug tracking-tight sm:text-2xl balance">
            {experience.recognition}
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-16 mb-8 flex flex-col items-start gap-4 border-t border-line pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg text-text-dim">
            Want the project-level detail?
          </p>
          <MagneticButton href="/projects" variant="ghost">
            See the projects
          </MagneticButton>
        </div>
      </Reveal>
    </div>
  );
}
