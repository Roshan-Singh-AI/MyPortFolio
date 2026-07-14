"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll-reveal driver -- mounted once in the root layout.
 *
 * Design goals learned the hard way:
 *  - NO pre-paint script and NO CSS hidden-by-default (both caused hydration
 *    errors / blank pages in this Next version). Content is VISIBLE by default;
 *    JS is a pure enhancement.
 *  - An element is only ever HIDDEN (`.reveal-armed`) if it is genuinely BELOW
 *    the fold when we measure it -- so above-the-fold content shows instantly
 *    and can never flash or get stuck. Armed elements are handed to an
 *    IntersectionObserver that adds `.is-in` to transition them in on scroll.
 *
 * Runs on mount and re-runs on route change (client-side nav swaps in new DOM).
 * Sweeps a few times across the page-transition window so late-committing
 * content and the incoming route's settled layout are both handled.
 */
export function useScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const supported = "IntersectionObserver" in window;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Reduced motion (or no IO): leave everything visible, do nothing.
    if (reduced || !supported) return;

    const vh = () => window.innerHeight || document.documentElement.clientHeight;

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            obs.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );

    const process = () => {
      const els = document.querySelectorAll<HTMLElement>(
        ".reveal, .reveal-stagger, .reveal-words",
      );
      els.forEach((el) => {
        if (el.dataset.revDone) return; // already resolved this element
        const top = el.getBoundingClientRect().top;
        if (top < vh() * 0.9) {
          // At/above the fold now -> just show it (never armed = never hidden).
          el.dataset.revDone = "1";
          el.classList.add("is-in");
        } else {
          // Below the fold -> arm (hide) and reveal on scroll via the observer.
          el.dataset.revDone = "1";
          el.classList.add("reveal-armed");
          io.observe(el);
        }
      });
    };

    // Sweep across mount + the page-transition window so both already-present
    // and late/animating-in content are measured at their settled positions.
    const raf = requestAnimationFrame(process);
    const timers = [90, 260, 460, 700].map((ms) =>
      window.setTimeout(process, ms),
    );

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      io.disconnect();
    };
  }, [pathname]);
}
