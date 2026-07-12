# Roshan Singh — Portfolio

A dark, editorial, animated portfolio built with **Next.js (App Router) + TypeScript + Tailwind + Framer Motion**. Five routes (home / work / projects / about / contact), a signature animated "retrieval graph" background (a nod to the GraphRAG + agent work), scroll-reveal typography, magnetic buttons, a cursor glow, and page transitions — all `prefers-reduced-motion` aware and responsive.

Playwright-tested (24 tests, desktop + mobile): every route loads with **zero console errors**, nav works, the graph canvas renders, all projects + links are present, and the layout doesn't overflow.

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

- Two project GitHub links currently point to your profile
  (`github.com/Roshan-Singh-AI`) as placeholders. After you push `agent-memory`
  and `smart-retrieval-router`, update their `repo` URLs in `site.ts`.
- `site.url` (also in `site.ts`) is set to `https://roshan-singh.vercel.app` for
  metadata/sitemap. Change it to your real domain after deploying.

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

### Alternative: Netlify
Also free. Import the repo at netlify.com; build command `next build`. Vercel is
smoother for Next.js, so prefer it unless you already use Netlify.

## Put the live URL everywhere

Once deployed, add the URL to your **resume** (near your other links), your
**GitHub profile README**, and **LinkedIn** (Featured + contact). A live,
animated portfolio URL is one of the strongest signals you can give a recruiter —
it shows the work instead of claiming it.
