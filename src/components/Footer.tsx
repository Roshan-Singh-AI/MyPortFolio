import Link from "next/link";
import { nav, site } from "@/content/site";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-20 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <span className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            Roshan Singh<span className="text-cyan">.</span>
          </span>
          <p className="max-w-sm text-sm leading-relaxed text-text-dim">
            {site.positioning}
          </p>
          <p className="kicker mt-2">
            {site.location} &nbsp;/&nbsp; {site.relocation}
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-3">
          <span className="kicker mb-1">Navigate</span>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="w-fit text-sm text-text-dim transition-colors hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3">
          <span className="kicker mb-1">Connect</span>
          <a
            href={`mailto:${site.email}`}
            className="w-fit text-sm text-text-dim transition-colors hover:text-text"
          >
            {site.email}
          </a>
          <a
            href={site.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-sm text-text-dim transition-colors hover:text-text"
          >
            GitHub
          </a>
          <a
            href={site.links.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-sm text-text-dim transition-colors hover:text-text"
          >
            LinkedIn
          </a>
          <a
            href={`tel:${site.phone.replace(/\s+/g, "")}`}
            className="w-fit text-sm text-text-dim transition-colors hover:text-text"
          >
            {site.phone}
          </a>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 border-t border-line px-5 py-6 text-xs text-text-faint sm:flex-row sm:items-center sm:px-8">
        <span>
          &copy; {year} {site.name}. Built with Next.js + framer-motion.
        </span>
        <span className="kicker">Designed &amp; built by Roshan</span>
      </div>
    </footer>
  );
}
