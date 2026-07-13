# Apply-Anywhere Playbook — Roshan Singh

GenAI / AI Engineer (RAG, Agentic AI). ~2.5 yrs, Applied AI @ Bosch Global Software Technologies (BGSW), Pune. Open to Bengaluru / Hyderabad.

**Purpose:** Copy-paste your way through every portal so you never re-type an answer. Everything marked `<FILL>` you personalize once per role. Everything else is ready to go.

---

## 0. Your fixed profile block (paste anywhere that asks)

```
Name:            Roshan Singh
Title:           GenAI Engineer | RAG & Agentic AI
Email:           roshan.16n@gmail.com
Phone:           +91 85117 63382
Location:        Pune (open to Bengaluru / Hyderabad relocation)
GitHub:          github.com/Roshan-Singh-AI
LinkedIn:        linkedin.com/in/roshan-singh-1617n
Portfolio:       roshan-singh.vercel.app (live AI app)
Total exp:       ~2.5 years (since Jan 2024)
Current company: Bosch Global Software Technologies (BGSW)
Education:       B.E. CSE, Chandigarh University (2019-2023), CGPA 7.88
```

**Standing headline (reuse everywhere, tweak per JD):**
> GenAI Engineer at Bosch (Applied AI) — building production RAG, agentic systems (LangGraph, MCP) and code-gen agents. Python | LangChain | Azure OpenAI | Neo4j GraphRAG.

**Core stack (paste into "skills" fields):**
`Python, RAG, GraphRAG, LangChain, LangGraph, MCP, AI Agents (ReAct/multi-agent), Reranking, Embeddings, Azure OpenAI, Groq, FastAPI, Neo4j, FAISS, Pinecone, Docker, pytest, uv, Playwright`

---

## 1. Honesty guardrails (read before you paste anything)

These are load-bearing. Recruiters and JD screeners will probe. Never break these:

- **Bosch work is team work.** Use "contributed to / owned the X within a team project." You may say you *owned* the **UI agent** in CSAI Hub and the **build** of Parts-data classification. Everything else = contributor framing.
- **No invented numbers.** The only real Bosch KPIs you may cite: Parts-data classification hit **~70% sub-group / ~20% position-group accuracy on 3 of 4 countries**, across ~2M records / 4 countries. Do not attach percentages to anything else.
- **Multihop-GraphRAG has NO committed benchmark numbers yet** — the harness (`scripts/run_benchmark.py`) exists but hasn't been run. Describe the *design* (RRF fusion, weights, top_k, hops), never a score.
- **The "45%" in smart-retrieval-router was an arithmetic cost estimate, not a measured result.** Frame it as a **cost model / projected saving**, never "I reduced cost by 45%."
- **llm-eval-harness faithfulness scorer is scaffolded, not wired.** Say "faithfulness scoring scaffolded" — don't claim it runs.
- **agentic-qa-service does a single query-rewrite pass, NOT true multi-hop.** Call it "retrieve-grade-refine with query rewrite," never "multi-hop."
- Open-source test counts you *can* state: agent-memory 39, smart-retrieval-router 30, llm-eval-harness 18, agentic-qa-service 17, docuchat 16.

---

## 2. Portal-by-portal guide

### 2.1 Naukri
- **Best for:** Volume. The single largest inbound channel for India tech; GCCs, IT-services-adjacent product teams, and staffing recruiters live here. Great for recruiter-initiated calls.
- **How the screener behaves:** Naukri is **keyword-and-recency driven**. Recruiters search by keyword + experience-band + CTC + notice period + location. A profile updated in the last 24-48h ranks far higher in recruiter search. There is no strong resume "ATS score" — humans search a database, so keyword coverage in your headline, key-skills, and resume-headline fields is everything.
- **Fields it asks:** Resume headline (250 chars), key skills (add ALL of your stack tokens individually), current CTC, expected CTC, notice period, current + preferred locations, total exp. It also has a "Profile summary" (long) and per-project entries.
- **Tips:**
  - Update the profile every 2-3 days (open it, tweak one word, save) to stay "active" in recruiter search.
  - Put "GenAI / RAG / LangGraph / MCP / Agentic AI" literally in Key Skills — recruiters search those exact tokens.
  - Set expected CTC as a range in the profile; negotiate specifics on call.
  - Turn on "Immediately available / short notice" style flags honestly per your real notice.
  - Beware low-quality IT-services recruiters — filter to product/GCC.

