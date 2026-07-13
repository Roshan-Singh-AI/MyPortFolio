import GraphBackground from "./GraphBackground";

/** Reuses the signature graph as a slim, calm section divider. */
export default function GraphDivider() {
  return (
    <div
      aria-hidden
      className="relative mx-auto h-16 w-full max-w-6xl overflow-hidden px-5 sm:px-8"
    >
      <div className="relative h-full w-full opacity-80">
        <GraphBackground variant="divider" density={12} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_120%_at_50%_50%,transparent,var(--bg))]" />
    </div>
  );
}
