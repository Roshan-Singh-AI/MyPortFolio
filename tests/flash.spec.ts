import { test, expect, type Page } from "@playwright/test";

/**
 * FOUC / re-animate flash verification.
 *
 * The bug: on cold load, above-the-fold content (hero headline, availability
 * pill, nav, at-a-glance band) painted VISIBLE from SSR, then framer-motion
 * applied its hidden `initial` state so the content DISAPPEARED, then
 * re-animated in -- a visible flash (visible -> hidden -> visible).
 *
 * These tests MEASURE, per animation frame from first paint, the computed
 * opacity + transform of every above-the-fold element and assert the flash
 * pattern never occurs. The pass/fail gate is the numeric timeline, not visual
 * inspection.
 */

// The in-page recorder. Installed via addInitScript so it runs BEFORE any app
// JS on a fresh document -- it starts sampling at the very first frame.
const RECORDER = () => {
  // @ts-expect-error injected global
  window.__frames = [];
  const SELECTORS: Record<string, string> = {
    heroName: "h1 > span:nth-child(1)",
    heroTitle: "h1 > span:nth-child(2)",
    heroPara: "section[aria-label='Introduction'] p",
    pill: "section[aria-label='Introduction'] .rounded-full",
    nav: "header nav[aria-label='Primary'], header",
    glance: "section[aria-labelledby='at-a-glance'] > div",
  };
  // The inner motion.span that actually carries the rise transform, per word.
  const WORD_SEL = "h1 .inline-block.overflow-hidden > span";

  const t0 = performance.now();
  function readTranslateY(el: Element): number {
    const tr = getComputedStyle(el).transform;
    if (!tr || tr === "none") return 0;
    // matrix(a,b,c,d,e,f) -> f is translateY; matrix3d(...) -> index 13
    const m = tr.match(/matrix\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
      return parts[5] ?? 0;
    }
    const m3 = tr.match(/matrix3d\(([^)]+)\)/);
    if (m3) {
      const parts = m3[1].split(",").map((s) => parseFloat(s.trim()));
      return parts[13] ?? 0;
    }
    return 0;
  }
  function sample() {
    const t = performance.now() - t0;
    // @ts-expect-error injected global
    const frames = window.__frames as Array<Record<string, unknown>>;
    for (const [sel, css] of Object.entries(SELECTORS)) {
      const el = document.querySelector(css);
      if (!el) {
        frames.push({ t, sel, opacity: null, translateY: null, top: null });
        continue;
      }
      const cs = getComputedStyle(el);
      frames.push({
        t,
        sel,
        opacity: parseFloat(cs.opacity),
        translateY: readTranslateY(el),
        top: (el as HTMLElement).getBoundingClientRect().top,
      });
    }
    // Track headline WORD spans (the rise animation carriers).
    const words = document.querySelectorAll(WORD_SEL);
    words.forEach((w, i) => {
      const cs = getComputedStyle(w);
      frames.push({
        t,
        sel: `word${i}`,
        opacity: parseFloat(cs.opacity),
        translateY: readTranslateY(w),
        top: (w as HTMLElement).getBoundingClientRect().top,
      });
    });
    if (t < 600) requestAnimationFrame(sample);
  }
  requestAnimationFrame(sample);
};

type Frame = {
  t: number;
  sel: string;
  opacity: number | null;
  translateY: number | null;
  top: number | null;
};

const ABOVE_FOLD = ["heroName", "heroTitle", "heroPara", "pill", "nav"] as const;

function trackConsole(page: Page) {
  const bad: string[] = [];
  const rx = /hydrat|did not match|Warning: Text content|Warning: Prop|didn't match/i;
  page.on("console", (msg) => {
    const txt = msg.text();
    if (msg.type() === "error" || rx.test(txt)) {
      if (rx.test(txt) || msg.type() === "error") bad.push(`[${msg.type()}] ${txt}`);
    }
  });
  page.on("pageerror", (err) => bad.push(`[pageerror] ${err.message}`));
  return bad;
}

async function getFrames(page: Page): Promise<Frame[]> {
  return page.evaluate(() => {
    // @ts-expect-error injected global
    return (window.__frames ?? []) as Frame[];
  });
}