### 2.2 LinkedIn — Jobs, Easy Apply, and recruiter DMs
- **Best for:** Product companies, GCCs, startups; plus warm recruiter outreach and referrals. Highest-signal channel for GenAI roles.
- **How the screener behaves:**
  - **Easy Apply** routes into the company's ATS (often Workday/Greenhouse/Lever). Some are genuinely parsed; many are just a resume drop + a few knockout questions (notice, work auth, relocation). Knockout questions can auto-reject — answer them literally correctly.
  - Recruiters use **LinkedIn Recruiter** search: your Headline, About, Skills (max 50, pinned top 3 matter most), and Open-to-Work signal drive whether you surface.
- **Fields it asks:** Easy Apply reuses saved answers (phone, notice, years of experience per skill, relocation, work authorization). Fill your "Saved answers" once in Job Application Settings so they autofill.
- **Tips:**
  - Set **Open to Work (recruiters-only, not the green banner)** targeting Bengaluru/Hyderabad + AI Engineer titles.
  - Pin **top 3 skills** = Retrieval-Augmented Generation, LangGraph, AI Agents.
  - Prefer roles posted **< 48h** and where you can also find someone to DM for a referral (see §5).
  - Use Easy Apply for speed, but for roles you care about, ALSO apply on the company portal — Easy Apply often gets less recruiter attention.
  - DM the recruiter/hiring manager after applying (template in §4).

