/**
 * Centralized, typed site content.
 * Edit this file to update copy across the whole portfolio.
 *
 * DYNAMIC VALUES: anything that ages (tenure) or is a count of another list
 * (number of projects) is COMPUTED here, never hardcoded, so it can never go
 * stale. Add a project to `projects[]` and every "N systems" count updates;
 * time passes and the tenure updates on its own.
 */

/** Bosch start date -- the single source of truth for tenure. */
export const BOSCH_START = new Date(2024, 0, 1); // Jan 2024

/** Tenure rounded to the nearest half-year, e.g. "2.5 years", "3 years".
 *  Deterministic per wall-clock month (server + client agree in a request). */
export function tenureText(unit: "years" | "yrs" = "years"): string {
  const now = new Date();
  const months =
    (now.getFullYear() - BOSCH_START.getFullYear()) * 12 +
    (now.getMonth() - BOSCH_START.getMonth());
  const years = Math.max(1, Math.round(months / 6)) / 2;
  return `${years} ${unit}`;
}

/** Small spelled-out number -- for prose counts derived from list lengths
 *  (e.g. "Three systems"). Capitalized; falls back to the digit past nine. */
export function numberWord(n: number): string {
  const words = [
    "Zero", "One", "Two", "Three", "Four", "Five",
    "Six", "Seven", "Eight", "Nine",
  ];
  return words[n] ?? String(n);
}

export const site = {
  name: "Roshan Singh",
  title: "AI Engineer",
  role: "LLM Applications, RAG & Agents",
  location: "Pune, India",
  relocation: "Open to relocation: Bengaluru / Hyderabad",
  positioning:
    "I build and ship production LLM systems -- agents, retrieval, and the evaluation that proves they work.",
  email: "roshan.16n@gmail.com",
  phone: "+91 85117 63382",
  links: {
    github: "https://github.com/Roshan-Singh-AI",
    linkedin: "https://www.linkedin.com/in/roshan-singh-1617n",
  },
  url: "https://roshan-singh.vercel.app",
  // Resume: drop your latest PDF at public/<file> and git push -- Vercel
  // redeploys and this page serves the newest copy automatically. No CMS.
  // Update `updated` to the month you last refreshed it (shown on the page).
  resume: {
    file: "/Roshan_Singh_Resume.pdf",
    updated: "July 2026",
  },
} as const;

export type NavItem = { label: string; href: string };

export const nav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/work" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
  { label: "Resume", href: "/resume" },
  { label: "Contact", href: "/contact" },
];

export type Capability = {
  title: string;
  body: string;
};

export const capabilities: Capability[] = [
  {
    title: "Agents that ship",
    body: "LangGraph orchestration, ReAct + delegation, MCP tool integrations. Agents that plan, call tools, self-validate, and recover.",
  },
  {
    title: "Retrieval that reasons",
    body: "RAG and GraphRAG pipelines -- hybrid vector + graph + keyword fusion, cited answers, and clean enterprise ingestion.",
  },
  {
    title: "Evaluation that proves it",
    body: "Reranking, cost-aware routing, RAGAS / recall@k, guardrails and PII redaction -- so systems are measured, not assumed.",
  },
];

export type Experience = {
  company: string;
  companyShort: string;
  role: string;
  location: string;
  period: string;
  duration: string;
  intro: string;
  chapters: {
    tag: string;
    title: string;
    body: string;
    stack?: string[];
  }[];
  recognition: string;
};