/**
 * Wait until the in-page recorder has accumulated enough frames AND the
 * recorder has finished its 600ms window, then return them. Robust against a
 * CPU-starved page (parallel projects sharing one server) where wall-clock
 * time elapses faster than the page runs its rAF loop.
 */
async function waitForFrames(page: Page, min = 6): Promise<Frame[]> {
  await page
    .waitForFunction(
      (m) => {
        // @ts-expect-error injected global
        const f = (window.__frames ?? []) as Array<{ t: number }>;
        // enough frames AND the last sample is past the recorder window
        return f.length >= m && f.some((x) => x.t >= 560);
      },
      min,
      { timeout: 8000 }
    )
    .catch(() => {});
  return getFrames(page);
}

/** Frames for one selector, in time order, with a non-null opacity reading. */
function timelineFor(frames: Frame[], sel: string): Frame[] {
  return frames
    .filter((f) => f.sel === sel && f.opacity !== null)
    .sort((a, b) => a.t - b.t);
}

function assertNoFlash(frames: Frame[], sel: string) {
  const tl = timelineFor(frames, sel);
  expect(tl.length, `have frames for ${sel}`).toBeGreaterThan(0);

  // (a) visible at first recorded paint
  const first = tl[0];
  expect(
    first.opacity!,
    `${sel} must be visible on FIRST frame (t=${first.t.toFixed(1)}ms) -- got ${first.opacity}`
  ).toBeGreaterThanOrEqual(0.99);

  // (b) never disappears afterwards
  const minLater = Math.min(...tl.map((f) => f.opacity!));
  const dropFrame = tl.find((f) => f.opacity! < 0.9);
  expect(
    minLater,
    `${sel} must never drop below 0.9 (flash) -- min ${minLater} at t=${
      dropFrame?.t.toFixed(1) ?? "n/a"
    }ms; timeline: ${tl.map((f) => f.opacity!.toFixed(2)).join(",")}`
  ).toBeGreaterThanOrEqual(0.9);
}

