/**
 * Shared motion constants.
 *
 * Scroll-reveal entrances are now pure CSS (see the `.reveal` /
 * `.reveal-stagger` / `.reveal-words` system in globals.css, driven by
 * `animation-timeline: view()`), so the old framer reveal variants
 * (staggerParent/riseItem/fadeItem/viewportOnce) were removed. These easings
 * remain for micro-interactions, page transitions, and the hero on-mount intro.
 */

/** Snappy ease for micro-interactions (hover, nav pill, small UI motion). */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Symmetric ease for reversible / looping motion. */
export const EASE_INOUT = [0.65, 0, 0.35, 1] as const;

/** Gentle, even deceleration for content entrances (the hero word-rise). */
export const EASE_REVEAL = [0.22, 0.61, 0.36, 1] as const;