export const experience: Experience = {
  company: "Bosch Global Software Technologies",
  companyShort: "BGSW",
  role: "GenAI Engineer -- Applied AI Team",
  location: "Pune, India",
  period: "Jan 2024 - Present",
  duration: `~${tenureText("years")}`,
  intro:
    "Building GenAI products with the Applied AI team -- from a two-person proof of concept to org-wide platforms now in pilot. The work spans agents, retrieval, and the evaluation that keeps them honest.",
  chapters: [
    {
      tag: "In pilot",
      title: "CSAI Hub -- the UI agent",
      body: "I own the UI agent inside an internal platform that turns a plain-language idea into a working full-stack app -- interview to docs to code. My agent generates production React/Next.js + TypeScript UIs, wires them to generated backend APIs, enforces the Bosch design system, and self-validates through a generate -> check -> fix loop, testing its own output with Playwright. I also built an MCP server that serves Bosch design-system (ADUX) components on demand.",
      stack: ["LangGraph", "Azure OpenAI", "Claude", "MCP", "Playwright"],
    },
    {
      tag: "First project -- owned the build",
      title: "Parts-data classification",
      body: "A two-person PoC where I owned the build. Using text-embedding-3-large with cosine-similarity matching and human-in-the-loop thresholds, I classified messy, multi-language dealer-management-system parts data into Bosch's official reporting structure across four countries -- roughly 2M records. We hit the target categorization KPIs (70% sub-group, 20% position-group) on three of the four country datasets. I was in client meetings for both requirements and results.",
      stack: ["text-embedding-3-large", "cosine similarity", "human-in-the-loop"],
    },
    {
      tag: "Enterprise RAG",
      title: "DocupediaAI knowledge assistant",
      body: "Built the RAG pipeline behind an enterprise knowledge assistant -- ingestion, chunking, embedding, and connectors into enterprise data sources. Added Responsible-AI guardrails and PII redaction so answers stay compliant.",
      stack: ["RAG", "chunking", "guardrails", "PII redaction"],
    },
    {
      tag: "Platform",
      title: "Agent-as-a-Service",
      body: "Built ReAct and delegation agents, wrote MCP tool integrations, and contributed reusable orchestration components to a shared agent platform.",
      stack: ["ReAct", "delegation", "MCP", "orchestration"],
    },
  ],
  recognition:
    "Recognized twice by Bosch -- Rockstar and Excellence -- for delivery speed and ownership.",
};

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
  tech: string[];
  link: string;
  /** node labels for the mini architecture diagram */
  diagram: { nodes: string[]; caption: string };
};

export const projects: Project[] = [
  {
    slug: "multihop-graphrag",
    name: "Multihop-GraphRAG",
    tagline: "Hybrid graph + vector retrieval for multi-hop QA.",
    description:
      "Pairs dense vector search with Neo4j graph traversal. An LLM-driven ETL extracts entities and relationships, then vector, keyword, and graph scores are fused to answer multi-hop questions with citations.",
    highlights: [
      "LLM-driven ETL extracts entities + relationships",
      "Fuses vector + keyword + graph scores",
      "Retrieval inspector + graph explorer",
      "Hybrid-vs-vector benchmark",
      "Live Streamlit demo in Docker",
    ],
    tech: [
      "Python",
      "LangChain",
      "Neo4j",
      "Vector search",
      "Hybrid retrieval",
      "Groq",
      "Streamlit",
      "Docker",
    ],
    link: "https://github.com/Roshan-Singh-AI/Multihop-GraphRAG",
    diagram: {
      nodes: ["Query", "Vector", "Graph", "Fuse", "Cited answer"],
      caption: "Query splits into vector + graph, then fuses into a cited answer.",
    },
  },
  {
    slug: "agent-memory",
    name: "Agent Memory",
    tagline: "Long-term memory for LLM agents.",
    description:
      "Episodic, semantic, and procedural memory exposed as memory-as-tools -- store, retrieve, update, summarize, discard. Recall ranks by similarity, salience, and recency, and degrades gracefully without an API key.",
    highlights: [
      "Episodic / semantic / procedural memory",
      "Memory-as-tools: store, retrieve, update, summarize, discard",
      "Ranks by similarity + salience + recency",
      "Graceful degradation without a key",
      "39 passing tests",
    ],
    tech: [
      "Python",
      "LLM agents",
      "Tool calling",
      "Embeddings",
      "Semantic search",
      "Groq",
      "pytest",
      "uv",
    ],
    link: "https://github.com/Roshan-Singh-AI/agent-memory",
    diagram: {
      nodes: ["Agent", "Tools", "Store", "Rank", "Recall"],
      caption: "Agent writes to memory via tools; recall ranks by relevance.",
    },
  },
  {
    slug: "smart-retrieval-router",
    name: "Smart Retrieval Router",
    tagline: "Reranking + cost-aware routing between small and frontier models.",
    description:
      "A second-stage reranker (lexical, cross-encoder, or LLM) reorders candidates, and a difficulty router sends easy queries to a small model and hard ones to a frontier model -- cutting inference cost while lifting ranking quality.",
    highlights: [
      "Second-stage reranker: lexical / cross-encoder / LLM",
      "Difficulty router: small model vs frontier",
      "Cost model quantifies savings for a given traffic mix",
      "Reranks candidates before the model",
      "30 passing tests",
    ],
    tech: [
      "Python",
      "Reranking",
      "Cross-encoders",
      "Model routing",
      "Cost optimization",
      "nDCG",
      "Groq",
    ],
    link: "https://github.com/Roshan-Singh-AI/smart-retrieval-router",
    diagram: {
      nodes: ["Query", "Rerank", "Route", "Small / Frontier", "Answer"],
      caption: "Rerank candidates, then route by difficulty to the right model.",
    },
  },
];