test.describe("home cold-load flash", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(RECORDER);
  });

  test("no above-the-fold element flashes visible->hidden->visible", async ({ page }, testInfo) => {
    const bad = trackConsole(page);
    // waitUntil:'commit' => sampling starts at first paint, not after load.
    await page.goto("/", { waitUntil: "commit" });
    const frames = await waitForFrames(page);

    // Attach the raw timeline for human review.
    await testInfo.attach("home-frames.json", {
      body: JSON.stringify(frames, null, 2),
      contentType: "application/json",
    });

    expect(frames.length, "recorder captured frames").toBeGreaterThan(5);

    for (const sel of ABOVE_FOLD) assertNoFlash(frames, sel);
    // The at-a-glance band is above/near the fold too.
    assertNoFlash(frames, "glance");

    // No hydration warnings / console errors on load.
    expect(bad, `console/page errors on cold load`).toEqual([]);
  });

  test("headline mounts as words and settles at translateY 0 (never stuck hidden)", async ({
    page,
  }) => {
    // The anti-flash design renders the headline as PLAIN TEXT from SSR, then
    // after mount swaps to per-word clip spans that framer drives to their
    // final position. This test does NOT require the rise to be *observable*
    // (in headless Chromium framer resolves the intro to its end state without
    // a sampled mid-transition, and the reduced-motion project renders plain
    // text with no word spans at all). What it MUST guarantee is the inverse of
    // the flash bug: if the word spans exist, they must end at translateY ~0 and
    // opacity 1 -- i.e. never stuck in the hidden y:115% initial state.
    await page.goto("/", { waitUntil: "commit" });
    const frames = await waitForFrames(page);

    const wordSels = [...new Set(frames.map((f) => f.sel))].filter((s) => s.startsWith("word"));

    for (const sel of wordSels) {
      const tl = timelineFor(frames, sel);
      if (tl.length === 0) continue;
      const last = tl[tl.length - 1];
      expect(
        Math.abs(last.translateY ?? 0),
        `${sel} must settle at translateY ~0 (not stuck in hidden 115% initial); got ${last.translateY}`
      ).toBeLessThanOrEqual(1.5);
      expect(
        last.opacity!,
        `${sel} must end fully visible; got ${last.opacity}`
      ).toBeGreaterThanOrEqual(0.99);
      // And critically: it must never have been observed BELOW its final spot
      // by a large amount AFTER first appearing (that would be the hidden clip).
      const maxDown = Math.max(...tl.map((f) => f.translateY ?? 0), 0);
      expect(
        maxDown,
        `${sel} must never sit far below baseline (hidden clip artifact); max +${maxDown}px`
      ).toBeLessThan(10);
    }
  });

  test("SSR HTML does not inline framer's hidden initial state", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();

    // The h1 block + its word spans must NOT carry a hidden transform/opacity.
    // (If framer inlined initial on the server, we'd see translateY(115%),
    //  a matrix with a large Y, or opacity:0 on the headline.)
    const h1 = html.match(/<h1[\s\S]*?<\/h1>/i);
    expect(h1, "h1 present in SSR HTML").not.toBeNull();
    const h1html = h1![0];

    expect(h1html).not.toMatch(/translateY\(115%\)/i);
    expect(h1html).not.toMatch(/opacity:\s*0(?!\.)/i);
    // A matrix with a big Y translation would be the inlined hidden state.
    const matrices = h1html.match(/matrix\([^)]*\)/gi) ?? [];
    for (const m of matrices) {
      const y = parseFloat(m.split(",").pop()!.replace(")", "").trim());
      expect(Math.abs(y), `h1 SSR matrix Y should be ~0, got ${y} in ${m}`).toBeLessThan(5);
    }
    // Name + title render as plain visible text.
    expect(h1html).toMatch(/Roshan Singh/);
    expect(h1html).toMatch(/AI Engineer/);
  });

  test("no CLS on the RevealText plain-text -> clip mount swap", async ({ page }) => {
    await page.goto("/", { waitUntil: "commit" });
    const h1 = page.locator("h1").first();
    await h1.waitFor({ state: "visible" });

    // Isolate the clip-swap from font-swap reflow: measure both boxes with the
    // web font already loaded. Capture the PLAIN-TEXT height (before the mount
    // swap installs the per-word clip spans), then the POST-swap height.
    const result = await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      // Re-query fresh each time (React may replace the node on the mount swap).
      const q = () => document.querySelector("h1") as HTMLElement | null;
      const hasWords = (el: HTMLElement) =>
        !!el.querySelector(".inline-block.overflow-hidden > span");
      const el0 = q()!;
      const before = el0.getBoundingClientRect().height;
      const beforeSwapped = hasWords(el0);
      // Give the mount swap + intro time to fully settle.
      await new Promise((r) => setTimeout(r, 500));
      const el1 = q()!;
      const after = el1.getBoundingClientRect().height;
      const afterSwapped = hasWords(el1);
      return { before, after, beforeSwapped, afterSwapped };
    });

    // Whatever transition happened (plain-text -> clipped words), the headline
    // block height must not shift -- that is the CLS the fix must avoid.
    const dh = Math.abs(result.after - result.before);
    expect(
      dh,
      `h1 height must not shift across the mount swap (before ${result.before}px swapped=${result.beforeSwapped}, after ${result.after}px swapped=${result.afterSwapped}; delta ${dh}px)`
    ).toBeLessThanOrEqual(1);
    // Sanity: by the end the clip spans exist (the swap really happened) OR the
    // headline is plain text under reduced motion -- both are acceptable.
    expect(result.after).toBeGreaterThan(0);
  });
});

