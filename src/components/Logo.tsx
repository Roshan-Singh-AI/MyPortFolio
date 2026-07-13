/**
 * Brand mark for Roshan Singh.
 *
 * Concept: the letter "R" drawn as a small RETRIEVAL GRAPH -- three nodes joined
 * by edges that trace an R, with one accent node "lit" like a retrieved hit.
 * It ties the identity to the actual work (RAG / GraphRAG / agents) instead of
 * a generic dot, and reads cleanly at favicon size. Pure SVG, no image asset,
 * currentColor-driven so it themes with the site (and works in light/dark).
 */
export default function Logo({
  size = 32,
  className = "",
  title = "Roshan Singh",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      {/* edges of the R-graph */}
      <g
        stroke="url(#logo-grad)"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* left spine */}
        <path d="M9 6.5 V25.5" />
        {/* bowl: spine -> top-right node -> mid node */}
        <path d="M9 6.5 H19 A5 5 0 0 1 19 16.5 H9" />
        {/* leg: mid node -> bottom-right node */}
        <path d="M14.5 16.5 L22 25.5" />
      </g>

      {/* nodes -- the graph "hits" */}
      <g fill="var(--bg, #10150f)" stroke="url(#logo-grad)" strokeWidth="2">
        <circle cx="9" cy="6.5" r="2.6" />
        <circle cx="9" cy="25.5" r="2.6" />
        <circle cx="14.5" cy="16.5" r="2.6" />
      </g>

      {/* the lit / retrieved node -- top-right, filled with the accent */}
      <circle cx="21" cy="8.5" r="3.1" fill="url(#logo-grad)" />
      <circle cx="21" cy="8.5" r="5.4" fill="url(#logo-glow)" opacity="0.5" />

      <defs>
        <linearGradient id="logo-grad" x1="6" y1="6" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7fb79a" />
          <stop offset="0.55" stopColor="#9ec9ac" />
          <stop offset="1" stopColor="#e0cfa0" />
        </linearGradient>
        <radialGradient id="logo-glow" cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="#e0cfa0" />
          <stop offset="1" stopColor="#e0cfa0" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
