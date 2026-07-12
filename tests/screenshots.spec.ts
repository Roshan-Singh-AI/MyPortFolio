import { test } from "@playwright/test";

/**
 * Visual QA capture: full-page screenshots of every route at desktop and
 * mobile widths, plus a tight crop of each page's main heading (to verify
 * word spacing after the RevealText fix). Not assertions -- these are for
 * human/visual review. Saved under tests/__shots__/.
 */

const ROUTES = ["/", "/work", "/projects", "/about", "/contact"] as const;

for (const route of ROUTES) {
  const slug = route === "/" ? "home" : route.replace(/\//g, "");

  test(`shot ${slug}`, async ({ page }, testInfo) => {
    await page.goto(route, { waitUntil: "networkidle" });
    // let entrance animations settle so we capture the final, readable state
    await page.waitForTimeout(1800);
    await page.screenshot({
      path: `tests/__shots__/${testInfo.project.name}-${slug}.png`,
      fullPage: true,
    });

    // crop of the first big heading, to eyeball letter/word spacing
    const heading = page.locator("h1, h2").first();
    if (await heading.count()) {
      await heading.screenshot({
        path: `tests/__shots__/${testInfo.project.name}-${slug}-heading.png`,
      });
    }
  });
}
