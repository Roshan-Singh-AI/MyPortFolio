/**
 * Centralized, typed site content.
 * Edit this file to update copy across the whole portfolio.
 */

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
} as const;

export type NavItem = { label: string; href: string };

export const nav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/work" },
  { label: "Projects", href: "/projects" },
  { label: "About", href: "/about" },
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
  duration: "~2.5 years",
  intro:
    "Building GenAI products with the Applied AI team -- from a two-person proof of concept to org-wide platforms now in pilot. A builder and contributor across agents, retrieval, and evaluation.",
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
    link: "https://github.com/Roshan-Singh-AI",
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
      "~45% lower inference cost vs always-frontier",
      "Lifts nDCG while cutting cost",
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
    link: "https://github.com/Roshan-Singh-AI",
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
