# Roshan Singh — Portfolio

A dark, editorial, animated portfolio built with **Next.js (App Router) + TypeScript + Tailwind + Framer Motion**. Five routes (home / work / projects / about / contact), a signature animated "retrieval graph" background (a nod to the GraphRAG + agent work), scroll-reveal typography, magnetic buttons, a cursor glow, and page transitions — all `prefers-reduced-motion` aware and responsive.

Playwright-tested across desktop, mobile, and reduced-motion projects: every route loads with **zero console errors and no hydration mismatch**, nav works, the graph canvas renders, all projects + links are present, the layout doesn't overflow, and above-the-fold content never flashes on load (per-frame opacity is asserted so intro animations only ever animate *in*).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build & test

```bash
npm run build      # production build (must pass)
npm run start      # serve the production build
npm run lint       # eslint

# end-to-end tests (builds + starts the server automatically)
npx playwright install chromium   # first time only
npx playwright test
```

## Edit your content

All text lives in one typed file — **`src/content/site.ts`**. Edit that to change
your bio, experience, projects, skills, or links. No need to touch components.

- Project GitHub links in `site.ts` point at the real repos
  (`agent-memory`, `smart-retrieval-router`, `Multihop-GraphRAG`, ...).
- `site.url` (also in `site.ts`) is set to `https://roshan-singh.vercel.app` for
  metadata/sitemap. Change it to your real Vercel/custom domain after deploying.

## Deploy free — Vercel (recommended, ~3 minutes)

Vercel is made by the Next.js team; it's the easiest, free host for this.

1. Push this folder to a **new GitHub repo** (e.g. `portfolio`):
   ```bash
   # create an EMPTY repo on github.com first, then:
   git remote add origin https://github.com/Roshan-Singh-AI/portfolio.git
   git branch -M main
   git push -u origin main
   ```
2. Go to **vercel.com** → sign in with GitHub → **Add New… → Project**.
3. **Import** the `portfolio` repo. Vercel auto-detects Next.js — leave all
   defaults. Click **Deploy**.
4. In ~1 minute you get a live URL like `https://portfolio-xxxx.vercel.app`.
   Optionally rename the project in Vercel settings for a cleaner URL, then
   update `site.url` in `site.ts`.

Every future `git push` auto-redeploys.

### Turn on the live Groq answers (optional but recommended)

The "Ask my work" demo works **with no setup** — without a key it serves a
retrieval-grounded answer (still shows the whole pipeline). To make it generate
answers with a real LLM:

1. In Vercel → your project → **Settings → Environment Variables**, add:
   - `GROQ_API_KEY` = your key from [console.groq.com/keys](https://console.groq.com/keys)
   - `GROQ_MODEL` = `llama-3.3-70b-versatile` (optional; this is the default)
2. Redeploy (Vercel → Deployments → ⋯ → Redeploy).

The key lives **only** on Vercel's server (used by the `/api/ask` serverless
function) — it is never shipped to the browser, so it stays safe on a public
site. If the key is ever missing or Groq is unreachable, the demo automatically
falls back to the offline retrieval answer, so it never breaks.

> **Local dev:** copy `.env.example` to `.env.local` and put your key there
> (`.env.local` is gitignored). Behind a corporate proxy, also set
> `HTTPS_PROXY=http://localhost:3128`. On Vercel no proxy is needed.

### Optional: contact-form delivery
The contact form always works (it offers a direct `mailto:` fallback). To also
receive submissions at a webhook (Slack/Discord/Zapier), add
`CONTACT_WEBHOOK_URL` in Vercel env vars. Without it, the form still succeeds and
nudges the visitor to email you.

### Alternative: Netlify
Also free. Import the repo at netlify.com; build command `next build`. Vercel is
smoother for Next.js, so prefer it unless you already use Netlify.

## Put the live URL everywhere

Once deployed, add the URL to your **resume** (near your other links), your
**GitHub profile README**, and **LinkedIn** (Featured + contact). A live,
animated portfolio URL is one of the strongest signals you can give a recruiter —
it shows the work instead of claiming it.
