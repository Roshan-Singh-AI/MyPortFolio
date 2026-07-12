"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useCommandPalette } from "./CommandPaletteProvider";

/**
 * Persistent floating AI assistant launcher, rendered on every page.
 *
 * A compact, tasteful FAB (bottom-right, safe-area aware, hidden on print)
 * with a soft pulsing accent glow and a spark mark. Clicking it opens the
 * shared command palette in ASK mode -- it does NOT own a second chat engine,
 * it just triggers the one palette via context.
 *
 * It also registers the global Cmd/Ctrl-K shortcut (open in navigate mode) and
 * "/" as a quick-open, so the palette is discoverable from anywhere. Sits above
 * page content (z-40) but below the open palette (z-90).
 */
export default function AiLauncher() {
  const reduce = useReducedMotion();
  const { open, openPalette } = useCommandPalette();

  // Global keyboard shortcuts to open the palette from any page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (cmdK) {
        e.preventDefault();
        openPalette("navigate");
        return;
      }
      // "/" quick-open, unless the user is typing in a field.
      if (e.key === "/" && !open) {
        const el = document.activeElement;
        const typing =
          el instanceof HTMLElement &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.isContentEditable);
        if (!typing) {
          e.preventDefault();
          openPalette("navigate");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openPalette]);

  return (
    <div className="fixed bottom-0 right-0 z-40 p-[max(1rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] print:hidden">
      <motion.button
        type="button"
        onClick={() => openPalette("ask")}
        aria-label="Ask the AI assistant"
        aria-haspopup="dialog"
        initial={reduce ? false : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: open ? 0 : 1, scale: open ? 0.8 : 1 }}
        transition={{ duration: reduce ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{ pointerEvents: open ? "none" : "auto" }}
        whileHover={reduce ? undefined : { scale: 1.06 }}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        className="group relative grid h-14 w-14 place-items-center rounded-full border border-line-strong bg-[rgba(16,16,24,0.9)] backdrop-blur-xl"
      >
        {/* Soft pulsing glow */}
        {!reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.5),transparent_70%)] blur-md"
            animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.15, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {/* Gradient ring */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full p-px [background:linear-gradient(135deg,rgba(34,211,238,0.7),rgba(167,139,250,0.7))] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude]"
        />
        {/* Spark / AI mark */}
        <span className="relative flex items-center gap-1">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className="text-cyan transition-transform duration-300 group-hover:rotate-12"
          >
            <path
              d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-4.9L6 9.4l4.4-1.6L12 3z"
              fill="currentColor"
              opacity="0.9"
            />
            <path
              d="M18.5 14.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z"
              fill="#a78bfa"
              opacity="0.85"
            />
          </svg>
        </span>
      </motion.button>
    </div>
  );
}
