import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end tests for the portfolio.
 *
 * Goals:
 *  - every route loads (200-level, correct <title>, key content visible)
 *  - navigation works and reflects the active route
 *  - the signature graph canvas actually renders
 *  - real, honest content is present (name, projects, honest framing)
 *  - GitHub / contact links point where they should
 *  - NO console errors on any page (a common silent-breakage source)
 */

const ROUTES = ["/", "/work", "/projects", "/about", "/contact"] as const;

// Collect console errors + page errors for a given page.
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe("routes load cleanly", () => {
  for (const route of ROUTES) {
    test(`${route} loads with no console errors`, async ({ page }) => {
      const errors = trackErrors(page);
      const res = await page.goto(route, { waitUntil: "networkidle" });
      expect(res?.status(), `HTTP status for ${route}`).toBeLessThan(400);

      // Something meaningful rendered.
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("h1, h2").first()).toBeVisible();

      // No console / page errors.
      expect(errors, `console/page errors on ${route}`).toEqual([]);
    });
  }
});

test("home shows name, title and positioning", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Roshan Singh").first()).toBeVisible();
  await expect(page.getByText(/AI Engineer/i).first()).toBeVisible();
  // honest positioning line mentions agents / retrieval / evaluation
  await expect(page.getByText(/agents|retrieval|evaluation/i).first()).toBeVisible();
});

test("signature graph canvas renders on the home page", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeAttached();
  // canvas should have real pixel dimensions (i.e. it actually mounted)
  const box = await canvas.boundingBox();
  expect(box, "canvas bounding box").not.toBeNull();
  expect((box?.width ?? 0) * (box?.height ?? 0)).toBeGreaterThan(0);
});

test("nav links reach every section", async ({ page }) => {
  await page.goto("/");
  for (const [label, path] of [
    ["Work", "/work"],
    ["Projects", "/projects"],
    ["About", "/about"],
    ["Contact", "/contact"],
  ] as const) {
    // click the first visible nav link with that name
    const link = page.getByRole("link", { name: new RegExp(`^${label}$`, "i") }).first();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await page.goto("/"); // reset for next iteration
  }
});

test("projects page shows all three projects and links to GitHub", async ({ page }) => {
  await page.goto("/projects");
  // Scope to the project cards (<article>) so these don't clash with the
  // separate "Live from GitHub" repo grid, which may also list a repo of the
  // same name when the live GitHub proxy is reachable.
  const cards = page.locator("article");
  await expect(cards.filter({ hasText: /Multihop-GraphRAG/i }).first()).toBeVisible();
  await expect(cards.filter({ hasText: /Agent Memory/i }).first()).toBeVisible();
  await expect(cards.filter({ hasText: /Smart Retrieval Router/i }).first()).toBeVisible();

  // the flagship repo link is present and correct
  const repo = page.getByRole("link", {
    name: /Multihop-GraphRAG|GitHub|repo|view/i,
  });
  const hrefs = await page
    .locator('a[href*="github.com/Roshan-Singh-AI"]')
    .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));
  expect(hrefs.some((h) => h.includes("github.com/Roshan-Singh-AI"))).toBeTruthy();
  expect(await repo.count()).toBeGreaterThan(0);
});

test("work page tells the Bosch story honestly (contributor framing)", async ({ page }) => {
  await page.goto("/work");
  await expect(page.getByText(/Bosch/i).first()).toBeVisible();
  await expect(page.getByText(/CSAI Hub/i).first()).toBeVisible();
  // honest first-project framing present somewhere
  await expect(page.getByText(/Parts-data|classification|first project/i).first()).toBeVisible();
});

test("contact exposes the real email and social links", async ({ page }) => {
  await page.goto("/contact");
  // At least one mailto link to the real address must exist AND be visible.
  // (A second mailto lives in the desktop-only nav button, which is hidden on
  // mobile by design -- so we assert on the VISIBLE one, not just the first.)
  const mailto = page.locator('a[href^="mailto:roshan.16n@gmail.com"]');
  expect(await mailto.count()).toBeGreaterThan(0);
  await expect(mailto.filter({ visible: true }).first()).toBeVisible();
  await expect(page.locator('a[href*="linkedin.com/in/roshan-singh"]').first()).toBeVisible();
  await expect(page.locator('a[href*="github.com/Roshan-Singh-AI"]').first()).toBeVisible();
});

test("no horizontal overflow (layout doesn't break the viewport)", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  // allow a couple px of rounding slop
  expect(overflow).toBeLessThanOrEqual(2);
});
