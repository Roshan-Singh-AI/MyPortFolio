import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end tests for the AI feature surface added on top of the base site:
 *  - global command palette (Cmd/Ctrl-K) with navigate + ask modes
 *  - persistent floating AI launcher (opens palette in ask mode)
 *  - projects semantic search re-ranking by real cosine similarity
 *  - about-page semantic skill matcher
 *  - Ask-my-work agent still streams a real answer with real citations
 *
 * Everything must be backed by REAL computation over the real content -- these
 * tests assert on the real, data-driven output (scores, citations, reorder).
 */

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test("command palette opens with the keyboard and navigates", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");

  // Open with the platform shortcut (Control on CI/Linux, Meta on mac).
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: /command palette/i });
  await expect(dialog).toBeVisible();

  // Navigate mode: filter to Projects and jump there.
  await page.getByRole("combobox").fill("projects");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects$/);

  expect(errors).toEqual([]);
});

test("floating launcher opens the palette in ask mode and streams a real answer", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /ask the ai assistant/i }).first().click();

  const dialog = page.getByRole("dialog", { name: /command palette/i });
  await expect(dialog).toBeVisible();

  // Use a starter question so we exercise the shared stream engine. Scope to
  // the dialog so we click the palette's starter, not a page chip.
  await dialog.getByRole("button", { name: /how does he evaluate rag\?/i }).click();

  // A grounded answer streams in and real source pills appear.
  await expect(dialog.getByText(/Sources/i)).toBeVisible({ timeout: 20_000 });
  // The answer text is non-trivial (real content, not a placeholder).
  const answer = dialog.locator("p").filter({ hasText: /Roshan|RAG|evaluat|recall/i });
  await expect(answer.first()).toBeVisible();

  // Esc closes it.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("projects semantic search re-ranks cards by real similarity", async ({ page }) => {
  await page.goto("/projects");

  const search = page.getByRole("textbox", { name: /semantic search/i });
  await expect(search).toBeVisible();

  // A query about graphs should surface the GraphRAG project with a real %.
  await search.fill("graph traversal neo4j retrieval");
  // The live-region hint reports real cosine matches.
  await expect(page.getByText(/Re-ranked by cosine similarity/i)).toBeVisible();
  // A "% match" badge (real relative score) appears on cards.
  await expect(page.getByText(/% match/i).first()).toBeVisible();

  // The top card after this query is the GraphRAG system.
  const firstCard = page.locator("article").first();
  await expect(firstCard).toContainText(/Multihop-GraphRAG/i);
});

test("about page skill matcher ranks skills for a JD phrase", async ({ page }) => {
  await page.goto("/about");

  const input = page.getByRole("textbox", { name: /match skills/i });
  await expect(input).toBeVisible();

  // A JD phrase that genuinely overlaps the real skill vocabulary.
  await input.fill("RAG evaluation reranking and LangGraph agents");
  await expect(page.getByText(/match by cosine similarity/i)).toBeVisible();
  // A "Top matches" panel with real percentages shows up.
  await expect(page.getByText(/Top matches/i)).toBeVisible();
  await expect(page.getByText(/%/).first()).toBeVisible();
});

test("home Ask-my-work agent streams a cited answer with real retrieval", async ({
  page,
}) => {
  await page.goto("/#ask-my-work");
  // Click a suggested question.
  await page.getByRole("button", { name: /how does he evaluate rag\?/i }).first().click();

  // Real retrieval: similarity bars (progressbars) render with the tool label.
  await expect(page.getByText(/search_knowledge_base/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("progressbar").first()).toBeVisible();

  // A cited answer with sources appears.
  await expect(page.getByText(/^Sources$/i).first()).toBeVisible({ timeout: 20_000 });
});

test("contact fit analyzer returns a grounded, honest analysis for a JD", async ({
  page,
}) => {
  await page.goto("/contact");

  // The recruiter-facing entry point is discoverable above the form.
  await expect(page.getByRole("heading", { name: /paste the jd/i })).toBeVisible();

  // Use the built-in sample JD so the assertion is deterministic.
  await page.getByRole("button", { name: /try a sample jd/i }).click();

  // A qualitative verdict + grounded strengths appear (real, from retrieval).
  await expect(page.getByText(/overall read/i)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/where roshan matches/i)).toBeVisible();

  // The provenance label is honest about grounding + no invented experience.
  await expect(page.getByText(/grounded/i).first()).toBeVisible();

  // The tailored pitch is copyable.
  await expect(page.getByRole("button", { name: /^copy$/i })).toBeVisible();
});

test("projects live-from-github surfaces repos and generates a case study", async ({
  page,
}) => {
  await page.goto("/projects");

  // The living-portfolio section loads client-side. In an environment where
  // GitHub is reachable (via the /api/github proxy) the repo grid + generate
  // action appear; where it is blocked, a soft honest note appears instead.
  // Either outcome is a PASS -- we assert the section degrades gracefully and
  // never dead-ends or errors.
  const heading = page.getByRole("heading", { name: /living portfolio/i });
  const softNote = page.getByText(/github is quiet right now/i);
  await expect(heading.or(softNote).first()).toBeVisible({ timeout: 15_000 });

  const generate = page.getByRole("button", { name: /generate case study/i }).first();
  if (await generate.isVisible().catch(() => false)) {
    await generate.click();
    // A streamed/templated case study renders with an honest provenance label.
    await expect(page.getByText(/AI-generated interpretation/i)).toBeVisible({
      timeout: 25_000,
    });
  }
});