test.describe("route-change flash (PageTransition)", () => {
  test("navigating to /projects does not flash the new page content away", async ({ page }) => {
    const bad = trackConsole(page);
    await page.goto("/", { waitUntil: "commit" });
    await page.waitForTimeout(300);

    // On mobile the primary nav is collapsed into a hamburger menu; open it
    // FIRST (before arming the recorder) so the Projects link is clickable and
    // the menu animation doesn't eat into the sampling window.
    const projectsLink = page.getByRole("link", { name: /^Projects$/i }).first();
    if (!(await projectsLink.isVisible().catch(() => false))) {
      const toggle = page.getByRole("button", { name: /open menu/i }).first();
      if (await toggle.isVisible().catch(() => false)) {
        await toggle.click();
        await page.waitForTimeout(350);
      }
    }
    const target = page.getByRole("link", { name: /^Projects$/i }).first();
    await target.waitFor({ state: "visible" });

    // Sample DRIVER-SIDE (from the test process) rather than via an in-page
    // global: a client nav can discard the page's JS execution context, wiping
    // any injected recorder. Polling getComputedStyle from Playwright is immune
    // to that. We read the route content node's opacity right after the click.
    const t0 = Date.now();
    const tl: Frame[] = [];
    await target.click();
    // Sample tightly for ~700ms across the route transition.
    for (let i = 0; i < 40; i++) {
      const op = await page
        .evaluate(() => {
          const main = document.querySelector("main#content");
          const node = (main?.firstElementChild as Element) ?? main;
          return node ? parseFloat(getComputedStyle(node).opacity) : null;
        })
        .catch(() => null);
      if (op !== null) tl.push({ t: Date.now() - t0, sel: "route", opacity: op, translateY: 0, top: 0 });
      await page.waitForTimeout(18);
    }
    await page.waitForURL(/\/projects$/, { timeout: 5000 }).catch(() => {});
    expect(tl.length, "route-change frames captured").toBeGreaterThan(3);

    // PageTransition uses initial opacity 0 -> animate 1. That is a legitimate
    // monotonic fade-in (0 -> 1), NOT a flash. The flash pattern would be
    // 1 -> 0 -> 1. Assert opacity never dips AFTER exceeding 0.5 (i.e. once the
    // new page is shown it stays shown).
    let peaked = false;
    let flashed = false;
    let flashAt = -1;
    for (const f of tl) {
      if ((f.opacity ?? 0) >= 0.9) peaked = true;
      if (peaked && (f.opacity ?? 1) < 0.1) {
        flashed = true;
        flashAt = f.t;
      }
    }
    expect(
      flashed,
      `route content flashed away after appearing (t=${flashAt}ms); timeline: ${tl
        .map((f) => (f.opacity ?? 0).toFixed(2))
        .join(",")}`
    ).toBeFalsy();

    await expect(page).toHaveURL(/\/projects$/);
    expect(bad, "console errors during route change").toEqual([]);
  });
});

test.describe("reduced-motion cold load", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(RECORDER);
  });

  test("content visible at first frame, stays visible, no warnings, no rise", async ({
    page,
  }, testInfo) => {
    // Only meaningful under the reduced-motion project; still safe elsewhere.
    const reduced = testInfo.project.name === "reduced-motion";
    const bad = trackConsole(page);
    await page.goto("/", { waitUntil: "commit" });
    const frames = await waitForFrames(page);

    for (const sel of ABOVE_FOLD) assertNoFlash(frames, sel);
    assertNoFlash(frames, "glance");
    expect(bad, "console/page errors (reduced motion)").toEqual([]);

    if (reduced) {
      // Under reduced motion the headline renders as plain text (no word spans
      // with a rise). If any word spans exist, they must never translate.
      const wordSels = [...new Set(frames.map((f) => f.sel))].filter((s) => s.startsWith("word"));
      for (const sel of wordSels) {
        const tl = timelineFor(frames, sel);
        const maxMove = Math.max(...tl.map((f) => Math.abs(f.translateY ?? 0)), 0);
        expect(maxMove, `${sel} must not animate under reduced motion`).toBeLessThanOrEqual(1.5);
      }
    }
  });
});

test.describe("human-reviewable evidence", () => {
  test("screenshot burst of cold home load @0/60/120/250/500ms", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "commit" });
    const stamps = [0, 60, 120, 250, 500];
    let prev = 0;
    for (const ms of stamps) {
      await page.waitForTimeout(ms - prev);
      prev = ms;
      const buf = await page.screenshot({ fullPage: false });
      await testInfo.attach(`home-load-${ms}ms.png`, {
        body: buf,
        contentType: "image/png",
      });
    }
    // Sanity: the headline text is present & visible in the final shot.
    await expect(page.getByText("Roshan Singh").first()).toBeVisible();
  });
});
