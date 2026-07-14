"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll-reveal driver -- mounted once in the root layout.
 *
 * Hard-won design:
 *  - NO pre-paint script and NO CSS hidden-by-default (both caused hydration
 *    errors / blank pages). Content is VISIBLE by default; JS is enhancement.
 *  - We only HIDE (`.reveal-armed`) an element that is genuinely below the fold,
 *    then reveal it (`.is-in`) via an IntersectionObserver as it scrolls in.
 *
 * The bug this version fixes: on client-side navigation the incoming page is
 * mid-transition (transformed), so an element that will settle ON-SCREEN can
 * momentarily measure as below-fold, get armed (hidden), and then the observer
 * may never fire for it while it's under a transform -> stuck blank until a
 * hard refresh. Fixes:
 *   1) A guaranteed re-check: every armed element is re-measured on each sweep
 *      (we do NOT mark it "done" while it is still hidden), and anything now in
 *      the viewport is force-revealed. So nothing can stay stuck.
 *   2) A final safety sweep after the transition window force-reveals every
 *      armed element that is at/above the viewport, regardless of the observer.
 */
export function useScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    const supported = "IntersectionObserver" in window;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduced || !supported) return;

    const vh = () => window.innerHeight || document.documentElement.clientHeight;
    // "In view now" must cover the WHOLE viewport (top edge anywhere above the
    // bottom). Earlier this used vh*0.92 while the observer used a -8% margin --
    // an element in that 8% band at the bottom was visible to the user but
    // neither path revealed it, so it stayed hidden until a scroll. They must
    // agree: reveal anything whose top is above the viewport bottom.
    const inViewNow = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.top < vh() && r.bottom > 0;
    };

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            obs.unobserve(entry.target);
          }
        }
      },
      // No negative bottom margin -> the observer fires as soon as ANY part of
      // an element is in the viewport, matching inViewNow(); a small positive
      // bottom margin reveals a touch early so nothing pops at the fold edge.
      { rootMargin: "0px 0px 40px 0px", threshold: 0 },
    );

    const sweep = () => {
      const els = document.querySelectorAll<HTMLElement>(
        ".reveal, .reveal-stagger, .reveal-words",
      );
      els.forEach((el) => {
        // Already fully revealed -> nothing to do.
        if (el.classList.contains("is-in")) return;

        const armed = el.classList.contains("reveal-armed");

        if (inViewNow(el)) {
          // On screen now -> reveal it, no matter what state it was in. If it
          // was armed (hidden), this transitions it in; if not, it just shows.
          el.classList.add("is-in");
          io.unobserve(el);
          return;
        }

        // Below the fold: arm (hide) once and let the observer reveal on scroll.
        // We deliberately do NOT set a "done" flag while it is still hidden, so
        // a later sweep re-checks it -- guaranteeing it can never stay stuck.
        if (!armed) {
          el.classList.add("reveal-armed");
          io.observe(el);
        }
      });
    };

    // CRITICAL: do NOT arm/reveal during the PageTransition entrance (~0.4s).
    // While PageTransition fades+lifts the whole new page, element positions are
    // offset and opacity is animating -- if we arm on-screen elements to hidden
    // in that window, they briefly vanish and re-animate, fighting the page fade
    // (the "loads -> disappears -> comes back" glitch). So we WAIT for the
    // transition to settle, THEN sweep. By then, on-screen content is at rest
    // and simply gets revealed instantly (no second animation on top of the page
    // fade); only genuinely below-fold content is armed for a scroll reveal.
    //
    // First sweep AFTER the transition (450ms), then a couple more to catch
    // late-committing content. Nothing is hidden before this, so content is
    // always visible during the transition -- no flash.
    const timers = [450, 650, 900].map((ms) => window.setTimeout(sweep, ms));

    return () => {
      timers.forEach(clearTimeout);
      io.disconnect();
    };
  }, [pathname]);
}
