import type { SkillGroup } from "@/content/site";

/** Grouped skills as chips that stagger in on scroll -- pure CSS
 *  (`.reveal-stagger`, view() timeline). No JS, visible by default. */
export default function SkillChips({ groups }: { groups: SkillGroup[] }) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <div
          key={group.label}
          className="grid gap-3 border-t border-line pt-6 md:grid-cols-[10rem_1fr]"
        >
          <h3 className="font-[family-name:var(--font-mono)] text-sm uppercase tracking-wider text-cyan">
            {group.label}
          </h3>
          <ul className="reveal-stagger flex flex-wrap gap-2">
            {group.items.map((item, i) => (
              <li
                key={item}
                style={{ "--reveal-i": Math.min(i, 8) } as React.CSSProperties}
                className="cursor-default rounded-lg border border-line bg-white/[0.02] px-3 py-1.5 text-sm text-text-dim transition-colors duration-300 hover:border-cyan/50 hover:text-text"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
