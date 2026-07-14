"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import CommandPalette from "./CommandPalette";
import { useScrollReveal } from "@/lib/useScrollReveal";

/**
 * Shared state for the global command palette so ANY component (the nav pill,
 * the floating AI launcher, a keyboard shortcut) can open it -- in navigate or
 * ask mode -- without each one owning its own copy of the palette. The palette
 * itself is rendered once, here, at the root.
 */

export type PaletteMode = "navigate" | "ask";

type PaletteContext = {
  open: boolean;
  mode: PaletteMode;
  /** Optional query to pre-seed (used by the launcher / deep links). */
  seed: string;
  openPalette: (mode?: PaletteMode, seed?: string) => void;
  closePalette: () => void;
};

const Ctx = createContext<PaletteContext | null>(null);

export function useCommandPalette(): PaletteContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  }
  return ctx;
}

export default function CommandPaletteProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PaletteMode>("navigate");
  const [seed, setSeed] = useState("");

  // Drives the site-wide scroll-reveal (adds `.is-in` to `.reveal*` elements;
  // re-scans on route change). Mounted once, here, inside the client boundary.
  useScrollReveal();

  const openPalette = useCallback((nextMode: PaletteMode = "navigate", nextSeed = "") => {
    setMode(nextMode);
    setSeed(nextSeed);
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, mode, seed, openPalette, closePalette }),
    [open, mode, seed, openPalette, closePalette],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <CommandPalette
        open={open}
        mode={mode}
        seed={seed}
        onClose={closePalette}
        onModeChange={setMode}
      />
    </Ctx.Provider>
  );
}
