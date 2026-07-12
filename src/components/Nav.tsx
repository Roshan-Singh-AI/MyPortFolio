"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { nav, site } from "@/content/site";

export default function Nav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu when the route changes -- adjust state during render
  // by comparing against the last-rendered pathname held in state (React's
  // sanctioned alternative to a setState-in-effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-5 transition-all duration-500 sm:px-8 ${
          scrolled
            ? "my-3 rounded-full border border-line bg-[rgba(10,10,15,0.72)] py-2.5 backdrop-blur-xl"
            : "my-4 border border-transparent py-3"
        }`}
      >
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-sm font-semibold tracking-tight"
          aria-label={`${site.name} -- home`}
        >
          <span className="relative grid h-8 w-8 place-items-center rounded-lg border border-line-strong bg-white/[0.03]">
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(115deg,#22d3ee,#a78bfa)] shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          </span>
          <span className="font-[family-name:var(--font-display)]">
            Roshan<span className="text-cyan">.</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-4 py-2 text-sm transition-colors duration-300 ${
                  active ? "text-text" : "text-text-dim hover:text-text"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId={reduce ? undefined : "nav-pill"}
                    className="absolute inset-0 rounded-full border border-line-strong bg-white/[0.05]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <a
          href={`mailto:${site.email}`}
          className="hidden rounded-full border border-line-strong bg-white/[0.02] px-4 py-2 text-sm text-text transition-colors hover:border-cyan/50 hover:bg-white/[0.06] md:inline-flex"
        >
          Let&apos;s talk
        </a>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="relative grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-white/[0.02] md:hidden"
        >
          <span className="flex flex-col gap-1.5">
            <span
              className={`h-px w-5 bg-text transition-transform duration-300 ${
                open ? "translate-y-[3.5px] rotate-45" : ""
              }`}
            />
            <span
              className={`h-px w-5 bg-text transition-transform duration-300 ${
                open ? "-translate-y-[3.5px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mx-4 mt-1 overflow-hidden rounded-2xl border border-line bg-[rgba(10,10,15,0.92)] p-2 backdrop-blur-xl md:hidden"
          >
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-base transition-colors ${
                    active
                      ? "bg-white/[0.05] text-text"
                      : "text-text-dim hover:text-text"
                  }`}
                >
                  {item.label}
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-cyan" />}
                </Link>
              );
            })}
            <a
              href={`mailto:${site.email}`}
              className="mt-1 flex items-center justify-center rounded-xl bg-[linear-gradient(115deg,#22d3ee,#a78bfa)] px-4 py-3 text-base font-medium text-[#08080c]"
            >
              Let&apos;s talk
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