### 2.3 Instahyre
- **Best for:** Mid-to-senior product/startup roles in Bengaluru; recruiters reach out to *you*. Curated, lower-volume, higher-quality than Naukri.
- **How the screener behaves:** You set preferences (role, locations, expected CTC, notice) and companies "express interest"; you accept/decline. It's a **matchmaking / opt-in** model — no cold ATS parse. Your stated expected CTC and preferred locations filter which companies even see you.
- **Fields it asks:** Structured profile — skills, expected CTC (be realistic; it's a hard filter), notice period, preferred locations, current CTC, a short summary.
- **Tips:**
  - Set preferred locations to Bengaluru + Hyderabad + Remote (Pune optional) so you aren't filtered out.
  - Keep expected CTC honest but at the upper realistic end (see §3) — set too low and you anchor down; too high and you vanish from matches.
  - Respond to "interested" companies within a day; responsiveness boosts your ranking.

### 2.4 Wellfound (formerly AngelList)
- **Best for:** Startups (India + remote-first, some US-remote). Direct-to-founder/hiring-manager. Good for AI-native startups.
- **How the screener behaves:** Your Wellfound profile *is* the application in most cases — founders read the profile + a short intro note. Salary expectations and remote/relocation are explicit filters.
- **Fields it asks:** Role preferences, salary expectation, remote vs on-site, a short "what you're looking for" note, work experience, links (GitHub/portfolio matter a LOT here).
- **Tips:**
  - Lead with the **live portfolio** (roshan-singh.vercel.app) and GitHub — startups weight demonstrated shipping over pedigree.
  - Set salary expectation as an INR range; also enable remote to widen matches.
  - Founders respond to concise, specific notes — use the 3-line pitch (§4).

### 2.5 Cutshort
- **Best for:** Product/startup roles, AI-matched. Skill-graph matching + assessments.
- **How the screener behaves:** Cutshort **matches on a skill graph** and may ask you to take short skill assessments / add skills with self-rated proficiency. Higher match score + completed assessments = more visibility.
- **Fields it asks:** Skills with proficiency + years, expected CTC, notice, locations, a summary.
- **Tips:**
  - Complete the AI/ML/Python assessments if offered — they lift your match score.
  - Rate skills honestly; over-rating triggers assessment mismatches.
  - Keep skills tightly GenAI-focused so you match GenAI JDs, not generic backend ones.

### 2.6 Hirect
- **Best for:** Direct **chat with founders/hiring managers** (no recruiter middle layer), startups. Fast, informal.
- **How the screener behaves:** Chat-first. You message the poster directly; first message quality decides whether you get a reply. No heavy parsing.
- **Fields it asks:** Basic profile + resume; the rest happens in chat.
- **Tips:**
  - Open with a tight, specific pitch (use the screening-call opener / 3-line pitch, §4), not "Hi, interested."
  - Mention the live app + one relevant project in message one.
  - Move promising chats to a call quickly.

### 2.7 Company career portals (Workday / Greenhouse / Lever / SmartRecruiters)
- **Best for:** The roles you actually want (product cos, GCCs). Always apply here for target companies even if you also Easy-Applied.
- **How each behaves:**
  - **Greenhouse / Lever:** Clean parsers. Upload resume → they auto-fill work history reasonably well; you verify. Good ATS behavior, resume text is parsed and searchable by recruiters. Custom questions per role.
  - **Workday:** Worst UX. Forces account creation per company, resume parse is mediocre — **expect to re-type your work history manually**. Save your profile block (§0) to paste. Has structured CTC/notice/relocation questions and often disqualifying knockout questions.
  - **SmartRecruiters:** Middle ground; decent parse, custom screening questions.
- **Fields they ask:** Full work history (title, dates, description), education, work authorization, notice period, current/expected CTC (India instances), relocation, sometimes voluntary diversity questions, and role-specific screening questions.
- **Tips:**
  - Use a **clean, single-column, text-based PDF resume** (no tables/columns/graphics) so parsers read it. Your portfolio can be the pretty version.
  - Match JD keywords in your resume summary line before uploading (tailor per role).
  - Keep a saved "master" text version of work history to paste into Workday's manual fields.
  - Answer knockout questions carefully — one wrong "No" auto-rejects.

### 2.8 Referrals (highest conversion — do this for every target role)
- **Best for:** Everything. A referral typically beats a cold apply by a wide margin for interview conversion.
- **How it works:** A current employee submits you through their internal referral portal; you still fill the ATS, but your resume gets flagged.
- **Tips:**
  - For every target company, search LinkedIn for someone in an AI/ML/Applied-AI team (2nd-degree preferred, or Chandigarh University alumni, or ex-Bosch).
  - Send the connection note (§4), then after they accept, the referral-ask note (§4).
  - Give them your tailored resume + the exact job link + a 2-line "why me for this role" they can paste.
  - Referrals + apply-within-48h is your strongest combo.

---

## 3. Expected CTC — the number and how to phrase it

**Market context (2026, aggregated from salary-guide blogs — directional, not precise):** GenAI/RAG engineers carry a ~20-40% premium over generalist ML. For ~2.5 yrs moving into a product company / GCC: a jump to roughly **13-16 LPA** is the common baseline, scaling to **20-30 LPA** with a demonstrable production RAG portfolio in Bengaluru/Hyderabad. IT-services offers cap lower; product cos and GCCs pay 40-70% more for the same experience. Sources below.

**Your ask (adjust once you know your current CTC):**
- **Target band to state:** **18-26 LPA** (product co / GCC, Bengaluru/Hyderabad), anchoring conversations at the higher end for AI-native product companies with your live portfolio + production RAG/agent work.
- **Floor (don't go below without reason):** ~15-16 LPA.
- **If pushed for a single number:** state the low end of your target ("18 LPA") as a starting point, keep the top open.

**Phrasing (paste):**
> I'm targeting **18-26 LPA** depending on role scope, level, and the overall package. I'm optimizing for the right team and problem space (production RAG / agentic systems) as much as the number, and I'm open to discussing where I fit in your band once I understand the role better.

**Short field version (portal box):**
> Expected: 18-26 LPA (negotiable based on role & total comp). Open to discussing.

> Reality check: your *actual* current CTC anchors what you can ask. If your current is on the lower side, lean on the GenAI premium + product/GCC jump narrative rather than a fixed multiplier. `<FILL: confirm your current CTC before quoting>`

---

## 4. PRESET ANSWERS (copy-paste)

### Current CTC
```
Current CTC: <FILL: e.g., 9.5 LPA fixed + variable> (Bosch Global Software Technologies)
```

### Expected CTC
```
18-26 LPA depending on role scope and total compensation; negotiable. Open to discussing your band.
```

### Notice period
```
<FILL: e.g., 60 / 90 days> as per Bosch policy. Open to discussing early release / buyout where possible.
```
(If you don't know it: check your offer letter/HR policy before quoting. Do not guess on a form.)

### Why looking / reason for change
```
I've spent ~2.5 years on Bosch's Applied AI team shipping production RAG and
agentic systems, and I've grown a lot. I'm now looking for a role where GenAI
is core to the product and I can own end-to-end AI features with more scope and
faster iteration — ideally at a product company or GCC in Bengaluru/Hyderabad.
It's a growth and ownership move, not a move away from good work.
```

### Willing to relocate
```
Yes — actively open to relocating to Bengaluru or Hyderabad.
```

### Preferred locations
```
Bengaluru, Hyderabad (open to relocation); currently in Pune. Remote also welcome.
```

### Total experience
```
~2.5 years (since Jan 2024), all in Applied AI / GenAI at Bosch Global Software Technologies.
```

### 300-char cover note / summary (portal "cover note" box)
```
GenAI Engineer on Bosch's Applied AI team (~2.5 yrs). I build production RAG and
agentic systems: LangGraph + MCP code-gen agents, GraphRAG on Neo4j, embedding-based
classification across ~2M records/4 countries. Python, LangChain, Azure OpenAI, FastAPI.
Live app: roshan-singh.vercel.app
```
(299 chars — trim the URL line if a portal counts strictly.)

### "Why should we hire you" — 1 line
```
I ship production GenAI end-to-end — RAG, agents, and code-gen with LangGraph/MCP —
backed by a live app and open-source projects you can run today.
```

### "Why should we hire you" — 3 lines
```
On Bosch's Applied AI team I've spent ~2.5 years taking GenAI features to production,
not demos: owning a LangGraph + MCP agent that generates and self-validates React/Next.js
UIs, and building an embedding-based classification pipeline with human-in-the-loop
thresholds across ~2M records and 4 countries.

Beyond work, I build and test in the open — GraphRAG on Neo4j with RRF fusion, an
agent-memory system, and a cost-aware retrieval router — all pushed, tested, and
documented on GitHub.

I move fast, I write tested code (pytest, uv, Docker), and I care about honest
evaluation — which is exactly the kind of engineer a GenAI product team needs.
```

### LinkedIn connection-request note to a recruiter (< 300 chars)
```
Hi <FILL: Name> — I'm a GenAI Engineer at Bosch (Applied AI, ~2.5 yrs) working on
production RAG and LangGraph/MCP agents. I saw <FILL: company>'s <FILL: role> role
and it looks like a strong fit. Would love to connect and learn more. Portfolio:
roshan-singh.vercel.app
```

### Follow-up message (after applying / after connecting)
```
Hi <FILL: Name>, thanks for connecting. I applied to the <FILL: role> role at
<FILL: company> and wanted to flag my background directly: ~2.5 yrs on Bosch's
Applied AI team building production RAG and agentic systems (LangGraph, MCP,
GraphRAG on Neo4j), plus a live app and tested open-source projects on GitHub.
Happy to share my resume or set up a quick call — whatever's easiest for you.
```

### Referral-ask note (after a connection accepts)
```
Hi <FILL: Name> — I noticed you're at <FILL: company>, which has an open <FILL: role>
role (<FILL: job link>). I'm a GenAI Engineer at Bosch (~2.5 yrs, production RAG +
LangGraph/MCP agents) and I think it's a great fit. Would you be open to referring me?
I can send a tailored resume and a 2-line summary you can paste. Totally understand
if not — thanks either way!
```

### Screening-call opener (when the recruiter says "tell me about yourself")
```
Sure. I'm a GenAI Engineer on Bosch's Applied AI team, about two and a half years in —
it's my first role out of B.E. CSE. Day to day I work on production GenAI: I own a
LangGraph and MCP-based agent that generates and self-validates React/Next.js UIs
against our design system, and I built an embedding-based classification pipeline
running across roughly two million records and four countries with human-in-the-loop
review. Outside work I build and test open-source RAG and agent projects — GraphRAG on
Neo4j, an agent-memory system, a cost-aware retrieval router — all on my GitHub, plus a
live app on my portfolio. I'm now looking to move into a product-focused GenAI role in
Bengaluru or Hyderabad where I can own AI features end-to-end. Happy to go deeper on
any of that.
```

---

## 5. Project talking points (safe, honest phrasings)

Use these when a form or interviewer asks "describe a project":

- **CSAI Hub (owned the UI agent):** "I own the UI-generation agent — a LangGraph pipeline using Azure OpenAI/Claude that generates React/Next.js + TypeScript UIs with a self-validation loop and Playwright checks, backed by an MCP server that serves Bosch's ADUX design-system components. It's part of a larger team platform."
- **Parts-data classification (owned the build):** "I owned building a classification pipeline — text-embedding-3-large with cosine similarity and human-in-the-loop confidence thresholds, over ~2M records across 4 countries. We hit ~70% sub-group and ~20% position-group accuracy on 3 of the 4 countries."
- **DocupediaAI (contributor):** "I contributed to a RAG pipeline with guardrails and PII redaction on a team project."
- **Agent-as-a-Service (contributor):** "I contributed to ReAct/delegation agents with MCP integrations."
- **MYA (contributor):** "I contributed to the retrieval layer."
- **Multihop-GraphRAG (personal, OSS):** "A hybrid graph+vector retriever on Neo4j — RRF fusion (vector .55, graph .20, keyword .15, support .10), MiniLM 384-dim embeddings, top_k 6, max 2 hops. It ships a benchmark harness; I haven't run the full benchmark yet, so I don't quote numbers — the design is the point."
- **smart-retrieval-router (OSS, 30 tests):** "Reranking plus cost-aware routing. I built a cost model that projects meaningful savings by routing cheap queries to cheaper models — it's a model, not a measured production result."
- **agent-memory (OSS, 39 tests):** "Episodic/semantic/procedural memory exposed as tools the agent can call, with 39 tests."
- **llm-eval-harness (OSS, 18 tests):** "Recall@k / MRR / nDCG vs a BM25 baseline; the faithfulness scorer is scaffolded, not yet wired in."
- **agentic-qa-service (OSS, 17 tests):** "A FastAPI retrieve-grade-refine service with a single query-rewrite pass — I'm explicit that it's not true multi-hop yet."
- **docuchat (OSS, 16 tests):** "PDF Q&A with citations."

---

## 6. Application hygiene checklist

- [ ] **Tailor the headline/summary line per JD** — mirror the role's exact keywords (RAG / Agentic / LLMOps / etc.) before you submit.
- [ ] **Apply within 48h of a posting** — recruiter attention decays fast; early applicants get seen.
- [ ] **10-15 quality applications per week** — quality over spray; each with a tailored line + a referral attempt where possible.
- [ ] **Always try a referral** for target companies before/alongside the cold apply.
- [ ] **Apply on the company portal too**, not just LinkedIn Easy Apply, for roles you care about.
- [ ] **Use a clean text-based PDF resume** (single column, no tables) so ATS parsers read it.
- [ ] **Track everything in a sheet** — columns: Company | Role | Portal | Date applied | JD link | Referral (Y/N) | Recruiter contact | Status | Next follow-up date | Notes.
- [ ] **Follow up once** ~5-7 days after applying if no response (template §4). One nudge, not more.
- [ ] **Refresh Naukri profile every 2-3 days** and keep LinkedIn Open-to-Work (recruiter-only) on.
- [ ] **Re-read the honesty guardrails (§1)** before any screening call — those caveats are your credibility.

---

### Sources (salary data — directional, from salary-guide/education blogs, treat as ranges not benchmarks)
- [Taggd — AI Engineer Salary in India 2026](https://taggd.in/blogs/ai-engineer-salary/)
- [GenerativeAIMasters — Generative AI Salary in India 2026](https://generativeaimasters.in/generative-ai-salary-in-india/)
- [BuildFastWithAI — AI Jobs in India Salary 2026](https://www.buildfastwithai.com/blogs/ai-jobs-india-salary-2026)
- [ShiftToTech — AI Engineer Salary India 2026](https://shifttotech.co.in/blog/ai-engineer-salary-india)
- [Instahyre Resources — AI/ML Engineer Salary in India 2026](https://resources.instahyre.com/blog/ai-engineer-salary-in-india/)
- [SystemCodex — GenAI Engineer Salary in India 2026: An Honest Breakdown](https://systemcodex.com/blog/genai-engineer-salary-india-2026/)
