"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

type GraphBackgroundProps = {
  /** node count is capped internally for performance */
  density?: number;
  className?: string;
  /** smaller, calmer variant used as a section divider */
  variant?: "hero" | "divider";
};

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  pulse: number;
  pulseSpeed: number;
};

type Edge = { a: number; b: number };

/**
 * Signature motif: a living "retrieval graph". Nodes (documents / agents)
 * drift and softly pulse; edges draw between nearby nodes and a travelling
 * packet animates along active edges -- evoking GraphRAG + agent retrieval.
 *
 * Lightweight: single canvas, requestAnimationFrame, capped node count,
 * DPR-aware, pauses when offscreen, and renders a static frame for
 * prefers-reduced-motion.
 */
export default function GraphBackground({
  density = 22,
  className = "",
  variant = "hero",
}: GraphBackgroundProps) {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NODE_COUNT = Math.min(variant === "divider" ? 12 : density, 34);
    const LINK_DIST = variant === "divider" ? 170 : 230;
    // Forest-green palette: teal-sage nodes/edges with a pale-sage packet.
    // rgb() of --accent-cyan (#7fb79a), --accent-violet (#adc9b3), #cfe0c9.
    const CYAN = "127, 183, 154";
    const VIOLET = "173, 201, 179";
    const PACKET = "207, 224, 201";

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    let raf = 0;
    let running = true;
    let t = 0;
    // Throttle to ~30fps: ambient motion doesn't need 60/120fps, and halving
    // the frame count halves the main-thread cost so it stays smooth on a busy
    // CPU (multiple graph instances, slower laptops). Edges recompute only
    // every few frames since nodes drift very slowly -- the O(n^2) pair scan
    // was the per-frame hot spot.
    const FRAME_MS = 33;
    let lastFrame = 0;
    let edgeTick = 0;

    function seed() {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        r: 1.8 + Math.random() * 2.6,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.008 + Math.random() * 0.014,
      }));
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (nodes.length === 0) seed();
    }

    function computeEdges() {
      edges = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          if (dx * dx + dy * dy < LINK_DIST * LINK_DIST) {
            edges.push({ a: i, b: j });
          }
        }
      }
    }

    function draw(animate: boolean) {
      ctx!.clearRect(0, 0, width, height);
      // Recompute edges every 6th frame (~5x/sec at 30fps) instead of every
      // frame -- nodes move <1px/frame so the near-neighbour set barely changes.
      if (edges.length === 0 || edgeTick % 6 === 0) computeEdges();
      edgeTick++;

      // edges
      for (const e of edges) {
        const na = nodes[e.a];
        const nb = nodes[e.b];
        const dx = na.x - nb.x;
        const dy = na.y - nb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const alpha = (1 - dist / LINK_DIST) * 0.68;
        const grad = ctx!.createLinearGradient(na.x, na.y, nb.x, nb.y);
        grad.addColorStop(0, `rgba(${CYAN}, ${alpha})`);
        grad.addColorStop(1, `rgba(${VIOLET}, ${alpha})`);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.15;
        ctx!.beginPath();
        ctx!.moveTo(na.x, na.y);
        ctx!.lineTo(nb.x, nb.y);
        ctx!.stroke();

        // travelling retrieval packet along a subset of edges
        if (animate) {
          const speed = 0.00035;
          const p = ((t * speed + (e.a + e.b) * 0.13) % 1 + 1) % 1;
          const px = na.x + (nb.x - na.x) * p;
          const py = na.y + (nb.y - na.y) * p;
          ctx!.beginPath();
          ctx!.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${PACKET}, ${alpha + 0.3})`;
          ctx!.fill();
        }
      }

      // nodes -- glow drawn as a cheap radial gradient instead of canvas
      // shadowBlur (shadowBlur is one of the most expensive 2D-canvas ops and
      // was set/reset per node every frame; a gradient halo looks the same and
      // costs a fraction, which is what kept the motif smooth under CPU load).
      for (const n of nodes) {
        const pulse = animate ? (Math.sin(n.pulse) + 1) / 2 : 0.5;
        const haloR = (n.r + pulse * 1.2) * 3.2;
        const halo = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloR);
        halo.addColorStop(0, `rgba(${CYAN}, ${0.28 + pulse * 0.14})`);
        halo.addColorStop(1, `rgba(${CYAN}, 0)`);
        ctx!.fillStyle = halo;
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, haloR, 0, Math.PI * 2);
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r + pulse * 1.2, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${CYAN}, ${0.7 + pulse * 0.3})`;
        ctx!.fill();
      }
    }

    function step(now?: number) {
      if (!running) return;
      raf = requestAnimationFrame(step);
      // ~30fps cap: skip this frame if not enough time has passed. Keeps the
      // motion identical to the eye but halves CPU vs an uncapped rAF loop.
      const ts = now ?? 0;
      if (ts && ts - lastFrame < FRAME_MS) return;
      // advance by real elapsed time so speed is display-rate independent.
      const dt = lastFrame ? Math.min(ts - lastFrame, 50) : FRAME_MS;
      lastFrame = ts;
      t += dt;
      const move = dt / 16; // normalize drift to the old 16ms baseline
      for (const n of nodes) {
        n.x += n.vx * move;
        n.y += n.vy * move;
        n.pulse += n.pulseSpeed * move;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
        n.x = Math.max(0, Math.min(width, n.x));
        n.y = Math.max(0, Math.min(height, n.y));
      }
      draw(true);
    }

    resize();

    if (reduce) {
      draw(false);
    } else {
      raf = requestAnimationFrame(step);
    }

    const onResize = () => resize();
    window.addEventListener("resize", onResize);

    // Pause when the canvas scrolls out of view.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (reduce) return;
        if (entry.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(step);
        } else if (!entry.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    const onVisibility = () => {
      if (reduce) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        raf = requestAnimationFrame(step);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, [reduce, density, variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`h-full w-full ${className}`}
    />
  );
}
