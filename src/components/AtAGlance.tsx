import { glanceStats, coreSkills } from "@/content/site";

/**
 * "At a glance" -- the HR-scannable band, placed high on the home page so a
 * non-technical recruiter grasps the value in ~5 seconds.
 *
 * A compact bento/stat strip of HONEST, traceable numbers (see site.ts:
 * glanceStats, each documenting its real source) plus a tight row of core
 * skill chips. Reveal is pure CSS (`.reveal` / `.reveal-stagger`, view()
 * timeline) -- no JS, visible by default, so it can't stick or flicker.
 */
export default function AtAGlance() {
  return (
    <section
      className="mx-auto max-w-6xl px-5 pt-4 sm:px-8"
      aria-labelledby="at-a-glance"
    >
      <h2 id="at-a-glance" className="sr-only">
        At a glance
      </h2>

      {/* Instant, no reveal: this band sits high on the home page and must be
          scannable the moment a recruiter lands -- reveals are reserved for
          content you scroll to. */}
      <div className="rounded-3xl border border-line bg-[linear-gradient(160deg,rgba(127,183,154,0.06),rgba(173,201,179,0.05))] p-5 backdrop-blur-sm sm:p-7">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {glanceStats.map((stat) => (
            <li
              key={stat.label}
              className="flex flex-col gap-1"
            >
              <span className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-gradient sm:text-3xl">
                {stat.value}
              </span>
              <span className="text-[0.78rem] leading-snug text-text-dim">
                {stat.label}
              </span>
            </li>
          ))}
        </ul>

        {/* Core skills row */}
        <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-line pt-6">
          <span className="kicker mr-1 text-[0.58rem]">Core skills</span>
          {coreSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-line bg-white/[0.02] px-3 py-1 font-[family-name:var(--font-mono)] text-[0.7rem] text-text-dim transition-colors duration-300 hover:border-cyan/50 hover:text-text"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