export type SkillGroup = { label: string; items: string[] };

export const skillGroups: SkillGroup[] = [
  { label: "Languages", items: ["Python", "SQL", "JavaScript / TypeScript"] },
  {
    label: "GenAI / LLM",
    items: [
      "RAG",
      "GraphRAG",
      "LangChain",
      "LangGraph",
      "MCP",
      "AI agents (ReAct, tool calling, multi-agent)",
      "Reranking",
      "Embeddings",
      "Hybrid search",
      "RAG evaluation (RAGAS, recall@k)",
      "Guardrails / PII redaction",
    ],
  },
  {
    label: "LLMs",
    items: ["Azure OpenAI (GPT-4o)", "Claude", "Groq (Llama)", "Hugging Face"],
  },
  {
    label: "Vector / Graph",
    items: ["FAISS", "Pinecone", "ChromaDB", "Neo4j"],
  },
  { label: "Backend", items: ["FastAPI", "REST", "Microservices"] },
  { label: "Frontend", items: ["React", "Next.js", "Streamlit"] },
  {
    label: "Cloud / Tooling",
    items: ["Azure", "Docker", "CI/CD", "LangSmith", "Playwright", "pytest", "uv"],
  },
];

export type Education = {
  degree: string;
  school: string;
  period: string;
  detail: string;
};

export const education: Education = {
  degree: "B.E. Computer Science",
  school: "Chandigarh University",
  period: "2019 - 2023",
  detail: "CGPA 7.88",
};

export const awards: string[] = [
  "Bosch Rockstar Award",
  "Bosch Excellence Award",
];

/* ------------------------------------------------------------------ */
/*  "At a glance" -- the HR-scannable band on the home page.           */
/*  Every value below is honest and traceable to the content above     */
/*  (experience / projects / knowledge). No invented numbers.          */
/* ------------------------------------------------------------------ */
export type GlanceStat = {
  /** The headline value -- kept short and scannable. */
  value: string;
  /** One-line context under the value. */
  label: string;
  /** Where this number honestly comes from (documented, not shown as UI). */
  source: string;
};

export const glanceStats: GlanceStat[] = [
  {
    // Computed from BOSCH_START (top of file) -- stays correct as time passes.
    value: `~${tenureText("yrs")}`,
    label: "GenAI Engineer at Bosch",
    source: "computed: tenureText()",
  },
  {
    value: "Applied AI",
    label: "Team shipping production LLM systems",
    source: "experience.role -- Applied AI Team",
  },
  {
    // Derived from the projects array so it can't drift when one is added.
    value: `${projects.length}`,
    label: "Open-source AI systems on GitHub",
    source: "projects[] length",
  },
  {
    value: "~2M",
    label: "Parts records classified (PoC, 4 countries)",
    source: "experience.chapters -- parts-data classification",
  },
  {
    // Derived from awards[] so it tracks the real number of recognitions.
    value: `${awards.length}x`,
    label: "Recognized -- Rockstar & Excellence",
    source: "awards[] length",
  },
];

/** Core skills surfaced as scannable chips in the glance band + palette. */
export const coreSkills: string[] = [
  "RAG",
  "GraphRAG",
  "Agents",
  "MCP",
  "LangGraph",
  "Evaluation",
  "Reranking",
  "FastAPI",
];

/* ------------------------------------------------------------------ */
/*  Command palette -- navigation targets + starter questions.        */
/* ------------------------------------------------------------------ */
export type CommandTarget = {
  label: string;
  href: string;
  /** Extra searchable keywords for fuzzy matching. */
  keywords: string;
  /** Short hint shown on the right of the row. */
  hint: string;
};

export const commandTargets: CommandTarget[] = [
  { label: "Home", href: "/", keywords: "start intro landing", hint: "Page" },
  { label: "Work", href: "/work", keywords: "experience bosch csai timeline career", hint: "Page" },
  { label: "Projects", href: "/projects", keywords: "graphrag agent memory retrieval router github open source", hint: "Page" },
  { label: "About", href: "/about", keywords: "bio background education recognition", hint: "Page" },
  { label: "Resume", href: "/resume", keywords: "cv pdf download experience print hire", hint: "Page" },
  { label: "Contact", href: "/contact", keywords: "email hire reach linkedin github", hint: "Page" },
  { label: "Ask my work", href: "/#ask-my-work", keywords: "rag demo agent retrieval ai chat question", hint: "Section" },
];

/** One-click starter questions offered in the palette's Ask mode. */
export const askStarters: string[] = [
  "What has Roshan built with agents?",
  "How does he evaluate RAG?",
  "Tell me about his GraphRAG work",
  "Does he know MCP?",
];
